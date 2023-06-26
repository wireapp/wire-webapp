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

export interface CommitBundle {}

export enum Ciphersuite {
  MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519 = 1,
}

export enum CredentialType {
  Basic = 1,
}

export enum GroupInfoEncryptionType {
  Plaintext = 1,
  JweEncrypted = 2,
}

export enum RatchetTreeType {
  Full = 1,
  Delta = 2,
  ByRef = 3,
}

export class CoreCrypto {
  proteusInit = jest.fn();
  proteusNewPrekey = jest.fn(() => Uint8Array.from([]));
  getRemoteFingerprint = jest.fn();
  getLocalFingerprint = jest.fn();
  proteusSessionExists = jest.fn();
  proteusSessionFromPrekey = jest.fn();
  proteusFingerprintRemote = jest.fn();
  proteusEncryptBatched = jest.fn();
  proteusSessionSave = jest.fn();
  proteusDecrypt = jest.fn().mockResolvedValue(Uint8Array.from([]));
  proteusSessionFromMessage = jest.fn().mockResolvedValue(Uint8Array.from([]));

  static deferredInit() {
    return new CoreCrypto();
  }
}
