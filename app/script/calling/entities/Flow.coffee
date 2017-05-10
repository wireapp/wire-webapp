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
z.calling.entities ?= {}

FLOW_CONFIG =
  SDP_SEND_TIMEOUT_RESET: 1000
  SDP_SEND_TIMEOUT: 5000

# Flow entity.
class z.calling.entities.Flow
  ###
  Construct a new flow entity.

  @param id [String] ID of the flow
  @param call_et [z.calling.Call] Call entity that the flow belongs to
  @param participant_et [z.calling.Participant] Participant entity that the flow belongs to
  @param audio_context [AudioContext] AudioContext to be used with the flow
  @param timings [z.telemetry.calling.CallSetupTimings] Timing statistics of call setup steps
  ###
  constructor: (@id, @call_et, @participant_et, @audio_context, timings) ->
    @logger = new z.util.Logger "z.calling.Flow (#{@id})", z.config.LOGGER.OPTIONS

    @conversation_id = @call_et.id

    # States
    @converted_own_sdp_state = ko.observable false
    @is_active = ko.observable false
    @is_answer = ko.observable undefined
    @is_group = @call_et.is_group

    # Audio
    @audio = new z.calling.entities.FlowAudio @, @audio_context

    # ICE candidates
    @ice_candidates_cache = []

    # Users
    @creator_user_id = ko.observable undefined
    @remote_user = @participant_et.user
    @remote_user_id = @remote_user.id
    @self_user_id = @call_et.self_user.id

    # Telemetry
    @telemetry = new z.telemetry.calling.FlowTelemetry @id, @remote_user_id, @call_et, timings

    @is_answer.subscribe (is_answer) => @telemetry.update_is_answer is_answer

    @creator_user_id.subscribe (user_id) =>
      if user_id is @self_user_id
        @logger.info "Creator: We are the official '#{z.calling.rtc.SDP_TYPE.OFFER}'"
        @is_answer false
      else
        @logger.info "Creator: We are the official '#{z.calling.rtc.SDP_TYPE.ANSWER}'"
        @is_answer true


    ###############################################################################
    # PeerConnection
    ###############################################################################

    @peer_connection = undefined
    @payload = ko.observable undefined
    @pc_initialized = ko.observable false
    @pc_initialized.subscribe (is_initialized) =>
      @telemetry.set_peer_connection @peer_connection
      @telemetry.schedule_check @call_et.telemetry.media_type if is_initialized

    @media_stream = @call_et.local_media_stream

    @connection_state = ko.observable z.calling.rtc.ICE_CONNECTION_STATE.NEW
    @gathering_state = ko.observable z.calling.rtc.ICE_GATHERING_STATE.NEW
    @signaling_state = ko.observable z.calling.rtc.SIGNALING_OFFER.NEW

    @connection_state.subscribe (ice_connection_state) =>
      switch ice_connection_state
        when z.calling.rtc.ICE_CONNECTION_STATE.COMPLETED, z.calling.rtc.ICE_CONNECTION_STATE.CONNECTED
          @telemetry.start_statistics()
          @call_et.is_connected true
          @participant_et.is_connected true
          @call_et.interrupted_participants.remove @participant_et
          @call_et.state z.calling.enum.CALL_STATE.ONGOING

        when z.calling.rtc.ICE_CONNECTION_STATE.DISCONNECTED
          @participant_et.is_connected false
          @call_et.interrupted_participants.push @participant_et
          @is_answer false
          @negotiation_mode z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART

        when z.calling.rtc.ICE_CONNECTION_STATE.FAILED
          return unless @call_et.self_client_joined()

          @participant_et.is_connected false
          @call_et.delete_participant @participant_et
          return if @call_et.participants().length
          termination_reason = if @call_et.is_connected() then z.calling.enum.TERMINATION_REASON.CONNECTION_DROP else z.calling.enum.TERMINATION_REASON.CONNECTION_FAILED
          amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @call_et.id, termination_reason

        when z.calling.rtc.ICE_CONNECTION_STATE.CLOSED
          @participant_et.is_connected false
          @call_et.delete_participant @participant_et if @call_et.self_client_joined()

    @signaling_state.subscribe (signaling_state) =>
      switch signaling_state
        when z.calling.rtc.SIGNALING_OFFER.CLOSED
          return if @converted_own_sdp_state()
          @logger.debug "PeerConnection with '#{@remote_user.name()}' was closed"
          @call_et.delete_participant @participant_et
          @_remove_media_stream @media_stream()

        when z.calling.rtc.SIGNALING_OFFER.REMOTE_OFFER
          @negotiation_needed true

        when z.calling.rtc.SIGNALING_OFFER.STABLE
          @negotiation_mode z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT

    @negotiation_mode = ko.observable z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT
    @negotiation_needed = ko.observable false

    @negotiation_mode.subscribe (negotiation_mode) =>
      @logger.debug "Negotiation mode changed: #{negotiation_mode}"

    @negotiation_needed.subscribe (negotiation_needed) =>
      @logger.debug 'State changed - negotiation needed: true' if negotiation_needed


    ###############################################################################
    # Local SDP
    ###############################################################################

    @local_sdp_type = ko.observable undefined
    @local_sdp = ko.observable undefined
    @local_sdp.subscribe (sdp) =>
      if sdp
        @local_sdp_type sdp.type
        if @has_sent_local_sdp()
          @has_sent_local_sdp false
          @should_set_local_sdp true

    @has_sent_local_sdp = ko.observable false
    @should_set_local_sdp = ko.observable true

    @send_sdp_timeout = undefined

    @can_set_local_sdp = ko.pureComputed =>
      in_connection_progress = @connection_state() is z.calling.rtc.ICE_CONNECTION_STATE.CHECKING
      progress_gathering_states = [z.calling.rtc.ICE_GATHERING_STATE.GATHERING, z.calling.rtc.ICE_GATHERING_STATE.COMPLETE]
      in_progress = in_connection_progress and @gathering_state() in progress_gathering_states

      is_answer = @local_sdp_type() is z.calling.rtc.SDP_TYPE.ANSWER
      is_offer = @local_sdp_type() is z.calling.rtc.SDP_TYPE.OFFER
      in_remote_offer_state = @signaling_state() is z.calling.rtc.SIGNALING_OFFER.REMOTE_OFFER
      in_stable_state = @signaling_state() is z.calling.rtc.SIGNALING_OFFER.STABLE
      in_proper_state = (is_offer and in_stable_state) or (is_answer and in_remote_offer_state)

      return @local_sdp() and @should_set_local_sdp() and in_proper_state and not in_progress

    @can_set_local_sdp.subscribe (can_set) =>
      if can_set
        @logger.debug "State changed - can_set_local_sdp: #{can_set}"
        @_set_local_sdp()


    ###############################################################################
    # Remote SDP
    ###############################################################################

    @remote_sdp_type = ko.observable undefined
    @remote_sdp = ko.observable undefined
    @remote_sdp.subscribe (sdp) =>
      if sdp
        @remote_sdp_type sdp.type
        @should_set_remote_sdp true

    @should_set_remote_sdp = ko.observable false

    @can_set_remote_sdp = ko.pureComputed =>
      is_answer = @remote_sdp_type() is z.calling.rtc.SDP_TYPE.ANSWER
      is_offer = @remote_sdp_type() is z.calling.rtc.SDP_TYPE.OFFER
      in_local_offer_state = @signaling_state() is z.calling.rtc.SIGNALING_OFFER.LOCAL_OFFER
      in_stable_state = @signaling_state() is z.calling.rtc.SIGNALING_OFFER.STABLE
      in_proper_state = (is_offer and in_stable_state) or (is_answer and in_local_offer_state)

      return @pc_initialized() and @should_set_remote_sdp() and in_proper_state

    @can_set_remote_sdp.subscribe (can_set) =>
      if can_set
        @logger.debug "State changed - can_set_remote_sdp: #{can_set}"
        @_set_remote_sdp()


    ###############################################################################
    # Gates
    ###############################################################################

    @can_create_sdp = ko.pureComputed =>
      in_state_for_creation = @negotiation_needed() and @signaling_state() isnt z.calling.rtc.SIGNALING_OFFER.CLOSED
      can_create = @pc_initialized() and in_state_for_creation
      return can_create

    @can_create_sdp.subscribe (can_create) =>
      if can_create
        @logger.debug "State changed - can_create_sdp: #{can_create}"

    @can_create_answer = ko.pureComputed =>
      answer_state = @is_answer() and @signaling_state() is z.calling.rtc.SIGNALING_OFFER.REMOTE_OFFER
      can_create = @can_create_sdp() and answer_state
      return can_create

    @can_create_answer.subscribe (can_create) =>
      if can_create
        @logger.debug "State changed - can_create_answer: #{can_create}"
        @negotiation_needed false
        @_create_answer()

    @can_create_offer = ko.pureComputed =>
      offer_state = not @is_answer() and @signaling_state() is z.calling.rtc.SIGNALING_OFFER.STABLE
      can_create = @can_create_sdp() and offer_state
      return can_create

    @can_create_offer.subscribe (can_create) =>
      if can_create
        @logger.debug "State changed - can_create_offer: #{can_create}"
        @negotiation_needed false
        @_create_offer()

    @can_initialize_peer_connection = ko.pureComputed =>
      can_initialize = @media_stream() and @payload() and not @pc_initialized()
      return can_initialize

    @can_initialize_peer_connection.subscribe (can_initialize) =>
      if can_initialize
        @logger.debug "State changed - can_initialize_peer_connection: #{can_initialize}"
        @_initialize_peer_connection()

    @can_set_ice_candidates = ko.pureComputed =>
      can_set = @local_sdp() and @remote_sdp() and @signaling_state() is z.calling.rtc.SIGNALING_OFFER.STABLE
      return can_set

    @can_set_ice_candidates.subscribe (can_set) =>
      if can_set
        @logger.debug "State changed - can_set_ice_candidates: #{can_set}"
        @_add_cached_ice_candidates()


  ###############################################################################
  # Payload handling
  ###############################################################################

  ###
  Add the payload to the flow.
  @note Magic here is that if the remote_user is not the creator then the creator *MUST* be us even if creator is null
  @param payload [RTCConfiguration] Configuration to be used to set up the PeerConnection
  ###
  add_payload: (payload) =>
    @logger.info "Setting payload to be used for flow with '#{@remote_user.name()}'"
    return @logger.warn 'Payload already set' if @payload()

    @creator_user_id payload.creator
    @payload @_rewrite_payload payload
    if payload.remote_user isnt payload.creator
      @logger.info "We are the creator of flow with user '#{@remote_user.name()}'"
      @is_answer false
    else
      @logger.info "We are not the creator of flow with user '#{@remote_user.name()}'"
      @is_answer true

    @is_active payload.active
    @audio.hookup payload.active

  ###
  Rewrite the payload to be standards compliant.

  @private
  @param payload [RTCConfiguration] Payload to be rewritten
  @return [RTCConfiguration] Rewritten payload
  ###
  _rewrite_payload: (payload) ->
    for ice_server in payload.ice_servers when not ice_server.urls
      ice_server.urls = [ice_server.url]
      delete ice_server.url
    return payload


  ###############################################################################
  # PeerConnection handling
  ###############################################################################

  ###
  Close the PeerConnection.
  @private
  ###
  _close_peer_connection: ->
    @logger.info "Closing PeerConnection with '#{@remote_user.name()}'"
    if @peer_connection?
      @peer_connection.onsignalingstatechange = =>
        @logger.debug "State change ignored - signaling state: #{@peer_connection.signalingState}"
      @peer_connection.close()
    @logger.debug 'Closing PeerConnection successful'

  ###
  Create the PeerConnection configuration.
  @private
  @return [RTCConfiguration] Configuration object to initialize PeerConnection
  ###
  _configure_peer_connection: ->
    return {
      iceServers: @payload().ice_servers
      bundlePolicy: 'max-bundle'
      rtcpMuxPolicy: 'require' # @deprecated Default value beginning Chrome 57
    }

  ###
  Initialize the PeerConnection for the flow.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
  @private
  ###
  _create_peer_connection: ->
    @peer_connection = new window.RTCPeerConnection @_configure_peer_connection()
    @telemetry.time_step z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED
    @signaling_state @peer_connection.signalingState
    @logger.debug "PeerConnection with '#{@remote_user.name()}' created", @payload().ice_servers

    @peer_connection.onaddstream = @_on_add_stream
    @peer_connection.onaddtrack = @_on_add_track
    @peer_connection.onicecandidate = @_on_ice_candidate
    @peer_connection.oniceconnectionstatechange = @_on_ice_connection_state_change
    @peer_connection.onnegotiationneeded = @_on_negotiation_needed
    @peer_connection.onremovestream = @_on_remove_stream
    @peer_connection.onremovetrack = @_on_remove_track
    @peer_connection.onsignalingstatechange = @_on_signaling_state_change

  # Initialize the PeerConnection.
  _initialize_peer_connection: ->
    @_create_peer_connection()
    @_add_media_stream @media_stream()
    @pc_initialized true
    @negotiation_needed true

  ###
  A MediaStream was added to the PeerConnection.
  @param event [MediaStreamEvent] Event that contains the newly added MediaStream
  ###
  _on_add_stream: (event) =>
    @logger.debug 'Remote MediaStream added to PeerConnection',
      {stream: event.stream, audio_tracks: event.stream.getAudioTracks(), video_tracks: event.stream.getVideoTracks()}
    media_stream = z.media.MediaStreamHandler.detect_media_stream_type event.stream
    if media_stream.type is z.media.MediaType.AUDIO
      media_stream = @audio.wrap_audio_output_stream event.stream
    media_stream_info = new z.media.MediaStreamInfo z.media.MediaStreamSource.REMOTE, @id, media_stream, @call_et
    amplify.publish z.event.WebApp.CALL.MEDIA.ADD_STREAM, media_stream_info

  ###
  A MediaStreamTrack was added to the PeerConnection.
  @param event [MediaStreamTrackEvent] Event that contains the newly added MediaStreamTrack
  ###
  _on_add_track: (event) =>
    @logger.debug 'Remote MediaStreamTrack added to PeerConnection', event

  ###
  A MediaStream was removed from the PeerConnection.
  @param event [MediaStreamEvent] Event that a MediaStream has been removed
  ###
  _on_remove_stream: (event) =>
    @logger.debug 'Remote MediaStream removed from PeerConnection', event

  ###
  A MediaStreamTrack was removed from the PeerConnection.
  @param event [MediaStreamTrackEvent] Event that a MediaStreamTrack has been removed
  ###
  _on_remove_track: (event) =>
    @logger.debug 'Remote MediaStreamTrack removed from PeerConnection', event

  ###
  A local ICE candidates is available.
  @param event [RTCPeerConnectionIceEvent] Event that contains the generated ICE candidate
  ###
  _on_ice_candidate: (event) =>
    @logger.info 'Generated additional ICE candidate', event
    if @has_sent_local_sdp()
      if event.candidate
        @_send_ice_candidate event.candidate
      else
        @logger.info 'End of ICE candidates - trickling end candidate'
        @_send_ice_candidate @_fake_ice_candidate 'a=end-of-candidates'
    else if not event.candidate
      @logger.info 'End of ICE candidates - sending SDP'
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.ICE_GATHERING_COMPLETED
      @send_local_sdp()

  # ICE connection state has changed.
  _on_ice_connection_state_change: (event) =>
    return if not @peer_connection or @call_et.state() in [z.calling.enum.CALL_STATE.DISCONNECTING, z.calling.enum.CALL_STATE.ENDED]

    @logger.debug 'State changed - ICE connection', event
    @logger.log @logger.levels.LEVEL_1, "ICE connection state: #{@peer_connection.iceConnectionState}"
    @logger.log @logger.levels.LEVEL_1, "ICE gathering state: #{@peer_connection.iceGatheringState}"

    @gathering_state @peer_connection.iceGatheringState
    @connection_state @peer_connection.iceConnectionState

  # SDP negotiation needed.
  _on_negotiation_needed: (event) =>
    if not @negotiation_needed()
      @logger.debug 'State changed - negotiation needed: true', event

  # Signaling state has changed.
  _on_signaling_state_change: (event) =>
    @logger.debug "State changed - signaling state: #{@peer_connection.signalingState}", event
    @signaling_state @peer_connection.signalingState


  ###############################################################################
  # SDP handling
  ###############################################################################

  ###
  Save the remote SDP received from backend within the flow.
  @param remote_sdp [RTCSessionDescription] Remote Session Description Protocol
  ###
  save_remote_sdp: (remote_sdp) =>
    @logger.debug "Saving remote '#{remote_sdp.type}' SDP"
    z.calling.mapper.SDPMapper.rewrite_sdp remote_sdp, z.calling.enum.SDP_SOURCE.REMOTE, @
    .then ({sdp: remote_sdp}) =>
      @remote_sdp remote_sdp

  ###
  Initiates sending the local RTCSessionDescriptionProtocol to the remote user.
  @param on_timeout [Boolean] Optional Boolean defaulting to false on whether sending on timout
  ###
  send_local_sdp: (sending_on_timeout = false) =>
    @_clear_send_sdp_timeout()

    z.calling.mapper.SDPMapper.rewrite_sdp @peer_connection.localDescription, z.calling.enum.SDP_SOURCE.LOCAL, @
    .then ({ice_candidates, sdp: local_sdp}) =>
      @local_sdp local_sdp

      if sending_on_timeout and not @_contains_relay_candidate ice_candidates
        @logger.warn "Local SDP does not contain any relay ICE candidates, resetting timeout\n#{ice_candidates}", ice_candidates
        return @_set_send_sdp_timeout false

      sdp_info = new z.calling.payloads.SDPInfo {conversation_id: @conversation_id, flow_id: @id, sdp: @local_sdp()}

      on_success = =>
        @logger.info "Sending local '#{@local_sdp().type}' SDP successful"
        @telemetry.time_step z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SEND

      on_failure = (error) =>
        @logger.warn "Failed to send local '#{@local_sdp().type}' SDP"
        if error.code is z.service.BackendClientError.STATUS_CODE.NOT_FOUND
          return @reset_flow()
        @has_sent_local_sdp false

      @logger.info "Sending local '#{@local_sdp().type}' SDP for flow with '#{@remote_user.name()}'\n#{@local_sdp().sdp}"
      @has_sent_local_sdp true
      amplify.publish z.event.WebApp.CALL.SIGNALING.SEND_LOCAL_SDP_INFO, sdp_info, on_success, on_failure

  ###
  Clear the SDP send timeout.
  @private
  ###
  _clear_send_sdp_timeout: ->
    if @send_sdp_timeout
      window.clearTimeout @send_sdp_timeout
      @send_sdp_timeout = undefined

  ###
  Create a local SDP of type 'answer'.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  @private
  ###
  _create_answer: ->
    @logger.info "Creating '#{z.calling.rtc.SDP_TYPE.ANSWER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createAnswer()
    .then (sdp_answer) =>
      @logger.debug "Creating '#{z.calling.rtc.SDP_TYPE.ANSWER}' successful", sdp_answer
      z.calling.mapper.SDPMapper.rewrite_sdp sdp_answer, z.calling.enum.SDP_SOURCE.LOCAL, @
    .then ({sdp: local_sdp}) =>
      @local_sdp local_sdp
    .catch (error) =>
      @logger.error "Creating '#{z.calling.rtc.SDP_TYPE.ANSWER}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'create_sdp', type: z.calling.rtc.SDP_TYPE.ANSWER}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED

  ###
  Create a local SDP of type 'offer'.

  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
  @private
  @param restart [Boolean] Is ICE restart negotiation
  ###
  _create_offer: (restart) ->
    offer_options =
      iceRestart: restart
      offerToReceiveAudio: true
      offerToReceiveVideo: true
      voiceActivityDetection: true

    @logger.info "Creating '#{z.calling.rtc.SDP_TYPE.OFFER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createOffer offer_options
    .then (sdp_offer) =>
      @logger.debug "Creating '#{z.calling.rtc.SDP_TYPE.OFFER}' successful", sdp_offer
      z.calling.mapper.SDPMapper.rewrite_sdp sdp_offer, z.calling.enum.SDP_SOURCE.LOCAL, @
    .then ({sdp: local_sdp}) =>
      @local_sdp local_sdp
    .catch (error) =>
      @logger.error "Creating '#{z.calling.rtc.SDP_TYPE.OFFER}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'create_sdp', type: z.calling.rtc.SDP_TYPE.OFFER}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      @_solve_colliding_states()

  ###
  Sets the local Session Description Protocol on the PeerConnection.
  @private
  ###
  _set_local_sdp: ->
    @logger.info "Setting local '#{@local_sdp().type}' SDP", @local_sdp()
    @peer_connection.setLocalDescription @local_sdp()
    .then =>
      @logger.debug "Setting local '#{@local_sdp().type}' SDP successful", @peer_connection.localDescription
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SET
      @should_set_local_sdp false
      @_set_send_sdp_timeout()
    .catch (error) =>
      @logger.error "Setting local '#{@local_sdp().type}' SDP failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'set_sdp', location: 'local', type: @local_sdp()?.type}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED

  ###
  Sets the remote Session Description Protocol on the PeerConnection.
  @private
  ###
  _set_remote_sdp: ->
    @logger.info "Setting remote '#{@remote_sdp().type}' SDP\n#{@remote_sdp().sdp}"
    @peer_connection.setRemoteDescription @remote_sdp()
    .then =>
      @logger.debug "Setting remote '#{@remote_sdp().type}' SDP successful", @peer_connection.remoteDescription
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.REMOTE_SDP_SET
      @should_set_remote_sdp false
    .catch (error) =>
      @logger.error "Setting remote '#{@remote_sdp().type}' SDP failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'set_sdp', location: 'remote', type: @remote_sdp()?.type}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED

  ###
  Set the SDP send timeout.
  @private
  @param initial_timeout [Boolean] Optional Boolean defaulting to true in order to choose appropriate timeout length
  ###
  _set_send_sdp_timeout: (initial_timeout = true) ->
    @send_sdp_timeout = window.setTimeout =>
      @logger.debug 'Sending local SDP on timeout'
      @send_local_sdp true
    , if initial_timeout then FLOW_CONFIG.SDP_SEND_TIMEOUT else FLOW_CONFIG.SDP_SEND_TIMEOUT_RESET


  ###############################################################################
  # SDP state collision handling
  ###############################################################################

  ###
  Solve colliding SDP states.
  @note If we receive a remote offer while we have a local offer, we need to check who needs to switch his SDP type.
  @private
  ###
  _solve_colliding_states: ->
    if @self_user_id < @remote_user_id
      @logger.warn "We need to switch state of flow with '#{@remote_user.name()}'. Local SDP needs to be changed."
      return @_switch_local_sdp_state()
    @logger.warn "Remote side needs to switch state of flow with '#{@remote_user.name()}'. Waiting for new remote SDP."


  ###############################################################################
  # ICE candidate handling
  ###############################################################################

  ###
  Add or cache remote ICE candidate.
  @param ice_candidate [RTCIceCandidate] Received remote ICE candidate
  ###
  add_remote_ice_candidate: (ice_candidate) =>
    if z.util.StringUtil.includes ice_candidate.candidate, 'end-of-candidates'
      @logger.info 'Ignoring remote non-candidate'
      return

    if @can_set_ice_candidates()
      @_add_ice_candidate ice_candidate
      @ice_candidates_cache.push ice_candidate
    else
      @ice_candidates_cache.push ice_candidate
      @logger.info 'Cached ICE candidate for flow'

  ###
  Add all cached ICE candidates to the flow.
  @private
  ###
  _add_cached_ice_candidates: ->
    if @ice_candidates_cache.length
      @logger.info "Adding '#{@ice_candidates_cache.length}' cached ICE candidates"
      @_add_ice_candidate ice_candidate for ice_candidate in @ice_candidates_cache
    else
      @logger.info 'No cached ICE candidates found'

  ###
  Add a remote ICE candidate to the flow directly.
  @private
  @param ice_candidate [RTCICECandidate] Received remote ICE candidate
  ###
  _add_ice_candidate: (ice_candidate) ->
    @logger.info "Adding ICE candidate to flow with '#{@remote_user.name()}'", ice_candidate
    @peer_connection.addIceCandidate ice_candidate
    .then =>
      @logger.debug 'Adding ICE candidate successful'
    .catch (error) =>
      @logger.warn "Adding ICE candidate failed: #{error.name}", error
      attributes = {cause: error.name, step: 'add_candidate', type: z.calling.rtc.SDP_TYPE.OFFER}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes

  ###
  Check for relay candidate among given ICE candidates
  @param ice_candidates [Array<String>] Array of ICE candidate strings from SDP
  @return [Boolean] True if relay candidate found
  ###
  _contains_relay_candidate: (ice_candidates) ->
    return true for ice_candidate in ice_candidates when ice_candidate.toLowerCase().includes 'relay'

  ###
  Create a fake ICE candidate from a message.
  @param candidate_message [String] Candidate message for the RTCICECandidate
  @return [Object] Object containing data for RTCICECandidate
  ###
  _fake_ice_candidate: (candidate_message) ->
    return {
      candidate: candidate_message
      sdpMLineIndex: 0
      sdpMid: 'audio'
    }

  ###
  Send an ICE candidate to the backend.
  @private
  @param ice_candidate [RTCICECandidate] Local ICE candidate to be send
  ###
  _send_ice_candidate: (ice_candidate) ->
    unless z.util.StringUtil.includes ice_candidate.candidate, 'UDP'
      return @logger.info "Local ICE candidate ignored as it is not of type 'UDP'"

    if @conversation_id and @id
      ice_info = new z.calling.payloads.ICECandidateInfo @conversation_id, @id, ice_candidate
      @logger.info 'Sending ICE candidate', ice_info
      amplify.publish z.event.WebApp.CALL.SIGNALING.SEND_ICE_CANDIDATE_INFO, ice_info


  ###############################################################################
  # Media stream handling
  ###############################################################################

  ###
  Update the local MediaStream.
  @param media_stream_info [z.media.MediaStreamInfo] Object containing the required MediaStream information
  @return [Promise] Promise that resolves when the updated MediaStream is used
  ###
  update_media_stream: (media_stream_info) =>
    @_replace_media_track media_stream_info
    .catch (error) =>
      if error.type in [z.calling.v3.CallError::TYPE.NO_REPLACEABLE_TRACK, z.calling.v3.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED]
        @logger.info "Replacement of MediaStream and renegotiation necessary: #{error.message}", error
        return @_replace_media_stream media_stream_info
      throw error

  ###
  Adds a local MediaStream to the PeerConnection.
  @private
  @param media_stream [MediaStream] MediaStream to add to the PeerConnection
  ###
  _add_media_stream: (media_stream) ->
    if media_stream.type is z.media.MediaType.AUDIO
      media_stream = @audio.wrap_audio_input_stream media_stream

    if @peer_connection.addTrack
      for media_stream_track in media_stream.getTracks()
        @peer_connection.addTrack media_stream_track, media_stream
        @logger.info "Added local '#{media_stream_track.kind}' MediaStreamTrack to PeerConnection",
          {stream: media_stream, audio_tracks: media_stream.getAudioTracks(), video_tracks: media_stream.getVideoTracks()}
    else
      @peer_connection.addStream media_stream
      @logger.info "Added local '#{media_stream.type}' MediaStream to PeerConnection",
        {stream: media_stream, audio_tracks: media_stream.getAudioTracks(), video_tracks: media_stream.getVideoTracks()}

  ###
  Replace the MediaStream attached to the PeerConnection.
  @private
  @param media_stream_info [z.media.MediaStreamInfo] Object containing the required MediaStream information
  ###
  _replace_media_stream: (media_stream_info) ->
    Promise.resolve()
    .then =>
      return @_remove_media_stream @media_stream()
    .then =>
      @_upgrade_media_stream media_stream_info
    .then (upgraded_media_stream_info) =>
      @negotiation_mode z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE
      @_add_media_stream upgraded_media_stream_info.stream
      @is_answer false
      @negotiation_needed true
      @logger.info 'Replaced the MediaStream successfully', media_stream_info.stream
      return upgraded_media_stream_info
    .catch (error) =>
      @logger.error "Failed to replace local MediaStream: #{error.message}", error
      throw error

  ###
  Replace the a MediaStreamTrack attached to the MediaStream of the PeerConnection.
  @private
  @param media_stream_info [z.media.MediaStreamInfo] Object containing the required MediaStream information
  ###
  _replace_media_track: (media_stream_info) ->
    Promise.resolve()
    .then =>
      if @peer_connection.getSenders
        for rtp_sender in @peer_connection.getSenders() when rtp_sender.track.kind is media_stream_info.type
          throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED unless rtp_sender.replaceTrack
          return rtp_sender
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.NO_REPLACEABLE_TRACK
      throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED
    .then (rtp_sender) ->
      return rtp_sender.replaceTrack media_stream_info.stream.getTracks()[0]
    .then =>
      @logger.info "Replaced the '#{media_stream_info.type}' track"
      return media_stream_info
    .catch (error) =>
      unless error.type in [z.calling.v3.CallError::TYPE.NO_REPLACEABLE_TRACK, z.calling.v3.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED]
        @logger.error "Failed to replace the '#{media_stream_info.type}' track: #{error.name} - #{error.message}", error
      throw error

  ###
  Reset the flows MediaStream and media elements.
  @private
  @param media_stream [MediaStream] Local MediaStream to remove from the PeerConnection
  ###
  _remove_media_stream: (media_stream) ->
    return @logger.info 'No PeerConnection found to remove MediaStream from' if not @peer_connection

    if @peer_connection.removeTrack
      return unless @peer_connection.signalingState is z.calling.rtc.SIGNALING_OFFER.STABLE
      for media_stream_track in media_stream.getTracks()
        for rtp_sender in @peer_connection.getSenders() when rtp_sender.track.id is media_stream_track.id
          @peer_connection.removeTrack rtp_sender
          @logger.info "Removed local '#{media_stream_track.kind}' MediaStreamTrack from PeerConnection"
          break
    else if @peer_connection.signalingState isnt z.calling.rtc.SIGNALING_OFFER.CLOSED
      @peer_connection.removeStream media_stream
      @logger.info "Removed local '#{media_stream.type}' MediaStream from PeerConnection",
        {stream: media_stream, audio_tracks: media_stream.getAudioTracks(), video_tracks: media_stream.getVideoTracks()}

  ###
  Upgrade the local MediaStream with new MediaStreamTracks

  @private
  @param media_stream_info [z.media.MediaStreamInfo] MediaStreamInfo containing new MediaStreamTracks
  @return [z.media.MediaStreamInfo] New MediaStream to be used
  ###
  _upgrade_media_stream: (media_stream_info) ->
    if @media_stream()
      {stream: new_media_stream, type: media_type} = media_stream_info
      for media_stream_track in z.media.MediaStreamHandler.get_media_tracks @media_stream(), media_type
        @media_stream().removeTrack media_stream_track
        media_stream_track.stop()
        @logger.info "Stopping MediaStreamTrack of kind '#{media_stream_track.kind}' successful", media_stream_track

      media_stream = @media_stream().clone()

      media_stream.addTrack media_stream_track for media_stream_track in z.media.MediaStreamHandler.get_media_tracks new_media_stream, media_type
      return new z.media.MediaStreamInfo z.media.MediaStreamSource.LOCAL, 'self', media_stream
    return media_stream_info


  ###############################################################################
  # Reset
  ###############################################################################

  ###
  Reset the flow.
  @note Reset PC initialized first to prevent new local SDP
  ###
  reset_flow: =>
    @_clear_send_sdp_timeout()
    @logger.info "Resetting flow '#{@id}'"
    @telemetry.reset_statistics()
    try
      if @peer_connection?.signalingState isnt z.calling.rtc.SIGNALING_OFFER.CLOSED
        @_close_peer_connection()
    catch error
      @logger.error "We caught the #{error.name}: #{error.message}", error
    @_remove_media_stream @media_stream()
    @_reset_signaling_states()
    @ice_candidates_cache = []
    @payload undefined
    @pc_initialized false
    @logger.debug "Resetting flow '#{@id}' with user '#{@remote_user.name()}' successful"

  ###
  Reset the signaling states.
  @private
  ###
  _reset_signaling_states: ->
    @connection_state z.calling.rtc.ICE_CONNECTION_STATE.NEW
    @gathering_state z.calling.rtc.ICE_GATHERING_STATE.NEW
    @signaling_state z.calling.rtc.SIGNALING_OFFER.NEW


  ###############################################################################
  # Logging
  ###############################################################################

  # Get full telemetry report for automation.
  get_telemetry: =>
    @telemetry.get_automation_report()

  # Log flow status to console.
  log_status: =>
    @telemetry.log_status @participant_et

  # Log flow setup step timings to console.
  log_timings: =>
    @telemetry.log_timings()

  # Report flow status to Raygun.
  report_status: =>
    @telemetry.report_status()

  # Report flow setup step timings to Raygun.
  report_timings: =>
    @telemetry.report_timings()
