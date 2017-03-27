/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

(function() {
  window.z = window.z || {};
  window.z.auth = z.auth || {};

  const POST_ACCESS = {
    RETRY_LIMIT: 10,
    RETRY_TIMEOUT: 500,
  };

  window.z.auth.AuthService = class AuthService {
    constructor(client) {
      this.client = client;
      this.logger = new z.util.Logger('z.auth.AuthService', z.config.LOGGER.OPTIONS);
    }

    static get URL_ACCESS() {
      return '/access';
    }

    static get URL_ACTIVATE() {
      return '/activate';
    }

    static get URL_COOKIES() {
      return '/cookies';
    }

    static get URL_INVITATIONS() {
      return '/invitations';
    }

    static get URL_LOGIN() {
      return '/login';
    }

    static get URL_REGISTER() {
      return '/register';
    }

    /**
     * Get all cookies for a user.
     *
     * @returns {Promise} Promise that resolves with an array of cookies.
     */
    get_cookies() {
      return this.client.send_request({
        url: this.client.create_url(this.URL_COOKIES),
        type: 'GET',
      }).then((data) => {
        return data.cookies;
      });
    }

    /**
     * Get invite information.
     *
     * @param {String} code - Invite code
     * @returns {Promise} Promise that resolves with invitations information.
     */
    get_invitations_info(code) {
      return this.client.send_request({
        url: this.client.create_url(`${this.URL_INVITATIONS}/info?code=${code}`),
        type: 'GET',
      });
    }

    /**
     * Get access-token if a valid cookie is provided.
     *
     * @note Don't use our client wrapper here, because to query "/access" we need to set "withCredentials" to "true" in order to send the cookie.
     * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/authenticate
     * @param {Integer} retry_attempt - Retry attempts when a request fails
     * @returns {Promise}
     */
    post_access(retry_attempt = 1) {
      return new Promise((resolve, reject) => {
        this.client.request_queue_blocked_state(z.service.RequestQueueBlockedState.ACCESS_TOKEN_REFRESH);

        let config = {
          crossDomain: true,
          type: 'POST',
          url: this.client.create_url(AuthService.URL_ACCESS),
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
          this.client.request_queue_blocked_state(z.service.RequestQueueBlockedState.NONE);
          this.save_access_token_in_client(data.token_type, data.access_token);
          resolve(data);
        };

        config.error = (jqXHR, textStatus, errorThrown) => {
          if (jqXHR.status === z.service.BackendClientError.prototype.STATUS_CODE.FORBIDDEN) {
            this.logger.error(`Requesting access token failed after ${retry_attempt} attempt(s): ${errorThrown}`, jqXHR);
            reject(new z.auth.AccessTokenError(z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN));
          }

          if (retry_attempt <= POST_ACCESS.RETRY_LIMIT) {
            retry_attempt++;

            const _retry = () => {
              return this.post_access(retry_attempt).then(resolve).catch(reject);
            };

            if (jqXHR.status === z.service.BackendClientError.prototype.STATUS_CODE.CONNECTIVITY_PROBLEM) {
              this.logger.warn('Access token refresh delayed due to suspected connectivity issue');
              return this.client.execute_on_connectivity().then(() => {
                this.logger.info('Continuing access token refresh after verifying connectivity');
                return _retry();
              });
            }

            return window.setTimeout(() => {
              this.logger.info(`Trying to get a new access token: '${retry_attempt}' attempt`);
              return _retry();
            }, POST_ACCESS.RETRY_TIMEOUT);
          } else {
            this.client.request_queue_blocked_state(z.service.RequestQueueBlockedState.NONE);
            this.save_access_token_in_client();
            return reject(new z.auth.AccessTokenError(z.auth.AccessTokenError.TYPE.RETRIES_EXCEEDED));
          }
        };

        $.ajax(config);
      });
    }

    /**
     * Resend an email or phone activation code.
     *
     * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendActivationCode
     * @param {Object} send_activation_code - Containing the email or phone number needed to resend activation email
     * @option {String} send_activation_code - email
     * @returns {Promise} Promise that resolves on successful code resend
     */
    post_activate_send(send_activation_code) {
      return this.client.send_json({
        url: this.client.create_url(`${AuthService.URL_ACTIVATE}/send`),
        type: 'POST',
        data: send_activation_code,
      });
    }

    /**
     * Delete all cookies on the backend.
     *
     * @param {String} email - The user's e-mail address
     * @param {String} password - The user's password
     * @param {Array} labels - A list of cookie labels to remove from the system (optional)
     */
    post_cookies_remove(email, password, labels) {
      return this.client.send_json({
        url: this.client.create_url(`${AuthService.URL_COOKIES}/remove`),
        type: 'POST',
        data: {
          email: email,
          password: password,
          labels: labels,
        },
      });
    }

    /**
     * Login in order to obtain an access-token and cookie.
     *
     * @note Don't use our client wrapper here. On cookie requests we need to use plain jQuery AJAX.
     * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/login
     *
     * @param {Object} login - Containing sign in information
     * @option {String} login - email The email address for a password login
     * @option {String} login - phone The phone number for a password or SMS login
     * @option {String} login - password The password for a password login
     * @option {String} login - code The login code for an SMS login
     * @param {Boolean} persist - Request a persistent cookie instead of a session cookie
     * @return {Promise} Promise that resolves with access token
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
          url: `${this.client.create_url(`${AuthService.URL_LOGIN}?persist=${persist}`)}`,
          xhrFields: {
            withCredentials: true,
          },
        }).done((data) => {
          resolve(data);
        }).fail((jqXHR, textStatus, errorThrown) => {
          if (jqXHR.status === z.service.BackendClientError.prototype.STATUS_CODE.TOO_MANY_REQUESTS && login.email) {
            // Backend blocked our user account from login, so we have to reset our cookies
            this.post_cookies_remove(login.email, login.password, undefined).then(() => {
              reject(jqXHR.responseJSON || errorThrown);
            });
          } else {
            reject(jqXHR.responseJSON || errorThrown);
          }
        });
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
        url: this.client.create_url(`${AuthService.URL_LOGIN}/send`),
        type: 'POST',
        data: request_code,
      });
    }

    /**
     * Logout on the backend side.
     * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/auth/logout
     */
    post_logout() {
      return this.client.send_json({
        url: this.client.create_url(`${AuthService.URL_ACCESS}/logout`),
        type: 'POST',
        withCredentials: true,
      });
    }

    /**
     * Register a new user.
     *
     * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/register
     *
     * @param {Object} new_user - Containing the email, username and password needed for account creation
     * @option {String} new_user - name
     * @option {String} new_user - email
     * @option {String} new_user - password
     * @option {String} new_user - locale
     * @return {Promise} Promise that will resolve on success
     */
    post_register(new_user) {
      return new Promise((resolve, reject) => {
        $.ajax({
          contentType: 'application/json; charset=utf-8',
          crossDomain: true,
          data: pako.gzip(JSON.stringify(new_user)),
          headers: {
            'Content-Encoding': 'gzip',
          },
          processData: false,
          type: 'POST',
          url: `${this.client.create_url(`${AuthService.URL_REGISTER}?challenge_cookie=true`)}`,
          xhrFields: {
            withCredentials: true,
          },
        }).done((data) => {
          resolve(data);
        }).fail((jqXHR, textStatus, errorThrown) => {
          reject(jqXHR.responseJSON || errorThrown);
        });
      });
    }

    /**
     * Save the access token date in the client.
     *
     * @param {String} type - Access token type
     * @param {String} value - Access token
     */
    save_access_token_in_client(type = '', value = '') {
      this.client.access_token_type = type;
      this.client.access_token = value;
    }
  };
})();
