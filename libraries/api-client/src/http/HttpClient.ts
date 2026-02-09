/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import axios, {AxiosError, AxiosHeaders, AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import axiosRetry, {isNetworkOrIdempotentRequestError, exponentialDelay} from 'axios-retry';
import logdown from 'logdown';
import {gzip} from 'pako';

import {EventEmitter} from 'events';

import {LogFactory, TimeUtil} from '@wireapp/commons';
import {PriorityQueue} from '@wireapp/priority-queue';

import {
  AccessTokenData,
  AccessTokenStore,
  AuthAPI,
  InvalidTokenError,
  MissingCookieAndTokenError,
  MissingCookieError,
  TokenExpiredError,
} from '../auth/';
import {Config} from '../Config';
import {BackendError, ConnectionState, ContentType, StatusCode, mapBackendError} from '../http/';
import {ObfuscationUtil} from '../obfuscation/';
import {sendRequestWithCookie} from '../shims/node/cookie';

enum TOPIC {
  ON_CONNECTION_STATE_CHANGE = 'HttpClient.TOPIC.ON_CONNECTION_STATE_CHANGE',
  ON_INVALID_TOKEN = 'HttpClient.TOPIC.ON_INVALID_TOKEN',
}

type SendRequest = {
  config: AxiosRequestConfig;
  isFirstTry?: boolean;
  abortController?: AbortController;
};

export interface HttpClient {
  on(event: TOPIC.ON_CONNECTION_STATE_CHANGE, listener: (state: ConnectionState) => void): this;

  on(event: TOPIC.ON_INVALID_TOKEN, listener: (error: InvalidTokenError | MissingCookieError) => void): this;
}

const FILE_SIZE_100_MB = 104857600;

export class HttpClient extends EventEmitter {
  public readonly client: AxiosInstance;
  private readonly logger: logdown.Logger;
  private connectionState: ConnectionState;
  private readonly requestQueue: PriorityQueue;
  private readonly backOffQueue: PriorityQueue;
  public static readonly TOPIC = TOPIC;
  private versionPrefix = '';

  private enableGzip: boolean = true;

  constructor(
    private readonly config: Config,
    public accessTokenStore: AccessTokenStore,
  ) {
    super();

    this.client = axios.create({
      baseURL: this.config.urls.rest,
      headers: this.config.headers,
    });
    axiosRetry(this.client, {
      retries: Infinity,
      retryDelay: exponentialDelay,
      retryCondition: (error: AxiosError) => {
        const {response, request} = error;
        const isNetworkError = !response && request && !Object.keys(request).length;
        if (isNetworkError) {
          this.logger.warn('Disconnected from backend');
          this.updateConnectionState(ConnectionState.DISCONNECTED);
          return true;
        }
        if (response?.status !== 401 && response?.status !== 403) {
          // we only want to retry auth failures (access token will automatically be regenerated)
          return false;
        }

        return isNetworkOrIdempotentRequestError(error);
      },
      shouldResetTimeout: true,
    });

    this.connectionState = ConnectionState.UNDEFINED;

    this.logger = LogFactory.getLogger('@wireapp/api-client/http/HttpClient');

    this.requestQueue = new PriorityQueue({
      maxRetries: 0,
      retryDelay: TimeUtil.TimeInMillis.SECOND,
    });

    this.backOffQueue = new PriorityQueue({
      maxRetries: 10,
      retryDelay: 200,
      maxRetryDelay: 2000,
      shouldRetry: error => {
        const isTooManyRequestsError = axios.isAxiosError(error) && error.response?.status === 420;
        return isTooManyRequestsError;
      },
    });
  }

  /**
   * Toggle gzip compression for sendJSON requests.
   * @param enabled - true to enable gzip, false to disable
   */
  public toggleGzip(enabled: boolean): void {
    this.enableGzip = enabled;
  }

  public isGzipEnabled(): boolean {
    return this.enableGzip;
  }

  public getBaseUrl() {
    return `${this.config.urls.rest}${this.versionPrefix}`;
  }

  public useVersion(version: number): void {
    this.versionPrefix = version > 0 ? `/v${version}` : '';
  }

  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit(HttpClient.TOPIC.ON_CONNECTION_STATE_CHANGE, this.connectionState);
    }
  }

  public async _sendRequest<T>({config, isFirstTry = true, abortController}: SendRequest): Promise<AxiosResponse<T>> {
    if (this.accessTokenStore.accessTokenData) {
      // TODO: remove tokenAsParam
      const {token_type, access_token} = this.accessTokenStore.accessTokenData;

      config.headers = {
        ...config.headers,
        Authorization: `${token_type} ${access_token}`,
      };
    }
    const skipLogout = config.requestOptions?.skipLogout === true;

    try {
      const response = await this.client.request<T>({
        ...config,
        signal: abortController?.signal,
        // We want to prefix all urls, except for the "access" endpoint
        url: config.url?.startsWith(AuthAPI.URL.ACCESS) ? config.url : `${this.versionPrefix}${config.url}`,
        maxBodyLength: FILE_SIZE_100_MB,
        maxContentLength: FILE_SIZE_100_MB,
      });

      this.updateConnectionState(ConnectionState.CONNECTED);

      return response;
    } catch (error) {
      const retryWithTokenRefresh = async () => {
        this.logger.warn(`Access token refresh triggered for "${config.method}" request to "${config.url}".`);
        await this.refreshAccessToken();
        config['axios-retry'] = {
          retries: 0,
        };
        return this._sendRequest<T>({config, isFirstTry: false, abortController});
      };

      const hasAccessToken = !!this.accessTokenStore?.accessTokenData;

      if (axios.isAxiosError(error) && error.response?.status === StatusCode.UNAUTHORIZED) {
        return retryWithTokenRefresh();
      }

      if (HttpClient.isBackendError(error)) {
        const mappedError = mapBackendError(
          new BackendError(error.response.data.message, error.response.data.label, error.response.data.code),
        );

        const isUnauthorized = mappedError.code === StatusCode.UNAUTHORIZED;
        const isExpiredTokenError = mappedError instanceof TokenExpiredError;

        if ((isExpiredTokenError || isUnauthorized) && hasAccessToken && isFirstTry) {
          return retryWithTokenRefresh();
        }

        if (
          !skipLogout &&
          (mappedError instanceof InvalidTokenError ||
            mappedError instanceof MissingCookieError ||
            mappedError instanceof MissingCookieAndTokenError)
        ) {
          // On invalid cookie the application is supposed to logout.
          this.logger.warn(
            `Cannot renew access token for "${config.method}" request to "${config.url}" because cookie/token is invalid: ${mappedError.message}`,
            mappedError,
          );
          this.emit(HttpClient.TOPIC.ON_INVALID_TOKEN, mappedError);
        }

        throw mappedError;
      }

      throw error;
    }
  }

  static isAxiosError(errorCandidate: any): errorCandidate is AxiosError {
    return errorCandidate.isAxiosError === true;
  }

  static isBackendError(errorCandidate: any): errorCandidate is AxiosError<BackendError> & {response: BackendError} {
    if (errorCandidate.response) {
      const {data} = errorCandidate.response;
      return !!data?.code && !!data?.label && !!data?.message;
    }
    return false;
  }
  /**
   * Will return true if the stored access token is still valid (not expired)
   *
   * @param  {number} errorMargin - Since the expiration date is subject to time shift between client and server, an error margin can be used. Defaults to 10s
   */
  public hasValidAccessToken(errorMargin: number = 10000): boolean {
    if (this.accessTokenStore.tokenExpirationDate) {
      const now = Date.now();
      const expirationDate = this.accessTokenStore.tokenExpirationDate;
      return expirationDate - errorMargin >= now;
    }
    return false;
  }

  public async refreshAccessToken(): Promise<AccessTokenData> {
    let expiredAccessToken: AccessTokenData | undefined;
    if (this.accessTokenStore.accessTokenData?.access_token) {
      expiredAccessToken = this.accessTokenStore.accessTokenData;
    }

    const accessToken = await this.postAccess(expiredAccessToken);
    this.logger.info(
      `Received updated access token. It will expire in "${accessToken.expires_in}" seconds.`,
      ObfuscationUtil.obfuscateAccessToken(accessToken),
    );
    return this.accessTokenStore.updateToken(accessToken);
  }

  public async postAccess(expiredAccessToken?: AccessTokenData, clientId?: string): Promise<AccessTokenData> {
    const config: AxiosRequestConfig = {
      headers: {},
      method: 'post',
      url: `${AuthAPI.URL.ACCESS}`,
      withCredentials: true,
      params: clientId && {client_id: clientId},
    };
    if (expiredAccessToken?.access_token && config?.headers) {
      config.headers = new AxiosHeaders(config.headers as AxiosHeaders);
      config.headers.set(
        'Authorization',
        `${expiredAccessToken.token_type} ${decodeURIComponent(expiredAccessToken.access_token)}`,
      );
    }
    const response = await sendRequestWithCookie<AccessTokenData>(this, config);

    return response.data;
  }

  /**
   * Will associate specified client id with session and return newly created access token.
   *
   * @param  {string} clientId - id of the client with which the new login session will be associated
   */
  public async associateClientWithSession(clientId: string): Promise<AccessTokenData> {
    const storedToken = this.accessTokenStore.accessTokenData;
    const newToken = await this.postAccess(storedToken, clientId);

    return this.accessTokenStore.updateToken(newToken);
  }

  public async sendRequest<T>(
    config: AxiosRequestConfig,
    isSynchronousRequest: boolean = false,
    abortController?: AbortController,
  ): Promise<AxiosResponse<T>> {
    const promise = isSynchronousRequest
      ? this.requestQueue.add(() => this._sendRequest<T>({config, abortController}))
      : this._sendRequest<T>({config, abortController});

    try {
      return await promise;
    } catch (error) {
      // If the request failed due to too many requests, we want put it into the backoff queue
      // It will be retried after a (growing) delay
      const isTooManyRequestsError = axios.isAxiosError(error) && error.response?.status === 420;

      if (isTooManyRequestsError) {
        return this.backOffQueue.add(() => this._sendRequest<T>({config, abortController}));
      }

      throw error;
    }
  }

  public sendJSON<T>(
    config: AxiosRequestConfig,
    isSynchronousRequest: boolean = false,
    abortController?: AbortController,
  ): Promise<AxiosResponse<T>> {
    const shouldGzipData =
      this.enableGzip &&
      process.env.NODE_ENV !== 'test' &&
      !!config.data &&
      ['post', 'put', 'patch'].includes(config.method?.toLowerCase() ?? '');

    if (shouldGzipData) {
      config.data = gzip(JSON.stringify(config.data));
    }

    config.headers = {
      ...config.headers,
      'Content-Type': ContentType.APPLICATION_JSON,
      'Content-Encoding': shouldGzipData ? 'gzip' : config.headers?.['Content-Encoding'],
    };

    return this.sendRequest(config, isSynchronousRequest, abortController);
  }

  public sendXML<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    config.headers = {
      ...config.headers,
      'Content-Type': ContentType.APPLICATION_XML,
    };
    return this.sendRequest<T>(config, false);
  }

  public sendProtocolBuffer<T>(
    config: AxiosRequestConfig,
    isSynchronousRequest: boolean = false,
  ): Promise<AxiosResponse<T>> {
    config.headers = {
      ...config.headers,
      'Content-Type': ContentType.APPLICATION_PROTOBUF,
    };
    return this.sendRequest<T>(config, isSynchronousRequest);
  }

  public sendProtocolMls<T>(
    config: AxiosRequestConfig,
    isSynchronousRequest: boolean = false,
  ): Promise<AxiosResponse<T>> {
    config.headers = {
      ...config.headers,
      'Content-Type': ContentType.MESSAGES_MLS,
    };
    return this.sendRequest<T>(config, isSynchronousRequest);
  }
}
