/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/src/user';
import {CoreCryptoCallbacks} from '@wireapp/core-crypto';

type SecretCrypto<T> = {
  encrypt: (value: Uint8Array) => Promise<T>;
  decrypt: (payload: T) => Promise<Uint8Array>;
};

export interface MLSCallbacks extends Pick<CoreCryptoCallbacks, 'authorize'> {
  /**
   * Should return a groupId corresponding to the conversation ID given
   * Used for the core to know what core-crypto conversation we are dealing with when receiving events
   * @param conversationId
   * @returns the bytes of the groupId corresponding to the conversation ID
   */
  groupIdFromConversationId: (conversationId: QualifiedId) => Promise<string | undefined>;
}

export interface MLSConfig<T = any> {
  /**
   * encrypt/decrypt function pair that will be called before storing/fetching secrets in the secrets database.
   * If not provided will use the built in encryption mechanism
   */
  systemCrypto?: SecretCrypto<T>;

  /**
   * path on the public server to the core crypto wasm file.
   * This file will be downloaded lazily when corecrypto is needed.
   * It, thus, needs to know where, on the server, the file can be found
   */
  coreCrypoWasmFilePath: string;

  /**
   * (milliseconds) period of time between automatic updates of the keying material (30 days by default)
   */
  keyingMaterialUpdateThreshold?: number;
}
