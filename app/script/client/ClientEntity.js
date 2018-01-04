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

z.client.ClientEntity = class ClientEntity {
  static get CONFIG() {
    return {
      DEFAULT_VALUE: '?',
    };
  }

  constructor(payload = {}) {
    this.class = ClientEntity.CONFIG.DEFAULT_VALUE;

    if (payload.address) {
      this.label = ClientEntity.CONFIG.DEFAULT_VALUE;
      this.model = ClientEntity.CONFIG.DEFAULT_VALUE;
    }

    for (const property in payload) {
      if (payload.hasOwnProperty(property) && payload[property] !== undefined) {
        this[property] = payload[property];
      }
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
  static dismantleUserClientId(id) {
    const [userId, clientId] = (id ? id.split('@') : undefined) || [];
    return {clientId, userId};
  }

  /**
   * Returns the ID of a client in a format suitable for UI display in user preferences.
   * @returns {Array<string>} Client ID in pairs of two as an array
   */
  formatId() {
    return z.util.zero_padding(this.id, 16).match(/.{1,2}/g);
  }

  /**
   * @returns {boolean} True, if the client is the self user's permanent client.
   */
  isPermanent() {
    return this.type === z.client.ClientType.PERMANENT;
  }

  /**
   * @returns {boolean} - True, if it is NOT the client of the self user.
   */
  isRemote() {
    return !this.isPermanent() && !this.isTemporary();
  }

  /**
   * @returns {boolean} - True, if the client is the self user's temporary client.
   */
  isTemporary() {
    return this.type === z.client.ClientType.TEMPORARY;
  }

  /**
   * This method returns a JSON object which can be stored in our local database.
   * @returns {Object} Client data as JSON object
   */
  toJson() {
    const jsonObject = JSON.parse(ko.toJSON(this));
    delete jsonObject.session;

    for (const property in jsonObject) {
      if (jsonObject.hasOwnProperty(property) && jsonObject[property] === ClientEntity.CONFIG.DEFAULT_VALUE) {
        delete jsonObject[property];
      }
    }

    return jsonObject;
  }
};
