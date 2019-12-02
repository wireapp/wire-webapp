/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import Dexie from 'dexie';

import {createSpec} from '@wireapp/store-engine/dist/commonjs/test/createSpec';
import {deleteAllSpec} from '@wireapp/store-engine/dist/commonjs/test/deleteAllSpec';
import {deleteSpec} from '@wireapp/store-engine/dist/commonjs/test/deleteSpec';
import {purgeSpec} from '@wireapp/store-engine/dist/commonjs/test/purgeSpec';
import {readAllPrimaryKeysSpec} from '@wireapp/store-engine/dist/commonjs/test/readAllPrimaryKeysSpec';
import {readAllSpec} from '@wireapp/store-engine/dist/commonjs/test/readAllSpec';
import {readSpec} from '@wireapp/store-engine/dist/commonjs/test/readSpec';
import {updateOrCreateSpec} from '@wireapp/store-engine/dist/commonjs/test/updateOrCreateSpec';
import {updateSpec} from '@wireapp/store-engine/dist/commonjs/test/updateSpec';

import {IndexedDBEngine} from './index';

describe('IndexedDBEngine', () => {
  const STORE_NAME = 'store-name';

  let engine: IndexedDBEngine;

  async function initEngine(
    shouldCreateNewEngine: boolean = true,
    useInLineKeys: boolean = false,
  ): Promise<IndexedDBEngine> {
    const storeEngine = shouldCreateNewEngine ? new IndexedDBEngine() : engine;
    const db: Dexie = await storeEngine.init(STORE_NAME);
    let schema = {
      'the-simpsons': ', firstName, lastName',
    };
    if (useInLineKeys) {
      schema = {
        'the-simpsons': '++id, firstName, lastName',
      };
    }
    db.version(1).stores(schema);
    await db.open();
    return storeEngine;
  }

  beforeEach(async () => {
    engine = await initEngine();
  });

  afterEach(async () => {
    let storeName = STORE_NAME;
    if (engine && engine['db']) {
      storeName = engine['db'].name;
      engine['db'].close();
    }
    await Dexie.delete(storeName);
  });

  describe('init', () => {
    it('resolves with the database instance to which the records will be saved.', async () => {
      engine = new IndexedDBEngine();
      const instance = await engine.init(STORE_NAME);
      expect(instance instanceof Dexie).toBe(true);
    });
  });

  describe('create', () => {
    Object.entries(createSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });

    it('writes into an existing database.', async () => {
      const TABLE_NAME = 'friends';
      const PRIMARY_KEY = 'camilla';
      const entity = {
        age: 25,
        anotherProperty: 'not all properties need to be indexed',
        name: 'Camilla',
      };
      const name = 'MyDatabase';

      const db = new Dexie(name);
      db.version(1).stores({
        [TABLE_NAME]: ', name, age',
      });

      engine = new IndexedDBEngine();
      await engine.initWithDb(db);

      const primaryKey = await engine.create(TABLE_NAME, PRIMARY_KEY, entity);
      expect(primaryKey).toEqual(PRIMARY_KEY);
      expect(engine.storeName).toBe(name);
      expect(engine['db'].name).toBe(name);
      expect(Object.keys(engine['db']._dbSchema).length).toBe(1);
    });
  });

  describe('delete', () => {
    Object.entries(deleteSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('deleteAll', () => {
    Object.entries(deleteAllSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('purge', () => {
    Object.entries(purgeSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine, initEngine));
    });
  });

  describe('readAllPrimaryKeys', async () => {
    Object.entries(readAllPrimaryKeysSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('readAll', () => {
    Object.entries(readAllSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('read', () => {
    Object.entries(readSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });

    it('works with typed arrays such as Uint8Array', async () => {
      const tableName = 'events';
      const primaryKey = 'test';
      const testMessage = 'Test';
      const entity = {
        conversation: '123',
        data: {
          content: Uint8Array.from(Array.from(testMessage).map(char => char.charCodeAt(0))),
        },
      };

      const storeName = new Date().toISOString();
      await Dexie.delete(storeName);
      const db = new Dexie(storeName);
      db.version(1).stores({
        [tableName]: ', conversation',
      });
      engine = new IndexedDBEngine();
      await engine.initWithDb(db);

      await engine.create(tableName, primaryKey, entity);
      const record = await engine.read<typeof entity>(tableName, primaryKey);
      const actualText = new TextDecoder('utf-8').decode(record.data.content);
      expect(actualText).toBe(testMessage);
    });
  });

  describe('save', () => {
    it('generates primary keys', async () => {
      const TABLE_NAME = 'test-table';

      engine = new IndexedDBEngine();
      const db: Dexie = await engine.init('primary-key-store');
      db.version(1).stores({
        [TABLE_NAME]: '++primaryKey, testValue',
      });
      await db.open();

      const entity = {
        testValue: 'value',
      };

      type ExpectedResult = typeof entity & {primaryKey: number};

      const primaryKey = await engine.updateOrCreate<number>(TABLE_NAME, undefined, entity);
      expect(primaryKey).toBe(1);
      const record = await engine.read<ExpectedResult, number>(TABLE_NAME, primaryKey);
      expect(record.primaryKey).toBe(1);
      expect(record.testValue).toBe(entity.testValue);
    });
  });

  describe('updateOrCreate', async () => {
    engine = await initEngine(true, false);
    Object.entries(updateOrCreateSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('update', () => {
    Object.entries(updateSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });
});
