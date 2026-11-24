/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {deleteDB, openDB} from 'idb';
import {Maybe} from 'true-myth';

import type {CoreCrypto, Database, DatabaseKey} from '@wireapp/core-crypto';

import {configureLogging} from '../../../../../../logger/getLogger';
import type {CRUDEngine} from '../../../../../storage/engine/crudEngine';

import {isCoreCryptoDatabaseOpenError} from './coreCryptoDatabaseOpenError';
import {buildClient, coreCryptoLogger, getCoreCryptoDbName, wipeCoreCryptoDb} from './coreCryptoWrapper';

describe('CoreCryptoWrapper logging', () => {
  it('serializes CoreCrypto messages as strings and context as metadata at the mapped severity', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1_000_000n});
    const serializedRecords: string[] = [];
    configureLogging(
      Maybe.just({
        clock,
        namespaces: Maybe.just('*'),
        output() {},
        persistenceOutput: Maybe.just(line => {
          serializedRecords.push(line);
        }),
      }),
    );
    try {
      coreCryptoLogger.log(3, 'Inspecting crypto state', undefined);
      coreCryptoLogger.log(4, 'Opened crypto store', 'database');
      coreCryptoLogger.log(5, 'Crypto warning', 'crypto');
      coreCryptoLogger.log(6, 'Crypto operation failed', undefined);
    } finally {
      configureLogging(Maybe.nothing());
    }

    const actualRecords = serializedRecords.map(line => {
      return JSON.parse(line);
    });
    const expectedComponent = '@wireapp/core/CoreCryptoWrapper';
    expect(actualRecords).toEqual([
      {level: 20, time: 1000, component: expectedComponent, msg: 'Inspecting crypto state'},
      {level: 30, time: 1000, component: expectedComponent, msg: 'Opened crypto store', context: 'database'},
      {level: 40, time: 1000, component: expectedComponent, msg: 'Crypto warning', context: 'crypto'},
      {level: 50, time: 1000, component: expectedComponent, msg: 'Crypto operation failed'},
    ]);
  });
});

describe('CoreCryptoWrapper initialization', () => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const storeEngine = {storeName: 'interrupted-migration'} as CRUDEngine;
  const databaseName = getCoreCryptoDbName(storeEngine);

  beforeEach(async () => {
    await deleteDB(databaseName);
    const database = await openDB(databaseName);
    database.close();
  });

  afterEach(async () => {
    await wipeCoreCryptoDb(storeEngine, clock);
  });

  it('preserves the database after a failed open so migration can be retried', async () => {
    const databaseOpenCause = new Error('Opaque database open failure');
    const database = {uniffiDestroy: jest.fn()} as unknown as Database;
    const coreCrypto = {uniffiDestroy: jest.fn()} as unknown as CoreCrypto;
    const databaseKey = {} as DatabaseKey;
    const openDatabase = jest.fn().mockRejectedValueOnce(databaseOpenCause).mockResolvedValueOnce(database);
    const runtime = {
      configureLogging: jest.fn(),
      createCoreCrypto: jest.fn().mockReturnValue(coreCrypto),
      createDatabaseKey: jest.fn().mockReturnValue(databaseKey),
      getVersion: jest.fn().mockReturnValue('11.0.0'),
      initializeWasm: jest.fn().mockResolvedValue(undefined),
      migrateDatabaseKey: jest.fn().mockResolvedValue(undefined),
      openDatabase,
    };
    const generateSecretKey = jest.fn(async (_keyId: string, keySize: 16 | 32) => {
      return {
        deleteKey: jest.fn().mockResolvedValue(undefined),
        freshlyGenerated: false,
        key: new Uint8Array(keySize),
      };
    });
    const build = (): ReturnType<typeof buildClient> => {
      return buildClient(
        storeEngine,
        {clock, generateSecretKey, nbPrekeys: 100, onNewPrekeys: jest.fn()},
        {enabled: true, wasmFilePath: ''},
        runtime,
      );
    };

    const openError = await build().catch((error: unknown) => {
      return error;
    });
    expect(isCoreCryptoDatabaseOpenError(openError)).toBe(true);
    if (!isCoreCryptoDatabaseOpenError(openError)) {
      throw new Error('Expected a semantic CoreCrypto database open error');
    }
    expect(openError.cause).toBe(databaseOpenCause);
    await expect(indexedDB.databases()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({name: databaseName})]),
    );

    await expect(build()).resolves.toBeDefined();
    expect(openDatabase).toHaveBeenCalledTimes(2);
  });

  it('reopens the same database and stored key after releasing the previous handles', async () => {
    const operations: string[] = [];
    const firstDatabase = {
      uniffiDestroy: jest.fn(() => {
        operations.push('destroy first database');
      }),
    } as unknown as Database;
    const secondDatabase = {uniffiDestroy: jest.fn()} as unknown as Database;
    const firstCoreCrypto = {
      uniffiDestroy: jest.fn(() => {
        operations.push('destroy first CoreCrypto');
      }),
    } as unknown as CoreCrypto;
    const secondCoreCrypto = {uniffiDestroy: jest.fn()} as unknown as CoreCrypto;
    const databaseKey = {} as DatabaseKey;
    const openDatabase = jest
      .fn()
      .mockImplementationOnce(async () => {
        operations.push('open first database');
        return firstDatabase;
      })
      .mockImplementationOnce(async () => {
        operations.push('open second database');
        return secondDatabase;
      });
    const createDatabaseKey = jest.fn().mockReturnValue(databaseKey);
    const runtime = {
      configureLogging: jest.fn(),
      createCoreCrypto: jest.fn().mockReturnValueOnce(firstCoreCrypto).mockReturnValueOnce(secondCoreCrypto),
      createDatabaseKey,
      getVersion: jest.fn().mockReturnValue('11.0.0'),
      initializeWasm: jest.fn().mockResolvedValue(undefined),
      migrateDatabaseKey: jest.fn().mockResolvedValue(undefined),
      openDatabase,
    };
    const storedDatabaseKey = new Uint8Array(32).fill(7);
    const generateSecretKey = jest.fn(async (keyId: string, keySize: 16 | 32) => {
      return {
        deleteKey: jest.fn().mockResolvedValue(undefined),
        freshlyGenerated: false,
        key: keyId === 'corecrypto-key-v2' ? storedDatabaseKey : new Uint8Array(keySize),
      };
    });
    const build = (): ReturnType<typeof buildClient> => {
      return buildClient(
        storeEngine,
        {clock, generateSecretKey, nbPrekeys: 100, onNewPrekeys: jest.fn()},
        {enabled: true, wasmFilePath: ''},
        runtime,
      );
    };

    await build();
    await build();

    expect(openDatabase).toHaveBeenNthCalledWith(1, databaseName, databaseKey);
    expect(openDatabase).toHaveBeenNthCalledWith(2, databaseName, databaseKey);
    expect(createDatabaseKey).toHaveBeenNthCalledWith(1, storedDatabaseKey);
    expect(createDatabaseKey).toHaveBeenNthCalledWith(2, storedDatabaseKey);
    expect(operations).toEqual([
      'open first database',
      'destroy first CoreCrypto',
      'destroy first database',
      'open second database',
    ]);
  });
});
