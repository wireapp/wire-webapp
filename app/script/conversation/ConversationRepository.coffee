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

    @active_conversation = ko.observable()

    @conversations = ko.observableArray []
    @has_initialized_participants = false
    @is_handling_notifications = true
    @fetching_conversations = {}

    @self_conversation = ko.computed =>
      return @find_conversation_by_id @user_repository.self().id if @user_repository.self()

    @filtered_conversations = ko.computed =>
      @conversations().filter (conversation_et) ->
        states_to_filter = [z.user.ConnectionStatus.BLOCKED, z.user.ConnectionStatus.CANCELLED, z.user.ConnectionStatus.PENDING]
        return false if conversation_et.connection().status() in states_to_filter
        return false if conversation_et.is_self()
        return false if conversation_et.is_cleared() and conversation_et.removed_from_conversation()
        return true

    @sorted_conversations = ko.computed =>
      @filtered_conversations().sort z.util.sort_groups_by_last_event

    @conversations_archived = ko.observableArray []
    @conversations_call = ko.observableArray []
    @conversations_cleared = ko.observableArray []
    @conversations_unarchived = ko.observableArray []

    @processed_event_ids = {}
    @processed_event_nonces = {}

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
    amplify.subscribe z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, @on_conversation_event
    amplify.subscribe z.event.WebApp.CONVERSATION.MAP_CONNECTION, @map_connection
    amplify.subscribe z.event.WebApp.CONVERSATION.STORE, @save_conversation_in_db
    amplify.subscribe z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, @set_notification_handling_state
    amplify.subscribe z.event.WebApp.SELF.CLIENT_ADD, @on_self_client_add
    amplify.subscribe z.event.WebApp.USER.UNBLOCKED, @unblocked_user
    amplify.subscribe z.event.WebApp.CONVERSATION.MESSAGE.DELETE, @delete_message


  ###############################################################################
  # Conversation service interactions
  ###############################################################################

  ###
  Create a new conversation.
  @note Supply at least 2 user IDs! Do not include the requestor

  @param user_ids [Array<String>] IDs of users (excluding the requestor) to be part of the conversation
  @param name [String] User defined name for the Conversation (optional)
  @param on_success [Function] Function to be called on success
  @param on_error [Function] Function to be called on failure
  ###
  create_new_conversation: (user_ids, name, on_success, on_error) =>
    @conversation_service.create_conversation user_ids, name, (response, error) =>
      if response
        on_success? @create response
      else
        on_error? error

  ###
  Get a conversation from the backend.
  @param conversation_et [z.entity.Conversation] Conversation to be saved
  @return [Boolean] Is the conversation active
  ###
  fetch_conversation_by_id: (conversation_id, callback) ->
    for id, callbacks of @fetching_conversations when id is conversation_id
      callbacks.push callback
      return

    @fetching_conversations[conversation_id] = [callback]

    @conversation_service.get_conversation_by_id conversation_id, (response, error) =>
      if response
        conversation_et = @conversation_mapper.map_conversation response
        @save_conversation conversation_et
        @logger.log @logger.levels.INFO, "Conversation with ID '#{conversation_id}' fetched from backend"
        callbacks = @fetching_conversations[conversation_id]
        for callback in callbacks
          callback? conversation_et
        delete @fetching_conversations[conversation_id]
      else
        @logger.log @logger.levels.ERROR, "Conversation with ID '#{conversation_id}' could not be fetched from backend"

  ###
  Retrieve all conversations using paging.

  @param limit [Integer] Query limit for conversation
  @param conversation_id [String] ID of the last conversation in batch
  @return [Promise] Promise that resolves when all conversations have been retrieved and saved
  ###
  get_conversations: (limit = 500, conversation_id) =>
    return new Promise (resolve, reject) =>
      @conversation_service.get_conversations limit, conversation_id
      .then (response) =>
        if response.has_more
          last_conversation_et = response.conversations[response.conversations.length - 1]
          @get_conversations limit, last_conversation_et.id
          .then => resolve @conversations()

        if response.conversations.length > 0
          conversation_ets = @conversation_mapper.map_conversations response.conversations
          @save_conversations conversation_ets

        if not response?.has_more
          @load_conversation_states()
          resolve @conversations()
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Failed to retrieve conversations from backend: #{error.message}", error
        reject error

  ###
  Get conversation events.
  @param conversation_et [z.entity.Conversation] Conversation to start from
  ###
  get_events: (conversation_et) ->
    conversation_et.is_pending true
    timestamp = conversation_et.get_first_message()?.timestamp
    @conversation_service.load_events_from_db conversation_et.id, timestamp
    .then (loaded_events) =>
      [events, has_further_events] = loaded_events
      conversation_et.has_further_messages has_further_events
      if events.length is 0
        @logger.log @logger.levels.INFO, "No events for conversation '#{conversation_et.id}' found", events
      else if timestamp
        date = new Date(timestamp).toISOString()
        @logger.log @logger.levels.INFO,
          "Loaded #{events.length} event(s) starting at '#{date}' for conversation '#{conversation_et.id}'", events
      else
        @logger.log @logger.levels.INFO,
          "Loaded first #{events.length} event(s) for conversation '#{conversation_et.id}'", events
      raw_events = (event.mapped or event.raw for event in events)
      @_add_events_to_conversation events: raw_events, conversation_et
      conversation_et.is_pending false
    .catch (error) =>
      @logger.log @logger.levels.INFO, "Could not load events for conversation: #{conversation_et.id}", error

  ###
  Get conversation unread events.
  @param conversation_et [z.entity.Conversation] Conversation to start from
  ###
  _get_unread_events: (conversation_et) ->
    conversation_et.is_pending true
    timestamp = conversation_et.get_first_message()?.timestamp
    @conversation_service.load_unread_events_from_db conversation_et, timestamp
    .then (events) =>
      if events.length
        raw_events = (event.mapped or event.raw for event in events)
        @_add_events_to_conversation events: raw_events, conversation_et
      conversation_et.is_pending false
    .catch (error) =>
      @logger.log @logger.levels.INFO, "Could not load unread events for conversation: #{conversation_et.id}", error

  ###
  Update conversation with a user you just unblocked
  @param user_et [z.entity.User] User you unblocked
  ###
  unblocked_user: (user_et) =>
    conversation_et = @get_one_to_one_conversation user_et.id
    conversation_et?.removed_from_conversation false

  ###
  Get users and events for conversations.
  @note To reduce the number of backend calls we merge the user IDs of all conversations first.
  @param conversation_ets [Array<z.entity.Conversation>] Array of conversation entities to be updated
  ###
  update_conversations: (conversation_ets) =>
    user_ids = _.flatten(conversation_et.all_user_ids() for conversation_et in conversation_ets)
    @user_repository.get_users_by_id user_ids, =>
      @_fetch_users_and_events conversation_et for conversation_et in conversation_ets

  ###
  Map users to conversations without any backend requests.
  @param conversation_ets [Array<z.entity.Conversation>] Array of conversation entities to be updated
  ###
  update_conversations_offline: (conversation_ets) =>
    @update_participating_user_ets conversation_et, undefined, true for conversation_et in conversation_ets


  ###############################################################################
  # Repository interactions
  ###############################################################################

  ###
  Find a local conversation by ID.
  @param conversation_id [String] ID of conversation to get
  @return [z.entity.Conversation] Conversation
  ###
  find_conversation_by_id: (conversation_id) ->
    return conversation for conversation in @conversations() when conversation.id is conversation_id

  get_all_users_in_conversation: (conversation_id) ->
    return new Promise (resolve) =>
      @get_conversation_by_id conversation_id, (conversation_et) =>
        others = conversation_et.participating_user_ets()
        resolve others.concat [@user_repository.self()]

  ###
  Check for conversation locally and fetch it from the server otherwise.
  @param conversation_id [String] ID of conversation to get
  @param callback [Function] Function to be called on server return
  ###
  get_conversation_by_id: (conversation_id, callback) ->
    if not conversation_id
      Raygun.send new Error 'Trying to get conversation without ID'
      return

    conversation_et = @find_conversation_by_id conversation_id
    if callback
      if conversation_et?
        callback? conversation_et
      else
        @fetch_conversation_by_id conversation_id, callback

    return conversation_et

  ###
  Get group conversations by name
  @param group_name [String] Query to be searched in group conversation names
  @return [Array<z.entity.Conversation>] Matching group conversations
  ###
  get_groups_by_name: (group_name) =>
    @sorted_conversations().filter (conversation_et) ->
      return false if not conversation_et.is_group()
      return true if z.util.compare_names conversation_et.display_name(), group_name
      for user_et in conversation_et.participating_user_ets()
        return true if z.util.compare_names user_et.name(), group_name
      return false

  ###
  Get the next unarchived conversation.
  @param conversation_et [z.entity.Conversation] Conversation to start from
  @return [z.entity.Conversation] Next conversation
  ###
  get_next_conversation: (conversation_et) ->
    return z.util.array_get_next @conversations_unarchived(), conversation_et

  ###
  Get unarchived conversation with the most recent event.
  @return [z.entity.Conversation] Most recent conversation
  ###
  get_most_recent_conversation: ->
    return @conversations_unarchived()?[0]

  ###
  Get conversation with a user.
  @param user_id [String] ID of user for whom to get the conversation
  @return [z.entity.Conversation] Conversation with requested user
  ###
  get_one_to_one_conversation: (user_id) =>
    for conversation_et in @conversations()
      if conversation_et.type() in [z.conversation.ConversationType.ONE2ONE, z.conversation.ConversationType.CONNECT]
        return conversation_et if user_id is conversation_et.participating_user_ids()[0]

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
  @return [Boolean] Is the message marked as read
  ###
  is_message_read: (conversation_id, message_id) =>
    conversation_et = @get_conversation_by_id conversation_id
    message_et = conversation_et.get_message_by_id message_id

    if not message_et
      @logger.log @logger.levels.WARN, "Message ID '#{message_id}' not found for conversation ID '#{conversation_id}'"
      return true

    return conversation_et.last_read_timestamp() >= message_et.timestamp

  ###
  Load the conversation states from the store.
  ###
  load_conversation_states: =>
    @conversation_service.load_conversation_states_from_db()
    .then (conversation_states) =>
      for state in conversation_states
        conversation_et = @get_conversation_by_id state.id
        @conversation_mapper.update_self_status conversation_et, state

      @logger.log @logger.levels.INFO, "Updated '#{conversation_states.length}' conversation states"
      amplify.publish z.event.WebApp.CONVERSATION.LOADED_STATES
    .catch (error) =>
      @logger.log @logger.levels.ERROR, 'Failed to update conversation states', error

  ###
  Maps a connection to the corresponding conversation

  @note If there is no conversation it will request it from the backend
  @param [Array<z.entity.Connection>] Connections
  @param [Boolean] open the new conversation
  ###
  map_connection: (connection_ets, show_conversation = false) =>
    for connection_et in connection_ets
      conversation_et = @get_conversation_by_id connection_et.conversation_id

      # We either accepted a pending connection request or send new connection request
      states_to_fetch = [z.user.ConnectionStatus.ACCEPTED, z.user.ConnectionStatus.SENT]
      if not conversation_et and connection_et.status() in states_to_fetch
        @fetch_conversation_by_id connection_et.conversation_id, (conversation_et) =>
          if conversation_et
            @save_conversation conversation_et
            conversation_et.connection connection_et
            @update_participating_user_ets conversation_et, (conversation_et) ->
              amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et if show_conversation
      else if conversation_et?
        conversation_et.connection connection_et
        @update_participating_user_ets conversation_et, (conversation_et) ->
          if connection_et.status() is z.user.ConnectionStatus.ACCEPTED
            conversation_et.type z.conversation.ConversationType.ONE2ONE

    if not @has_initialized_participants
      @logger.log @logger.levels.INFO, 'Updating group participants offline'
      @_init_state_updates()
      @update_conversations_offline @conversations_unarchived()
      @update_conversations_offline @conversations_archived()
      @update_conversations_offline @conversations_cleared()
      @has_initialized_participants = true

  ###
  Mark conversation as read.
  @param conversation_et [z.entity.Conversation] Conversation to be marked as read
  ###
  mark_as_read: (conversation_et) =>
    return if conversation_et is undefined
    return if @is_handling_notifications
    return if conversation_et.number_of_unread_events() is 0
    return if conversation_et.get_last_message()?.type is z.event.Backend.CONVERSATION.MEMBER_UPDATE

    @_update_last_read_timestamp conversation_et
    amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.REMOVE_READ

  ###
  Save a conversation in the repository.
  @param conversation_et [z.entity.Conversation] Conversation to be saved in the repository
  ###
  save_conversation: (conversation_et) =>
    if not @get_conversation_by_id conversation_et.id
      @conversations.push conversation_et
      @save_conversation_in_db conversation_et

  save_conversation_in_db: (conversation_et, updated_field) =>
    @conversation_service.save_conversation_in_db conversation_et, updated_field

  ###
  Save conversations in the repository.
  @param conversation_ets [Array<z.entity.Conversation>] Conversations to be saved in the repository
  ###
  save_conversations: (conversation_ets) =>
    z.util.ko_array_push_all @conversations, conversation_ets

  ###
  Set the notification handling state.
  @note Temporarily do not unarchive conversations when handling the notification stream
  @param handling_notifications [Boolean] Notifications are being handled from the stream
  ###
  set_notification_handling_state: (handling_notifications) =>
    @is_handling_notifications = handling_notifications
    @logger.log @logger.levels.INFO, "Ignoring events for unarchiving: #{handling_notifications}"

  ###
  Update participating users in a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to be updated
  @param callback [Function] Function to be called on server return
  @param offline [Boolean] Should we only look for cached contacts
  ###
  update_participating_user_ets: (conversation_et, callback, offline = false) =>
    conversation_et.self = @user_repository.self()
    user_ids = conversation_et.participating_user_ids()
    @user_repository.get_users_by_id user_ids, (user_ets) ->
      conversation_et.participating_user_ets.removeAll()
      z.util.ko_array_push_all conversation_et.participating_user_ets, user_ets
      callback? conversation_et
    , offline


  ###############################################################################
  # Send events
  ###############################################################################

  ###
  Add users to an existing conversation.

  @param conversation_et [z.entity.Conversation] Conversation to add users to
  @param user_ids [Array<String>] IDs of users to be added to the conversation
  @param callback [Function] Function to be called on server return
  ###
  add_members: (conversation_et, users_ids, callback) =>
    @conversation_service.post_members conversation_et.id, users_ids
    .then (response) ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT,
        z.tracking.SessionEventName.INTEGER.USERS_ADDED_TO_CONVERSATIONS, users_ids.length
      amplify.publish z.event.WebApp.EVENT.INJECT, response
      callback?()
    .catch (error_response) ->
      if error_response.label is z.service.BackendClientError::LABEL.TOO_MANY_MEMBERS
        amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.TOO_MANY_MEMBERS,
          data:
            max: z.config.MAXIMUM_CONVERSATION_SIZE
            open_spots: Math.max 0, z.config.MAXIMUM_CONVERSATION_SIZE - (conversation_et.number_of_participants() + 1)

  ###
  Archive a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to rename
  @param next_conversation_et [z.entity.Conversation] Next conversation to potentially switch to
  ###
  archive_conversation: (conversation_et, next_conversation_et) =>

    # other clients just use the old event id as a flag. if archived is
    # set they consider the conversation is archived
    payload =
      otr_archived: true
      otr_archived_ref: new Date(conversation_et.last_event_timestamp()).toISOString()

    @conversation_service.update_member_properties conversation_et.id, payload
    .then =>
      @member_update conversation_et, {data: payload}, next_conversation_et
      @logger.log @logger.levels.INFO,
        "Archived conversation '#{conversation_et.id}' on '#{payload.otr_archived_ref}'"
    .catch (error) =>
      @logger.log @logger.levels.ERROR,
        "Conversation '#{conversation_et.id}' could not be archived: #{error.code}\r\nPayload: #{JSON.stringify(payload)}", error

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

      @_send_encrypted_value @self_conversation().id, generic_message
      .then =>
        @logger.log @logger.levels.INFO,
          "Cleared conversation '#{conversation_et.id}' as read on '#{new Date(cleared_timestamp).toISOString()}'"
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Error (#{error.label}): #{error.message}"
        error = new Error 'Event response is undefined'
        Raygun.send error, source: 'Sending encrypted last read'

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
      @member_leave conversation_et, response
    .then =>
      if callback?
        callback next_conversation_et
      else
        @archive_conversation conversation_et, next_conversation_et
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to leave conversation (#{conversation_et.id}): #{error}"

  ###
  Remove member from conversation.

  @param conversation_et [z.entity.Conversation] Conversation to remove member from
  @param user_id [String] ID of member to be removed from the the conversation
  @param callback [Function] Function to be called on server return
  ###
  remove_member: (conversation_et, user_id, callback) =>
    @conversation_service.delete_members conversation_et.id, user_id
    .then (response) ->
      amplify.publish z.event.WebApp.EVENT.INJECT, response
      callback?()
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to remove member from conversation (#{conversation_et.id}): #{error}"

  ###
  Rename conversation.

  @param conversation_et [z.entity.Conversation] Conversation to rename
  @param name [String] New conversation name
  @param callback [Function] Function to be called on server return
  ###
  rename_conversation: (conversation_et, name, callback) =>
    @conversation_service.update_conversation_properties conversation_et.id, name
    .then (response) ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.CONVERSATION_RENAMED
      amplify.publish z.event.WebApp.EVENT.INJECT, response
    .then ->
      callback?()
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to rename conversation (#{conversation_et.id}): #{error}"

  reset_session: (user_id, client_id, conversation_id) =>
    @logger.log @logger.levels.INFO, "Resetting session with client '#{client_id}' of user '#{user_id}'"
    @cryptography_repository.reset_session user_id, client_id
    .then (session_id) =>
      if session_id
        @logger.log @logger.levels.INFO, "Deleted session with client '#{client_id}' of user '#{user_id}'"
      else
        @logger.log @logger.levels.WARN, 'No local session found to delete'
      return @send_encrypted_session_reset user_id, client_id, conversation_id
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Failed to reset session for client '#{client_id}' of user '#{user_id}': #{error.message}", error
      throw error

  reset_all_sessions: =>
    sessions = @cryptography_repository.storage_repository.sessions
    @logger.log @logger.levels.INFO, "Resetting '#{Object.keys(sessions).length}' sessions"
    for session_id, session of sessions
      ids = z.client.Client.dismantle_user_client_id session_id
      if ids.user_id is @user_repository.self().id
        conversation_et = @self_conversation()
      else
        conversation_et = @get_one_to_one_conversation ids.user_id
      @reset_session ids.user_id, ids.client_id, conversation_et.id

  ###
  Send a specific GIF to a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to send message in
  @param url [String] URL of giphy image
  @param tag [String] tag tag used for gif search
  @param callback [Function] Function to be called on server return
  ###
  send_gif: (conversation_et, url, tag, callback) =>
    if not tag
      tag = z.localization.Localizer.get_text z.string.extensions_giphy_random

    message = z.localization.Localizer.get_text {
      id: z.string.extensions_giphy_message
      replace: {placeholder: '%tag', content: tag}
    }

    z.util.load_url_blob url, (blob) =>
      @send_encrypted_message message, conversation_et
      @upload_images conversation_et, [blob]
      callback?()

  ###
  Toggle a conversation between silence and notify.
  @param conversation_et [z.entity.Conversation] Conversation to rename
  ###
  toggle_silence_conversation: (conversation_et) =>
    return new Promise (resolve, reject) =>
      if conversation_et.is_muted()
        payload =
          muted: false
          otr_muted: false
          otr_muted_ref: new Date().toISOString()
      else
        payload =
          muted: true
          muted_time: new Date().toJSON()
          otr_muted: true
          otr_muted_ref: new Date(conversation_et.last_event_timestamp()).toISOString()

      @conversation_service.update_member_properties conversation_et.id, payload
      .then =>
        response = {data: payload}
        @member_update conversation_et, response
        @logger.log @logger.levels.INFO,
          "Toggle silence to '#{payload.otr_muted}' for conversation '#{conversation_et.id}' on '#{payload.otr_muted_ref}'"
        resolve response
      .catch (error) =>
        reject_error = new Error "Conversation '#{conversation_et.id}' could not be muted: #{error.code}"
        @logger.log @logger.levels.WARN, reject_error.message, error
        reject reject_error

  ###
  Un-archive a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to rename
  @param callback [Function] Function to be called on return
  ###
  unarchive_conversation: (conversation_et, callback) =>
    return new Promise (resolve, reject) =>
      payload =
        otr_archived: false
        otr_archived_ref: new Date(conversation_et.last_event_timestamp()).toISOString()

      @conversation_service.update_member_properties conversation_et.id, payload
      .then =>
        response = {data: payload}
        @member_update conversation_et, response
        @logger.log @logger.levels.INFO,
          "Unarchived conversation '#{conversation_et.id}' on '#{payload.otr_archived_ref}'"
        callback?()
        resolve response
      .catch (error) =>
        reject_error = new Error "Conversation '#{conversation_et.id}' could not be unarchived: #{error.code}"
        @logger.log @logger.levels.WARN, reject_error.message, error
        callback?()
        reject reject_error

  ###
  Update last read of conversation using timestamp.
  @private
  @param conversation_et [z.entity.Conversation] Conversation to update
  ###
  _update_last_read_timestamp: (conversation_et) ->
    timestamp = conversation_et.get_last_message()?.timestamp
    return if not timestamp?

    if conversation_et.set_timestamp timestamp, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP
      message_content = new z.proto.LastRead conversation_et.id, conversation_et.last_read_timestamp()

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'lastRead', message_content

      @_send_encrypted_value @self_conversation().id, generic_message
      .then =>
        @logger.log @logger.levels.INFO,
          "Marked conversation '#{conversation_et.id}' as read on '#{new Date(timestamp).toISOString()}'"
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Error (#{error.label}): #{error.message}"
        error = new Error 'Event response is undefined'
        Raygun.send error, source: 'Sending encrypted last read'


  ###############################################################################
  # Send encrypted events
  ###############################################################################

  ###
  Send encrypted assets. Used for file transfers.

  # TODO unify with image asset
  # create and send original proto message (message-add)
  # create and send uploaded proto message with status (asset-add)

  @param conversation_id [String] Conversation ID
  @return [Object] Collection with User IDs which hold their Client IDs in an Array
  ###
  send_encrypted_asset: (conversation_et, file, nonce) =>
    conversation_id = conversation_et.id
    generic_message = null
    key_bytes = null
    sha256 = null
    ciphertext = null
    body_payload = null
    initial_payload = null

    return Promise.resolve()
    .then ->
      message_et = conversation_et.get_message_by_id nonce
      asset_et = message_et.assets()[0]
      asset_et.upload_id nonce # TODO combine
      asset_et.uploaded_on_this_client true

      return z.util.load_file_buffer file
    .then (file_bytes) ->
      return z.assets.AssetCrypto.encrypt_aes_asset file_bytes
    .then (data) ->
      # TODO send original message and
      [key_bytes, sha256, ciphertext] = data
      key_bytes = new Uint8Array key_bytes
      sha256 = new Uint8Array sha256
    .then =>
      return @_create_user_client_map conversation_id
    .then (user_client_map) =>
      generic_message = new z.proto.GenericMessage nonce
      generic_message.set 'asset', @_construct_asset_uploaded key_bytes, sha256
      return @cryptography_repository.encrypt_generic_message user_client_map, generic_message
    .then (payload) =>
      payload.inline = false
      payload.native_push = true
      body_payload = new Uint8Array ciphertext
      initial_payload = payload
      return @asset_service.post_asset_v2 conversation_id, payload, body_payload, false, nonce
    .catch (error_response) =>
      return @_update_payload_for_changed_clients error_response, generic_message, initial_payload
      .then (updated_payload) =>
        @asset_service.post_asset_v2 conversation_id, updated_payload, body_payload, true, nonce
    .then (response) =>
      [json, asset_id] = response
      event = @_construct_otr_asset_event response, conversation_et.id, asset_id
      event.data.otr_key = key_bytes
      event.data.sha256 = sha256
      event.id = nonce
      return @asset_upload_complete conversation_et, event

  ###
  When we reset a session then we must inform the remote client about this action.

  @param conversation_et [z.entity.Conversation] Conversation that should receive the file
  @param file [File] File to send
  ###
  send_encrypted_asset_metadata: (conversation_et, file) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'asset', @_construct_asset_original file
    @_send_and_save_encrypted_value conversation_et, generic_message

  ###
  When we reset a session then we must inform the remote client about this action.

  @param conversation_et [z.entity.Conversation] Conversation that should receive the file
  @param nonce [String] id of the metadata message
  @param reason [z.assets.AssetUploadFailedReason] cause for the failed upload (optional)
  ###
  send_encrypted_asset_upload_failed: (conversation_et, nonce, reason = z.assets.AssetUploadFailedReason.FAILED) =>
    generic_message = new z.proto.GenericMessage nonce
    generic_message.set 'asset', @_construct_asset_not_uploaded reason
    @_send_and_save_encrypted_value conversation_et, generic_message

  ###
  Send encrypted external message

  @param conversation_et [z.entity.Conversation] Conversation that should receive the message
  @param generic_message [z.protobuf.GenericMessage] Generic message to be sent as external message
  @return [Promise] Promise that resolves after sending the external message
  ###
  send_encrypted_external_message: (conversation_et, generic_message) =>
    @logger.log @logger.levels.INFO, "Sending external message of type '#{generic_message.content}'", generic_message

    conversation_id = conversation_et.id
    key_bytes = null
    sha256 = null
    ciphertext = null
    initial_payload = null

    z.assets.AssetCrypto.encrypt_aes_asset generic_message.toArrayBuffer()
    .then (data) =>
      [key_bytes, sha256, ciphertext] = data
      return @_create_user_client_map conversation_id
    .then (user_client_map) =>
      generic_message_external = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message_external.set 'external', new z.proto.External new Uint8Array(key_bytes), new Uint8Array(sha256)
      return @cryptography_repository.encrypt_generic_message user_client_map, generic_message_external
    .then (payload) =>
      payload.data = z.util.array_to_base64 ciphertext
      payload.native_push = true
      initial_payload = payload
      return @conversation_service.post_encrypted_message conversation_id, payload, false
    .catch (error_response) =>
      return @_update_payload_for_changed_clients error_response, generic_message, initial_payload
      .then (updated_payload) =>
        return @conversation_service.post_encrypted_message conversation_id, updated_payload, true
    .then (response) =>
      event = @_construct_otr_message_event response, conversation_et.id
      return @cryptography_repository.save_encrypted_event generic_message, event
    .then (record) =>
      @add_event conversation_et, record.mapped if record?.mapped
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Failed to send external message for conversation with id '#{conversation_id}'", error

  ###
  Sends an OTR Image Asset
  ###
  send_encrypted_image_asset: (conversation_et, image) =>
    return new Promise (resolve, reject) =>
      asset = null
      ciphertext = null
      conversation_id = conversation_et.id
      generic_message = null
      initial_payload = null

      @asset_service.create_asset_proto image
      .then ([asset, asset_ciphertext]) =>
        ciphertext = asset_ciphertext
        generic_message = new z.proto.GenericMessage z.util.create_random_uuid(), null, asset
        return @_create_user_client_map conversation_id
      .then (user_client_map) =>
        return @cryptography_repository.encrypt_generic_message user_client_map, generic_message
      .then (payload) =>
        initial_payload = payload
        initial_payload.inline = false
        initial_payload.native_push = true
        return @asset_service.post_asset_v2 conversation_id, initial_payload, ciphertext, false
      .catch (error_response) =>
        return @_update_payload_for_changed_clients error_response, generic_message, initial_payload
        .then (updated_payload) =>
          @asset_service.post_asset_v2 conversation_id, updated_payload, ciphertext, true
      .then ([json, asset_id]) =>
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.IMAGE_SENT
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
          action: 'photo', conversation_type: if conversation_et.is_one2one() then z.tracking.attribute.ConversationType.ONE_TO_ONE else z.tracking.attribute.ConversationType.GROUP
        event = @_construct_otr_asset_event json, conversation_id, asset_id
        return @cryptography_repository.save_encrypted_event generic_message, event
      .then (record) =>
        @add_event conversation_et, record.mapped
        resolve()
      .catch (error) =>
        @logger.log "Failed to upload otr asset for conversation #{conversation_id}", error
        exception = new Error('Event response is undefined')
        custom_data =
          source: 'Sending medium image'
          error: error
        Raygun.send exception, custom_data
        reject error

  ###
  Send an encrypted knock.
  @param conversation_et [z.entity.Conversation] Conversation to send knock in
  @return [Promise] Promise that resolves after sending the knock
  ###
  send_encrypted_knock: (conversation_et) =>
    @_send_and_save_encrypted_value conversation_et, new z.proto.Knock false
    .then ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.PING_SENT
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
        action: 'ping', conversation_type: if conversation_et.is_one2one() then z.tracking.attribute.ConversationType.ONE_TO_ONE else z.tracking.attribute.ConversationType.GROUP
    .catch (error) => @logger.log @logger.levels.ERROR, "#{error.message}"

  ###
  Send message to specific converation.

  @note Will either send a normal or external message.
  @param message [String] plain text message
  @param conversation_et [z.entity.Conversation] Conversation that should receive the message
  @return [Promise] Promise that resolves after sending the message
  ###
  send_encrypted_message_with_link_preview: (message, url, offset, conversation_et) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'text', new z.proto.Text message

    @_send_and_save_encrypted_value conversation_et, generic_message
    .then =>
      @link_repository.get_link_preview url, offset
    .then (link_preview) =>
      generic_message.text.link_preview.push link_preview
      @_send_and_save_encrypted_value conversation_et, generic_message
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Error while sending link preview: #{error.message}", error

  ###
  Send message to specific converation.

  @note Will either send a normal or external message.
  @param message [String] plain text message
  @param conversation_et [z.entity.Conversation] Conversation that should receive the message
  @param retry [Boolean] Try to resend as external with first attempt failed (optional)
  @return [Promise] Promise that resolves after sending the message
  ###
  send_encrypted_message: (message, conversation_et, retry = true) =>
    generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
    generic_message.set 'text', new z.proto.Text message

    Promise.resolve()
    .then =>
      if @_send_as_external_message conversation_et, generic_message
        @send_encrypted_external_message conversation_et, generic_message
      else
        @_send_and_save_encrypted_value conversation_et, generic_message
    .then (message_record) =>
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.MESSAGE_SENT
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
        action: 'text', conversation_type: if conversation_et.is_one2one() then z.tracking.attribute.ConversationType.ONE_TO_ONE else z.tracking.attribute.ConversationType.GROUP
      @_analyze_sent_message message
      return message_record
    .catch (error) =>
      if error.code is z.service.BackendClientError::STATUS_CODE.REQUEST_TOO_LARGE and retry
        @send_encrypted_external_message conversation_et, generic_message
      else
        @logger.log @logger.levels.ERROR, "#{error.message}", error
        error = new Error "Failed to send message: #{error.message}"
        custom_data =
          source: 'Sending message'
        Raygun.send error, custom_data
        throw error

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
  send_encrypted_session_reset: (user_id, client_id, conversation_id) =>
    return new Promise (resolve, reject) =>
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.setClientAction z.proto.ClientAction.RESET_SESSION

      user_client_map = @_create_user_client_map_from_ids user_id, client_id

      @cryptography_repository.encrypt_generic_message user_client_map, generic_message
      .then (payload) =>
        return @conversation_service.post_encrypted_message conversation_id, payload, true
      .then (response) =>
        @logger.log @logger.levels.INFO, "Sent info about session reset to client '#{client_id}' of user '#{user_id}'"
        resolve response
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Sending conversation reset failed: #{error.message}", error
        reject error

  ###
  Create not uploaded Asset protobuf message (failure).

  @private
  @param reason [z.assets.AssetUploadFailedReason] Conversation ID
  @return [z.proto.Asset] Asset protobuf message
  ###
  _construct_asset_not_uploaded: (reason) ->
    asset = new z.proto.Asset()
    if reason is z.assets.AssetUploadFailedReason.CANCELLED
      asset.set 'not_uploaded', z.proto.Asset.NotUploaded.CANCELLED
    else
      asset.set 'not_uploaded', z.proto.Asset.NotUploaded.FAILED
    return asset

  ###
  Create original Asset protobuf message.

  @private
  @param file [Object] File data
  @return [z.proto.Asset] Asset protobuf message
  ###
  _construct_asset_original: (file) ->
    original_asset = new z.proto.Asset.Original file.type, file.size, file.name
    asset = new z.proto.Asset()
    asset.set 'original', original_asset
    return asset

  ###
  Create uploaded Asset proto (success).

  @private
  @param otr_key [ByteArray] Encryption key
  @param sha256 [ByteArray] Sha256
  @return [z.proto.Asset] Asset protobuf message
  ###
  _construct_asset_uploaded: (otr_key, sha256) ->
    uploaded_asset = new z.proto.Asset.RemoteData otr_key, sha256
    asset = new z.proto.Asset()
    asset.set 'uploaded', uploaded_asset
    return asset

  ###
  Create MsgDeleted protobuf message.

  @private
  @param conversation_id [String] Conversation ID
  @param message_id [String] ID of message to be deleted
  @return [z.proto.MsgDeleted] MsgDeleted protobuf message
  ###
  _construct_delete: (conversation_id, message_id) ->
    return new z.proto.MsgDeleted conversation_id, message_id

  ###
  Construct an encrypted message event.

  @private
  @param response [JSON] Backend response
  @param conversation_id [String] Conversation ID
  @return [Object] Object in form of 'conversation.otr-message-add'
  ###
  _construct_otr_message_event: (response, conversation_id) ->
    event =
      data: undefined
      from: @user_repository.self().id
      time: response.time
      type: 'conversation.otr-message-add'
      conversation: conversation_id

    return event

  ###
  Construct an encrypted asset event.

  @private
  @param response [JSON] Backend response
  @param conversation_id [String] Conversation ID
  @param asset_id [String] Asset ID
  @return [Object] Object in form of 'conversation.otr-asset-add'
  ###
  _construct_otr_asset_event: (response, conversation_id, asset_id) ->
    event =
      data:
        id: asset_id
      from: @user_repository.self().id
      time: response.time
      type: 'conversation.otr-asset-add'
      conversation: conversation_id

    return event

  ###
  Create a user client map for a given conversation.

  @private
  @param conversation_id [String] Conversation ID
  @return [Promise<Object>] Promise that resolves with a user client map
  ###
  _create_user_client_map: (conversation_id) ->
    @get_all_users_in_conversation conversation_id
    .then (user_ets) ->
      user_client_map = {}

      for user_et in user_ets when user_et.devices()[0]
        user_client_map[user_et.id] = (client_et.id for client_et in user_et.devices())

      return user_client_map

  ###
  Create a user client map for given IDs.

  @private
  @param user_id [String] User ID
  @param client_id [String] Client ID
  @return [Object] User client map
  ###
  _create_user_client_map_from_ids: (user_id, client_id) ->
    user_client_map = {}
    user_client_map[user_id] = [client_id]
    return user_client_map

  ###
  Saves and sends a generic message to the conversation

  @private
  @param conversation_et [z.entity.Conversation] Conversation to send message to
  @param message_content [z.proto] Protobuf message content to be added to generic message
  @return [Promise] Promise that resolves when message has been added to the conversation
  ###
  _send_and_save_encrypted_value: (conversation_et, message_content) =>
    return new Promise (resolve, reject) =>
      reject() if conversation_et.removed_from_conversation()

      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()

      if message_content instanceof z.proto.Knock
        generic_message.set 'knock', message_content
      else if message_content instanceof z.proto.Text
        generic_message.set 'text', message_content
      else if message_content instanceof z.proto.GenericMessage
        generic_message = message_content

      @_send_encrypted_value conversation_et.id, generic_message
      .then (response) =>
        event = @_construct_otr_message_event response, conversation_et.id
        return @cryptography_repository.save_encrypted_event generic_message, event
      .then (record) =>
        @add_event conversation_et, record.mapped if record?.mapped
        resolve record
      .catch (error) =>
        error_message = "Could not send OTR message of type '#{generic_message.content}' to conversation ID '#{conversation_et.id}' (#{conversation_et.display_name()}): #{error.message}"

        raygun_error = new Error 'Encryption failed'
        custom_data = error_message: "Could not send OTR message of type '#{generic_message.content}'"
        Raygun.send raygun_error, custom_data

        @logger.log @logger.levels.ERROR, error_message, {error: error, event: generic_message}
        if error.label is z.service.BackendClientError::LABEL.UNKNOWN_CLIENT
          amplify.publish z.event.WebApp.SIGN_OUT, 'unknown_sender', true
        reject error

  ###
  Sends a generic message to the conversation

  @private
  @param conversation_id [String] Conversation ID
  @param generic_message [z.protobuf.GenericMessage] Protobuf message to be encrypted and send
  @return [Promise] Promise that resolves after sending the encrypted message
  ###
  _send_encrypted_value: (conversation_id, generic_message) =>
    initial_payload = null
    @_create_user_client_map conversation_id
    .then (user_client_map) =>
      return @cryptography_repository.encrypt_generic_message user_client_map, generic_message
    .then (payload) =>
      initial_payload = payload
      @logger.log @logger.levels.INFO, "Sending encrypted message to conversation '#{conversation_id}'", payload
      return @conversation_service.post_encrypted_message conversation_id, payload, false
    .catch (error_response) =>
      return @_update_payload_for_changed_clients error_response, generic_message, initial_payload
      .then (updated_payload) =>
        @logger.log @logger.levels.INFO, "Sending updated encrypted message to conversation '#{conversation_id}'", updated_payload
        return @conversation_service.post_encrypted_message conversation_id, updated_payload, true

  ###
  Estimate whether message should be send as type external.

  @private
  @param conversation_et [z.entitity.Conversation] Conversation entity
  @param generic_message [z.protobuf.GenericMessage] Generic message that will be send
  @return [Boolean] Is payload likely to be too big so that we switch to type external?
  ###
  _send_as_external_message: (conversation_et, generic_message) ->
    estimated_number_of_clients = conversation_et.number_of_participants() * 4
    message_in_bytes = new Uint8Array(generic_message.toArrayBuffer()).length
    estimated_payload_in_bytes = estimated_number_of_clients * message_in_bytes
    return estimated_payload_in_bytes / 1024 > 200

  ###
  Post images to a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to post the images
  @param images [Object] Message content
  ###
  upload_images: (conversation_et, images) =>
    return if not @_can_upload_assets_to_conversation conversation_et
    @send_encrypted_image_asset conversation_et, image for image in images

  ###
  Post files to a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to post the files
  @param files [Object] File objects
  ###
  upload_files: (conversation_et, files) =>
    return if not @_can_upload_assets_to_conversation conversation_et
    @upload_file conversation_et, file for file in files

  ###
  Post file to a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to post the file
  @param file [Object] File object
  ###
  upload_file: (conversation_et, file) =>
    return if not @_can_upload_assets_to_conversation conversation_et
    message_et = null

    upload_started = Date.now()
    tracking_data =
      size_bytes: file.size
      size_mb: z.util.bucket_values (file.size / 1024 / 1024), [0, 5, 10, 15, 20, 25]
      type: z.util.get_file_extension file.name
    conversation_type = if conversation_et.is_one2one() then z.tracking.attribute.ConversationType.ONE_TO_ONE else z.tracking.attribute.ConversationType.GROUP
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_INITIATED,
      $.extend tracking_data, {conversation_type: conversation_type}
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
      action: 'file', conversation_type: conversation_type

    @send_encrypted_asset_metadata conversation_et, file
    .then (record) =>
      message_et = conversation_et.get_message_by_id record.mapped.id
      @send_encrypted_asset conversation_et, file, record.mapped.id
    .then =>
      upload_duration = (Date.now() - upload_started) / 1000
      @logger.log "Finished to upload asset for conversation'#{conversation_et.id} in #{upload_duration}"
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_SUCCESSFUL,
        $.extend tracking_data, {time: upload_duration}
    .catch (error) =>
      @logger.log "Failed to upload asset for conversation'#{conversation_et.id}", error
      if message_et.id
        @send_encrypted_asset_upload_failed conversation_et, message_et.id
        @update_message_as_upload_failed message_et
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_FAILED, tracking_data

  ###
  Delete message in conversation.

  @param conversation_et [z.entity.Conversation] Conversation to post the file
  @param message_et [z.entity.Message] Message object
  ###
  delete_message: (message_et) =>
    conversation_et = @active_conversation()
    if message_et?
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'deleted', @_construct_delete conversation_et.id, message_et.id

      @_send_encrypted_value @self_conversation().id, generic_message
      .then =>
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.DELETED_MESSAGE, {mode: 'single'}
        return @_delete_message conversation_et, message_et.id
      .catch (error) ->
        @logger.log "Failed to send delete message with id '#{message_id}' for conversation '#{conversation_et.id}'", error

  ###
  Can user upload assets to conversation.

  # TODO move to conversation et

  @param conversation_et [z.entity.Conversation] Conversation to rename
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

  message_deleted: (event_json) =>
    conversation_id = event_json.data.conversation_id
    message_id = event_json.data.message_id

    if conversation_id? and message_id?
      conversation_et = @find_conversation_by_id conversation_id
      @_delete_message conversation_et, message_id
    else
      @logger.log "Failed to delete message with id '#{message_id}'' for conversation '#{conversation_et.id}'"

  ###
  A message or ping received in a conversation.
  @param conversation_et [z.entity.Conversation] Conversation to add the event to
  @param event_json [Object] JSON data of 'conversation.message-add' or 'conversation.knock' event
  ###
  add_event: (conversation_et, event_json) =>
    @_add_event_to_conversation event_json, conversation_et, (message_et) =>
      @_send_event_notification event_json, conversation_et, message_et

  ###
  An asset was uploaded
  @param event_json [Object] JSON data of 'conversation.asset-upload-complete' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  asset_upload_complete: (conversation_et, event_json) ->
    message_et = conversation_et.get_message_by_id event_json.id

    if not message_et?
      return @logger.log @logger.levels.ERROR, "Upload complete: Could not find message with id '#{event_json.id}'", event_json

    @update_message_as_upload_complete conversation_et, message_et, event_json.data

  ###
  An asset failed
  @param event_json [Object] JSON data of 'conversation.asset-upload-failed' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  asset_upload_failed: (conversation_et, event_json) ->
    message_et = conversation_et.get_message_by_id event_json.id

    if not message_et?
      return @logger.log @logger.levels.ERROR, "Upload failed: Could not find message with id '#{event_json.id}'", event_json

    if event_json.data.reason is z.assets.AssetUploadFailedReason.CANCELLED
      @_delete_message conversation_et, message_et.id
    else
      @update_message_as_upload_failed message_et

  ###
  An asset preview was send
  @param event_json [Object] JSON data of 'conversation.asset-upload-failed' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  asset_preview: (conversation_et, event_json) ->
    message_et = conversation_et.get_message_by_id event_json.id

    if not message_et?
      return @logger.log @logger.levels.ERROR, 'Asset preview: Could not find message with id '#{event_json.id}'", event_json

    @update_message_with_asset_preview conversation_et, message_et, event_json.data

  ###
  A conversation was created.
  @param event_json [Object] JSON data of 'conversation.create' event
  @return [z.entity.Conversation] The conversation that was created
  ###
  create: (event_json) =>
    conversation_et = @find_conversation_by_id event_json.id

    if not conversation_et?
      conversation_et = @conversation_mapper.map_conversation event_json
      @update_participating_user_ets conversation_et, (conversation_et) =>
        @_send_conversation_create_notification conversation_et
      @save_conversation conversation_et

    return conversation_et

  ###
  User were added to a group conversation.
  @param conversation_et [z.entity.Conversation] Conversation to add users to
  @param event_json [Object] JSON data of 'conversation.member-join' event
  ###
  member_join: (conversation_et, event_json) =>
    for user_id in event_json.data.user_ids when user_id isnt @user_repository.self().id
      conversation_et.participating_user_ids.push user_id if user_id not in conversation_et.participating_user_ids()

    # Self user joins again
    if @user_repository.self().id in event_json.data.user_ids
      conversation_et.removed_from_conversation false

    @update_participating_user_ets conversation_et, =>
      @_add_event_to_conversation event_json, conversation_et, (message_et) ->
        amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et

  ###
  Members of a group conversation were removed or left.
  @param conversation_et [z.entity.Conversation] Conversation to remove users from
  @param event_json [Object] JSON data of 'conversation.member-leave' event
  ###
  member_leave: (conversation_et, event_json) =>
    @_add_event_to_conversation event_json, conversation_et, (message_et) =>
      for user_et in message_et.user_ets()
        if conversation_et.call()
          if user_et.is_me
            amplify.publish z.event.WebApp.CALL.STATE.DELETE, conversation_et.id
          else
            amplify.publish z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, conversation_et.id, user_et.id
        conversation_et.participating_user_ids.remove user_et.id
        continue if not user_et.is_me

        conversation_et.removed_from_conversation true
        if conversation_et.call()
          amplify.publish z.event.WebApp.CALL.STATE.LEAVE, conversation_et.id

      @update_participating_user_ets conversation_et, ->
        amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et

  ###
  Membership properties for a conversation were updated.

  @param conversation_et [z.entity.Conversation] Conversation entity that will be updated
  @param event_json [Object] JSON data of 'conversation.member-update' event
  @param conversation_et [z.entity.Conversation] Next conversation in list
  ###
  member_update: (conversation_et, event_json, next_conversation_et) =>
    previously_archived = conversation_et.is_archived()
    next_conversation_et = @get_next_conversation conversation_et if not next_conversation_et?

    @conversation_mapper.update_self_status conversation_et, event_json.data

    if previously_archived and not conversation_et.is_archived()
      @_fetch_users_and_events conversation_et
    else if conversation_et.is_archived()
      amplify.publish z.event.WebApp.CONVERSATION.SWITCH, conversation_et, next_conversation_et

  ###
  A conversation was renamed.
  @param conversation_et [z.entity.Conversation] Conversation entity that will be renamed
  @param event_json [Object] JSON data of 'conversation.rename' event
  ###
  rename: (conversation_et, event_json) =>
    @_add_event_to_conversation event_json, conversation_et, (message_et) =>
      @conversation_mapper.update_properties conversation_et, event_json.data
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et


  ###############################################################################
  # Private
  ###############################################################################

  ###
  Convert a JSON event into an entity and add it to a given conversation.

  @param json [Object] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the event will be added to
  @param callback [Function] Function to be called on return
  ###
  _add_event_to_conversation: (json, conversation_et, callback) ->
    message_et = @event_mapper.map_json_event json, conversation_et
    @_update_user_ets message_et, (message_et) =>
      if conversation_et
        conversation_et.add_message message_et
      else
        @logger.log @logger.levels.ERROR,
          "Message cannot be added to unloaded conversation. Message type: #{message_et.type}"
        error = new Error 'Conversation not loaded, message cannot be added'
        custom_data =
          message_type: message_et.type
        Raygun.send error, custom_data
      callback? message_et

  ###
  Convert multiple JSON events into entities and add them to a given conversation.

  @param json [Object] Event data
  @param conversation_et [z.entity.Conversation] Conversation entity the events will be added to
  @param prepend [Boolean] Should existing messages be prepended
  ###
  _add_events_to_conversation: (json, conversation_et, prepend = true) ->
    return if not json?

    message_ets = @event_mapper.map_json_events json, conversation_et
    for message_et in message_ets
      @_update_user_ets message_et
    if prepend and conversation_et.messages().length > 0
      conversation_et.prepend_messages message_ets
    else
      conversation_et.add_messages message_ets

  ###
  Check for duplicates by event IDs and cache the event ID.

  @private
  @param message_et [z.entity.Message] Message entity
  @param conversation_et [z.entity.Conversation] Conversation entity
  @return [Boolean] Returns true if event is a duplicate
  ###
  _check_for_duplicate_event_by_nonce: (message_et, conversation_et) ->
    return false if not message_et.nonce
    event_nonce = "#{conversation_et.id}:#{message_et.nonce}:#{message_et.assets?()[0].type or message_et.super_type}"
    if @processed_event_nonces[event_nonce] is undefined
      @processed_event_nonces[event_nonce] = null
      # @todo Maybe we need to reset "@processed_event_nonces" someday to save some memory, until now it's fine.
      return false
    else
      @logger.log @logger.levels.WARN, "Event with nonce has been already processed : #{event_nonce}", message_et
      amplify.publish z.event.WebApp.ANALYTICS.EVENT,
        z.tracking.SessionEventName.INTEGER.EVENT_HIDDEN_DUE_TO_DUPLICATE_NONCE
      return true

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
    @user_repository.get_user_by_id conversation_et.creator, (user_et)  ->
      message_et = new z.entity.MemberMessage()
      message_et.user user_et
      message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et

  ###
  Forward the event to the SystemNotification repository for browser and audio notifications.

  @private
  @param event_json [Object] JSON data of received event
  @param conversation_et [z.entity.Conversation] Conversation that was created
  @param message_et [z.entity.Message] Message that has been received
  ###
  _send_event_notification: (event_json, conversation_et, message_et) ->
    amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et

  ###
  Listener for incoming events from the WebSocket.

  @private
  @note We check for events received multiple times via the WebSocket by event id here
  @param event [Object] JSON data for event
  ####
  on_conversation_event: (event) =>
    if not event
      error = new Error('Event response is undefined')
      custom_data =
        source: 'WebSocket'
      Raygun.send error, custom_data

    @logger.log "»» Event: '#{event.type}'", {event_object: event, event_json: JSON.stringify event}

    # Ignore member join if we join a one2one conversation (accept a connection request)
    if event.type is z.event.Backend.CONVERSATION.MEMBER_JOIN
      connection_et = @user_repository.get_connection_by_conversation_id event.conversation
      return if connection_et?.status() is z.user.ConnectionStatus.PENDING

    # Check if conversation was archived
    @get_conversation_by_id event.conversation, (conversation_et) =>
      previously_archived = conversation_et.is_archived()

      switch event.type
        when z.event.Backend.CONVERSATION.CREATE
          @create event
        when z.event.Backend.CONVERSATION.MEMBER_JOIN
          @member_join conversation_et, event
        when z.event.Backend.CONVERSATION.MEMBER_LEAVE
          @member_leave conversation_et, event
        when z.event.Backend.CONVERSATION.MEMBER_UPDATE
          @member_update conversation_et, event
        when z.event.Backend.CONVERSATION.RENAME
          @rename conversation_et, event
        when z.event.Backend.CONVERSATION.ASSET_UPLOAD_COMPLETE
          @asset_upload_complete conversation_et, event
        when z.event.Backend.CONVERSATION.ASSET_UPLOAD_FAILED
          @asset_upload_failed conversation_et, event
        when z.event.Backend.CONVERSATION.ASSET_PREVIEW
          @asset_preview conversation_et, event
        when z.event.Backend.CONVERSATION.MESSAGE_DELETE
          @message_deleted event
        else
          @add_event conversation_et, event

      # Un-archive it also on the backend side
      if not @is_handling_notifications and previously_archived and not conversation_et.is_archived()
        @logger.log @logger.levels.INFO, "Unarchiving conversation '#{conversation_et.id}' with new event"
        @unarchive_conversation conversation_et

  ###
  Updates the user entities that are part of a message.
  @param message_et [z.entity.Message] Message to be updated
  @param callback [Function] Function to be called on return
  ###
  _update_user_ets: (message_et, callback) =>
    @user_repository.get_user_by_id message_et.from, (user_et) =>
      message_et.user user_et
      if message_et.is_member()
        @user_repository.get_users_by_id message_et.user_ids(), (user_ets) ->
          message_et.user_ets user_ets
      else if message_et.has_asset_text()
        for asset_et in message_et.assets() when asset_et.is_text()
          if not message_et.user()
            Raygun.send new Error 'Message does not contain user when updating'
          else
            asset_et.theme_color = message_et.user().accent_color()
      callback? message_et

  ###
  Cancel asset upload.
  @param message_et [z.entity.Message] message_et on which the cancel was initiated
  ###
  cancel_asset_upload: (message_et) =>
    conversation_et = @active_conversation()
    @asset_service.cancel_asset_upload message_et.assets()[0].upload_id()
    @_delete_message conversation_et, message_et.id
    @send_encrypted_asset_upload_failed conversation_et, message_et.id, z.assets.AssetUploadFailedReason.CANCELLED

  _handle_deleted_clients: (deleted_client_map, payload) ->
    return Promise.resolve()
    .then =>
      if _.isEmpty deleted_client_map
        @logger.log @logger.levels.INFO, 'No obsolete clients that need to be removed'
        return payload
      else
        @logger.log @logger.levels.INFO, 'Removing payload for deleted clients', deleted_client_map
        delete_promises = []
        for user_id, client_ids of deleted_client_map
          for client_id in client_ids
            @logger.log @logger.levels.WARN, "The client '#{client_id}' from '#{user_id}' is obsolete and will be removed"
            delete payload.recipients[user_id][client_id]
            delete_promises.push @user_repository.client_repository.delete_client_and_session user_id, client_id
          delete payload.recipients[user_id] if Object.keys(payload.recipients[user_id]).length is 0

        Promise.all delete_promises
        .then ->
          return payload

  _handle_missing_clients: (missing_client_map, generic_message, payload) ->
    return Promise.resolve()
    .then =>
      if _.isEmpty missing_client_map
        @logger.log @logger.levels.INFO, 'No missing clients that need to be added'
        return payload
      else
        @logger.log @logger.levels.INFO, "Adding payload for missing clients of '#{Object.keys(missing_client_map).length}' users", missing_client_map
        save_promises = []

        @cryptography_repository.encrypt_generic_message missing_client_map, generic_message, payload
        .then (updated_payload) =>
          payload = updated_payload
          for user_id, client_ids of missing_client_map
            for client_id in client_ids
              save_promises.push @user_repository.add_client_to_user user_id, new z.client.Client {id: client_id}

          return Promise.all save_promises
        .then ->
          return payload

  _update_payload_for_changed_clients: (error_response, generic_message, payload) =>
    return Promise.resolve()
    .then =>
      if error_response.missing
        @logger.log @logger.levels.WARN, 'Payload for clients was missing', error_response
        @_handle_deleted_clients error_response.deleted, payload
        .then (updated_payload) =>
          return @_handle_missing_clients error_response.missing, generic_message, updated_payload
      else
        throw error_response

  ###
  Delete message from UI an database
  @param conversation_et [z.entity.Conversation] Conversation that contains the message
  @param message_id [String] Message to delete
  ###
  _delete_message: (conversation_et, message_id) =>
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
    resource = z.assets.AssetRemoteData.v2 conversation_et.id, asset_data.id, asset_data.otr_key, asset_data.sha256
    asset_et = message_et.get_first_asset()
    asset_et.preview_resource resource
    @conversation_service.update_asset_preview_in_db message_et.primary_key, asset_data


  ###############################################################################
  # Helpers
  ###############################################################################

  ###
  Archive all conversations but not the self conversation.
  @note Archiving the self conversation will lead to problems on other clients (like Android).
  ###
  archive_all_conversations: =>
    @archive_conversation conversation_et for conversation_et in @conversations() when not conversation_et.is_self()

  ###
  Clear and leave all conversations but not the self conversation.
  ###
  clear_all_conversations: =>
    @clear_conversation conversation_et, conversation_et.is_group() for conversation_et in @conversations_unarchived()

  ###
  Un-archive all conversations (and even the self conversation).
  @note Un-archiving all conversations can help to reset the client to a proper state.
  ###
  unarchive_all_conversations: =>
    @unarchive_conversation conversation_et for conversation_et in @conversations()


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
  Analyze sent text message for rich media content.
  @private
  @param message [String] Message content to be checked for rich media
  ###
  _analyze_sent_message: (message) ->
    soundcloud_links = message.match z.media.MediaEmbeds.regex.soundcloud
    if soundcloud_links
      amplify.publish z.event.WebApp.ANALYTICS.EVENT,
        z.tracking.SessionEventName.INTEGER.SOUNDCLOUD_LINKS_SENT, soundcloud_links.length

    youtube_links = message.match z.media.MediaEmbeds.regex.youtube
    if youtube_links
      amplify.publish z.event.WebApp.ANALYTICS.EVENT,
        z.tracking.SessionEventName.INTEGER.YOUTUBE_LINKS_SENT, youtube_links.length

  ###
  Analyze sent text message for rich media content.
  @param client [Object]
  ###
  on_self_client_add: (client) =>
    return
    self = @user_repository.self()
    message_et = new z.entity.E2EEDeviceMessage()
    message_et.user self
    message_et.device client
    message_et.device_owner self

    # TODO save message
    for conversation_et in @filtered_conversations()
      if conversation_et.type() in [z.conversation.ConversationType.ONE2ONE, z.conversation.ConversationType.REGULAR]
        conversation_et.add_message message_et
