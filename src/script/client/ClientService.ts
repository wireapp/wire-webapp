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

import {Logger, getLogger} from 'Util/Logger';

import {NewClient, PublicClient, RegisteredClient} from '@wireapp/api-client/dist/client';
import {BackendClient} from '../service/BackendClient';
import {StorageService} from '../storage';
import {StorageSchemata} from '../storage/StorageSchemata';

export class ClientService {
  private readonly backendClient: BackendClient;
  private readonly storageService: StorageService;
  private readonly logger: Logger;
  private readonly CLIENT_STORE_NAME: string;

  // tslint:disable-next-line:typedef
  static get URL_CLIENTS() {
    return '/clients';
  }

  // tslint:disable-next-line:typedef
  static get URL_USERS() {
    return '/users';
  }

  /**
   * @param backendClient Client for the API calls
   * @param storageService Service for all storage interactions
   */
  constructor(backendClient: BackendClient, storageService: StorageService) {
    this.backendClient = backendClient;
    this.storageService = storageService;
    this.logger = getLogger('ClientService');

    this.CLIENT_STORE_NAME = StorageSchemata.OBJECT_STORE.CLIENTS;
  }

  //##############################################################################
  // Backend requests
  //##############################################################################

  /**
   * Deletes a specific client from a user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteClient
   *
   * @param clientId ID of client to be deleted
   * @param password User password
   * @returns Resolves once the deletion of the client is complete
   */
  deleteClient(clientId: string, password: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        password,
      },
      type: 'DELETE',
      url: `${ClientService.URL_CLIENTS}/${clientId}`,
    });
  }

  /**
   * Deletes the temporary client of a user.
   * @param clientId ID of the temporary client to be deleted
   * @returns Resolves once the deletion of the temporary client is complete
   */
  deleteTemporaryClient(clientId: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {},
      type: 'DELETE',
      url: `${ClientService.URL_CLIENTS}/${clientId}`,
    });
  }

  /**
   * Retrieves meta information about a specific client.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients
   *
   * @param clientId ID of client to be retrieved
   * @returns Resolves with the requested client
   */
  getClientById(clientId: string): Promise<RegisteredClient> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${ClientService.URL_CLIENTS}/${clientId}`,
    });
  }

  /**
   * Retrieves meta information about all the clients self user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listClients
   * @returns Resolves with the clients of the self user
   */
  getClients(): Promise<RegisteredClient[]> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: ClientService.URL_CLIENTS,
    });
  }

  /**
   * Retrieves meta information about all the clients of a specific user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients
   *
   * @param userId ID of user to retrieve clients for
   * @returns Resolves with the clients of a user
   */
  getClientsByUserId(userId: string): Promise<PublicClient[]> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${ClientService.URL_USERS}/${userId}${ClientService.URL_CLIENTS}`,
    });
  }

  /**
   * Register a new client.
   * @param newClient Client payload
   * @returns Resolves with the registered client information
   */
  postClients(newClient: NewClient): Promise<RegisteredClient> {
    return this.backendClient.sendJson({
      data: newClient,
      type: 'POST',
      url: ClientService.URL_CLIENTS,
    });
  }

  //##############################################################################
  // Database requests
  //##############################################################################

  /**
   * Removes a client from the database.
   * @param primaryKey Primary key used to find the client for deletion in the database
   * @returns Resolves once the client is deleted
   */
  deleteClientFromDb(primaryKey: string): Promise<string> {
    return this.storageService.delete(this.CLIENT_STORE_NAME, primaryKey);
  }

  /**
   * Load all clients we have stored in the database.
   * @returns Resolves with all the clients payloads
   */
  loadAllClientsFromDb(): Promise<any[]> {
    return this.storageService.getAll(this.CLIENT_STORE_NAME);
  }

  /**
   * Loads a persisted client from the database.
   * @param primaryKey Primary key used to find a client in the database
   * @returns Resolves with the client's payload or the primary key if not found
   */
  async loadClientFromDb(primaryKey: string): Promise<object | string> {
    let clientRecord;

    if (this.storageService.db) {
      clientRecord = await this.storageService.db
        .table(this.CLIENT_STORE_NAME)
        .where('meta.primary_key')
        .equals(primaryKey)
        .first();
    } else {
      clientRecord = await this.storageService.load(this.CLIENT_STORE_NAME, primaryKey);
    }

    if (clientRecord === undefined) {
      this.logger.info(`Client with primary key '${primaryKey}' not found in database`);
      return primaryKey;
    }

    this.logger.info(`Loaded client record from database '${primaryKey}'`, clientRecord);
    return clientRecord;
  }

  /**
   * Persists a client.
   *
   * @param primaryKey Primary key used to find a client in the database
   * @param clientPayload Client payload
   * @returns Resolves with the client payload stored in database
   */
  saveClientInDb(primaryKey: string, clientPayload: any): Promise<any> {
    if (!clientPayload.meta) {
      clientPayload.meta = {};
    }

    clientPayload.meta.primary_key = primaryKey;

    return this.storageService.save(this.CLIENT_STORE_NAME, primaryKey, clientPayload).then(() => {
      this.logger.info(`Client '${clientPayload.id}' stored with primary key '${primaryKey}'`, clientPayload);
      return clientPayload;
    });
  }

  /**
   * Updates a persisted client in the database.
   *
   * @param primaryKey Primary key used to find a client in the database
   * @param changes Incremental update changes of the client JSON
   * @returns Number of updated records (1 if an object was updated, otherwise 0)
   */
  updateClientInDb(primaryKey: string, changes: object): Promise<number> {
    return this.storageService.update(this.CLIENT_STORE_NAME, primaryKey, changes);
  }
}
