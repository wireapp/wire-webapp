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
window.z.client = z.client || {};

z.client.Client = class Client {
  constructor(payload = {}) {
    this.class = '?';
    this.label = '?';
    this.model = '?';

    for (const member in payload) {
      this[member] = payload[member];
    }

    // Metadata maintained by us
    this.meta = {
      is_verified: ko.observable(false),
      primary_key: undefined,
    };

    this.session = {};
  }

  /**
   * Splits an ID into user ID & client ID.
   * @param {string} id - Client ID to be dismantled
   * @returns {Object} Object containing the user ID & client ID
   */
  static dismantle_user_client_id(id) {
    const [user_id, client_id] = (id != null ? id.split('@') : undefined) || [];
    return {
      client_id: client_id,
      user_id: user_id,
    };
  }

  /**
   * @returns {boolean} True, if the client is the self user's permanent client.
   */
  is_permanent() {
    return this.type === z.client.ClientType.PERMANENT;
  }

  /**
   * @returns {boolean} - True, if it is NOT the client of the self user.
   */
  is_remote() {
    return !this.is_permanent() && !this.is_temporary();
  }

  /**
   * @returns {boolean} - True, if the client is the self user's temporary client.
   */
  is_temporary() {
    return this.type === z.client.ClientType.TEMPORARY;
  }

  /**
   * This method returns a JSON object which can be stored in our local database.
   * @returns {Object} Client data as JSON object
   */
  to_json() {
    const real_json = JSON.parse(ko.toJSON(this));
    delete real_json.session;

    for (const member of real_json) {
      if (real_json.hasOwnProperty(member)) {
        if (real_json.member === '?') {
          delete real_json.member;
        }
      }
    }

    return real_json;
  }
};
