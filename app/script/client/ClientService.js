/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
  /**
   * Construct a new client service.
   * @param {z.client.Client} client - Local client entity
   * @param {z.storage.StorageService} storage_service - Service for all storage interactions
   */
  constructor(client, storage_service) {
    this.client = client;
    this.storage_service = storage_service;
    this.logger = new z.util.Logger('z.client.ClientService', z.config.LOGGER.OPTIONS);
  }

  //##############################################################################
  // Backend requests
  //##############################################################################

  /**
   * Deletes a specific client from a user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteClient
   *
   * @param {string} client_id - ID of client to be deleted
   * @param {string} password - User password
   * @returns {Promise} Resolves once the deletion of the client is complete
   */
  delete_client(client_id, password) {
    return this.client.send_json({
      data: {
        password
      },
      type: 'DELETE',
      url: this.client.create_url(`${z.client.ClientService.URL_CLIENTS}/${client_id}`)
    });
  }

  /**
   * Deletes the temporary client of a user.
   * @param {string} client_id - ID of the temporary client to be deleted
   * @returns {Promise} - Resolves once the deletion of the temporary client is complete
   */
  delete_temporary_client(client_id) {
    return this.client.send_json({
      data: {},
      type: 'DELETE',
      url: this.client.create_url(`${z.client.ClientService.URL_CLIENTS}/${client_id}`)
    });
  }

  /**
   * Retrieves meta information about a specific client.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients
   *
   * @param {string} client_id - ID of client to be retrieved
   * @returns {Promise} Resolves with the requested client
  */
  get_client_by_id(client_id) {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(`${z.client.ClientService.URL_CLIENTS}/${client_id}`)
    });
  }

  /**
   * Retrieves meta information about all the clients self user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listClients
   * @returns {Promise} Resolves with the clients of the self user
   */
  get_clients() {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(z.client.ClientService.URL_CLIENTS)
    });
  }

  /**
   * Retrieves meta information about all the clients of a specific user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients
   *
   * @param {string} user_id - ID of user to retrieve clients for
   * @returns {Promise} Resolves with the clients of a user
   */
  get_clients_by_user_id(user_id) {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(`${z.client.ClientService.URL_USERS}/${user_id}${z.client.ClientService.URL_CLIENTS}`)
    });
  }

  /**
   * Register a new client.
   * @param {Object} payload - Client payload
   * @returns {Promise} Resolves with the registered client information
   */
  post_clients(payload) {
    return this.client.send_json({
      data: payload,
      type: 'POST',
      url: this.client.create_url(z.client.ClientService.URL_CLIENTS)
    });
  }

  static get URL_CLIENTS() {
    return '/clients';
  }

  static get URL_USERS() {
    return '/users';
  }

  //##############################################################################
  // Database requests
  //##############################################################################

  /**
   * Removes a client from the database.
   * @param {string} primary_key - Primary key used to find the client for deletion in the database
   * @returns {Promise} Resolves once the client is deleted
   */
  delete_client_from_db(primary_key) {
    return this.storage_service.delete(z.storage.StorageService.OBJECT_STORE.CLIENTS, primary_key);
  }

  /**
   * Load all clients we have stored in the database.
   * @returns {Promise} Resolves with all the clients payloads
   */
  load_all_clients_from_db() {
    return this.storage_service.get_all(z.storage.StorageService.OBJECT_STORE.CLIENTS);
  }

  /**
   * Loads a persisted client from the database.
   * @param {string} primary_key - Primary key used to find a client in the database
   * @returns {Promise<JSON|string>} Resolves with the client's payload or the primary key if not found
   */
  load_client_from_db(primary_key) {
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.CLIENTS]
      .where('meta.primary_key')
      .equals(primary_key)
      .first()
      .then(client_record => {
        if (client_record === undefined) {
          this.logger.info(`Client with primary key '${primary_key}' not found in database`);
          return primary_key;
        }
        this.logger.info(`Loaded client record from database '${primary_key}'`, client_record);
        return client_record;
      });
  }

  /**
   * Persists a client.
   *
   * @param {string} primary_key - Primary key used to find a client in the database
   * @param {Object} client_payload - Client payload
   * @returns {Promise<Object>} Resolves with the client payload stored in database
   */
  save_client_in_db(primary_key, client_payload) {
    if (client_payload.meta == null) {
      client_payload.meta = {};
    }

    client_payload.meta.primary_key = primary_key;

    return this.storage_service
      .save(z.storage.StorageService.OBJECT_STORE.CLIENTS, primary_key, client_payload)
      .then(() => {
        this.logger.info(`Client '${client_payload.id}' stored with primary key '${primary_key}'`, client_payload);
        return client_payload;
      });
  }

  /**
   * Updates a persisted client in the database.
   *
   * @param {string} primary_key - Primary key used to find a client in the database
   * @param {Object} changes - Incremental update changes of the client JSON
   * @returns {Promise<Integer>} Number of updated records (1 if an object was updated, otherwise 0)
   */
  update_client_in_db(primary_key, changes) {
    return this.storage_service.update(z.storage.StorageService.OBJECT_STORE.CLIENTS, primary_key, changes);
  }
};
