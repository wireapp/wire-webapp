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

import APIClient = require('@wireapp/api-client');
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/index';
import {RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import ClientBackendRepository from './ClientBackendRepository';
import ClientDatabaseRepository from './ClientDatabaseRepository';

export interface MetaClient extends RegisteredClient {
  meta: {
    primary_key: string;
    is_verified?: boolean;
  };
}

export default class ClientService {
  private database: ClientDatabaseRepository;
  private backend: ClientBackendRepository;

  constructor(private apiClient: APIClient, private storeEngine: CRUDEngine) {
    this.database = new ClientDatabaseRepository(this.storeEngine);
    this.backend = new ClientBackendRepository(this.apiClient);
  }

  public deleteLocalClient(): Promise<string> {
    return this.database.deleteLocalClient();
  }

  public getLocalClient(): Promise<MetaClient> {
    return this.database.getLocalClient();
  }

  public createLocalClient(client: RegisteredClient): Promise<MetaClient> {
    return this.database.createLocalClient(client);
  }

  public synchronizeClients() {
    return this.backend
      .getClients()
      .then((registeredClients: RegisteredClient[]) => {
        return registeredClients.filter(client => client.id !== this.apiClient.context!.clientId);
      })
      .then((registeredClients: RegisteredClient[]) => {
        return this.database.createClientList(this.apiClient.context!.userId, registeredClients);
      });
  }
}
