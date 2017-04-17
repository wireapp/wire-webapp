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
z.conversation ?= {}


# Conversation repository for all conversation interactions with the conversation service
class z.conversation.ConversationRepository
  ###
  Construct a new Conversation Repository.

  @param conversation_service [z.conversation.ConversationService] Backend REST API conversation service implementation
  @param asset_service [z.assets.AssetService] Backend REST API asset service implementation
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  @param giphy_repository [z.extension.GiphyRepository] Repository for Giphy GIFs
  @param cryptography_repository [z.cryptography.CryptographyRepository] Repository for all cryptography interactions
  @param link_repository [z.links.LinkPreviewRepository] Repository for link previews
  ###
  constructor: (@conversation_service, @asset_service, @user_repository, @giphy_repository, @cryptography_repository, @link_repository) ->
    @logger = new z.util.Logger 'z.conversation.ConversationRepository', z.config.LOGGER.OPTIONS

    @conversation_mapper = new z.conversation.ConversationMapper()
    @event_mapper = new z.conversation.EventMapper @asset_service, @user_repository
    @verification_state_handler = new z.conversation.ConversationVerificationStateHandler @

    @active_conversation = ko.observable()
    @conversations = ko.observableArray []

    @block_event_handling = true
    @fetching_conversations = {}
    @should_initialize_participants = true
    @use_v3_api = false

    @self_conversation = ko.pureComputed =>
      return @_find_conversation_by_id @user_repository.self().id if @user_repository.self()

    @filtered_conversations = ko.pureComputed =>
      @conversations().filter (conversation_et) ->
        states_to_filter = [
          z.user.ConnectionStatus.BLOCKED
          z.user.ConnectionStatus.CANCELLED
          z.user.ConnectionStatus.PENDING
        ]
        return false if conversation_et.connection().status() in states_to_filter
        return false if conversation_et.is_self()
        return false if conversation_et.is_cleared() and conversation_et.removed_from_conversation()
        return true

    @sorted_conversations = ko.pureComputed =>
      @filtered_conversations().sort z.util.sort_groups_by_last_event

    @receiving_queue = new z.util.PromiseQueue()
    @sending_queue = new z.util.PromiseQueue()
    @sending_queue.pause()

    # @note Only use the client request queue as to unblock if not blocked by event handling or the cryptographic order of messages will be ruined and sessions might be deleted
    @conversation_service.client.request_queue_blocked_state.subscribe (state) =>
      request_queue_blocked = state isnt z.service.RequestQueueBlockedState.NONE
      @sending_queue.pause request_queue_blocked or @block_event_handling

    @conversations_archived = ko.observableArray []
    @conversations_call = ko.observableArray []
    @conversations_cleared = ko.observableArray []
    @conversations_unarchived = ko.observableArray []

    @_init_subscriptions()

  _init_state_updates: ->
    ko.computed =>
      archived = []
      calls = []
      cleared = []
      unarchived = []

      for conversation_et in @sorted_conversations()
        if conversation_et.has_active_call()
          calls.push conversation_et
        else if conversation_et.is_cleared()
          cleared.push conversation_et
        else if conversation_et.is_archived()
          archived.push conversation_et
        else
          unarchived.push conversation_et

      @conversations_archived archived
      @conversations_call calls
      @conversations_cleared cleared
      @conversations_unarchived unarchived

  _init_subscriptions: ->
    amplify.subscribe z.event.WebApp.CONVERSATION.ASSET.CANCEL, @cancel_asset_upload
    amplify.subscribe z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, @push_to_receiving_queue
    amplify.subscribe z.event.WebApp.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, @timeout_ephemeral_message
    amplify.subscribe z.event.WebApp.CONVERSATION.MAP_CONNECTION, @map_connection
    amplify.subscribe z.event.WebApp.CONVERSATION.MISSED_EVENTS, @on_missed_events
    amplify.subscribe z.event.WebApp.CONVERSATION.PERSIST_STATE, @save_conversation_state_in_db
    amplify.subscribe z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, @set_notification_handling_state
    amplify.subscribe z.event.WebApp.USER.UNBLOCKED, @unblocked_user

  ###############################################################################
  # Conversation service interactions
  ###############################################################################

  ###
  Create a new conversation.
  @note Supply at least 2 user IDs! Do not include the requestor

  @param user_ids [Array<String>] IDs of users (excluding the requestor) to be part of the conversation
  @param name [String] User defined name for the Conversation (optional)
  ###
  create_new_conversation: (user_ids, name) =>
    @conversation_service.create_conversation user_ids, name
    .then (response) =>
      @_on_create conversation: response.id, data: response

  ###
  Get a conversation from the backend.
  @param conversation_et [z.entity.Conversation] Conversation to be retrieved from the backend
  ###
  fetch_conversation_by_id: (conversation_id) =>
    for id, promises of @fetching_conversations when id is conversation_id
      return new Promise (resolve) -> promises.push resolve

    @fetching_conversations[conversation_id] = []

    @conversation_service.get_conversation_by_id conversation_id
    .then (response) =>
      conversation_et = @conversation_mapper.map_conversation response
      @save_conversation conversation_et
      @logger.info "Fetched conversation '#{conversation_id}' from backend"
      for promise in @fetching_conversations[conversation_id]
        promise conversation_et
      delete @fetching_conversations[conversation_id]
      return conversation_et
    .catch (error) =>
      @logger.error "Failed to fetch conversation '#{conversation_id}' from backend: #{error.message}", error
      throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.NOT_FOUND

  get_conversations: =>
    @conversation_service.load_conversation_states_from_db()
    .then (local_conversations) =>
      return @conversation_service.get_all_conversations()
      .catch (error) =>
        @logger.error "Failed to get all conversations from backend: #{error.message}"
      .then (remote_conversations = []) =>
        if remote_conversations.length > 0
          return Promise.resolve @conversation_mapper.merge_conversations local_conversations, remote_conversations
          .then (merged_conversations) => @conversation_service.save_conversations_in_db merged_conversations
        else
          return local_conversations
    .then (conversations) =>
      @save_conversations @conversation_mapper.map_conversations conversations
      amplify.publish z.event.WebApp.CONVERSATION.LOADED_STATES
      return @conversations()

  ###
  Get Message with given ID from the database.
  @param conversation_et [z.entity.Conversation]
  @param message_id [String]
  @return [Promise] z.entity.Message
  ###
  get_message_in_conversation_by_id: (conversation_et, message_id) =>
    message_et = conversation_et.get_message_by_id message_id
    return Promise.resolve message_et if message_et

    return @conversation_service.load_event_from_db conversation_et.id, message_id
    .then (event) =>
      if event
        return @event_mapper.map_json_event event, conversation_et
      throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND

  ###
  Get preceding messages starting with the given message
  @param conversation_et [z.entity.Conversation]
  @return [Promise]
  ###
  get_preceding_messages: (conversation_et) ->
    conversation_et.is_pending true

    first_message = conversation_et.get_first_message()
    upper_bound = if first_message then new Date first_message.timestamp() else new Date()

    @conversation_service.load_preceding_events_from_db conversation_et.id, new Date(0), upper_bound, z.config.MESSAGES_FETCH_LIMIT
    .then (events) =>
      if events.length < z.config.MESSAGES_FETCH_LIMIT
        conversation_et.has_further_messages false
      return @_add_events_to_conversation events, conversation_et
    .then (mapped_messages) ->
      conversation_et.is_pending false
      return mapped_messages

  ###
  Get specified message and load number preceding and subsequent messages defined by padding.
  @param conversation_et [z.entity.Conversation]
  @param message_et [z.entity.Message]
  @return [Promise]
  ###
  get_messages_with_offset: (conversation_et, message_et, padding = 15) ->
    message_date = new Date message_et.timestamp()
    conversation_et.is_pending true
    Promise.all([
      @conversation_service.load_preceding_events_from_db(conversation_et.id, new Date(0), message_date, padding)
      @conversation_service.load_subsequent_events_from_db(conversation_et.id, message_date, padding, true)
    ])
    .then ([older_events, newer_events]) =>
      return @_add_events_to_conversation older_events.concat(newer_events), conversation_et
    .then (mapped_messages) ->
      conversation_et.is_pending false
      return mapped_messages

  ###
  Get subsequent messages starting with the given message
  @param conversation_et [z.entity.Conversation]
  @param message_et [z.entity.Message]
  @param include_message [Boolean] include given message in the results
  @return [Promise]
  ###
  get_subsequent_messages: (conversation_et, message_et, include_message) ->
    message_date = new Date message_et.timestamp()
    conversation_et.is_pending true
    @conversation_service.load_subsequent_events_from_db conversation_et.id, message_date, z.config.MESSAGES_FETCH_LIMIT, include_message
    .then (events) =>
      return @_add_events_to_conversation events, conversation_et
    .then (mapped_messages) ->
      conversation_et.is_pending false
      return mapped_messages

  ###
  Get messages for given category. Category param acts as lower bound
  @param conversation_et [z.entity.Conversation]
  @param category [z.message.MessageCategory]
  @return [Promise] Array of z.entity.Message entities
  ###
  get_events_for_category: (conversation_et, catogory = z.message.MessageCategory.NONE) =>
    @conversation_service.load_events_with_category_from_db conversation_et.id, catogory
    .then (events) =>
      message_ets = @event_mapper.map_json_events events, conversation_et
      return Promise.all (@_update_user_ets message_et for message_et in message_ets)

  ###
  Search for given text in conversation.
  @param conversation_id [z.entity.Conversation]
  @param query [String]
  @return [Promise] Array of z.entity.Message entities
  ###
  search_in_conversation: (conversation_et, query) =>
    if query.length is 0
      return Promise.resolve []

    @conversation_service.search_in_conversation conversation_et.id, query
    .then (events) =>
      message_ets = @event_mapper.map_json_events events, conversation_et
      return Promise.all (@_update_user_ets message_et for message_et in message_ets)
    .then (message_ets) ->
      return [message_ets, query]

  ###
  Get conversation unread events.
  @param conversation_et [z.entity.Conversation] Conversation to start from
  ###
  _get_unread_events: (conversation_et) ->
    first_message = conversation_et.get_first_message()
    upper_bound = if first_message then new Date first_message.timestamp() else new Date()
    lower_bound = new Date conversation_et.last_read_timestamp()
    return if lower_bound >= upper_bound

    conversation_et.is_pending true
    @conversation_service.load_preceding_events_from_db conversation_et.id, lower_bound, upper_bound
    .then (events) =>
      if events.length
        @_add_events_to_conversation events, conversation_et
      conversation_et.is_pending false
    .catch (error) =>
      @logger.info "Could not load unread events for conversation: #{conversation_et.id}", error

  ###
  Update conversation with a user you just unblocked
  @param user_et [z.entity.User] User you unblocked
  ###
  unblocked_user: (user_et) =>
    @get_one_to_one_conversation user_et
    .then (conversation_et) ->
      conversation_et.status z.conversation.ConversationStatus.PAST_MEMBER

  ###
  Get users and events for conversations.
  @note To reduce the number of backend calls we merge the user IDs of all conversations first.
  @param conversation_ets [Array<z.entity.Conversation>] Array of conversation entities to be updated
  ###
  update_conversations: (conversation_ets) =>
    user_ids = _.flatten(conversation_et.participating_user_ids() for conversation_et in conversation_ets)
    @user_repository.get_users_by_id user_ids
    .then =>
      @_fetch_users_and_events conversation_et for conversation_et in conversation_ets

  ###
  Map users to conversations without any backend requests.
  @param conversation_ets [Array<z.entity.Conversation>] Array of conversation entities to be updated
  ###
  update_conversations_offline: (conversation_ets) =>
    @update_participating_user_ets conversation_et, true for conversation_et in conversation_ets


  ###############################################################################
  # Repository interactions
  ###############################################################################

  ###
  Find a local conversation by ID.
  @param conversation_id [String] ID of conversation to get
  @return [z.entity.Conversation] Conversation
  ###
  find_conversation_by_id: (conversation_id) =>
    Promise.resolve()
    .then =>
      if not conversation_id
        throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.NO_CONVERSATION_ID
      conversation_et = @_find_conversation_by_id conversation_id
      return conversation_et if conversation_et
      throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.NOT_FOUND

  _find_conversation_by_id: (conversation_id) =>
    return conversation for conversation in @conversations() when conversation.id is conversation_id

  get_all_users_in_conversation: (conversation_id) =>
    @get_conversation_by_id_async conversation_id
    .then (conversation_et) =>
      return [@user_repository.self()].concat conversation_et.participating_user_ets()

  ###
  Check for conversation locally and fetch it from the server otherwise.
  @deprecated
  @note Deprecated legacy method, remove when last dependencies in wrapper has been removed
  @param conversation_id [String] ID of conversation to get
  ###
  get_conversation_by_id: (conversation_id) =>
    return conversation for conversation in @conversations() when conversation.id is conversation_id

  ###
  Check for conversation locally and fetch it from the server otherwise.
  @param conversation_id [String] ID of conversation to get
  ###
  get_conversation_by_id_async: (conversation_id) =>
    @find_conversation_by_id conversation_id
    .catch (error) =>
      if error.type is z.conversation.ConversationError::TYPE.NOT_FOUND
        return @fetch_conversation_by_id conversation_id
      throw error
    .catch (error) =>
      unless error.type is z.conversation.ConversationError::TYPE.NOT_FOUND
        @logger.log @logger.levels.ERROR, "Failed to get conversation '#{conversation_id}': #{error.message}", error
      throw error

  ###
  Get group conversations by name
  @param query [String] Query to be searched in group conversation names
  @param is_username [Boolean] Query string is username
  @return [Array<z.entity.Conversation>] Matching group conversations
  ###
  get_groups_by_name: (query, is_username) =>
    return @sorted_conversations()
      .filter (conversation_et) ->
        return false if not conversation_et.is_group()
        if is_username
          return true if z.util.StringUtil.compare_transliteration conversation_et.display_name(), "@#{query}"
          return true for user_et in conversation_et.participating_user_ets() when z.util.StringUtil.starts_with user_et.username(), query
        else
          return true if z.util.StringUtil.compare_transliteration conversation_et.display_name(), query
          return true for user_et in conversation_et.participating_user_ets() when z.util.StringUtil.compare_transliteration user_et.name(), query
        return false
      .sort (conversation_a, conversation_b) ->
        sort_query = if is_username then "@#{query}" else query
        return z.util.StringUtil.sort_by_priority conversation_a.display_name(), conversation_b.display_name(), sort_query

  ###
  Get the next unarchived conversation.
  @param conversation_et [z.entity.Conversation] Conversation to start from
  @return [z.entity.Conversation] Next conversation
  ###
  get_next_conversation: (conversation_et) ->
    return z.util.ArrayUtil.get_next_item(@conversations_unarchived(), conversation_et) or @conversations_unarchived()[0]

  ###
  Get unarchived conversation with the most recent event.
  @return [z.entity.Conversation] Most recent conversation
  ###
  get_most_recent_conversation: ->
    return @conversations_unarchived()?[0]

  ###
  Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
  @return [Array] conversation entities
  ###
  get_most_active_conversations: ->
    return @conversation_service.get_active_conversations_from_db()
    .then (conversation_ids) =>
      return conversation_ids
        .map (conversation_id) => @_find_conversation_by_id conversation_id
        .filter (conversation_et) -> conversation_et?

  ###
  Get conversation with a user.
  @param user_et [z.entity.User] User entity for whom to get the conversation
  @return [z.entity.Conversation] Conversation with requested user
  ###
  get_one_to_one_conversation: (user_et) =>
    for conversation_et in @conversations() when conversation_et.type() in [z.conversation.ConversationType.ONE2ONE, z.conversation.ConversationType.CONNECT]
      return Promise.resolve conversation_et if user_et.id is conversation_et.participating_user_ids()[0]

    @fetch_conversation_by_id user_et.connection().conversation_id
    .then (conversation_et) =>
      conversation_et.connection user_et.connection()
      return @update_participating_user_ets conversation_et

  ###
  Check whether conversation is currently displayed.
  @param conversation_et [z.entity.Conversation] Conversation to be saved
  @return [Boolean] Is the conversation active
  ###
  is_active_conversation: (conversation_et) ->
    return @active_conversation() is conversation_et

  ###
  Check whether message has been read.

  @param conversation_id [String] Conversation ID
  @param message_id [String] Message ID
  @return [Promise] Resolves with true if message is marked as read
  ###
  is_message_read: (conversation_id, message_id) =>
    if not conversation_id or not message_id
      return Promise.resolve false

    @get_conversation_by_id_async conversation_id
    .then (conversation_et) =>
      @get_message_in_conversation_by_id conversation_et, message_id
      .then (message_et) ->
        return conversation_et.last_read_timestamp() >= message_et.timestamp()
    .catch (error) ->
      if error.type is z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        return true
      throw error

  initialize_connections: (connections_ets) =>
    @map_connections connections_ets
    .then =>
      @logger.info 'Updating group participants offline'
      @_init_state_updates()
      @update_conversations_offline @conversations_unarchived()
      @update_conversations_offline @conversations_archived()
      @update_conversations_offline @conversations_cleared()

  ###
  Maps user connection to the corresponding conversation.

  @note If there is no conversation it will request it from the backend
  @param connection_et [z.entity.Connection] Connections
  @param show_conversation [Boolean] Open the new conversation
  ###
  map_connection: (connection_et, show_conversation = false) =>
    @find_conversation_by_id connection_et.conversation_id
    .catch (error) =>
      throw error unless error.type is z.conversation.ConversationError::TYPE.NOT_FOUND

      if connection_et.status() in [z.user.ConnectionStatus.ACCEPTED, z.user.ConnectionStatus.SENT]
        return @fetch_conversation_by_id connection_et.conversation_id
      throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.NOT_FOUND
    .then (conversation_et) =>
      conversation_et.connection connection_et
      if connection_et.status() is z.user.ConnectionStatus.ACCEPTED
        conversation_et.type z.conversation.ConversationType.ONE2ONE

      @update_participating_user_ets conversation_et
      .then (conversation_et) ->
        amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et if show_conversation
      return conversation_et
    .catch (error) ->
      throw error unless error.type is z.conversation.ConversationError::TYPE.NOT_FOUND

  ###
  Maps user connections to the corresponding conversations.
  @param [Array<z.entity.Connection>] Connections
  ###
  map_connections: (connection_ets) =>
    @logger.info "Mapping '#{connection_ets.length}' user connection(s) to conversations", connection_ets
    Promise.all (@map_connection connection_et for connection_et in connection_ets)

  ###
  Mark conversation as read.
  @param conversation_et [z.entity.Conversation] Conversation to be marked as read
  ###
  mark_as_read: (conversation_et) =>
    return if conversation_et is undefined
    return if @block_event_handling
    return if conversation_et.unread_event_count() is 0
    return if conversation_et.get_last_message()?.type is z.event.Backend.CONVERSATION.MEMBER_UPDATE

    @_update_last_read_timestamp conversation_et
    amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.REMOVE_READ

  ###
  Save a conversation in the repository.
  @param conversation_et [z.entity.Conversation] Conversation to be saved in the repository
  ###
  save_conversation: (conversation_et) =>
    @find_conversation_by_id conversation_et.id
    .catch (error) =>
      throw error unless error.type is z.conversation.ConversationError::TYPE.NOT_FOUND

      @conversations.push conversation_et
      @save_conversation_state_in_db conversation_et

  ###
  Persists a conversation state in the database.
  @param conversation_et [z.entity.Conversation] Conversation of which the state should be persisted
  @param updated_field [z.conversation.ConversationUpdateType] Optional type of updated state information
  ###
  save_conversation_state_in_db: (conversation_et) =>
    return @conversation_service.save_conversation_state_in_db conversation_et

  ###
  Save conversations in the repository.
  @param conversation_ets [Array<z.entity.Conversation>] Conversations to be saved in the repository
  ###
  save_conversations: (conversation_ets) =>
    z.util.ko_array_push_all @conversations, conversation_ets

  ###
  Set the notification handling state.
  @note Temporarily do not unarchive conversations when handling the notification stream
  @param handling_state [z.event.NOTIFICATION_HANDLING_STATE] State of the notifications stream handling
  ###
  set_notification_handling_state: (handling_state) =>
    @block_event_handling = handling_state isnt z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET
    @sending_queue.pause @block_event_handling
    @logger.info "Block handling of conversation events: #{@block_event_handling}"

  ###
  Update participating users in a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to be updated
  @param offline [Boolean] Should we only look for cached contacts
  ###
  update_participating_user_ets: (conversation_et, offline = false) =>
    @user_repository.get_users_by_id conversation_et.participating_user_ids(), offline
    .then (user_ets) =>
      conversation_et.self = @user_repository.self()
      conversation_et.participating_user_ets user_ets
      return conversation_et


  ###############################################################################
  # Send events
  ###############################################################################

  ###
  Add a bot to an existing conversation.

  @param conversation_et [z.entity.Conversation] Conversation to add bot to
  @param provider_id [String] ID of bot provider
  @param service_id [String] ID of service provider
  ###
  add_bot: (conversation_et, provider_id, service_id) =>
    @conversation_service.post_bots conversation_et.id, provider_id, service_id
    .then (response) =>
      amplify.publish z.event.WebApp.EVENT.INJECT, response.event
      @logger.debug "Successfully added bot to conversation '#{conversation_et.display_name()}'", response

  ###
  Add users to an existing conversation.
  @param conversation_et [z.entity.Conversation] Conversation to add users to
  @param user_ids [Array<String>] IDs of users to be added to the conversation
  ###
  add_members: (conversation_et, users_ids) =>
    @conversation_service.post_members conversation_et.id, users_ids
    .then (response) ->
      amplify.publish z.event.WebApp.EVENT.INJECT, response
    .catch (error_response) ->
      if error_response.label is z.service.BackendClientError::LABEL.TOO_MANY_MEMBERS
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.TOO_MANY_MEMBERS,
          data:
            max: z.config.MAXIMUM_CONVERSATION_SIZE
            open_spots: Math.max 0, z.config.MAXIMUM_CONVERSATION_SIZE - (conversation_et.number_of_participants() + 1)

  ###
  Archive a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to rename
  @param next_conversation_et [z.entity.Conversation] Next conversation to potentially switch to
  ###
  archive_conversation: (conversation_et, next_conversation_et) =>
    return Promise.reject new z.conversation.ConversationError z.conversation.ConversationError::TYPE.CONVERSATION_NOT_FOUND if not conversation_et

    payload =
      otr_archived: true
      otr_archived_ref: new Date(conversation_et.last_event_timestamp()).toISOString()

    @conversation_service.update_member_properties conversation_et.id, payload
    .then =>
      @_on_member_update conversation_et, {data: payload}, next_conversation_et
      @logger.info "Archived conversation '#{conversation_et.id}' on '#{payload.otr_archived_ref}'"
    .catch (error) =>
      @logger.error "Conversation '#{conversation_et.id}' could not be archived: #{error.code}\r\nPayload: #{JSON.stringify(payload)}", error

  ###
  Clear conversation content and archive the conversation.

  @note According to spec we archive a conversation when we clear it.
  It will be unarchived once it is opened through search. We use the archive flag to distinguish states.

  @param conversation_et [z.entity.Conversation] Conversation to clear
  @param leave [Boolean] Should we leave the conversation before clearing the content?
  ###
  clear_conversation: (conversation_et, leave = false) =>
    next_conversation_et = @get_next_conversation conversation_et

    _clear_conversation = =>
      @_update_cleared_timestamp conversation_et
      @_delete_messages conversation_et
      amplify.publish z.event.WebApp.CONVERSATION.SHOW, next_conversation_et

    if leave
      @leave_conversation conversation_et, next_conversation_et, _clear_conversation
    else
      _clear_conversation()

  _update_cleared_timestamp: (conversation_et) ->
    cleared_timestamp = conversation_et.last_event_timestamp()

    if conversation_et.set_timestamp cleared_timestamp, z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP
      message_content = new z.proto.Cleared conversation_et.id, cleared_timestamp
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'cleared', message_content

      @send_generic_message_to_conversation @self_conversation().id, generic_message
      .then =>
        @logger.info "Cleared conversation '#{conversation_et.id}' on '#{new Date(cleared_timestamp).toISOString()}'"

  ###
  Leave conversation.

  @param conversation_et [z.entity.Conversation] Conversation to leave
  @param next_conversation_et [z.entity.Conversation] Next conversation in list
  @param callback [Function] Function to be called on server return
  ###
  leave_conversation: (conversation_et, next_conversation_et, callback) =>
    @conversation_service.delete_members conversation_et.id, @user_repository.self().id
    .then (response) =>
      amplify.publish z.event.WebApp.EVENT.INJECT, response
      @_on_member_leave conversation_et, response
    .then =>
      if callback?
        callback next_conversation_et
      else
        @archive_conversation conversation_et, next_conversation_et

  ###
  Remove bot from conversation.
  @param conversation_et [z.entity.Conversation] Conversation to remove member from
  @param user_id [String] ID of bot to be removed from the conversation
  ###
  remove_bot: (conversation_et, user_id) =>
    @conversation_service.delete_bots conversation_et.id, user_id
    .then (response) ->
      if response
        amplify.publish z.event.WebApp.EVENT.INJECT, response
        return response

  ###
  Remove member from conversation.
  @param conversation_et [z.entity.Conversation] Conversation to remove member from
  @param user_id [String] ID of member to be removed from the conversation
  ###
  remove_member: (conversation_et, user_id) =>
    @conversation_service.delete_members conversation_et.id, user_id
    .then (response) ->
      if response
        amplify.publish z.event.WebApp.EVENT.INJECT, response
        return response

  ###
  Remove participant from conversation.
  @param conversation_et [z.entity.Conversation] Conversation to remove participant from
  @param user_et [z.entity.User] User to be removed from the conversation
  ###
  remove_participant: (conversation_et, user_et) =>
    if user_et.is_bot
      return @remove_bot conversation_et, user_et.id
    return @remove_member conversation_et, user_et.id

  ###
  Rename conversation.
  @param conversation_et [z.entity.Conversation] Conversation to rename
  @param name [String] New conversation name
  ###
  rename_conversation: (conversation_et, name) =>
    @conversation_service.update_conversation_properties conversation_et.id, name
    .then (response) -> amplify.publish z.event.WebApp.EVENT.INJECT, response

  reset_session: (user_id, client_id, conversation_id) =>
    @logger.info "Resetting session with client '#{client_id}' of user '#{user_id}'."

    @cryptography_repository.delete_session user_id, client_id
    .then (session_id) =>
      if session_id
        @logger.info "Deleted session with client '#{client_id}' of user '#{user_id}'."
      else
        @logger.warn 'No local session found to delete.'
      return @send_session_reset user_id, client_id, conversation_id
    .catch (error) =>
      @logger.warn "Failed to reset session for client '#{client_id}' of user '#{user_id}': #{error.message}", error
      throw error

  ###
  Send a specific GIF to a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to send message in
  @param url [String] URL of giphy image
  @param tag [String] tag tag used for gif search
  ###
  send_gif: (conversation_et, url, tag) =>
    if not tag
      tag = z.localization.Localizer.get_text z.string.extensions_giphy_random

    message = z.localization.Localizer.get_text
      id: z.string.extensions_giphy_message
      replace:
        placeholder: '%tag'
        content: tag

    z.util.load_url_blob url
    .then (blob) =>
      @send_text message, conversation_et
      @upload_images conversation_et, [blob]

  ###
  Toggle a conversation between silence and notify.
  @param conversation_et [z.entity.Conversation] Conversation to rename
  ###
  toggle_silence_conversation: (conversation_et) =>
    return Promise.reject new z.conversation.ConversationError z.conversation.ConversationError::TYPE.CONVERSATION_NOT_FOUND if not conversation_et

    if conversation_et.is_muted()
      payload =
        otr_muted: false
        otr_muted_ref: new Date().toISOString()
    else
      payload =
        otr_muted: true
        otr_muted_ref: new Date(conversation_et.last_event_timestamp()).toISOString()

    @conversation_service.update_member_properties conversation_et.id, payload
    .then =>
      response = {data: payload}
      @_on_member_update conversation_et, response
      @logger.info "Toggle silence to '#{payload.otr_muted}' for conversation '#{conversation_et.id}' on '#{payload.otr_muted_ref}'"
      return response
    .catch (error) =>
      reject_error = new Error "Conversation '#{conversation_et.id}' could not be muted: #{error.code}"
      @logger.warn reject_error.message, error
      throw reject_error

  ###
  Un-archive a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to rename
  ###
  unarchive_conversation: (conversation_et) =>
    return Promise.reject new z.conversation.ConversationError z.conversation.ConversationError::TYPE.CONVERSATION_NOT_FOUND if not conversation_et

    payload =
      otr_archived: false
      otr_archived_ref: new Date(conversation_et.last_event_timestamp()).toISOString()

    @conversation_service.update_member_properties conversation_et.id, payload
    .then =>
      response = {data: payload}
      @_on_member_update conversation_et, response
      @logger.info "Unarchived conversation '#{conversation_et.id}' on '#{payload.otr_archived_ref}'"
      return response
    .catch (error) =>
      reject_error = new Error "Conversation '#{conversation_et.id}' could not be unarchived: #{error.code}"
      @logger.warn reject_error.message, error
      throw reject_error

  ###
  Update last read of conversation using timestamp.
  @private
  @param conversation_et [z.entity.Conversation] Conversation to update
  ###
  _update_last_read_timestamp: (conversation_et) ->
    timestamp = conversation_et.get_last_message()?.timestamp()
    return if not timestamp?

    if conversation_et.set_timestamp timestamp, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP
      message_content = new z.proto.LastRead conversation_et.id, conversation_et.last_read_timestamp()

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'lastRead', message_content

      @send_generic_message_to_conversation @self_conversation().id, generic_message
      .then =>
        @logger.info "Marked conversation '#{conversation_et.id}' as read on '#{new Date(timestamp).toISOString()}'"
      .catch (error) =>
        @logger.error "Error (#{error.label}): #{error.message}"
        error = new Error 'Event response is undefined'
        Raygun.send error, source: 'Sending encrypted last read'


  ###############################################################################
  # Send encrypted events
  ###############################################################################

  ###
  Send assets to specified conversation. Used for file transfers.
  @param conversation_id [String] Conversation ID
  @return [Object] Collection with User IDs which hold their Client IDs in an Array
  ###
  send_asset: (conversation_et, file, nonce) =>
    generic_message = null
    @get_message_in_conversation_by_id conversation_et, nonce
    .then (message_et) =>
      asset_et = message_et.assets()[0]
      asset_et.upload_id nonce # TODO deprecated
      asset_et.uploaded_on_this_client true
      return @asset_service.create_asset_proto file
    .then ([asset, ciphertext]) =>
      generic_message = new z.proto.GenericMessage nonce
      generic_message.set 'asset', asset
      if conversation_et.ephemeral_timer()
        generic_message = @_wrap_in_ephemeral_message generic_message, conversation_et.ephemeral_timer()
      @_send_encrypted_asset conversation_et.id, generic_message, ciphertext, nonce
    .then ([response, asset_id]) =>
      event = @_construct_otr_event conversation_et.id, z.event.Backend.CONVERSATION.ASSET_ADD

      if conversation_et.ephemeral_timer()
        asset = generic_message.ephemeral.asset
      else
        asset = generic_message.asset

      event.data.otr_key = asset.uploaded.otr_key
      event.data.sha256 = asset.uploaded.sha256
      event.data.id = asset_id
      event.id = nonce
      return @_on_asset_upload_complete conversation_et, event

  ###
  Send assets to specified conversation using v3 api. Used for file transfers.
  @param conversation_id [String] Conversation ID
  @return [Object] Collection with User IDs which hold their Client IDs in an Array
  ###
  send_asset_v3: (conversation_et, file, nonce) =>
    generic_message = null
    @get_message_in_conversation_by_id conversation_et, nonce
    .then (message_et) =>
      asset_et = message_et.get_first_asset()
      asset_et.uploaded_on_this_client true
      @asset_service.upload_asset file, null, (xhr) ->
        xhr.upload.onprogress = (event) -> asset_et.upload_progress Math.round(event.loaded / event.total * 100)
        asset_et.upload_cancel = -> xhr.abort()
    .then (asset) =>
      generic_message = new z.proto.GenericMessage nonce
      generic_message.set 'asset', asset
      if conversation_et.ephemeral_timer()
        generic_message = @_wrap_in_ephemeral_message generic_message, conversation_et.ephemeral_timer()
      @send_generic_message_to_conversation conversation_et.id, generic_message
    .then =>
      event = @_construct_otr_event conversation_et.id, z.event.Backend.CONVERSATION.ASSET_ADD
      asset = if conversation_et.ephemeral_timer() then generic_message.ephemeral.asset else generic_message.asset

      event.data.otr_key = asset.uploaded.otr_key
      event.data.sha256 = asset.uploaded.sha256
      event.data.key = asset.uploaded.asset_id
      event.data.token = asset.uploaded.asset_token
      event.id = nonce
      return @_on_asset_upload_complete conversation_et, event

  ###
  Send asset metadata message to specified conversation.
  @param conversation_et [z.entity.Conversation] Conversation that should receive the file
  @param file [File] File to send
  ###
  send_asset_metadata: (conversation_et, file) =>
    z.assets.AssetMetaDataBuilder.build_metadata file
    .then (metadata) ->
      asset = new z.proto.Asset()
      if z.assets.AssetMetaDataBuilder.is_audio file
        asset.set 'original', new z.proto.Asset.Original file.type, file.size, file.name, null, null, metadata
      else if z.assets.AssetMetaDataBuilder.is_video file
        asset.set 'original', new z.proto.Asset.Original file.type, file.size, file.name, null, metadata
      else if z.assets.AssetMetaDataBuilder.is_image file
        asset.set 'original', new z.proto.Asset.Original file.type, file.size, file.name, metadata
      else
        asset.set 'original', new z.proto.Asset.Original file.type, file.size, file.name
      asset
    .then (asset) =>
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset
      if conversation_et.ephemeral_timer()
        generic_message = @_wrap_in_ephemeral_message generic_message, conversation_et.ephemeral_timer()
      @_send_and_inject_generic_message conversation_et, generic_message
    .catch (error) =>
      @logger.warn "Failed to upload metadata for asset in conversation #{conversation_et.id}: #{error.message}", error
      throw error if error.type is z.conversation.ConversationError::TYPE.DEGRADED_CONVERSATION_CANCELLATION

  ###
  Send asset preview message to specified conversation.
  @param conversation_et [z.entity.Conversation] Conversation that should receive the preview
  @param file [File] File to generate preview from
  @param message_id [String] Message ID of the message to generate a preview for
  ###
  send_asset_preview: (conversation_et, file, message_id) =>
    poster(file)
    .then (image_blob) =>
      if not image_blob?
        throw Error 'No image available'
      return @asset_service.upload_asset image_blob
      .then (uploaded_image_asset) =>
        asset = new z.proto.Asset()
        asset.set 'preview', new z.proto.Asset.Preview image_blob.type, image_blob.size, uploaded_image_asset.uploaded
        generic_message = new z.proto.GenericMessage message_id
        generic_message.set 'asset', asset
        @_send_and_inject_generic_message conversation_et, generic_message
    .catch (error) =>
      @logger.info "No preview for asset '#{message_id}' in conversation uploaded #{conversation_et.id}", error

  ###
  Send asset upload failed message to specified conversation.

  @param conversation_et [z.entity.Conversation] Conversation that should receive the file
  @param nonce [String] id of the metadata message
  @param reason [z.assets.AssetUploadFailedReason] cause for the failed upload (optional)
  ###
  send_asset_upload_failed: (conversation_et, nonce, reason = z.assets.AssetUploadFailedReason.FAILED) =>
    reason_proto = if reason is z.assets.AssetUploadFailedReason.CANCELLED then z.proto.Asset.NotUploaded.CANCELLED else z.proto.Asset.NotUploaded.FAILED
    asset = new z.proto.Asset()
    asset.set 'not_uploaded', reason_proto
    generic_message = new z.proto.GenericMessage nonce
    generic_message.set 'asset', asset
    @_send_and_inject_generic_message conversation_et, generic_message

  ###
  Send confirmation for a content message in specified conversation.
  @param conversation_et [z.entity.Conversation] Conversation that content message was received in
  @param message_et [String] ID of message for which to acknowledge receipt
  ###
  send_confirmation_status: (conversation_et, message_et) =>
    return if message_et.user().is_me or not conversation_et.is_one2one() or message_et.type not in z.event.EventTypeHandling.CONFIRM

    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'confirmation', new z.proto.Confirmation message_et.id, z.proto.Confirmation.Type.DELIVERED
    @sending_queue.push =>
      @create_user_client_map conversation_et.id, true, [message_et.user().id]
      .then (user_client_map) =>
        return @_send_generic_message conversation_et.id, generic_message, user_client_map, [message_et.user().id], false

  ###
  Send e-call message in specified conversation.
  @param conversation_et [z.entity.Conversation] Conversation to send e-call message to
  @param e_call_message_et [z.calling.entity.ECallMessage] E-call message
  @param user_client_map [Object] Contains the intended recipient users and clients
  @param precondition_option [Array<String>|Boolean] Optional level that backend checks for missing clients
  ###
  send_e_call: (conversation_et, e_call_message_et, user_client_map, precondition_option) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'calling', new z.proto.Calling e_call_message_et.to_content_string()
    @sending_queue.push =>
      return @_send_generic_message conversation_et.id, generic_message, user_client_map, precondition_option
    .then =>
      if e_call_message_et.type is z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        @_track_completed_media_action conversation_et, generic_message, e_call_message_et

  ###
  Sends image asset in specified conversation.

  @deprecated # TODO: remove once support for v2 ends
  @param conversation_et [z.entity.Conversation] Conversation to send image in
  @param image [File, Blob]
  ###
  send_image_asset: (conversation_et, image) =>
    @asset_service.create_image_proto image
    .then ([image, ciphertext]) =>
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'image', image
      if conversation_et.ephemeral_timer()
        generic_message = @_wrap_in_ephemeral_message generic_message, conversation_et.ephemeral_timer()
      optimistic_event = @_construct_otr_event conversation_et.id, z.event.Backend.CONVERSATION.ASSET_ADD
      @cryptography_repository.cryptography_mapper.map_generic_message generic_message, optimistic_event
      .then (mapped_event) =>
        @conversation_service.save_event mapped_event
      .then (saved_event) =>
        @on_conversation_event saved_event

        # we don't need to wait for the sending to resolve
        @_send_encrypted_asset conversation_et.id, generic_message, ciphertext
        .then ([response, asset_id]) =>
          @_track_completed_media_action conversation_et, generic_message
          saved_event.data.id = asset_id
          saved_event.data.info.nonce = asset_id
          @_update_image_as_sent conversation_et, saved_event, response.time
        .catch (error) =>
          @logger.error "Failed to upload otr asset for conversation #{conversation_et.id}: #{error.message}", error
          throw error

        return saved_event

  ###
  Sends image asset in specified conversation using v3 api.
  @param conversation_et [z.entity.Conversation] Conversation to send image in
  @param image [File, Blob]
  ###
  send_image_asset_v3: (conversation_et, image) =>
    @asset_service.upload_image_asset image
    .then (asset) =>
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'asset', asset
      if conversation_et.ephemeral_timer()
        generic_message = @_wrap_in_ephemeral_message generic_message, conversation_et.ephemeral_timer()
      @_send_and_inject_generic_message conversation_et, generic_message
      .then =>
        @_track_completed_media_action conversation_et, generic_message
    .catch (error) =>
      @logger.error "Failed to upload otr asset for conversation #{conversation_et.id}: #{error.message}", error
      throw error

  ###
  Send knock in specified conversation.
  @param conversation_et [z.entity.Conversation] Conversation to send knock in
  @return [Promise] Promise that resolves after sending the knock
  ###
  send_knock: (conversation_et) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'knock', new z.proto.Knock false
    if conversation_et.ephemeral_timer()
      generic_message = @_wrap_in_ephemeral_message generic_message, conversation_et.ephemeral_timer()

    @_send_and_inject_generic_message conversation_et, generic_message
    .catch (error) =>
      return if error.type is z.conversation.ConversationError::TYPE.DEGRADED_CONVERSATION_CANCELLATION
      @logger.error "Error while sending knock: #{error.message}", error
      throw error

  ###
  Send link preview in specified conversation.

  @param message [String] Plain text message that possibly contains link
  @param conversation_et [z.entity.Conversation] Conversation that should receive the message
  @param generic_message [z.protobuf.GenericMessage] GenericMessage of containing text or edited message
  @return [Promise] Promise that resolves after sending the message
  ###
  send_link_preview: (message, conversation_et, generic_message) =>
    @link_repository.get_link_preview_from_string message
    .then (link_preview) =>
      if link_preview?
        switch generic_message.content
          when 'ephemeral'
            generic_message.ephemeral.text.link_preview.push link_preview
          when 'edited'
            generic_message.edited.text.link_preview.push link_preview
          when 'text'
            generic_message.text.link_preview.push link_preview
        @_send_and_inject_generic_message conversation_et, generic_message

  ###
  Send location message in specified conversation.

  @param conversation_et [z.entity.Conversation] Conversation that should receive the message
  @param longitude [Integer] Longitude of the location
  @param latitude [Integer] Latitude of the location
  @param name [String] Name of the location
  @param zoom [Integer] Zoom factor for the map (Google Maps)
  @return [Promise] Promise that resolves after sending the message
  ###
  send_location: (conversation_et, longitude, latitude, name, zoom) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'location', new z.proto.Location longitude, latitude, name, zoom
    @send_generic_message_to_conversation conversation_et.id, generic_message

  ###
  Send edited message in specified conversation.

  @param message [String] plain text message
  @param original_message_et [z.entity.Message]
  @param conversation_et [z.entity.Conversation]
  @return [Promise] Promise that resolves after sending the message
  ###
  send_message_edit: (message, original_message_et, conversation_et) =>
    if original_message_et.get_first_asset().text is message
      return Promise.reject new Error 'Edited message equals original message'

    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'edited', new z.proto.MessageEdit original_message_et.id, new z.proto.Text message

    @_send_and_inject_generic_message conversation_et, generic_message, false
    .then =>
      @_track_edit_message conversation_et, original_message_et
      @send_link_preview message, conversation_et, generic_message
    .catch (error) =>
      return if error.type is z.conversation.ConversationError::TYPE.DEGRADED_CONVERSATION_CANCELLATION
      @logger.error "Error while editing message: #{error.message}", error
      throw error

  ###
  Toggle like status of message.
  @param conversation [z.entity.Conversation]
  @param message_et [z.entity.Message]
  @param button [Boolean]
  ###
  toggle_like: (conversation_et, message_et, button) =>
    return if conversation_et.removed_from_conversation()

    reaction = if message_et.is_liked() then z.message.ReactionType.NONE else z.message.ReactionType.LIKE
    message_et.is_liked not message_et.is_liked()

    window.setTimeout =>
      @send_reaction conversation_et, message_et, reaction
      @_track_reaction conversation_et, message_et, reaction, button
    , 50

  ###
  Send reaction to a content message in specified conversation.
  @param conversation [z.entity.Conversation] Conversation to send reaction in
  @param message_et [z.entity.Message]
  @param reaction [z.message.ReactionType]
  ###
  send_reaction: (conversation_et, message_et, reaction) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'reaction', new z.proto.Reaction reaction, message_et.id

    @_send_and_inject_generic_message conversation_et, generic_message

  ###
  Sending a message to the remote end of a session reset.

  @note When we reset a session then we must inform the remote client about this action. It sends a ProtocolBuffer message
    (which will not be rendered in the view)  to the remote client. This message only needs to be sent to the affected
    remote client, therefore we force the message sending.

  @param user_id [String] User ID
  @param client_id [String] Client ID
  @param conversation_id [String] Conversation ID
  @return [Promise] Promise that resolves after sending the session reset
  ###
  send_session_reset: (user_id, client_id, conversation_id) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'clientAction', z.proto.ClientAction.RESET_SESSION

    user_client_map = {}
    user_client_map[user_id] = [client_id]

    @cryptography_repository.encrypt_generic_message user_client_map, generic_message
    .then (payload) =>
      return @conversation_service.post_encrypted_message conversation_id, payload, true
    .then (response) =>
      @logger.info "Sent info about session reset to client '#{client_id}' of user '#{user_id}'"
      return response
    .catch (error) =>
      @logger.error "Sending conversation reset failed: #{error.message}", error
      throw error

  ###
  Send text message in specified conversation.

  @param message [String] plain text message
  @param conversation_et [z.entity.Conversation] Conversation that should receive the message
  @return [Promise] Promise that resolves after sending the message
  ###
  send_text: (message, conversation_et) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'text', new z.proto.Text message
    if conversation_et.ephemeral_timer()
      generic_message = @_wrap_in_ephemeral_message generic_message, conversation_et.ephemeral_timer()
    @_send_and_inject_generic_message conversation_et, generic_message
    .then -> return generic_message

  ###
  Send text message with link preview in specified conversation.

  @param message [String] plain text message
  @param conversation_et [z.entity.Conversation] Conversation that should receive the message
  @return [Promise] Promise that resolves after sending the message
  ###
  send_text_with_link_preview: (message, conversation_et) =>
    @send_text message, conversation_et
    .then (generic_message) =>
      @send_link_preview message, conversation_et, generic_message
    .catch (error) =>
      return if error.type is z.conversation.ConversationError::TYPE.DEGRADED_CONVERSATION_CANCELLATION
      @logger.error "Error while sending text message: #{error.message}", error
      throw error

  ###
  Construct event payload.

  @private
  @param conversation_id [String] Conversation ID
  @param event_type [z.event.Backend.*]
  @return [Object] event payload
  ###
  _construct_otr_event: (conversation_id, event_type) ->
    return {} =
      data: {}
      from: @user_repository.self().id
      time: new Date().toISOString()
      type: event_type
      conversation: conversation_id
      status: z.message.StatusType.SENDING

  ###
  Map a user client maps.

  @private
  @param user_client_map [Object]
  @param client_callback [Function] Function to be executed on clients first
  @param user_callback [Function] Function to be executed on users at the end
  ###
  _map_user_client_map: (user_client_map, client_callback, user_callback) ->
    result = []
    for user_id, client_ids of user_client_map
      for client_id in client_ids
        result.push client_callback user_id, client_id
      result.push user_callback user_id if user_callback
    return result

  ###
  Update image message with given event data
  @param conversation_et [z.entity.Conversation] Conversation image was sent in
  @param event_json [JSON] Image event containing updated information after sending
  @param event_time [Number|undefined] if defined it will update event timestamp
  ###
  _update_image_as_sent: (conversation_et, event_json, event_time) =>
    @get_message_in_conversation_by_id conversation_et, event_json.id
    .then (message_et) =>
      asset_data = event_json.data
      remote_data = z.assets.AssetRemoteData.v2 conversation_et.id, asset_data.id, asset_data.otr_key, asset_data.sha256, true
      message_et.get_first_asset().resource remote_data
      message_et.status z.message.StatusType.SENT
      message_et.timestamp new Date(event_time).getTime()
      @conversation_service.update_message_in_db message_et,
        data: asset_data
        status: z.message.StatusType.SENT
        time: event_time

  ###
  Wraps generic message in ephemeral message.

  @param generic_message [z.proto.Message]
  @param millis [Number] expire time in milliseconds
  @return [z.proto.Message]
  ###
  _wrap_in_ephemeral_message: (generic_message, millis) ->
    ephemeral = new z.proto.Ephemeral()
    ephemeral.set 'expire_after_millis', millis
    ephemeral.set generic_message.content, generic_message[generic_message.content]
    generic_message = new z.proto.GenericMessage generic_message.message_id
    generic_message.set 'ephemeral', ephemeral
    return generic_message


  ###############################################################################
  # Send Generic Messages
  ###############################################################################

  ###
  Create a user client map for a given conversation.

  @param conversation_id [String] Conversation ID
  @param skip_own_clients [Boolean] True, if other own clients should be skipped (to not sync messages on own clients)
  @param user_ids [Array<String>] Optionally the intended recipient users
  @return [Promise<Object>] Promise that resolves with a user client map
  ###
  create_user_client_map: (conversation_id, skip_own_clients = false, user_ids) ->
    @get_all_users_in_conversation conversation_id
    .then (user_ets) ->
      user_client_map = {}

      for user_et in user_ets
        continue if skip_own_clients and user_et.is_me
        if user_ids
          continue if user_et.id not in user_ids
        user_client_map[user_et.id] = (client_et.id for client_et in user_et.devices())

      return user_client_map

  send_generic_message_to_conversation: (conversation_id, generic_message) =>
    @sending_queue.push =>
      skip_own_clients = generic_message.content is 'ephemeral'
      @create_user_client_map conversation_id, skip_own_clients
      .then (user_client_map) =>
        if skip_own_clients
          precondition_option = Object.keys user_client_map
        return @_send_generic_message conversation_id, generic_message, user_client_map, precondition_option

  _send_and_inject_generic_message: (conversation_et, generic_message, sync_timestamp = true) =>
    Promise.resolve()
    .then =>
      if conversation_et.removed_from_conversation()
        throw new Error 'Cannot send message to conversation you are not part of'
      optimistic_event = @_construct_otr_event conversation_et.id, z.event.Backend.CONVERSATION.MESSAGE_ADD
      return @cryptography_repository.cryptography_mapper.map_generic_message generic_message, optimistic_event
    .then (mapped_event) =>
      if mapped_event.type in z.event.EventTypeHandling.STORE
        return @conversation_service.save_event mapped_event
      return mapped_event
    .then (saved_event) =>
      @on_conversation_event saved_event
      @send_generic_message_to_conversation conversation_et.id, generic_message
      .then (payload) =>
        if saved_event.type in z.event.EventTypeHandling.STORE
          backend_timestamp = if sync_timestamp then payload.time else undefined
          @_update_message_sent_status conversation_et, saved_event.id, backend_timestamp
        @_track_completed_media_action conversation_et, generic_message
      .then ->
        return saved_event

  ###
  Update message as sent in db and view
  @param conversation_et [z.entity.Conversation]
  @param message_id [String]
  @param event_time [Number|undefined] if defined it will update event timestamp
  @return [Promise]
  ###
  _update_message_sent_status: (conversation_et, message_id, event_time) =>
    @get_message_in_conversation_by_id conversation_et, message_id
    .then (message_et) =>
      changes = {}

      message_et.status z.message.StatusType.SENT
      changes.status = z.message.StatusType.SENT

      if event_time
        message_et.timestamp new Date(event_time).getTime()
        changes.time = event_time

      @conversation_service.update_message_in_db message_et, changes

  ###
  Send encrypted external message

  @param conversation_id [String] Conversation ID
  @param generic_message [z.protobuf.GenericMessage] Generic message to be sent as external message
  @param user_client_map [Object] Optional object containing recipient users and their clients
  @param precondition_option [Array<String>|Boolean] Optional level that backend checks for missing clients
  @param native_push [Boolean] Optional if message should enforce native push
  @return [Promise] Promise that resolves after sending the external message
  ###
  _send_external_generic_message: (conversation_id, generic_message, user_client_map, precondition_option, native_push = true) =>
    @logger.info "Sending external message of type '#{generic_message.content}'", generic_message

    ciphertext = null
    key_bytes = null
    sha256 = null

    z.assets.AssetCrypto.encrypt_aes_asset generic_message.toArrayBuffer()
    .then (data) =>
      [key_bytes, sha256, ciphertext] = data
      generic_message_external = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message_external.set 'external', new z.proto.External new Uint8Array(key_bytes), new Uint8Array(sha256)
      return @cryptography_repository.encrypt_generic_message user_client_map, generic_message_external
    .then (payload) =>
      payload.data = z.util.array_to_base64 ciphertext
      payload.native_push = native_push
      @_send_encrypted_message conversation_id, generic_message, payload, precondition_option
    .catch (error) =>
      @logger.info 'Failed sending external message', error
      throw error

  ###
  Sends a generic message to a conversation.

  @private
  @param conversation_id [String] Conversation ID
  @param generic_message [z.protobuf.GenericMessage] Protobuf message to be encrypted and send
  @param user_client_map [Object] Optional object containing recipient users and their clients
  @param precondition_option [Array<String>|Boolean] Optional level that backend checks for missing clients
  @param native_push [Boolean] Optional if message should enforce native push
  @return [Promise] Promise that resolves when the message was sent
  ###
  _send_generic_message: (conversation_id, generic_message, user_client_map, precondition_option, native_push = true) =>
    @_should_send_as_external conversation_id, generic_message
    .then (send_as_external) =>
      if send_as_external
        @_send_external_generic_message conversation_id, generic_message, user_client_map, precondition_option, native_push
      else
        return @cryptography_repository.encrypt_generic_message user_client_map, generic_message
        .then (payload) =>
          payload.native_push = native_push
          @_send_encrypted_message conversation_id, generic_message, payload, precondition_option
    .catch (error) =>
      if error?.code is z.service.BackendClientError::STATUS_CODE.REQUEST_TOO_LARGE
        return @_send_external_generic_message conversation_id, generic_message, user_client_map, precondition_option, native_push
      throw error

  ###
  Sends otr message to a conversation.

  @private
  @note Options for the precondition check on missing clients are:
    'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending
  @param conversation_id [String] Conversation ID
  @param generic_message [z.protobuf.GenericMessage] Protobuf message to be encrypted and send
  @param payload [Object]
  @param precondition_option [Array<String>|Boolean] Level that backend checks for missing clients
  @return [Promise] Promise that resolves after sending the encrypted message
  ###
  _send_encrypted_message: (conversation_id, generic_message, payload, precondition_option = false) =>
    @logger.info "Sending encrypted '#{generic_message.content}' message to conversation '#{conversation_id}'", payload

    @_grant_outgoing_message conversation_id, generic_message
    .then =>
      return @conversation_service.post_encrypted_message conversation_id, payload, precondition_option
    .then (response) =>
      @_handle_client_mismatch conversation_id, response
      return response
    .catch (error) =>
      updated_payload = undefined

      throw error unless error.missing

      return @_handle_client_mismatch conversation_id, error, generic_message, payload
      .then (payload_with_missing_clients) =>
        updated_payload = payload_with_missing_clients
        return @_grant_outgoing_message conversation_id, generic_message, Object.keys error.missing
      .then =>
        @logger.info "Sending updated encrypted '#{generic_message.content}' message to conversation '#{conversation_id}'", updated_payload
        return @conversation_service.post_encrypted_message conversation_id, updated_payload, true

  _grant_outgoing_message: (conversation_id, generic_message, user_ids) ->
    return Promise.resolve() if generic_message.content in ['cleared', 'confirmation', 'deleted', 'lastRead']
    consent_type = if generic_message.content is 'calling' then z.ViewModel.MODAL_CONSENT_TYPE.OUTGOING_CALL else z.ViewModel.MODAL_CONSENT_TYPE.MESSAGE
    return @grant_message conversation_id, consent_type, user_ids

  grant_message: (conversation_id, consent_type, user_ids) =>
    @get_conversation_by_id_async conversation_id
    .then (conversation_et) =>
      return if conversation_et.verification_state() isnt z.conversation.ConversationVerificationState.DEGRADED

      return new Promise (resolve, reject) =>
        send_anyway = false

        if not user_ids
          users_with_unverified_clients = conversation_et.get_users_with_unverified_clients()
          user_ids = users_with_unverified_clients.map (user_et) -> user_et.id

        @user_repository.get_users_by_id user_ids
        .then (user_ets) ->
          amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.NEW_DEVICE,
            data:
              consent_type: consent_type
              user_ets: user_ets
            action: ->
              send_anyway = true
              conversation_et.verification_state z.conversation.ConversationVerificationState.UNVERIFIED
              amplify.publish z.event.WebApp.CALL.STATE.JOIN, conversation_et.id if consent_type is z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL
              resolve()
            close: ->
              if not send_anyway
                amplify.publish z.event.WebApp.CALL.STATE.DELETE, conversation_et.id if consent_type is z.ViewModel.MODAL_CONSENT_TYPE.OUTGOING_CALL
                reject new z.conversation.ConversationError z.conversation.ConversationError::TYPE.DEGRADED_CONVERSATION_CANCELLATION

  ###
  Sends an OTR asset to a conversation.

  @deprecated # TODO: remove once support for v2 ends
  @private
  @param conversation_id [String] Conversation ID
  @param generic_message [z.protobuf.GenericMessage] Protobuf message to be encrypted and send
  @param image_data [Uint8Array|ArrayBuffer]
  @param nonce [String]
  @return [Promise] Promise that resolves after sending the encrypted message
  ###
  _send_encrypted_asset: (conversation_id, generic_message, image_data, nonce) =>
    @logger.log @logger.levels.INFO, "Sending encrypted '#{generic_message.content}' asset to conversation '#{conversation_id}'", image_data
    skip_own_clients = generic_message.content is 'ephemeral'
    precondition_option = false
    image_payload = undefined

    @_grant_outgoing_message conversation_id, generic_message
    .then =>
      return @create_user_client_map conversation_id, skip_own_clients
    .then (user_client_map) =>
      if skip_own_clients
        precondition_option = Object.keys user_client_map
      return @cryptography_repository.encrypt_generic_message user_client_map, generic_message
    .then (payload) =>
      payload.inline = false
      image_payload = payload
      return @asset_service.post_asset_v2 conversation_id, image_payload, image_data, precondition_option, nonce
    .then (response) =>
      @_handle_client_mismatch conversation_id, response
      return response
    .catch (error) =>
      updated_payload = undefined

      throw error if not error.missing

      return @_handle_client_mismatch conversation_id, error, generic_message, image_payload
      .then (payload_with_missing_clients) =>
        updated_payload = payload_with_missing_clients
        return @_grant_outgoing_message conversation_id, generic_message, Object.keys error.missing
      .then =>
        @logger.log @logger.levels.INFO, "Sending updated encrypted '#{generic_message.content}' message to conversation '#{conversation_id}'", updated_payload
        return @asset_service.post_asset_v2 conversation_id, updated_payload, image_data, true, nonce

  ###
  Estimate whether message should be send as type external.

  @private
  @param conversation_id [String]
  @param generic_message [z.protobuf.GenericMessage] Generic message that will be send
  @return [Boolean] Is payload likely to be too big so that we switch to type external?
  ###
  _should_send_as_external: (conversation_id, generic_message) ->
    @get_conversation_by_id_async conversation_id
    .then (conversation_et) ->
      estimated_number_of_clients = conversation_et.number_of_participants() * 4
      message_in_bytes = new Uint8Array(generic_message.toArrayBuffer()).length
      estimated_payload_in_bytes = estimated_number_of_clients * message_in_bytes
      return estimated_payload_in_bytes / 1024 > 200

  ###
  Post images to a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to post the images
  @param images [Array|FileList]
  ###
  upload_images: (conversation_et, images) =>
    return if not @_can_upload_assets_to_conversation conversation_et
    for image in images
      if @use_v3_api
        @send_image_asset_v3 conversation_et, image
      else
        @send_image_asset conversation_et, image

  ###
  Post files to a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to post the files
  @param files [Array|FileList] File objects
  ###
  upload_files: (conversation_et, files) =>
    return if not @_can_upload_assets_to_conversation conversation_et

    for file in files
      if @use_v3_api
        @upload_file_v3 conversation_et, file
      else
        @upload_file conversation_et, file

  ###
  Post file to a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to post the file
  @param file [Object] File object
  ###
  upload_file: (conversation_et, file) =>
    return if not @_can_upload_assets_to_conversation conversation_et
    message_id = null

    upload_started = Date.now()
    tracking_data =
      size_bytes: file.size
      size_mb: z.util.bucket_values (file.size / 1024 / 1024), [0, 5, 10, 15, 20, 25]
      type: z.util.get_file_extension file.name
    conversation_type = z.tracking.helpers.get_conversation_type conversation_et
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_INITIATED,
      $.extend tracking_data, {conversation_type: conversation_type}

    @send_asset_metadata conversation_et, file
    .then (record) =>
      message_id = record.id
      @send_asset conversation_et, file, message_id
    .then =>
      upload_duration = (Date.now() - upload_started) / 1000
      @logger.info "Finished to upload asset for conversation'#{conversation_et.id} in #{upload_duration}"
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_SUCCESSFUL,
        $.extend tracking_data, {time: upload_duration}
    .catch (error) =>
      throw error if error.type is z.conversation.ConversationError::TYPE.DEGRADED_CONVERSATION_CANCELLATION
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_FAILED, tracking_data
      @logger.error "Failed to upload asset for conversation '#{conversation_et.id}': #{error.message}", error
      @get_message_in_conversation_by_id conversation_et, message_id
      .then (message_et) =>
        @send_asset_upload_failed conversation_et, message_et.id
        @update_message_as_upload_failed message_et

  ###
  Post file to a conversation using v3

  @param conversation_et [z.entity.Conversation] Conversation to post the file
  @param file [Object] File object
  ###
  upload_file_v3: (conversation_et, file) =>
    return if not @_can_upload_assets_to_conversation conversation_et
    message_id = null

    upload_started = Date.now()
    tracking_data =
      size_bytes: file.size
      size_mb: z.util.bucket_values (file.size / 1024 / 1024), [0, 5, 10, 15, 20, 25]
      type: z.util.get_file_extension file.name
    conversation_type = z.tracking.helpers.get_conversation_type conversation_et
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_INITIATED,
      $.extend tracking_data, {conversation_type: conversation_type}

    @send_asset_metadata conversation_et, file
    .then (record) =>
      message_id = record.id
      @send_asset_preview conversation_et, file, message_id
    .then =>
      @send_asset_v3 conversation_et, file, message_id
    .then =>
      upload_duration = (Date.now() - upload_started) / 1000
      @logger.info "Finished to upload asset for conversation'#{conversation_et.id} in #{upload_duration}"
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_SUCCESSFUL,
        $.extend tracking_data, {time: upload_duration}
    .catch (error) =>
      throw error if error.type is z.conversation.ConversationError::TYPE.DEGRADED_CONVERSATION_CANCELLATION
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_FAILED, tracking_data
      @logger.error "Failed to upload asset for conversation '#{conversation_et.id}': #{error.message}", error
      @get_message_in_conversation_by_id conversation_et, message_id
      .then (message_et) =>
        @send_asset_upload_failed conversation_et, message_et.id
        @update_message_as_upload_failed message_et

  ###
  Delete message for everyone.

  @param conversation_et [z.entity.Conversation]
  @param message_et [z.entity.Message]
  @param precondition_option [Array<String>|Boolean] Optional level that backend checks for missing clients
  ###
  delete_message_everyone: (conversation_et, message_et, precondition_option) =>
    Promise.resolve()
    .then ->
      if not message_et.user().is_me and not message_et.ephemeral_expires()
        throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.WRONG_USER
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'deleted', new z.proto.MessageDelete message_et.id
      return generic_message
    .then (generic_message) =>
      @sending_queue.push =>
        @create_user_client_map conversation_et.id, false, precondition_option
        .then (user_client_map) =>
          return @_send_generic_message conversation_et.id, generic_message, user_client_map, precondition_option
    .then =>
      @_track_delete_message conversation_et, message_et, z.tracking.attribute.DeleteType.EVERYWHERE
    .then =>
      amplify.publish z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, message_et.id
      return @_delete_message_by_id conversation_et, message_et.id
    .catch (error) =>
      @logger.info "Failed to send delete message for everyone with id '#{message_et.id}' for conversation '#{conversation_et.id}'", error
      throw error

  ###
  Delete message on your own clients.
  @param conversation_et [z.entity.Conversation]
  @param message_et [z.entity.Message]
  ###
  delete_message: (conversation_et, message_et) =>
    Promise.resolve()
    .then ->
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'hidden', new z.proto.MessageHide conversation_et.id, message_et.id
      return generic_message
    .then (generic_message) =>
      @send_generic_message_to_conversation @self_conversation().id, generic_message
    .then =>
      @_track_delete_message conversation_et, message_et, z.tracking.attribute.DeleteType.LOCAL
    .then =>
      amplify.publish z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, message_et.id
      return @_delete_message_by_id conversation_et, message_et.id
    .catch (error) =>
      @logger.info "Failed to send delete message with id '#{message_et.id}' for conversation '#{conversation_et.id}'", error
      throw error

  ###
  Check the remaining lifetime for a given ephemeral message.
  @param message_et [z.entity.Message]
  ###
  check_ephemeral_timer: (message_et) =>
    switch message_et.ephemeral_status()
      when z.message.EphemeralStatusType.TIMED_OUT
        @timeout_ephemeral_message message_et
      when z.message.EphemeralStatusType.ACTIVE
        message_et.start_ephemeral_timer()
      when z.message.EphemeralStatusType.INACTIVE
        message_et.start_ephemeral_timer()
        @conversation_service.update_message_in_db message_et, {ephemeral_expires: message_et.ephemeral_expires(), ephemeral_started: message_et.ephemeral_started()}

  timeout_ephemeral_message: (message_et) =>
    return if message_et.is_expired()

    @get_conversation_by_id_async message_et.conversation_id
    .then (conversation_et) =>
      if message_et.user().is_me
        switch
          when message_et.has_asset_text()
            @_obfuscate_text_message conversation_et, message_et.id
          when message_et.is_ping()
            @_obfuscate_ping_message conversation_et, message_et.id
          when message_et.has_asset()
            @_obfuscate_asset_message conversation_et, message_et.id
          when message_et.has_asset_image()
            @_obfuscate_image_message conversation_et, message_et.id
          else
            @logger.warn "Ephemeral message of unsupported type: #{message_et.type}"
      else
        if conversation_et.is_group()
          user_ids = _.union [@user_repository.self().id], [message_et.from]
          @delete_message_everyone conversation_et, message_et, user_ids
        else
          @delete_message_everyone conversation_et, message_et

  _obfuscate_text_message: (conversation_et, message_id) =>
    @get_message_in_conversation_by_id conversation_et, message_id
    .then (message_et) =>
      asset = message_et.get_first_asset()
      obfuscated = new z.entity.Text message_et.id
      obfuscated.previews asset.previews()
      obfuscated.text = z.util.StringUtil.obfuscate asset.text if obfuscated.previews().length is 0
      message_et.assets [obfuscated]
      message_et.ephemeral_expires true

      @conversation_service.update_message_in_db message_et,
        ephemeral_expires: true
        data:
          content: obfuscated.text
          nonce: obfuscated.id
    .then =>
      @logger.info "Obfuscated text message '#{message_id}'"

  _obfuscate_ping_message: (conversation_et, message_id) =>
    @get_message_in_conversation_by_id conversation_et, message_id
    .then (message_et) =>
      message_et.ephemeral_expires true
      @conversation_service.update_message_in_db message_et, {ephemeral_expires: true}
    .then =>
      @logger.info "Obfuscated ping message '#{message_id}'"

  _obfuscate_asset_message: (conversation_et, message_id) =>
    @get_message_in_conversation_by_id conversation_et, message_id
    .then (message_et) =>
      asset = message_et.get_first_asset()
      message_et.ephemeral_expires true
      @conversation_service.update_message_in_db message_et,
        data:
          content_type: asset.file_type
          info:
            nonce: message_et.nonce
          meta: {}
        ephemeral_expires: true
    .then =>
      @logger.info "Obfuscated asset message '#{message_id}'"

  _obfuscate_image_message: (conversation_et, message_id) =>
    @get_message_in_conversation_by_id conversation_et, message_id
    .then (message_et) =>
      asset = message_et.get_first_asset()
      message_et.ephemeral_expires true
      @conversation_service.update_message_in_db message_et,
        data:
          info:
            nonce: message_et.nonce
            height: asset.height
            width: asset.width
            tag: 'medium'
        ephemeral_expires: true
    .then =>
      @logger.info "Obfuscated image message '#{message_id}'"

  ###
  Can user upload assets to conversation.
  @param conversation_et [z.entity.Conversation]
  ###
  _can_upload_assets_to_conversation: (conversation_et) ->
    return false if not conversation_et?
    return false if conversation_et.removed_from_conversation()
    return false if conversation_et.is_request()
    return false if conversation_et.is_one2one() and conversation_et.connection().status() isnt z.user.ConnectionStatus.ACCEPTED
    return true


  ###############################################################################
  # Event callbacks
  ###############################################################################

  on_missed_events: =>
    @filtered_conversations()
    .filter (conversation_et) -> not conversation_et.removed_from_conversation()
    .forEach (conversation_et) => amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_missed conversation_et, @user_repository.self()

  ###
  Listener for incoming events from the WebSocket.
  @note We check for events received multiple times via the WebSocket by event id here
  @param event [Object] JSON data for event
  ####
  on_conversation_event: (event) =>
    unless event
      Promise.reject new Error 'Conversation Repository Event Handling: Event missing'

    @logger.info "»» Event: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}

    # Ignore 'conversation.member-join if we join a 1to1 conversation (accept a connection request)
    if event.type is z.event.Backend.CONVERSATION.MEMBER_JOIN
      connection_et = @user_repository.get_connection_by_conversation_id event.conversation
      return Promise.resolve() if connection_et?.status() is z.user.ConnectionStatus.PENDING

    # Handle conversation create event separately
    if event.type is z.event.Backend.CONVERSATION.CREATE
      return @_on_create event

    # Check if conversation was archived
    @get_conversation_by_id_async event.conversation
    .then (conversation_et) =>
      previously_archived = conversation_et.is_archived()

      switch event.type
        when z.event.Backend.CONVERSATION.MEMBER_JOIN
          @_on_member_join conversation_et, event
        when z.event.Backend.CONVERSATION.MEMBER_LEAVE
          @_on_member_leave conversation_et, event
        when z.event.Backend.CONVERSATION.MEMBER_UPDATE
          @_on_member_update conversation_et, event
        when z.event.Backend.CONVERSATION.MESSAGE_ADD
          @_on_message_add conversation_et, event
        when z.event.Backend.CONVERSATION.RENAME
          @_on_rename conversation_et, event
        when z.event.Client.CONVERSATION.ASSET_UPLOAD_COMPLETE
          @_on_asset_upload_complete conversation_et, event
        when z.event.Client.CONVERSATION.ASSET_UPLOAD_FAILED
          @_on_asset_upload_failed conversation_et, event
        when z.event.Client.CONVERSATION.ASSET_PREVIEW
          @_on_asset_preview conversation_et, event
        when z.event.Client.CONVERSATION.CONFIRMATION
          @_on_confirmation conversation_et, event
        when z.event.Client.CONVERSATION.MESSAGE_DELETE
          @_on_message_deleted conversation_et, event
        when z.event.Client.CONVERSATION.MESSAGE_HIDDEN
          @_on_message_hidden event
        when z.event.Client.CONVERSATION.REACTION
          @_on_reaction conversation_et, event
        else
          @_on_add_event conversation_et, event

      # Un-archive it also on the backend side
      if not @block_event_handling and previously_archived and not conversation_et.is_archived()
        @logger.info "Unarchiving conversation '#{conversation_et.id}' with new event"
        @unarchive_conversation conversation_et

  ###
  Push to receiving queue.
  @param event [Object] JSON data for event
  ###
  push_to_receiving_queue: (event) =>
    @receiving_queue.push => @on_conversation_event event

  ###
  A message or ping received in a conversation.
  @private
  @param conversation_et [z.entity.Conversation] Conversation to add the event to
  @param event_json [Object] JSON data of 'conversation.message-add' or 'conversation.knock' event
  ###
  _on_add_event: (conversation_et, event_json) ->
    @_add_event_to_conversation event_json, conversation_et
    .then (message_et) =>
      @send_confirmation_status conversation_et, message_et
      @_send_event_notification conversation_et, message_et

  ###
  An asset preview was send.
  @private
  @param event_json [Object] JSON data of 'conversation.asset-upload-failed' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  _on_asset_preview: (conversation_et, event_json) ->
    @get_message_in_conversation_by_id conversation_et, event_json.id
    .then (message_et) =>
      @update_message_with_asset_preview conversation_et, message_et, event_json.data
    .catch (error) =>
      if error.type is z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        return @logger.error "Asset preview: Could not find message with id '#{event_json.id}'", event_json
      throw error

  ###
  An asset was uploaded.
  @private
  @param event_json [Object] JSON data of 'conversation.asset-upload-complete' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  _on_asset_upload_complete: (conversation_et, event_json) ->
    @get_message_in_conversation_by_id conversation_et, event_json.id
    .then (message_et) =>
      @update_message_as_upload_complete conversation_et, message_et, event_json.data
    .catch (error) =>
      if error.type is z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        return @logger.error "Upload complete: Could not find message with id '#{event_json.id}'", event_json
      throw error

  ###
  An asset failed.
  @private
  @param event_json [Object] JSON data of 'conversation.asset-upload-failed' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  _on_asset_upload_failed: (conversation_et, event_json) ->
    @get_message_in_conversation_by_id conversation_et, event_json.id
    .then (message_et) =>
      if event_json.data.reason is z.assets.AssetUploadFailedReason.CANCELLED
        @_delete_message_by_id conversation_et, message_et.id
      else
        @update_message_as_upload_failed message_et
    .catch (error) =>
      if error.type is z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        return @logger.error "Upload failed: Could not find message with id '#{event_json.id}'", event_json
      throw error

  ###
  Confirmation for to message received.
  @private
  @param conversation_et [z.entity.Conversation] Conversation entity that a message was reacted upon in
  @param event_json [Object] JSON data of 'conversation.confirmation' event
  ###
  _on_confirmation: (conversation_et, event_json) ->
    @get_message_in_conversation_by_id conversation_et, event_json.data.message_id
    .then (message_et) =>
      was_updated = message_et.update_status event_json.data.status
      if was_updated
        return @conversation_service.update_message_in_db message_et, {status: message_et.status()}
    .catch (error) =>
      if error.type isnt z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        @logger.info "Failed to handle status update of a message in conversation '#{conversation_et.id}'", error
        throw error

  ###
  A conversation was created.
  @private
  @param event_json [Object] JSON data of 'conversation.create' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  _on_create: (event_json) ->
    @find_conversation_by_id event_json.conversation
    .catch (error) =>
      throw error unless error.type is z.conversation.ConversationError::TYPE.NOT_FOUND

      @update_participating_user_ets @conversation_mapper.map_conversation event_json
      .then (conversation_et) =>
        @_send_conversation_create_notification conversation_et
        @save_conversation conversation_et
        return conversation_et

  ###
  User were added to a group conversation.
  @private
  @param conversation_et [z.entity.Conversation] Conversation to add users to
  @param event_json [Object] JSON data of 'conversation.member-join' event
  ###
  _on_member_join: (conversation_et, event_json) ->
    for user_id in event_json.data.user_ids when user_id isnt @user_repository.self().id
      conversation_et.participating_user_ids.push user_id if user_id not in conversation_et.participating_user_ids()

    # Self user joins again
    if @user_repository.self().id in event_json.data.user_ids
      conversation_et.status z.conversation.ConversationStatus.CURRENT_MEMBER

    @update_participating_user_ets conversation_et
    .then =>
      return @_add_event_to_conversation event_json, conversation_et
    .then (message_et) =>
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et
      @verification_state_handler.on_member_joined conversation_et, event_json.data.user_ids

  ###
  Members of a group conversation were removed or left.
  @private
  @param conversation_et [z.entity.Conversation] Conversation to remove users from
  @param event_json [Object] JSON data of 'conversation.member-leave' event
  ###
  _on_member_leave: (conversation_et, event_json) ->
    @_add_event_to_conversation event_json, conversation_et
    .then (message_et) =>
      for user_et in message_et.user_ets()
        if user_et.is_me
          conversation_et.status z.conversation.ConversationStatus.PAST_MEMBER
          if conversation_et.call()
            amplify.publish z.event.WebApp.CALL.STATE.LEAVE, conversation_et.id, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE
        else
          conversation_et.participating_user_ids.remove user_et.id
          if conversation_et.call()
            amplify.publish z.event.WebApp.CALL.STATE.PARTICIPANT_LEFT, conversation_et.id, user_et.id

      @update_participating_user_ets conversation_et
      .then =>
        amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et
        @verification_state_handler.on_member_left conversation_et, message_et.user_ids()

  ###
  Membership properties for a conversation were updated.

  @private
  @param conversation_et [z.entity.Conversation] Conversation entity that will be updated
  @param event_json [Object] JSON data of 'conversation.member-update' event
  @param conversation_et [z.entity.Conversation] Next conversation in list
  ###
  _on_member_update: (conversation_et, event_json, next_conversation_et) ->
    previously_archived = conversation_et.is_archived()
    next_conversation_et = @get_next_conversation conversation_et if not next_conversation_et?

    @conversation_mapper.update_self_status conversation_et, event_json.data

    if previously_archived and not conversation_et.is_archived()
      @_fetch_users_and_events conversation_et
    else if conversation_et.is_archived()
      amplify.publish z.event.WebApp.CONVERSATION.SWITCH, conversation_et, next_conversation_et

  ###
  A text message received in a conversation.
  @private
  @param conversation_et [z.entity.Conversation] Conversation to add the event to
  @param event_json [Object] JSON data of 'conversation.message-add'
  ###
  _on_message_add: (conversation_et, event_json) ->
    Promise.resolve()
    .then =>
      if event_json.data.previews.length
        return @_update_link_preview conversation_et, event_json
      else if event_json.data.replacing_message_id
        return @_update_edited_message conversation_et, event_json
      return event_json
    .then (updated_event_json) =>
      @_on_add_event conversation_et, updated_event_json
    .catch (error) ->
      throw error if error.type isnt z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND

  ###
  A hide message received in a conversation.
  @private
  @param conversation_et [z.entity.Conversation] Conversation to add the event to
  @param event_json [Object] JSON data of 'conversation.message-delete'
  ###
  _on_message_deleted: (conversation_et, event_json) =>
    @get_message_in_conversation_by_id conversation_et, event_json.data.message_id
    .then (message_to_delete_et) =>
      if message_to_delete_et.ephemeral_expires()
        return
      if event_json.from isnt message_to_delete_et.from
        throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.WRONG_USER
      if event_json.from isnt @user_repository.self().id
        return @_add_delete_message conversation_et.id, event_json.id, event_json.time, message_to_delete_et
    .then =>
      amplify.publish z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, event_json.data.message_id
      return @_delete_message_by_id conversation_et, event_json.data.message_id
    .catch (error) =>
      if error.type isnt z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        @logger.info "Failed to delete message for conversation '#{conversation_et.id}'", error
        throw error

  ###
  A hide message received in a conversation.
  @private
  @param event_json [Object] JSON data of 'conversation.message-hidden'
  ###
  _on_message_hidden: (event_json) =>
    if event_json.from isnt @user_repository.self().id
      return Promise.reject new Error 'Cannot hide message: Sender is not self user'

    @get_conversation_by_id_async event_json.data.conversation_id
    .then (conversation_et) =>
      amplify.publish z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, event_json.data.message_id
      return @_delete_message_by_id conversation_et, event_json.data.message_id
    .catch (error) =>
      @logger.info "Failed to delete message for conversation '#{event_json.conversation}'", error
      throw error

  ###
  Someone reacted to a message.
  @private
  @param conversation_et [z.entity.Conversation] Conversation entity that a message was reacted upon in
  @param event_json [Object] JSON data of 'conversation.reaction' event
  ###
  _on_reaction: (conversation_et, event_json) ->
    @get_message_in_conversation_by_id conversation_et, event_json.data.message_id
    .then (message_et) =>
      changes = message_et.update_reactions event_json
      if changes
        @_update_user_ets message_et
        @_send_reaction_notification conversation_et, message_et, event_json
        @logger.debug "Updating reactions to message '#{event_json.data.message_id}' in conversation '#{conversation_et.id}'", event_json
        return @conversation_service.update_message_in_db message_et, changes, conversation_et.id
    .catch (error) =>
      if error.type is z.storage.StorageError::TYPE.NON_SEQUENTIAL_UPDATE
        Raygun.send 'Failed sequential database update'
      if error.type isnt z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        @logger.error "Failed to handle reaction to message '#{event_json.data.message_id}' in conversation '#{conversation_et.id}'", {error: error, event: event_json}
        throw error

  ###
  A conversation was renamed.
  @private
  @param conversation_et [z.entity.Conversation] Conversation entity that will be renamed
  @param event_json [Object] JSON data of 'conversation.rename' event
  ###
  _on_rename: (conversation_et, event_json) ->
    @_add_event_to_conversation event_json, conversation_et
    .then (message_et) =>
      @conversation_mapper.update_properties conversation_et, event_json.data
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et


  ###############################################################################
  # Private
  ###############################################################################

  ###
  Convert a JSON event into an entity and add it to a given conversation.

  @param json [Object] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the event will be added to
  @return [Promise] Promise that resolves with the message entity for the event
  ###
  _add_event_to_conversation: (json, conversation_et) ->
    @_update_user_ets @event_mapper.map_json_event json, conversation_et, true
    .then (message_et) =>
      if conversation_et
        conversation_et.add_message message_et
      else
        @logger.error "Message cannot be added to unloaded conversation. Message type: #{message_et.type}"
        error = new Error 'Conversation not loaded, message cannot be added'
        custom_data =
          message_type: message_et.type
        Raygun.send error, custom_data
      return message_et

  ###
  Convert multiple JSON events into entities and add them to a given conversation.

  @param events [Array] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the events will be added to
  @param prepend [Boolean] Should existing messages be prepended
  @return [Array<z.entity.Message>] Array of mapped messages
  ###
  _add_events_to_conversation: (events, conversation_et, prepend = true) ->
    return Promise.resolve().then =>
      message_ets = @event_mapper.map_json_events events, conversation_et, true
      return Promise.all (@_update_user_ets message_et for message_et in message_ets)
    .then (message_ets) ->
      if prepend and conversation_et.messages().length > 0
        conversation_et.prepend_messages message_ets
      else
        conversation_et.add_messages message_ets
      return message_ets

  ###
  Fetch all unread events and users of a conversation.
  @private
  @param conversation_et [z.entity.Conversation] Conversation fetch events and users for
  ###
  _fetch_users_and_events: (conversation_et) ->
    if not conversation_et.is_loaded() and not conversation_et.is_pending()
      @update_participating_user_ets conversation_et
      @_get_unread_events conversation_et

  ###
  @example Look for ongoing call
    has_call = @_has_active_event response.events, [z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE], [z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE]
  ###
  _has_active_event: (events, include_on, exclude_on) ->
    event_is_active = false

    for event in events
      if event.type in include_on
        event_is_active = true
      else if event.type in exclude_on
        event_is_active = false

    return event_is_active

  ###
  Forward the 'conversation.create' event to the SystemNotification repository for browser and audio notifications.
  @private
  @param conversation_et [z.entity.Conversation] Conversation that was created
  ###
  _send_conversation_create_notification: (conversation_et) ->
    @user_repository.get_user_by_id conversation_et.creator
    .then (user_et)  ->
      message_et = new z.entity.MemberMessage()
      message_et.user user_et
      message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et

  ###
  Forward the event to the SystemNotification repository for browser and audio notifications.

  @private
  @param conversation_et [z.entity.Conversation] Conversation that event was received in
  @param message_et [z.entity.Message] Message that has been received
  ###
  _send_event_notification: (conversation_et, message_et) ->
    amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et

  ###
  Forward the reaction event to the SystemNotification repository for browser and audio notifications.

  @private
  @param conversation_et [z.entity.Conversation] Conversation that event was received in
  @param message_et [z.entity.Message] Message that has been reacted upon
  @param event_json [Object] JSON data of received reaction event
  ###
  _send_reaction_notification: (conversation_et, message_et, event_json) ->
    return if not event_json.data.reaction
    return if message_et.from isnt @user_repository.self().id

    @user_repository.get_user_by_id event_json.from
    .then (user_et) ->
      reaction_message_et = new z.entity.Message message_et.id, z.message.SuperType.REACTION
      reaction_message_et.user user_et
      reaction_message_et.reaction = event_json.data.reaction
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, reaction_message_et

  ###
  Updates the user entities that are part of a message.
  @param message_et [z.entity.Message] Message to be updated
  ###
  _update_user_ets: (message_et) =>
    @user_repository.get_user_by_id message_et.from
    .then (user_et) =>
      message_et.user user_et

      if message_et.is_member() or message_et.user_ets?
        return @user_repository.get_users_by_id message_et.user_ids()
        .then (user_ets) ->
          message_et.user_ets user_ets
          return message_et

      if message_et.reactions
        if Object.keys(message_et.reactions()).length
          return @user_repository.get_users_by_id (user_id for user_id of message_et.reactions())
          .then (user_ets) ->
            message_et.reactions_user_ets user_ets
            return message_et
        message_et.reactions_user_ets.removeAll()

      if message_et.has_asset_text()
        for asset_et in message_et.assets() when asset_et.is_text()
          asset_et.theme_color = message_et.user().accent_color()

      return message_et

  ###
  Cancel asset upload.
  @param message_et [z.entity.Message] message_et on which the cancel was initiated
  ###
  cancel_asset_upload: (message_et) =>
    @asset_service.cancel_asset_upload message_et.assets()[0].upload_id()
    @send_asset_upload_failed @active_conversation(), message_et.id, z.assets.AssetUploadFailedReason.CANCELLED

  ###
  Handle client mismatch response from backend.

  @note As part of 412 or general response when sending encrypted message
  @param conversation_id [String] ID of conversation message was sent int
  @param client_mismatch [Object] Client mismatch object containing client user maps for deleted, missing and obsolete clients
  @param generic_message [z.proto.GenericMessage] Optionally the GenericMessage that was sent
  @param payload [Object] Optionally the initial payload that was sent resulting in a 412
  ###
  _handle_client_mismatch: (conversation_id, client_mismatch, generic_message, payload) =>
    Promise.resolve()
    .then =>
      return @_handle_client_mismatch_redundant client_mismatch.redundant, payload, conversation_id
    .then (updated_payload) =>
      return @_handle_client_mismatch_deleted client_mismatch.deleted, updated_payload
    .then (updated_payload) =>
      return @_handle_client_mismatch_missing client_mismatch.missing, updated_payload, generic_message

  ###
  Handle the deleted client mismatch.

  @note Contains clients of which the backend is sure that they should not be recipient of a message and verified they no longer exist.
  @private
  @param user_client_map [Object] User client map containing redundant clients
  @param payload [Object] Optional payload of the failed request
  @return [Promise] Promise that resolves with the rewritten payload
  ###
  _handle_client_mismatch_deleted: (user_client_map, payload) ->
    if _.isEmpty user_client_map
      return Promise.resolve payload
    @logger.debug "Message contains deleted clients of '#{Object.keys(user_client_map).length}' users", user_client_map

    _remove_deleted_client = (user_id, client_id) =>
      delete payload.recipients[user_id][client_id] if payload
      return @user_repository.remove_client_from_user user_id, client_id

    _remove_deleted_user = (user_id) ->
      if payload and Object.keys(payload.recipients[user_id]).length is 0
        delete payload.recipients[user_id]

    return Promise.all @_map_user_client_map user_client_map, _remove_deleted_client, _remove_deleted_user
    .then =>
      @verification_state_handler.on_client_removed Object.keys(user_client_map)
      return payload

  ###
  Handle the missing client mismatch.

  @private
  @param user_client_map [Object] User client map containing redundant clients
  @param payload [Object] Optional payload of the failed request
  @param generic_message [z.proto.GenericMessage] Protobuffer message to be sent
  @return [Promise] Promise that resolves with the rewritten payload
  ###
  _handle_client_mismatch_missing: (user_client_map, payload, generic_message) ->
    if not payload or _.isEmpty user_client_map
      return Promise.resolve payload
    @logger.debug "Message is missing clients of '#{Object.keys(user_client_map).length}' users", user_client_map

    @cryptography_repository.encrypt_generic_message user_client_map, generic_message, payload
    .then (updated_payload) =>
      payload = updated_payload

      _add_missing_client = (user_id, client_id) =>
        return @user_repository.add_client_to_user user_id, new z.client.Client {id: client_id}

      return Promise.all @_map_user_client_map user_client_map, _add_missing_client
    .then =>
      @verification_state_handler.on_client_add Object.keys(user_client_map)
      return payload

  ###
  Handle the redundant client mismatch.

  @note Contains clients of which the backend is sure that they should not be recipient of a message but cannot say whether they exist.
    Normally only contains clients of users no longer participating in a conversation.
    Sometimes clients of the self user are listed. Thus we cannot remove the payload for all the clients of a user without checking.
  @private
  @param user_client_map [Object] User client map containing redundant clients
  @param payload [Object] Optional payload of the failed request
  @param conversation_id [String] ID of conversation the message was sent in
  @return [Promise] Promise that resolves with the rewritten payload
  ###
  _handle_client_mismatch_redundant: (user_client_map, payload, conversation_id) ->
    if _.isEmpty user_client_map
      return Promise.resolve payload
    @logger.debug "Message contains redundant clients of '#{Object.keys(user_client_map).length}' users", user_client_map

    @get_conversation_by_id_async conversation_id
    .catch (error) ->
      throw error unless error.type is z.conversation.ConversationError::TYPE.NOT_FOUND
    .then (conversation_et) =>
      _remove_redundant_client = (user_id, client_id) ->
        delete payload.recipients[user_id][client_id] if payload

      _remove_redundant_user = (user_id) ->
        conversation_et.participating_user_ids.remove user_id if conversation_et
        if payload and Object.keys(payload.recipients[user_id]).length is 0
          delete payload.recipients[user_id]

      return Promise.all @_map_user_client_map user_client_map, _remove_redundant_client, _remove_redundant_user
      .then =>
        @update_participating_user_ets conversation_et if conversation_et
        return payload

  ###
  Delete message from UI and database. Primary key is used to delete message in database.
  @param conversation_et [z.entity.Conversation] Conversation that contains the message
  @param message_et [z.entity.Message] Message to delete
  ###
  _delete_message: (conversation_et, message_et) =>
    conversation_et.remove_message_by_id message_et.id
    @conversation_service.delete_message_with_key_from_db conversation_et.id, message_et.primary_key

  ###
  Delete message from UI and database
  @param conversation_et [z.entity.Conversation] Conversation that contains the message
  @param message_id [String] Message to delete
  ###
  _delete_message_by_id: (conversation_et, message_id) =>
    conversation_et.remove_message_by_id message_id
    @conversation_service.delete_message_from_db conversation_et.id, message_id

  ###
  Delete messages from UI an database
  @param conversation_et [z.entity.Conversation] Conversation that contains the message
  ###
  _delete_messages: (conversation_et) ->
    conversation_et.remove_messages()
    @conversation_service.delete_messages_from_db conversation_et.id

  ###
  Add delete message to conversation
  @param conversation_id [String]
  @param message_id [String]
  @param time [String] ISO 8601 formatted time string
  @param message_to_delete_et [z.entity.Message]
  ###
  _add_delete_message: (conversation_id, message_id, time, message_to_delete_et) ->
    event = z.conversation.EventBuilder.build_delete conversation_id, message_id, time, message_to_delete_et
    amplify.publish z.event.WebApp.EVENT.INJECT, event

  ###############################################################################
  # Message updates
  ###############################################################################

  ###
  Update asset in UI and DB as failed
  @param message_et [z.entity.Message] Message to update
  ###
  update_message_as_upload_failed: (message_et) =>
    asset_et = message_et.get_first_asset()
    asset_et.status z.assets.AssetTransferState.UPLOAD_FAILED
    asset_et.upload_failed_reason z.assets.AssetUploadFailedReason.FAILED
    @conversation_service.update_asset_as_failed_in_db message_et.primary_key

  ###
  Update asset in UI and DB as completed

  @param conversation_et [z.entity.Conversation] Conversation that contains the message
  @param message_et [z.entity.Message] Message to delete
  @param asset_data [Object]
  @option id [Number] asset id
  @option otr_key [Uint8Array] aes key
  @option sha256 [Uint8Array] hash of the encrypted asset
  ###
  update_message_as_upload_complete: (conversation_et, message_et, asset_data) =>
    if asset_data.key
      resource = z.assets.AssetRemoteData.v3 asset_data.key, asset_data.otr_key, asset_data.sha256, asset_data.token
    else
      resource = z.assets.AssetRemoteData.v2 conversation_et.id, asset_data.id, asset_data.otr_key, asset_data.sha256
    asset_et = message_et.get_first_asset()
    asset_et.original_resource resource
    asset_et.status z.assets.AssetTransferState.UPLOADED
    @conversation_service.update_asset_as_uploaded_in_db message_et.primary_key, asset_data

  ###
  Update asset in UI and DB with preview

  @param conversation_et [z.entity.Conversation] Conversation that contains the message
  @param message_et [z.entity.Message] Message to delete
  @param asset_data [Object]
  @option id [Number] asset id
  @option otr_key [Uint8Array] aes key
  @option sha256 [Uint8Array] hash of the encrypted asset
  ###
  update_message_with_asset_preview: (conversation_et, message_et, asset_data) =>
    if asset_data.key
      resource = z.assets.AssetRemoteData.v3 asset_data.key, asset_data.otr_key, asset_data.sha256, asset_data.token, true
    else
      resource = z.assets.AssetRemoteData.v2 conversation_et.id, asset_data.id, asset_data.otr_key, asset_data.sha256, true
    asset_et = message_et.get_first_asset()
    asset_et.preview_resource resource
    @conversation_service.update_asset_preview_in_db message_et.primary_key, asset_data

  ###
  Update edited message with timestamp from the original message and delete original
  @param conversation_et [z.entity.Conversation] Conversation of edited message
  @param event_json [JSON] Edit message event
  @return [Object] Updated event_json
  ###
  _update_edited_message: (conversation_et, event_json) =>
    @get_message_in_conversation_by_id conversation_et, event_json.data.replacing_message_id
    .then (original_message_et) =>
      if event_json.from isnt original_message_et.from
        throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.WRONG_USER
      if not original_message_et.timestamp()
        throw new TypeError 'Missing timestamp'

      event_json.edited_time = event_json.time
      event_json.time = new Date(original_message_et.timestamp()).toISOString()
      @_delete_message_by_id conversation_et, event_json.id
      @_delete_message_by_id conversation_et, event_json.data.replacing_message_id
      @conversation_service.save_event event_json
      return event_json

  ###
  Update link preview message
  @param conversation_et [z.entity.Conversation] Conversation of edited message
  @param event_json [JSON] Edit message event
  @return [Object] Updated event_json
  ###
  _update_link_preview: (conversation_et, event_json) =>
    @get_message_in_conversation_by_id conversation_et, event_json.id
    .then (original_message_et) =>
      if original_message_et.get_first_asset().previews().length is 0
        @_delete_message conversation_et, original_message_et
    .then ->
      return event_json

  ###############################################################################
  # Tracking helpers
  ###############################################################################

  ###
  Count of group conversations
  @return [Integer] Number of group conversations
  ###
  get_number_of_group_conversations: ->
    group_conversations = (i for conversation_et, i in @conversations() when conversation_et.is_group())
    return group_conversations.length

  ###
  Count of silenced conversations
  @return [Integer] Number of conversations that are silenced
  ###
  get_number_of_silenced_conversations: =>
    silenced_conversations = (i for conversation_et, i in @conversations() when conversation_et.is_muted())
    return silenced_conversations.length

  ###
  Count number of pending uploads
  @return [Integer] Number of pending uploads
  ###
  get_number_of_pending_uploads: =>
    return @conversations().reduce (sum, conversation_et) ->
      sum + conversation_et.get_number_of_pending_uploads()
    , 0

  ###
  Track generic messages for media actions.
  @private
  @param conversation_et [z.entity.Conversation]
  @param generic_message [z.protobuf.GenericMessage]
  @param e_call_message [z.calling.entities.ECallMessage] Optional e-call message
  ###
  _track_completed_media_action: (conversation_et, generic_message, e_call_message_et) ->
    if generic_message.content is 'ephemeral'
      message = generic_message.ephemeral
      message_content_type = generic_message.ephemeral.content
      is_ephemeral = true
      ephemeral_time = generic_message.ephemeral.expire_after_millis / 1000
    else
      message = generic_message
      message_content_type = generic_message.content
      is_ephemeral = false

    action_type = switch message_content_type
      when 'asset'
        if message.asset.original?
          if message.asset.original.image? then 'photo' else 'file'
      when 'calling'
        if e_call_message_et.props.videosend is 'true' then 'video_call' else 'audio_call'
      when 'image' then 'photo'
      when 'knock' then 'ping'
      when 'text' then 'text' if not message.text.link_preview.length

    return if not action_type
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
      action: action_type
      conversation_type: z.tracking.helpers.get_conversation_type conversation_et
      is_ephemeral: is_ephemeral
      ephemeral_time: ephemeral_time if is_ephemeral
      with_bot: conversation_et.is_with_bot()

  ###
  Track delete action.

  @param conversation_et [z.entity.Conversation]
  @param message_et [z.entity.Message]
  @param method [z.tracking.attribute.DeleteType]
  ###
  _track_delete_message: (conversation, message_et, method) ->
    seconds_since_message_creation = Math.round (Date.now() - message_et.timestamp()) / 1000
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.DELETED_MESSAGE,
      conversation_type: z.tracking.helpers.get_conversation_type conversation
      method: method
      time_elapsed: z.util.bucket_values seconds_since_message_creation, [0, 60, 300, 600, 1800, 3600, 86400]
      time_elapsed_action: seconds_since_message_creation
      type: z.tracking.helpers.get_message_type message_et

  ###
  Track edit action.
  @param conversation_et [z.entity.Conversation]
  @param message_et [z.entity.Message]
  ###
  _track_edit_message: (conversation, message_et) ->
    seconds_since_message_creation = Math.round (Date.now() - message_et.timestamp()) / 1000
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.EDITED_MESSAGE,
      conversation_type: z.tracking.helpers.get_conversation_type conversation
      time_elapsed: z.util.bucket_values seconds_since_message_creation, [0, 60, 300, 600, 1800, 3600, 86400]
      time_elapsed_action: seconds_since_message_creation

  ###
  Track reaction action.

  @param conversation_et [z.entity.Conversation]
  @param message_et [z.entity.Message]
  @param reaction [z.message.ReactionType]
  @param button [Boolean]
  ###
  _track_reaction: (conversation_et, message_et, reaction, button = true) ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.REACTED_TO_MESSAGE,
      conversation_type: z.tracking.helpers.get_conversation_type conversation_et
      action: if reaction then 'like' else 'unlike'
      with_bot: conversation_et.is_with_bot()
      method: if button then 'button' else 'menu'
      user: if message_et.user().is_me then 'sender' else 'receiver'
      type: z.tracking.helpers.get_message_type message_et
      reacted_to_last_message: conversation_et.get_last_message() is message_et
