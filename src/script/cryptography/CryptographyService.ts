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

import type {ClientPreKey, PreKey} from '@wireapp/api-client/src/auth/';
import type {UserClients} from '@wireapp/api-client/src/conversation/';
import type {UserPreKeyBundleMap} from '@wireapp/api-client/src/user/';
import {container} from 'tsyringe';

import {APIClient} from '../service/APIClientSingleton';

export class CryptographyService {
  constructor(public readonly apiClient = container.resolve(APIClient)) {}

  /**
   * Gets a pre-key for a client of a user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getPrekey
   *
   * @param userId User ID
   * @param clientId Client ID
   * @returns Resolves with a pre-key for given the client of the user
   */
  getUserPreKeyByIds(userId: string, clientId: string): Promise<ClientPreKey> {
    return this.apiClient.user.api.getClientPreKey(userId, clientId);
  }

  /**
   * Gets a pre-key for each client of a user client map.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getMultiPrekeyBundles
   *
   * @param recipients User client map to request pre-keys for
   * @returns Resolves with a pre-key for each client of the given map
   */
  getUsersPreKeys(recipients: UserClients): Promise<UserPreKeyBundleMap> {
    return this.apiClient.user.api.postMultiPreKeyBundles(recipients);
  }

  /**
   * Put pre-keys for client to be used by remote clients for session initialization.
   *
   * @param clientId Local client ID
   * @param serializedPreKeys Additional pre-keys to be made available
   * @returns Resolves once the pre-keys are accepted
   */
  putClientPreKeys(clientId: string, serializedPreKeys: PreKey[]): Promise<void> {
    return this.apiClient.client.api.putClient(clientId, {prekeys: serializedPreKeys});
  }
}
