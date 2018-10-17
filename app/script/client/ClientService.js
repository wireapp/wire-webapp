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

'use strict';

window.z = window.z || {};
window.z.client = z.client || {};

z.client.ClientService = class ClientService {
  static get URL_CLIENTS() {
    return '/clients';
  }

  static get URL_USERS() {
    return '/users';
  }

  /**
   * Construct a new client service.
   * @param {z.client.ClientEntity} clientEntity - Local client entity
   * @param {z.storage.StorageService} storageService - Service for all storage interactions
   */
  constructor(clientEntity, storageService) {
    this.client = clientEntity;
    this.storageService = storageService;
    this.logger = new z.util.Logger('z.client.ClientService', z.config.LOGGER.OPTIONS);

    this.CLIENT_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.CLIENTS;
  }

  //##############################################################################
  // Backend requests
  //##############################################################################

  /**
   * Deletes a specific client from a user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteClient
   *
   * @param {string} clientId - ID of client to be deleted
   * @param {string} password - User password
   * @returns {Promise} Resolves once the deletion of the client is complete
   */
  deleteClient(clientId, password) {
    return this.client.sendJson({
      data: {
        password,
      },
      type: 'DELETE',
      url: `${ClientService.URL_CLIENTS}/${clientId}`,
    });
  }

  /**
   * Deletes the temporary client of a user.
   * @param {string} clientId - ID of the temporary client to be deleted
   * @returns {Promise} - Resolves once the deletion of the temporary client is complete
   */
  deleteTemporaryClient(clientId) {
    return this.client.sendJson({
      data: {},
      type: 'DELETE',
      url: `${ClientService.URL_CLIENTS}/${clientId}`,
    });
  }

  /**
   * Retrieves meta information about a specific client.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients
   *
   * @param {string} clientId - ID of client to be retrieved
   * @returns {Promise} Resolves with the requested client
   */
  getClientById(clientId) {
    return this.client.sendRequest({
      type: 'GET',
      url: `${ClientService.URL_CLIENTS}/${clientId}`,
    });
  }

  /**
   * Retrieves meta information about all the clients self user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listClients
   * @returns {Promise} Resolves with the clients of the self user
   */
  getClients() {
    return this.client.sendRequest({
      type: 'GET',
      url: ClientService.URL_CLIENTS,
    });
  }

  /**
   * Retrieves meta information about all the clients of a specific user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients
   *
   * @param {string} userId - ID of user to retrieve clients for
   * @returns {Promise} Resolves with the clients of a user
   */
  getClientsByUserId(userId) {
    return this.client.sendRequest({
      type: 'GET',
      url: `${ClientService.URL_USERS}/${userId}${ClientService.URL_CLIENTS}`,
    });
  }

  /**
   * Register a new client.
   * @param {Object} payload - Client payload
   * @returns {Promise} Resolves with the registered client information
   */
  postClients(payload) {
    return this.client.sendJson({
      data: payload,
      type: 'POST',
      url: ClientService.URL_CLIENTS,
    });
  }

  //##############################################################################
  // Database requests
  //##############################################################################

  /**
   * Removes a client from the database.
   * @param {string} primaryKey - Primary key used to find the client for deletion in the database
   * @returns {Promise} Resolves once the client is deleted
   */
  deleteClientFromDb(primaryKey) {
    return this.storageService.delete(this.CLIENT_STORE_NAME, primaryKey);
  }

  /**
   * Load all clients we have stored in the database.
   * @returns {Promise} Resolves with all the clients payloads
   */
  loadAllClientsFromDb() {
    return this.storageService.getAll(this.CLIENT_STORE_NAME);
  }

  /**
   * Loads a persisted client from the database.
   * @param {string} primaryKey - Primary key used to find a client in the database
   * @returns {Promise<JSON|string>} Resolves with the client's payload or the primary key if not found
   */
  loadClientFromDb(primaryKey) {
    return this.storageService.db[this.CLIENT_STORE_NAME]
      .where('meta.primary_key')
      .equals(primaryKey)
      .first()
      .then(clientRecord => {
        if (clientRecord === undefined) {
          this.logger.info(`Client with primary key '${primaryKey}' not found in database`);
          return primaryKey;
        }
        this.logger.info(`Loaded client record from database '${primaryKey}'`, clientRecord);
        return clientRecord;
      });
  }

  /**
   * Persists a client.
   *
   * @param {string} primaryKey - Primary key used to find a client in the database
   * @param {Object} clientPayload - Client payload
   * @returns {Promise<Object>} Resolves with the client payload stored in database
   */
  saveClientInDb(primaryKey, clientPayload) {
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
   * @param {string} primaryKey - Primary key used to find a client in the database
   * @param {Object} changes - Incremental update changes of the client JSON
   * @returns {Promise<Integer>} Number of updated records (1 if an object was updated, otherwise 0)
   */
  updateClientInDb(primaryKey, changes) {
    return this.storageService.update(this.CLIENT_STORE_NAME, primaryKey, changes);
  }
};
