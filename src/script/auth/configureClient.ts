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
import {IndexedDBEngine} from '@wireapp/store-engine';
import * as config from './config';

const configureClient = () => {
  return new APIClient({
    schemaCallback: db => {
      const databaseSchemata = window.z.storage.StorageSchemata.SCHEMATA;
      databaseSchemata.forEach(
        ({
          schema,
          upgrade,
          version,
        }: {
          schema: {
            [key: string]: string;
          };
          upgrade: Function;
          version: number;
        }) => {
          if (upgrade) {
            return db
              .version(version)
              .stores(schema)
              .upgrade(transaction => upgrade(transaction, db));
          }
          return db.version(version).stores(schema);
        }
      );
    },
    store: new IndexedDBEngine(),
    urls: {
      name: config.ENVIRONMENT,
      rest: config.BACKEND_REST,
      ws: config.BACKEND_WS,
    },
  });
};

export {configureClient};
