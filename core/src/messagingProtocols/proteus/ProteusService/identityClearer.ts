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

import {CRUDEngine} from '@wireapp/store-engine';

/** all the tables in the database that stores information relative to the client identity */
const IDENTITY_STORES = ['amplify', 'clients', 'keys', 'prekeys', 'sessions', 'group_ids'] as const;

/**
 * Will remove any information relative to the client identity.
 * @param storeEngine The engine that currently holds the identity information
 * @param spareKeys If true, the keys table will not be deleted
 */
export function deleteIdentity(storeEngine: CRUDEngine, spareKeys = false): Promise<boolean[]> {
  return Promise.all(
    //make sure we use enum's lowercase values, not uppercase keys

    IDENTITY_STORES.map(store => {
      if (store === 'keys' && spareKeys) {
        return Promise.resolve(true);
      }
      return storeEngine.deleteAll(store);
    }),
  );
}
