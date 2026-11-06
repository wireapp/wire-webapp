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

import {CRUDEngine} from './CRUDEngine';
import {MemoryEngine} from './MemoryEngine';

import {createSpec} from '../../test/storage/createSpec';
import {deleteAllSpec} from '../../test/storage/deleteAllSpec';
import {deleteSpec} from '../../test/storage/deleteSpec';
import {purgeSpec} from '../../test/storage/purgeSpec';
import {readAllPrimaryKeysSpec} from '../../test/storage/readAllPrimaryKeysSpec';
import {readAllSpec} from '../../test/storage/readAllSpec';
import {readSpec} from '../../test/storage/readSpec';
import {updateOrCreateSpec} from '../../test/storage/updateOrCreateSpec';
import {updateSpec} from '../../test/storage/updateSpec';
import type {StorageErrorConstructors} from '../../test/storage/storageErrorConstructors';

import {RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './error';

const STORE_NAME = 'store-name';
const storageErrorConstructors: StorageErrorConstructors = {
  RecordAlreadyExistsError,
  RecordNotFoundError,
  RecordTypeError,
};

let engine: CRUDEngine;

async function initEngine(shouldCreateNewEngine = true): Promise<MemoryEngine | CRUDEngine> {
  const storeEngine = shouldCreateNewEngine ? new MemoryEngine() : engine;
  await storeEngine.init(STORE_NAME);
  return storeEngine;
}

describe('MemoryEngine', () => {
  beforeEach(async () => {
    engine = await initEngine();
  });

  describe('init', () => {
    it('resolves with direct access to the complete in-memory store.', async () => {
      engine = new MemoryEngine();
      const inMemory = await engine.init(STORE_NAME);
      expect(inMemory[STORE_NAME]).toBeDefined();
    });

    it('writes into an existing database.', async () => {
      const TABLE_NAME = 'friends';
      const PRIMARY_KEY_CAMILLA = 'camilla';
      const PRIMARY_KEY_PETER = 'peter';
      const entityCamilla = {
        age: 25,
        name: 'Camilla',
      };
      const entityPeter = {
        age: 30,
        name: 'Peter',
      };
      const dbName = 'MyDatabase';

      const db = {
        [TABLE_NAME]: {[PRIMARY_KEY_PETER]: entityPeter},
      };

      engine = new MemoryEngine();
      await engine.initWithObject(dbName, db);

      const primaryKey = await engine.create(TABLE_NAME, PRIMARY_KEY_CAMILLA, entityCamilla);
      expect(primaryKey).toEqual(PRIMARY_KEY_CAMILLA);
      expect(engine.storeName).toBe(dbName);

      const result = await engine.read(TABLE_NAME, PRIMARY_KEY_PETER);
      expect(result).toEqual(entityPeter);
    });
  });

  describe('create', () => {
    Object.entries(createSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine, storageErrorConstructors);
      });
    });
  });

  describe('delete', () => {
    Object.entries(deleteSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine);
      });
    });
  });

  describe('deleteAll', () => {
    Object.entries(deleteAllSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine);
      });
    });
  });

  describe('purge', () => {
    Object.entries(purgeSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine, initEngine);
      });
    });
  });

  describe('readAllPrimaryKeys', () => {
    Object.entries(readAllPrimaryKeysSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine);
      });
    });
  });

  describe('readAll', () => {
    Object.entries(readAllSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine);
      });
    });
  });

  describe('read', () => {
    Object.entries(readSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine, storageErrorConstructors);
      });
    });
  });

  describe('updateOrCreate', () => {
    Object.entries(updateOrCreateSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine);
      });
    });
  });

  describe('update', () => {
    Object.entries(updateSpec).forEach(([description, testFunction]) => {
      it(description, () => {
        return testFunction(engine, storageErrorConstructors);
      });
    });
  });
});
