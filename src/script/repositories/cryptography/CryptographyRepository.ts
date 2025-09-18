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

import type {PreKey as BackendPreKey} from '@wireapp/api-client/lib/auth/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {container} from 'tsyringe';

import {getLogger, Logger} from 'Util/Logger';

import {CryptographyMapper} from './CryptographyMapper';

import {Core} from '../../service/CoreSingleton';

export interface SignalingKeys {
  enckey: string;
  mackey: string;
}

export interface ClientKeys {
  lastResortKey: BackendPreKey;
  preKeys: BackendPreKey[];
  signalingKeys: SignalingKeys;
}

export class CryptographyRepository {
  cryptographyMapper: CryptographyMapper;
  logger: Logger;

  constructor(private readonly core = container.resolve(Core)) {
    this.logger = getLogger('CryptographyRepository');
    this.cryptographyMapper = new CryptographyMapper();
  }

  get proteusService() {
    if (!this.core.service) {
      throw new Error('Core is not initiated');
    }
    return this.core.service!.proteus;
  }

  /**
   * Get the fingerprint of the local identity.
   * @returns Fingerprint of local identity public key
   */
  getLocalFingerprint(): Promise<string> {
    return this.proteusService.getLocalFingerprint();
  }

  /**
   * Get the fingerprint of a remote identity.
   * @param userId ID of user
   * @param clientId ID of client
   * @param preKey PreKey to initialize a session from
   * @returns Resolves with the remote fingerprint
   */
  async getRemoteFingerprint(userId: QualifiedId, clientId: string, prekey?: BackendPreKey) {
    return this.proteusService.getRemoteFingerprint(userId, clientId, prekey);
  }

  deleteSession(userId: QualifiedId, clientId: string): Promise<void> {
    return this.proteusService.deleteSession(userId, clientId);
  }
}
