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

class z.client.ClientRepository
  PRIMARY_KEY_CURRENT_CLIENT: 'local_identity'
  constructor: (@client_service, @cryptography_repository) ->
    @self_user = ko.observable undefined
    @logger = new z.util.Logger 'z.client.ClientRepository', z.config.LOGGER.OPTIONS

    @client_mapper = new z.client.ClientMapper()
    @clients = ko.pureComputed =>
      if @self_user() then @self_user().devices() else []
    @current_client = ko.observable undefined

    amplify.subscribe z.event.Backend.USER.CLIENT_ADD, @map_self_client
    amplify.subscribe z.event.Backend.USER.CLIENT_REMOVE, @on_client_remove
    amplify.subscribe z.event.WebApp.LIFECYCLE.ASK_TO_CLEAR_DATA, @logout_client
    amplify.subscribe z.event.WebApp.LOGOUT.ASK_TO_CLEAR_DATA, @logout_client # todo: deprecated - remove when user base of wrappers version >= 2.12 is large enough

    return @

  init: (self_user) ->
    @self_user self_user
    @logger.info "Initialized repository with user ID '#{@self_user().id}'"


  ###############################################################################
  # Service interactions
  ###############################################################################

  delete_client_from_db: (user_id, client_id) ->
    return @client_service.delete_client_from_db @_construct_primary_key user_id, client_id

  ###
  Delete the temporary client on the backend.
  @return [Promise] Promise that resolves when the temporary client was deleted on the backend
  ###
  delete_temporary_client: ->
    return @client_service.delete_temporary_client @current_client().id

  ###
  Load all known clients from the database.
  @return [Promise] Promise that resolves with all the clients found in the local database
  ###
  get_all_clients_from_db: =>
    return @client_service.load_all_clients_from_db()
    .then (clients) =>
      user_client_map = {}
      for client in clients
        ids = z.client.Client.dismantle_user_client_id client.meta.primary_key
        continue if not ids.user_id or ids.user_id in [@self_user().id, @PRIMARY_KEY_CURRENT_CLIENT]
        user_client_map[ids.user_id] ?= []
        client_et = @client_mapper.map_client client
        user_client_map[ids.user_id].push client_et
      return user_client_map

  ###
  Retrieves meta information about specific client of the self user.
  @param client_id [String] ID of client to be retrieved
  @return [Promise] Promise that resolves with the retrieved client information
  ###
  get_client_by_id_from_backend: (client_id) =>
    @client_service.get_client_by_id client_id

  ###
  Loads a client from the database (if it exists).
  @return [Promise<z.client.Client>] Promise that resolves with the local client
  ###
  get_current_client_from_db: =>
    @client_service.load_client_from_db @PRIMARY_KEY_CURRENT_CLIENT
    .catch ->
      throw new z.client.ClientError z.client.ClientError::TYPE.DATABASE_FAILURE
    .then (client_payload) =>
      if _.isString client_payload
        @logger.info "No current local client connected to '#{@PRIMARY_KEY_CURRENT_CLIENT}' found in database"
        throw new z.client.ClientError z.client.ClientError::TYPE.NO_LOCAL_CLIENT
      else
        client_et = @client_mapper.map_client client_payload
        @current_client client_et
        @logger.info "Loaded local client '#{client_et.id}' connected to '#{@PRIMARY_KEY_CURRENT_CLIENT}'", @current_client()
        return @current_client()

  ###
  Construct the primary key to store clients in database.
  @private

  @param user_id [String] User ID from the owner of the client
  @param client_id [String] Client ID
  @return [String] Primary key
  ###
  _construct_primary_key: (user_id, client_id) ->
    throw new z.client.ClientError z.client.ClientError::TYPE.NO_USER_ID if not user_id
    throw new z.client.ClientError z.client.ClientError::TYPE.NO_CLIENT_ID if not client_id
    return "#{user_id}@#{client_id}"

  ###
  Save the a client into the database.

  @private
  @param user_id [String] ID of user client to be stored belongs to
  @param client_payload [Object] Client data to be stored in database
  @return [Promise] Promise that resolves with the record stored in database
  ###
  save_client_in_db: (user_id, client_payload) =>
    primary_key = @_construct_primary_key user_id, client_payload.id
    return @client_service.save_client_in_db primary_key, client_payload

  ###
  Updates properties for a client record in database.

  @todo Merge "meta" property before updating it, Object.assign(payload.meta, changes.meta)
  @param user_id [String] User ID of the client owner
  @param client_id [String] Client ID which needs to get updated
  @param changes [String] New values which should be updated on the client
  @return [Integer] Number of updated records
  ###
  update_client_in_db: (user_id, client_id, changes) ->
    primary_key = @_construct_primary_key user_id, client_id
    # Preserve primary key on update
    changes.meta.primary_key = primary_key
    return @client_service.update_client_in_db primary_key, changes

  ###
  Change verification state of client.

  @param user_id [String] User ID of the client owner
  @param client_et [z.client.Clients] Client which needs to get updated
  @param is_verified [Boolean] New state to apply
  ###
  verify_client: (user_id, client_et, is_verified) =>
    @update_client_in_db user_id, client_et.id, {meta: is_verified: is_verified}
    .then ->
      client_et.meta.is_verified is_verified
      amplify.publish z.event.WebApp.CLIENT.VERIFICATION_STATE_CHANGED, user_id, client_et, is_verified

  ###
  Save the local client into the database.

  @private
  @param client_payload [Object] Client data to be stored in database
  @return [Promise] Promise that resolves with the record stored in database
  ###
  _save_current_client_in_db: (client_payload) =>
    client_payload.meta =
      is_verified: true
    return @client_service.save_client_in_db @PRIMARY_KEY_CURRENT_CLIENT, client_payload

  ###
  Updates a client payload if it does not fit the current database structure.

  @private
  @param user_id [String] User ID of the client owner
  @param client_payload [Object] Client data to be stored in database
  @return [Promise] Promise that resolves with the record stored in database
  ###
  _update_client_schema_in_db: (user_id, client_payload) =>
    client_payload.meta =
      is_verified: false
      primary_key: @_construct_primary_key user_id, client_payload.id
    return @save_client_in_db user_id, client_payload

  ###############################################################################
  # Login and registration
  ###############################################################################

  ###
  Constructs the value for a cookie label.
  @param login [String] Email or phone number of the user
  @param client_type [z.client.ClientType] Temporary or permanent client type
  ###
  construct_cookie_label: (login, client_type) ->
    login_hash = z.util.murmurhash3 login, 42
    client_type = @_load_current_client_type() if not client_type
    return "webapp@#{login_hash}@#{client_type}@#{Date.now()}"

  ###
  Constructs the key for a cookie label.
  @param login [String] Email or phone number of the user
  @param client_type [z.client.ClientType] Temporary or permanent client type
  ###
  construct_cookie_label_key: (login, client_type) ->
    login_hash = z.util.murmurhash3 login, 42
    client_type = @_load_current_client_type() if not client_type
    return "#{z.storage.StorageKey.AUTH.COOKIE_LABEL}@#{login_hash}@#{client_type}"

  ###
  Validate existence of a local client online.
  @param client [z.client.Client] Client retrieved from IndexedDB
  @return [Promise] Promise that will resolve with an observable containing the client if valid
  ###
  get_valid_local_client: =>
    @get_current_client_from_db()
    .then (client_et) =>
      return @get_client_by_id_from_backend client_et.id
    .then (client) =>
      @logger.info "Client with ID '#{client.id}' (#{client.type}) validated on backend"
      return @current_client
    .catch (error) =>
      client_et = @current_client()
      @current_client undefined
      error_message = error.code or error.message

      if error.code is z.service.BackendClientError::STATUS_CODE.NOT_FOUND
        error_message = "Local client '#{client_et.id}' (#{client_et.type}) no longer exists on the backend"
        @logger.warn error_message, error

        if client_et.is_temporary()
          delete_promise =  @cryptography_repository.storage_repository.delete_everything()
        else
          delete_promise = @cryptography_repository.storage_repository.delete_cryptography()

        delete_promise.catch (error) =>
          @logger.error "Deleting crypto database after failed client validation unsuccessful: #{error.message}", error
          throw new z.client.ClientError z.client.ClientError::TYPE.DATABASE_FAILURE
        .then ->
          throw new z.client.ClientError z.client.ClientError::TYPE.MISSING_ON_BACKEND
      else if error.type is z.client.ClientError::TYPE.NO_LOCAL_CLIENT
        @cryptography_repository.storage_repository.delete_cryptography()
        throw error
      else
        @logger.error "Getting valid local client failed: #{error_message}", error
        throw error

  ###
  Register a new client.
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/registerClient

  @note Password is needed for the registration of a client once 1st client has been registered.
  @param password [String] User password for verification
  @return [Promise<z.client.Client>] Promise that will resolve with the newly registered client
  ###
  register_client: (password) =>
    return new Promise (resolve, reject) =>
      client_type = @_load_current_client_type()

      @cryptography_repository.generate_client_keys()
      .then (keys) =>
        return @client_service.post_clients @_create_registration_payload client_type, password, keys
      .catch (error) =>
        if error.label is z.service.BackendClientError::LABEL.TOO_MANY_CLIENTS
          throw new z.client.ClientError z.client.ClientError::TYPE.TOO_MANY_CLIENTS
        else
          @logger.error "Client registration request failed: #{error.message}", error
          throw new z.client.ClientError z.client.ClientError::TYPE.REQUEST_FAILURE
      .then (response) =>
        @logger.info "Registered '#{response.type}' client '#{response.id}' with cookie label '#{response.cookie}'", response
        @current_client @client_mapper.map_client response
        # Save client
        return @_save_current_client_in_db response
      .catch (error) =>
        if error.type in [z.client.ClientError::TYPE.REQUEST_FAILURE, z.client.ClientError::TYPE.TOO_MANY_CLIENTS]
          throw error
        else
          @logger.error "Failed to save client: #{error.message}", error
          throw new z.client.ClientError z.client.ClientError::TYPE.DATABASE_FAILURE
      .then (client_payload) =>
        # Update cookie
        return @_transfer_cookie_label client_type, client_payload.cookie
      .then =>
        resolve @current_client
      .catch (error) =>
        @logger.error "Client registration failed: #{error.message}", error
        reject error

  ###
  Create payload for client registration.

  @private
  @param client_type [z.client.ClientType] Type of client to be registered
  @param password [String] User password
  @param keys [Array] Array containing last resort key, pre-keys and signaling keys
  @return [Object] Payload to register client with backend
  ###
  _create_registration_payload: (client_type, password, keys) ->
    [last_resort_key, pre_keys, signaling_keys] = keys

    device_label = "#{platform.os.family}"
    device_label += " #{platform.os.version}" if platform.os.version
    device_model = platform.name

    if z.util.Environment.electron
      if z.util.Environment.os.mac
        identifier = z.string.wire_macos
      else if z.util.Environment.os.win
        identifier = z.string.wire_windows
      else
        identifier = z.string.wire_linux
      device_model = z.localization.Localizer.get_text identifier
      device_model = "#{device_model} (Internal)" if not z.util.Environment.frontend.is_production()
    else
      device_model = "#{device_model} (Temporary)" if client_type is z.client.ClientType.TEMPORARY

    return {
      class: 'desktop'
      cookie: @_get_cookie_label_value @self_user().email() or @self_user().phone()
      label: device_label
      lastkey: last_resort_key
      model: device_model
      password: password
      prekeys: pre_keys
      sigkeys: signaling_keys
      type: client_type
    }

  ###
  Gets the value for a cookie label.
  @private
  @param login [String] Email or phone number of the user
  ###
  _get_cookie_label_value: (login) ->
    return z.util.StorageUtil.get_value @construct_cookie_label_key login

  ###
  Loads the cookie label value from the Local Storage and saves it into IndexedDB.

  @private
  @param client_type [z.client.ClientType] Temporary or permanent client type
  @param cookie_label [String] Cookie label, something like "webapp@2153234453@temporary@145770538393"
  @return [Promise] Promise that resolves with the key of the stored cookie label
  ###
  _transfer_cookie_label: (client_type, cookie_label) =>
    indexed_db_key = z.storage.StorageKey.AUTH.COOKIE_LABEL
    local_storage_key = @construct_cookie_label_key @self_user().email() or @self_user().phone(), client_type

    if cookie_label is undefined
      cookie_label = @construct_cookie_label @self_user().email() or @self_user().phone(), client_type
      @logger.warn "Cookie label is in an invalid state. We created a new one: '#{cookie_label}'"
      z.util.StorageUtil.set_value local_storage_key, cookie_label

    @logger.info "Saving cookie label '#{cookie_label}' in IndexedDB",
      key: local_storage_key
      value: cookie_label

    return @cryptography_repository.storage_repository.save_value indexed_db_key, cookie_label

  ###
  Load current client type from amplify store.
  @private
  @return [z.client.ClientType] Type of current client
  ###
  _load_current_client_type: ->
    return @current_client().type if @current_client()
    is_permanent = z.util.StorageUtil.get_value z.storage.StorageKey.AUTH.PERSIST
    type = if is_permanent then z.client.ClientType.PERMANENT else z.client.ClientType.TEMPORARY
    type = if z.util.Environment.electron then z.client.ClientType.PERMANENT else type
    return type


  ###############################################################################
  # Client handling
  ###############################################################################

  ###
  Cleanup local sessions.

  @note If quick_clean parameter is set to false, there will be one backend request per user that has a session.
  @param quick_clean [Boolean] Optional value defaulting to true whether to check all users with local sessions or the ones with too many sessions
  ###
  cleanup_clients_and_sessions: (quick_clean = true) =>
    for user_id, client_ids of @cryptography_repository.create_user_session_map()
      log_level = if client_ids > 8 then @logger.levels.WARN else @logger.levels.INFO
      unless quick_clean and client_ids.length <= 8
        @logger.log log_level, "User '#{user_id}' has session with '#{client_ids.length}' clients locally"
        @_remove_obsolete_client_for_user_by_id user_id, client_ids

  ###
  Delete client of a user on backend and removes it locally.

  @param client_id [String] ID of the client that should be deleted
  @param password [String] Password entered by user
  @return [Promise] Promise that resolves with the remaining user devices
  ###
  delete_client: (client_id, password) =>
    if not password
      @logger.error "Could not delete client '#{client_id}' because password is missing"
      Promise.reject new z.client.ClientError z.client.ClientError::TYPE.REQUEST_FORBIDDEN

    @client_service.delete_client client_id, password
    .then =>
      @delete_client_from_db @self_user().id, client_id
    .then =>
      @self_user().remove_client client_id
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.REMOVED_DEVICE, outcome: 'success'
      amplify.publish z.event.WebApp.USER.CLIENT_REMOVED, @self_user().id, client_id
      return @clients()
    .catch (error) =>
      @logger.error "Unable to delete client '#{client_id}': #{error.message}", error
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.REMOVED_DEVICE, outcome: 'fail'

      if error.code is z.service.BackendClientError::STATUS_CODE.FORBIDDEN
        error = new z.client.ClientError z.client.ClientError::TYPE.REQUEST_FORBIDDEN
      else
        error = new z.client.ClientError z.client.ClientError::TYPE.REQUEST_FAILURE
      throw error

  logout_client: =>
    if @current_client().type is z.client.ClientType.PERMANENT
      amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.LOGOUT,
        action: (clear_data) ->
          amplify.publish z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReason.USER_REQUESTED, clear_data
    else
      @delete_temporary_client()
      .then -> amplify.publish z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReason.USER_REQUESTED, true

  ###
  Removes a stored client and the session connected with it.

  @param user_id [String] ID of user
  @param client_id [String] ID of client to be deleted
  @return [Promise] Promise that resolves when a client and its session have been deleted
  ###
  remove_client: (user_id, client_id) =>
    @cryptography_repository.delete_session user_id, client_id
    .then =>
      @delete_client_from_db user_id, client_id

  ###
  Retrieves meta information about all the clients of a given user.
  @note If you want to get very detailed information about the devices from the own user, then use "@get_clients"

  @param user_id [String] User ID to retrieve client information for
  @return [Promise] Promise that resolves with an array of client entities
  ###
  get_clients_by_user_id: (user_id) =>
    @client_service.get_clients_by_user_id user_id
    .then (clients) =>
      return @_update_clients_for_user user_id, clients
    .then (client_ets) ->
      amplify.publish z.event.WebApp.CLIENT.UPDATE, user_id, client_ets
      return client_ets

  get_client_by_user_id_from_db: (user_id) =>
    @client_service.load_all_clients_from_db()
    .then (clients) ->
      return (client for client in clients when (z.client.Client.dismantle_user_client_id client.meta.primary_key).user_id is user_id)

  ###
  Retrieves meta information about all the clients of the self user.
  @return [Promise] Promise that resolves with the retrieved information about the clients
  ###
  get_clients_for_self: ->
    @logger.info "Retrieving all clients for the self user '#{@self_user().id}'"
    @client_service.get_clients()
    .then (response) =>
      return @_update_clients_for_user @self_user().id, response
    .then (client_ets) =>
      @self_user().add_client client_et for client_et in client_ets
      return @self_user().devices()

  ###
  Is the current client permanent.
  @return [Boolean] Type of current client is permanent
  ###
  is_current_client_permanent: =>
    throw new z.client.ClientError z.client.ClientError::TYPE.CLIENT_NOT_SET if not @current_client()
    if z.util.Environment.electron
      is_permanent = true
    else
      is_permanent = @current_client().is_permanent()
    return is_permanent

  ###
  Remove obsolete clients and sessions for given user.

  @private
  @param user_id [String] ID of user to check clients and sessions off
  @param client_ids [Array<String>] Array of strings containing IDs of local sessions for user
  ###
  _remove_obsolete_client_for_user_by_id: (user_id, client_ids) ->
    @get_clients_by_user_id user_id
    .then (client_ets) =>
      @logger.info "For user '#{user_id}' backend found '#{client_ets.length}' active clients. Locally there are sessions for '#{client_ids.length}' clients",
        clients: client_ets
        sessions: client_ids
      for client_id in client_ids
        deleted_client = true
        for client_et in client_ets when client_et.id is client_id
          deleted_client = false
          break
        if deleted_client
          @logger.log "Client '#{client_id}' of user '#{user_id}' is obsolete and will be removed"
          @remove_client user_id, client_id

  ###
  Match backend client response with locally stored ones.
  @note: This function matches clients retrieved from the backend with the data stored in the local database.
    Clients will then be updated with the backend payload in the database and mapped into entities.

  @private
  @param user_id [String] User ID
  @param clients [JSON] Payload from the backend
  @return [Promise<Array[z.client.Client]>] Client entities
  ###
  _update_clients_for_user: (user_id, clients) ->
    return new Promise (resolve, reject) =>
      clients_from_backend = {}
      clients_from_backend[client.id] = client for client in clients

      clients_stored_in_db = []

      # Find clients in database
      @get_client_by_user_id_from_db user_id
      .then (results) =>
        promises = []

        for result in results
          if clients_from_backend[result.id]
            [client_payload, contains_update] = @client_mapper.update_client result, clients_from_backend[result.id]
            delete clients_from_backend[result.id]

            if @current_client() and @_is_current_client user_id, result.id
              @logger.warn "Removing duplicate self client '#{result.id}' locally"
              @remove_client user_id, result.id

            # Locally known client changed on backend
            if contains_update
              @logger.info "Updating client '#{result.id}' of user '#{user_id}' locally"
              promises.push @save_client_in_db user_id, client_payload
              continue

            # Locally known client unchanged on backend
            clients_stored_in_db.push client_payload
            continue

          # Locally known client deleted on backend
          @logger.warn "Removing client '#{result.id}' of user '#{user_id}' locally"
          @remove_client user_id, result.id

        for client_id, client_payload of clients_from_backend
          continue if @current_client() and @_is_current_client user_id, client_id

          # Locally unknown client new on backend
          @logger.info "New client '#{client_id}' of user '#{user_id}' will be stored locally"
          @map_self_client {client: client_payload} if @self_user().id is user_id
          promises.push @_update_client_schema_in_db user_id, client_payload

        return Promise.all promises
      .then (new_records) =>
        resolve @client_mapper.map_clients clients_stored_in_db.concat new_records
      .catch (error) =>
        @logger.error "Unable to retrieve clients for user '#{user_id}': #{error.message}", error
        reject error

  ###
  Check if client is current local client.

  @private
  @param user_id [String] User ID to be checked
  @param client_id [String] ID of client to be checked
  @return [Boolean] Is the client the current local client
  ###
  _is_current_client: (user_id, client_id) ->
    throw new z.client.ClientError z.client.ClientError::TYPE.CLIENT_NOT_SET if not @current_client()
    throw new z.client.ClientError z.client.ClientError::TYPE.NO_USER_ID if not user_id
    throw new z.client.ClientError z.client.ClientError::TYPE.NO_CLIENT_ID if not client_id
    return user_id is @self_user().id and client_id is @current_client().id


  ###############################################################################
  # Conversation Events
  ###############################################################################

  ###
  A client was added by the self user.
  @param event_json [Object] JSON data of 'user.client-add' event
  ###
  map_self_client: (event_json) =>
    @logger.info 'Client of self user added', event_json
    client_et = @client_mapper.map_client event_json.client
    amplify.publish z.event.WebApp.CLIENT.ADD, @self_user().id, client_et

  ###
  A client was removed by the self user.
  @param event_json [Object] JSON data of 'user.client-remove' event
  ###
  on_client_remove: (event_json) =>
    client_id = event_json?.client.id
    return if not client_id

    if client_id is @current_client().id
      return @cryptography_repository.storage_repository.delete_cryptography()
      .then =>
        amplify.publish z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReason.CLIENT_REMOVED, @current_client().is_temporary()
    amplify.publish z.event.WebApp.CLIENT.REMOVE, @self_user().id, client_id
