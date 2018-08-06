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
import StoreEngine from '@wireapp/store-engine';
import {BACKEND} from './Environment';

export const configureClient = () => {
  return new APIClient({
    schemaCallback: db => {
      const databaseSchemata = window.z.storage.StorageSchemata.SCHEMATA;
      databaseSchemata.forEach(({schema, upgrade, version}) => {
        if (upgrade) {
          return db
            .version(version)
            .stores(schema)
            .upgrade(transaction => upgrade(transaction, db));
        }
        db.version(version).stores(schema);
      });
    },
    store: new StoreEngine.IndexedDBEngine(),
    urls: BACKEND,
  });
};

export default configureClient;
