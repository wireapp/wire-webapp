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

class z.calling.CallService
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.calling.CallService', z.config.LOGGER.OPTIONS

  ###
  Deletes a flow on the backend.

  @note If a call connection with a remote device (participant) ends, we need to delete the flow to this device.

    Sometimes calls to a remote device ended already but the backend state still has active flows to these devices.
    In this case we need to force the deletion of these active flows with the reason "released".

    If we detect on the PeerConnection level, that a remote participant dropped, we can
    delete the flow to them with reason "timeout".

    Possible errors:
    - {"code":404,"message":"the requested flow does not exist","label":"not-found"}
    - {"code":403,"message":"cannot remove active flow","label":"in-use"}

  @param delete_flow_info [Object] Info needed to delete a flow
  @option delete_flow_info [String] conversation_id
  @option delete_flow_info [String] flow_id
  @param callbacks [Array<Function>] Callbacks after the request has been made
  ###
  delete_flow: (delete_flow_info, callbacks) ->
    reason = delete_flow_info.reason
    url = "/conversations/#{delete_flow_info.conversation_id}/call/flows/#{delete_flow_info.flow_id}"
    url += "?reason=#{reason}" if reason

    @client.send_request
      type: 'DELETE'
      api_endpoint: '/conversations/{conversation_id}/call/flows/{flow_id}'
      url: @client.create_url url
      callback: callbacks

  ###
  Lists existing call flows for a specific conversation.

  @param conversation_id [String] Conversation ID
  @param callbacks [Array<Function>] Callbacks after the request has been made
  ###
  get_flows: (conversation_id, callbacks) ->
    @client.send_request
      type: 'GET'
      api_endpoint: '/conversations/{conversation_id}/call/flows'
      url: @client.create_url "/conversations/#{conversation_id}/call/flows"
      callback: callbacks

  ###
  Returns the participants and their call states in a specified conversation.

  @param conversation_id [String] Conversation ID
  @param callbacks [Array<Function>] Callbacks after the request has been made
  ###
  get_state: (conversation_id, callbacks) ->
    @client.send_request
      type: 'GET'
      api_endpoint: '/conversations/{conversation_id}/call/state'
      url: @client.create_url "/conversations/#{conversation_id}/call/state"
      callback: callbacks

  ###
  Commands the backend to create a flow.

  @param conversation_id [String] Conversation ID
  @param callbacks [Array<Function>] Callbacks after the request has been made
  ###
  post_flows: (conversation_id, callbacks) ->
    @client.send_request
      type: 'POST'
      api_endpoint: '/conversations/{conversation_id}/call/flows'
      url: @client.create_url "/conversations/#{conversation_id}/call/flows"
      callback: callbacks

  ###
  Add an ICE candidate.

  @param conversation_id [String] Conversation ID
  @param flow_id [String] Flow ID
  @param ice_info [z.calling.payloads.ICECandidateInfo] Signaling info bundled with ICE candidate
  @param callbacks [Array<Function>] Callbacks after the request has been made
  ###
  post_local_candidates: (conversation_id, flow_id, ice_info, callbacks) ->
    @client.send_json
      type: 'POST'
      api_endpoint: '/conversations/{conversation_id}/call/flows/{flow_id}/local_candidates'
      url: @client.create_url "/conversations/#{conversation_id}/call/flows/#{flow_id}/local_candidates"
      data:
        candidates: [ice_info]
      callback: callbacks

  ###
  Update the SDP of a connection.

  @note Errors can be:
    - {"code":400,"message":"invalid SDP transition requested","label":"bad-sdp"}

    The "bad-sdp" can happen when you send an offer to an offer or if one flow has been already partially negotiated and we try to negotiate for a second flow.

  @param conversation_id [String] Conversation ID
  @param flow_id [String] Flow ID
  @param sdp [z.calling.SDPInfo] Signaling info bundled with SDP
  @param callbacks [Array<Function>] Callbacks after the request has been made
  ###
  put_local_sdp: (conversation_id, flow_id, sdp, callbacks) ->
    @client.send_json
      type: 'PUT'
      api_endpoint: '/conversations/{conversation_id}/call/flows/{flow_id}/local_sdp'
      url: @client.create_url "/conversations/#{conversation_id}/call/flows/#{flow_id}/local_sdp"
      data: sdp
      callback: callbacks

  ###
  Returns the current state of the client and all participants.

  @param conversation_id [String] Conversation ID
  @param payload [Object] Participant payload to be set
  @param callbacks [Array<Function>] Callbacks after the request has been made
  ###
  put_state: (conversation_id, payload, callbacks) ->
    @client.send_json
      type: 'PUT'
      api_endpoint: '/conversations/{conversation_id}/call/state'
      url: @client.create_url "/conversations/#{conversation_id}/call/state"
      data:
        self: payload
      callback: callbacks
