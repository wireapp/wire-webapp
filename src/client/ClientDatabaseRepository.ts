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

import {RegisteredClient} from '@wireapp/api-client/lib/client/';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CRUDEngine} from '@wireapp/store-engine';

import {MetaClient} from './ClientService';

import {constructSessionId} from '../messagingProtocols/proteus/Utility/SessionHandler';

export enum DatabaseStores {
  CLIENTS = 'clients',
}

export class ClientDatabaseRepository {
  public static readonly STORES = DatabaseStores;

  public static KEYS = {
    LOCAL_IDENTITY: 'local_identity',
  };

  constructor(private readonly storeEngine: CRUDEngine) {}

  public getLocalClient(): Promise<MetaClient> {
    return this.getClient(ClientDatabaseRepository.KEYS.LOCAL_IDENTITY);
  }

  public getClient(sessionId: string): Promise<MetaClient> {
    return this.storeEngine.read<MetaClient>(ClientDatabaseRepository.STORES.CLIENTS, sessionId);
  }

  public deleteLocalClient(): Promise<string> {
    return this.deleteClient(ClientDatabaseRepository.KEYS.LOCAL_IDENTITY);
  }

  public deleteClient(sessionId: string): Promise<string> {
    return this.storeEngine.delete(ClientDatabaseRepository.STORES.CLIENTS, sessionId);
  }

  public createClientList(userId: QualifiedId, clientList: RegisteredClient[]): Promise<MetaClient[]> {
    const createClientTasks: Promise<MetaClient>[] = [];
    for (const client of clientList) {
      createClientTasks.push(this.createClient(userId, client));
    }
    return Promise.all(createClientTasks);
  }

  public async createLocalClient(client: RegisteredClient, domain?: string): Promise<MetaClient> {
    const transformedClient = this.transformLocalClient(client, domain);
    await this.storeEngine.create(
      ClientDatabaseRepository.STORES.CLIENTS,
      ClientDatabaseRepository.KEYS.LOCAL_IDENTITY,
      transformedClient,
    );
    return transformedClient;
  }

  public async updateLocalClient(client: RegisteredClient, domain?: string): Promise<MetaClient> {
    const transformedClient = this.transformLocalClient(client, domain);
    await this.storeEngine.update(
      ClientDatabaseRepository.STORES.CLIENTS,
      ClientDatabaseRepository.KEYS.LOCAL_IDENTITY,
      transformedClient,
    );
    return transformedClient;
  }

  public async updateClient(userId: QualifiedId, client: RegisteredClient): Promise<MetaClient> {
    const transformedClient = this.transformClient(userId, client);
    await this.storeEngine.update(
      ClientDatabaseRepository.STORES.CLIENTS,
      constructSessionId({
        userId,
        clientId: client.id,
      }),
      transformedClient,
    );
    return transformedClient;
  }

  public async createClient(userId: QualifiedId, client: RegisteredClient): Promise<MetaClient> {
    const transformedClient = this.transformClient(userId, client);
    await this.storeEngine.create(
      ClientDatabaseRepository.STORES.CLIENTS,
      constructSessionId({
        userId,
        clientId: client.id,
      }),
      transformedClient,
    );
    return transformedClient;
  }

  private transformClient(userId: QualifiedId, client: RegisteredClient): MetaClient {
    return {
      ...client,
      domain: userId.domain,
      meta: {
        is_verified: false,
        is_mls_verified: false,
        primary_key: constructSessionId({
          userId,
          clientId: client.id,
        }),
      },
    };
  }

  private transformLocalClient(client: RegisteredClient, domain?: string): MetaClient {
    return {
      ...client,
      domain,
      meta: {is_verified: true, is_mls_verified: false, primary_key: ClientDatabaseRepository.KEYS.LOCAL_IDENTITY},
    };
  }
}
