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

# V3 call center for all e-call interactions.
class z.calling.v3.CallCenter
  ###
  Construct a new e-call center.

  @param calling_config [ko.observable] Calling configuration from backend
  @param client_repository [z.client.ClientRepository] Repository for client interactions
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@calling_config, @client_repository, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.calling.v3.CallCenter', z.config.LOGGER.OPTIONS

    # Telemetry
    @telemetry = new z.telemetry.calling.CallTelemetry z.calling.enum.PROTOCOL.VERSION_3

    # Media Handler
    @media_devices_handler = @media_repository.devices_handler
    @media_stream_handler = @media_repository.stream_handler
    @media_element_handler = @media_repository.element_handler

    @e_calls = ko.observableArray []
    @joined_e_call = ko.pureComputed =>
      return e_call_et for e_call_et in @e_calls() when e_call_et.self_client_joined()

    @self_state = @media_stream_handler.self_stream_state

    @block_media_stream = true
    @subscribe_to_events()

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.EVENT_FROM_BACKEND, @on_event
    amplify.subscribe z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, @set_notification_handling_state
    amplify.subscribe z.util.Logger::LOG_ON_DEBUG, @set_logging

  ###
  Set the notification handling state.
  @note Temporarily ignore call related events when handling notifications from the stream
  @param handling_state [z.event.NOTIFICATION_HANDLING_STATE] State of the notifications stream handling
  ###
  set_notification_handling_state: (handling_state) =>
    @block_media_stream = handling_state isnt z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET
    @logger.info "Block requesting MediaStream: #{@block_media_stream}"


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

    e_call_message_et = z.calling.mapper.ECallMessageMapper.map_event event

    if z.calling.CallingRepository.supports_calling()
      return @_on_event_in_supported_browsers e_call_message_et
    return @_on_event_in_unsupported_browsers e_call_message_et

  ###
  E-call event handling for browsers supporting calling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] Mapped incoming e-call message entity
  ###
  _on_event_in_supported_browsers: (e_call_message_et) ->
    @logger.debug "Received e-call '#{e_call_message_et.type}' message from user '#{e_call_message_et.user_id}' in conversation '#{e_call_message_et.conversation_id}'", e_call_message_et

    @_validate_message_type e_call_message_et
    .then =>
      switch e_call_message_et.type
        when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
          @_on_cancel e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK
          @_on_group_check e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE
          @_on_group_leave e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP
          @_on_group_setup e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START
          @_on_group_start e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
          @_on_hangup e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
          @_on_prop_sync e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT
          @_on_reject e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
          @_on_setup e_call_message_et
        when z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
          @_on_update e_call_message_et
        else
          @logger.warn "E-call event of unknown type '#{e_call_message_et.type}' was ignored", e_call_message_et

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
        @user_repository.get_user_by_id e_call_message_et.user_id
        .then(user_et) ->
          amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL,
            first_name: user_et.name()
            call_id: e_call_message_et.conversation_id
      when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL

  ###
  E-call cancel message handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
  ###
  _on_cancel: (e_call_message_et) ->
    return if e_call_message_et.response is true

    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) ->
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) ->
      return e_call_et.delete_e_participant e_call_message_et.user_id, e_call_message_et.client_id, z.calling.enum.TERMINATION_REASON.OTHER_USER
    .then (e_call_et) ->
      return e_call_et.deactivate_call e_call_message_et, z.calling.enum.TERMINATION_REASON.OTHER_USER
    .catch (error) =>
      if error.type isnt z.calling.v3.CallError::TYPE.NOT_FOUND
        @inject_deactivate_event e_call_message_et
        throw error

  ###
  E-call group check message handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK
  ###
  _on_group_check: (e_call_message_et) =>
    @logger.debug 'GROUP_CHECK NOT IMPLEMENTED', e_call_message_et
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) ->
      e_call_et = undefined
      #reset group check timeouts
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND
      return if e_call_message_et.user_id is @user_repository.self().id

      @conversation_repository.grant_message e_call_message_et.conversation_id, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [e_call_message_et.user_id]
      .then =>
        @_create_incoming_e_call e_call_message_et

  ###
  E-call group leave message handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE
  ###
  _on_group_leave: (e_call_message_et) =>
    @logger.debug 'GROUP_LEAVE', e_call_message_et
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) ->
      return e_call_et.delete_e_participant e_call_message_et.user_id, e_call_message_et.client_id, z.calling.enum.TERMINATION_REASON.OTHER_USER
    .then (e_call_et) ->
      return e_call_et.check_group_activity z.calling.enum.TERMINATION_REASON.OTHER_USER
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call group setup message handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP
  ###
  _on_group_setup: (e_call_message_et) =>
    @logger.debug 'GROUP_SETUP', e_call_message_et
    if e_call_message_et.dest_user_id isnt @user_repository.self().id or e_call_message_et.dest_client_id isnt @client_repository.current_client().id
      return @logger.log "Ignored e-call group setup for client '#{e_call_message_et.dest_client_id}' user '#{e_call_message_et.dest_user_id}'"

    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) ->
      e_call_et.set_remote_version e_call_message_et
      return e_call_et.update_e_participant e_call_message_et, e_call_message_et.response isnt true
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call group start message handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START
  ###
  _on_group_start: (e_call_message_et) =>
    @logger.debug 'GROUP_START', e_call_message_et
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      if e_call_et.state() in [z.calling.enum.CallState.INCOMING, z.calling.enum.CallState.OUTGOING]
        e_call_et.state z.calling.enum.CallState.CONNECTING

      # add the correct participant, start negotiating
      @user_repository.get_user_by_id e_call_message_et.user_id, (remote_user_et) ->
        return e_call_et.add_e_participant e_call_message_et, remote_user_et
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND
      return if e_call_message_et.user_id is @user_repository.self().id

      @conversation_repository.grant_message e_call_message_et.conversation_id, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [e_call_message_et.user_id]
      .then =>
        @_create_incoming_e_call e_call_message_et

  ###
  E-call hangup message handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
  ###
  _on_hangup: (e_call_message_et) ->
    return if e_call_message_et.response is true

    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) ->
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) =>
      @_confirm_e_call_message e_call_et, e_call_message_et
      return e_call_et.delete_e_participant e_call_message_et.user_id, e_call_message_et.client_id, z.calling.enum.TERMINATION_REASON.OTHER_USER
    .then (e_call_et) ->
      return e_call_et.deactivate_call e_call_message_et, z.calling.enum.TERMINATION_REASON.OTHER_USER
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call prop-sync message handling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_prop_sync: (e_call_message_et) ->
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) ->
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) =>
      @_confirm_e_call_message e_call_et, e_call_message_et
      return e_call_et.update_e_participant e_call_message_et
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call reject message handling.
  @private
  @param e_call_message [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT
  ###
  _on_reject: (e_call_message_et) ->
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      if e_call_message_et.user_id isnt @user_repository.self().id
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_SENDER, 'Call rejected by wrong user'
      @logger.debug "Rejecting e-call in conversation '#{e_call_message_et.conversation_id}'", e_call_et
      e_call_et.state z.calling.enum.CallState.REJECTED
      @media_stream_handler.reset_media_stream()
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  E-call setup message handling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_setup: (e_call_message_et) ->
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) =>
      e_call_et.set_remote_version e_call_message_et
      if e_call_message_et.response is true
        switch e_call_et.state()
          when z.calling.enum.CallState.INCOMING
            @logger.info "Incoming e-call in conversation '#{e_call_et.conversation_et.display_name()}' accepted on other device"
            return @delete_call e_call_message_et.conversation_id
          when z.calling.enum.CallState.OUTGOING
            return e_call_et.update_e_participant e_call_message_et
            .then -> e_call_et.state z.calling.enum.CallState.CONNECTING

      return @user_repository.get_user_by_id e_call_message_et.user_id
      .then (remote_user_et) ->
        return e_call_et.add_e_participant e_call_message_et, remote_user_et
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND
      return if e_call_message_et.user_id is @user_repository.self().id
      return if e_call_message_et.response is true

      @conversation_repository.grant_message e_call_message_et.conversation_id, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [e_call_message_et.user_id]
      .then =>
        @_create_incoming_e_call e_call_message_et

  ###
  E-call setup message handling.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _on_update: (e_call_message_et) ->
    @get_e_call_by_id e_call_message_et.conversation_id
    .then (e_call_et) ->
      return e_call_et.verify_session_id e_call_message_et
    .then (e_call_et) ->
      return e_call_et.update_e_participant e_call_message_et
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  Validate that type of e-call message matches conversation type.
  @param e_call_message_et [z.calling.entities.E_CALL_MESSAGE] E-call message to validate
  ###
  _validate_message_type: (e_call_message_et) ->
    @conversation_repository.get_conversation_by_id_async e_call_message_et.conversation_id
    .then (conversation_et) ->
      if conversation_et.is_one2one()
        group_message_types =  [
          z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK
          z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE
          z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP
          z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START
        ]
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_CONVERSATION_TYPE if e_call_message_et.type in group_message_types
      else if conversation_et.is_group()
        one2one_message_types =  [
          z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
          z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
        ]
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_CONVERSATION_TYPE if e_call_message_et.type in one2one_message_types
      else
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_CONVERSATION_TYPE


  ###############################################################################
  # Outbound e-call events
  ###############################################################################

  create_additional_payload: (conversation_id, remote_user_id, remote_client_id) ->
    return {
      conversation_id: conversation_id
      remote_client_id: remote_client_id
      remote_user_id: remote_user_id
      time: new Date().toISOString()
      user_id: @user_repository.self().id
    }

  ###
  Create properties payload for e-call events.

  @private
  @param payload_type [z.media.MediaType.SCREEN|Boolean] Media type of property change or forced videosend state
  @param additional_payload [Object] Optional additional payload to be added
  @return [Object] E-call message props object
  ###
  create_payload_prop_sync: (payload_type, invert = false, additional_payload) ->
    if _.isBoolean payload_type
      payload = props: videosend: "#{payload_type}"
    else
      switch payload_type
        when z.media.MediaType.AUDIO
          audio_send_state = if invert then not @self_state.audio_send() else @self_state.audio_send()
          payload = props: audiosend: "#{audio_send_state}"
        when z.media.MediaType.SCREEN
          screen_send_state = if invert then not @self_state.screen_send() else @self_state.screen_send()
          video_send_state = if invert then "false" else @self_state.video_send()
          payload = props:
            screensend: "#{screen_send_state}"
            videosend: "#{video_send_state}"
        when z.media.MediaType.VIDEO
          screen_send_state = if invert then "false" else @self_state.screen_send()
          video_send_state = if invert then not @self_state.video_send() else @self_state.video_send()
          payload = props:
            screensend: "#{screen_send_state}"
            videosend: "#{video_send_state}"

    if additional_payload
      payload = $.extend payload, additional_payload
    return payload

  ###
  Send an e-call event.
  @param conversation_et [z.entity] Conversation to send message in
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity
  ###
  send_e_call_event: (conversation_et, e_call_message_et) =>
    throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.WRONG_PAYLOAD_FORMAT if not _.isObject e_call_message_et

    @get_e_call_by_id conversation_et.id
    .then (e_call_et) ->
      if e_call_message_et.type in [z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC]
        return e_flow_et.send_message e_call_message_et for e_flow_et in e_call_et.get_flows()
      throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.NO_DATA_CHANNEL
    .catch (error) =>
      throw error if error.type not in [z.calling.v3.CallError::TYPE.NO_DATA_CHANNEL , z.calling.v3.CallError::TYPE.NOT_FOUND]

      @logger.debug "Sending e-call '#{e_call_message_et.type}' message to conversation '#{conversation_et.id}'", e_call_message_et.to_JSON()
      @_limit_message_recipients conversation_et, e_call_message_et
      .then ([client_user_map, precondition_option]) =>
        if e_call_message_et.type is z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP
          e_call_message_et.type = z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
        @conversation_repository.send_e_call conversation_et, e_call_message_et, client_user_map, precondition_option

  _confirm_e_call_message: (e_call_et, incoming_e_call_message_et) ->
    return unless incoming_e_call_message_et.response is false
    e_call_et.confirm_message incoming_e_call_message_et

  _limit_message_recipients: (conversation_et, e_call_message_et) ->
    remote_user = e_call_message_et.remote_user
    remote_client_id = e_call_message_et.remote_client_id

    if e_call_message_et.type is z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT
      recipients_promise = Promise.resolve [@user_repository.self()]
    else if remote_user
      recipients_promise = Promise.resolve [@user_repository.self(), remote_user]
    else
      recipients_promise = @user_repository.get_user_by_id(e_call_message_et.remote_user_id).then (remote_user) => return [@user_repository.self(), remote_user]

    recipients_promise.then ([self_user, remote_user]) =>
      switch e_call_message_et.type
        when z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL
          if e_call_message_et.response is true
            # Send to remote client that initiated call
            precondition_option = true
            user_client_map = "#{remote_user.id}": ["#{remote_client_id}"]
          else
            # Send to all clients of remote user
            precondition_option = [remote_user.id]
            user_client_map = "#{remote_user.id}": (device.id for device in remote_user.devices())
        when z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP, z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
          # Send to remote client that call is connected with
          if remote_client_id
            precondition_option = true
            user_client_map = "#{remote_user.id}": ["#{remote_client_id}"]
        when z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT
          # Send to all clients of self user
          precondition_option = [self_user.id]
          user_client_map = "#{self_user.id}": (device.id for device in self_user.devices())
        when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
          if e_call_message_et.response is true
            # Send to remote client that initiated call and all clients of self user
            precondition_option = [@user_repository.self().id]
            user_client_map =
              "#{remote_user.id}": ["#{remote_client_id}"]
              "#{self_user.id}": (device.id for device in self_user.devices())
          else
            # Send to all clients of remote user
            precondition_option = [remote_user.id]
            user_client_map = "#{remote_user.id}": (device.id for device in remote_user.devices())

      return [user_client_map, precondition_option]


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
      e_call_et.delete_call()
      @e_calls.remove (e_call_et) -> e_call_et.id is conversation_id
      @media_stream_handler.reset_media_stream()
      return undefined
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  User action to join an e-call.
  @param conversation_id [String] ID of conversation to join e-call in
  @param video_send [Boolean] Send video for this e-call
  ###
  join_call: (conversation_id, video_send = false) =>
    @get_e_call_by_id conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND
      @_create_outgoing_e_call z.calling.mapper.ECallMessageMapper.build_prop_sync false, undefined, @create_payload_prop_sync(video_send, false, conversation_id: conversation_id)
    .then (e_call_et) =>
      @logger.debug "Joining e-call in conversation '#{conversation_id}'", e_call_et
      e_call_et.initiate_telemetry video_send
      if not @media_stream_handler.local_media_stream()
        return @media_stream_handler.initiate_media_stream conversation_id, video_send
        .then -> return e_call_et
      return e_call_et
    .then (e_call_et) ->
      e_call_et.timings.time_step z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED
      e_call_et.join_call()
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
      e_call_et.leave_call termination_reason
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  Remove a participant from an e-call if he was removed from the group.
  @param conversation_id [String] ID of conversation for which the user should be removed from the e-call
  @param user_id [String] ID of user to be removed
  ###
  participant_left: (conversation_id, user_id) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) ->
      return e_call_et.delete_e_participant user_id, undefined, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE
    .then (e_call_et) =>
      unless e_call_et.participants().length
        e_call_et.set_self_state false, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE
        @delete_call e_call_message_et.conversation_id

  ###
  User action to reject incoming e-call.
  @param conversation_id [String] ID of conversation to ignore e-call in
  ###
  reject_call: (conversation_id) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) =>
      @logger.debug "Rejecting e-call in conversation '#{conversation_id}'", e_call_et
      @media_stream_handler.reset_media_stream()
      e_call_et.reject_call()
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  User action to toggle one of the media stats of an e-call
  @param conversation_id [String] ID of conversation with e-call
  @param media_type [z.media.MediaType] MediaType of requested change
  ###
  toggle_media: (conversation_id, media_type) =>
    @get_e_call_by_id conversation_id
    .then (e_call_et) ->
      return e_call_et.toggle_media media_type
    .then =>
      switch media_type
        when z.media.MediaType.AUDIO
          @media_stream_handler.toggle_audio_send()
        when z.media.MediaType.SCREEN
          @media_stream_handler.toggle_screen_send()
        when z.media.MediaType.VIDEO
          @media_stream_handler.toggle_video_send()
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
      @conversation_repository.get_conversation_by_id_async e_call_message_et.conversation_id
      .then (conversation_et) =>
        e_call_et = new z.calling.entities.ECall conversation_et, creating_user_et, e_call_message_et.session_id, @
        @e_calls.push e_call_et
        return e_call_et

  ###
  Constructs an incoming e-call entity.
  @private
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  _create_incoming_e_call: (e_call_message_et) ->
    @user_repository.get_user_by_id e_call_message_et.user_id
    .then (remote_user_et) =>
      @_create_e_call e_call_message_et, remote_user_et
      .then (e_call_et) =>
        @logger.debug "Incoming '#{@_get_media_type_from_properties e_call_message_et.props}' e-call in conversation '#{e_call_et.conversation_et.display_name()}'", e_call_et
        e_call_et.state z.calling.enum.CallState.INCOMING
        e_call_et.set_remote_version e_call_message_et
        return e_call_et.add_e_participant e_call_message_et, remote_user_et, false
        .then =>
          @telemetry.track_event z.tracking.EventName.CALLING.RECEIVED_CALL, e_call_et
          @inject_activate_event e_call_message_et
          @media_stream_handler.initiate_media_stream e_call_et.id, true if e_call_et.is_remote_video_send() and not @block_media_stream
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
      @telemetry.set_media_type media_type is z.media.MediaType.VIDEO
      @telemetry.track_event z.tracking.EventName.CALLING.INITIATED_CALL, e_call_et
      return e_call_et


  ###############################################################################
  # Notifications
  ###############################################################################

  inject_activate_event: (e_call_message_et) ->
    amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_voice_channel_activate e_call_message_et

  inject_deactivate_event: (e_call_message_et, creating_user_et, reason) ->
    amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_voice_channel_deactivate e_call_message_et, creating_user_et, reason


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
