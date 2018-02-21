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
import {StoreEngine} from '@wireapp/store-engine';

describe('StoreEngine.IndexedDBEngine', () => {
  const STORE_NAME = 'database-name';

  let engine = undefined;

  beforeEach(async done => {
    engine = new StoreEngine.IndexedDBEngine();
    const db = await engine.init(STORE_NAME);
    db.version(1).stores({
      'the-simpsons': ',firstName,lastName',
    });
    done();
  });

  afterEach(() => {
    if (engine && engine.db) {
      engine.db.close();
    }

    window.indexedDB.deleteDatabase(STORE_NAME);
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

      const db = new Dexie('MyDatabase');
      db.version(1).stores({
        [TABLE_NAME]: ', name, age',
      });

      engine = new StoreEngine.IndexedDBEngine(db);
      await engine.init(STORE_NAME);

      engine
        .create(TABLE_NAME, PRIMARY_KEY, entity)
        .then(primaryKey => {
          expect(primaryKey).toEqual(PRIMARY_KEY);
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
});
