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

import type {CoreCrypto, Database, DatabaseKey} from '@wireapp/core-crypto';
import type {CRUDEngine} from '@wireapp/store-engine';

import {buildClient, getCoreCryptoDbName, wipeCoreCryptoDb} from './coreCryptoWrapper';

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
    const migrationError = new Error('migration interrupted');
    const database = {uniffiDestroy: jest.fn()} as unknown as Database;
    const coreCrypto = {uniffiDestroy: jest.fn()} as unknown as CoreCrypto;
    const databaseKey = {} as DatabaseKey;
    const openDatabase = jest.fn().mockRejectedValueOnce(migrationError).mockResolvedValueOnce(database);
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

    await expect(build()).rejects.toBe(migrationError);
    await expect(indexedDB.databases()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({name: databaseName})]),
    );

    await expect(build()).resolves.toBeDefined();
    expect(openDatabase).toHaveBeenCalledTimes(2);
  });
});
