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
      POST_ACCESS_RETRY_LIMIT: 10,
      POST_ACCESS_RETRY_TIMEOUT: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 0.5,
      URL_ACCESS: '/access',
      URL_ACTIVATE: '/activate',
      URL_COOKIES: '/cookies',
      URL_LOGIN: '/login',
      URL_REGISTER: '/register',
    };
  }

  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.auth.AuthService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Get all cookies for a user.
   * @returns {Promise} Promise that resolves with an array of cookies.
   */
  getCookies() {
    return this.client.send_request({
      type: 'GET',
      url: AuthService.CONFIG.URL_COOKIES,
    });
  }

  /**
   * Get access-token if a valid cookie is provided.
   *
   * @note Don't use our client wrapper here, because to query "/access" we need to set "withCredentials" to "true" in order to send the cookie.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/authenticate
   * @param {number} retryAttempt - Retry attempts when a request fails
   * @returns {Promise} Promise which resolves with access token data (token_type, etc.).
   */
  postAccess(retryAttempt = 1) {
    return new Promise((resolve, reject) => {
      const config = {
        crossDomain: true,
        type: 'POST',
        url: AuthService.CONFIG.URL_ACCESS,
        xhrFields: {
          withCredentials: true,
        },
      };

      if (this.client.access_token) {
        config.headers = {
          Authorization: `Bearer ${window.decodeURIComponent(this.client.access_token)}`,
        };
      }

      config.success = data => {
        this.client.clear_queue_unblock();
        this.saveAccessTokenInClient(data.token_type, data.access_token);
        resolve(data);
      };

      config.error = (jqXHR, textStatus, errorThrown) => {
        const isRequestForbidden = jqXHR.status === z.error.BackendClientError.STATUS_CODE.FORBIDDEN;
        if (isRequestForbidden) {
          this.logger.warn(`Request for access token forbidden (Attempt '${retryAttempt}'): ${errorThrown}`, jqXHR);
          return reject(new z.error.AccessTokenError(z.error.AccessTokenError.TYPE.REQUEST_FORBIDDEN));
        }

        const exceededRetries = retryAttempt > AuthService.CONFIG.POST_ACCESS_RETRY_LIMIT;
        if (exceededRetries) {
          this.saveAccessTokenInClient();
          this.logger.warn(`Exceeded limit of attempts to refresh access token': ${errorThrown}`, jqXHR);
          return reject(new z.error.AccessTokenError(z.error.AccessTokenError.TYPE.RETRIES_EXCEEDED));
        }

        retryAttempt++;

        const _retry = () =>
          this.postAccess(retryAttempt)
            .then(resolve)
            .catch(reject);

        const isConnectivityProblem = jqXHR.status === z.error.BackendClientError.STATUS_CODE.CONNECTIVITY_PROBLEM;
        if (isConnectivityProblem) {
          this.logger.warn('Delaying request for access token due to suspected connectivity issue');
          this.client.clear_queue_unblock();

          return this.client
            .execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_REFRESH)
            .then(() => {
              this.logger.info('Continuing to request access token after verifying connectivity');
              this.client.queue_state(z.service.QUEUE_STATE.ACCESS_TOKEN_REFRESH);
              this.client.schedule_queue_unblock();
              return _retry();
            });
        }

        return window.setTimeout(() => {
          this.logger.info(`Trying to request a new access token (Attempt '${retryAttempt}')`);
          return _retry();
        }, AuthService.CONFIG.POST_ACCESS_RETRY_TIMEOUT);
      };

      $.ajax(config);
    });
  }

  /**
   * Delete all cookies on the backend.
   *
   * @param {string} email - The user's e-mail address
   * @param {string} password - The user's password
   * @param {string[]} labels - A list of cookie labels to remove from the system (optional)
   * @returns {jQuery.jqXHR} A superset of the XMLHTTPRequest object.
   */
  postCookiesRemove(email, password, labels) {
    return this.client.send_json({
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
   * @note Don't use our client wrapper here. On cookie requests we need to use plain jQuery AJAX.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/login
   *
   * @param {Object} login - Containing sign in information
   * @option {string} login - email The email address for a password login
   * @option {string} login - phone The phone number for a password or SMS login
   * @option {string} login - password The password for a password login
   * @option {string} login - code The login code for an SMS login
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
        url: `${AuthService.CONFIG.URL_LOGIN}?persist=${persistParam}`,
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
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendLoginCode
   *
   * @param {Object} requestCode - Containing the phone number in E.164 format and whether a code should be forced
   * @returns {Promise} Promise that resolves on successful login code request
   */
  postLoginSend(requestCode) {
    return this.client.send_json({
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
    return this.client.send_request({
      type: 'POST',
      url: `${AuthService.CONFIG.URL_ACCESS}/logout`,
      withCredentials: true,
    });
  }

  /**
   * Save the access token date in the client.
   *
   * @param {string} type - Access token type
   * @param {string} value - Access token
   * @returns {undefined}
   */
  saveAccessTokenInClient(type = '', value = '') {
    this.client.access_token_type = type;
    this.client.access_token = value;
  }
};
