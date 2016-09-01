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

# Conversation service for all conversation calls to the backend REST API.
class z.conversation.ConversationService
  URL_CONVERSATIONS: '/conversations'
  ###
  Construct a new Conversation Service.

  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client, @storage_service) ->
    @logger = new z.util.Logger 'z.conversation.ConversationService', z.config.LOGGER.OPTIONS

  ###
  Saves a conversation entity in the local database.

  @param conversation_et [z.entity.Conversation] Conversation entity
  @return [Promise<String>] Promise that will resolve with the primary key of the persisted conversation entity
  ###
  _save_conversation_in_db: (conversation_et) ->
    return new Promise (resolve, reject) =>
      store_name = @storage_service.OBJECT_STORE_CONVERSATIONS
      @storage_service.save store_name, conversation_et.id, conversation_et.serialize()
      .then (primary_key) =>
        @logger.log @logger.levels.INFO, "Conversation '#{primary_key}' was stored for the first time"
        resolve conversation_et
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Conversation '#{conversation_et.id}' could not be stored", error
        reject error

  ###
  Updates a conversation entity in the database.

  @param updated_field [z.conversation.ConversationUpdateType] Property of the conversation entity which needs to be updated in the local database
  @return [Promise<String|z.entity.Conversation>] Promise which resolves with the conversation entity (if update was successful) or the conversation entity (if it was a new entity)
  ###
  _update_conversation_in_db: (conversation_et, updated_field) ->
    return new Promise (resolve, reject) =>
      store_name = @storage_service.OBJECT_STORE_CONVERSATIONS

      switch updated_field
        when z.conversation.ConversationUpdateType.ARCHIVED_STATE
          entity =
            archived_state: conversation_et.archived_state()
            archived_timestamp: conversation_et.archived_timestamp()
        when z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP
          entity = cleared_timestamp: conversation_et.cleared_timestamp()
        when z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP
          entity = last_event_timestamp: conversation_et.last_event_timestamp()
        when z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP
          entity = last_read_timestamp: conversation_et.last_read_timestamp()
        when z.conversation.ConversationUpdateType.MUTED_STATE
          entity =
            muted_state: conversation_et.muted_state()
            muted_timestamp: conversation_et.muted_timestamp()

      @storage_service.update store_name, conversation_et.id, entity
      .then (number_of_updated_records) =>
        if number_of_updated_records
          @logger.log @logger.levels.INFO,
            "Conversation '#{conversation_et.id}' got a persistent update for property '#{updated_field}'"
          resolve conversation_et
        else
          @_save_conversation_in_db conversation_et
      .catch (error) =>
        @logger.log @logger.levels.ERROR, "Conversation '#{conversation_et.id}' could not be updated", error
        reject error

  ###############################################################################
  # Create conversations
  ###############################################################################

  ###
  Create a new conversation.

  @note Supply at least 2 user IDs! Do not include the requestor
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation

  @param user_ids [Array<String>] IDs of users (excluding the requestor) to be part of the conversation
  @param name [String] User defined name for the Conversation (optional)
  @param callback [Function] Function to be called on server return
  ###
  create_conversation: (user_ids, name, callback) ->
    @client.send_json
      url: @client.create_url z.conversation.ConversationService::URL_CONVERSATIONS
      type: 'POST'
      data:
        users: user_ids
        name: name
      callback: callback

  ###
  Create a One:One conversation.

  @note Do not include the requestor
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createOne2OneConversation

  @param user_ids [Array<String>] IDs of users (excluding the requestor) to be part of the conversation
  @param name [String] User defined name for the Conversation (optional)
  @param callback [Function] Function to be called on server return
  ###
  create_one_to_one_conversation: (user_ids, name, callback) ->
    @client.send_json
      url: @client.create_url '/conversations/one2one'
      type: 'POST'
      data:
        users: user_ids
        name: name
      callback: callback

  ###############################################################################
  # Get conversations
  ###############################################################################

  ###
  Retrieves meta information about all the conversations of a user.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversations

  @param limit [Integer] Number of results to return (default 100, max 100)
  @param conversation_id [String] Conversation ID to start from
  ###
  get_conversations: (limit = 100, conversation_id = undefined) ->
    @client.send_request
      url: @client.create_url z.conversation.ConversationService::URL_CONVERSATIONS
      type: 'GET'
      data:
        size: limit
        start: conversation_id

  ###
  Get a conversation by ID.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversation

  @param conversation_id [String] ID of conversation to get
  @param callback [Function] Function to be called on server return
  ###
  get_conversation_by_id: (conversation_id, callback) ->
    @client.send_request
      url: @client.create_url "/conversations/#{conversation_id}"
      type: 'GET'
      callback: callback

  ###
  Get the last (i.e. most current) event ID per conversation.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/lastEvents
  @todo Implement paging for this endpoint

  @param callback [Function] Function to be called on server return
  ###
  get_last_events: (callback) ->
    @client.send_request
      url: @client.create_url '/conversations/last-events'
      type: 'GET'
      callback: callback

  ###############################################################################
  # Send events
  ###############################################################################

  ###
  Remove member from conversation.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/removeMember

  @param conversation_id [String] ID of conversation to remove member from
  @param user_id [String] ID of member to be removed from the the conversation
  @param callback [Function] Function to be called on server return
  ###
  delete_members: (conversation_id, user_id, callback) ->
    @client.send_request
      url: @client.create_url "/conversations/#{conversation_id}/members/#{user_id}"
      type: 'DELETE'
      callback: callback

  ###
  Delete a message from a conversation with the given primary.

  @param conversation_id [String] ID of conversation to remove message from
  @param message_id [String] ID of the actual message
  @return [Promise] Resolves with the number of deleted records
  ###
  delete_message_with_key_from_db: (conversation_id, primary_key) ->
    @storage_service.db[@storage_service.OBJECT_STORE_CONVERSATION_EVENTS].delete primary_key

  ###
  Delete a message from a conversation. Duplicates are delete as well.

  @param conversation_id [String] ID of conversation to remove message from
  @param message_id [String] ID of the actual message
  @return [Promise] Resolves with the number of deleted records
  ###
  delete_message_from_db: (conversation_id, message_id) ->
    @storage_service.db[@storage_service.OBJECT_STORE_CONVERSATION_EVENTS]
    .where 'conversation'
    .equals conversation_id
    .and (record) -> record.id is message_id
    .delete()

  ###
  Delete all message of a conversation.
  @param conversation_id [String] Delete messages for this conversation
  ###
  delete_messages_from_db: (conversation_id) ->
    @storage_service.db[@storage_service.OBJECT_STORE_CONVERSATION_EVENTS]
    .where 'conversation'
    .equals conversation_id
    .delete()

  ###
  Update a message in the database.
  @param message_et [z.entity.Message] Message event to update in the database
  @param changes [Object] Changes to update message with
  ###
  update_message_in_db: (message_et, changes) ->
    Promise.resolve message_et.primary_key or z.storage.StorageService.construct_primary_key message_et
    .then (primary_key) =>
      if _.isObject(changes) and changes[Object.keys(changes)[0]]?
        return @storage_service.update @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key, changes
      throw new z.conversation.ConversationError z.conversation.ConversationError::TYPE.NO_CHANGES

  ###
  Update asset as uploaded in database.
  @param primary_key [String] Primary key used to find an event in the database
  ###
  update_asset_as_uploaded_in_db: (primary_key, asset_data) ->
    @storage_service.load @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key
    .then (record) =>
      record.data.id = asset_data.id
      record.data.otr_key = asset_data.otr_key
      record.data.sha256 = asset_data.sha256
      record.data.status = z.assets.AssetTransferState.UPLOADED
      @storage_service.update @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key, record
    .then =>
      @logger.log 'Updated asset message_et (uploaded)', primary_key

  ###
  Update asset with preview in database.
  @param primary_key [String] Primary key used to find an event in the database
  ###
  update_asset_preview_in_db: (primary_key, asset_data) ->
    @storage_service.load @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key
    .then (record) =>
      record.data.preview_id = asset_data.id
      record.data.preview_otr_key = asset_data.otr_key
      record.data.preview_sha256 = asset_data.sha256
      @storage_service.update @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key, record
    .then =>
      @logger.log 'Updated asset message_et (preview)', primary_key

  ###
  Update asset as failed in database.
  @param primary_key [String] Primary key used to find an event in the database
  ###
  update_asset_as_failed_in_db: (primary_key, reason) ->
    @storage_service.load @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key
    .then (record) =>
      record.data.status = z.assets.AssetTransferState.UPLOAD_FAILED
      record.data.reason = reason
      @storage_service.update @storage_service.OBJECT_STORE_CONVERSATION_EVENTS, primary_key, record
    .then =>
      @logger.log 'Updated asset message_et (failed)', primary_key

  ###
  Loads conversation states from the local database.
  @return [Promise] Promise that resolves with all the stored conversation states
  ###
  load_conversation_states_from_db: =>
    return new Promise (resolve, reject) =>
      @storage_service.get_all @storage_service.OBJECT_STORE_CONVERSATIONS
      .then (conversation_states) =>
        @logger.log @logger.levels.INFO, "Loaded '#{conversation_states.length}' local conversation states", conversation_states
        resolve conversation_states
      .catch (error) =>
        @logger.log @logger.levels.ERROR, 'Failed to load local conversation states', error
        reject error

  ###
  Load conversation event.
  @param conversation_id [String] ID of conversation
  @param message_id [String]
  ###
  load_event_from_db: (conversation_id, message_id) ->
    return new Promise (resolve, reject) =>
      @storage_service.db[@storage_service.OBJECT_STORE_CONVERSATION_EVENTS]
      .where 'conversation'
      .equals conversation_id
      .filter (record) -> record.id is message_id
      .first()
      .then (record) ->
        resolve record
      .catch (error) =>
        @logger.log @logger.levels.ERROR,
          "Failed to get event for conversation '#{conversation_id}': #{error.message}", error
        reject error

  ###
  Load conversation events. Start and end are not included.
  Events are always sorted beginning with the newest timestamp.

  @param conversation_id [String] ID of conversation
  @param start [Number] starting from this timestamp
  @param end [Number] stop when reaching timestamp
  @param limit [Number] Amount of events to load
  @return [Promise] Promise that resolves with the retrieved records
  ###
  load_events_from_db: (conversation_id, start, end, limit) ->
    @storage_service.db[@storage_service.OBJECT_STORE_CONVERSATION_EVENTS]
    .where 'conversation'
    .equals conversation_id
    .reverse()
    .sortBy 'time'
    .then (records) ->
      return records.filter (record) ->
        timestamp = new Date(record.time).getTime()
        return false if start and timestamp >= start
        return false if end and timestamp <= end
        return true
    .then (records) ->
      return records.slice 0, limit
    .catch (error) =>
      @logger.log @logger.levels.ERROR,
        "Failed to get events for conversation '#{conversation_id}': #{error.message}", error
      throw error

  ###
  Add users to an existing conversation.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/addMembers

  @param conversation_id [String] ID of conversation to add users to
  @param user_ids [Array<String>] IDs of users to be added to the conversation
  @return [Promise] Promise that resolves with the server response
  ###
  post_members: (conversation_id, user_ids) ->
    @client.send_json
      url: @client.create_url "/conversations/#{conversation_id}/members"
      type: 'POST'
      data:
        users: user_ids

  ###
  Post an encrypted message to a conversation.
  @note If "recipients" are not specified you will receive a list of all missing OTR recipients (user-client-map).
  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/postOtrMessage
  @example How to send "recipients" payload
  "recipients": {
    "<user-id>": {
      "<client-id>": "<base64-encoded-encrypted-content>"
    }
  }

  @note Options for the precondition check on missing clients are:
    'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending  @param conversation_id [String] ID of conversation to send message in
  @param payload [Object] Payload to be posted
  @option [OtrRecipients] recipients Map with per-recipient data
  @option [String] sender Client ID of the sender
  @param precondition_option [Array<String>|Boolean] Level that backend checks for missing clients
  @return [Promise] Promise that resolve when the message was sent
  ###
  post_encrypted_message: (conversation_id, payload, precondition_option) ->
    url = @client.create_url "/conversations/#{conversation_id}/otr/messages"
    if _.isArray precondition_option
      url = "#{url}?report_missing=#{precondition_option.join ','}"
    else if precondition_option
      url = "#{url}?ignore_missing=true"

    @client.send_json
      url: url
      type: 'POST'
      data: payload

  ###
  Saves or updates a conversation entity in the local database.

  @param conversation_et [z.entity.Conversation] Conversation entity
  @param updated_field [z.conversation.ConversationUpdateType] Property of the conversation entity which needs to be updated in the local database
  @return [Promise<String|z.entity.Conversation>] Promise which resolves with the conversation entity (if update was successful) or the conversation entity (if it was a new entity)
  ###
  save_conversation_in_db: (conversation_et, updated_field) =>
    if updated_field
      @_update_conversation_in_db conversation_et, updated_field
    else
      @_save_conversation_in_db conversation_et

  ###
  Update conversation properties.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversation

  @param conversation_id [String] ID of conversation to rename
  @param name [String] New conversation name
  @param callback [Function] Function to be called on server return
  ###
  update_conversation_properties: (conversation_id, name, callback) ->
    @client.send_json
      url: @client.create_url "/conversations/#{conversation_id}"
      type: 'PUT'
      data:
        name: name
      callback: callback

  ###
  Update self membership properties.

  @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateSelf

  @param conversation_id [String] ID of conversation to update
  @param payload [Object] Updated properties
  @param callback [Function] Function to be called on server return
  ###
  update_member_properties: (conversation_id, payload, callback) ->
    @client.send_json
      url: @client.create_url "/conversations/#{conversation_id}/self"
      type: 'PUT'
      data: payload
      callback: (response, error) ->
        if callback?
          callback
            conversation: conversation_id
            data: data
          , error
