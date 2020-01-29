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

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {BackendClientError} from '../error/BackendClientError';

import {AccessTokenData, LoginData} from '@wireapp/api-client/dist/auth';
import {BackendClient} from '../service/BackendClient';
import {QUEUE_STATE} from '../service/QueueState';

export class AuthService {
  public readonly backendClient: any;
  private readonly logger: Logger;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      POST_ACCESS_RETRY: {
        LIMIT: 10,
        TIMEOUT: TIME_IN_MILLIS.SECOND * 0.5,
      },
      URL_ACCESS: '/access',
      URL_COOKIES: '/cookies',
      URL_LOGIN: '/login',
    };
  }

  constructor(backendClient: any) {
    this.backendClient = backendClient;
    this.logger = getLogger('AuthService');
  }

  getCookies(): Promise<string[]> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: AuthService.CONFIG.URL_COOKIES,
    });
  }

  /**
   * Get access token if a valid cookie is provided.
   * @note Don't use our client wrapper here, because to query "/access" we need to set "withCredentials" to "true" in order to send the cookie.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//newAccessToken
   * @param retryAttempt Retry attempts when a request fails
   * @returns Promise which resolves with access token data.
   */
  postAccess(retryAttempt: number = 1): Promise<AccessTokenData> {
    return new Promise((resolve, reject) => {
      const ajaxConfig: JQuery.AjaxSettings = {
        crossDomain: true,
        type: 'POST',
        url: this.backendClient.createUrl(AuthService.CONFIG.URL_ACCESS),
        xhrFields: {
          withCredentials: true,
        },
      };

      if (this.backendClient.accessToken) {
        const {accessToken, accessTokenType} = this.backendClient;
        ajaxConfig.headers = {
          Authorization: `${accessTokenType} ${decodeURIComponent(accessToken)}`,
        };
      }

      ajaxConfig.success = accessTokenResponse => {
        const {access_token: accessToken, token_type: accessTokenType} = accessTokenResponse;
        this.backendClient.clearQueueUnblockTimeout();
        this.saveAccessTokenInClient(accessTokenType, accessToken);
        resolve(accessTokenResponse);
      };

      ajaxConfig.error = (jqXHR, textStatus, errorThrown) => {
        const isRequestForbidden = jqXHR.status === BackendClientError.STATUS_CODE.FORBIDDEN;
        if (isRequestForbidden) {
          this.logger.warn(`Request for access token forbidden (Attempt '${retryAttempt}'): ${errorThrown}`, jqXHR);
          return reject(new z.error.AccessTokenError(z.error.AccessTokenError.TYPE.REQUEST_FORBIDDEN));
        }

        const exceededRetries = retryAttempt > AuthService.CONFIG.POST_ACCESS_RETRY.LIMIT;
        if (exceededRetries) {
          this.saveAccessTokenInClient();
          this.logger.warn(`Exceeded limit of attempts to refresh access token': ${errorThrown}`, jqXHR);
          return reject(new z.error.AccessTokenError(z.error.AccessTokenError.TYPE.RETRIES_EXCEEDED));
        }

        retryAttempt++;

        const _retry = () => {
          return this.postAccess(retryAttempt)
            .then(resolve)
            .catch(reject);
        };

        const isConnectivityProblem = jqXHR.status === BackendClientError.STATUS_CODE.CONNECTIVITY_PROBLEM;
        if (isConnectivityProblem) {
          this.logger.warn('Delaying request for access token due to suspected connectivity issue');
          this.backendClient.clearQueueUnblockTimeout();

          return this.backendClient
            .executeOnConnectivity(BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_REFRESH)
            .then(() => {
              this.logger.info('Continuing to request access token after verifying connectivity');
              this.backendClient.queueState(QUEUE_STATE.ACCESS_TOKEN_REFRESH);
              this.backendClient.scheduleQueueUnblock();
              return _retry();
            });
        }

        return window.setTimeout(() => {
          this.logger.info(`Trying to request a new access token (Attempt '${retryAttempt}')`);
          return _retry();
        }, AuthService.CONFIG.POST_ACCESS_RETRY.TIMEOUT);
      };

      $.ajax(ajaxConfig);
    });
  }

  validatePassword(password: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        password: password,
      },
      type: 'POST',
      url: `${AuthService.CONFIG.URL_COOKIES}/remove`,
    });
  }

  postCookiesRemove(email: string, password: string, labels: string[]): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        email: email,
        labels: labels,
        password: password,
      },
      type: 'POST',
      url: `${AuthService.CONFIG.URL_COOKIES}/remove`,
    });
  }

  postLogin(login: LoginData, persist: boolean): Promise<AccessTokenData> {
    const persistParam = encodeURIComponent(persist.toString());
    return new Promise((resolve, reject) => {
      $.ajax({
        contentType: 'application/json; charset=utf-8',
        crossDomain: true,
        data: JSON.stringify(login),
        processData: false,
        type: 'POST',
        url: this.backendClient.createUrl(`${AuthService.CONFIG.URL_LOGIN}?persist=${persistParam}`),
        xhrFields: {
          withCredentials: true,
        },
      })
        .done(resolve)
        .fail((jqXHR, textStatus, errorThrown) => reject(jqXHR.responseJSON || errorThrown));
    });
  }

  postLoginSend(requestCode: {
    force: number;
    phone: string;
  }): Promise<{
    expires_in: number;
  }> {
    return this.backendClient.sendJson({
      data: requestCode,
      type: 'POST',
      url: `${AuthService.CONFIG.URL_LOGIN}/send`,
    });
  }

  postLogout(): Promise<void> {
    return this.backendClient.sendRequest({
      type: 'POST',
      url: `${AuthService.CONFIG.URL_ACCESS}/logout`,
      withCredentials: true,
    });
  }

  saveAccessTokenInClient(tokenType: string = '', token: string = ''): void {
    this.backendClient.accessTokenType = tokenType;
    this.backendClient.accessToken = token;
  }
}
