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

import {CreateClientPayload, RegisteredClient, UpdateClientPayload} from '@wireapp/api-client/lib/client/';

import {APIClient} from '@wireapp/api-client';

export class ClientBackendRepository {
  constructor(private readonly apiClient: APIClient) {}

  public getClients(): Promise<RegisteredClient[]> {
    return this.apiClient.api.client.getClients();
  }

  public postClient(client: CreateClientPayload): Promise<RegisteredClient> {
    return this.apiClient.api.client.postClient(client);
  }

  public putClient(clientId: string, updates: UpdateClientPayload): Promise<void> {
    return this.apiClient.api.client.putClient(clientId, updates);
  }

  public deleteClient(clientId: string, password?: string): Promise<void> {
    return this.apiClient.api.client.deleteClient(clientId, password);
  }

  public uploadMLSKeyPackages(clientId: string, keyPackages: string[]): Promise<void> {
    return this.apiClient.api.client.uploadMLSKeyPackages(clientId, keyPackages);
  }
}
