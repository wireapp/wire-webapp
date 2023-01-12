/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {PreKey} from '@wireapp/api-client/lib/auth';

export const LAST_PREKEY_ID = 65535;
export type InitialPrekeys = {prekeys: PreKey[]; lastPrekey: PreKey};

export interface CryptoClient<T = unknown> {
  getNativeClient(): T;
  encrypt(sessions: string[], plainText: Uint8Array): Promise<Map<string, Uint8Array>>;
  decrypt(sessionId: string, message: Uint8Array): Promise<Uint8Array>;

  /**
   * Will init an already existing client. The client should already exist in the database. If the client doesn't exist, it needs to be created using the `create` method.
   */
  init(): Promise<void>;

  /**
   * Will create a new client and store it in the database
   */
  create(nbPrekeys: number, entropy?: Uint8Array): Promise<InitialPrekeys>;
  getFingerprint(): Promise<string>;
  getRemoteFingerprint(sessionId: string): Promise<string>;
  sessionFromMessage(sessionId: string, message: Uint8Array): Promise<Uint8Array>;
  sessionFromPrekey(sessionId: string, prekey: Uint8Array): Promise<void>;
  sessionExists(sessionId: string): Promise<boolean>;
  saveSession(sessionId: string): Promise<void>;
  consumePrekey: () => Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  newPrekey(id: number): Promise<PreKey>;
  debugBreakSession(sessionId: string): void;
  debugResetIdentity(): Promise<void>;
  /**
   * Will migrate the database from a different client type
   */
  migrateFromCryptobox?(dbName: string): Promise<void>;
  wipe(): Promise<void>;
}
