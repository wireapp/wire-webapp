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
    @should_set_username = false

    @self = ko.observable()
    @users = ko.observableArray []
    @connections = ko.observableArray []

    @connect_requests = ko.pureComputed =>
      return (user_et for user_et in @users() when user_et.connection().status() is z.user.ConnectionStatus.PENDING)
    .extend rateLimit: 50

    @connected_users = ko.pureComputed =>
      return (user_et for user_et in @users() when user_et.connection().status() is z.user.ConnectionStatus.ACCEPTED)
    .extend rateLimit: 1000

    @connected_users.subscribe (user_ets) ->
      amplify.publish z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION, z.tracking.CustomDimension.CONTACTS, user_ets.length

    amplify.subscribe z.event.Backend.USER.CONNECTION, @user_connection
    amplify.subscribe z.event.Backend.USER.UPDATE, @user_update
    amplify.subscribe z.event.WebApp.CLIENT.ADD, @add_client_to_user
    amplify.subscribe z.event.WebApp.CLIENT.REMOVE, @remove_client_from_user
    amplify.subscribe z.event.WebApp.CLIENT.UPDATE, @update_clients_from_user


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
    @user_service.create_connection user_et.id, user_et.name()
    .then (response) =>
      @user_connection response, show_conversation
    .catch (error) =>
      @logger.error "Failed to send connection request to user '#{user_et.id}': #{error.message}", error

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
    @user_service.get_own_connections limit, user_id
    .then (response) =>
      if response.connections.length
        new_connection_ets = @connection_mapper.map_user_connections_from_json response.connections
        connection_ets = connection_ets.concat new_connection_ets

      if response.has_more
        last_connection_et = connection_ets[connection_ets.length - 1]
        return @get_connections limit, last_connection_et.to, connection_ets

      if connection_ets.length
        return @update_user_connections connection_ets, true
        .then => return @connections()

      return @connections()
    .catch (error) =>
      @logger.error "Failed to retrieve connections from backend: #{error.message}", error
      throw error

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
  @param assign_clients [Boolean] Retrieve locally known clients from database
  @return [Promise] Promise that resolves when all user connections have been updated
  ###
  update_user_connections: (connection_ets, assign_clients = false) =>
    return new Promise (resolve) =>
      z.util.ko_array_push_all @connections, connection_ets

      # Apply connection to other user entities (which are not us)
      user_ids = (connection_et.to for connection_et in connection_ets)

      if user_ids.length
        @get_users_by_id user_ids
        .then (user_ets) =>
          @_assign_connection user_et for user_et in user_ets
          if assign_clients
            @_assign_all_clients()
            .then -> resolve()

  # Assign all locally stored clients to the users.
  _assign_all_clients: =>
    @client_repository.get_all_clients_from_db()
    .then (user_client_map) =>
      @logger.info "Found locally stored clients for '#{Object.keys(user_client_map).length}' users", user_client_map
      @get_users_by_id (user_id for user_id, client_ets of user_client_map)
      .then (user_ets) =>
        for user_et in user_ets
          if user_client_map[user_et.id].length > 8
            @logger.warn "Found '#{user_client_map[user_et.id].length}' clients for '#{user_et.name()}'", user_client_map[user_et.id]
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
      @logger.error "Connection status change to '#{status}' for user '#{user_et.id}' failed: #{error.message}", error
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
      amplify.publish z.event.WebApp.CONVERSATION.MAP_CONNECTION, connection_et, show_conversation

  ###
  Use a JSON event to update the matching user.
  @param event_json [Object] JSON data
  ###
  user_update: (event_json) =>
    if event_json.user.id is @self().id
      @user_mapper.update_user_from_object @self(), event_json.user
    else
      @get_user_by_id event_json.user.id
      .then (user_et) =>
        @user_mapper.update_user_from_object user_et, event_json.user

  ###
  Send the user connection notification.
  @param connection_et [z.entity.Connection] Connection entity
  @param previous_status [z.user.ConnectionStatus] Previous connection status
  ###
  _send_user_connection_notification: (connection_et, previous_status) =>
    # We accepted the connection request or unblocked the user
    no_notification = [z.user.ConnectionStatus.BLOCKED, z.user.ConnectionStatus.PENDING]
    return if previous_status in no_notification and connection_et.status() is z.user.ConnectionStatus.ACCEPTED

    @get_user_by_id connection_et.to
    .then (user_et) ->
      message_et = new z.entity.MemberMessage()
      message_et.user user_et
      switch connection_et.status()
        when z.user.ConnectionStatus.PENDING
          message_et.member_message_type = z.message.SystemMessageType.CONNECTION_REQUEST
        when z.user.ConnectionStatus.ACCEPTED
          if previous_status is z.user.ConnectionStatus.SENT
            message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED
          else
            message_et.member_message_type = z.message.SystemMessageType.CONNECTION_CONNECTED
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, connection_et, message_et


  ###############################################################################
  # Clients
  ###############################################################################

  ###
  Saves a new client for the first time to the database and adds it to a user's entity.

  @param user_id [String] ID of user
  @param client_id [String] ID of client to be deleted
  @return [Promise] Promise that resolves when a client and its session have been deleted
  ###
  add_client_to_user: (user_id, client_et) =>
    @get_user_by_id user_id
    .then (user_et) =>
      return unless user_et.add_client client_et
      @client_repository.save_client_in_db user_id, client_et.to_json()
      .then ->
        amplify.publish z.event.WebApp.USER.CLIENT_ADDED, user_id, client_et
        amplify.publish z.event.WebApp.CLIENT.ADD_OWN_CLIENT, user_id, client_et if user_et.is_me

  ###
  Removes a stored client and the session connected with it.

  @param user_id [String] ID of user
  @param client_id [String] ID of client to be deleted
  @return [Promise] Promise that resolves when a client and its session have been deleted
  ###
  remove_client_from_user: (user_id, client_id) =>
    @client_repository.remove_client user_id, client_id
    .then =>
      return @get_user_by_id user_id
    .then (user_et) ->
      user_et.remove_client client_id
      amplify.publish z.event.WebApp.USER.CLIENT_REMOVED, user_id, client_id

  ###
  Update clients for given user.

  @param user_id [String] ID of user
  @param client_ets [Array<z.client.Client>]
  ###
  update_clients_from_user: (user_id, client_ets) =>
    @get_user_by_id user_id
    .then (user_et) ->
      user_et.devices client_ets
      amplify.publish z.event.WebApp.USER.CLIENTS_UPDATED, user_id, client_ets

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
      @logger.info 'Account deletion initiated'
    .catch (error) =>
      @logger.error "Unable to delete self: #{error}"

  ###
  Get a user from the backend.
  @param user_id [String] User ID
  @return [Promise<z.entity.User>] Promise that resolves with the user entity
  ###
  fetch_user_by_id: (user_id) =>
    @fetch_users_by_id [user_id]
    .then (user_ets) ->
      return user_ets?[0]

  ###
  Get users from the backend.
  @param user_ids [Array<String>] User IDs
  @return [Promise<Array<z.entity.User>>] Promise that resolves with an array of user entities
  ###
  fetch_users_by_id: (user_ids = []) =>
    user_ids = user_ids.filter (user_id) -> user_id?
    return Promise.resolve [] if not user_ids.length

    _get_users = (user_id_chunk) =>
      @user_service.get_users user_id_chunk
      .then (response) =>
        if response
          return @user_mapper.map_users_from_object response
        return []
      .catch (error) ->
        if error.code is z.service.BackendClientError.STATUS_CODE.NOT_FOUND
          return []
        throw error


    Promise.all (_get_users user_id_chunk for user_id_chunk in z.util.ArrayUtil.chunk user_ids, z.config.MAXIMUM_USERS_PER_REQUEST)
    .then (resolve_array) =>
      fetched_user_ets = _.flatten resolve_array

      # If the difference is 1 then we most likely have a case with a suspended user
      if user_ids.length isnt fetched_user_ets.length
        fetched_user_ets = @_add_suspended_users user_ids, fetched_user_ets

      return @save_users fetched_user_ets
      .then ->
        return fetched_user_ets

  ###
  Find a local user.
  @param user_id [String] User ID
  @return [Promise<z.entity.User>] Resolves with the matching user entity
  ###
  find_user_by_id: (user_id) ->
    return Promise.resolve user_et for user_et in @users() when user_et.id is user_id
    return Promise.reject new z.user.UserError z.user.UserError::TYPE.USER_NOT_FOUND

  ###
  Get self user from backend.
  @return [Promise] Promise that will resolve with the self user entity
  ###
  get_me: =>
    @user_service.get_own_user()
    .then (response) =>
      user_et = @user_mapper.map_self_user_from_object response
      return @save_user user_et, true
    .catch (error) =>
      @logger.error "Unable to load self user: #{error}"
      throw error

  ###
  Check for user locally and fetch it from the server otherwise.
  @param user_id [String] User ID
  @return [Promise<z.entity.User>] Promise that resolves with the matching user entity
  ###
  get_user_by_id: (user_id) ->
    @find_user_by_id user_id
    .catch (error) =>
      if error.type is z.user.UserError::TYPE.USER_NOT_FOUND
        return @fetch_user_by_id user_id
      throw error
    .catch (error) =>
      unless error.type is z.user.UserError::TYPE.USER_NOT_FOUND
        @logger.log @logger.levels.ERROR, "Failed to get user '#{user_id}': #{error.message}", error
      throw error

  ###
  Check for users locally and fetch them from the server otherwise.

  @param user_ids [Array<String>] User IDs
  @param offline [Boolean] Should we only look for cached contacts
  @return [Promise<Array<z.entity.User>>] Resolves with an array of users
  ###
  get_users_by_id: (user_ids = [], offline = false) =>
    return Promise.resolve [] unless user_ids.length

    _find_user = (user_id) =>
      @find_user_by_id user_id
      .catch (error) ->
        throw error unless error.type is z.user.UserError::TYPE.USER_NOT_FOUND
        return user_id

    Promise.all (_find_user user_id for user_id in user_ids)
    .then (resolve_array) =>
      known_user_ets = resolve_array.filter (array_item) -> array_item instanceof z.entity.User
      unknown_user_ids = resolve_array.filter (array_item) -> _.isString array_item

      if offline or not unknown_user_ids.length
        return known_user_ets
      return @fetch_users_by_id unknown_user_ids
      .then (user_ets) ->
        return known_user_ets.concat user_ets

  ###
  Search for user.
  @param query [String] Find user using name or username
  @param is_username [Boolean] Query string is username
  @return [Array<z.entity.User>] Matching users
  ###
  search_for_connected_users: (query, is_username) =>
    return @users()
      .filter (user_et) ->
        return false if not user_et.connected()
        return user_et.matches query, is_username
      .sort (user_a, user_b) ->
        if is_username
          return z.util.StringUtil.sort_by_priority user_a.username(), user_b.username(), query
        return z.util.StringUtil.sort_by_priority user_a.name(), user_b.name(), query

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
    @find_user_by_id user_et.id
    .catch (error) =>
      throw error unless error.type is z.user.UserError::TYPE.USER_NOT_FOUND

      if is_me
        user_et.is_me = true
        @self user_et
      @users.push user_et
      return user_et

  ###
  Save multiple users at once.
  @param user_ets [Array<z.entity.User>] Array of user entities to be stored
  ###
  save_users: (user_ets) ->
    _user_exists = (user_et) =>
      @find_user_by_id user_et.id
      .then -> return undefined
      .catch (error) ->
        throw error unless error.type is z.user.UserError::TYPE.USER_NOT_FOUND
        return user_et

    Promise.all (_user_exists user_et for user_et in user_ets)
    .then (user_ets) =>
      new_user_ets = user_ets.filter (user_et) -> user_et?
      z.util.ko_array_push_all @users, new_user_ets
      return new_user_ets

  ###
  Update a local user from the backend by ID.
  @param user_id [String] User ID
  ###
  update_user_by_id: (user_id) =>
    @find_user_by_id user_id
    .catch (error) ->
      throw error unless error.type is z.user.UserError::TYPE.USER_NOT_FOUND
      return new z.entity.User()
    .then (old_user_et) =>
      return @user_service.get_user_by_id user_id
      .then (new_user_et) =>
        @user_mapper.update_user_from_object old_user_et, new_user_et

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
  Change name.
  @param name [String] New name
  ###
  change_name: (name) ->
    if name.length >= z.config.MINIMUM_USERNAME_LENGTH
      @user_service.update_own_user_profile({name: name}).then => @self().name name

  ###
  Whether the user needs to set a username.
  ###
  should_change_username: ->
    return @should_set_username

  ###
  Tries to generate a username suggestion
  ###
  get_username_suggestion: ->
    suggestions = null

    Promise.resolve().then =>
      suggestions = z.user.UserHandleGenerator.create_suggestions @self().name()
      @verify_usernames suggestions
    .then (valid_suggestions) =>
      @should_set_username = true
      @self().username valid_suggestions[0]

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.GENERATED_USERNAME,
        outcome: 'success'
        num_of_attempts: 1
    .catch (error) =>
      if error.code is z.service.BackendClientError.STATUS_CODE.NOT_FOUND
        @should_set_username = false

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.GENERATED_USERNAME,
        outcome: 'fail'
        num_of_attempts: 1

      throw error

  ###
  Change username.
  @param name [String] New username
  ###
  change_username: (username) ->
    @user_service.change_own_username username
    .then =>
      @should_set_username = false
      @self().username username
    .catch (error) ->
      if error.code in [z.service.BackendClientError.STATUS_CODE.CONFLICT, z.service.BackendClientError.STATUS_CODE.BAD_REQUEST]
        throw new z.user.UserError z.user.UserError::TYPE.USERNAME_TAKEN
      throw new z.user.UserError z.user.UserError::TYPE.REQUEST_FAILURE

  ###
  Verify usernames against the backend.
  Return a list with usernames that are not taken.
  @param username [Array] New user name
  ###
  verify_usernames: (usernames) ->
    @user_service.check_usernames usernames

  ###
  Verify that username is unique.
  Returns the username if it is not taken.
  @param username [String] New user name
  ###
  verify_username: (username) ->
    return @user_service.check_username username
    .catch (error) ->
      if error.code is z.service.BackendClientError.STATUS_CODE.NOT_FOUND
        return username
      if error.code is z.service.BackendClientError.STATUS_CODE.BAD_REQUEST
        throw new z.user.UserError z.user.UserError::TYPE.USERNAME_TAKEN
      throw new z.user.UserError z.user.UserError::TYPE.REQUEST_FAILURE
    .then (username) ->
      if username
        return username
      throw new z.user.UserError z.user.UserError::TYPE.USERNAME_TAKEN

  ###
  Change the profile image.
  @param picture [String, Object] New user picture
  ###
  change_picture: (picture) ->
    @_set_picture_v2 picture, false
    @_set_picture_v3 picture

  ###
  Set the profile image using v2 api.
  @deprecated
  @param picture [String, Object] New user picture
  @param update [Boolean] update user entity
  ###
  _set_picture_v2: (picture, update = true) ->
    @asset_service.upload_profile_image @self().id, picture
    .then (upload_response) =>
      @user_service.update_own_user_profile {picture: upload_response}
      .then =>
        @user_update {user: {id: @self().id, picture: upload_response}} if update
    .catch (error) =>
      @logger.warn "Error during profile image upload: #{error.message}"

  ###
  Set the profile image using v3 api.
  @deprecated
  @param picture [String, Object] New user picture
  ###
  _set_picture_v3: (picture) ->
    @asset_service.upload_profile_image_v3 picture
    .then ([small_key, medium_key]) =>
      assets = [
        {key: small_key, type: 'image', size: 'preview'},
        {key: medium_key, type: 'image', size: 'complete'}
      ]
      @user_service.update_own_user_profile assets: assets
      .then =>
        @user_update {user: {id: @self().id, assets: assets}}
    .catch (error) ->
      throw new Error "Error during profile image upload: #{error.message}"

  ###
  Set users default profile image.
  ###
  set_default_picture: ->
    z.util.load_url_blob z.config.UNSPLASH_URL
    .then (blob) =>
      @change_picture blob
    .then ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.ADDED_PHOTO,
        source: 'unsplash'
        outcome: 'success'
