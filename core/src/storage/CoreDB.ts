/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {DBSchema, deleteDB as idbDeleteDB, IDBPDatabase, openDB as idbOpenDb} from 'idb';
const VERSION = 1;

interface CoreDBSchema extends DBSchema {
  prekeys: {
    key: string;
    value: {nbPrekeys: number; highestId: number};
  };
}

export type CoreDatabase = IDBPDatabase<CoreDBSchema>;

export async function openDB(dbName: string): Promise<CoreDatabase> {
  const db = await idbOpenDb<CoreDBSchema>(dbName, VERSION, {
    upgrade: (db, oldVersion) => {
      switch (oldVersion) {
        case 0:
          db.createObjectStore('prekeys');
      }
    },
  });
  return db;
}

export async function deleteDB(db: CoreDatabase): Promise<void> {
  return idbDeleteDB(db.name);
}
