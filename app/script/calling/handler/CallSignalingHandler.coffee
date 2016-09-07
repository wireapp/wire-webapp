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
z.calling.handler ?= {}

# Call signaling handler
class z.calling.handler.CallSignalingHandler
  ###
  Construct a new call signaling handler.
  @param call_center [z.calling.CallCenter] Call center with references to all other handlers
  ###
  constructor: (@call_center) ->
    @logger = new z.util.Logger 'z.calling.handler.CallSignalingHandler', z.config.LOGGER.OPTIONS

    # Caches
    @candidate_cache = {}
    @sdp_cache = {}

    # Mapper
    @ice_mapper = new z.calling.mapper.ICECandidateMapper()
    @sdp_mapper = new z.calling.mapper.SDPMapper()

    @subscribe_to_events()
    return

  # Subscribe to amplify topics.
  subscribe_to_events: =>
    amplify.subscribe z.event.WebApp.CALL.SIGNALING.DELETE_FLOW, @delete_flow
    amplify.subscribe z.event.WebApp.CALL.SIGNALING.POST_FLOWS, @post_for_flows
    amplify.subscribe z.event.WebApp.CALL.SIGNALING.SEND_ICE_CANDIDATE_INFO, @post_ice_candidate
    amplify.subscribe z.event.WebApp.CALL.SIGNALING.SEND_LOCAL_SDP_INFO, @put_local_sdp

  # Un-subscribe from amplify topics.
  un_subscribe: ->
    subscriptions = [
      z.event.WebApp.CALL.SIGNALING.DELETE_FLOW
      z.event.WebApp.CALL.SIGNALING.POST_FLOWS
      z.event.WebApp.CALL.SIGNALING.SEND_ICE_CANDIDATE_INFO
      z.event.WebApp.CALL.SIGNALING.SEND_LOCAL_SDP_INFO
    ]
    amplify.unsubscribeAll topic for topic in subscriptions


  ###############################################################################
  # Events
  ###############################################################################

  ###
  Handling of 'call.flow-add' events.
  @param event [Object] Event payload
  ###
  on_flow_add_event: (event) =>
    @call_center.get_call_by_id event.conversation
    .then (call_et) =>
      @_add_flow call_et, flow for flow in event.flows
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Ignored 'call.flow-add' in '#{event.conversation}' that has no call", error

  ###
  Handling of 'call.flow-delete' events.
  @param event [Object] Event payload
  ###
  on_flow_delete_event: (event) =>
    @call_center.get_call_by_id event.conversation
    .then (call_et) =>
      @_add_flow call_et, event.flow
    .catch =>
      @logger.log @logger.levels.WARN, "Ignored 'call.flow-delete' in '#{event.conversation}' that has no call", event

  ###
  Handling of 'call.remote-candidates-add' and 'call.remote-candidates-update' events.
  @param event [Object] Event payload
  ###
  on_remote_ice_candidates: (event) =>
    mapped_candidates = (@ice_mapper.map_ice_message_to_object candidate for candidate in event.candidates)

    @call_center.get_call_by_id event.conversation
    .then (call_et) =>
      # And either add
      if flow_et = call_et.get_flow_by_id event.flow
        @logger.log @logger.levels.INFO, "Received '#{mapped_candidates.length}' ICE candidates for existing flow '#{event.flow}'", mapped_candidates
        for ice_candidate in mapped_candidates
          flow_et.add_remote_ice_candidate ice_candidate
      else
        throw new z.calling.CallError z.calling.CallError::TYPE.FLOW_NOT_FOUND
    .catch =>
      # Or cache them
      @logger.log @logger.levels.INFO, "Cached '#{mapped_candidates.length}' ICE candidates for unknown flow '#{event.flow}'", mapped_candidates
      for ice_candidate in mapped_candidates
        @_cache_ice_candidate event.flow, ice_candidate

  ###
  Handling of 'call.remote-sdp' events.
  @param event [Object] Event payload
  ###
  on_remote_sdp: (event) =>
    remote_sdp = @sdp_mapper.map_sdp_event_to_object event

    @call_center.get_call_by_id event.conversation
    .then (call_et) =>
      if flow_et = call_et.get_flow_by_id event.flow
        @logger.log @logger.levels.INFO, "Received remote SDP for existing flow '#{event.flow}'", remote_sdp
        flow_et.save_remote_sdp remote_sdp
      else
        throw new z.calling.CallError z.calling.CallError::TYPE.FLOW_NOT_FOUND
    .catch (error) =>
      if error.type is z.calling.CallError::TYPE.FLOW_NOT_FOUND
        if event.state is z.calling.rtc.SDPType.OFFER
          @_cache_remote_sdp event.flow, remote_sdp
          @logger.log @logger.levels.INFO, "Cached remote SDP for unknown flow '#{event.flow}'", remote_sdp
        else
          @logger.log @logger.levels.WARN, "Ignored remote SDP non-offer before call for flow '#{event.flow}'", remote_sdp
      else
        @logger.log @logger.levels.ERROR, "Failed to handle remote SDP: #{error.message}", error


  ###############################################################################
  # Flows
  ###############################################################################

  ###
  Delete a flow on the backend.
  @private
  @param delete_flow_info [z.calling.payloads.FlowDeletionInfo] Contains Conversation ID, Flow ID and Reason for flow deletion
  ###
  delete_flow: (flow_info) =>
    Promise.resolve @call_center.media_element_handler.remove_media_element flow_info.flow_id
    .then =>
      @logger.log @logger.levels.INFO, "DELETEing flow '#{flow_info.flow_id}'"
      return @call_center.call_service.delete_flow flow_info, []
    .then (response_array) =>
      [response, jqXHR] = response_array
      @call_center.telemetry.trace_request flow_info.conversation_id, jqXHR
      @logger.log @logger.levels.DEBUG, "DELETEing flow '#{flow_info.flow_id}' successful"
      if flow_info.reason is z.calling.payloads.FlowDeletionReason.RELEASED
        @logger.log @logger.levels.DEBUG, 'Flow was released - We need implement posting for flows to renegotiate'
      return response
    .catch (error) =>
      if error.label is z.service.BackendClientError::LABEL.IN_USE
        @logger.log @logger.levels.WARN, "DELETEing flow '#{flow_info.flow_id}' would have to be forced"
        flow_info.reason = z.calling.payloads.FlowDeletionReason.RELEASED
        return @delete_flow flow_info
      @logger.log @logger.levels.ERROR, "DELETEing flow '#{flow_info.flow_id}' failed: #{error.message}", error
      attributes = {cause: error.label or error.name, method: 'delete', request: 'flows'}
      @call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes

  ###
  Post for flows.
  @param conversation_id [String] Conversation ID of call to be posted for flows
  ###
  post_for_flows: (conversation_id) =>
    @logger.log @logger.levels.INFO, "POSTing for flows in conversation '#{conversation_id}'"
    @call_center.call_service.post_flows conversation_id, []
    .then (response_array) =>
      [response, jqXHR] = response_array
      @call_center.telemetry.trace_request conversation_id, jqXHR
      return @call_center.get_call_by_id conversation_id
      .then (call_et) =>
        @logger.log @logger.levels.DEBUG, "POSTing for flows in '#{conversation_id}' successful", response
        @_add_flow call_et, flow for flow in response.flows when flow.active is true
    .catch (error) =>
      if error.type is z.calling.CallError::TYPE.CALL_NOT_FOUND
        @logger.log @logger.levels.WARN, "POSTing for flows in '#{conversation_id}' successful, call gone", error
      else
        @logger.log @logger.levels.ERROR,
          "POSTing for flows in conversation '#{conversation_id}' failed: #{error.message}", error
        attributes = {cause: error.label or error.name, method: 'post', request: 'flows'}
        @call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes

  ###
  Create a flow in a call.

  @private
  @param call_et [z.calling.Call] Call entity
  @param payload [Object] Payload for call to be created
  ###
  _add_flow: (call_et, payload) ->
    @call_center.user_repository.get_user_by_id payload.remote_user, (user_et) =>
      # Get or construct flow entity
      flow_et = call_et.get_flow_by_id payload.id
      if not flow_et
        flow_et = call_et.construct_flow payload.id, user_et, @call_center.audio_repository.get_audio_context(), @call_center.timings()

      # Add payload to flow entity
      flow_et.add_payload payload

      # Unpack cache entries
      if @sdp_cache[flow_et.id] isnt undefined
        flow_et.save_remote_sdp @sdp_cache[flow_et.id]
        delete @sdp_cache[flow_et.id]
      if @candidate_cache[flow_et.id] isnt undefined
        for ice_candidate in @candidate_cache[flow_et.id]
          flow_et.add_remote_ice_candidate ice_candidate
        delete @candidate_cache[flow_et.id]

  ###
  Delete all flows from a call.
  @private
  @param conversation_id [String] Conversation ID to get and delete all flows for
  ###
  _delete_flows: (conversation_id) ->
    @logger.log @logger.levels.WARN, "Deleting all flows for '#{conversation_id}'"
    @_get_flows conversation_id
    .then (flows) =>
      flows_to_delete = flows.length

      if flows_to_delete is 0
        @logger.log @logger.levels.INFO, "No flows for conversation '#{conversation_id}' to delete"
        return

      @logger.log @logger.levels.INFO, "We will cleanup '#{flows.length}' flows from conversation '#{conversation_id}'"

      deletions = 0
      for flow in flows
        flow_deletion_info = new z.calling.payloads.FlowDeletionInfo conversation_id, flow.id
        @delete_flow flow_deletion_info
        .then =>
          deletions += 1
          if deletions is flows_to_delete
            @logger.log @logger.levels.INFO, "We deleted all '#{deletions}' flows for conversation '#{conversation_id}'"

  ###
  Get flows from backend.
  @private
  @param conversation_id [String] Conversation ID of call to get flows for
  ###
  _get_flows: (conversation_id) ->
    @logger.log @logger.levels.INFO, "GETting flows for '#{conversation_id}'"
    return @call_center.call_service.get_flows conversation_id, []
    .then (response_array) =>
      [response, jqXHR] = response_array
      @logger.log @logger.levels.DEBUG, "GETting flows for '#{conversation_id}' successful"
      return response.flows
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "GETting flows for '#{conversation_id}' failed: #{error.message}", error
      attributes = {cause: error.label or error.name, method: 'get', request: 'flows'}
      @call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes


  ###############################################################################
  # SDP handling
  ###############################################################################

  ###
  Put the local SDP on the backend.

  @param sdp_info [z.calling.payloads.SDPInfo] SDP info to be send
  @param on_success [Function] Function to be called on success
  @param on_error [Function] Function to be called on failure
  ###
  put_local_sdp: (sdp_info, on_success, on_failure) =>
    @logger.log @logger.levels.INFO, "PUTting local SDP for flow '#{sdp_info.flow_id}'", sdp_info
    @call_center.call_service.put_local_sdp sdp_info.conversation_id, sdp_info.flow_id, sdp_info.sdp, []
    .then (response_array) =>
      [response, jqXHR] = response_array
      @call_center.telemetry.trace_request sdp_info.conversation_id, jqXHR
      @logger.log @logger.levels.DEBUG, "PUTting local SDP for flow '#{sdp_info.flow_id}' successful"
      on_success? response
    .catch (error) =>
      @logger.log @logger.levels.ERROR,
        "PUTting local SDP for flow '#{sdp_info.flow_id}' failed: #{error.message}", error
      attributes = {cause: error.label or error.name, method: 'put', request: 'sdp', sdp_type: sdp_info.sdp.type}
      @call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes
      on_failure? error

  ###
  Cache remote SDP until we have the flow.

  @private
  @param flow_id [String] Flow ID
  @param sdp [RTCSessionDescription] Remote SDP
  ###
  _cache_remote_sdp: (flow_id, sdp) ->
    @sdp_cache[flow_id] = sdp
    window.setTimeout =>
      delete @sdp_cache[flow_id]
    , 60000


  ###############################################################################
  # ICE candidate handling
  ###############################################################################

  ###
  Post a local ICE candidate to the backend.
  @param ice_info [z.calling.payloads.ICECandidateInfo] ICE candidate info to be send
  ###
  post_ice_candidate: (ice_info) =>
    candidate = @ice_mapper.map_ice_object_to_message ice_info.ice_candidate

    @logger.log @logger.levels.INFO, "POSTing local ICE candidate for flow '#{ice_info.flow_id}'", candidate
    @call_center.call_service.post_local_candidates ice_info.conversation_id, ice_info.flow_id, candidate, []
    .then (response_array) =>
      [response, jqXHR] = response_array
      @call_center.telemetry.trace_request ice_info.conversation_id, jqXHR
      @logger.log @logger.levels.INFO, "POSTing local ICE candidate for flow '#{ice_info.flow_id}' successful"
    .catch (error) =>
      @logger.log @logger.levels.ERROR,
        "POSTing local ICE candidate for flow '#{ice_info.flow_id}' failed: #{error.message}", error
      attributes = {cause: error.label or error.name, method: 'put', request: 'ice_candidate'}
      @call_center.telemetry.track_event z.tracking.EventName.CALLING.FAILED_REQUEST, undefined, attributes

  ###
  Cache remote ICE candidate until we have the flow.

  @private
  @param flow_id [String] Flow ID
  @param candidate [RTCIceCandidate] Remote ICE candidate
  ###
  _cache_ice_candidate: (flow_id, candidate) ->
    list = @candidate_cache[flow_id]
    if list is undefined
      list = []
      @candidate_cache[flow_id] = list
      window.setTimeout =>
        delete @candidate_cache[flow_id]
      , 60000
    list.push candidate
