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

# Before the first execution:
# grunt test_init
#
# For all subsequent executions:
# grunt test_run:calling/belfry/CallCenter
#
window.wire ?= {}
window.wire.auth ?= {}
window.wire.auth.audio ?= {}

describe 'z.calling.CallCenter', ->
  test_factory = new TestFactory()
  conversation_et = undefined
  user_ets = undefined

  # Mocks
  mocked_stream_object =
    pause: -> return
    play: -> return
    stop: -> return

  navigator.mediaDevices ?= {}
  navigator.mediaDevices.getUserMedia = -> Promise.resolve mocked_stream_object

  # http://w3c.github.io/webrtc-pc/#rtcpeerconnection-interface
  window.RTCPeerConnection = (configuration) ->
    # Properties
    @iceConnectionState = undefined
    @iceGatheringState = undefined
    @localDescription = undefined
    @peerIdentity = undefined
    @remoteDescription = undefined
    @signalingState = undefined

    # Methods
    @addStream = (MediaStream) -> return
    @close = -> return
    @getIdentityAssertion = -> return
    @getLocalStreams = -> return
    @getRemoteStreams = -> return
    @getStreamById = -> return
    @removeStream = (MediaStream) -> return
    @setIdentityProvider = (domainname, protocol, username) -> return
    @setLocalDescription = (RTCSessionDescription, successCallback, errorCallback) -> return
    @setRemoteDescription = (RTCSessionDescription, successCallback, errorCallback) -> return

    # Callbacks
    @onaddstream = (MediaStreamEvent) -> return
    @ondatachannel = (RTCDataChannelEvent) -> return
    @onicecandidate = (RTCPeerConnectionIceEvent) -> return
    @oniceconnectionstatechange = (Event) -> return
    @onidentityresult = (RTCIdentityEvent) -> return
    @onidpassertionerror = (RTCIdentityErrorEvent) -> return
    @onidpvalidationerror = (RTCIdentityErrorEvent) -> return
    @onnegotiationneeded = (Event) -> return
    @onpeeridentity = (Event) -> return
    @onremovestream = (MediaStreamEvent) -> return
    @onsignalingstatechange = (Event) -> return

    return

  # https://developer.mozilla.org/en-US/docs/Web/API/RTCSessionDescription/RTCSessionDescription
  window.RTCSessionDescription = (rtcSessionDescriptionInit) ->

    # http://w3c.github.io/webrtc-pc/#idl-def-RTCIceCandidate
  window.RTCIceCandidate = (candidate_info) ->

  beforeAll (done) ->
    test_factory.exposeCallingActors()
    .then ->
      amplify.publish z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, z.event.NotificationHandlingState.WEB_SOCKET

      # User entities
      build_user = (name, is_self = false) ->
        user_et = new z.entity.User z.util.create_random_uuid()
        user_et.name name
        user_repository.save_user user_et, is_self

        return user_et

      user_ets =
        bart: build_user 'Bartholomew JoJo Simpson'
        bob: build_user 'Dr. Robert Underdunk Terwilliger'
        burns: build_user 'Charles Montgomery Burns'
        flanders: build_user 'Nedward Flanders, Jr.'
        homer: build_user 'Homer Simpson', true
        krusty: build_user 'Herschel Shmoikel Pinchas Yerucham Krustofski'
        lisa: build_user 'Lisa Marie Simpson'
        maggie: build_user 'Margaret Evelyn Simpson'
        marge: build_user 'Marjorie Simpson'
        wiggum: build_user 'Chief Clarence Wiggum'

      # Feed ConversationRepository with a conversation entity
      conversation_et = conversation_repository.conversation_mapper.map_conversation entities.conversation
      conversation_et.participating_user_ids.push user_ets.marge.id
      conversation_repository.conversations.push conversation_et
      conversation_repository.active_conversation conversation_et
      conversation_repository.update_participating_user_ets conversation_et, undefined, true

      # Overrides
      z.util.Environment.browser.supports.calling = true
      call_center.request_media_stream = -> Promise.resolve()
      done()
    .catch done.fail

  beforeEach ->
    jasmine.Ajax.install()
    call_center.calls []

  afterEach ->
    jasmine.Ajax.uninstall()

  describe 'Call entity states', ->
    scenario_1 = {}

    beforeAll ->
      ###########################
      # Scenario 1: Marge calls Homer while Homer is away
      ###########################

      scenario_1.session_id = '542a7c1c-f0a4-4e7f-9664-66a6f826e941'
      scenario_1.event_1 = {
        'conversation': conversation_et.id,
        'cause': 'requested',
        'participants': {
          "#{user_ets.marge.id}": {'state': 'joined'},
          "#{user_ets.homer.id}": {'state': 'idle'}
        },
        'self': null,
        'sequence': 31,
        'type': 'call.state',
        'session': scenario_1.session_id
      }

    it 'handles call and flow creation', (done) ->
      # Create call entity
      conversation_et = conversation_repository.conversations()[0]
      conversation_id = conversation_et.id
      call_center.state_handler._create_call scenario_1.event_1
      .then (call_et) =>
        expect(call_et.id).toEqual conversation_id
        expect(conversation_repository.active_conversation().id).toEqual conversation_id

        # Use the call entity to construct a flow
        flow_id = 'c3cf9efb-61a0-48b2-99ec-b6b7c88ca029'
        flow_et = call_et.construct_flow flow_id, user_ets.bart
        expect(flow_et.remote_user.name()).toEqual user_ets.bart.name()

        # Verify that flow has been been assigned to the call entity
        participant_et = call_et.get_participant_by_id user_ets.bart.id
        expect(participant_et).toBeDefined()
        expect(call_et.get_number_of_participants()).toEqual 1
        expect(call_et.get_number_of_flows()).toBe 1
        expect(call_et.get_flow_by_id flow_id).toBeDefined()
        expect(participant_et.get_flow().id).toBe flow_id

        # Add a new flow to the same participant
        flow_id = '29063fe1-c622-4d32-ad20-cbcfb45b7af0'
        flow_et = call_et.construct_flow flow_id, participant_et.user
        expect(call_et.get_number_of_participants()).toEqual 1
        expect(call_et.get_number_of_flows()).toBe 1
        expect(call_et.get_flow_by_id flow_id).toBeDefined()

        # Add a flow for another participant
        flow_id = '788def27-87d2-4eaa-a274-cc347c2ff888'
        flow_et = call_et.construct_flow flow_id, user_ets.marge
        expect(call_et.get_number_of_participants()).toEqual 2
        expect(call_et.get_number_of_flows()).toBe 2
        expect(call_et.get_flow_by_id flow_id).toBeDefined()
        done()
      .catch done.fail

    it 'extracts the creator from a given flow event', ->
      call_state_event = {
        "conversation": "c1d0e558-0eb9-4c38-a930-78ca29b93d0e",
        "cause": "requested",
        "participants": {
          "8b497692-7a38-4a5d-8287-e3d1006577d6": {"state": "idle", "quality": null},
          "36876ec6-9481-41db-a6a8-94f92953c538": {"state": "joined", "quality": null}
        },
        "self": null,
        "sequence": 173,
        "type": "call.state",
        "session": "68dbf9b4-8571-42e1-a517-9bd7f8a8bbe4"
      }

      post_for_flows_payload = {
        "creator": "8b497692-7a38-4a5d-8287-e3d1006577d6",
        "ice_servers": [{
          "url": "turn:54.155.57.143:3478",
          "credential": "lihoHhYCRF0mhlTVACfVYW3xSqWBIcYV5muF3C4i11dpdl1U3VXQCJkpDsOi/ZqD9Tw6eOynpLVb57ty/1cw5Q==",
          "username": "d=1436996143.v=1.k=0.t=s.r=ghnghzyfrmcbsrnr"
        }],
        "active": false,
        "remote_user": "bc0c99f1-49a5-4ad2-889a-62885af37088",
        "sdp_step": "pending",
        "id": "2592f48d-af30-4183-a4d3-1c6ecb758b96"
      }

      creator_id = call_center.get_creator_id call_state_event
      expect(creator_id).toEqual '36876ec6-9481-41db-a6a8-94f92953c538'
      creator_id = call_center.get_creator_id post_for_flows_payload
      expect(creator_id).toEqual post_for_flows_payload.creator

    xit 'updates the call info when two remote users have a call in a group conversation with us', (done) ->
      spyOn(call_center, '_on_event_in_supported_browsers').and.callThrough()

      # @formatter:off
      events = [
        JSON.parse('{"conversation":"'+conversation_et.id+'","type":"call.state","cause":"requested","participants":{"'+user_ets.bart.id+'":{"state":"idle","quality":null},"'+user_ets.maggie.id+'":{"state":"idle","quality":null},"b7cc6726-deda-4bd1-a10d-a0c6a0baf878":{"state":"idle","quality":null},"'+user_ets.wiggum.id+'":{"state":"idle","quality":null},"'+user_ets.burns.id+'":{"state":"idle","quality":null},"'+user_ets.flanders.id+'":{"state":"joined","quality":null}},"self":null,"sequence":74,"session":"3d2c0f26-1e87-42b7-8b0a-5de83b44b9be"}')
        JSON.parse('{"conversation":"'+conversation_et.id+'","type":"call.state","cause":"requested","participants":{"'+user_ets.bart.id+'":{"state":"idle","quality":null},"'+user_ets.maggie.id+'":{"state":"idle","quality":null},"b7cc6726-deda-4bd1-a10d-a0c6a0baf878":{"state":"idle","quality":null},"'+user_ets.wiggum.id+'":{"state":"idle","quality":null},"'+user_ets.burns.id+'":{"state":"joined","quality":null},"'+user_ets.flanders.id+'":{"state":"joined","quality":null}},"self":null,"sequence":75,"session":"3d2c0f26-1e87-42b7-8b0a-5de83b44b9be"}')
      ]
      # @formatter:on

      # Fake backend events
      for event in events
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, event

      expect(call_center._on_event_in_supported_browsers.calls.count()).toBe 2

      # Checking call entity states
      expect(call_center.calls().length).toBe 1

      call_center.get_call_by_id conversation_et.id
      .then (call_et) =>
        expect(call_et.get_number_of_participants()).toBe 2
        # Check that the first user who set his/her state to "joined" is marked as the creator of the call
        expect(call_et.creator().name()).toBe user_ets.flanders.name()
        done()
      .catch done.fail

    xit 'can setup outgoing calls (Homer calls Marge)', (done) ->
      #@formatter:off
      responses = {
        "#{test_factory.settings.connection.rest_url}/conversations/#{conversation_et.id}/call/state": {
          'PUT': [
            {request: {"self":{"state":"joined"}}, response: {contentType: 'application/json', responseText: "{\"sequence\":9,\"session\":\"9083b43b-826b-45f9-9252-89263ef160ca\",\"self\":{\"state\":\"joined\",\"quality\":null},\"type\":\"call.state\",\"conversation\":\"#{conversation_et.id}\",\"participants\":{\"#{user_ets.marge.id}\":{\"state\":\"idle\"},\"#{user_ets.homer.id}\":{\"state\":\"joined\"}}}", status: 200}}
          ]
        }
      }

      # Init outgoing call
      amplify.publish z.event.WebApp.CALL.STATE.JOIN, conversation_et.id
      mock = new z.test.calling.CallRequestResponseMock jasmine.Ajax.requests, responses

      # Handle backend events
      expect(mock.process_request "#{test_factory.settings.connection.rest_url.rest_url}/conversations/#{conversation_et.id}/call/state", 'PUT', {"self":{"state":"joined"}}).toBe true
      #@formatter:on

      call_center.get_call_by_id conversation_et.id
      .then (call_et) =>
        expect(call_et).toBeDefined()
        expect(call_et.creator().name()).toBe user_ets.homer.name()
        expect(call_et.state()).toBe z.calling.enum.CallState.OUTGOING
        expect(call_et.get_number_of_participants()).toBe 1
        done()
      .catch done.fail

  xdescribe 'Ongoing call banner', ->
    it 'recognizes an incoming 1-to-1 call which is ongoing on another client', (done) ->
      #@formatter:off
      amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":20,"session":"54e1fd34-fc9f-4de5-85e6-8bd50e63534e","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"joined"},"#{user_ets.homer.id}":{"state":"idle"}}}
      call_center.get_call_by_id conversation_et.id
      .then (call_et) =>
        expect(call_et.get_number_of_participants()).toEqual 1
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":21,"session":"54e1fd34-fc9f-4de5-85e6-8bd50e63534e","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"joined"},"#{user_ets.homer.id}":{"state":"joined"}}}
      #@formatter:on

        expect(call_et).toBeDefined()
        expect(call_et.self_user_joined()).toBeTruthy()
        expect(call_et.self_client_joined()).toBeFalsy()

        expect(call_et.state()).toBe z.calling.enum.CallState.ONGOING
        expect(call_et.get_number_of_participants()).toEqual 1
        done()
      .catch done.fail

    it 'recognizes an outgoing 1-to-1 call which is ongoing on another client', (done) ->
      #@formatter:off
      amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":14,"session":"9ec49daf-a28f-4778-8015-2de1e0147639","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"joined","quality":null}}}
      #@formatter:on
      call_center.get_call_by_id conversation_et.id
      .then (call_et) =>
        expect(call_et).toBeDefined()
        expect(call_et.self_user_joined()).toBeTruthy()
        expect(call_et.self_client_joined()).toBeFalsy()

        expect(call_et.state()).toBe z.calling.enum.CallState.ONGOING
        expect(call_et.get_number_of_participants()).toBe 0 # Marge hasn't accepted yet
        done()
      .catch done.fail

    it 'recognizes an incoming group call which is ongoing on another client', (done) ->
      #@formatter:off
      amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1285,"session":"ad31842f-1cc8-418c-aaa9-9847a8b2da4c","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"idle","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"joined","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"idle","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"idle","quality":null}}}
      call_center.get_call_by_id conversation_et.id
      .then (call_et) =>
        expect(call_et.get_number_of_participants()).toEqual 1
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1286,"session":"ad31842f-1cc8-418c-aaa9-9847a8b2da4c","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"idle","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"joined","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"idle","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"joined","quality":null}}}
        expect(call_et.get_number_of_participants()).toEqual 2
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1287,"session":"ad31842f-1cc8-418c-aaa9-9847a8b2da4c","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"joined","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"joined","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"idle","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"joined","quality":null}}}
        expect(call_et.get_number_of_participants()).toEqual 3
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1288,"session":"ad31842f-1cc8-418c-aaa9-9847a8b2da4c","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"joined","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"joined","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"joined","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"joined","quality":null}}}
        #@formatter:on

        expect(call_et).toBeDefined()
        expect(call_et.self_user_joined()).toBeTruthy()
        expect(call_et.self_client_joined()).toBeFalsy()

        expect(call_et.state()).toBe z.calling.enum.CallState.ONGOING
        expect(call_et.get_number_of_participants()).toEqual 3
        done()
      .catch done.fail

    it 'recognizes an outgoing group call which is ongoing on another client', (done) ->
      #@formatter:off
      amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1304,"session":"5b1b6e6e-d961-485d-9c57-b36965ec9254","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"idle","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"idle","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"joined","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"idle","quality":null}}}
      call_center.get_call_by_id conversation_et.id
      .then (call_et) =>
        expect(call_et.get_number_of_participants()).toEqual 0
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1305,"session":"5b1b6e6e-d961-485d-9c57-b36965ec9254","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"idle","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"joined","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"joined","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"idle","quality":null}}}
        expect(call_et.get_number_of_participants()).toEqual 1
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1306,"session":"5b1b6e6e-d961-485d-9c57-b36965ec9254","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"joined","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"joined","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"joined","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"idle","quality":null}}}
        expect(call_et.get_number_of_participants()).toEqual 2
        amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, {"sequence":1307,"session":"5b1b6e6e-d961-485d-9c57-b36965ec9254","cause":"requested","self":null,"type":"call.state","conversation":"#{conversation_et.id}","participants":{"#{user_ets.marge.id}":{"state":"idle","quality":null},"#{user_ets.bart.id}":{"state":"joined","quality":null},"#{user_ets.lisa.id}":{"state":"idle","quality":null},"#{user_ets.maggie.id}":{"state":"joined","quality":null},"#{user_ets.flanders.id}":{"state":"idle","quality":null},"#{user_ets.burns.id}":{"state":"idle","quality":null},"#{user_ets.homer.id}":{"state":"joined","quality":null},"#{user_ets.wiggum.id}":{"state":"idle","quality":null},"#{user_ets.bob.id}":{"state":"joined","quality":null}}}
        #@formatter:on


        expect(call_et).toBeDefined()
        expect(call_et.self_user_joined()).toBeTruthy()
        expect(call_et.self_client_joined()).toBeFalsy()

        expect(call_et.state()).toBe z.calling.enum.CallState.ONGOING
        expect(call_et.get_number_of_participants()).toEqual 3
        done()
      .catch done.fail

  describe 'put call state to join', ->
    server = undefined

    beforeEach ->
      server = sinon.fakeServer.create()
      server.autoRespond = true

    afterEach ->
      server.restore()

    it 'can put the call state to join', (done) ->
      response_payload = {
        'participants': {
          'c3da84e6-4cc4-4272-aadb-0dea47ccf099': {
            'state': 'joined'
            'videod': false
          }
          '90793032-2757-4733-9d69-01847cc58a79': {
            'state': 'idle'
          }
        }
        'self': {
          'state': 'joined'
          'videod': false
        }
        'sequence': 1
        'session': 'b24dfebe-add9-4f2a-8953-3a1947a7b929'
      }

      call_center.state_handler._put_state conversation_et.id, {state: z.calling.enum.ParticipantState.JOINED, videod: false}
      .then (response) ->
        expect(response).toEqual response_payload
        done()
      .catch done.fail
      server.requests[0].respond 200, 'Content-Type': 'application/json', JSON.stringify response_payload

    it 'handles the 409 when there are too many people in the conversation', (done) ->
      error_payload = {
        'code': 409
        'label': 'conv-too-big'
        'max_members': 10
        'member_count': 11
        'message': 'too many members for calling'
      }
      spyOn call_center.media_stream_handler, 'release_media_streams'

      call_center.state_handler._put_state conversation_et.id, {state: z.calling.enum.ParticipantState.JOINED, videod: false}
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.calling.belfry.CallError
        expect(error.type).toBe z.calling.belfry.CallError::TYPE.CONVERSATION_TOO_BIG
        expect(call_center.media_stream_handler.release_media_streams).toHaveBeenCalled()
        done()
      server.requests[0].respond 409, 'Content-Type': 'application/json', JSON.stringify error_payload

    it 'handles the 409 when there are too many people in the call', (done) ->
      error_payload = {
        'code': 409
        'label': 'voice-channel-full'
        'max_joined': 5
        'message': 'the voice channel is full'
      }
      spyOn call_center.media_stream_handler, 'release_media_streams'

      call_center.state_handler._put_state conversation_et.id, {state: z.calling.enum.ParticipantState.JOINED, videod: false}
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.calling.belfry.CallError
        expect(error.type).toBe z.calling.belfry.CallError::TYPE.VOICE_CHANNEL_FULL
        expect(call_center.media_stream_handler.release_media_streams).toHaveBeenCalled()
        done()
      server.requests[0].respond 409, 'Content-Type': 'application/json', JSON.stringify error_payload

    it 'handles the 400 when there is no one left in the conversation to the call', (done) ->
      error_payload = {
        'code': 400
        'label': 'invalid-op'
        'message': 'Nobody left to call'
      }
      spyOn call_center.media_stream_handler, 'release_media_streams'

      call_center.state_handler._put_state conversation_et.id, {state: z.calling.enum.ParticipantState.JOINED, videod: false}
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.calling.belfry.CallError
        expect(error.type).toBe z.calling.belfry.CallError::TYPE.CONVERSATION_EMPTY
        expect(call_center.media_stream_handler.release_media_streams).toHaveBeenCalled()
        done()
      server.requests[0].respond 400, 'Content-Type': 'application/json', JSON.stringify error_payload
