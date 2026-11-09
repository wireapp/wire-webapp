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

import {deleteDB as deleteIndexedDb, openDB as openIndexedDb} from 'idb';

import {openDB} from './coreDb';

// `crls` is no longer part of the schema, so it can only be inspected through the untyped view.
const hasObjectStore = (db: {objectStoreNames: DOMStringList}, name: string): boolean => {
  return db.objectStoreNames.contains(name);
};

describe('openDB', () => {
  it('removes the unused crls object store when upgrading an existing database', async () => {
    const dbName = 'core-db-remove-crls-store';

    const previousVersion = await openIndexedDb(dbName, 7, {
      upgrade(db) {
        db.createObjectStore('crls');
      },
    });
    expect(hasObjectStore(previousVersion, 'crls')).toBe(true);
    previousVersion.close();

    const upgraded = await openDB(dbName);

    expect(hasObjectStore(upgraded, 'crls')).toBe(false);
    upgraded.close();
    await deleteIndexedDb(dbName);
  });

  it('creates a database without the crls object store from scratch', async () => {
    const dbName = 'core-db-fresh-without-crls';

    const db = await openDB(dbName);

    expect(hasObjectStore(db, 'crls')).toBe(false);
    db.close();
    await deleteIndexedDb(dbName);
  });
});
