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

  };
})();
