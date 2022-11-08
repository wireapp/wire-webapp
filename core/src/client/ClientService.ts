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

import {LoginData, PreKey} from '@wireapp/api-client/lib/auth/';
import {ClientType, CreateClientPayload, RegisteredClient} from '@wireapp/api-client/lib/client/';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {APIClient} from '@wireapp/api-client';
import {CRUDEngine} from '@wireapp/store-engine';

import {CryptographyService} from '../cryptography/';

import {ClientInfo, ClientBackendRepository, ClientDatabaseRepository} from './';

export interface MetaClient extends RegisteredClient {
  domain?: string;
  meta: {
    is_verified?: boolean;
    primary_key: string;
  };
}

export class ClientService {
  private readonly database: ClientDatabaseRepository;
  private readonly backend: ClientBackendRepository;

  constructor(
    private readonly apiClient: APIClient,
    private readonly storeEngine: CRUDEngine,
    private readonly cryptographyService: CryptographyService,
  ) {
    this.database = new ClientDatabaseRepository(this.storeEngine, this.cryptographyService);
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
    return this.database.deleteClient(this.cryptographyService.constructSessionId(userId, clientId));
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

  public getLocalClient(): Promise<MetaClient> {
    return this.database.getLocalClient();
  }

  public createLocalClient(client: RegisteredClient, domain?: string): Promise<MetaClient> {
    return this.database.createLocalClient(client, domain);
  }

  public async synchronizeClients(): Promise<MetaClient[]> {
    const registeredClients = await this.backend.getClients();
    const filteredClients = registeredClients.filter(client => client.id !== this.apiClient.context!.clientId);
    return this.database.createClientList(
      this.apiClient.context!.userId,
      filteredClients,
      this.apiClient.context?.domain,
    );
  }

  // TODO: Split functionality into "create" and "register" client
  public async register(
    loginData: LoginData,
    clientInfo: ClientInfo,
    entropyData?: Uint8Array,
  ): Promise<RegisteredClient> {
    if (!this.apiClient.context) {
      throw new Error('Context is not set.');
    }

    if (loginData.clientType === ClientType.NONE) {
      throw new Error(`Can't register client of type "${ClientType.NONE}"`);
    }

    const serializedPreKeys: PreKey[] = await this.cryptographyService.createCryptobox(entropyData);

    if (!this.cryptographyService.cryptobox.lastResortPreKey) {
      throw new Error('Cryptobox got initialized without a last resort PreKey.');
    }

    const newClient: CreateClientPayload = {
      class: clientInfo.classification,
      cookie: clientInfo.cookieLabel,
      label: clientInfo.label,
      lastkey: this.cryptographyService.cryptobox.serialize_prekey(this.cryptographyService.cryptobox.lastResortPreKey),
      location: clientInfo.location,
      model: clientInfo.model,
      password: loginData.password ? String(loginData.password) : undefined,
      verification_code: loginData.verificationCode,
      prekeys: serializedPreKeys,
      type: loginData.clientType,
    };

    const client = await this.backend.postClient(newClient);

    await this.createLocalClient(client, this.apiClient.context.domain);

    return client;
  }
}
