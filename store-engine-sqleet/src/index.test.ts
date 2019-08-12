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

import {IndexedDBEngine} from '@wireapp/store-engine-dexie';
import {createSpec} from '@wireapp/store-engine/dist/commonjs/test/createSpec';
import {deleteAllSpec} from '@wireapp/store-engine/dist/commonjs/test/deleteAllSpec';
import {deleteSpec} from '@wireapp/store-engine/dist/commonjs/test/deleteSpec';
import {purgeSpec} from '@wireapp/store-engine/dist/commonjs/test/purgeSpec';
import {readAllPrimaryKeysSpec} from '@wireapp/store-engine/dist/commonjs/test/readAllPrimaryKeysSpec';
import {readAllSpec} from '@wireapp/store-engine/dist/commonjs/test/readAllSpec';
import {readSpec} from '@wireapp/store-engine/dist/commonjs/test/readSpec';
import {updateOrCreateSpec} from '@wireapp/store-engine/dist/commonjs/test/updateOrCreateSpec';
import {updateSpec} from '@wireapp/store-engine/dist/commonjs/test/updateSpec';
import {Decoder} from 'bazinga64';
import {SQLeetEngine} from './index';
import {SQLiteDatabaseDefinition, SQLiteType} from './SchemaConverter';
import {SQLeetWebAssembly} from './SQLeet';

interface DBRecord {
  age?: number;
  name: string;
}

describe('SQLeetEngine', () => {
  const webAssembly = Decoder.fromBase64(SQLeetWebAssembly).asBytes;
  const STORE_NAME = 'wire@production@52c607b1-4362-4b7b-bcb4-5bff6154f8e2@permanent';
  const GENERIC_ENCRYPTION_KEY = 'test';
  let engine: SQLeetEngine | undefined = undefined;

  async function initEngine(scheme: {}, shouldCreateNewEngine = true, rawDatabase?: string): Promise<SQLeetEngine> {
    if (!engine || shouldCreateNewEngine) {
      engine = new SQLeetEngine(webAssembly, scheme, GENERIC_ENCRYPTION_KEY, rawDatabase);
    }
    await engine.init(STORE_NAME);
    return engine;
  }

  afterEach(async () => {
    if (engine) {
      await engine.purge();
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
        fail();
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
      for (let i = 0; i < RECORDS_COUNT; i++) {
        await engine.create<DBRecord>('users', i.toString(), {name: 'Lion'});
      }
      const results = await engine.readAll<DBRecord>('users');
      expect(results.length).toBe(RECORDS_COUNT);
    });
  });

  describe('append', () => {
    it('throws an error', async () => {
      const engine = await initEngine({});
      try {
        await engine.append('test', '1', 'string');
        fail();
      } catch (error) {}
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
        fail();
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
      await engine.create<DBRecord>('users', '1', {name: 'Otto', age: 1});
      const result = await engine.read<DBRecord>('users', '1');
      expect(result.name).toBe('Otto');
      await engine.update('users', '1', {name: 'Hans', age: 2});
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
        fail();
      } catch (error) {
        expect(error.message).toBe('SQLite needs to be available');
      }
    });

    it('exports and loads a database', async () => {
      const schema: SQLiteDatabaseDefinition<DBRecord> = {
        users: {
          age: SQLiteType.INTEGER,
          name: SQLiteType.TEXT,
        },
      };

      const primaryKeyName = 'database';

      const indexedDB = new IndexedDBEngine();
      const indexedDBInstance = await indexedDB.init(this.storeName);
      indexedDBInstance.version(1).stores({[this.storeName]: ''});
      await indexedDBInstance.open();

      const engine = await initEngine(schema);

      // Write and save
      await engine.create<DBRecord>('users', '1', {name: 'Otto', age: 1});
      await indexedDB.updateOrCreate(this.storeName, primaryKeyName, await engine.export());

      // Import and read
      const savedDatabase = await indexedDB.read<string>(this.storeName, primaryKeyName);
      const engineNew = await initEngine(schema, true, savedDatabase);
      const result = await engineNew.read<DBRecord>('users', '1');

      expect(result.age).toBe(1);
      expect(result.name).toBe('Otto');
    });
  });
});
