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
z.user ?= {}

# User repository for all user and connection interactions with the user service.
class z.user.UserRepository
  ###
  Construct a new User repository.

  @param user_service [z.user.UserService] Backend REST API user service implementation
  @param asset_service [z.assets.AssetService] Backend REST API asset service implementation
  @param search_service [z.search.SearchService] Backend REST API search service implementation
  @param client_repository [z.client.ClientRepository] Repository for all client interactions
  @param cryptography_repository [z.cryptography.CryptographyRepository] Repository for all cryptography interactions
  ###
  constructor: (@user_service, @asset_service, @search_service, @client_repository, @cryptography_repository) ->
    @logger = new z.util.Logger 'z.user.UserRepository', z.config.LOGGER.OPTIONS

    @connection_mapper = new z.user.UserConnectionMapper()
    @user_mapper = new z.user.UserMapper @asset_service

    @self = ko.observable()
    @users = ko.observableArray []
    @connections = ko.observableArray []
    @properties = new z.user.UserProperties()

    @connect_requests = ko.pureComputed =>
      user_ets = []
      for user_et in @users()
        user_ets.push user_et if user_et.connection().status() is z.user.ConnectionStatus.PENDING
      return user_ets
    .extend rateLimit: 50

    amplify.subscribe z.event.Backend.USER.CONNECTION, @user_connection
    amplify.subscribe z.event.Backend.USER.UPDATE, @user_update
    amplify.subscribe z.event.WebApp.CLIENT.ADD, @add_client_to_user
    amplify.subscribe z.event.WebApp.CLIENT.REMOVE, @remove_client_from_user
    amplify.subscribe z.event.WebApp.PROPERTIES.CHANGE.DEBUG, @save_property_enable_debugging
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @properties_updated


  ###############################################################################
  # Connections
  ###############################################################################

  ###
  Accept a connection request.

  @param user_et [z.entity.User] User to update connection with
  @param show_conversation [Boolean] Show new conversation on success
  @return [Promise] Promise that resolves when the connection request was accepted
  ###
  accept_connection_request: (user_et, show_conversation = false) =>
    @_update_connection_status user_et, z.user.ConnectionStatus.ACCEPTED, show_conversation
    .then ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.CONNECT_REQUEST_ACCEPTED

  ###
  Block a user.
  @param user_et [z.entity.User] User to block
  @return [Promise] Promise that resolves when the user was blocked
  ###
  block_user: (user_et) =>
    @_update_connection_status user_et, z.user.ConnectionStatus.BLOCKED

  ###
  Cancel a connection request.
  @param user_et [z.entity.User] User to cancel the sent connection request
  @param next_conversation_et [z.entity.Conversation] Optional conversation to be switched to
  @return [Promise] Promise that resolves when an outgoing connection request was cancelled
  ###
  cancel_connection_request: (user_et, next_conversation_et) =>
    @_update_connection_status user_et, z.user.ConnectionStatus.CANCELLED
    .then ->
      amplify.publish z.event.WebApp.CONVERSATION.SHOW, next_conversation_et if next_conversation_et

  ###
  Create a connection request.

  @param user_et [z.entity.User] User to connect to
  @param message [String] Connection message
  @param show_conversation [Boolean] Should we open the new conversation
  @return [Promise] Promise that resolves when the connection request was successfully created
  ###
  create_connection: (user_et, show_conversation = false) =>
    return Promise.resolve()
    .then =>
      connect_message = z.localization.Localizer.get_text
        id: z.string.connection_request_message
        replace: [
          {placeholder: '%@.first_name', content: user_et.name()}
          {placeholder: '%s.first_name', content: @self().name()}
        ]

      @user_service.create_connection user_et.id, user_et.name(), connect_message
    .then (response) =>
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.CONNECT_REQUEST_SENT
      @user_connection response, show_conversation
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to send connection request to user '#{user_et.id}': #{error.message}", error

  ###
  Get a connection for a user ID.
  @param user_id [String] User ID
  @return [z.entity.Connection] User connection entity
  ###
  get_connection_by_user_id: (user_id) ->
    for connection_et in @connections()
      return connection_et if connection_et.to is user_id

  ###
  Get a connection for a conversation ID.
  @param conversation_id [String] Conversation ID
  @return [z.entity.Connection] User connection entity
  ###
  get_connection_by_conversation_id: (conversation_id) ->
    for connection_et in @connections()
      return connection_et if connection_et.conversation_id is conversation_id

  ###
  Get all user connections from backend and store users of that connection.

  @note Initially called by Wire for Web's app start to retrieve user entities and their connections.

  @param limit [Integer] Query limit for user connections
  @param user_id [String] User ID of the latest connection
  @param connection_ets [Array<z.entity.Connection] Unordered array of user connections
  @return [Promise] Promise that resolves when all connections have been retrieved and mapped
  ###
  get_connections: (limit = 500, user_id, connection_ets = []) =>
    return new Promise (resolve, reject) =>
      @user_service.get_own_connections limit, user_id
      .then (response) =>
        if response.connections.length > 0
          new_connection_ets = @connection_mapper.map_user_connections_from_json response.connections
          connection_ets = connection_ets.concat new_connection_ets

        if response.has_more
          last_connection_et = connection_ets[connection_ets.length - 1]
          @get_connections limit, last_connection_et.to, connection_ets
          .then => resolve @connections()
        else if connection_ets.length > 0
          @update_user_connections connection_ets
          .then => resolve @connections()
        else
          resolve @connections()
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Failed to retrieve connections from backend: #{error.message}", error
        reject error

  ###
  Ignore connection request.
  @param user_et [z.entity.User] User to ignore the connection request
  @return [Promise] Promise that resolves when an incoming connection request was ignored
  ###
  ignore_connection_request: (user_et) =>
    @_update_connection_status user_et, z.user.ConnectionStatus.IGNORED

  ###
  Unblock a user.

  @param user_et [z.entity.User] User to unblock
  @param show_conversation [Boolean] Show new conversation on success
  @return [Promise] Promise that resolves when a user was unblocked
  ###
  unblock_user: (user_et, show_conversation = true) =>
    @_update_connection_status user_et, z.user.ConnectionStatus.ACCEPTED, show_conversation

  ###
  Update the user connections and get the matching users.
  @param connection_ets [Array<z.entity.Connection>] Connection entities
  @return [Promise] Promise that resolves when all user connections have been updated
  ###
  update_user_connections: (connection_ets) =>
    return new Promise (resolve) =>
      z.util.ko_array_push_all @connections, connection_ets

      # Apply connection to other user entities (which are not us)
      user_ids = (connection_et.to for connection_et in connection_ets)

      if user_ids.length > 0
        @get_users_by_id user_ids, (user_ets) =>
          @_assign_connection user_et for user_et in user_ets
          @_assign_all_clients()
          .then -> resolve()

  # Assign all locally stored clients to the users.
  _assign_all_clients: =>
    @client_repository.get_all_clients_from_db()
    .then (user_client_map) =>
      @logger.log "Found locally stored clients for '#{Object.keys(user_client_map).length}' users", user_client_map
      user_ids = (user_id for user_id, client_ets of user_client_map)
      @get_users_by_id user_ids, (user_ets) =>
        for user_et in user_ets
          @logger.log "Found '#{user_client_map[user_et.id].length}' clients for '#{user_et.name()}'", user_client_map[user_et.id]
          user_et.devices user_client_map[user_et.id]

  # Assign connections to the users.
  _assign_connection: (user_et) =>
    connection_et = @get_connection_by_user_id user_et.id
    user_et.connection connection_et if connection_et

  ###
  Update the status of a connection.

  @private
  @param user_et [z.entity.User] User to update connection with
  @param status [String] Connection status
  @param show_conversation [Boolean] Show conversation on success
  @return [Promise] Promise that resolves when the connection status was updated
  ###
  _update_connection_status: (user_et, status, show_conversation = false) =>
    return Promise.resolve()
    .then =>
      return if user_et.connection().status() is status
      return @user_service.update_connection_status user_et.id, status
    .then (response) =>
      @user_connection response, show_conversation
    .catch (error) =>
      @logger.log @logger.levels.ERROR,
        "Connection status change to '#{status}' for user '#{user_et.id}' failed: #{error.message}", error
      custom_data =
        current_status: user_et.connection().status()
        failed_action: status
        server_error: error
      Raygun.send new Error('Connection status change failed'), custom_data

  ###############################################################################
  # Events
  ###############################################################################

  ###
  Convert a JSON event into an entity and get the matching conversation.
  @param event_json [Object] JSON data of 'user.connection' event
  @param show_conversation [Boolean] Should the new conversation be opened?
  ###
  user_connection: (event_json, show_conversation) =>
    return if not event_json?
    event_json = event_json.connection or event_json

    connection_et = @get_connection_by_user_id event_json.to
    previous_status = null

    if connection_et?
      previous_status = connection_et.status()
      @connection_mapper.update_user_connection_from_json connection_et, event_json
    else
      connection_et = @connection_mapper.map_user_connection_from_json event_json
      @update_user_connections [connection_et]

    if connection_et
      if previous_status is z.user.ConnectionStatus.SENT and connection_et.status() is z.user.ConnectionStatus.ACCEPTED
        @update_user_by_id connection_et.to
      @_send_user_connection_notification connection_et, previous_status
      amplify.publish z.event.WebApp.CONVERSATION.MAP_CONNECTION, [connection_et], show_conversation

  ###
  Use a JSON event to update the matching user.
  @param event_json [Object] JSON data
  ###
  user_update: (event_json) =>
    if event_json.user.id is @self().id
      @user_mapper.update_user_from_object @self(), event_json.user
    else
      @get_user_by_id event_json.user.id, (user_et) =>
        @user_mapper.update_user_from_object user_et, event_json.user if user_et?

  ###
  Send the user connection notification.
  @param connection_et [z.entity.Connection] Connection entity
  @param previous_status [z.user.ConnectionStatus] Previous connection status
  ###
  _send_user_connection_notification: (connection_et, previous_status) =>
    # We accepted the connection request or unblocked the user
    no_notification = [z.user.ConnectionStatus.BLOCKED, z.user.ConnectionStatus.PENDING]
    return if previous_status in no_notification and connection_et.status() is z.user.ConnectionStatus.ACCEPTED

    @get_user_by_id connection_et.to, (user_et) ->
      message_et = new z.entity.MemberMessage()
      message_et.user user_et
      switch connection_et.status()
        when z.user.ConnectionStatus.PENDING
          message_et.member_message_type = z.message.SystemMessageType.CONNECTION_REQUEST
        when z.user.ConnectionStatus.ACCEPTED
          message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, connection_et, message_et


  ###############################################################################
  # Clients
  ###############################################################################

  ###
  Adds a new client to the database and the user.

  @param user_id [String] ID of user
  @param client_id [String] ID of client to be deleted
  @return [Promise] Promise that resolves when a client and its session have been deleted
  ###
  add_client_to_user: (user_id, client_et) =>
    @client_repository.save_client_in_db user_id, client_et.to_json()
    .then =>
      @find_user user_id
    .then (user_et) ->
      user_et.add_client client_et

  ###
  Removes a stored client and the session connected with it.

  @param user_id [String] ID of user
  @param client_id [String] ID of client to be deleted
  @return [Promise] Promise that resolves when a client and its session have been deleted
  ###
  remove_client_from_user: (user_id, client_id) =>
    @client_repository.remove_client user_id, client_id
    .then =>
      @find_user user_id
    .then (user_et) ->
      user_et.remove_client client_id


  ###############################################################################
  # Users
  ###############################################################################

  ###
  Request account deletion.
  @return [Promise] Promise that resolves when account deletion process has been initiated
  ###
  delete_me: =>
    @user_service.delete_self()
    .then =>
      @logger.log @logger.levels.INFO, 'Account deletion initiated'
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Unable to delete self: #{error}"

  ###
  Get a user from the backend.
  @param user_id [String] User ID
  @param callback [Function] Function to be called on server return
  ###
  fetch_user_by_id: (user_id, callback) =>
    return callback?() if not user_id

    @fetch_users_by_id [user_id], (user_ets) ->
      callback? user_ets?[0]

  ###
  Get users from the backend.
  @param user_ids [Array<String>] User IDs
  @param callback [Function] Function to be called on server return
  ###
  fetch_users_by_id: (user_ids, callback) =>
    user_ids = user_ids?.filter (user_id) ->
      return user_id isnt undefined

    return callback? [] if not user_ids or user_ids.length is 0

    # create chunks
    fetched_user_ets = []
    chunks = z.util.array_chunks user_ids, z.config.MAXIMUM_USERS_PER_REQUEST
    number_of_loaded_chunks = 0

    for chunk in chunks
      @user_service.get_users chunk, (response, error) =>
        number_of_loaded_chunks += 1
        if response
          user_ets = @user_mapper.map_users_from_object response
          fetched_user_ets = fetched_user_ets.concat user_ets

        if number_of_loaded_chunks is chunks.length
          # If the difference is 1 then we most likely have a case with a suspended user
          if user_ids.length isnt fetched_user_ets.length
            fetched_user_ets = @_add_suspended_users user_ids, fetched_user_ets
          @save_users fetched_user_ets
          callback? fetched_user_ets

  ###
  Find a local user.
  @param user_id [String] User ID
  @return [z.entity.User] Matching user entity
  ###
  find_user: (user_id) ->
    return user_et for user_et in @users() when user_et.id is user_id

  ###
  Get self user from backend.
  @return [Promise] Promise that will resolve with the self user entity
  ###
  get_me: =>
    return new Promise (resolve, reject) =>
      @user_service.get_own_user()
      .then (response) =>
        user_et = @user_mapper.map_user_from_object response
        # TODO: This needs to be represented by a SelfUser class!
        # Only the "self / own" user has a tracking ID & locale
        user_et.tracking_id = response.tracking_id
        user_et.locale = response.locale
        @save_user user_et, true
        resolve user_et
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Unable to load self user: #{error}"
        reject error

  ###
  Check for user locally and fetch it from the server otherwise.
  @param user_id [String] User ID
  @param callback [Function] Function to be called on server return
  ###
  get_user_by_id: (user_id, callback) ->
    if user_id is undefined
      callback? null

    user_et = @find_user user_id
    if not user_et
      @fetch_user_by_id user_id, callback
    else
      callback? user_et

    return user_et

  ###
  Check for users locally and fetch them from the server otherwise.

  @param user_ids [Array<String>] User IDs
  @param callback [Function] Function to be called on server return
  @param offline [Boolean] Should we only look for cached contacts
  ###
  get_users_by_id: (user_ids = [], callback, offline = false) =>
    return callback? [] if user_ids.length is 0

    known_user_ets = []
    unknown_user_ids = []

    user_ids.forEach (user_id) =>
      user_et = @find_user user_id

      if user_et?
        known_user_ets.push user_et
      else
        unknown_user_ids.push user_id

    if unknown_user_ids.length is 0 or offline
      callback? known_user_ets
    else
      @fetch_users_by_id unknown_user_ids, (user_ets) ->
        callback? known_user_ets.concat user_ets

  ###
  Get user by name.
  @param name [String] Name to search user for
  @return [Array<z.entity.User>] Matching users
  ###
  get_user_by_name: (name) =>
    user_ets = []

    for user_et in @users()
      if user_et.connected() and (user_et.email() is name or z.util.compare_names user_et.name(), name)
        user_ets.push user_et

    return user_ets.sort z.util.sort_user_by_name

  ###
  Is the user the logged in user.
  @param user_id [z.entity.User or String] User entity or user ID
  @return [Boolean] Is the user the logged in user
  ###
  is_me: (user_id) ->
    user_id = user_id.id if not _.isString user_id
    return @self().id is user_id

  ###
  Save a user.
  @param user_et [z.entity.User] User entity to be stored
  @param is_me [Boolean] Is the user entity the self user
  ###
  save_user: (user_et, is_me = false) ->
    @users.push user_et if not @user_exists(user_et.id)

    if is_me
      user_et.is_me = true
      @self user_et

    return user_et

  ###
  Save multiple users at once.
  @param user_ets [Array<z.entity.User>] Array of user entities to be stored
  ###
  save_users: (user_ets) ->
    new_user_ets = (user_et for user_et in user_ets when not @user_exists user_et.id)
    z.util.ko_array_push_all @users, new_user_ets
    return new_user_ets

  ###
  Update a local user from the backend by ID.
  @param user_id [String] User ID
  ###
  update_user_by_id: (user_id) =>
    @get_user_by_id user_id, (old_user_et) =>
      @user_service.get_user_by_id user_id, (new_user_et) =>
        @user_mapper.update_user_from_object old_user_et, new_user_et

  ###
  Check if the user is already stored.
  @param user_id [String] User ID
  @return [Boolean] Is the user already stored
  ###
  user_exists: (user_id) ->
    user_et = @find_user user_id
    return !!user_et

  ###
  Add user entities for suspended users.

  @param user_ids [Array<String>] Requested user IDs
  @param user_ets [Array<z.entity.User>] User entities returned by backend
  @return [Array<z.entity.User>] User entities to be returned
  ###
  _add_suspended_users: (user_ids, user_ets) ->
    for user_id in user_ids
      if not (user_ets.find (element) -> return true if element.id is user_id)
        user_et = new z.entity.User(user_id)
        user_et.name z.localization.Localizer.get_text z.string.nonexistent_user
        user_ets.push user_et
    return user_ets


  ###############################################################################
  # Profile
  ###############################################################################

  ###
  Change the accent color.
  @param accent_id [Integer] New accent color
  ###
  change_accent_color: (accent_id) ->
    @user_service.update_own_user_profile({accent_id: accent_id}).then => @self().accent_id accent_id

  ###
  Change username.
  @param name [String] New user name
  ###
  change_username: (name) ->
    if name.length >= z.config.MINIMUM_USERNAME_LENGTH
      @user_service.update_own_user_profile({name: name}).then => @self().name name

  ###
  Change the profile image.
  @param picture [String, Object] New user picture
  @param on_success [Function] Function to be executed on success
  ###
  change_picture: (picture, on_success) ->
    @asset_service.upload_profile_image @self().id, picture
    .then (upload_response) =>
      @user_service.update_own_user_profile {picture: upload_response}
      .then =>
        @user_update {user: {id: @self().id, picture: upload_response}}
        on_success?()
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Error during profile image upload: #{error.message}", error


  ###############################################################################
  # Properties
  ###############################################################################

  ###
  Initialize properties on app startup.
  ###
  init_properties: =>
    return new Promise (resolve, reject) =>
      @user_service.get_user_properties()
      .then (response) =>
        if response.includes z.config.PROPERTIES_KEY
          @user_service.get_user_properties_by_key z.config.PROPERTIES_KEY
          .then (response) =>
            $.extend true, @properties, response
            @logger.log @logger.levels.INFO, 'Loaded user properties', @properties
        else
          @logger.log @logger.levels.INFO, 'User has no saved properties, using defaults'
      .then =>
        amplify.publish z.event.WebApp.PROPERTIES.UPDATED, @properties
        amplify.publish z.event.WebApp.ANALYTICS.INIT, @properties, @self()
        resolve @properties
      .catch (error) =>
        error = new Error "Failed to initialize user properties: #{error}"
        @logger.log @logger.levels.ERROR, error.message, error
        reject @properties

  properties_updated: (properties) ->
    if properties.enable_debugging
      amplify.publish z.util.Logger::LOG_ON_DEBUG, properties.enable_debugging
    return true

  ###
  Save the user properties.
  ###
  save_properties: (key, value) =>
    @user_service.change_user_properties_by_key z.config.PROPERTIES_KEY, @properties
    .then =>
      @logger.log @logger.levels.INFO, "Saved updated settings: '#{key}' - '#{value}'"
    .catch (error) =>
      @logger.log @logger.levels.ERROR, 'Saving updated settings failed', error

  ###
  Save timestamp for Google Contacts import.
  @param timestamp [String] Timestamp to be saved
  ###
  save_property_contact_import_google: (timestamp) =>
    @properties.contact_import.google = timestamp
    @save_properties 'contact_import.google', timestamp
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.GOOGLE, timestamp

  ###
  Save timestamp for OSX Contacts import.
  @param timestamp [String] Timestamp to be saved
  ###
  save_property_contact_import_osx: (timestamp) =>
    @properties.contact_import.osx = timestamp
    @save_properties 'contact_import.osx', timestamp
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.OSX_CONTACTS, timestamp

  ###
  Save data settings.
  @param is_enabled [String] Data setting to be saved
  ###
  save_property_data_settings: (is_enabled) =>
    return if @properties.settings.privacy.report_errors is is_enabled
    @properties.settings.privacy.report_errors = is_enabled
    @properties.settings.privacy.improve_wire = is_enabled
    @save_properties 'settings.privacy', is_enabled
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.SEND_DATA, is_enabled

  ###
  Save debug logging setting.
  @param is_enabled [Boolean] Should debug logging be enabled despite domain
  ###
  save_property_enable_debugging: (is_enabled) =>
    return if @properties.enable_debugging is is_enabled
    @properties.enable_debugging = is_enabled
    @save_properties 'enable_debugging', is_enabled
    .then -> amplify.publish z.util.Logger::LOG_ON_DEBUG, is_enabled

  ###
  Save timestamp for Google Contacts import.
  ###
  save_property_has_created_conversation: =>
    @properties.has_created_conversation = true
    @save_properties 'has_created_conversation', @properties.has_created_conversation
    .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION

  ###
  Save audio settings.
  @param sound_alerts [String] Audio setting to be saved
  ###
  save_property_sound_alerts: (sound_alerts) =>
    if @properties.settings.sound.alerts isnt sound_alerts
      @properties.settings.sound.alerts = sound_alerts
      @save_properties 'settings.sound.alerts', @properties.settings.sound.alerts
      .then -> amplify.publish z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, sound_alerts


  ###############################################################################
  # Tracking helpers
  ###############################################################################

  ###
  Count of connections.
  @return [Integer] Number of connections
  ###
  get_number_of_connections: ->
    amount =
      incoming: 0
      outgoing: 0

    for connection_et in @connections()
      if connection_et.status() is z.user.ConnectionStatus.PENDING
        amount.incoming += 1
      else if connection_et.status() is z.user.ConnectionStatus.SENT
        amount.outgoing += 1

    return amount
