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
 *
 */

import {assertNotNullOrUndefined} from '@sindresorhus/is';
import {Dexie} from 'dexie';

import {StorageSchemata} from './storageSchemata';

describe('historical storage schema version seven', () => {
  it.each([null, false, 0, NaN, '', undefined, {}, {content: 'mapped-content'}])(
    'preserves upgrade output for legacy mapped value %p',
    async mapped => {
      const databaseName = 'schema-seven-truthiness-test';
      const storeName = StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS;
      const historicalSchema = ', conversation, time, type';
      const oldDatabase = new Dexie(databaseName);
      oldDatabase.version(6).stores({[storeName]: historicalSchema});
      await oldDatabase.open();
      await oldDatabase.table(storeName).put(
        {
          conversation: 'conversation-id',
          time: '2026-09-30T10:00:00.000Z',
          type: 'conversation.message-add',
          mapped,
          raw: {content: 'raw-content'},
          meta: {timestamp: 1},
          retained: 'original-content',
        },
        'event-key',
      );
      oldDatabase.close();

      const upgradedDatabase = new Dexie(databaseName);
      const migration = StorageSchemata.SCHEMATA.filter(schema => {
        return schema.version === 7;
      }).at(0);
      assertNotNullOrUndefined(migration);
      const upgrade = migration.upgrade;
      assertNotNullOrUndefined(upgrade);
      upgradedDatabase.version(6).stores({[storeName]: historicalSchema});
      upgradedDatabase
        .version(7)
        .stores(migration.schema)
        .upgrade(transaction => {
          upgrade(transaction);
        });

      try {
        await upgradedDatabase.open();
        const actualRecord = await upgradedDatabase.table(storeName).get('event-key');

        expect(actualRecord).toEqual({
          conversation: 'conversation-id',
          time: '2026-09-30T10:00:00.000Z',
          type: 'conversation.message-add',
          retained: 'original-content',
        });
      } finally {
        await upgradedDatabase.delete();
      }
    },
  );
});
