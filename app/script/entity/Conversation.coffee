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
z.entity ?= {}

# Conversation entity.
class z.entity.Conversation
  ###
  Construct a new conversation entity.
  @param conversation_id [String] Conversation ID
  ###
  constructor: (conversation_id = '') ->
    @id = conversation_id
    @creator = undefined
    @type = ko.observable()
    @name = ko.observable()
    @input = ko.observable z.storage.get_value("#{z.storage.StorageKey.CONVERSATION.INPUT}|#{@id}") or ''
    @input.subscribe (text) =>
      z.storage.set_value "#{z.storage.StorageKey.CONVERSATION.INPUT}|#{@id}", text

    @is_pending = ko.observable false
    @is_loaded = ko.observable false

    @all_user_ids = ko.observableArray []
    @participating_user_ets = ko.observableArray [] # Does not include us
    @participating_user_ids = ko.observableArray []
    @self = undefined
    @number_of_participants = ko.pureComputed => return @participating_user_ids().length

    @is_group = ko.pureComputed => @type() is z.conversation.ConversationType.REGULAR
    @is_one2one = ko.pureComputed => @type() is z.conversation.ConversationType.ONE2ONE
    @is_request = ko.pureComputed => @type() is z.conversation.ConversationType.CONNECT
    @is_self = ko.pureComputed => @type() is z.conversation.ConversationType.SELF

    # in case this is a one2one conversation this is the connection to that user
    @connection = ko.observable new z.entity.Connection()
    @connection.subscribe (connection_et) => @participating_user_ids [connection_et.to]

    ###############################################################################
    # E2EE conversation states
    ###############################################################################

    @archived_state = ko.observable false
    @muted_state = ko.observable false

    @archived_timestamp = ko.observable 0
    @cleared_timestamp = ko.observable 0
    @last_event_timestamp = ko.observable 0
    @last_read_timestamp = ko.observable 0
    @muted_timestamp = ko.observable 0

    ###############################################################################
    # Conversation states for view
    ###############################################################################

    @is_muted = ko.pureComputed =>
      return @muted_state()

    @is_archived = ko.pureComputed =>
      archived = @last_event_timestamp() <= @archived_timestamp()
      if archived then return @archived_state() else return @archived_state() and @muted_state()

    @is_cleared = ko.pureComputed =>
      return @last_event_timestamp() <= @cleared_timestamp()

    @is_verified = ko.pureComputed =>
      return false if @participating_user_ets().length is 0
      return @participating_user_ets().every (user_et) -> user_et.is_verified()

    @removed_from_conversation = ko.observable false
    @removed_from_conversation.subscribe (is_removed) =>
      @archived_state false if not is_removed

    ###############################################################################
    # Messages
    ###############################################################################

    @messages_unordered = ko.observableArray()
    @messages = ko.pureComputed => @messages_unordered().sort (a, b) -> a.timestamp - b.timestamp
    @messages.subscribe => @update_latest_from_message @get_last_message()

    @creation_message = undefined

    @has_further_messages = ko.observable true

    @messages_visible = ko.pureComputed =>
      return [] if @id is ''
      message_ets = (message_et for message_et in @messages() when message_et.visible())

      first_message = @get_first_message()
      if not @has_further_messages() and not (first_message?.is_member() and first_message.is_creation())
        @creation_message ?= @_creation_message()
        message_ets.unshift @creation_message if @creation_message?
      return message_ets
    .extend trackArrayChanges: true

    # Call related
    @call = ko.observable undefined
    @has_active_call = ko.pureComputed =>
      return false if not @call()
      return @call().state() not in z.calling.enum.CallStateGroups.IS_ENDED and not @call().is_ongoing_on_another_client()

    @unread_events = ko.pureComputed =>
      unread_event = []
      for message_et in @messages() when message_et.visible() by -1
        break if message_et.timestamp <= @last_read_timestamp()
        unread_event.push message_et
      return unread_event

    @number_of_unread_events = ko.pureComputed =>
      return @unread_events().length

    @number_of_unread_messages = ko.pureComputed =>
      return (message_et for message_et in @unread_events() when not message_et.user().is_me).length

    @unread_type = ko.pureComputed =>
      return z.conversation.ConversationUnreadType.CONNECT if @connection().status() is z.user.ConnectionStatus.SENT
      unread_type = z.conversation.ConversationUnreadType.UNREAD
      return unread_type if @number_of_unread_messages() <= 0
      for message in @unread_events() by -1
        return z.conversation.ConversationUnreadType.MISSED_CALL if message.finished_reason is z.calling.enum.CallFinishedReason.MISSED
        return z.conversation.ConversationUnreadType.PING if message.is_ping()
      return unread_type
    @unread_type.extend rateLimit: 50

    ###
    Display name strategy:

    @note 'One-to-One Conversations' and 'Connection Requests'
      We should not use the conversation name received from the backend as fallback as it will always contain the
      name of the user who received the connection request initially

      - Name of the other participant
      - Name of the other user of the associated connection
      - "..." if neither of those has been attached yet

      'Group Conversation'

      - Conversation name received from backend
      - If unnamed, we will create a name from the participant names
      - Join the user's first names to a comma separated list or uses the user's first name if only one user participating
      - "..." if the user entities have not yet been attached yet
    ###
    @display_name = ko.pureComputed
      read: ->
        if @type() in [z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE]
          return @participating_user_ets()[0].name() if @participating_user_ets()[0]?.name()
          return z.localization.Localizer.get_text z.string.truncation
        else if @is_group()
          return @name() if @name()
          return (@participating_user_ets().map (user_et) -> user_et.first_name()).join ', ' if @participating_user_ets().length > 0
          return z.localization.Localizer.get_text z.string.conversations_empty_conversation if @participating_user_ids().length is 0
          return z.localization.Localizer.get_text z.string.truncation
        else
          return @name()
      write: (value) -> return
      owner: @

    amplify.subscribe z.event.WebApp.CONVERSATION.LOADED_STATES, @_subscribe_to_states_updates

  _subscribe_to_states_updates: =>
    @archived_state.subscribe =>
      amplify.publish z.event.WebApp.CONVERSATION.STORE, @, z.conversation.ConversationUpdateType.ARCHIVED_STATE
    @cleared_timestamp.subscribe =>
      amplify.publish z.event.WebApp.CONVERSATION.STORE, @, z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP
    @last_event_timestamp.subscribe =>
      amplify.publish z.event.WebApp.CONVERSATION.STORE, @, z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP
    @last_read_timestamp.subscribe =>
      amplify.publish z.event.WebApp.CONVERSATION.STORE, @, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP
    @muted_state.subscribe =>
      amplify.publish z.event.WebApp.CONVERSATION.STORE, @, z.conversation.ConversationUpdateType.MUTED_STATE

  ###############################################################################
  # Lifecycle
  ###############################################################################

  # Remove all message from conversation unless there are unread events
  release: =>
    if @number_of_unread_events() is 0
      @remove_messages()
      @is_loaded false
      @has_further_messages true

  ###############################################################################
  # E2EE state setters
  ###############################################################################

  ###
  Set the timestamp of a given type.

  @note This will only increment timestamps

  @param timestamp [String] Timestamp to be set
  @param type [z.conversation.ConversationUpdateType] Type of timestamp to be updated
  @return [String] Timestamp value
  ###
  set_timestamp: (timestamp, type) =>
    switch type
      when z.conversation.ConversationUpdateType.ARCHIVED_TIMESTAMP
        entity_timestamp = @archived_timestamp
      when z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP
        entity_timestamp = @cleared_timestamp
      when z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP
        entity_timestamp = @last_event_timestamp
      when z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP
        entity_timestamp = @last_read_timestamp
      when z.conversation.ConversationUpdateType.MUTED_TIMESTAMP
        entity_timestamp = @muted_timestamp

    updated_timestamp = @_increment_time_only entity_timestamp(), timestamp
    if updated_timestamp
      entity_timestamp updated_timestamp
    return updated_timestamp

  ###
  Increment only on timestamp update

  @param current_timestamp [z.entity.Conversation] Current timestamp
  @param updated_timestamp [String] Timestamp from update
  @return [String, Boolean] Updated timestamp or false if not increased
  ###
  _increment_time_only: (current_timestamp, updated_timestamp) ->
    if updated_timestamp > current_timestamp then return updated_timestamp else return false

  ###############################################################################
  # Messages
  ###############################################################################

  ###
  Adds a single message to the conversation.
  @param message_et [z.entity.Message] Message entity to be added to the conversation
  ###
  add_message: (message_et) ->
    @_update_last_read_from_message message_et
    @messages_unordered.push @_check_for_duplicate_nonce message_et, @get_last_message()

  ###
  Adds multiple messages to the conversation.
  @param message_ets [z.entity.Message[]] Array of message entities to be added to the conversation
  ###
  add_messages: (message_ets) ->
    for message_et, i in message_ets
      message_et = @_check_for_duplicate_nonce message_ets[i - 1], message_et

    # in order to avoid multiple db writes check the messages from the end and stop once
    # we found a message from self user
    for message_et in message_ets by -1
      if message_et.user()?.is_me
        @_update_last_read_from_message message_et
        break

    z.util.ko_array_push_all @messages_unordered, message_ets

  ###
  Prepends messages with new batch of messages.
  @param message_ets [z.entity.Message[]] Array of messages to be added to conversation
  ###
  prepend_messages: (message_ets) ->
    last_message_et = message_ets[message_ets.length - 1]
    last_message_et = @_check_for_duplicate_nonce last_message_et, @get_first_message()
    for message_et, i in message_ets by -1
      message_et = @_check_for_duplicate_nonce message_ets[i - 1], message_et
    z.util.ko_array_unshift_all @messages_unordered, message_ets

  ###
  Removes message from the conversation by message id.
  @param message_id [String] ID of the message entity to be removed from the conversation
  ###
  remove_message_by_id: (message_id) ->
    for message_et in @messages_unordered() by -1
      @messages_unordered.remove message_et if message_et.id is message_id

  ###
  Removes a single message from the conversation.
  @param message_et [z.entity.Message] Message entity to be removed from the conversation
  ###
  remove_message: (message_et) ->
    @messages_unordered.remove message_et

  ###
  Removes all messages from the conversation.
  ###
  remove_messages: ->
    @messages_unordered.removeAll()

  ###
  Replace a message in the conversation.

  @param old_message_et [z.entity.Message] Message to be replaced
  @param new_message_et [z.entity.Message] Message replacing the old one
  ###
  replace_message: (old_message_et, new_message_et) ->
    @messages()[@messages.indexOf old_message_et] = new_message_et
    @messages.valueHasMutated()

  ###
  Checks for message duplicates by nonce and returns the message.

  @private
  @note If a message is send to the backend multiple times by a client they will be in the conversation multiple times

  @param message_et [z.entity.Message] Message entity to be added to the conversation
  @param other_message_et [z.entity.Message] Other message entity to compare with
  ###
  _check_for_duplicate_nonce: (message_et, other_message_et) ->
    return message_et if not message_et? or not other_message_et?
    if message_et.has_nonce() and other_message_et.has_nonce() and message_et.nonce is other_message_et.nonce
      sorted_messages = z.entity.Message.sort_by_timestamp [message_et, other_message_et]
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.SessionEventName.INTEGER.EVENT_HIDDEN_DUE_TO_DUPLICATE_NONCE
      if message_et.type is z.event.Client.CONVERSATION.ASSET_META and other_message_et.type is z.event.Client.CONVERSATION.ASSET_META
        # android sends to meta messages with the same content. we would store both and but only update the first one
        # whenever we reload the conversation the nonce check would hide the older one and we would show the non updated message
        # to fix that we hide the newer one
        sorted_messages[1].visible false # hide newer
      else
        sorted_messages[0].visible false # hide older
    return message_et


  ###############################################################################
  # Generated messages
  ###############################################################################

  ###
  Creates the placeholder message after clearing a conversation.
  @note Only create the message if the group participants have been set
  @private
  ###
  _creation_message: =>
    return undefined if @participating_user_ets().length is 0
    message_et = new z.entity.MemberMessage()
    message_et.type = z.message.SuperType.MEMBER
    message_et.user_ids @participating_user_ids()
    message_et.user_ets @participating_user_ets().slice 0

    if @type() in [z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE]
      if @participating_user_ets()[0].sent()
        message_et.member_message_type = z.message.SystemMessageType.CONNECTION_REQUEST
      else
        message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED
    else
      message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE
      if @creator is @self.id
        message_et.user @self
      else
        message_et.user_ets.push @self
        user_et = ko.utils.arrayFirst @participating_user_ets(), (user_et) =>
          return user_et.id is @creator
        if user_et
          message_et.user user_et
        else
          message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_RESUME
    return message_et

  ###
  Creates a E2EE message of type z.message.E2EEMessageType.ALL_VERIFIED.
  @private
  ###
  _verified_message: ->
    message_et = new z.entity.Message()
    message_et.type = z.message.SuperType.ALL_VERIFIED
    return message_et

  ###
  Creates a E2EE message of type z.message.E2EEMessageType.ALL_VERIFIED.
  @private
  ###
  _new_device_message: ->
    message_et = new z.entity.DeviceMessage()
    return message_et

  ###
  Creates a E2EE message of type z.message.E2EEMessageType.ALL_VERIFIED.
  @private
  ###
  _unverified_device_message: ->
    message_et = new z.entity.DeviceMessage()
    message_et.unverified true
    return message_et


  ###############################################################################
  # Update last activity
  ###############################################################################

  ###
  Update information about last activity from multiple messages.
  @param message_ets [z.entity.Message[]] Array of messages to be added to conversation
  ###
  update_latest_from_messages: (message_ets) ->
    last_message = message_ets[message_ets.length - 1]
    @update_latest_from_message last_message

  ###
  Update information about last activity from single message.
  @param message_et [z.entity.Message] Message to be added to conversation
  ###
  update_latest_from_message: (message_et) ->
    if message_et? and message_et.visible()
      @set_timestamp message_et.timestamp, z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP

  ###
  Update last read if message sender is self
  @private
  @param message_et [z.entity.Message]
  ###
  _update_last_read_from_message: (message_et) ->
    if message_et.user()?.is_me and message_et.timestamp
      @set_timestamp message_et.timestamp, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP

  ###############################################################################
  # Get messages
  ###############################################################################

  ###
  Get all messages.
  @return [z.entity.Message[ko.observableArray]] Array of all message in the conversation
  ###
  get_all_messages: ->
    return @messages()

  ###
  Returns a message with an image if found by correlation ID and image type.

  @param message_et [z.entity.Message] Message with image for which a correlating message should be found
  @param message_ets [Array<z.entity.Message>] Pool of message to search in first
  @return [z.entity.ContentMessage] Correlating content message containing image
  ###
  get_correlating_image_message: (message_et, message_ets) =>
    image_message_et = @_get_correlating_image_message message_et, message_ets if message_ets?.length > 0
    image_message_et = @_get_correlating_image_message message_et, @messages() if not image_message_et?
    return image_message_et

  ###
  Get the first message of the conversation.
  @return [z.entity.Message, undefined] First message entity or undefined
  ###
  get_first_message: ->
    return @messages()[0]

  ###
  Get the last message of the conversation.
  @return [z.entity.Message, undefined] Last message entity or undefined
  ###
  get_last_message: ->
    return @messages()[@messages().length - 1]

  ###
  Get the previous message for give message.
  @return [z.entity.Message, undefined]
  ###
  get_previous_message: (message_et) ->
    messages_visible = @messages_visible()
    message_index = messages_visible.indexOf message_et
    return messages_visible[message_index - 1] if message_index > 0

  ###
  Get the last text message that was added by self user.
  @return [z.entity.Message]
  ###
  get_last_added_text_message: ->
    for message_et in @messages() when message_et.has_asset_text() and message_et.user().is_me by -1
      return message_et

  ###
  Get the last delivered message.
  @return [z.entity.Message]
  ###
  get_last_delivered_message: ->
    for message_et in @messages() when message_et.status() is z.message.StatusType.DELIVERED by -1
      return message_et

  ###
  Get a message by it's unique ID.
  @param id [String] ID of message to be retrieved
  @return [z.entity.Message, undefined] Message with ID or undefined
  ###
  get_message_by_id: (id) ->
    return message_et for message_et in @messages() when message_et.id is id

  ###
  Returns a message with an image if found by correlation ID and image type.

  @private
  @param message_et [z.entity.Message] Message with image for which a correlating message should be found
  @param message_ets [Array<z.entity.Message>] Pool of message to search in
  @return [z.entity.ContentMessage] Correlating content message containing image
  ###
  _get_correlating_image_message: (input_message_et, message_ets) ->
    input_asset_et = input_message_et.get_first_asset()
    for other_message_et in message_ets when other_message_et.has_asset_image()
      continue if other_message_et.id is input_message_et.id
      other_asset_et = other_message_et.get_first_asset()
      if other_asset_et.correlation_id is input_asset_et.correlation_id
        return other_message_et if input_asset_et.is_medium_image() is other_asset_et.is_preview_image()

  ###
  Get Number of pending uploads for this conversation.
  ###
  get_number_of_pending_uploads: ->
    pending_uploads = (message_et for message_et in @messages() when message_et.assets?()[0]?.pending_upload?())
    return pending_uploads.length

  ###
  Check whether the conversation is held with a Wire welcome bot like Anna or Otto.
  @return [Boolean] True, if conversation with a bot
  ###
  is_with_bot: =>
    return false if not @is_one2one()
    possible_bot_email = @participating_user_ets()[0].email()
    return !!possible_bot_email?.match /(anna|ottobot|welcome)(\+\S+)?@wire.com/ig

  ###############################################################################
  # Serialization
  ###############################################################################

  serialize: =>
    return {
      id: @id
      archived_state: @archived_state()
      archived_timestamp: @archived_timestamp()
      cleared_timestamp: @cleared_timestamp()
      last_event_timestamp: @last_event_timestamp()
      last_read_timestamp: @last_read_timestamp()
      muted_state: @muted_state()
      muted_timestamp: @muted_timestamp()
    }
