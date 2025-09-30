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

import {LogFactory} from '@wireapp/commons';
import {
  CoreCrypto,
  CoreCryptoLogLevel,
  setLogger,
  setMaxLogLevel,
  version as CCVersion,
  initWasmModule,
  migrateDatabaseKeyTypeToBytes,
  DatabaseKey,
} from '@wireapp/core-crypto';
import type {CRUDEngine} from '@wireapp/store-engine';

import {PrekeyTracker} from './PrekeysTracker';

import {CorruptedKeyError, GeneratedKey} from '../../../../../secretStore/secretKeyGenerator';
import {CoreCryptoConfig} from '../../../../common.types';
import {CryptoClient} from '../CryptoClient.types';

type Config = {
  generateSecretKey: (keyId: string, keySize: 16 | 32) => Promise<GeneratedKey>;
  nbPrekeys: number;
  onNewPrekeys: (prekeys: PreKey[]) => void;
};

type ClientConfig = Omit<Config, 'generateSecretKey'> & {
  onWipe: () => Promise<void>;
};

const logger = LogFactory.getLogger('@wireapp/core/CoreCryptoWrapper');

const logFunctions: Record<CoreCryptoLogLevel, Function> = {
  1: logger.debug,
  2: logger.debug,
  3: logger.debug,
  4: logger.info,
  5: logger.warn,
  6: logger.error,
};

const coreCryptoLogger = {
  log: (level: CoreCryptoLogLevel, message: string, context: string) => {
    logFunctions[level].call(logger, {message, context});
  },
};

const getKey = async (generateSecretKey: Config['generateSecretKey'], keyName: string, keySize: 16 | 32) => {
  return await generateSecretKey(keyName, keySize);
};

type MigrateOnceAndGetKeyReturnType = {
  key: DatabaseKey;
  deleteKey: () => Promise<void>;
};
const migrateOnceAndGetKey = async (
  generateSecretKey: Config['generateSecretKey'],
  coreCryptoDbName: string,
): Promise<MigrateOnceAndGetKeyReturnType> => {
  const coreCryptoNewKeyId = 'corecrypto-key-v2';
  const coreCryptoKeyId = 'corecrypto-key';

  // We retrieve the old key if it exists or generate a new one
  const keyOld = await getKey(generateSecretKey, coreCryptoKeyId, 16);
  // We retrieve the new key if it exists or generate a new one
  const keyNew = await getKey(generateSecretKey, coreCryptoNewKeyId, 32);

  if (!keyNew || !keyOld) {
    // If we dont retreive any key, we throw an error
    // This should not happen since we generate a new key if it does not exist
    throw new Error('Key not found and could not be generated');
  }

  /**
   * Handles migration and cleanup of encryption keys.
   *
   * - If `keyNew` is freshly generated and `keyOld` is not freshly generated:
   *     - Migrate data from `keyOld` to `keyNew`
   */
  if (keyNew.freshlyGenerated && !keyOld.freshlyGenerated) {
    const databaseKey = new DatabaseKey(keyNew.key);
    await migrateDatabaseKeyTypeToBytes(coreCryptoDbName, Encoder.toBase64(keyOld.key).asString, databaseKey);
  }

  // Always clean up the old key
  await keyOld.deleteKey();

  return {
    key: new DatabaseKey(keyNew.key),
    deleteKey: keyNew.deleteKey,
  };
};

export const getCoreCryptoDbName = (storeEngine: CRUDEngine): string => {
  return `corecrypto-${storeEngine.storeName}`;
};

export const wipeCoreCryptoDb = async (storeEngine: CRUDEngine): Promise<void> => {
  const coreCryptoDbName = getCoreCryptoDbName(storeEngine);
  try {
    await coreCryptoInstance?.close();
    await deleteDB(coreCryptoDbName);
    logger.log('info', 'CoreCrypto DB wiped successfully');
  } catch (error) {
    logger.error('error', 'Failed to wipe CoreCrypto DB');
  }
};

let coreCryptoInstance: CoreCrypto | undefined;
export async function buildClient(
  storeEngine: CRUDEngine,
  {generateSecretKey, nbPrekeys, onNewPrekeys}: Config,
  {wasmFilePath}: CoreCryptoConfig,
): Promise<CoreCryptoWrapper> {
  return (
    // We need to initialize the coreCrypto package with the path to the wasm file
    // before we can use it. This is a one time operation and should be done
    // before we create the CoreCrypto instance.
    initWasmModule(wasmFilePath)
      .then(async output => {
        logger.log('info', 'CoreCrypto initialized', {output});
        const coreCryptoDbName = getCoreCryptoDbName(storeEngine);
        // New key format used by coreCrypto
        let key: MigrateOnceAndGetKeyReturnType;

        try {
          key = await migrateOnceAndGetKey(generateSecretKey, coreCryptoDbName);
        } catch (error) {
          if (error instanceof CorruptedKeyError) {
            // If we are dealing with a corrupted key, we wipe the key and the coreCrypto DB to start fresh
            await wipeCoreCryptoDb(storeEngine);
            key = await migrateOnceAndGetKey(generateSecretKey, coreCryptoDbName);
          } else {
            throw error;
          }
        }

        coreCryptoInstance = await CoreCrypto.deferredInit({
          databaseName: coreCryptoDbName,
          key: key.key,
        });

        setLogger(coreCryptoLogger);
        setMaxLogLevel(CoreCryptoLogLevel.Info);

        return new CoreCryptoWrapper(coreCryptoInstance, {nbPrekeys, onNewPrekeys, onWipe: key.deleteKey});
      })
      // if the coreCrypto initialization fails, can not use the crypto client and throw an error
      .catch(async error => {
        logger.error('error', 'CoreCrypto initialization failed', {error});
        // If the initialization fails, we wipe the coreCrypto DB to start fresh
        await wipeCoreCryptoDb(storeEngine);
        throw error;
      })
  );
}

export class CoreCryptoWrapper implements CryptoClient {
  private readonly prekeyTracker: PrekeyTracker;
  public readonly version: string;

  constructor(
    private readonly coreCrypto: CoreCrypto,
    config: ClientConfig,
  ) {
    this.version = CCVersion();
    this.prekeyTracker = new PrekeyTracker(this, config);
  }

  getNativeClient() {
    return this.coreCrypto;
  }

  encrypt(sessions: string[], plainText: Uint8Array) {
    return this.coreCrypto.transaction(cx => cx.proteusEncryptBatched(sessions, plainText));
  }

  decrypt(sessionId: string, message: Uint8Array) {
    return this.coreCrypto.transaction(cx => cx.proteusDecrypt(sessionId, message));
  }

  init(nbInitialPrekeys?: number) {
    if (nbInitialPrekeys) {
      this.prekeyTracker.setInitialState(nbInitialPrekeys);
    }
    return this.coreCrypto.transaction(cx => cx.proteusInit());
  }

  async create(nbPrekeys: number, entropy?: Uint8Array) {
    if (entropy) {
      await this.coreCrypto.reseedRng(entropy);
    }
    await this.init();
    const prekeys: PreKey[] = [];
    for (let id = 0; id < nbPrekeys; id++) {
      prekeys.push(await this.newPrekey());
    }

    const lastPrekeyBytes = await this.coreCrypto.transaction(cx => cx.proteusLastResortPrekey());
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
    return this.coreCrypto.transaction(cx => cx.proteusSessionFromMessage(sessionId, message));
  }

  sessionFromPrekey(sessionId: string, prekey: Uint8Array) {
    return this.coreCrypto.transaction(cx => cx.proteusSessionFromPrekey(sessionId, prekey));
  }

  sessionExists(sessionId: string) {
    return this.coreCrypto.proteusSessionExists(sessionId);
  }

  saveSession(sessionId: string) {
    return this.coreCrypto.transaction(cx => cx.proteusSessionSave(sessionId));
  }

  deleteSession(sessionId: string) {
    return this.coreCrypto.transaction(cx => cx.proteusSessionDelete(sessionId));
  }

  consumePrekey() {
    return this.prekeyTracker.consumePrekey();
  }

  async newPrekey() {
    const {id, pkb} = await this.coreCrypto.transaction(cx => cx.proteusNewPrekeyAuto());
    return {id, key: Encoder.toBase64(pkb).asString};
  }

  async debugBreakSession(sessionId: string) {
    const fakePrekey = [
      165, 0, 1, 1, 24, 57, 2, 161, 0, 88, 32, 212, 202, 30, 83, 242, 93, 67, 164, 202, 137, 214, 167, 166, 183, 236,
      249, 32, 21, 117, 247, 56, 223, 135, 170, 3, 151, 16, 228, 165, 186, 124, 208, 3, 161, 0, 161, 0, 88, 32, 123,
      200, 16, 166, 184, 70, 21, 81, 43, 80, 21, 231, 182, 142, 51, 220, 131, 162, 11, 255, 162, 74, 78, 162, 95, 156,
      131, 48, 203, 5, 77, 122, 4, 246,
    ];
    await this.coreCrypto.transaction(cx => cx.proteusSessionFromPrekey(sessionId, Uint8Array.from(fakePrekey)));
  }
}
