#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.client ?= {}

class z.client.ClientService
  URL_CLIENTS: '/clients'
  URL_USERS: '/users'

  constructor: (@client, @storage_service) ->
    @logger = new z.util.Logger 'z.client.ClientService', z.config.LOGGER.OPTIONS
    return @


  ###############################################################################
  # Backend requests
  ###############################################################################

  ###
  Deletes a specific client from a user.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteClient

  @param client_id [String] ID of the client that should be deleted
  @param password [String] Password entered by user
  @return [Promise] Promise that resolves once the deletion of the client is complete
  ###
  delete_client: (client_id, password) ->
    @client.send_json
      url: @client.create_url "#{@URL_CLIENTS}/#{client_id}"
      type: 'DELETE'
      data:
        password: password

  ###
  Deletes the temporary client of a user.
  @param client_id [String] ID of the temporary client to be deleted
  @return [Promise] Promise that resolves once the deletion of the temporary client is complete
  ###
  delete_temporary_client: (client_id) ->
    @client.send_json
      url: @client.create_url "#{@URL_CLIENTS}/#{client_id}"
      type: 'DELETE'
      data: {}

  ###
  Retrieves meta information about a specific client.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients

  @param client_id [String] ID of client to be retrieved
  @return [Promise] Promise that resolves with the requested client
  ###
  get_client_by_id: (client_id) ->
    @client.send_request
      url: @client.create_url "#{@URL_CLIENTS}/#{client_id}"
      type: 'GET'

  ###
  Retrieves meta information about all the clients self user.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listClients
  @return [Promise] Promise that resolves with the clients of the self user
  ###
  get_clients: ->
    @client.send_request
      url: @client.create_url @URL_CLIENTS
      type: 'GET'

  ###
  Retrieves meta information about all the clients of a specific user.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getClients

  @param user_id [String] ID of user to retrieve clients for
  @return [Promise] Promise that resolves with the clients of a user
  ###
  get_clients_by_user_id: (user_id) ->
    @client.send_request
      url: @client.create_url "#{@URL_USERS}/#{user_id}#{@URL_CLIENTS}"
      type: 'GET'

  ###
  Register a new client.
  @param payload [Object] Client payload
  @return [Promise] Promise that resolves with the registered client information
  ###
  post_clients: (payload) ->
    @client.send_json
      type: 'POST'
      url: @client.create_url @URL_CLIENTS
      data: payload


  ###############################################################################
  # Database requests
  ###############################################################################

  ###
  Removes a client from the database.
  @param primary_key [String] Primary key used to find the client for deletion in the database
  @return [Promise] Promise that resolves once the client is deleted
  ###
  delete_client_from_db: (primary_key) ->
    return @storage_service.delete @storage_service.OBJECT_STORE_CLIENTS, primary_key

  ###
  Load all clients we have stored in the database.
  @return [Promise] Promise that resolves with all the clients payloads
  ###
  load_all_clients_from_db: =>
    return @storage_service.get_all @storage_service.OBJECT_STORE_CLIENTS

  ###
  Loads a persisted client from the database.
  @param primary_key [String] Primary key used to find a client in the database
  @return [Promise<JSON|String>] Promise that resolves with the client's payload or the primary key if not found
  ###
  load_client_from_db: (primary_key) ->
    return @storage_service.db[@storage_service.OBJECT_STORE_CLIENTS]
    .where 'meta.primary_key'
    .equals primary_key
    .first()
    .then (client_record) =>
      if client_record is undefined
        @logger.log @logger.levels.INFO, "Client with primary key '#{primary_key}' not found in database"
        return primary_key
      else
        @logger.log @logger.levels.INFO, "Loaded client record from database '#{primary_key}'", client_record
        return client_record

  ###
  Loads a persisted clients from the database for given user id.
  @param user_id [String]
  @return [Promise<Array>] Promise that resolves with an array of client records
  ###
  load_clients_from_db_by_user_id: (user_id) ->
    return @storage_service.get_keys @storage_service.OBJECT_STORE_CLIENTS, user_id
    .then (primary_keys) =>
      return @load_clients_from_db primary_keys

  ###
  Loads persisted clients from the database.
  @param primary_keys [Array<String>] Primary keys used to find clients in the database
  @return [Promise<JSON|String>] Promise that resolves with the clients' payloads or the primary keys if not found
  ###
  load_clients_from_db: (primary_keys) ->
    promises = (@load_client_from_db primary_key for primary_key in primary_keys)
    return Promise.all promises

  ###
  Persists a client.

  @param primary_key [String] Primary key used to find a client in the database
  @param client_payload [JSON] Client payload
  @return [Promise<JSON>] Promise that resolves with the client payload stored in database
  ###
  save_client_in_db: (primary_key, client_payload) ->
    client_payload.meta ?= {}
    client_payload.meta.primary_key = primary_key

    return @storage_service.save @storage_service.OBJECT_STORE_CLIENTS, primary_key, client_payload
    .then (primary_key) =>
      @logger.log @logger.levels.INFO,
        "Client '#{client_payload.id}' stored with primary key '#{primary_key}'", client_payload
      return client_payload

  ###
  Updates a persisted client in the database.

  @param primary_key [String] Primary key used to find a client in the database
  @param changes [JSON] Incremental update changes of the client JSON
  @return [Promise<Integer>] Number of updated records (1 if an object was updated, otherwise 0)
  ###
  update_client_in_db: (primary_key, changes) ->
    return @storage_service.update @storage_service.OBJECT_STORE_CLIENTS, primary_key, changes
