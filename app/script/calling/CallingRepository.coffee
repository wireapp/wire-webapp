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
  CONFIG_UPDATE_INTERVAL: 30 * 60 * 1000 # 30 minutes

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

  @param call_service [z.calling.belfry.CallService] Backend REST API call service implementation
  @param calling_service [z.calling.CallingService] Backend REST API calling service implementation
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@call_service, @calling_service, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.calling.CallingRepository', z.config.LOGGER.OPTIONS

    @calling_config = ko.observable()
    @use_v3_api = undefined

    @call_center = new z.calling.belfry.CallCenter @calling_config, @call_service, @conversation_repository, @media_repository, @user_repository
    @e_call_center = new z.calling.e_call.ECallCenter @calling_config, @conversation_repository, @media_repository, @user_repository

    @calls = ko.pureComputed =>
      return @call_center.calls().concat @e_call_center.e_calls()
    @joined_call = ko.pureComputed =>
      return @e_call_center.joined_e_call() or @call_center.joined_call()

    @remote_media_streams = @media_repository.stream_handler.remote_media_streams
    @self_stream_state = @media_repository.stream_handler.self_stream_state

    @flow_status = undefined

    @protocol_version_1to1 = ko.pureComputed => @calling_config()?.features?.protocol_version_1to1
    @protocol_version_group = ko.pureComputed => @calling_config()?.features?.protocol_version_group

    @share_call_states()
    @subscribe_to_events()

  share_call_states: =>
    @media_repository.stream_handler.calls = @calls
    @media_repository.stream_handler.joined_call = @joined_call

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.MEDIA.TOGGLE, => @switch_call_center z.calling.enum.E_CALL_ACTION.TOGGLE_MEDIA, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.DELETE, => @switch_call_center z.calling.enum.E_CALL_ACTION.DELETE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.IGNORE, => @switch_call_center z.calling.enum.E_CALL_ACTION.IGNORE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.JOIN, => @switch_call_center z.calling.enum.E_CALL_ACTION.JOIN, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.LEAVE, => @switch_call_center z.calling.enum.E_CALL_ACTION.LEAVE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, => @switch_call_center z.calling.enum.E_CALL_ACTION.REMOVE_PARTICIPANT, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.TOGGLE, => @switch_call_center z.calling.enum.E_CALL_ACTION.TOGGLE_STATE, arguments
    amplify.subscribe z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, @store_flow_status
    amplify.subscribe z.event.WebApp.LOADED, @initiate_config
    amplify.subscribe z.util.Logger::LOG_ON_DEBUG, @set_logging

  get_protocol_of_call: (conversation_id) =>
    @call_center.get_call_by_id conversation_id
    .then ->
      return z.calling.enum.PROTOCOL_VERSION.BELFRY
    .catch (error) =>
      throw error unless error.type is z.calling.belfry.CallError::TYPE.CALL_NOT_FOUND

      @e_call_center.get_e_call_by_id conversation_id
      .then ->
        return z.calling.enum.PROTOCOL_VERSION.E_CALL

  handled_by_v3: (conversation_id) =>
    conversation_et = @conversation_repository.get_conversation_by_id conversation_id
    v3_api_enabled = @use_v3_api is true or (@protocol_version_1to1() is z.calling.enum.PROTOCOL_VERSION.E_CALL and @use_v3_api isnt false)
    return z.calling.enum.PROTOCOL_VERSION.BELFRY unless v3_api_enabled and not conversation_et?.is_group()
    return z.calling.enum.PROTOCOL_VERSION.E_CALL

  # Initiate calling config update.
  initiate_config: =>
    @_update_calling_config()
    window.setInterval =>
      @_update_calling_config()
    , CALLING_CONFIG.CONFIG_UPDATE_INTERVAL

  # Forward user action to with a call to the appropriate call center.
  switch_call_center: (fn_name, args) =>
    conversation_id = args[0]

    @get_protocol_of_call conversation_id
    .catch (error) =>
      throw error unless error.type is z.calling.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

      if fn_name is z.calling.enum.E_CALL_ACTION.TOGGLE_STATE
        return @handled_by_v3 conversation_id
    .then (protocol_version) =>
      switch protocol_version
        when z.calling.enum.PROTOCOL_VERSION.BELFRY
          @call_center.state_handler[fn_name].apply @, args
        when z.calling.enum.PROTOCOL_VERSION.E_CALL
          @e_call_center[fn_name].apply @, args

  leave_call_on_beforeunload: =>
    @call_center.state_handler.leave_call_on_beforeunload()
    @e_call_center.leave_call_on_beforeunload()

  ###
  Get the calling config from the backend and store it.
  @private
  ###
  _update_calling_config: ->
    @calling_service.get_config()
    .then (calling_config) =>
      @logger.info 'Updated calling configuration', calling_config
      @calling_config $.extend use_v3_api: @use_v3_api, calling_config


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
    .then (call_et) ->
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
  _send_report = (custom_data) =>
    Raygun.send new Error('Call failure report'), custom_data
    @logger.info "Reported status of flow id '#{custom_data.meta.flow_id}' for call analysis", custom_data
