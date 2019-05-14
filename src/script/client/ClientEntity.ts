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
import {isString} from 'underscore';

import {zeroPadding} from 'Util/util';
import {ClientMapper} from './ClientMapper';
import {ClientType} from './ClientType';

export class ClientEntity {
  static CONFIG = {
    DEFAULT_VALUE: '?',
  };

  address?: string;
  class: string;
  cookie?: string;
  id: string;
  isSelfClient: boolean;
  label?: string;
  location?: object;
  meta: {isVerified: ko.Observable<boolean>; primaryKey?: string};
  model?: string;
  time?: string;
  type?: ClientType;

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
      this.type = ClientType.TEMPORARY;
    }

    // Metadata maintained by us
    this.meta = {
      isVerified: ko.observable(false),
      primaryKey: undefined,
    };
  }

  /**
   * Splits an ID into user ID & client ID.
   */
  static dismantleUserClientId(id: string): {clientId: string; userId: string} {
    const [userId, clientId] = isString(id) ? id.split('@') : ([] as string[]);
    return {clientId, userId};
  }

  /**
   * Returns the ID of a client in a format suitable for UI display in user preferences.
   * @returns Client ID in pairs of two as an array
   */
  formatId(): string[] {
    return zeroPadding(this.id, 16).match(/.{1,2}/g);
  }

  isPermanent(): boolean {
    return this.type === ClientType.PERMANENT;
  }

  isTemporary(): boolean {
    return this.type === ClientType.TEMPORARY;
  }

  /**
   * This method returns an object which can be stored in our local database.
   */
  toJson(): Record<string, any> {
    const jsonObject = JSON.parse(ko.toJSON(this));
    delete jsonObject.isSelfClient;

    ClientMapper.CONFIG.CLIENT_PAYLOAD.forEach(name => this._removeDefaultValues(jsonObject, name));

    if (this.isSelfClient) {
      ClientMapper.CONFIG.SELF_CLIENT_PAYLOAD.forEach(name => this._removeDefaultValues(jsonObject, name));
    }

    jsonObject.meta.is_verified = jsonObject.meta.isVerified;
    delete jsonObject.meta.isVerified;

    if (jsonObject.meta.primaryKey) {
      jsonObject.meta.primary_key = jsonObject.meta.primaryKey;
      delete jsonObject.meta.primaryKey;
    }

    return jsonObject;
  }

  _removeDefaultValues(jsonObject: Record<string, any>, memberName: string): void {
    if (jsonObject.hasOwnProperty(memberName)) {
      const isDefaultValue = jsonObject[memberName] === ClientEntity.CONFIG.DEFAULT_VALUE;
      if (isDefaultValue) {
        jsonObject[memberName] = '';
      }
    }
  }
}
