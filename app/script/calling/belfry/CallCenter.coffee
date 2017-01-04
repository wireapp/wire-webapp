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
z.calling.belfry ?= {}

SUPPORTED_EVENTS = [
  z.event.Backend.CALL.FLOW_ADD
  z.event.Backend.CALL.REMOTE_CANDIDATES_ADD
  z.event.Backend.CALL.REMOTE_CANDIDATES_UPDATE
  z.event.Backend.CALL.REMOTE_SDP
  z.event.Backend.CALL.STATE
  z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE
  z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
]

# Call center for all call interactions with the call service.
class z.calling.belfry.CallCenter
  ###
  Construct a new call center.

  @param call_service [z.calling.belfry.CallService] Backend REST API call service implementation
  @param conversation_repository [z.conversation.ConversationRepository] Repository for conversation interactions
  @param media_repository [z.media.MediaRepository] Repository for media interactions
  @param user_repository [z.user.UserRepository] Repository for all user and connection interactions
  ###
  constructor: (@calling_config, @call_service, @conversation_repository, @media_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.calling.belfry.CallCenter', z.config.LOGGER.OPTIONS

    # Telemetry
    @telemetry = new z.telemetry.calling.CallTelemetry()
    @timings = ko.observable()

    # Media Handler
    @media_devices_handler = @media_repository.devices_handler
    @media_stream_handler = @media_repository.stream_handler
    @media_element_handler = @media_repository.element_handler

    # Call Handler
    @state_handler = new z.calling.handler.CallStateHandler @
    @signaling_handler = new z.calling.handler.CallSignalingHandler @

    @calls = @state_handler.calls
    @joined_call = @state_handler.joined_call

    @subscribe_to_events()

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.EVENT_FROM_BACKEND, @on_event
    amplify.subscribe z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, @on_event

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
      return @logger.info "Skipping '#{event.type}' event in conversation '#{event.conversation}'", {event_object: event, event_json: JSON.stringify event}

    @logger.info "Handling '#{event.type}' event in conversation '#{event.conversation}", {event_object: event, event_json: JSON.stringify event}
    if z.calling.CallingRepository.supports_calling()
      return @_on_event_in_supported_browsers event
    return @_on_event_in_unsupported_browsers event

  ###
  Backend calling event handling for browsers supporting calling.
  @private
  @param event [Object] Event payload
  ###
  _on_event_in_supported_browsers: (event) ->
    if @calling_config().use_v3_api
      conversation_et = @conversation_repository.get_conversation_by_id event.conversation
      @logger.warn "Received outdated calling v2 event in conversation '#{event.conversation}'" if conversation_et.is_one2one()

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
        throw new z.calling.belfry.CallError z.calling.belfry.CallError::TYPE.CALL_NOT_FOUND
      throw new z.calling.belfry.CallError z.calling.belfry.CallError::TYPE.NO_CONVERSATION_ID

  ###
  Helper to identify the creator of a call or choose the first joined one.
  @private
  @param event [Object] Event payload
  ###
  get_creator_id: (event) ->
    if creator_id = event.creator or event.from
      return creator_id
    return user_id for user_id, device_info of event.participants when device_info.state is z.calling.enum.ParticipantState.JOINED
