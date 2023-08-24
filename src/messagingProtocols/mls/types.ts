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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CoreCryptoCallbacks} from '@wireapp/core-crypto';

export type SecretCrypto =
  | {
      encrypt: (value: Uint8Array) => Promise<Uint8Array>;
      decrypt: (payload: Uint8Array) => Promise<Uint8Array>;
      version: undefined;
    }
  | {
      encrypt: (value: string) => Promise<Uint8Array>;
      decrypt: (payload: Uint8Array) => Promise<string>;
      version: 1;
    };

export interface MLSCallbacks extends Pick<CoreCryptoCallbacks, 'authorize' | 'userAuthorize'> {
  /**
   * Should return a groupId corresponding to the conversation ID given
   * Used for the core to know what core-crypto conversation we are dealing with when receiving events
   * @param conversationId
   * @returns the bytes of the groupId corresponding to the conversation ID
   */
  groupIdFromConversationId: (conversationId: QualifiedId) => Promise<string | undefined>;
}

export type CommonMLS = {
  groupId: string;
};

export type HandlePendingProposalsParams = {
  delayInMs: number;
  eventTime: string;
} & CommonMLS;

export type CommitPendingProposalsParams = {
  skipDelete?: boolean;
} & CommonMLS;

export interface CryptoProtocolConfig {
  /**
   * encrypt/decrypt function pair that will be called before storing/fetching secrets in the secrets database.
   * If not provided will use the built in encryption mechanism
   */
  systemCrypto?: SecretCrypto;

  useCoreCrypto?: boolean;

  /**
   * path on the public server to the core crypto wasm file.
   * This file will be downloaded lazily when corecrypto is needed.
   * It, thus, needs to know where, on the server, the file can be found
   */
  coreCrypoWasmFilePath: string;

  /** If set will create an MLS capable device from the current device */
  mls?: {
    /**
     * (milliseconds) period of time between automatic updates of the keying material (30 days by default)
     */
    keyingMaterialUpdateThreshold?: number;
  };

  /** if set to true, will use experimental proteus encryption/decryption library (core-crypto). If not set will fallback to the legacy proteus library (cryptobox) */
  proteus?: boolean;
}
