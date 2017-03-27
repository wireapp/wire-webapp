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

  window.z.auth.AuthRepository = class AuthRepository {
    constructor(auth_service) {
      this.access_token_refresh = undefined;
      this.auth_service = auth_service;
      this.logger = new z.util.Logger('z.auth.AuthRepository', z.config.LOGGER.OPTIONS);
      amplify.subscribe(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, this.renew_access_token);
    }

    // Print all cookies for a user in the console.
    list_cookies() {
      this.auth_service.get_cookies()
        .then((cookies) => {
          this.logger.force_log('Backend cookies:');
          for (let i = 0, len = cookies.length; i < len; ++i) {
            const cookie = cookies[i];
            const expiration = z.util.format_timestamp(cookie.time, false);
            const log = `Label: ${cookie.label} | Type: ${cookie.type} |  Expiration: ${expiration}`;
            this.logger.force_log(`Cookie No. ${index + 1} | ${log}`);
          }
        })
        .catch((error) => {
          this.logger.force_log('Could not list user cookies', error);
        });
    }

    /**
     * Login (with email or phone) in order to obtain an access-token and cookie.
     *
     * @param {Object} login - Containing sign in information
     * @option {String} login - email The email address for a password login
     * @option {String} login - phone The phone number for a password or SMS login
     * @option {String} login - password The password for a password login
     * @option {String} login - code The login code for an SMS login
     * @param {Boolean} persist - Request a persistent cookie instead of a session cookie
     * @return {Promise} Promise that resolves with the received access token
     */
    login(login, persist) {
      return auth_service.post_login(login, persist)
        .then((response) => {
          this.save_access_token(response);
          z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.PERSIST, persist);
          z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.SHOW_LOGIN, true);
          return response
        });
    }
  }
})();
