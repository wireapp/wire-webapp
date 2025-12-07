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

import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client/';
import ko from 'knockout';
import {ClientRecord} from 'Repositories/storage';
import {splitFingerprint} from 'Util/StringUtil';

import {ClientMapper} from './ClientMapper';

import {isObject} from '../../guards/common';

export const MLSPublicKeys = {
  ed25519: 'ED25519',
  ed448: 'ED448',
  ecdsa_secp521r1_sha512: 'P521',
  ecdsa_secp384r1_sha384: 'P384',
  ecdsa_secp256r1_sha256: 'P256',
} as const;

export const isKnownSignature = (signature: unknown): signature is keyof typeof MLSPublicKeys =>
  signature !== undefined && typeof signature === 'string' && Object.keys(MLSPublicKeys).includes(signature);

export class ClientEntity {
  static CONFIG = {
    DEFAULT_VALUE: '?',
  };

  address?: string;
  class: ClientClassification | '?';
  cookie?: string;
  domain?: string | null;
  id: string;
  isSelfClient: boolean;
  label?: string;

  meta: {
    isVerified: ko.Observable<boolean>;
    primaryKey?: string;
    userId?: string;
  };
  model?: string;
  time?: string;
  type?: ClientType.PERMANENT | ClientType.TEMPORARY;
  mlsPublicKeys?: Partial<Record<keyof typeof MLSPublicKeys, string>>;

  constructor(isSelfClient: boolean, domain: string | null, id = '') {
    this.isSelfClient = isSelfClient;

    this.class = '?';
    this.id = id;
    this.domain = domain;

    if (this.isSelfClient) {
      this.address = '';
      this.cookie = '';
      this.label = ClientEntity.CONFIG.DEFAULT_VALUE;
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
   * Returns the ID of a client in a format suitable for UI display in user preferences.
   * @returns Client ID in pairs of two as an array
   */
  formatId(): string[] {
    return splitFingerprint(this.id);
  }

  isLegalHold(): boolean {
    return this.class === ClientClassification.LEGAL_HOLD;
  }

  isPermanent(): boolean {
    return this.type === ClientType.PERMANENT;
  }

  isTemporary(): boolean {
    return this.type === ClientType.TEMPORARY;
  }

  getName(): string | undefined {
    const hasModel = this.model && this.model !== ClientEntity.CONFIG.DEFAULT_VALUE;
    return hasModel ? this.model : this.class.toUpperCase();
  }

  getCipherSuite(): string | undefined {
    return isObject(this.mlsPublicKeys) && Object.keys(this.mlsPublicKeys).length > 0
      ? Object.keys(this.mlsPublicKeys).at(0)
      : undefined;
  }

  /**
   * This method returns an object which can be stored in our local database.
   */
  toJson(): ClientRecord {
    const jsonObject = JSON.parse(ko.toJSON(this));
    delete jsonObject.isSelfClient;

    ClientMapper.CONFIG.CLIENT_PAYLOAD.forEach(name => this.removeDefaultValues(jsonObject, name));

    if (this.isSelfClient) {
      ClientMapper.CONFIG.SELF_CLIENT_PAYLOAD.forEach(name => this.removeDefaultValues(jsonObject, name));
    }

    jsonObject.meta.is_verified = jsonObject.meta.isVerified;
    delete jsonObject.meta.isVerified;

    jsonObject.meta.is_mls_verified = jsonObject.meta.isMLSVerified;
    delete jsonObject.meta.isMLSVerified;

    if (jsonObject.meta.primaryKey) {
      jsonObject.meta.primary_key = jsonObject.meta.primaryKey;
      delete jsonObject.meta.primaryKey;
    }

    return jsonObject;
  }

  private removeDefaultValues(jsonObject: Record<string, any>, memberName: string): void {
    if (jsonObject.hasOwnProperty(memberName)) {
      const isDefaultValue = jsonObject[memberName] === ClientEntity.CONFIG.DEFAULT_VALUE;
      if (isDefaultValue) {
        jsonObject[memberName] = '';
      }
    }
  }
}
