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
z.calling ?= {}
z.calling.e_call ?= {}

E_CALL_CONFIG =
  SUPPORTED_EVENTS: [
    z.event.Client.CALL.E_CALL
  ]
  SUPPORTED_VERSIONS: [
    z.calling.enum.PROTOCOL_VERSION.E_CALL
  ]

# E-call center for all e-call interactions with the e-call service.
class z.calling.e_call.ECallCenter
  ###
  Construct a new e-call center.

  @param e_call_service [z.calling.e_call.ECallService] Backend REST API e-call service implementation
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@calling_config, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.calling.e_call.ECallCenter', z.config.LOGGER.OPTIONS

    # Telemetry
    @telemetry = new z.telemetry.calling.CallTelemetry z.calling.enum.PROTOCOL_VERSION.E_CALL

    # Media Handler
    @media_devices_handler = @media_repository.devices_handler
    @media_stream_handler = @media_repository.stream_handler
    @media_element_handler = @media_repository.element_handler

    @e_calls = ko.observableArray []
    @joined_e_call = ko.pureComputed =>
      return unless @self_client_joined()
      return e_call_et for e_call_et in @e_calls() when e_call_et.self_client_joined()

    @self_state = @media_stream_handler.self_stream_state
    @self_client_joined = ko.observable false

    @subscribe_to_events()

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.EVENT_FROM_BACKEND, @on_event
    amplify.subscribe z.util.Logger::LOG_ON_DEBUG, @set_logging


  ###############################################################################
  # Inbound e-call events
  ###############################################################################

  ###
  Handle incoming calling events from backend.
  @param event [Object] Event payload
  ###
  on_event: (event) =>
    return if event.type not in E_CALL_CONFIG.SUPPORTED_EVENTS
    if event.content.version not in E_CALL_CONFIG.SUPPORTED_VERSIONS
      throw new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.UNSUPPORTED_VERSION

    e_call_message_et = @_map_e_call_message event.content

    if z.calling.CallingRepository.supports_calling()
      return @_on_event_in_supported_browsers event, e_call_message_et
    return @_on_event_in_unsupported_browsers event, e_call_message_et

  ###
  Map incoming e-call message into entity.
  @private
  @param incoming_e_call_message [Object] Incoming e-call message object
  @return [z.calling.entities.ECallMessage] E-call message entity
  ###
  _map_e_call_message: (incoming_e_call_message) ->
    content = switch incoming_e_call_message.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        props: incoming_e_call_message.props
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        props: incoming_e_call_message.props
        sdp: incoming_e_call_message.sdp

    return new z.calling.entities.ECallMessage incoming_e_call_message.type, incoming_e_call_message.resp, incoming_e_call_message.sessid, content

  ###
  E-call event handling for browsers supporting calling.
  @private
  @param event [Object] Event payload
  @param e_call_message_et [z.calling.entities.ECallMessage] Mapped incoming e-call message entity
  ###
  _on_event_in_supported_browsers: (event, e_call_message_et) ->
    return unless event.type is z.event.Client.CALL.E_CALL

    conversation_id = event.conversation
    user_id = event.from

    @logger.debug "Received e-call message of type '#{e_call_message_et.type}' from user '#{user_id}' in conversation '#{conversation_id}'", event

    switch e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        @_on_e_call_cancel_event conversation_id, user_id, e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
        @_on_e_call_hangup_event conversation_id, user_id, e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        @_on_e_call_prop_sync_event conversation_id, user_id, e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        @_on_e_call_setup_event conversation_id, user_id, e_call_message_et
      else
        throw new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.UNKNOWN_EVENT_TYPE

  ###
  E-call event handling for browsers not supporting calling.
  @private
  @param event [Object] Event payload
  @param e_call_message_et [z.calling.entities.ECallMessage] Mapped incoming e-call message entity
  ###
  _on_event_in_unsupported_browsers: (event, e_call_message_et) ->
    return if e_call_message_et.response is true

    switch e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        @user_repository.get_user_by_id event.from, (user_et) ->
          amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL,
            first_name: user_et.name()
            call_id: event.conversation
      else
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL

  ###
  E-call cancel event handling.
  @private
  @param conversation_id [String] ID of Conversation related to e-call event
  @param user_id [String] ID of user which is source of event
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
  ###
  _on_e_call_cancel_event: (conversation_id, user_id, e_call_message_et) =>
    return if e_call_message_et.response is true

    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @_verify_session_id user_id, e_call_et, e_call_message_et
    .then (e_call_et) =>
      @_confirm_e_call_message e_call_et, e_call_message_et
      e_call_et.delete_e_participant user_id
    .then (e_call_et) =>
      unless e_call_et.participants().length
        @_send_call_notification e_call_et, user_id
        @delete_call conversation_id
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

  ###
  E-call hangup event handling.
  @private
  @param conversation_id [String] ID of Conversation related to e-call event
  @param user_id [String] ID of user which is source of event
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
  ###
  _on_e_call_hangup_event: (conversation_id, user_id, e_call_message_et) =>
    return if e_call_message_et.response is true

    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @_confirm_e_call_message e_call_et, e_call_message_et
      e_call_et.delete_e_participant user_id
    .then (e_call_et) =>
      @delete_call conversation_id unless e_call_et.participants().length
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

  ###
  E-call cancel event handling.
  @private
  @param conversation_id [String] ID of Conversation related to e-call event
  @param user_id [String] ID of user which is source of event
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_e_call_prop_sync_event: (conversation_id, user_id, e_call_message_et) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @_confirm_e_call_message e_call_et, e_call_message_et
      e_call_et.update_e_participant user_id, e_call_message_et
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

  ###
  E-call cancel event handling.
  @private
  @param conversation_id [String] ID of Conversation related to e-call event
  @param user_id [String] ID of user which is source of event
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_e_call_setup_event: (conversation_id, user_id, e_call_message_et) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      if e_call_message_et.response is true
        return e_call_et.update_e_participant user_id, e_call_message_et

      return new Promise (resolve) =>
        @user_repository.get_user_by_id user_id, (remote_user_et) ->
          return e_call_et.add_e_participant remote_user_et, e_call_message_et
          .then ->
            resolve e_call_et.get_e_participant_by_id user_id
    .then (e_participant_et) ->
      e_participant_et.session_id = e_call_message_et.session_id
    .catch (error) =>
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND
      return if e_call_message_et.response is true

      if @user_repository.self().id is user_id
        return @_create_ongoing_e_call conversation_id, e_call_message_et, user_id
      @_create_incoming_e_call conversation_id, e_call_message_et, user_id

  ###
  Verify e-call message belongs to e-call by session id.

  @private
  @param user_id [String] ID of user to verify e-call session for
  @param e_call_et [z.calling.entities.ECall] E-call entity
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity
  @return [Undefined] Returns if verification is passed, otherwise throws an error
  ###
  _verify_session_id: (user_id, e_call_et, e_call_message_et) ->
    return e_call_et unless e_call_message_et.type is z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
    return e_call_et if e_call_message_et.session_id is e_call_et.session_id
    e_call_et.get_e_participant_by_id user_id
    .then (e_participant_et) ->
      return e_call_et if e_call_message_et.session_id is e_participant_et.session_id
      throw new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.NOT_FOUND, 'Session IDs not matching'


  ###############################################################################
  # Outbound e-call events
  ###############################################################################

  ###
  Send an e-call event.
  @param conversation_et [z.entity] Conversation to send message in
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity
  ###
  send_e_call_event: (conversation_et, e_call_message_et) =>
    throw new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.WRONG_PAYLOAD_FORMAT if not _.isObject e_call_message_et

    @get_e_call_by_id conversation_et.id
    .then (e_call_et) =>
      if e_call_et.data_channel_opened
        @logger.debug "Sending e-call event of type '#{e_call_message_et.type}' to conversation '#{conversation_et.id}' via data channel", e_call_message_et.to_JSON()
        return e_flow_et.send_message e_call_message_et.to_content_string() for e_flow_et in e_call_et.get_flows()
      throw new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.DATA_CHANNEL_NOT_OPENED
    .catch (error) =>
      throw error if error.type not in [z.calling.e_call.ECallError::TYPE.DATA_CHANNEL_NOT_OPENED , z.calling.e_call.ECallError::TYPE.NOT_FOUND]
      @logger.debug "Sending e-call event of type '#{e_call_message_et.type}' to conversation '#{conversation_et.id}'", e_call_message_et.to_JSON()
      @conversation_repository.send_e_call conversation_et, e_call_message_et.to_content_string()

  ###
  Create properties payload for e-call events.
  @param force_video_send [Boolean] Video send state to be forced to true
  @param media_type [z.media.MediaType.SCREEN|Boolean] Media type of property change or forced videosend state
  @return [Object] E-call message props object
  ###
  create_prop_sync_payload: (payload_type) ->
    if _.isBoolean payload_type
      return props: videosend: "#{payload_type}"
    else
      switch payload_type
        when z.media.MediaType.AUDIO
          return props: audiosend: "#{@self_state.audio_send()}"
        when z.media.MediaType.SCREEN, z.media.MediaType.VIDEO
          return props:
            screensend: "#{@self_state.screen_send()}"
            videosend: "#{@self_state.video_send()}"

  create_setup_payload: (local_sdp) ->
    return $.extend @create_prop_sync_payload(@self_state.video_send()), sdp: local_sdp

  _confirm_e_call_message: (e_call_et, incoming_e_call_message_et) ->
    return unless incoming_e_call_message_et.response is false

    switch incoming_e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL, true, e_call_et.session_id
      when z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
        e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, true, e_call_et.session_id
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, true, e_call_et.session_id, @create_prop_sync_payload z.media.MediaType.VIDEO

    @send_e_call_event e_call_et.conversation_et, e_call_message_et


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
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

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
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

  ###
  User action to join an e-call.
  @param conversation_id [String] ID of conversation to join e-call in
  @param video_send [Boolean] Send video for this e-call
  ###
  join_call: (conversation_id, video_send = false) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) ->
      return e_call_et.state()
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND
      return z.calling.enum.CallState.OUTGOING
    .then (e_call_state) =>
      if e_call_state is z.calling.enum.CallState.OUTGOING and not z.calling.CallingRepository.supports_calling()
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
      if e_call_et.state() is z.calling.enum.CallState.OUTGOING
        e_call_message_type = z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        @_send_call_notification e_call_et, @user_repository.self().id
      else
        e_call_message_type = z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
      e_call_et.state z.calling.enum.CallState.DISCONNECTING
      @send_e_call_event e_call_et.conversation_et, new z.calling.entities.ECallMessage e_call_message_type, false, e_call_et.session_id
      @delete_call conversation_id if e_call_et.participants().length < 2
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

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
        e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, false, e_call_et.session_id, @create_prop_sync_payload media_type
        @send_e_call_event e_call_et.conversation_et, e_call_message_et
    .catch (error) ->
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

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
    e_call_et = undefined

    @get_e_call_by_id conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.NOT_FOUND

      e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, false, undefined, @create_prop_sync_payload video_send
      @_create_outgoing_e_call conversation_id, e_call_message_et
    .then (e_call) =>
      e_call_et = e_call
      @logger.debug "Joining e-call in conversation '#{conversation_id}'", e_call_et
      e_call_et.start_timings()
      unless @media_stream_handler.has_media_streams()
        @media_stream_handler.initiate_media_stream conversation_id, video_send
    .then =>
      e_call_et.timings.time_step z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED

      switch e_call_et.state()
        when z.calling.enum.CallState.INCOMING
          e_call_et.state z.calling.enum.CallState.CONNECTING
        when z.calling.enum.CallState.OUTGOING
          e_call_et.participants.push new z.calling.entities.EParticipant e_call_et, e_call_et.conversation_et.participating_user_ets()[0], e_call_et.timings

      @self_client_joined true
      e_call_et.local_audio_stream @media_stream_handler.local_media_streams.audio()
      e_call_et.local_video_stream @media_stream_handler.local_media_streams.video()
      e_call_et.start_negotiation()


  ###############################################################################
  # E-call entity creation
  ###############################################################################

  ###
  Constructs a e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  @param creating_user_et [z.entity.User] User that created e-call
  @return [z.calling.entities.ECall] E-call entity
  ###
  _create_e_call: (conversation_id, e_call_message_et, creating_user_et) ->
    @get_e_call_by_id conversation_id
    .catch =>
      conversation_et = @conversation_repository.get_conversation_by_id conversation_id
      e_call_et = new z.calling.entities.ECall conversation_et, creating_user_et, e_call_message_et.session_id, @
      @e_calls.push e_call_et
      return e_call_et

  ###
  Constructs an incoming e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  @param user_id [String] ID of user ID that created e-call
  ###
  _create_incoming_e_call: (conversation_id, e_call_message_et, user_id) ->
    @user_repository.get_user_by_id user_id, (remote_user_et) =>
      @_create_e_call conversation_id, e_call_message_et, remote_user_et
      .then (e_call_et) =>
        @logger.debug "Incoming '#{@_get_media_type_from_properties e_call_message_et.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}'", e_call_et
        e_call_et.state z.calling.enum.CallState.INCOMING
        return e_call_et.add_e_participant remote_user_et, e_call_message_et
      .then (e_call_et) =>
        @media_stream_handler.initiate_media_stream e_call_et.id, true if e_call_et.is_remote_video_send()
        @telemetry.track_event z.tracking.EventName.CALLING.RECEIVED_CALL, e_call_et
        @_send_call_notification e_call_et, user_id, z.calling.enum.CallState.INCOMING


  ###
  Constructs an ongoing e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  @param user_id [String] ID of user ID that created e-call
  ###
  _create_ongoing_e_call: (conversation_id, e_call_message_et, user_id) ->
    @user_repository.get_user_by_id user_id, (remote_user_et) =>
      @_create_e_call conversation_id, e_call_message_et, remote_user_et
      .then (e_call_et) =>
        @logger.debug "Ongoing '#{@_get_media_type_from_properties e_call_message_et.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}' on another client", e_call_et
        e_call_et.state z.calling.enum.CallState.ONGOING
        e_call_et.self_user_joined true
        e_call_et.add_e_participant remote_user_et, e_call_message_et

  ###
  Constructs an outgoing e-call entity.

  @private
  @param conversation_id [String] ID of Conversation with e-call
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
  ###
  _create_outgoing_e_call: (conversation_id, e_call_message_et) ->
    @_create_e_call conversation_id, e_call_message_et, @user_repository.self()
    .then (e_call_et) =>
      @logger.debug "Outgoing '#{@_get_media_type_from_properties e_call_message_et.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}'", e_call_et
      e_call_et.state z.calling.enum.CallState.OUTGOING
      @telemetry.track_event z.tracking.EventName.CALLING.INITIATED_CALL, e_call_et
      return e_call_et


  ###############################################################################
  # Notifications
  ###############################################################################

  _create_voice_channel_activated_message: (e_call_et, user_id) ->
    message_et = new z.entity.CallMessage()
    message_et.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED
    message_et.conversation_id = e_call_et.id
    message_et.id = z.util.create_random_uuid()
    message_et.from = user_id
    message_et.timestamp = Date.now()
    message_et.type = z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE
    return message_et

  _create_voice_channel_deactivated_event: (e_call_et, user_id) ->
    return {
      conversation: e_call_et.id
      data:
        reason: z.calling.enum.CALL_FINISHED_REASON.MISSED
      from: user_id
      id: z.util.create_random_uuid()
      time: new Date().toISOString()
      type: z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
    }

  _send_call_notification: (e_call_et, user_id, state) ->
    if state is z.calling.enum.CallState.INCOMING
      amplify.publish z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, e_call_et.conversation_et, @_create_voice_channel_activated_message e_call_et, user_id
    else
      amplify.publish z.event.WebApp.EVENT.INJECT, @_create_voice_channel_deactivated_event e_call_et, user_id


  ###############################################################################
  # Helper functions
  ###############################################################################

  ###
  Get an e-call entity for a given conversation ID.
  @param conversation_id [String] ID of Conversation of requested e-call
  @return [z.calling.entities.ECall] E-call entity for conversation ID
  ###
  get_e_call_by_id: (conversation_id) ->
    if conversation_id
      return Promise.resolve e_call_et for e_call_et in @e_calls() when e_call_et.id is conversation_id
      return Promise.reject new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.NOT_FOUND
    Promise.reject new z.calling.e_call.ECallError z.calling.e_call.ECallError::TYPE.NO_CONVERSATION_ID

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
