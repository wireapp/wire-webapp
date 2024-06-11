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

import {LoginData} from '@wireapp/api-client/lib/auth/';
import {ClientCapability, ClientType, CreateClientPayload, RegisteredClient} from '@wireapp/api-client/lib/client/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import axios from 'axios';
import {StatusCodes} from 'http-status-codes';
import logdown from 'logdown';

import {APIClient} from '@wireapp/api-client';
import {CRUDEngine} from '@wireapp/store-engine';

import type {ProteusService} from '../messagingProtocols/proteus';
import {InitialPrekeys} from '../messagingProtocols/proteus/ProteusService/CryptoClient';

import {ClientInfo, ClientBackendRepository, ClientDatabaseRepository} from './';

export interface MetaClient extends RegisteredClient {
  domain?: string;
  meta: {
    is_verified?: boolean;
    is_mls_verified?: boolean;
    primary_key: string;
  };
}

export class ClientService {
  private readonly database: ClientDatabaseRepository;
  private readonly backend: ClientBackendRepository;
  private readonly logger = logdown('@wireapp/core/Client', {
    logger: console,
    markdown: false,
  });

  constructor(
    private readonly apiClient: APIClient,
    private readonly proteusService: ProteusService,
    private readonly storeEngine: CRUDEngine,
  ) {
    this.database = new ClientDatabaseRepository(this.storeEngine);
    this.backend = new ClientBackendRepository(this.apiClient);
  }

  public getClients(): Promise<RegisteredClient[]> {
    return this.backend.getClients();
  }

  /**
   * Will delete the given client from backend and will also delete it from the local database
   *
   * note: use deleteLocalClient if you wish to delete the client currently used by the user
   *
   * @param clientId The id of the client to delete
   * @param password? Password of the owning user. Can be omitted for temporary devices
   */
  public async deleteClient(clientId: string, password?: string): Promise<unknown> {
    const userId: QualifiedId = {id: this.apiClient.userId as string, domain: this.apiClient.domain || ''};
    await this.backend.deleteClient(clientId, password);
    return this.database.deleteClient(this.proteusService.constructSessionId(userId, clientId));
  }

  /**
   * Will delete the local client (client currently in use by the user) from backend and will also delete it from the local database
   * @param password? Password of the owning user. Can be omitted for temporary devices
   */
  public async deleteLocalClient(password?: string): Promise<string> {
    const localClientId = this.apiClient.context?.clientId;
    if (!localClientId) {
      throw new Error('Trying to delete local client, but local client has not been set');
    }
    await this.backend.deleteClient(localClientId, password);
    return this.database.deleteLocalClient();
  }

  private async getLocalClient(): Promise<MetaClient | undefined> {
    try {
      return await this.database.getLocalClient();
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Will try to load the local client from the database into memory.
   * Will return undefined if the client is not found in the database or if the client does not exist on the backend.
   * If the client doesn't exist on backend it will purge the database and return undefined.
   * If the client is found on the backend it will update the local client in the database and return it.
   *
   * @return the loaded client or undefined
   */
  public async loadClient(): Promise<RegisteredClient | undefined> {
    const loadedClient = await this.getLocalClient();

    if (!loadedClient) {
      return undefined;
    }

    try {
      const remoteClient = await this.apiClient.api.client.getClient(loadedClient.id);
      return this.database.updateLocalClient(remoteClient);
    } catch (error) {
      const notFoundOnBackend = axios.isAxiosError(error) ? error.response?.status === StatusCodes.NOT_FOUND : false;
      if (notFoundOnBackend && this.storeEngine) {
        this.logger.log('Could not find valid client on backend');
        const shouldDeleteWholeDatabase = loadedClient.type === ClientType.TEMPORARY;
        this.logger.log('Deleting previous identity');
        await this.proteusService.wipe(this.storeEngine);
        if (shouldDeleteWholeDatabase) {
          this.logger.log('Last client was temporary - Deleting content database');
          await this.storeEngine.clearTables();
        }
      }
    }
    return undefined;
  }

  private createLocalClient(client: RegisteredClient, domain?: string): Promise<MetaClient> {
    return this.database.createLocalClient(client, domain);
  }

  /**
   * Will download all the clients of the self user (excluding the current client) and will store them in the database
   * @param currentClient - the id of the current client (to be excluded from the list)
   */
  public async synchronizeClients(currentClient: string): Promise<MetaClient[]> {
    const registeredClients = await this.backend.getClients();
    const filteredClients = registeredClients.filter(client => client.id !== currentClient);
    return this.database.createClientList(
      {id: this.apiClient.context!.userId, domain: this.apiClient.context!.domain ?? ''},
      filteredClients,
    );
  }

  // TODO: Split functionality into "create" and "register" client
  public async register(
    loginData: LoginData,
    clientInfo: ClientInfo,
    {prekeys, lastPrekey}: InitialPrekeys,
  ): Promise<RegisteredClient> {
    if (!this.apiClient.context) {
      throw new Error('Context is not set.');
    }

    if (loginData.clientType === ClientType.NONE) {
      throw new Error(`Can't register client of type "${ClientType.NONE}"`);
    }

    const newClient: CreateClientPayload = {
      class: clientInfo.classification,
      capabilities: [ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT],
      cookie: clientInfo.cookieLabel,
      label: clientInfo.label,
      lastkey: lastPrekey,
      location: clientInfo.location,
      model: clientInfo.model,
      password: loginData.password ? String(loginData.password) : undefined,
      verification_code: loginData.verificationCode,
      prekeys: prekeys,
      type: loginData.clientType,
    };

    const client = await this.backend.postClient(newClient);

    await this.createLocalClient(client, this.apiClient.context.domain);

    return client;
  }
}
