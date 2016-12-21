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
z.e_call ?= {}

E_CALL_CONFIG =
  CONFIG_UPDATE_INTERVAL: 6 * 60 * 60 * 1000 # 6 hours
  SUPPORTED_EVENTS: [
    z.event.Client.CALL.E_CALL
  ]
  SUPPORTED_VERSIONS: [
    '3.0'
  ]

# User repository for all e-call interactions with the e-call service.
class z.e_call.ECallCenter
  ###
  Extended check for calling support of browser.
  @return [Boolean] True if calling is supported
  ###
  @supports_calling: ->
    return z.util.Environment.browser.supports.calling

  ###
  Extended check for screen sharing support of browser.
  @return [Boolean] True if screen sharing is supported
  ###
  @supports_screen_sharing: ->
    return z.util.Environment.browser.supports.screen_sharing

  ###
  Construct a new E-Call Center repository.

  @param e_call_service [z.e_call.ECallService] Backend REST API e-call service implementation
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@e_call_service, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.e_call.ECallCenter', z.config.LOGGER.OPTIONS

    # Media Handler
    @media_devices_handler = @media_repository.devices_handler
    @media_stream_handler = @media_repository.stream_handler
    @media_element_handler = @media_repository.element_handler

    @config = ko.observable()
    @e_calls = ko.observableArray []
    @joined_e_call = ko.pureComputed =>
      return if not @self_client_joined()
      return e_call_et for e_call_et in @e_calls() when e_call_et.self_client_joined()

    @self_state = @media_stream_handler.self_stream_state
    @self_client_joined = ko.observable false

    @block_event_handling = true

    @share_e_call_states()
    @subscribe_to_app_events()
    @subscribe_to_state_events()

  # Initiate calls config update.
  initiate_config: =>
    @_update_e_call_config()
    window.setInterval =>
      @_update_e_call_config()
    , E_CALL_CONFIG.CONFIG_UPDATE_INTERVAL

  # Share e-call states with z.media.MediaStreamHandler.
  share_e_call_states: =>
    @media_stream_handler.e_calls = @e_calls
    @media_stream_handler.joined_e_call = @joined_e_call

  # Subscribe to amplify topics.
  subscribe_to_app_events: =>
    amplify.subscribe z.event.WebApp.LOADED, @initiate_config
    amplify.subscribe z.event.WebApp.CALL.EVENT_FROM_BACKEND, @on_event
    amplify.subscribe z.util.Logger::LOG_ON_DEBUG, @set_logging

  # Subscribe to amplify topics.
  subscribe_to_state_events: =>
    amplify.subscribe z.event.WebApp.CALL.MEDIA.TOGGLE, @toggle_media
    amplify.subscribe z.event.WebApp.CALL.STATE.DELETE, @delete_call
    amplify.subscribe z.event.WebApp.CALL.STATE.IGNORE, @ignore_call
    amplify.subscribe z.event.WebApp.CALL.STATE.JOIN, @join_call
    amplify.subscribe z.event.WebApp.CALL.STATE.LEAVE, @leave_call
    amplify.subscribe z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, @remove_participant
    amplify.subscribe z.event.WebApp.CALL.STATE.TOGGLE, @toggle_joined

  # Un-subscribe from amplify topics.
  un_subscribe_from_app_events: ->
    amplify.unsubscribeAll z.event.WebApp.CALL.EVENT_FROM_BACKEND

  # Un-subscribe from amplify topics.
  un_subscribe_from_state_events: ->
    subscriptions = [
      z.event.WebApp.CALL.STATE.CHECK
      z.event.WebApp.CALL.STATE.DELETE
      z.event.WebApp.CALL.STATE.JOIN
      z.event.WebApp.CALL.STATE.LEAVE
      z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT
      z.event.WebApp.CALL.STATE.TOGGLE
    ]
    amplify.unsubscribeAll topic for topic in subscriptions


  ###############################################################################
  # Inbound e-call events
  ###############################################################################

  ###
  Check whether call should be handled by v3 API.
  @param conversation_id [String] ID of conversation related to e-call
  @return [Boolean] Call is handled by v3 API
  ###
  handled_by_v3: (conversation_id) =>
    if @use_v3_api
      conversation_et = @conversation_repository.get_conversation_by_id conversation_id
      return not conversation_et.is_group()
    return false

  ###
  Handle incoming calling events from backend.
  @param event [Object] Event payload
  ###
  on_event: (event) =>
    return if event.type not in E_CALL_CONFIG.SUPPORTED_EVENTS

    # @todo implement skipping on notification stream
    # @todo implement skipping if message too old - timeout 30s?
    if false is true
      return @logger.info "Skipping '#{event.type}' event", {event_object: event, event_json: JSON.stringify event}

    @logger.info "Handling '#{event.type}' event", {event_object: event, event_json: JSON.stringify event}
    if z.calling.CallCenter.supports_calling()
      return @_on_event_in_supported_browsers event
    return @_on_event_in_unsupported_browsers event

  ###
  E-call event handling for browsers supporting calling.
  @private
  @param event [Object] Event payload
  ###
  _on_event_in_supported_browsers: (event) ->
    @_on_e_call_event event if event.type is z.event.Client.CALL.E_CALL

  ###
  E-call event handling for browsers not supporting calling.
  @private
  @param event [Object] Event payload
  ###
  _on_event_in_unsupported_browsers: (event) ->
    e_call_message = event.content
    return if e_call_message.resp in [true, 'true']

    switch e_call_message.type
      when z.e_call.enum.E_CALL_MESSAGE_TYPE.SETUP
        @user_repository.get_user_by_id event.from, (user_et) ->
          amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL,
            first_name: user_et.name()
            call_id: event.conversation
      else
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL

  ###
  E-call event handling.
  @private
  @param event [Object] Event payload
  ###
  _on_e_call_event: (event) =>
    conversation_id = event.conversation
    e_call_message = event.content
    user_id = event.from

    @logger.debug "Received e-call message of type '#{e_call_message.type}' from user '#{user_id}' in conversation '#{conversation_id}'", event
    if e_call_message.version not in E_CALL_CONFIG.SUPPORTED_VERSIONS
      throw new z.e_call.ECallError z.e_call.ECallError::TYPE.UNSUPPORTED_VERSION

    switch e_call_message.type
      when z.e_call.enum.E_CALL_MESSAGE_TYPE.CANCEL, z.e_call.enum.E_CALL_MESSAGE_TYPE.HANGUP
        @_on_e_call_hangup_event conversation_id, user_id, e_call_message
      when z.e_call.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        @_on_e_call_prop_sync_event conversation_id, user_id, e_call_message
      when z.e_call.enum.E_CALL_MESSAGE_TYPE.SETUP
        @_on_e_call_setup_event conversation_id, user_id, e_call_message
      else
        throw new z.e_call.ECallError z.e_call.ECallError::TYPE.UNKNOWN_EVENT_TYPE

  ###
  E-call cancel and hangup event handling.
  @private
  @param conversation_id [String] ID of Conversation related to e-call event
  @param user_id [String] ID of user which is source of event
  @param e_call_message [z.e_call.entities.ECallMessage] E-call message entity
  ###
  _on_e_call_hangup_event: (conversation_id, user_id, e_call_message) =>
    return if e_call_message?.response

    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @user_repository.get_user_by_id user_id, (user_et) =>
        e_call_et.delete_participant user_et
        .then (e_call_et) =>
          @media_element_handler.remove_media_element user_et.id
          @delete_call conversation_id if not e_call_et.participants().length
    .catch (error) ->
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

  ###
  E-call cancel event handling.
  @private
  @param conversation_id [String] ID of Conversation related to e-call event
  @param user_id [String] ID of user which is source of event
  @param e_call_message [z.e_call.entities.ECallSetupMessage] E-call setup message entity
  ###
  _on_e_call_prop_sync_event: (conversation_id, user_id, e_call_message) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @user_repository.get_user_by_id user_id, (user_et) ->
        if e_call_message.resp in [false, 'false']
          return e_call_et.update_participant user_et, e_call_message
    .catch (error) ->
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

  ###
  E-call cancel event handling.
  @private
  @param conversation_id [String] ID of Conversation related to e-call event
  @param user_id [String] ID of user which is source of event
  @param e_call_message [z.e_call.entities.ECallSetupMessage] E-call setup message entity
  ###
  _on_e_call_setup_event: (conversation_id, user_id, e_call_message) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @user_repository.get_user_by_id user_id, (user_et) ->
        if e_call_message.resp in [true, 'true']
          return e_call_et.update_participant user_et, e_call_message
        return e_call_et.add_participant user_et, e_call_message
    .catch (error) =>
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

      if @user_repository.self().id is user_id
        return @_create_ongoing_e_call conversation_id, e_call_message, user_id
      return @_create_incoming_e_call conversation_id, e_call_message, user_id


  ###############################################################################
  # Inbound e-call events
  ###############################################################################

  ###
  Send an e-call event.
  @param conversation_et [z.entity] Conversation to send message in
  @param e_call_message [z.e_call.entities.ECallMessage] E-call message entity
  ###
  send_e_call_event: (conversation_et, e_call_message) =>
    throw new z.e_call.ECallError z.e_call.ECallError::TYPE.NOT_ENABLED if not @use_v3_api
    throw new z.e_call.ECallError z.e_call.ECallError::TYPE.NOT_SUPPORTED if not conversation_et.is_one2one()
    throw new z.e_call.ECallError z.e_call.ECallError::TYPE.WRONG_PAYLOAD_FORMAT if not _.isObject e_call_message

    @get_e_call_by_id conversation_et.id
    .then (e_call_et) ->
      if e_call_et.data_channel_opened
        return e_flow_et.send_message e_call_message.to_content_string() for e_flow_et in e_call_et.get_flows()
      throw new z.e_call.ECallError z.e_call.ECallError::TYPE.DATA_CHANNEL_NOT_OPENED
    .catch (error) =>
      throw error if error.type not in [z.e_call.ECallError::TYPE.DATA_CHANNEL_NOT_OPENED , z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND]
      @logger.debug "Sending e-call event of type '#{e_call_message.type}' to conversation '#{conversation_et.id}'", e_call_message.to_JSON()
      @logger.warn "OUTBOUND e-call message\n\n#{e_call_message.to_content_string()}"
      @conversation_repository.send_e_call conversation_et, e_call_message.to_content_string()

  ###
  Create properties payload for e-call events.
  @private
  @param media_type [z.media.MediaType] MediaType of properties update
  @return [Object] Properties object
  ###
  _create_properties_payload: (media_type) ->
    return {
      audiosend: @self_state.audio_send() if media_type is z.media.MediaType.AUDIO
      screensend: @self_state.screen_send() if media_type in [z.media.MediaType.SCREEN, z.media.MediaType.VIDEO]
      videosend: @self_state.video_send() if media_type in [z.media.MediaType.SCREEN, z.media.MediaType.VIDEO]
    }

  ###############################################################################
  # E-call actions
  ###############################################################################


  ###
  Delete an e-call.
  @param conversation_id [String] ID of conversation to delete e-call from
  ###
  delete_call: (conversation_id) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @logger.debug "Deleting e-call in conversation '#{conversation_id}'", e_call_et
      if e_call_et.self_client_joined() and e_call_et.state() in [z.calling.enum.CallState.DISCONNECTING, z.calling.enum.CallState.ONGOING]
        amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP
      e_call_et.state z.calling.enum.CallState.ENDED
      e_call_et.reset_call()
      @e_calls.remove (e_call_et) -> e_call_et.id is conversation_id
      @media_stream_handler.reset_media_streams()
    .catch (error) ->
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

  ###
  User action to ignore incoming e-call.
  @param conversation_id [String] ID of conversation to ignore e-call in
  ###
  ignore_call: (conversation_id) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @logger.debug "Ignoring e-call in conversation '#{conversation_id}'", e_call_et
      e_call_et.state z.calling.enum.CallState.IGNORED
      @media_stream_handler.reset_media_streams()
    .catch (error) ->
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

  ###
  User action to join an e-call.
  @param conversation_id [String] ID of conversation to join e-call in
  @param video_send [Boolean] Send video for this e-call
  ###
  join_call: (conversation_id, video_send = false) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) ->
      return e_call_et.state()
    .catch (error) =>
      throw error if not @handled_by_v3 conversation_id
      return z.calling.enum.CallState.OUTGOING
    .then (e_call_state) =>
      if e_call_state is z.calling.enum.CallState.OUTGOING and not z.calling.CallCenter.supports_calling()
        return amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_OUTGOING_CALL

      @_check_concurrent_joined_call conversation_id, e_call_state
      .then =>
        return @_join_call conversation_id, video_send

  ###
  User action to leave an e-call.
  @param conversation_id [String] ID of conversation to leave e-call in
  ###
  leave_call: (conversation_id) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @media_stream_handler.release_media_streams()
      @logger.debug "Leaving e-call in conversation '#{conversation_id}'", e_call_et
      if e_call_et.state() is z.calling.enum.CallState.ONGOING
        message_type = z.e_call.enum.E_CALL_MESSAGE_TYPE.HANGUP
      else
        message_type = z.e_call.enum.E_CALL_MESSAGE_TYPE.CANCEL
      e_call_et.state z.calling.enum.CallState.DISCONNECTING
      @send_e_call_event e_call_et.conversation_et, new z.e_call.entities.ECallMessage message_type, false, e_call_et
      @delete_call conversation_id if e_call_et.participants().length < 2
    .catch (error) ->
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

  ###
  Leave a e-call we are joined immediately in case the browser window is closed.
  @note Should only used by "window.onbeforeunload".
  ###
  leave_call_on_beforeunload: =>
    conversation_id = @_self_client_on_a_call()
    @leave_call conversation_id if conversation_id

  ###
  Remove a participant from an e-call if he was removed from the group.
  @param conversation_id [String] ID of conversation for which the user should be removed from the e-call
  @param user_id [String] ID of user to be removed
  ###
  remove_participant: (conversation_id, user_id) =>
    return true if not @handled_by_v3 conversation_id

    @_on_e_call_hangup_event conversation_id, user_id

  ###
  User action to toggle the e-call state.
  @param conversation_id [String] ID conversation to toggle the join state of the e-call in
  @param video_send [Boolean] Video enabled for this e-call
  ###
  toggle_joined: (conversation_id, video_send) =>
    if @_self_client_on_a_call() is conversation_id
      return @leave_call conversation_id
    return @join_call conversation_id, video_send

  ###
  User action to toggle one of the media stats of an e-call
  @param conversation_id [String] ID of conversation with e-call
  @param media_type [z.media.MediaType] MediaType of requested change
  ###
  toggle_media: (conversation_id, media_type) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      toggle_promise = switch media_type
        when z.media.MediaType.AUDIO
          @media_stream_handler.toggle_audio_send()
        when z.media.MediaType.SCREEN
          @media_stream_handler.toggle_screen_send()
        when z.media.MediaType.VIDEO
          @media_stream_handler.toggle_video_send()

      toggle_promise.then =>
        @send_e_call_event e_call_et.conversation_et, new z.e_call.entities.ECallPropSyncMessage false, @_create_properties_payload(media_type), e_call_et
    .catch (error) ->
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

  ###
  Check whether we are actively participating in a e-call.

  @private
  @param new_call_id [String] ID of conversation to join e-call in
  @param e_call_state [z.calling.enum.CallState] State of new e-call
  @return [Promise] Promise that resolves when the new e-call was joined
  ###
  _check_concurrent_joined_call: (new_call_id, e_call_state) =>
    return new Promise (resolve) =>
      ongoing_call_id = @_self_participant_on_a_call()
      if ongoing_call_id
        return amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_START_ANOTHER,
          action: =>
            @leave_call ongoing_call_id
            window.setTimeout resolve, 1000
          close: ->
            amplify.publish z.event.WebApp.CALL.STATE.IGNORE, new_call_id if e_call_state is z.calling.enum.CallState.INCOMING
          data: e_call_state
      resolve()

  ###
  Join a e-call and get a MediaStream.

  @private
  @param conversation_id [String] ID of conversation to join e-call in
  @param video_send [Boolean] Video enabled for this e-call
  ###
  _join_call: (conversation_id, video_send) ->
    e_call = undefined

    @get_e_call_by_id conversation_id
    .catch (error) =>
      throw error if error.type isnt z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND
      @_create_outgoing_e_call conversation_id, new z.e_call.entities.ECallPropSyncMessage false, videosend: video_send
    .then (e_call_et) =>
      @logger.debug "Joining e-call in conversation '#{conversation_id}'", e_call_et
      e_call = e_call_et
      if not @media_stream_handler.has_media_streams()
        @media_stream_handler.initiate_media_stream conversation_id, video_send
    .then =>
      switch e_call.state()
        when z.calling.enum.CallState.INCOMING
          e_call.state z.calling.enum.CallState.CONNECTING
        when z.calling.enum.CallState.OUTGOING
          e_call.participants.push new z.e_call.entities.EParticipant e_call, e_call.conversation_et.participating_user_ets()[0]

      @self_client_joined true
      e_call.local_audio_stream @media_stream_handler.local_media_streams.audio()
      e_call.local_video_stream @media_stream_handler.local_media_streams.video()
      e_call.start_negotiation()


  ###############################################################################
  # E-call entity creation
  ###############################################################################

  ###
  Constructs a e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message [z.e_call.entities.ECallSetupMessage] E-call setup message entity
  @param creating_user_et [z.entity.User] User that created e-call
  @return [z.e_call.entities.ECall] E-call entity
  ###
  _create_e_call: (conversation_id, e_call_message, creating_user_et) ->
    @get_e_call_by_id conversation_id
    .catch =>
      conversation_et = @conversation_repository.get_conversation_by_id conversation_id
      e_call_et = new z.e_call.entities.ECall conversation_et, creating_user_et, e_call_message.sessid, @
      @e_calls.push e_call_et
      return e_call_et

  ###
  Constructs an incoming e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message [z.e_call.entities.ECallSetupMessage] E-call setup message entity
  @param user_id [String] ID of user ID that created e-call
  ###
  _create_incoming_e_call: (conversation_id, e_call_message, user_id) ->
    @user_repository.get_user_by_id user_id, (remote_user_et) =>
      @_create_e_call conversation_id, e_call_message, remote_user_et
      .then (e_call_et) =>
        @logger.debug "Incoming '#{@_get_media_type_from_properties e_call_message.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}'", e_call_et
        e_call_et.state z.calling.enum.CallState.INCOMING
        e_call_et.add_participant remote_user_et, e_call_message
      .then (e_call_et) =>
        @media_stream_handler.initiate_media_stream e_call_et.id, true if e_call_et.is_remote_video_send()

  ###
  Constructs an ongoing e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message [z.e_call.entities.ECallSetupMessage] E-call setup message entity
  @param user_id [String] ID of user ID that created e-call
  ###
  _create_ongoing_e_call: (conversation_id, e_call_message, user_id) ->
    @user_repository.get_user_by_id user_id, (remote_user_et) =>
      @_create_e_call conversation_id, e_call_message, remote_user_et
      .then (e_call_et) =>
        @logger.debug "Ongoing '#{@_get_media_type_from_properties e_call_message.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}' on another client", e_call_et
        e_call_et.state z.calling.enum.CallState.ONGOING
        e_call_et.self_user_joined true
        e_call_et.add_participant remote_user_et, e_call_message

  ###
  Constructs an outgoing e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message [z.e_call.entities.ECallPropSyncMessage] E-call properties sync message entity
  ###
  _create_outgoing_e_call: (conversation_id, e_call_message) ->
    @_create_e_call conversation_id, e_call_message, @user_repository.self()
    .then (e_call_et) =>
      @logger.debug "Outgoing '#{@_get_media_type_from_properties e_call_message.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}'", e_call_et
      e_call_et.state z.calling.enum.CallState.OUTGOING
      return e_call_et


  ###############################################################################
  # Helper functions
  ###############################################################################

  ###
  Get an e-call entity for a given conversation ID.
  @param conversation_id [String] ID of Conversation of requested e-call
  @return [z.e_call.entities.ECall] E-call entity for conversation ID
  ###
  get_e_call_by_id: (conversation_id) ->
    if conversation_id
      return Promise.resolve e_call_et for e_call_et in @e_calls() when e_call_et.id is conversation_id
      return Promise.reject new z.e_call.ECallError z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND
    Promise.reject new z.e_call.ECallError z.e_call.ECallError::TYPE.NO_CONVERSATION_ID

  ###
  Set logging on adapter.js
  @param is_enabled [Boolean] Is adapter logging enabled
  ###
  set_logging: (is_enabled) =>
    @logger.info "Set logging for webRTC Adapter: #{is_enabled}"
    adapter?.disableLog = not is_enabled

  ###
  Get the MediaType from given e-call event properties.
  @param [Object] E-call event properties
  @return [z.media.MediaType] MediaType of e-call
  ###
  _get_media_type_from_properties: (properties) ->
    if properties
      return z.media.MediaType.VIDEO if properties.videosend is 'true'
    return z.media.MediaType.AUDIO

  ###
  Check if self client is participating in an e-call.
  @private
  @return [String, Boolean] ID of conversation with joined e-call or false
  ###
  _self_client_on_a_call: ->
    return e_call_et.id for e_call_et in @e_calls() when e_call_et.self_client_joined()

  ###
  Check if self participant is participating in an e-call.
  @private
  @return [String, Boolean] ID of conversation with joined e-call or false
  ###
  _self_participant_on_a_call: ->
    return e_call_et.id for e_call_et in @e_calls() when e_call_et.self_user_joined()

  ###
  Get the e-call config from the backend and store it.
  @private
  ###
  _update_e_call_config: ->
    @e_call_service.get_config()
    .then (config) =>
      @logger.info 'Updated e-call configuration', config
      @config config
