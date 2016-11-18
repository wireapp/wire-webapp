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

SUPPORTED_EVENTS = [
  z.event.Backend.CALL.FLOW_ADD
  z.event.Backend.CALL.REMOTE_CANDIDATES_ADD
  z.event.Backend.CALL.REMOTE_CANDIDATES_UPDATE
  z.event.Backend.CALL.REMOTE_SDP
  z.event.Backend.CALL.STATE
  z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE
  z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
]

# User repository for all call interactions with the call service.
class z.calling.CallCenter
  ###
  Extended check for calling support of browser.
  @param conversation_id [String] Conversation ID
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
  Construct a new Call Center repository.

  @param call_service [z.calling.CallService] Backend REST API call service implementation
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  @param audio_repository [z.audio.AudioRepository] Repository for all audio interactions
  ###
  constructor: (@call_service, @audio_repository, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.calling.CallCenter', z.config.LOGGER.OPTIONS

    # Telemetry
    @telemetry = new z.telemetry.calling.CallTelemetry()
    @flow_status = undefined
    @timings = ko.observable()

    # Media Handler
    @media_devices_handler = @media_repository.devices_handler
    @media_stream_handler = @media_repository.stream_handler
    @media_element_handler = @media_repository.element_handler

    # Call Handler
    @state_handler = new z.calling.handler.CallStateHandler @
    @signaling_handler = new z.calling.handler.CallSignalingHandler @

    @share_call_states()
    @subscribe_to_events()

  share_call_states: =>
    @calls = @state_handler.calls
    @joined_call = @state_handler.joined_call

    @media_stream_handler.calls = @calls
    @media_stream_handler.joined_call = @joined_call

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.EVENT_FROM_BACKEND, @on_event
    amplify.subscribe z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, @on_event
    amplify.subscribe z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, @store_flow_status
    amplify.subscribe z.util.Logger::LOG_ON_DEBUG, @set_logging

  # Un-subscribe from amplify topics.
  un_subscribe: ->
    @state_handler.un_subscribe()
    @signaling_handler.un_subscribe()
    amplify.unsubscribeAll z.event.WebApp.CALL.EVENT_FROM_BACKEND


  ###############################################################################
  # Events
  ###############################################################################

  ###
  Handle incoming backend events.
  @param event [Object] Event payload
  ###
  on_event: (event) =>
    return if event.type not in SUPPORTED_EVENTS

    if @state_handler.block_event_handling
      @logger.log @logger.levels.INFO, "Skipping '#{event.type}' event", {event_object: event, event_json: JSON.stringify event}
    else
      @logger.log @logger.levels.INFO, "Handling '#{event.type}' event", {event_object: event, event_json: JSON.stringify event}
      if z.calling.CallCenter.supports_calling()
        @_on_event_in_supported_browsers event
      else
        @_on_event_in_unsupported_browsers event

  ###
  Backend calling event handling for browsers supporting calling.
  @private
  @param event [Object] Event payload
  ###
  _on_event_in_supported_browsers: (event) ->
    switch event.type
      when z.event.Backend.CALL.FLOW_ADD
        @signaling_handler.on_flow_add_event event
      when z.event.Backend.CALL.REMOTE_CANDIDATES_ADD, z.event.Backend.CALL.REMOTE_CANDIDATES_UPDATE
        @signaling_handler.on_remote_ice_candidates event
      when z.event.Backend.CALL.REMOTE_SDP
        @signaling_handler.on_remote_sdp event
      when z.event.Backend.CALL.STATE
        @state_handler.on_call_state event

  ###
  Backend calling event handling for browsers not supporting calling.
  @private
  @param event [Object] Event payload
  ###
  _on_event_in_unsupported_browsers: (event) ->
    switch event.type
      when z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE
        @user_repository.get_user_by_id @get_creator_id(event), (creator_et) ->
          amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL, {
            first_name: creator_et.name()
            call_id: event.conversation
          }
      when z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
        amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL


  ###############################################################################
  # Helper functions
  ###############################################################################

  ###
  Get a call entity.
  @param conversation_id [String] Conversation ID of requested call
  @return [z.calling.Call] Call entity for conversation ID
  ###
  get_call_by_id: (conversation_id) ->
    return Promise.resolve()
    .then =>
      if conversation_id
        for call_et in @calls() when call_et.id is conversation_id
          return call_et
        throw new z.calling.CallError z.calling.CallError::TYPE.CALL_NOT_FOUND
      throw new z.calling.CallError z.calling.CallError::TYPE.NO_CONVERSATION_ID

  ###
  Helper to identify the creator of a call or choose the first joined one.
  @private
  @param event [Object] Event payload
  ###
  get_creator_id: (event) ->
    if creator_id = event.creator or event.from
      return creator_id
    else
      return user_id for user_id, device_info of event.participants when device_info.state is z.calling.enum.ParticipantState.JOINED


  ###############################################################################
  # Util functions
  ###############################################################################

  ###
  Count into the flows of a call.
  @param conversation_id [String] Conversation ID
  ###
  count_flows: (conversation_id) =>
    @get_call_by_id conversation_id
    .then (call_et) =>
      counting = ({flow: flow_et, sound: "/audio/digits/#{i}.mp3"} for flow_et, i in call_et.get_flows())
      counting.reverse()

      _count_flow = =>
        act = counting.pop()
        return if not act
        user_name = act.flow.remote_user.name()
        @logger.log @logger.levels.INFO, "Sending audio file '#{act.sound}' to flow '#{act.flow.id}' (#{user_name})"
        act.flow.inject_audio_file act.sound, _count_flow

      _count_flow()
    .catch (error) =>
      @logger.log @logger.levels.WARN, "No call for conversation '#{conversation_id}' found to count into flows", error


  ###
  Inject audio into all flows of a call.
  @param conversation_id [String] Conversation ID
  @param file_path [String] Path to audio file
  ###
  inject_audio: (conversation_id, file_path) =>
    @get_call_by_id conversation_id
    .then (call_et) ->
      flow_et.inject_audio_file file_path for flow_et in call_et.get_flows()
    .catch (error) =>
      @logger.log @logger.levels.WARN, "No call for conversation '#{conversation_id}' found to inject audio into flows", error


  ###############################################################################
  # Logging
  ###############################################################################

  # Log call sessions
  log_sessions: =>
    @telemetry.log_sessions()

  print_call_states: =>
    session_id = 'unknown'
    for call_et in @calls()
      @logger.force_log "Call state for conversation: #{call_et.id}\n"
      session_id = call_et.log_state()
    return "session id is : #{session_id}"

  # Report a call for call analysis
  report_call: =>
    send_report = (custom_data) =>
      Raygun.send new Error('Call failure report'), custom_data
      @logger.log @logger.levels.INFO,
        "Reported status of flow id '#{custom_data.meta.flow_id}' for call analysis", custom_data

    call_et = @_find_ongoing_call()
    if call_et
      send_report flow_et.report_status() for flow_et in call_et.get_flows()
    else if @flow_status
      send_report @flow_status
    else
      @logger.log @logger.levels.WARN, 'Could not find flows to report for call analysis'

  # Set logging on adapter.js
  set_logging: (is_logging_enabled) =>
    @logger.log @logger.levels.INFO, "Set logging for webRTC Adapter: #{is_logging_enabled}"
    adapter?.disableLog = not is_logging_enabled

  # Store last flow status
  store_flow_status: (flow_status) =>
    @flow_status = flow_status if flow_status

  ###
  Please solely use this method for logging purposes! It's not intended to do actual work / heavy lifting.

  @private
  @param conversation_id [String] Conversation ID
  @return [z.calling.Call] Returns an ongoing call entity
  ###
  _find_ongoing_call: (conversation_id) ->
    @get_call_by_id conversation_id
    .then (call_et) ->
      return call_et
    .catch =>
      return call_et for call in @calls() when call.state() not in z.calling.enum.CallStateGroups.IS_ENDED
