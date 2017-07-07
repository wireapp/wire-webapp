/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
      POST_ACCESS_RETRY_TIMEOUT: 500,
      URL_ACCESS: '/access',
      URL_ACTIVATE: '/activate',
      URL_COOKIES: '/cookies',
      URL_INVITATIONS: '/invitations',
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
   *
   * @returns {Promise} Promise that resolves with an array of cookies.
   */
  get_cookies() {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(AuthService.CONFIG.URL_COOKIES),
    });
  }

  /**
   * Get invite information.
   *
   * @param {string} code - Invite code
   * @returns {Promise} Promise that resolves with invitations information.
   */
  get_invitations_info(code) {
    return this.client.send_request({
      data: {
        code: code,
      },
      type: 'GET',
      url: this.client.create_url(`${AuthService.CONFIG.URL_INVITATIONS}/info`),
    });
  }

  /**
   * Get access-token if a valid cookie is provided.
   *
   * @note Don't use our client wrapper here, because to query "/access" we need to set "withCredentials" to "true" in order to send the cookie.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/authenticate
   * @param {number} retry_attempt - Retry attempts when a request fails
   * @returns {Promise} Promise which resolves with access token data (token_type, etc.).
   */
  post_access(retry_attempt = 1) {
    return new Promise((resolve, reject) => {
      const config = {
        crossDomain: true,
        type: 'POST',
        url: this.client.create_url(AuthService.CONFIG.URL_ACCESS),
        xhrFields: {
          withCredentials: true,
        },
      };

      if (this.client.access_token) {
        config.headers = {
          Authorization: `Bearer ${window.decodeURIComponent(this.client.access_token)}`,
        };
      }

      config.success = (data) => {
        this.save_access_token_in_client(data.token_type, data.access_token);
        resolve(data);
      };

      config.error = (jqXHR, textStatus, errorThrown) => {
        if (jqXHR.status === z.service.BackendClientError.STATUS_CODE.FORBIDDEN) {
          this.logger.error(`Requesting access token failed after ${retry_attempt} attempt(s): ${errorThrown}`, jqXHR);
          reject(new z.auth.AccessTokenError(z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN));
        }

        if (retry_attempt <= AuthService.CONFIG.POST_ACCESS_RETRY_LIMIT) {
          retry_attempt++;

          const _retry = () => this.post_access(retry_attempt)
            .then(resolve)
            .catch(reject);

          if (jqXHR.status === z.service.BackendClientError.STATUS_CODE.CONNECTIVITY_PROBLEM) {
            this.logger.warn('Access token refresh delayed due to suspected connectivity issue');
            return this.client.execute_on_connectivity(z.service.BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_REFRESH)
              .then(() => {
                this.logger.info('Continuing access token refresh after verifying connectivity');
                return _retry();
              });
          }

          return window.setTimeout(() => {
            this.logger.info(`Trying to get a new access token: '${retry_attempt}' attempt`);
            return _retry();
          }, AuthService.CONFIG.POST_ACCESS_RETRY_TIMEOUT);
        }
        this.save_access_token_in_client();
        return reject(new z.auth.AccessTokenError(z.auth.AccessTokenError.TYPE.RETRIES_EXCEEDED));
      };

      $.ajax(config);
    });
  }

  /**
   * Resend an email or phone activation code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendActivationCode
   * @param {Object} send_activation_code - Containing the email or phone number needed to resend activation email
   * @option {string} send_activation_code - email
   * @returns {Promise} Promise that resolves on successful code resend
   */
  post_activate_send(send_activation_code) {
    return this.client.send_json({
      data: send_activation_code,
      type: 'POST',
      url: this.client.create_url(`${AuthService.CONFIG.URL_ACTIVATE}/send`),
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
  post_cookies_remove(email, password, labels) {
    return this.client.send_json({
      data: {
        email: email,
        labels: labels,
        password: password,
      },
      type: 'POST',
      url: this.client.create_url(`${AuthService.CONFIG.URL_COOKIES}/remove`),
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
  post_login(login, persist) {
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
        url: `${this.client.create_url(AuthService.CONFIG.URL_LOGIN)}?persist=${window.encodeURIComponent(persist.toString())}`,
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
   * @param {Object} request_code - Containing the phone number in E.164 format and whether a code should be forced
   * @returns {Promise} Promise that resolves on successful login code request
   */
  post_login_send(request_code) {
    return this.client.send_json({
      data: request_code,
      type: 'POST',
      url: this.client.create_url(`${AuthService.CONFIG.URL_LOGIN}/send`),
    });
  }

  /**
   * Logout on the backend side.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/logout
   * @returns {jQuery.jqXHR} A superset of the XMLHTTPRequest object.
   */
  post_logout() {
    return this.client.send_request({
      type: 'POST',
      url: this.client.create_url(`${AuthService.CONFIG.URL_ACCESS}/logout`),
      withCredentials: true,
    });
  }

  /**
   * Register a new user.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/register
   *
   * @param {Object} new_user - Containing the email, username and password needed for account creation
   * @option {string} new_user - name
   * @option {string} new_user - email
   * @option {string} new_user - password
   * @option {string} new_user - locale
   * @returns {Promise} Promise that will resolve on success
   */
  post_register(new_user) {
    return new Promise((resolve, reject) => {
      const config = {
        contentType: 'application/json; charset=utf-8',
        crossDomain: true,
        data: pako.gzip(JSON.stringify(new_user)),
        headers: {
          'Content-Encoding': 'gzip',
        },
        processData: false,
        type: 'POST',
        url: `${this.client.create_url(AuthService.CONFIG.URL_REGISTER)}?challenge_cookie=true`,
        xhrFields: {
          withCredentials: true,
        },
      };

      $.ajax(config)
        .done((data) => {
          resolve(data);
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          reject(jqXHR.responseJSON || errorThrown);
        });
    });
  }

  /**
   * Save the access token date in the client.
   *
   * @param {string} type - Access token type
   * @param {string} value - Access token
   * @returns {undefined}
   */
  save_access_token_in_client(type = '', value = '') {
    this.client.access_token_type = type;
    this.client.access_token = value;
  }
};
