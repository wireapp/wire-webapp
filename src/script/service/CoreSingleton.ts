/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {Account} from '@wireapp/core';
import {ClientType} from '@wireapp/api-client/src/client';
import {container, singleton} from 'tsyringe';
import {APIClient} from './APIClientSingleton';
import {createStorageEngine, DatabaseTypes} from './StoreEngineProvider';

const clientToDbType: Record<ClientType, DatabaseTypes> = {
  [ClientType.PERMANENT]: DatabaseTypes.PERMANENT,
  [ClientType.TEMPORARY]: DatabaseTypes.TEMPORARY,
  [ClientType.NONE]: DatabaseTypes.EFFEMERAL,
};

@singleton()
export class Core extends Account {
  constructor(apiClient = container.resolve(APIClient)) {
    super(apiClient, {
      createStore: (storeName, context) => {
        return createStorageEngine(storeName, clientToDbType[context.clientType]);
      },
    });
  }
}
