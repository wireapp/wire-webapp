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

import {APIClient} from '@wireapp/api-client';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';
import {Dexie} from 'dexie';
import {Config} from '../Config';
import {StorageSchemata} from '../storage/StorageSchemata';

const configureClient = () => {
  return new APIClient({
    schemaCallback: (db: Dexie) => {
      const databaseSchemata = StorageSchemata.SCHEMATA;
      databaseSchemata.forEach(({schema, upgrade, version}) => {
        if (upgrade) {
          return db
            .version(version)
            .stores(schema)
            .upgrade((transaction: Dexie.Transaction) => upgrade(transaction, db));
        }
        return db.version(version).stores(schema);
      });
    },
    store: new IndexedDBEngine(),
    urls: {
      name: Config.ENVIRONMENT,
      rest: Config.BACKEND_REST,
      ws: Config.BACKEND_WS,
    },
  });
};

export {configureClient};
