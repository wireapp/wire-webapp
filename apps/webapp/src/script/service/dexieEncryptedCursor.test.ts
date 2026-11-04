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

import {applyEncryptionMiddleware, NON_INDEXED_FIELDS} from 'dexie-encrypted';
import {Dexie, Table} from 'dexie';
import {v4 as uuidv4} from 'uuid';

type EncryptedEvent = {
  readonly id?: number;
  readonly message: string;
};

type EncryptedEventDatabase = Dexie & {
  events: Table<EncryptedEvent, number>;
};

describe('dexie-encrypted cursor patch', () => {
  it('decrypts records returned through Dexie cursor iteration', async () => {
    const databaseName = `dexie-encrypted-cursor-${uuidv4()}`;
    const database = new Dexie(databaseName) as EncryptedEventDatabase;
    const encryptionKey = new Uint8Array(32).fill(7);
    const encryptionConfig = {events: NON_INDEXED_FIELDS};

    applyEncryptionMiddleware(database, encryptionKey, encryptionConfig, async () => {
      return undefined;
    });
    database.version(1).stores({events: '++id'});

    try {
      await database.open();
      await database.table<EncryptedEvent>('events').add({message: 'cursor value'});

      const actualEvents: EncryptedEvent[] = [];
      await database
        .table<EncryptedEvent>('events')
        .toCollection()
        .each(event => {
          actualEvents.push(event);
        });

      expect(actualEvents).toEqual([{id: 1, message: 'cursor value'}]);
    } finally {
      database.close();
      await Dexie.delete(databaseName);
    }
  });
});
