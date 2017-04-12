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
    @input = ko.observable z.util.StorageUtil.get_value("#{z.storage.StorageKey.CONVERSATION.INPUT}|#{@id}") or ''
    @input.subscribe (text) =>
      z.util.StorageUtil.set_value "#{z.storage.StorageKey.CONVERSATION.INPUT}|#{@id}", text

    @is_pending = ko.observable false
    @is_loaded = ko.observable false

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
    @connection.subscribe (connection_et) =>
      @participating_user_ids [connection_et.to] if connection_et.to not in @participating_user_ids()

    ###############################################################################
    # E2EE conversation states
    ###############################################################################

    @archived_state = ko.observable(false).extend notify: 'always'
    @muted_state = ko.observable false
    @verification_state = ko.observable z.conversation.ConversationVerificationState.UNVERIFIED

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
      all_users = [@self].concat @participating_user_ets()
      return all_users.every (user_et) -> user_et?.is_verified()

    @status = ko.observable z.conversation.ConversationStatus.CURRENT_MEMBER
    @removed_from_conversation = ko.pureComputed =>
      return @status() is z.conversation.ConversationStatus.PAST_MEMBER
    @removed_from_conversation.subscribe (is_removed) =>
      @archived_state false if not is_removed

    ###############################################################################
    # Messages
    ###############################################################################

    @ephemeral_timer = ko.observable false

    @messages_unordered = ko.observableArray()
    @messages = ko.pureComputed => @messages_unordered().sort (a, b) -> a.timestamp() - b.timestamp()
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

    ###############################################################################
    # Calling
    ###############################################################################

    @call = ko.observable undefined
    @has_active_call = ko.pureComputed =>
      return false if not @call()
      return @call().state() not in z.calling.enum.CallStateGroups.IS_ENDED and not @call().is_ongoing_on_another_client()

    @unread_events = ko.pureComputed =>
      unread_event = []
      for message_et in @messages() when message_et.visible() by -1
        break if message_et.timestamp() <= @last_read_timestamp()
        unread_event.push message_et
      return unread_event

    @unread_message_count = ko.pureComputed => @unread_events().length

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
    @display_name = ko.pureComputed =>
      if @type() in [z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE]
        return @participating_user_ets()[0].name() if @participating_user_ets()[0]?.name()
        return '…'
      else if @is_group()
        return @name() if @name()
        return (@participating_user_ets().map (user_et) -> user_et.first_name()).join ', ' if @participating_user_ets().length > 0
        return z.localization.Localizer.get_text z.string.conversations_empty_conversation if @participating_user_ids().length is 0
        return '…'
      else
        return @name()

    @persist_state = _.debounce =>
      amplify.publish z.event.WebApp.CONVERSATION.PERSIST_STATE, @
    , 100

    amplify.subscribe z.event.WebApp.CONVERSATION.LOADED_STATES, @_subscribe_to_states_updates

  _subscribe_to_states_updates: =>
    [
      @archived_state
      @cleared_timestamp
      @ephemeral_timer
      @last_event_timestamp
      @last_read_timestamp
      @muted_state
      @name
      @participating_user_ids
      @status
      @type
      @verification_state
    ].forEach (property) =>
      property.subscribe @persist_state

  ###############################################################################
  # Lifecycle
  ###############################################################################

  # Remove all message from conversation unless there are unread messages.
  release: =>
    unless @unread_message_count()
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
  @return [Boolean|number] Timestamp value which can be 'false' (boolean) if there is no timestamp
  ###
  set_timestamp: (timestamp, type) =>
    if _.isString timestamp
      timestamp = window.parseInt timestamp, 10

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
    amplify.publish z.event.WebApp.CONVERSATION.MESSAGE.ADDED, message_et
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
    message_et.timestamp new Date(0)
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

  ###############################################################################
  # Update last activity
  ###############################################################################

  ###
  Update information about last activity from single message.
  @param message_et [z.entity.Message] Message to be added to conversation
  ###
  update_latest_from_message: (message_et) ->
    if message_et? and message_et.visible() and message_et.should_effect_conversation_timestamp
      @set_timestamp message_et.timestamp(), z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP

  ###
  Update last read if message sender is self
  @private
  @param message_et [z.entity.Message]
  ###
  _update_last_read_from_message: (message_et) ->
    if message_et.user()?.is_me and message_et.timestamp() and message_et.should_effect_conversation_timestamp
      @set_timestamp message_et.timestamp(), z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP

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
  Get the message before a given message.
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
  get_last_editable_message: ->
    for message_et in @messages() when message_et.is_editable() by -1
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
  Get Number of pending uploads for this conversation.
  ###
  get_number_of_pending_uploads: ->
    pending_uploads = (message_et for message_et in @messages() when message_et.assets?()[0]?.pending_upload?())
    return pending_uploads.length

  get_users_with_unverified_clients: ->
    return (user_et for user_et in [@self].concat(@participating_user_ets()) when not user_et.is_verified())

  ###
  Check whether the conversation is held with a bot like Anna or Otto.
  @return [Boolean] True, if conversation with a bot
  ###
  is_with_bot: =>
    return true for user_et in @participating_user_ets() when user_et.is_bot
    return false if not @is_one2one()
    return false if not @participating_user_ets()[0]?.username()
    return @participating_user_ets()[0].username() in ['annathebot', 'ottothebot']

  ###############################################################################
  # Serialization
  ###############################################################################

  serialize: =>
    return {
      id: @id
      archived_state: @archived_state()
      archived_timestamp: @archived_timestamp()
      cleared_timestamp: @cleared_timestamp()
      ephemeral_timer: @ephemeral_timer()
      last_event_timestamp: @last_event_timestamp()
      last_read_timestamp: @last_read_timestamp()
      muted_state: @muted_state()
      muted_timestamp: @muted_timestamp()
      name: @name()
      others: @participating_user_ids()
      status: @status()
      type: @type()
      verification_state: @verification_state()
    }
