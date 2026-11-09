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

import type {Clock} from '@enormora/clock/clock';
import {PreKey} from '@wireapp/api-client/lib/auth';
import {Encoder} from '@wireapp/commons/lib/base64/encoder';
import {deleteDB} from 'idb';
import {result, task, type Result, type Task} from 'true-myth';

import {LogFactory} from '@wireapp/commons';
import {
  CoreCrypto,
  CoreCryptoLogLevel,
  setLogger,
  setMaxLogLevel,
  version as CCVersion,
  initWasmModule,
  migrateDatabaseKeyTypeToBytes,
  Database,
  DatabaseKey,
  PkiEnvironment,
  proteusLastResortPrekeyId,
  type PkiEnvironmentHooks,
} from '@wireapp/core-crypto';

import {releaseCoreCryptoHandles} from './coreCryptoHandleLifecycle';
import {removeCoreCryptoOpfsDatabase} from './coreCryptoOpfsStorage';
import {PrekeyTracker} from './prekeysTracker';

import {CorruptedKeyError, GeneratedKey} from '../../../../../secretStore/secretKeyGenerator';
import type {CRUDEngine} from '../../../../../storage/engine/crudEngine';
import {CoreCryptoConfig} from '../../../../common.types';
import {CryptoClient, InitialPrekeys} from '../cryptoClient.types';

type SecretKeySizeInBytes = 16 | 32;
const legacySecretKeySizeInBytes = 16;
const secretKeySizeInBytes = 32;
const reseedSeedSizeInBytes = 32;

const validateReseedSeed = (seed: Uint8Array): Result<Uint8Array, Error> => {
  if (seed.byteLength !== reseedSeedSizeInBytes) {
    return result.err(
      new Error(
        `CoreCrypto reseed requires a seed of exactly ${reseedSeedSizeInBytes} bytes, received ${seed.byteLength}`,
      ),
    );
  }
  return result.ok(seed);
};

type Config = {
  clock: Clock;
  generateSecretKey: (keyId: string, keySize: SecretKeySizeInBytes) => Promise<GeneratedKey>;
  nbPrekeys: number;
  onNewPrekeys: (prekeys: PreKey[]) => void;
};

type ClientConfig = Omit<Config, 'clock' | 'generateSecretKey'> & {
  onWipe: () => Promise<void>;
};

type CoreCryptoRuntime = {
  configureLogging: () => void;
  createCoreCrypto: (database: Database) => CoreCrypto;
  createDatabaseKey: (key: Uint8Array) => DatabaseKey;
  getVersion: () => string;
  initializeWasm: (wasmFilePath?: string) => Promise<void>;
  migrateDatabaseKey: (databaseName: string, oldKey: string, newKey: DatabaseKey) => Promise<void>;
  openDatabase: (databaseName: string, key: DatabaseKey) => Promise<Database>;
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
  log: (level: CoreCryptoLogLevel, message: string, context: string | undefined) => {
    logFunctions[level].call(logger, {message, context});
  },
};

const defaultCoreCryptoRuntime: CoreCryptoRuntime = {
  configureLogging: () => {
    setLogger(coreCryptoLogger);
    setMaxLogLevel(CoreCryptoLogLevel.Info);
  },
  createCoreCrypto: database => {
    return CoreCrypto.new(database);
  },
  createDatabaseKey: key => {
    return new DatabaseKey(key);
  },
  getVersion: CCVersion,
  initializeWasm: initWasmModule,
  migrateDatabaseKey: migrateDatabaseKeyTypeToBytes,
  openDatabase: (databaseName, key) => {
    return Database.open(databaseName, key);
  },
};

const getKey = async (
  generateSecretKey: Config['generateSecretKey'],
  keyName: string,
  keySize: SecretKeySizeInBytes,
): Promise<GeneratedKey> => {
  return await generateSecretKey(keyName, keySize);
};

type MigrateOnceAndGetKeyReturnType = {
  key: DatabaseKey;
  deleteKey: () => Promise<void>;
};
const migrateOnceAndGetKey = async (
  generateSecretKey: Config['generateSecretKey'],
  coreCryptoDbName: string,
  runtime: CoreCryptoRuntime,
): Promise<MigrateOnceAndGetKeyReturnType> => {
  const coreCryptoNewKeyId = 'corecrypto-key-v2';
  const coreCryptoKeyId = 'corecrypto-key';

  // We retrieve the old key if it exists or generate a new one
  const keyOld = await getKey(generateSecretKey, coreCryptoKeyId, legacySecretKeySizeInBytes);
  // We retrieve the new key if it exists or generate a new one
  const keyNew = await getKey(generateSecretKey, coreCryptoNewKeyId, secretKeySizeInBytes);

  if (keyNew === undefined || keyOld === undefined) {
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
    const databaseKey = runtime.createDatabaseKey(keyNew.key);
    await runtime.migrateDatabaseKey(coreCryptoDbName, Encoder.toBase64(keyOld.key).asString, databaseKey);
  }

  // Always clean up the old key
  await keyOld.deleteKey();

  return {
    key: runtime.createDatabaseKey(keyNew.key),
    deleteKey: keyNew.deleteKey,
  };
};

export const getCoreCryptoDbName = (storeEngine: CRUDEngine): string => {
  return `corecrypto-${storeEngine.storeName}`;
};

let coreCryptoInstance: CoreCrypto | undefined;
let coreCryptoDatabase: Database | undefined;
let coreCryptoPkiEnvironment: PkiEnvironment | undefined;

const destroyCoreCryptoHandles = (): Result<void, Error> => {
  const instance = coreCryptoInstance;
  const database = coreCryptoDatabase;
  const pkiEnvironment = coreCryptoPkiEnvironment;

  // Clear the references first so a failed destroy cannot leave handles that
  // might be destroyed a second time on a later wipe attempt.
  coreCryptoInstance = undefined;
  coreCryptoDatabase = undefined;
  coreCryptoPkiEnvironment = undefined;

  return releaseCoreCryptoHandles({database, instance, pkiEnvironment});
};

/**
 * Creates the PKI environment used for X509 credential acquisition and registers it on the
 * current CoreCrypto instance.
 *
 * The environment is owned by this module because it shares the lifetime of the CoreCrypto
 * database handle. It is destroyed together with the other handles on wipe, so callers never
 * receive a database handle that can outlive (and dangle after) a wipe.
 */
export const createPkiEnvironment = (hooks: PkiEnvironmentHooks): Task<PkiEnvironment, Error> => {
  return task.tryOrElse(
    cause => {
      return new Error('Failed to create the CoreCrypto PKI environment', {cause});
    },
    async () => {
      if (coreCryptoInstance === undefined || coreCryptoDatabase === undefined) {
        throw new Error('CoreCrypto is not initialized');
      }

      const pkiEnvironment = await PkiEnvironment.create(hooks, coreCryptoDatabase);
      await coreCryptoInstance.setPkiEnvironment(pkiEnvironment);
      coreCryptoPkiEnvironment?.uniffiDestroy();
      coreCryptoPkiEnvironment = pkiEnvironment;
      return pkiEnvironment;
    },
  );
};

const removeCoreCryptoOpfsFiles = (databaseLocation: string, clock: Clock): Task<void, Error> => {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.getDirectory !== 'function') {
    return task.resolve(undefined);
  }

  return task
    .tryOrElse(
      cause => {
        return new Error('Failed to access OPFS while wiping the CoreCrypto database', {cause});
      },
      () => {
        return navigator.storage.getDirectory();
      },
    )
    .andThen(opfsRoot => {
      return removeCoreCryptoOpfsDatabase(opfsRoot, databaseLocation, clock);
    });
};

const wipeCoreCryptoDbTask = (storeEngine: CRUDEngine, clock: Clock): Task<void, Error> => {
  const coreCryptoDbName = getCoreCryptoDbName(storeEngine);

  const destroyResult = destroyCoreCryptoHandles();
  if (result.isErr(destroyResult)) {
    return task.reject(destroyResult.error);
  }

  const deleteLegacyIndexedDb = task.tryOrElse(
    cause => {
      return new Error(`Failed to remove legacy CoreCrypto IndexedDB database "${coreCryptoDbName}"`, {cause});
    },
    () => {
      return deleteDB(coreCryptoDbName);
    },
  );

  return task.all([deleteLegacyIndexedDb, removeCoreCryptoOpfsFiles(coreCryptoDbName, clock)]).map(() => {
    return undefined;
  });
};

export const wipeCoreCryptoDb = async (storeEngine: CRUDEngine, clock: Clock): Promise<void> => {
  const wipeResult = await wipeCoreCryptoDbTask(storeEngine, clock);
  if (result.isErr(wipeResult)) {
    logger.error('Failed to wipe CoreCrypto DB', {error: wipeResult.error});
    return Promise.reject(wipeResult.error);
  }

  logger.info('CoreCrypto DB wiped successfully');
};

export async function buildClient(
  storeEngine: CRUDEngine,
  {clock, generateSecretKey, nbPrekeys, onNewPrekeys}: Config,
  {wasmFilePath}: CoreCryptoConfig,
  runtime: CoreCryptoRuntime = defaultCoreCryptoRuntime,
): Promise<CoreCryptoWrapper> {
  // A client can be rebuilt during registration. Explicitly release every object
  // which retains the database before opening the same OPFS location again.
  const destroyResult = destroyCoreCryptoHandles();
  if (result.isErr(destroyResult)) {
    return Promise.reject(destroyResult.error);
  }

  const initializationTask = task.tryOrElse(
    cause => {
      return cause;
    },
    async () => {
      // We need to initialize the CoreCrypto package with the path to the WASM file
      // before creating the CoreCrypto instance.
      const output = await runtime.initializeWasm(wasmFilePath);
      logger.info('CoreCrypto initialized', {output});
      const coreCryptoDbName = getCoreCryptoDbName(storeEngine);

      let keyResult = await task
        .tryOrElse(
          cause => {
            return cause;
          },
          () => {
            return migrateOnceAndGetKey(generateSecretKey, coreCryptoDbName, runtime);
          },
        )
        .toPromise();

      if (result.isErr(keyResult) && keyResult.error instanceof CorruptedKeyError) {
        // Never generate a new key on top of a database which could not be wiped.
        await wipeCoreCryptoDb(storeEngine, clock);
        keyResult = await task
          .tryOrElse(
            cause => {
              return cause;
            },
            () => {
              return migrateOnceAndGetKey(generateSecretKey, coreCryptoDbName, runtime);
            },
          )
          .toPromise();
      }

      if (result.isErr(keyResult)) {
        return Promise.reject(keyResult.error);
      }

      runtime.configureLogging();

      coreCryptoDatabase = await runtime.openDatabase(coreCryptoDbName, keyResult.value.key);
      coreCryptoInstance = runtime.createCoreCrypto(coreCryptoDatabase);

      return new CoreCryptoWrapper(
        coreCryptoInstance,
        {
          nbPrekeys,
          onNewPrekeys,
          onWipe: keyResult.value.deleteKey,
        },
        runtime.getVersion(),
      );
    },
  );

  const initializationResult = await initializationTask;
  if (result.isOk(initializationResult)) {
    return initializationResult.value;
  }

  logger.error('CoreCrypto initialization failed', {error: initializationResult.error});
  // Database.open keeps an interrupted legacy import retryable. Release handles without deleting either database.
  const releaseResult = destroyCoreCryptoHandles();
  if (result.isErr(releaseResult)) {
    return Promise.reject(
      new AggregateError(
        [initializationResult.error, releaseResult.error],
        'CoreCrypto initialization failed and its database handles could not be released',
      ),
    );
  }

  return Promise.reject(initializationResult.error);
}

export class CoreCryptoWrapper implements CryptoClient {
  private readonly prekeyTracker: PrekeyTracker;
  public readonly version: string;

  constructor(
    private readonly coreCrypto: CoreCrypto,
    config: ClientConfig,
    version = CCVersion(),
  ) {
    this.version = version;
    this.prekeyTracker = new PrekeyTracker(this, config);
  }

  getNativeClient(): CoreCrypto {
    return this.coreCrypto;
  }

  encrypt(sessions: string[], plainText: Uint8Array): Promise<Map<string, Uint8Array>> {
    return this.coreCrypto.transaction(cx => {
      return cx.proteusEncryptBatched(sessions, plainText);
    });
  }

  decrypt(sessionId: string, message: Uint8Array): Promise<Uint8Array> {
    return this.coreCrypto.transaction(cx => {
      return cx.proteusDecrypt(sessionId, message);
    });
  }

  init(nbInitialPrekeys?: number): Promise<void> {
    if (nbInitialPrekeys !== undefined) {
      this.prekeyTracker.setInitialState(nbInitialPrekeys);
    }
    return this.coreCrypto.transaction(cx => {
      return cx.proteusInit();
    });
  }

  async create(nbPrekeys: number, entropy?: Uint8Array): Promise<InitialPrekeys> {
    if (entropy !== undefined) {
      const seed = validateReseedSeed(entropy);
      if (result.isErr(seed)) {
        return Promise.reject(seed.error);
      }
      await this.coreCrypto.reseed(seed.value);
    }
    await this.init();
    const prekeys: PreKey[] = [];
    for (let id = 0; id < nbPrekeys; id++) {
      prekeys.push(await this.newPrekey());
    }

    const lastPrekeyBytes = await this.coreCrypto.transaction(cx => {
      return cx.proteusLastResortPrekey();
    });
    const lastPrekey = Encoder.toBase64(lastPrekeyBytes).asString;

    const lastPrekeyId = proteusLastResortPrekeyId();

    return {
      prekeys,
      lastPrekey: {id: lastPrekeyId, key: lastPrekey},
    };
  }

  public setMaxLogLevel(level: CoreCryptoLogLevel): void {
    setMaxLogLevel(level);
  }

  getFingerprint(): Promise<string> {
    return this.coreCrypto.proteusFingerprint();
  }

  getRemoteFingerprint(sessionId: string): Promise<string> {
    return this.coreCrypto.proteusFingerprintRemote(sessionId);
  }

  async sessionFromMessage(sessionId: string, message: Uint8Array): Promise<Uint8Array> {
    await this.consumePrekey(); // we need to mark a prekey as consumed since if we create a session from a message, it means the sender has consumed one of our prekeys
    return this.coreCrypto.transaction(cx => {
      return cx.proteusSessionFromMessage(sessionId, message);
    });
  }

  sessionFromPrekey(sessionId: string, prekey: Uint8Array): Promise<void> {
    return this.coreCrypto.transaction(cx => {
      return cx.proteusSessionFromPrekey(sessionId, prekey);
    });
  }

  sessionExists(sessionId: string): Promise<boolean> {
    return this.coreCrypto.proteusSessionExists(sessionId);
  }

  saveSession(sessionId: string): Promise<void> {
    return this.coreCrypto.transaction(cx => {
      return cx.proteusSessionSave(sessionId);
    });
  }

  deleteSession(sessionId: string): Promise<void> {
    return this.coreCrypto.transaction(cx => {
      return cx.proteusSessionDelete(sessionId);
    });
  }

  consumePrekey(): Promise<void> {
    return this.prekeyTracker.consumePrekey();
  }

  async newPrekey(): Promise<PreKey> {
    const {id, pkb} = await this.coreCrypto.transaction(cx => {
      return cx.proteusNewPrekeyAuto();
    });
    return {id, key: Encoder.toBase64(pkb).asString};
  }

  async debugBreakSession(sessionId: string): Promise<void> {
    /* eslint-disable @typescript-eslint/no-magic-numbers -- Encoded prekey bytes are clearer as an exact wire-format sequence. */
    const fakePrekey = [
      165, 0, 1, 1, 24, 57, 2, 161, 0, 88, 32, 212, 202, 30, 83, 242, 93, 67, 164, 202, 137, 214, 167, 166, 183, 236,
      249, 32, 21, 117, 247, 56, 223, 135, 170, 3, 151, 16, 228, 165, 186, 124, 208, 3, 161, 0, 161, 0, 88, 32, 123,
      200, 16, 166, 184, 70, 21, 81, 43, 80, 21, 231, 182, 142, 51, 220, 131, 162, 11, 255, 162, 74, 78, 162, 95, 156,
      131, 48, 203, 5, 77, 122, 4, 246,
    ];
    /* eslint-enable @typescript-eslint/no-magic-numbers */
    await this.coreCrypto.transaction(cx => {
      return cx.proteusSessionFromPrekey(sessionId, Uint8Array.from(fakePrekey));
    });
  }
}
