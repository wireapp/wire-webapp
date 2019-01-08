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

import ko from 'knockout';

window.z = window.z || {};
window.z.client = z.client || {};

class ClientEntity {
  static get CONFIG() {
    return {
      DEFAULT_VALUE: '?',
    };
  }

  constructor(isSelfClient = false) {
    this.isSelfClient = isSelfClient;

    this.class = ClientEntity.CONFIG.DEFAULT_VALUE;
    this.id = '';

    if (this.isSelfClient) {
      this.address = '';
      this.cookie = '';
      this.label = ClientEntity.CONFIG.DEFAULT_VALUE;
      this.location = {};
      this.model = ClientEntity.CONFIG.DEFAULT_VALUE;
      this.time = ClientEntity.CONFIG.DEFAULT_VALUE;
      this.type = z.client.ClientType.TEMPORARY;
    }

    // Metadata maintained by us
    this.meta = {
      isVerified: ko.observable(false),
      primaryKey: undefined,
    };

    this.session = {};
  }

  /**
   * Splits an ID into user ID & client ID.
   * @param {string} id - Client ID to be dismantled
   * @returns {Object} Object containing the user ID & client ID
   */
  static dismantleUserClientId(id) {
    const [userId, clientId] = _.isString(id) ? id.split('@') : [];
    return {clientId, userId};
  }

  /**
   * Returns the ID of a client in a format suitable for UI display in user preferences.
   * @returns {Array<string>} Client ID in pairs of two as an array
   */
  formatId() {
    return z.util.zeroPadding(this.id, 16).match(/.{1,2}/g);
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
    delete jsonObject.isSelfClient;
    delete jsonObject.session;

    z.client.ClientMapper.CONFIG.CLIENT_PAYLOAD.forEach(name => this._removeDefaultValues(jsonObject, name));

    if (this.isSelfClient) {
      z.client.ClientMapper.CONFIG.SELF_CLIENT_PAYLOAD.forEach(name => this._removeDefaultValues(jsonObject, name));
    }

    jsonObject.meta.is_verified = jsonObject.meta.isVerified;
    delete jsonObject.meta.isVerified;

    if (jsonObject.meta.primaryKey) {
      jsonObject.meta.primary_key = jsonObject.meta.primaryKey;
      delete jsonObject.meta.primaryKey;
    }

    return jsonObject;
  }

  _removeDefaultValues(jsonObject, memberName) {
    if (jsonObject.hasOwnProperty(memberName)) {
      const isDefaultValue = jsonObject[memberName] === ClientEntity.CONFIG.DEFAULT_VALUE;
      if (isDefaultValue) {
        jsonObject[memberName] = '';
      }
    }
  }
}

export default ClientEntity;
z.client.ClientEntity = ClientEntity;
