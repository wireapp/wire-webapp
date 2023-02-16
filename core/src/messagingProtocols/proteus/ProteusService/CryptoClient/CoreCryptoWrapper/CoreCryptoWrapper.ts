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
import {Encoder} from 'bazinga64';
import {deleteDB} from 'idb';

import {CoreCrypto} from '@wireapp/core-crypto';
import type {CRUDEngine} from '@wireapp/store-engine';

import {PrekeyTracker} from './PrekeysTracker';
import {generateSecretKey, CorruptedKeyError} from './secretKeyGenerator';

import {CoreDatabase} from '../../../../../storage/CoreDB';
import {SecretCrypto} from '../../../../mls/types';
import {CryptoClient} from '../CryptoClient.types';

type Config = {
  systemCrypto?: SecretCrypto;
  nbPrekeys: number;
  onNewPrekeys: (prekeys: PreKey[]) => void;
};

type ClientConfig = Config & {
  onWipe: () => Promise<void>;
};

export async function buildClient(
  storeEngine: CRUDEngine,
  coreCryptoWasmFilePath: string,
  db: CoreDatabase,
  {systemCrypto, nbPrekeys, onNewPrekeys}: Config,
): Promise<CoreCryptoWrapper> {
  let key;
  const coreCryptoDbName = `corecrypto-${storeEngine.storeName}`;
  const secretKeysDbName = `secrets-${storeEngine.storeName}`;
  try {
    key = await generateSecretKey({
      dbName: secretKeysDbName,
      systemCrypto,
    });
  } catch (error) {
    if (error instanceof CorruptedKeyError) {
      // If we are dealing with a corrupted key, we wipe the key and the coreCrypto DB to start fresh
      await deleteDB(secretKeysDbName);
      await deleteDB(coreCryptoDbName);
      key = await generateSecretKey({
        dbName: secretKeysDbName,
        systemCrypto,
      });
    } else {
      throw error;
    }
  }
  const coreCrypto = await CoreCrypto.deferredInit({
    databaseName: coreCryptoDbName,
    key: Encoder.toBase64(key.key).asString,
    wasmFilePath: coreCryptoWasmFilePath,
  });
  return new CoreCryptoWrapper(coreCrypto, db, {nbPrekeys, onNewPrekeys, onWipe: key.deleteKey});
}

export class CoreCryptoWrapper implements CryptoClient {
  private readonly prekeyTracker: PrekeyTracker;

  constructor(private readonly coreCrypto: CoreCrypto, db: CoreDatabase, private readonly config: ClientConfig) {
    this.prekeyTracker = new PrekeyTracker(this, db, config);
  }

  getNativeClient() {
    return this.coreCrypto;
  }

  encrypt(sessions: string[], plainText: Uint8Array) {
    return this.coreCrypto.proteusEncryptBatched(sessions, plainText);
  }

  decrypt(sessionId: string, message: Uint8Array) {
    return this.coreCrypto.proteusDecrypt(sessionId, message);
  }

  init() {
    return this.coreCrypto.proteusInit();
  }

  async create(nbPrekeys: number, entropy?: Uint8Array) {
    if (entropy) {
      await this.coreCrypto.reseedRng(entropy);
    }
    await this.init();
    const prekeys: PreKey[] = [];
    for (let id = 0; id < nbPrekeys; id++) {
      prekeys.push(await this.newPrekey(id));
    }
    await this.prekeyTracker.setInitialState(prekeys.length);

    const lastPrekeyBytes = await this.coreCrypto.proteusLastResortPrekey();
    const lastPrekey = Encoder.toBase64(lastPrekeyBytes).asString;

    const lastPrekeyId = CoreCrypto.proteusLastResortPrekeyId();

    return {
      prekeys,
      lastPrekey: {id: lastPrekeyId, key: lastPrekey},
    };
  }

  getFingerprint() {
    return this.coreCrypto.proteusFingerprint();
  }

  getRemoteFingerprint(sessionId: string) {
    return this.coreCrypto.proteusFingerprintRemote(sessionId);
  }

  async sessionFromMessage(sessionId: string, message: Uint8Array) {
    await this.consumePrekey(); // we need to mark a prekey as consumed since if we create a session from a message, it means the sender has consumed one of our prekeys
    return this.coreCrypto.proteusSessionFromMessage(sessionId, message);
  }

  sessionFromPrekey(sessionId: string, prekey: Uint8Array) {
    return this.coreCrypto.proteusSessionFromPrekey(sessionId, prekey);
  }

  sessionExists(sessionId: string) {
    return this.coreCrypto.proteusSessionExists(sessionId);
  }

  saveSession(sessionId: string) {
    return this.coreCrypto.proteusSessionSave(sessionId);
  }

  deleteSession(sessionId: string) {
    return this.coreCrypto.proteusSessionDelete(sessionId);
  }

  consumePrekey() {
    return this.prekeyTracker.consumePrekey();
  }

  async newPrekey(id: number) {
    const key = await this.coreCrypto.proteusNewPrekey(id);
    return {id, key: Encoder.toBase64(key).asString};
  }

  async debugBreakSession(sessionId: string) {
    const fakePrekey = [
      165, 0, 1, 1, 24, 57, 2, 161, 0, 88, 32, 212, 202, 30, 83, 242, 93, 67, 164, 202, 137, 214, 167, 166, 183, 236,
      249, 32, 21, 117, 247, 56, 223, 135, 170, 3, 151, 16, 228, 165, 186, 124, 208, 3, 161, 0, 161, 0, 88, 32, 123,
      200, 16, 166, 184, 70, 21, 81, 43, 80, 21, 231, 182, 142, 51, 220, 131, 162, 11, 255, 162, 74, 78, 162, 95, 156,
      131, 48, 203, 5, 77, 122, 4, 246,
    ];
    await this.coreCrypto.proteusSessionFromPrekey(sessionId, Uint8Array.from(fakePrekey));
  }

  async debugResetIdentity() {
    await this.coreCrypto.wipe();
  }

  async migrateFromCryptobox(dbName: string) {
    return this.coreCrypto.proteusCryptoboxMigrate(dbName);
  }

  async wipe() {
    await this.config.onWipe();
    return this.coreCrypto.wipe();
  }
}
