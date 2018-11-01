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

'use strict';

window.z = window.z || {};
window.z.auth = z.auth || {};

z.auth.AuthService = class AuthService {
  static get CONFIG() {
    return {
      POST_ACCESS_RETRY: {
        LIMIT: 10,
        TIMEOUT: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 0.5,
      },
      URL_ACCESS: '/access',
      URL_COOKIES: '/cookies',
      URL_LOGIN: '/login',
    };
  }

  constructor(backendClient) {
    this.backendClient = backendClient;
    this.logger = new z.util.Logger('z.auth.AuthService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Get all cookies for a user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//getCookies
   * @returns {Promise} Promise that resolves with an array of cookies.
   */
  getCookies() {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: AuthService.CONFIG.URL_COOKIES,
    });
  }

  /**
   * Get access token if a valid cookie is provided.
   *
   * @example Access token data we expect:
   *  access_token: Lt-IRHxkY9JLA5UuBR3Exxj5lCUf... - Token
   *  expires_in: 900 - Expiration in seconds
   *  token_type: Bearer - Token type
   *  user: 4363e274-69c9-... - User ID
   *
   * @note Don't use our client wrapper here, because to query "/access" we need to set "withCredentials" to "true" in order to send the cookie.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//newAccessToken
   * @param {number} retryAttempt - Retry attempts when a request fails
   * @returns {Promise} Promise which resolves with access token data (token_type, etc.).
   */
  postAccess(retryAttempt = 1) {
    return new Promise((resolve, reject) => {
      const ajaxConfig = {
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
          Authorization: `${accessTokenType} ${window.decodeURIComponent(accessToken)}`,
        };
      }

      ajaxConfig.success = accessTokenResponse => {
        const {access_token: accessToken, token_type: accessTokenType} = accessTokenResponse;
        this.backendClient.clearQueueUnblockTimeout();
        this.saveAccessTokenInClient(accessTokenType, accessToken);
        resolve(accessTokenResponse);
      };

      ajaxConfig.error = (jqXHR, textStatus, errorThrown) => {
        const isRequestForbidden = jqXHR.status === z.error.BackendClientError.STATUS_CODE.FORBIDDEN;
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

        const isConnectivityProblem = jqXHR.status === z.error.BackendClientError.STATUS_CODE.CONNECTIVITY_PROBLEM;
        if (isConnectivityProblem) {
          this.logger.warn('Delaying request for access token due to suspected connectivity issue');
          this.backendClient.clearQueueUnblockTimeout();

          return this.backendClient
            .executeOnConnectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_REFRESH)
            .then(() => {
              this.logger.info('Continuing to request access token after verifying connectivity');
              this.backendClient.queueState(z.service.QUEUE_STATE.ACCESS_TOKEN_REFRESH);
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

  /**
   * Delete cookies on backend.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//rmCookies
   *
   * @param {string} email - Email address of user
   * @param {string} password - Password of user
   * @param {string[]} [labels] - A list of cookie labels to remove from the system (optional)
   * @returns {jQuery.jqXHR} A superset of the XMLHTTPRequest object.
   */
  postCookiesRemove(email, password, labels) {
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

  /**
   * Login in order to obtain an access-token and cookie.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//login
   *
   * @param {Object} login - Containing sign in information
   * @param {string} login.email - The email address for a password login
   * @param {string} login.phone - The phone number for a password or SMS login
   * @param {string} login.password - The password for a password login
   * @param {string} login.code - The login code for an SMS login
   * @param {boolean} persist - Request a persistent cookie instead of a session cookie
   * @returns {Promise} Promise that resolves with access token
   */
  postLogin(login, persist) {
    const persistParam = window.encodeURIComponent(persist.toString());
    return new Promise((resolve, reject) => {
      $.ajax({
        contentType: 'application/json; charset=utf-8',
        crossDomain: true,
        data: pako.gzip(JSON.stringify(login)),
        headers: {
          'Content-Encoding': 'gzip',
        },
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

  /**
   * A login code can be used only once and times out after 10 minutes.
   *
   * @note Only one login code may be pending at a time.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//sendLoginCode
   *
   * @param {Object} requestCode - Containing the phone number in E.164 format and whether a code should be forced
   * @returns {Promise} Promise that resolves on successful login code request
   */
  postLoginSend(requestCode) {
    return this.backendClient.sendJson({
      data: requestCode,
      type: 'POST',
      url: `${AuthService.CONFIG.URL_LOGIN}/send`,
    });
  }

  /**
   * Logout on the backend side.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/logout
   * @returns {jQuery.jqXHR} A superset of the XMLHTTPRequest object.
   */
  postLogout() {
    return this.backendClient.sendRequest({
      type: 'POST',
      url: `${AuthService.CONFIG.URL_ACCESS}/logout`,
      withCredentials: true,
    });
  }

  /**
   * Save the access token date in the client.
   *
   * @param {string} tokenType - Access token type
   * @param {string} token - Access token
   * @returns {undefined}
   */
  saveAccessTokenInClient(tokenType = '', token = '') {
    this.backendClient.accessTokenType = tokenType;
    this.backendClient.accessToken = token;
  }
};
