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
    RETRY_TIMEOUT: 500
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
     * @returns {Promise} Promise that resolves with an array of cookies.
     */
    get_cookies() {
      return this.client.send_request({
        url: this.client.create_url(this.URL_COOKIES),
        type: 'GET'
      }).then((data) => {
        return data.cookies;
      });
    }

    /**
     * Get invite information.
     * @param {String} code - Invite code
     * @returns {Promise} Promise that resolves with invitations information.
     */
    get_invitations_info(code) {
      return this.client.send_request({
        url: this.client.create_url(`${this.URL_INVITATIONS}/info?code=${code}`),
        type: 'GET'
      });
    }

    /**
     * Get access-token if a valid cookie is provided.
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
            withCredentials: true
          }
        };

        if (this.client.access_token) {
          config.headers = {
            Authorization: `Bearer ${window.decodeURIComponent(this.client.access_token)}`
          }
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

            _retry = () => {
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
  };
})();
