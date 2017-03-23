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
z.calling.v3 ?= {}

V3_CALL_CONFIG =
  SUPPORTED_EVENTS: [
    z.event.Client.CALL.E_CALL
  ]
  SUPPORTED_VERSIONS: [
    z.calling.enum.PROTOCOL.VERSION_3
  ]

# V2 call center for all e-call interactions.
class z.calling.v3.CallCenter
  ###
  Construct a new e-call center.

  @param calling_config [ko.observable] Calling configuration from backend
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@calling_config, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.calling.v3.CallCenter', z.config.LOGGER.OPTIONS

    # Telemetry
    @telemetry = new z.telemetry.calling.CallTelemetry z.calling.enum.PROTOCOL.VERSION_3

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
    return if event.type not in V3_CALL_CONFIG.SUPPORTED_EVENTS
    if event.content.version not in V3_CALL_CONFIG.SUPPORTED_VERSIONS
      throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.UNSUPPORTED_VERSION

    e_call_message_et = @_map_e_call_message event

    if z.calling.CallingRepository.supports_calling()
      return @_on_event_in_supported_browsers e_call_message_et
    return @_on_event_in_unsupported_browsers e_call_message_et

  ###
  Map incoming e-call message into entity.
  @private
  @param event [Object] E-call event object
  @return [z.calling.entities.ECallMessage] E-call message entity
  ###
  _map_e_call_message: (event) ->
    e_call_message = event.content

    additional_properties =
      conversation_id: event.conversation
      time: event.time
      user_id: event.from
      client_id: event.sender

    content = switch e_call_message.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        props: e_call_message.props
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP, z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
        props: e_call_message.props
        sdp: e_call_message.sdp

    $.extend additional_properties, content if content

    return new z.calling.entities.ECallMessage e_call_message.type, e_call_message.resp, e_call_message.sessid, additional_properties

  ###
  E-call event handling for browsers supporting calling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] Mapped incoming e-call message entity
  ###
  _on_event_in_supported_browsers: (e_call_message_et) ->
    @logger.debug "Received e-call '#{e_call_message_et.type}' message from user '#{e_call_message_et.user_id}' in conversation '#{e_call_message_et.conversation_id}'", e_call_message_et

    switch e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        @_on_e_call_cancel_event e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
        @_on_e_call_hangup_event e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.IGNORE
        @_on_e_call_ignore_event e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        @_on_e_call_prop_sync_event e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        @_on_e_call_setup_event e_call_message_et
      when z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
        @_on_e_call_update_event e_call_message_et
      else
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.UNKNOWN_EVENT_TYPE

  ###
  E-call event handling for browsers not supporting calling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] Mapped incoming e-call message entity
  ###
  _on_event_in_unsupported_browsers: (e_call_message_et) ->
    return if e_call_message_et.response is true

    switch e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        @_distribute_activation_event e_call_message_et
        @user_repository.get_user_by_id e_call_message_et.user_id, (user_et) ->
          amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL,
            first_name: user_et.name()
            call_id: e_call_message_et.conversation_id
      when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL

  ###
  E-call cancel event handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
  ###
  _on_e_call_cancel_event: (e_call_message_et) =>
    return if e_call_message_et.response is true

    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) ->
      return e_call_et.delete_e_participant e_call_message_et.user_id, e_call_message_et.client_id
    .then (e_call_et) =>
      unless e_call_et.participants().length
        if e_call_et.state() is z.calling.enum.CallState.CONNECTING
          e_call_et.termination_reason = z.calling.enum.TERMINATION_REASON.OTHER_USER
        @_distribute_deactivation_event e_call_message_et, e_call_et.creating_user
        @delete_call e_call_message_et.conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND
      @_distribute_deactivation_event e_call_message_et

  ###
  E-call hangup event handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
  ###
  _on_e_call_hangup_event: (e_call_message_et) =>
    return if e_call_message_et.response is true

    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) =>
      @_confirm_e_call_message e_call_et, e_call_message_et
      return e_call_et.delete_e_participant e_call_message_et.user_id
    .then (e_call_et) =>
      unless e_call_et.participants().length
        e_call_et.termination_reason = z.calling.enum.TERMINATION_REASON.OTHER_USER
        @delete_call e_call_message_et.conversation_id
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call ignore event handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.IGNORE
  ###
  _on_e_call_ignore_event: (e_call_message_et) =>
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      if e_call_message_et.user_id isnt @user_repository.self().id
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_SENDER, 'Call ignored by wrong user'
      @logger.debug "Ignoring e-call in conversation '#{e_call_message_et.conversation_id}'", e_call_et
      e_call_et.state z.calling.enum.CallState.IGNORED
      @media_stream_handler.reset_media_stream()
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call prop-sync event handling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_e_call_prop_sync_event: (e_call_message_et) =>
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) =>
      @_confirm_e_call_message e_call_et, e_call_message_et
      return e_call_et.update_e_participant e_call_message_et
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call setup event handling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_e_call_setup_event: (e_call_message_et) =>
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      if e_call_message_et.response is true
        switch e_call_et.state()
          when z.calling.enum.CallState.INCOMING
            @logger.info "Incoming e-call in conversation '#{e_call_et.conversation_et.display_name()}' accepted on other device"
            return @delete_call e_call_message_et.conversation_id
          when z.calling.enum.CallState.OUTGOING
            e_call_et.set_remote_version e_call_message_et
            return e_call_et.update_e_participant e_call_message_et
            .then (e_participant_et) ->
              e_call_et.state z.calling.enum.CallState.CONNECTING
              e_participant_et.session_id = e_call_message_et.session_id

      return new Promise (resolve) =>
        @user_repository.get_user_by_id e_call_message_et.user_id, (remote_user_et) ->
          return e_call_et.add_e_participant(e_call_message_et, remote_user_et).then resolve
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND
      return if e_call_message_et.user_id is @user_repository.self().id
      return if e_call_message_et.response is true

      @conversation_repository.get_conversation_by_id e_call_message_et.conversation_id, (conversation_et) =>
        @conversation_repository.grant_message conversation_et, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [e_call_message_et.user_id]
        .then =>
          @_create_incoming_e_call e_call_message_et

  ###
  E-call setup event handling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_e_call_update_event: (e_call_message_et) =>
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) ->
      return e_call_et.update_e_participant e_call_message_et
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND


  ###############################################################################
  # Outbound e-call events
  ###############################################################################

  ###
  Send an e-call event.
  @param conversation_et [z.entity] Conversation to send message in
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity
  ###
  send_e_call_event: (conversation_et, e_call_message_et) =>
    throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_PAYLOAD_FORMAT if not _.isObject e_call_message_et

    @get_e_call_by_id conversation_et.id
    .then (e_call_et) =>
      if e_call_et.data_channel_opened and e_call_message_et.type in [z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC]
        @logger.debug "Sending e-call '#{e_call_message_et.type}' message to conversation '#{conversation_et.id}' via data channel", e_call_message_et.to_JSON()
        return e_flow_et.send_message e_call_message_et.to_content_string() for e_flow_et in e_call_et.get_flows()
      throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.DATA_CHANNEL_NOT_OPENED
    .catch (error) =>
      throw error if error.type not in [z.calling.v3.CallError::TYPE.DATA_CHANNEL_NOT_OPENED , z.calling.v3.CallError::TYPE.NOT_FOUND]
      @logger.debug "Sending e-call '#{e_call_message_et.type}' message to conversation '#{conversation_et.id}'", e_call_message_et.to_JSON()
      @_create_client_user_map conversation_et, e_call_message_et
      .then (client_user_map) =>
        @conversation_repository.send_e_call conversation_et, e_call_message_et, client_user_map

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

  _create_client_user_map: (conversation_et, e_call_message_et) ->
    return Promise.resolve undefined
    switch e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        if e_call_message_et.response is true
          # Send to client that initiated call of remote user
          return "#{remote_user_id}": ["#{remote_client_id}"]
        else
          # Send to all clients of remote user
          return "#{remote_user_id}": (device.id for device in remote_user.devices())
      when z.calling.enum.E_CALL_MESSAGE_TYPE.IGNORE
        # Send to all clients of self user
        return "#{@user_repository.self().id}": (device.id for device in @user_repository.self().devices())
      when z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE.HANGUP, z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE.PROP_SYNC, z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
        # Send to remote client that initiated call
        return "#{remote_user_id}": ["#{remote_client_id}"]
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        if e_call_message_et.response is true
          # Send to client that initiated call of remote user and all clients of self user
          return {
            "#{remote_user_id}": ["#{remote_client_id}"]
            "#{@user_repository.self().id}": (device.id for device in @user_repository.self().devices())
          }
        else
          # Send to all clients of remote user
          return "#{remote_user_id}": (device.id for device in remote_user.devices())

  _confirm_e_call_message: (e_call_et, incoming_e_call_message_et) ->
    return unless incoming_e_call_message_et.response is false

    switch incoming_e_call_message_et.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
        e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, true, e_call_et.session_id, user_id: incoming_e_call_message_et.user_id, client_id: incoming_e_call_message_et.sender_id
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
      @media_stream_handler.reset_media_stream()
      return undefined
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  User action to ignore incoming e-call.
  @param conversation_id [String] ID of conversation to ignore e-call in
  ###
  ignore_call: (conversation_id) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @logger.debug "Ignoring e-call in conversation '#{conversation_id}'", e_call_et
      e_call_et.state z.calling.enum.CallState.IGNORED
      @media_stream_handler.reset_media_stream()

      additional_payload =
        conversation_id: conversation_id
        time: new Date().toISOString()
        user_id: @user_repository.self().id
      e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.IGNORE, false, e_call_et.session_id, additional_payload
      @send_e_call_event e_call_et.conversation_et, e_call_message_et
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  User action to join an e-call.
  @param conversation_id [String] ID of conversation to join e-call in
  @param video_send [Boolean] Send video for this e-call
  ###
  join_call: (conversation_id, video_send = false) =>
    e_call_et = undefined

    @get_e_call_by_id conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

      additional_payload = $.extend @create_prop_sync_payload(video_send), conversation_id: conversation_id
      e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, false, undefined, additional_payload
      @_create_outgoing_e_call e_call_message_et
    .then (e_call) =>
      e_call_et = e_call
      @logger.debug "Joining e-call in conversation '#{conversation_id}'", e_call_et
      e_call_et.start_timings()
      if not @media_stream_handler.local_media_stream()
        @media_stream_handler.initiate_media_stream conversation_id, video_send
    .then =>
      e_call_et.timings.time_step z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED

      switch e_call_et.state()
        when z.calling.enum.CallState.INCOMING
          e_call_et.state z.calling.enum.CallState.CONNECTING
        when z.calling.enum.CallState.OUTGOING
          e_call_et.participants.push new z.calling.entities.EParticipant e_call_et, e_call_et.conversation_et.participating_user_ets()[0], e_call_et.timings

      @self_client_joined true
      e_call_et.start_negotiation()
    .catch (error) =>
      @delete_call conversation_id
      throw error unless error instanceof z.media.MediaError

  ###
  User action to leave an e-call.
  @param conversation_id [String] ID of conversation to leave e-call in
  @param termination_reason [z.calling.enum.TERMINATION_REASON] Optional on reason for call termination
  ###
  leave_call: (conversation_id, termination_reason) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @logger.debug "Leaving e-call in conversation '#{conversation_id}'", e_call_et
      @media_stream_handler.release_media_stream()
      e_call_et.state z.calling.enum.CallState.DISCONNECTING
      e_call_et.termination_reason = termination_reason if termination_reason and not e_call_et.termination_reason

      e_call_message_type = if e_call_et.is_connected() then z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP else z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
      additional_payload =
        conversation_id: conversation_id
        time: new Date().toISOString()
        user_id: @user_repository.self().id
      e_call_message_et = new z.calling.entities.ECallMessage e_call_message_type, false, e_call_et.session_id, additional_payload
      @send_e_call_event e_call_et.conversation_et, e_call_message_et

      if e_call_et.participants().length < 2
        @delete_call conversation_id
        @_distribute_deactivation_event e_call_message_et, e_call_et.creating_user if e_call_message_type is z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  Remove a participant from an e-call if he was removed from the group.
  @param conversation_id [String] ID of conversation for which the user should be removed from the e-call
  @param user_id [String] ID of user to be removed
  ###
  remove_participant: (conversation_id, user_id) =>
    @_on_e_call_hangup_event conversation_id, user_id

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
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND


  ###############################################################################
  # E-call entity creation
  ###############################################################################

  ###
  Constructs a e-call entity.

  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  @param creating_user_et [z.entity.User] User that created e-call
  @return [z.calling.entities.ECall] E-call entity
  ###
  _create_e_call: (e_call_message_et, creating_user_et) ->
    @get_e_call_by_id e_call_message_et.conversation_id
    .catch =>
      conversation_et = @conversation_repository.get_conversation_by_id e_call_message_et.conversation_id
      e_call_et = new z.calling.entities.ECall conversation_et, creating_user_et, e_call_message_et.session_id, @
      @e_calls.push e_call_et
      return e_call_et

  ###
  Constructs an incoming e-call entity.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _create_incoming_e_call: (e_call_message_et) ->
    @user_repository.get_user_by_id e_call_message_et.user_id, (remote_user_et) =>
      @_create_e_call e_call_message_et, remote_user_et
      .then (e_call_et) =>
        @logger.debug "Incoming '#{@_get_media_type_from_properties e_call_message_et.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}'", e_call_et
        e_call_et.state z.calling.enum.CallState.INCOMING
        e_call_et.set_remote_version e_call_message_et
        return e_call_et.add_e_participant e_call_message_et, remote_user_et
        .then =>
          @media_stream_handler.initiate_media_stream e_call_et.id, true if e_call_et.is_remote_video_send()
          @telemetry.track_event z.tracking.EventName.CALLING.RECEIVED_CALL, e_call_et
          @_distribute_activation_event e_call_message_et
      .catch (error) =>
        @delete_call e_call_message_et.conversation_id
        throw error unless error instanceof z.media.MediaError

  ###
  Constructs an outgoing e-call entity.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
  ###
  _create_outgoing_e_call: (e_call_message_et) ->
    @_create_e_call e_call_message_et, @user_repository.self()
    .then (e_call_et) =>
      media_type = @_get_media_type_from_properties e_call_message_et.props
      @logger.debug "Outgoing '#{media_type}' e-call in conversation '#{e_call_et.conversation_et.display_name()}'", e_call_et
      e_call_et.state z.calling.enum.CallState.OUTGOING
      @telemetry.track_event z.tracking.EventName.CALLING.INITIATED_CALL, e_call_et, undefined, media_type is z.media.MediaType.VIDEO
      return e_call_et


  ###############################################################################
  # Notifications
  ###############################################################################

  _distribute_activation_event: (e_call_message_et) ->
    amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_voice_channel_activate e_call_message_et

  _distribute_deactivation_event: (e_call_message_et, creating_user_et) ->
    amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_voice_channel_deactivate e_call_message_et, creating_user_et


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
      return Promise.reject new z.calling.v3.CallError z.calling.v3.CallError::TYPE.NOT_FOUND
    Promise.reject new z.calling.v3.CallError z.calling.v3.CallError::TYPE.NO_CONVERSATION_ID

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
