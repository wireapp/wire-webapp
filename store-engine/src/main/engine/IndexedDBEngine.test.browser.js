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
import {IndexedDBEngine} from '@wireapp/store-engine';
import {error as StoreEngineError} from '@wireapp/store-engine';

describe('IndexedDBEngine', () => {
  const STORE_NAME = 'store-name';

  let engine = undefined;

  async function initEngine(shouldCreateNewEngine = true) {
    const storeEngine = shouldCreateNewEngine ? new IndexedDBEngine() : engine;
    const db = await storeEngine.init(STORE_NAME);
    db.version(1).stores({
      'the-simpsons': ',firstName,lastName',
    });
    await db.open();
    return storeEngine;
  }

  beforeEach(async done => {
    engine = await initEngine();
    done();
  });

  afterEach(() => {
    if (engine && engine.db) {
      engine.db.close();
    }

    window.indexedDB.deleteDatabase(STORE_NAME);
  });

  describe('"append"', () => {
    Object.entries(require('../../test/shared/append')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"create"', () => {
    Object.entries(require('../../test/shared/create')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
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

  describe('"delete"', () => {
    Object.entries(require('../../test/shared/delete')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"deleteAll"', () => {
    Object.entries(require('../../test/shared/deleteAll')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"hasEnoughQuota"', () => {
    it('says if there is enough storage available to use IndexedDB', async () => {
      engine = new IndexedDBEngine();
      const hasEnoughQuota = await engine.hasEnoughQuota();
      expect(hasEnoughQuota).toBe(true);
    });

    it('throws an error if there is not enough disk space available', async done => {
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
        expect(error instanceof StoreEngineError.LowDiskSpaceError).toBe(true);
        done();
      }
    });
  });

  describe('"purge"', () => {
    Object.entries(require('../../test/shared/purge')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine, initEngine));
    });
  });

  describe('"read"', () => {
    Object.entries(require('../../test/shared/read')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"readAll"', () => {
    Object.entries(require('../../test/shared/readAll')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"readAllPrimaryKeys"', () => {
    Object.entries(require('../../test/shared/readAllPrimaryKeys')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"update"', () => {
    Object.entries(require('../../test/shared/update')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"updateOrCreate"', () => {
    Object.entries(require('../../test/shared/updateOrCreate')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });
});
