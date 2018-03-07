//
// Wire
// Copyright (C) 2018 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

import axios, {AxiosError, AxiosPromise, AxiosRequestConfig, AxiosResponse} from 'axios';
import {AccessTokenData} from '../auth';
import {AccessTokenStore, AuthAPI} from '../auth';
import {ContentType} from '../http';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {PriorityQueue} from '@wireapp/priority-queue';
import {sendRequestWithCookie} from '../shims/node/cookie';

const logdown = require('logdown');

class HttpClient {
  // private _authAPI: AuthAPI;
  private logger: any = logdown('@wireapp/api-client/http.HttpClient', {
    logger: console,
    markdown: false,
  });
  private requestQueue: PriorityQueue;

  constructor(private baseURL: string, public accessTokenStore: AccessTokenStore, private engine: CRUDEngine) {
    this.requestQueue = new PriorityQueue({
      maxRetries: 0,
      retryDelay: 1000,
    });

    // Log all failing HTTP requests
    axios.interceptors.response.use(undefined, (error: AxiosError) => {
      let backendResponse: string = '';

      if (error.response) {
        try {
          backendResponse = JSON.stringify(error.response.data);
        } finally {
          this.logger.error(
            `HTTP Error (${error.response.status}) on '${error.response.config.url}': ${
              error.message
            } (${backendResponse})`
          );
        }
      }

      return Promise.reject(error);
    });
  }

  // set authAPI(authAPI: AuthAPI) {
  //   this._authAPI = authAPI;
  // }

  public createUrl(url: string) {
    return `${this.baseURL}${url}`;
  }

  public _sendRequest(config: AxiosRequestConfig, tokenAsParam: boolean = false): AxiosPromise {
    config.baseURL = this.baseURL;

    if (this.accessTokenStore.accessToken) {
      const {token_type, access_token} = this.accessTokenStore.accessToken;

      if (tokenAsParam) {
        config.params = {
          ...config.params,
          access_token,
        };
      } else {
        config.headers = {
          ...config.headers,
          Authorization: `${token_type} ${access_token}`,
        };
      }
    }

    return axios.request(config).catch((error: AxiosError) => {
      if (error.response && error.response.status === 401) {
        return this.refreshAccessToken().then(() => this._sendRequest(config, tokenAsParam));
      }

      return Promise.reject(error);
    });
  }

  public refreshAccessToken(): Promise<AccessTokenData> {
    let expiredAccessToken: AccessTokenData | undefined;
    if (this.accessTokenStore.accessToken && this.accessTokenStore.accessToken.access_token) {
      expiredAccessToken = this.accessTokenStore.accessToken;
    }

    return this.postAccess(expiredAccessToken).then((accessToken: AccessTokenData) =>
      this.accessTokenStore.updateToken(accessToken)
    );
  }

  public postAccess(expiredAccessToken?: AccessTokenData): Promise<AccessTokenData> {
    const config: AxiosRequestConfig = {
      headers: {},
      withCredentials: true,
      method: 'post',
      url: `${AuthAPI.URL.ACCESS}`,
    };

    if (expiredAccessToken) {
      config.headers['Authorization'] = `${expiredAccessToken.token_type} ${decodeURIComponent(
        expiredAccessToken.access_token
      )}`;
    }

    return sendRequestWithCookie(this, config, this.engine).then((response: AxiosResponse) => response.data);
  }

  public sendRequest(config: AxiosRequestConfig, tokenAsParam: boolean = false): AxiosPromise {
    return this.requestQueue.add(() => this._sendRequest(config, tokenAsParam));
  }

  public sendJSON(config: AxiosRequestConfig): AxiosPromise {
    config.headers = {
      ...config.headers,
      'Content-Type': ContentType.APPLICATION_JSON,
    };
    return this.sendRequest(config);
  }

  public sendProtocolBuffer(config: AxiosRequestConfig): AxiosPromise {
    config.headers = {
      ...config.headers,
      'Content-Type': ContentType.APPLICATION_PROTOBUF,
    };
    return this.sendRequest(config);
  }
}

export {HttpClient};
