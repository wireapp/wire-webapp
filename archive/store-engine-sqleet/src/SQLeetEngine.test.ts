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

import {createSpec} from '@wireapp/store-engine/src/main/test/createSpec';
import {deleteAllSpec} from '@wireapp/store-engine/src/main/test/deleteAllSpec';
import {deleteSpec} from '@wireapp/store-engine/src/main/test/deleteSpec';
import {purgeSpec} from '@wireapp/store-engine/src/main/test/purgeSpec';
import {readAllPrimaryKeysSpec} from '@wireapp/store-engine/src/main/test/readAllPrimaryKeysSpec';
import {readAllSpec} from '@wireapp/store-engine/src/main/test/readAllSpec';
import {readSpec} from '@wireapp/store-engine/src/main/test/readSpec';
import {updateOrCreateSpec} from '@wireapp/store-engine/src/main/test/updateOrCreateSpec';
import {updateSpec} from '@wireapp/store-engine/src/main/test/updateSpec';
import {SQLeetEngine, SQLiteType} from './index';

interface DBRecord {
  age?: number;
  name: string;
}

describe('SQLeetEngine', () => {
  const STORE_NAME = 'wire@production@52c607b1-4362-4b7b-bcb4-5bff6154f8e2@permanent';
  const GENERIC_ENCRYPTION_KEY = 'test';
  let engine: SQLeetEngine | undefined = undefined;

  async function initEngine(
    scheme: {},
    shouldCreateNewEngine = true,
    pathToWebWorker = './base/websql-worker.js',
  ): Promise<SQLeetEngine> {
    if (!engine || shouldCreateNewEngine) {
      engine = new SQLeetEngine(pathToWebWorker, scheme, GENERIC_ENCRYPTION_KEY);
    }
    await engine.init(STORE_NAME);
    return engine;
  }

  afterEach(async () => {
    if (engine) {
      try {
        await engine.purge();
      } catch (error) {}
    }
  });

  describe('delete', () => {
    Object.entries(deleteSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': {
            firstName: SQLiteType.TEXT,
            lastName: SQLiteType.TEXT,
            some: SQLiteType.TEXT,
          },
        });
        await testFunction(engine);
      });
    });
  });

  describe('purge', () => {
    Object.entries(purgeSpec).map(([description, testFunction]) => {
      const initEnginePurge = async (shouldCreateNewEngine = true) =>
        initEngine(
          {
            'the-simpsons': {
              name: SQLiteType.TEXT,
            },
          },
          shouldCreateNewEngine,
        );
      it(description, async () => testFunction(await initEnginePurge(), initEnginePurge));
    });
  });

  describe('deleteAll', () => {
    Object.entries(deleteAllSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': {
            firstName: SQLiteType.TEXT,
            lastName: SQLiteType.TEXT,
          },
        });
        await testFunction(engine);
      });
    });
  });

  describe('readAllPrimaryKeys', () => {
    Object.entries(readAllPrimaryKeysSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': {
            firstName: SQLiteType.TEXT,
            lastName: SQLiteType.TEXT,
          },
        });
        await testFunction(engine);
      });
    });
  });

  describe('create', () => {
    Object.entries(createSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': SQLiteType.JSON_OR_TEXT,
        });

        await testFunction(engine);
      });
    });

    it('saves a record to the database', async () => {
      const engine = await initEngine({
        users: {
          name: SQLiteType.TEXT,
        },
      });
      await engine.create<DBRecord>('users', '1', {name: 'Otto'});
      const result = await engine.read<DBRecord>('users', '1');
      expect(result.name).toBe('Otto');
    });

    it('prevents SQL injection in the column name', async () => {
      const engine = await initEngine({
        users: {
          name: SQLiteType.TEXT,
        },
      });

      try {
        const entity = {'name\'"`': 'Otto'};
        await engine.create('users', '1', entity);
        throw new Error('Method is supposed to throw an error.');
      } catch (error) {
        expect(error.message).toBe(
          'Entity is empty for table "users". Are you sure you set the right scheme / column names?',
        );
      }
    });
  });

  describe('read', () => {
    Object.entries(readSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': {
            some: SQLiteType.TEXT,
          },
        });

        await testFunction(engine);
      });
    });

    it('parses JSON properties', async () => {
      const tableName = 'users';

      const engine = await initEngine({
        [tableName]: {
          name: SQLiteType.TEXT,
          visits: SQLiteType.JSON,
        },
      });

      const visits = {
        anne: 2,
        bertha: null,
        peter: 1,
      };

      const primaryKey = await engine.create(tableName, undefined, {
        name: 'Alva',
        visits,
      });

      const alva = await engine.read(tableName, primaryKey);

      expect(alva.name).toBe('Alva');
      expect(alva.visits).toEqual(visits);
    });
  });

  describe('readAll', () => {
    Object.entries(readAllSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': {
            firstName: SQLiteType.TEXT,
            lastName: SQLiteType.TEXT,
          },
        });

        await testFunction(engine);
      });
    });

    it('reads a set of records in the database', async () => {
      const engine = await initEngine({
        users: {
          name: SQLiteType.TEXT,
        },
      });

      const RECORDS_COUNT = 100;
      for (let index = 0; index < RECORDS_COUNT; index++) {
        await engine.create<DBRecord>('users', index.toString(), {name: 'Lion'});
      }
      const results = await engine.readAll<DBRecord>('users');
      expect(results.length).toBe(RECORDS_COUNT);
    });

    it('reads missing properties as `null`', async () => {
      const tableName = 'users';

      const engine = await initEngine({
        [tableName]: {
          name: SQLiteType.TEXT,
          visits: SQLiteType.JSON,
        },
      });

      await engine.create(tableName, undefined, {
        name: 'Alvin',
        visits: null,
      });

      await engine.create(tableName, undefined, {
        name: 'Bertha',
      });

      const allEntries = await engine.readAll(tableName);
      expect(allEntries.length).toBe(2);

      const [alvin, bertha] = allEntries;

      expect(alvin.name).toBe('Alvin');
      expect(alvin.visits).toBeNull();

      expect(bertha.name).toBe('Bertha');
      expect(bertha.visits).toBeNull();
    });

    it('parses JSON properties', async () => {
      const tableName = 'users';

      const engine = await initEngine({
        [tableName]: {
          name: SQLiteType.TEXT,
          visits: SQLiteType.JSON,
        },
      });

      const visits = {
        anne: 2,
        bertha: null,
        peter: 1,
      };

      await engine.create(tableName, undefined, {
        name: 'Alva',
        visits,
      });

      await engine.create(tableName, undefined, {
        name: 'Simon',
      });

      const allEntries = await engine.readAll(tableName);
      expect(allEntries.length).toBe(2);

      const [alva, simon] = allEntries;

      expect(alva.name).toBe('Alva');
      expect(alva.visits).toEqual(visits);

      expect(simon.name).toBe('Simon');
      expect(simon.visits).toBeNull();
    });
  });

  describe('updateOrCreate', () => {
    Object.entries(updateOrCreateSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': {
            name: SQLiteType.TEXT,
          },
        });

        await testFunction(engine);
      });
    });

    it('creates then updates a record to the database', async () => {
      const engine = await initEngine({
        users: {
          name: SQLiteType.TEXT,
        },
      });
      await engine.updateOrCreate('users', '1', {name: 'Otto'});
      await engine.updateOrCreate('users', '1', {name: 'Lion'});

      const result = await engine.read<DBRecord>('users', '1');
      expect(result.name).toBe('Lion');
    });

    it('fails if the table name does not exist', async () => {
      const engine = await initEngine({
        users: {
          name: SQLiteType.TEXT,
        },
      });

      try {
        await engine.updateOrCreate('ffff', '1', {name: 'Otto'});
        throw new Error('Method is supposed to throw an error.');
      } catch (error) {
        expect(error.message).toBe('Table "ffff" does not exist.');
      }
    });
  });

  describe('update', () => {
    Object.entries(updateSpec).map(([description, testFunction]) => {
      it(description, async () => {
        const engine = await initEngine({
          'the-simpsons': {
            age: SQLiteType.INTEGER,
            name: SQLiteType.TEXT,
            size: SQLiteType.JSON,
          },
        });

        await testFunction(engine);
      });
    });

    it('updates a record in the database', async () => {
      const engine = await initEngine({
        users: {
          age: SQLiteType.INTEGER,
          name: SQLiteType.TEXT,
        },
      });
      await engine.create<DBRecord>('users', '1', {age: 1, name: 'Otto'});
      const result = await engine.read<DBRecord>('users', '1');
      expect(result.name).toBe('Otto');
      await engine.update('users', '1', {age: 2, name: 'Hans'});
      const changedResult = await engine.read<DBRecord>('users', '1');
      expect(changedResult.age).toBe(2);
      expect(changedResult.name).toBe('Hans');
    });
  });

  describe('export', () => {
    it('cannot export if SQLite is not available', async () => {
      const engine = await initEngine({
        users: {
          name: SQLiteType.TEXT,
        },
      });
      await engine.updateOrCreate('users', '1', {name: 'Otto'});
      await engine.purge();

      try {
        await engine.export();
        throw new Error('Method is supposed to throw an error.');
      } catch (error) {
        expect(error.message).toBe('Database closed');
      }
    });
  });
});
