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

CALLING_CONFIG =
  CONFIG_UPDATE_INTERVAL: 6 * 60 * 60 * 1000 # 6 hours

# Call repository for all calling interactions.
class z.e_call.CallingRepository
  ###
  Construct a new E-Call Center repository.

  @param call_service [z.calling.CallService] Backend REST API call service implementation
  @param calling_service [z.e_call.CallingService] Backend REST API calling service implementation
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@call_service, @calling_service, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.e_call.CallingRepository', z.config.LOGGER.OPTIONS

    @calling_config = ko.observable()
    @use_v3_api = false

    @call_center = new z.calling.CallCenter @calling_config, @call_service, @conversation_repository, @media_repository, @user_repository
    @e_call_center = new z.e_call.ECallCenter @calling_config, @conversation_repository, @media_repository, @user_repository

    @calls = ko.pureComputed =>
      return @call_center.calls().concat @e_call_center.e_calls()
    @joined_call = ko.pureComputed =>
      return @e_call_center.joined_e_call() if @e_call_center.joined_e_call()
      return @call_center.joined_call() if @call_center.joined_call()

    @remote_media_streams = @media_repository.stream_handler.remote_media_streams
    @self_stream_state = @media_repository.stream_handler.self_stream_state

    @share_call_states()
    @subscribe_to_events()

  share_call_states: =>
    @media_repository.stream_handler.calls = @calls
    @media_repository.stream_handler.joined_call = @joined_call

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.MEDIA.TOGGLE, => @switch_call_center z.e_call.enum.E_CALL_ACTION.TOGGLE_MEDIA, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.DELETE, => @switch_call_center z.e_call.enum.E_CALL_ACTION.DELETE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.IGNORE, => @switch_call_center z.e_call.enum.E_CALL_ACTION.IGNORE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.JOIN, => @switch_call_center z.e_call.enum.E_CALL_ACTION.JOIN, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.LEAVE, => @switch_call_center z.e_call.enum.E_CALL_ACTION.LEAVE, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, => @switch_call_center z.e_call.enum.E_CALL_ACTION.REMOVE_PARTICIPANT, arguments
    amplify.subscribe z.event.WebApp.CALL.STATE.TOGGLE, => @switch_call_center z.e_call.enum.E_CALL_ACTION.TOGGLE_STATE, arguments
    amplify.subscribe z.event.WebApp.LOADED, @initiate_config

  get_version_of_call: (conversation_id) =>
    @call_center.get_call_by_id conversation_id
    .then ->
      return z.e_call.enum.E_CALL_VERSION.BELFRY
    .catch (error) =>
      throw error unless error.type is z.calling.CallError::TYPE.CALL_NOT_FOUND

      @e_call_center.get_e_call_by_id conversation_id
      .then ->
        return z.e_call.enum.E_CALL_VERSION.E_CALL
      .catch (error) ->
        throw error unless error.type is z.e_call.ECallError::TYPE.E_CALL_NOT_FOUND

  # Initiate calling config update.
  initiate_config: =>
    @_update_calling_config()
    window.setInterval =>
      @_update_calling_config()
    , CALLING_CONFIG.CONFIG_UPDATE_INTERVAL

  # Forward user action to with a call to the appropriate call center.
  switch_call_center: (fn_name, args) =>
    @get_version_of_call args[0]
    .then (call_version) =>
      if not call_version and fn_name is z.e_call.enum.E_CALL_ACTION.TOGGLE_STATE
        call_version = if @use_v3_api then z.e_call.enum.E_CALL_VERSION.E_CALL else z.e_call.enum.E_CALL_VERSION.BELFRY

      switch call_version
        when z.e_call.enum.E_CALL_VERSION.BELFRY
          @call_center.state_handler[fn_name].apply @, args
        when z.e_call.enum.E_CALL_VERSION.E_CALL
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
