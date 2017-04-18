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

CALLING_CONFIG =
  DEFAULT_UPDATE_INTERVAL: 30 * 60 # 30 minutes in seconds

# Call repository for all calling interactions.
class z.calling.CallingRepository
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
  Construct a new Calling repository.

  @param call_service [z.calling.v2.CallService] Backend REST API call service implementation
  @param calling_service [z.calling.CallingService] Backend REST API calling service implementation
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@call_service, @calling_service, @client_repository, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.calling.CallingRepository', z.config.LOGGER.OPTIONS

    @calling_config = ko.observable()
    @calling_config_timeout = undefined
    @use_v3_api = undefined

    @v2_call_center = new z.calling.v2.CallCenter @call_service, @conversation_repository, @media_repository, @user_repository
    @v3_call_center = new z.calling.v3.CallCenter @calling_config, @client_repository, @conversation_repository, @media_repository, @user_repository

    @calls = ko.pureComputed =>
      return @v2_call_center.calls().concat @v3_call_center.e_calls()
    @joined_call = ko.pureComputed =>
      return @v3_call_center.joined_e_call() or @v2_call_center.joined_call()

    @remote_media_streams = @media_repository.stream_handler.remote_media_streams
    @self_stream_state = @media_repository.stream_handler.self_stream_state

    @flow_status = undefined

    @share_call_states()
    @subscribe_to_events()

  share_call_states: =>
    @media_repository.stream_handler.calls = @calls
    @media_repository.stream_handler.joined_call = @joined_call

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.MEDIA.TOGGLE, => @switch_call_center z.calling.enum.CALL_ACTION.TOGGLE_MEDIA, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.DELETE, => @switch_call_center z.calling.enum.CALL_ACTION.DELETE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.JOIN, @join_call
    amplify.subscribe z.event.WebApp.CALL.STATE.LEAVE, => @switch_call_center z.calling.enum.CALL_ACTION.LEAVE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.REJECT, => @switch_call_center z.calling.enum.CALL_ACTION.REJECT, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.PARTICIPANT_LEFT, => @switch_call_center z.calling.enum.CALL_ACTION.PARTICIPANT_LEFT, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.TOGGLE, @toggle_state
    amplify.subscribe z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, @store_flow_status
    amplify.subscribe z.event.WebApp.LOADED, @initiate_config
    amplify.subscribe z.util.Logger::LOG_ON_DEBUG, @set_logging

  get_call_by_id: (conversation_id) =>
    @v2_call_center.get_call_by_id conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.v2.CallError::TYPE.CALL_NOT_FOUND
      return @v3_call_center.get_e_call_by_id conversation_id

  get_protocol_of_call: (conversation_id) =>
    @get_call_by_id conversation_id
    .then (call) ->
      if call instanceof z.calling.entities.Call
        return z.calling.enum.PROTOCOL.VERSION_2
      if call instanceof z.calling.entities.ECall
        return z.calling.enum.PROTOCOL.VERSION_3

  outgoing_protocol_version: (conversation_id) =>
    @conversation_repository.get_conversation_by_id_async conversation_id
    .then (conversation_et) =>
      if conversation_et.is_group()
        if @use_v3_api?
          return if @use_v3_api then z.calling.enum.PROTOCOL.VERSION_3 else z.calling.enum.PROTOCOL.VERSION_2
        return z.calling.enum.PROTOCOL.VERSION_2
      return z.calling.enum.PROTOCOL.VERSION_3
    .then (protocol_version) =>
      @logger.log "Selected outgoing call protocol version: #{protocol_version}",
        {conversation_type: conversation_et?.type(), use_v3_api: @use_v3_api}
      return protocol_version

  # Initiate calling config update.
  initiate_config: =>
    @_update_calling_config()

  join_call: (conversation_id, video_send) =>
    @get_call_by_id conversation_id
    .then (call_et) ->
      return call_et.state()
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND
      return z.calling.enum.CallState.OUTGOING
    .then (call_state) =>
      if call_state is z.calling.enum.CallState.OUTGOING and not z.calling.CallingRepository.supports_calling()
        return amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_OUTGOING_CALL
      @_check_concurrent_joined_call conversation_id, call_state
      .then =>
        @switch_call_center z.calling.enum.CALL_ACTION.JOIN, [conversation_id, video_send]

  # Forward user action to with a call to the appropriate call center.
  switch_call_center: (fn_name, args) =>
    conversation_id = args[0]

    @get_protocol_of_call conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

      if fn_name is z.calling.enum.CALL_ACTION.JOIN
        return @outgoing_protocol_version conversation_id
    .then (protocol_version) =>
      switch protocol_version
        when z.calling.enum.PROTOCOL.VERSION_2
          @v2_call_center.state_handler[fn_name].apply @, args
        when z.calling.enum.PROTOCOL.VERSION_3
          @v3_call_center[fn_name].apply @, args

  ###
  User action to toggle the call state.
  @param conversation_id [String] Conversation ID of call for which state will be toggled
  @param video_send [Boolean] Is this a video call
  ###
  toggle_state: (conversation_id, video_send) =>
    if @_self_client_on_a_call() is conversation_id
      @switch_call_center z.calling.enum.CALL_ACTION.LEAVE, [conversation_id]
    else
      @join_call conversation_id, video_send

  ###
  Leave a call we are joined immediately in case the browser window is closed.
  @note Should only used by "window.onbeforeunload".
  ###
  leave_call_on_beforeunload: =>
    conversation_id = @_self_client_on_a_call()
    return if not conversation_id

    @get_protocol_of_call conversation_id
    .then (protocol_version) =>
      @v2_call_center.state_handler.leave_call conversation_id if protocol_version is z.calling.enum.PROTOCOL.VERSION_2
    .catch (error) ->
      throw error unless error.type is z.calling.v3.CallError::TYPE.NOT_FOUND

  ###
  Check whether we are actively participating in a call.

  @private
  @param new_call_id [String] Conversation ID of call about to be joined
  @param call_state [z.calling.enum.CallState] Call state of new call
  @return [Promise] Promise that resolves when the new call was joined
  ###
  _check_concurrent_joined_call: (new_call_id, call_state) =>
    return new Promise (resolve) =>
      ongoing_call_id = @_self_participant_on_a_call()
      if ongoing_call_id
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_START_ANOTHER,
          action: ->
            amplify.publish z.event.WebApp.CALL.STATE.LEAVE, ongoing_call_id, z.calling.enum.TERMINATION_REASON.CONCURRENT_CALL
            window.setTimeout resolve, 1000
          close: ->
            amplify.publish z.event.WebApp.CALL.STATE.REJECT, new_call_id if call_state is z.calling.enum.CallState.INCOMING
          data: call_state
        @logger.warn "You cannot join a second call while calling in conversation '#{ongoing_call_id}'."
      else
        resolve()

  ###
  Check if self client is participating in a call.
  @private
  @return [String, Boolean] Conversation ID of call or false
  ###
  _self_client_on_a_call: ->
    return call_et.id for call_et in @calls() when call_et.self_client_joined()

  ###
  Check if self participant is participating in a call.
  @private
  @return [String, Boolean] Conversation ID of call or false
  ###
  _self_participant_on_a_call: ->
    return call_et.id for call_et in @calls() when call_et.self_user_joined()

  ###
  Get the calling config from the backend and store it.
  @private
  ###
  _update_calling_config: ->
    @calling_service.get_config()
    .then (calling_config) =>
      timeout_in_seconds = CALLING_CONFIG.DEFAULT_UPDATE_INTERVAL # Removed reliance on "calling_config.ttl" until further notice
      @logger.info "Updated calling configuration - next update in #{timeout_in_seconds}s", calling_config
      @calling_config calling_config
      window.clearTimeout @calling_config_timeout if @calling_config_timeout
      @calling_config_timeout = window.setTimeout =>
        @_update_calling_config()
      , 1000 * timeout_in_seconds


  ###############################################################################
  # Logging
  ###############################################################################

  # Set logging on adapter.js
  set_logging: (is_logging_enabled) =>
    @logger.info "Set logging for webRTC Adapter: #{is_logging_enabled}"
    adapter?.disableLog = not is_logging_enabled

  # Store last flow status
  store_flow_status: (flow_status) =>
    @flow_status = flow_status if flow_status

  # Report a call for call analysis
  report_call: =>
    @get_call_by_id conversation_id
    .catch =>
      return call_et for call_et in @calls() when call_et.state() not in z.calling.enum.CallStateGroups.IS_ENDED
    .then (call_et) =>
      if call_et
        @_send_report (flow_et.report_status() for flow_et in call_et.get_flows())
      else if @flow_status
        @_send_report @flow_status
      else
        @logger.warn 'Could not find flows to report for call analysis'

  ###
  Send Raygun report.
  @private
  ###
  _send_report = (custom_data) ->
    Raygun.send new Error('Call failure report'), custom_data
    @logger.info "Reported status of flow id '#{custom_data.meta.flow_id}' for call analysis", custom_data
