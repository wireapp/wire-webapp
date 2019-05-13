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

import Dexie from 'dexie';
import {appendSpec} from '../test/appendSpec';
import {createSpec} from '../test/createSpec';
import {deleteAllSpec} from '../test/deleteAllSpec';
import {deleteSpec} from '../test/deleteSpec';
import {purgeSpec} from '../test/purgeSpec';
import {readAllPrimaryKeysSpec} from '../test/readAllPrimaryKeysSpec';
import {readAllSpec} from '../test/readAllSpec';
import {readSpec} from '../test/readSpec';
import {updateOrCreateSpec} from '../test/updateOrCreateSpec';
import {updateSpec} from '../test/updateSpec';
import {CRUDEngine} from './CRUDEngine';
import {LowDiskSpaceError} from './error';
import {IndexedDBEngine} from './IndexedDBEngine';

const STORE_NAME = 'store-name';

let engine: CRUDEngine;

async function initEngine(shouldCreateNewEngine = true): Promise<IndexedDBEngine | CRUDEngine> {
  const storeEngine = shouldCreateNewEngine ? new IndexedDBEngine() : engine;
  const db = await storeEngine.init(STORE_NAME);
  db.version(1).stores({
    'the-simpsons': ',firstName,lastName',
  });
  await db.open();
  return storeEngine;
}

describe('IndexedDBEngine', () => {
  beforeEach(async () => {
    engine = await initEngine();
  });

  afterEach(async () => {
    if (engine && engine.db) {
      await engine.db.delete();
    }
  });

  describe('init', () => {
    it('resolves with the database instance to which the records will be saved.', async () => {
      engine = new IndexedDBEngine();
      const instance = await engine.init(STORE_NAME);
      expect(instance instanceof Dexie).toBe(true);
    });
  });

  describe('append', () => {
    Object.entries(appendSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('create', () => {
    describe('create', () => {
      Object.entries(createSpec).map(([description, testFunction]) => {
        it(description, done => testFunction(done, engine));
      });
    });

    it('writes into an existing database.', async done => {
      const TABLE_NAME = 'friends';
      const PRIMARY_KEY = 'camilla';
      const entity = {
        age: 25,
        anotherProperty: 'not all properties needs to be indexed',
        name: 'Camilla',
      };
      const name = 'MyDatabase';

      const db = new Dexie(name);
      db.version(1).stores({
        [TABLE_NAME]: ', name, age',
      });

      engine = new IndexedDBEngine();
      await engine.initWithDb(db);

      engine
        .create(TABLE_NAME, PRIMARY_KEY, entity)
        .then(primaryKey => {
          expect(primaryKey).toEqual(PRIMARY_KEY);
          expect(engine.storeName).toBe(name);
          expect(engine.db.name).toBe(name);
          expect(Object.keys(engine.db._dbSchema).length).toBe(1);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('delete', () => {
    Object.entries(deleteSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('deleteAll', () => {
    Object.entries(deleteAllSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('hasEnoughQuota', () => {
    it('says if there is enough storage available to use IndexedDB', async () => {
      engine = new IndexedDBEngine();
      expect(async () => {
        await engine.hasEnoughQuota();
      }).not.toThrow();
    });

    it('throws an error if there is no quota available', async done => {
      spyOn(navigator.storage, 'estimate').and.returnValue(
        Promise.resolve({
          quota: 26025,
          usage: 26025,
        })
      );

      engine = new IndexedDBEngine();

      try {
        await engine.hasEnoughQuota();
        done.fail();
      } catch (error) {
        expect(error instanceof LowDiskSpaceError).toBe(true);
        done();
      }
    });

    it('throws an error if there is no quota is given', async done => {
      spyOn(navigator.storage, 'estimate').and.returnValue(
        Promise.resolve({
          quota: 0,
          usage: 0,
        })
      );

      engine = new IndexedDBEngine();

      try {
        await engine.hasEnoughQuota();
        done.fail();
      } catch (error) {
        expect(error instanceof LowDiskSpaceError).toBe(true);
        done();
      }
    });
  });

  describe('purge', () => {
    Object.entries(purgeSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine, initEngine));
    });
  });

  describe('readAllPrimaryKeys', () => {
    Object.entries(readAllPrimaryKeysSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('readAll', () => {
    Object.entries(readAllSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('read', () => {
    Object.entries(readSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('updateOrCreate', () => {
    Object.entries(updateOrCreateSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('update', () => {
    Object.entries(updateSpec).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });
});
