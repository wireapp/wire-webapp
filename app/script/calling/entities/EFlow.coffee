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

E_FLOW_CONFIG =
  DATA_CHANNEL_LABEL: 'calling-3.0'
  NEGOTIATION_FAILED_TIMEOUT: 30 * 1000
  NEGOTIATION_RESTART_TIMEOUT: 2500
  SDP_SEND_TIMEOUT: 5 * 1000
  SDP_SEND_TIMEOUT_RESET: 1000

# E-Flow entity.
class z.calling.entities.EFlow
  ###
  Construct a new e-flow entity.

  @param e_call_et [z.calling.entities.ECall] E-Call entity that the e-flow belongs to
  @param e_participant_et [z.calling.entities.EParticipant] E-Participant entity that the e-flow belongs to
  @param timings [z.telemetry.calling.CallSetupTimings] Timing statistics of call setup steps
  @param e_call_message_et [z.calling.entities.ECallMessage] Optional e-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  constructor: (@e_call_et, @e_participant_et, timings, e_call_message_et) ->
    @logger = new z.util.Logger "z.calling.entities.EFlow (#{@e_participant_et.id})", z.config.LOGGER.OPTIONS

    @id = @e_participant_et.id
    @conversation_id = @e_call_et.id
    @v3_call_center = @e_call_et.v3_call_center

    # States
    @is_answer = ko.observable undefined
    @is_group = @e_call_et.is_group

    # Audio
    @audio = new z.calling.entities.FlowAudio @, @e_call_et.media_repository.get_audio_context()

    # Users
    @remote_client_id = undefined
    @remote_user = @e_participant_et.user
    @remote_user_id = @remote_user.id
    @self_user_id = @e_call_et.self_user.id

    # Telemetry
    @telemetry = new z.telemetry.calling.FlowTelemetry @id, @remote_user_id, @e_call_et, timings


    ###############################################################################
    # PeerConnection
    ###############################################################################

    @peer_connection = undefined
    @pc_initialized = ko.observable false
    @pc_initialized.subscribe (is_initialized) =>
      @telemetry.set_peer_connection @peer_connection if is_initialized

    @media_stream = @e_call_et.local_media_stream
    @data_channel = undefined

    @connection_state = ko.observable z.calling.rtc.ICEConnectionState.NEW
    @gathering_state = ko.observable z.calling.rtc.ICEGatheringState.NEW
    @signaling_state = ko.observable z.calling.rtc.SignalingState.NEW

    @connection_state.subscribe (ice_connection_state) =>
      switch ice_connection_state
        when z.calling.rtc.ICEConnectionState.CHECKING
          @telemetry.schedule_check @e_call_et.telemetry.media_type

        when z.calling.rtc.ICEConnectionState.COMPLETED, z.calling.rtc.ICEConnectionState.CONNECTED
          @_clear_negotiation_timeout()
          @negotiation_mode z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT
          @telemetry.start_statistics()
          @e_call_et.is_connected true
          @e_participant_et.is_connected true
          @e_call_et.interrupted_participants.remove @participant_et
          @e_call_et.state z.calling.enum.CallState.ONGOING
          @e_call_et.termination_reason = undefined

        when z.calling.rtc.ICEConnectionState.CLOSED
          @e_participant_et.is_connected false
          @e_call_et.delete_e_participant @e_participant_et.id, @remote_client_id if @e_call_et.self_client_joined()

        when z.calling.rtc.ICEConnectionState.DISCONNECTED
          @_set_negotiation_restart_timeout()

        when z.calling.rtc.ICEConnectionState.FAILED
          return unless @e_call_et.self_client_joined()
          @_remove_participant()

    @signaling_state.subscribe (signaling_state) =>
      switch signaling_state
        when z.calling.rtc.SignalingState.CLOSED
          @logger.debug "PeerConnection with '#{@remote_user.name()}' was closed"
          @e_call_et.delete_e_participant @e_participant_et.id, @remote_client_id
          @_remove_media_stream @media_stream()

        when z.calling.rtc.SignalingState.REMOTE_OFFER
          @negotiation_needed true

        when z.calling.rtc.SignalingState.STABLE
          @_clear_negotiation_timeout()

    @negotiation_mode = ko.observable z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT
    @negotiation_needed = ko.observable false
    @negotiation_timeout = undefined


    ###############################################################################
    # Local SDP
    ###############################################################################

    @local_sdp_type = ko.observable undefined
    @local_sdp = ko.observable undefined
    @local_sdp.subscribe (sdp) =>
      if sdp
        @local_sdp_type sdp.type
        unless @should_send_local_sdp()
          @should_send_local_sdp true
          @should_set_local_sdp true

    @should_send_local_sdp = ko.observable false
    @should_set_local_sdp = ko.observable false

    @send_sdp_timeout = undefined

    @can_set_local_sdp = ko.pureComputed =>
      in_connection_progress = @connection_state() is z.calling.rtc.ICEConnectionState.CHECKING
      progress_gathering_states = [z.calling.rtc.ICEGatheringState.GATHERING, z.calling.rtc.ICEGatheringState.COMPLETE]
      in_progress = in_connection_progress and @gathering_state() in progress_gathering_states

      is_answer = @local_sdp_type() is z.calling.rtc.SDPType.ANSWER
      is_offer = @local_sdp_type() is z.calling.rtc.SDPType.OFFER
      in_remote_offer_state = @signaling_state() is z.calling.rtc.SignalingState.REMOTE_OFFER
      in_stable_state = @signaling_state() is z.calling.rtc.SignalingState.STABLE
      in_proper_state = (is_offer and in_stable_state) or (is_answer and in_remote_offer_state)

      return @local_sdp() and @should_set_local_sdp() and in_proper_state and not in_progress

    @can_set_local_sdp.subscribe (can_set) =>
      @_set_local_sdp() if can_set


    ###############################################################################
    # Remote SDP
    ###############################################################################

    @remote_sdp_type = ko.observable undefined
    @remote_sdp = ko.observable undefined
    @remote_sdp.subscribe (sdp) =>
      if sdp
        @remote_sdp_type sdp.type
        return @should_set_remote_sdp true
      @remote_sdp_type undefined

    @should_set_remote_sdp = ko.observable false

    @can_set_remote_sdp = ko.pureComputed =>
      is_answer = @remote_sdp_type() is z.calling.rtc.SDPType.ANSWER
      is_offer = @remote_sdp_type() is z.calling.rtc.SDPType.OFFER
      in_local_offer_state = @signaling_state() is z.calling.rtc.SignalingState.LOCAL_OFFER
      in_stable_state = @signaling_state() is z.calling.rtc.SignalingState.STABLE
      in_proper_state = (is_offer and in_stable_state) or (is_answer and in_local_offer_state)

      return @pc_initialized() and @should_set_remote_sdp() and in_proper_state

    @can_set_remote_sdp.subscribe (can_set) =>
      @_set_remote_sdp() if can_set


    ###############################################################################
    # Gates
    ###############################################################################

    @can_create_sdp = ko.pureComputed =>
      in_state_for_creation = @negotiation_needed() and @signaling_state() isnt z.calling.rtc.SignalingState.CLOSED
      can_create = @pc_initialized() and in_state_for_creation
      return can_create

    @can_create_answer = ko.pureComputed =>
      answer_state = @is_answer() and @signaling_state() is z.calling.rtc.SignalingState.REMOTE_OFFER
      can_create = @can_create_sdp() and answer_state
      return can_create

    @can_create_answer.subscribe (can_create) =>
      @_create_answer() if can_create

    @can_create_offer = ko.pureComputed =>
      offer_state = not @is_answer() and @signaling_state() is z.calling.rtc.SignalingState.STABLE
      can_create = @can_create_sdp() and offer_state
      return can_create

    @can_create_offer.subscribe (can_create) =>
      @_create_offer() if can_create

    @initialize_e_flow e_call_message_et

  ###
  Initialize the e-flow.
  @note Magic here is that if an e_call_message is present, the remote user is the creator of the flow
  @param e_call_message_et [z.calling.entities.ECallMessage] Optional e-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  initialize_e_flow: (e_call_message_et) =>
    if e_call_message_et?.sdp
      return @save_remote_sdp e_call_message_et
    @is_answer false

  restart_negotiation: (negotiation_mode, is_answer, media_stream) =>
    @logger.debug "Negotiation restart triggered by '#{negotiation_mode}'"
    @_close_peer_connection()
    @_close_data_channel()
    @_clear_negotiation_timeout()
    @_clear_send_sdp_timeout()
    @_reset_signaling_states()
    @is_answer is_answer
    @local_sdp undefined
    @remote_sdp undefined
    @start_negotiation negotiation_mode, media_stream

  start_negotiation: (negotiation_mode = z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT, media_stream = @media_stream()) =>
    @audio.hookup true
    @_create_peer_connection()
    @_add_media_stream media_stream
    @_set_sdp_states()
    @negotiation_mode negotiation_mode
    @negotiation_needed true
    @pc_initialized true
    @_set_negotiation_failed_timeout()

  _remove_participant: (termination_reason) =>
    @e_participant_et.is_connected false
    @e_call_et.delete_e_participant @e_participant_et.id, @remote_client_id, z.calling.enum.TERMINATION_REASON.CONNECTION_DROP
    .then =>
      return if @e_call_et.participants().length
      unless termination_reason
        termination_reason = if @e_call_et.is_connected() then z.calling.enum.TERMINATION_REASON.CONNECTION_DROP else z.calling.enum.TERMINATION_REASON.CONNECTION_FAILED
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @e_call_et.id, termination_reason

  _set_sdp_states: ->
    @should_set_remote_sdp true
    @should_set_local_sdp true
    @should_send_local_sdp true


  ###############################################################################
  # PeerConnection handling
  ###############################################################################

  ###
  Close the PeerConnection.
  @private
  ###
  _close_peer_connection: ->
    if @peer_connection
      @peer_connection.oniceconnectionstatechange = => @logger.log @logger.levels.OFF, 'State change ignored - ICE connection'
      @peer_connection.onsignalingstatechange = => @logger.log @logger.levels.OFF, "State change ignored - signaling state: #{@peer_connection.signalingState}"
      if @peer_connection.signalingState isnt z.calling.rtc.SignalingState.CLOSED
        @peer_connection.close()
        @logger.debug "Closing PeerConnection '#{@remote_user.name()}' successful"

  ###
  Create the PeerConnection configuration.
  @private
  @return [RTCConfiguration] Configuration object to initialize PeerConnection
  ###
  _create_peer_connection_configuration: ->
    return {
      iceServers: @e_call_et.config().ice_servers
      bundlePolicy: 'max-bundle'
      rtcpMuxPolicy: 'require' # @deprecated Default value beginning Chrome 57
    }

  ###
  Initialize the PeerConnection for the flow.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
  @private
  ###
  _create_peer_connection: ->
    @peer_connection = new window.RTCPeerConnection @_create_peer_connection_configuration()
    @telemetry.time_step z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED
    @signaling_state @peer_connection.signalingState
    @logger.debug "PeerConnection with '#{@remote_user.name()}' created - is_answer '#{@is_answer()}'", @e_call_et.config().ice_servers

    @peer_connection.onaddstream = @_on_add_stream
    @peer_connection.ontrack = @_on_track
    @peer_connection.ondatachannel = @_on_data_channel
    @peer_connection.onicecandidate = @_on_ice_candidate
    @peer_connection.oniceconnectionstatechange = @_on_ice_connection_state_change
    @peer_connection.onremovestream = @_on_remove_stream
    @peer_connection.onsignalingstatechange = @_on_signaling_state_change

  ###
  A MediaStream was added to the PeerConnection.
  @deprecated
  @param event [MediaStreamEvent] Event that contains the newly added MediaStream
  ###
  _on_add_stream: (event) =>
    @logger.debug 'Remote MediaStream added to PeerConnection',
      {stream: event.stream, audio_tracks: event.stream.getAudioTracks(), video_tracks: event.stream.getVideoTracks()}
    media_stream = z.media.MediaStreamHandler.detect_media_stream_type event.stream
    if media_stream.type is z.media.MediaType.AUDIO
      media_stream = @audio.wrap_speaker_stream event.stream
    media_stream_info = new z.media.MediaStreamInfo z.media.MediaStreamSource.REMOTE, @remote_user.id, media_stream, @e_call_et
    amplify.publish z.event.WebApp.CALL.MEDIA.ADD_STREAM, media_stream_info

  ###
  A local ICE candidates is available.
  @param event [RTCPeerConnectionIceEvent] Event that contains the generated ICE candidate
  ###
  _on_ice_candidate: (event) =>
    unless event.candidate
      return unless @should_send_local_sdp()
      @logger.debug 'Generation of ICE candidates completed - sending SDP'
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.ICE_GATHERING_COMPLETED
      return @send_local_sdp()

  # ICE connection state has changed.
  _on_ice_connection_state_change: (event) =>
    return if not @peer_connection or @e_call_et.state() in [z.calling.enum.CallState.DISCONNECTING, z.calling.enum.CallState.ENDED]

    @logger.debug 'State changed - ICE connection', event
    @logger.log @logger.levels.LEVEL_1, "ICE connection state: #{@peer_connection.iceConnectionState}"
    @logger.log @logger.levels.LEVEL_1, "ICE gathering state: #{@peer_connection.iceGatheringState}"

    @gathering_state @peer_connection.iceGatheringState
    @connection_state @peer_connection.iceConnectionState

  ###
  A MediaStream was removed from the PeerConnection.
  @param event [MediaStreamEvent] Event that a MediaStream has been removed
  ###
  _on_remove_stream: (event) =>
    @logger.debug 'Remote MediaStream removed from PeerConnection', event

  # Signaling state has changed.
  _on_signaling_state_change: (event) =>
    @logger.debug "State changed - signaling state: #{@peer_connection.signalingState}", event
    @signaling_state @peer_connection.signalingState

  ###
  A MediaStreamTrack was added to the PeerConnection.
  @param event [RTCTrackEvent] Event that contains the newly added MediaStreamTrack
  ###
  _on_track: (event) =>
    @logger.debug 'Remote MediaStreamTrack added to PeerConnection', event


  ###############################################################################
  # Data channel handling
  ###############################################################################

  send_message: (e_call_message_et) =>
    if @data_channel and @e_call_et.data_channel_opened
      @logger.debug "Sending e-call '#{e_call_message_et.type}' message to conversation '#{@e_call_et.conversation_et.id}' via data channel", e_call_message_et.to_JSON()
      try
        return @data_channel.send e_call_message_et.to_content_string()
      catch error
        @logger.warn "Failed to send calling message via data channel: #{error.name}", error
        throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.NO_DATA_CHANNEL
    else
      throw new z.calling.v3.CallError z.calling.v3.CallError::TYPE.NO_DATA_CHANNEL

  _close_data_channel: ->
    if @data_channel
      if not @data_channel.readyState is z.calling.rtc.DataChannelState.OPEN
        @data_channel.close()
      delete @data_channel
      @e_call_et.data_channel_opened = false

  _initialize_data_channel: ->
    if @peer_connection.createDataChannel and not @data_channel
      @_setup_data_channel @peer_connection.createDataChannel E_FLOW_CONFIG.DATA_CHANNEL_LABEL, {ordered: true}

  _setup_data_channel: (data_channel) ->
    @data_channel = data_channel
    data_channel.onclose = @_on_close
    data_channel.onerror = @_on_error
    data_channel.onmessage = @_on_message
    data_channel.onopen = @_on_open

  _on_data_channel: (event) =>
    @_setup_data_channel event.channel

  _on_close: (event) =>
    data_channel = event.target
    @logger.debug "Data channel '#{data_channel.label}' was closed", data_channel
    if @data_channel?.readyState is z.calling.rtc.DataChannelState.CLOSED
      delete @data_channel
      @e_call_et.data_channel_opened = false

  _on_error: (error) -> throw error

  _on_message: (event) =>
    e_call_message = JSON.parse event.data

    if e_call_message.resp is true
      @logger.info "Received confirmation for e-call '#{e_call_message.type}' message via data channel", e_call_message
    else
      @logger.info "Received e-call '#{e_call_message.type}' message via data channel", e_call_message
    amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND, z.conversation.EventBuilder.build_calling @e_call_et.conversation_et, e_call_message, @remote_user_id, @remote_client_id

  _on_open: (event) =>
    data_channel = event.target
    @logger.debug "Data channel '#{data_channel.label}' was opened and can be used", data_channel
    @e_call_et.data_channel_opened = true


  ###############################################################################
  # SDP handling
  ###############################################################################

  ###
  Save the remote SDP received via an e-call message within the e-flow.
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  ###
  save_remote_sdp: (e_call_message_et) =>
    z.calling.mapper.SDPMapper.map_e_call_message_to_object e_call_message_et
    .then (rtc_sdp) =>
      return z.calling.mapper.SDPMapper.rewrite_sdp rtc_sdp, z.calling.enum.SDPSource.REMOTE, @
    .then ([remote_sdp, ice_candidates]) =>
      @remote_client_id = e_call_message_et.client_id

      if remote_sdp.type is z.calling.rtc.SDPType.OFFER
        switch @signaling_state()
          when z.calling.rtc.SignalingState.LOCAL_OFFER
            return if @_solve_colliding_states()
          when z.calling.rtc.SignalingState.NEW, z.calling.rtc.SignalingState.STABLE
            @is_answer true

        if e_call_message_et.type is z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
          @restart_negotiation z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE, true

      @remote_sdp remote_sdp
      @logger.info "Saved remote '#{@remote_sdp().type}' SDP", @remote_sdp()

  ###
  Initiates sending the local RTCSessionDescriptionProtocol to the remote user.
  @param on_timeout [Boolean] Optional Boolean defaulting to false on whether sending on timout
  ###
  send_local_sdp: (sending_on_timeout = false) =>
    @_clear_send_sdp_timeout()
    z.calling.mapper.SDPMapper.rewrite_sdp @peer_connection.localDescription, z.calling.enum.SDPSource.LOCAL, @
    .then ([local_sdp, ice_candidates]) =>
      @local_sdp local_sdp

      if sending_on_timeout and @negotiation_mode() is z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT
        unless @_contains_relay_candidate ice_candidates
          @logger.warn "Local SDP does not contain any relay ICE candidates, resetting timeout\n#{ice_candidates}", ice_candidates
          return @_set_send_sdp_timeout false

      @logger.info "Sending local '#{@local_sdp().type}' SDP containing '#{ice_candidates.length}' ICE candidates for flow with '#{@remote_user.name()}'\n#{@local_sdp().sdp}"
      @should_send_local_sdp false

      response = @local_sdp().type is z.calling.rtc.SDPType.ANSWER
      if @negotiation_mode() is z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT
        if @e_call_et.is_group()
          e_call_message_et = z.calling.mapper.ECallMessageMapper.build_group_setup response, @e_call_et.session_id, @_create_additional_payload()
        else
          e_call_message_et = z.calling.mapper.ECallMessageMapper.build_setup response, @e_call_et.session_id, @_create_additional_payload()
      else
        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_update response, @e_call_et.session_id, @_create_additional_payload()

      return @e_call_et.send_e_call_event e_call_message_et
      .then =>
        @telemetry.time_step z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SEND
        @logger.info "Sending local '#{@local_sdp().type}' SDP successful", @local_sdp()
      .catch (error) =>
        @should_send_local_sdp true
        throw error

  ###
  Clear the negotiation timeout.
  @private
  ###
  _clear_negotiation_timeout: ->
    if @negotiation_timeout
      window.clearTimeout @negotiation_timeout
      @negotiation_timeout = undefined

  ###
  Clear the SDP send timeout.
  @private
  ###
  _clear_send_sdp_timeout: ->
    if @send_sdp_timeout
      window.clearTimeout @send_sdp_timeout
      @send_sdp_timeout = undefined

  ###
  Check for relay candidate among given ICE candidates
  @param ice_candidates [Array<String>] Array of ICE candidate strings from SDP
  @return [Boolean] True if relay candidate found
  ###
  _contains_relay_candidate: (ice_candidates) ->
    return true for ice_candidate in ice_candidates when ice_candidate.toLowerCase().includes 'relay'

  ###
  Create a local SDP of type 'answer'.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  @private
  ###
  _create_answer: ->
    @negotiation_needed false
    @logger.info "Creating '#{z.calling.rtc.SDPType.ANSWER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createAnswer()
    .then (sdp_answer) =>
      @logger.debug "Creating '#{z.calling.rtc.SDPType.ANSWER}' successful", sdp_answer
      z.calling.mapper.SDPMapper.rewrite_sdp sdp_answer, z.calling.enum.SDPSource.LOCAL, @
    .then ([local_sdp, ice_candidates]) =>
      @local_sdp local_sdp
    .catch (error) =>
      @logger.error "Creating '#{z.calling.rtc.SDPType.ANSWER}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'create_sdp', type: z.calling.rtc.SDPType.ANSWER}
      @e_call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @e_call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED

  ###
  Create a local SDP of type 'offer'.

  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
  @private
  @param restart [Boolean] Is ICE restart negotiation
  ###
  _create_offer: (restart) ->
    @negotiation_needed false
    @_initialize_data_channel()

    offer_options =
      iceRestart: restart
      offerToReceiveAudio: true
      offerToReceiveVideo: true
      voiceActivityDetection: true

    @logger.info "Creating '#{z.calling.rtc.SDPType.OFFER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createOffer offer_options
    .then (sdp_offer) =>
      @logger.debug "Creating '#{z.calling.rtc.SDPType.OFFER}' successful", sdp_offer
      z.calling.mapper.SDPMapper.rewrite_sdp sdp_offer, z.calling.enum.SDPSource.LOCAL, @
    .then ([local_sdp, ice_candidates]) =>
      @local_sdp local_sdp
    .catch (error) =>
      @logger.error "Creating '#{z.calling.rtc.SDPType.OFFER}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'create_sdp', type: z.calling.rtc.SDPType.OFFER}
      @e_call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @e_call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED

  _create_additional_payload: ->
    payload = @v3_call_center.create_additional_payload @e_call_et.id, @remote_user_id, @remote_client_id
    return @v3_call_center.create_payload_prop_sync @e_call_et.self_state.video_send(), false, $.extend({remote_user: @remote_user, sdp: @local_sdp().sdp}, payload)

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
      @e_call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @e_call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED

  ###
  Sets the remote Session Description Protocol on the PeerConnection.
  @private
  ###
  _set_remote_sdp: ->
    @logger.info "Setting remote '#{@remote_sdp().type}' SDP\n#{@remote_sdp().sdp}", @remote_sdp()
    @peer_connection.setRemoteDescription @remote_sdp()
    .then =>
      @logger.debug "Setting remote '#{@remote_sdp().type}' SDP successful", @peer_connection.remoteDescription
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.REMOTE_SDP_SET
      @should_set_remote_sdp false
    .catch (error) =>
      @logger.error "Setting remote '#{@remote_sdp().type}' SDP failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'set_sdp', location: 'remote', type: @remote_sdp()?.type}
      @e_call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @e_call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED

  ###
  Set the negotiation failed timeout.
  @private
  ###
  _set_negotiation_failed_timeout: ->
    @negotiation_timeout = window.setTimeout =>
      @logger.debug 'Removing call participant on negotiation timeout'
      @_remove_participant z.calling.enum.TERMINATION_REASON.RENEGOTIATION
    , E_FLOW_CONFIG.NEGOTIATION_FAILED_TIMEOUT

  ###
  Set the negotiation restart timeout.
  @private
  ###
  _set_negotiation_restart_timeout: ->
    @negotiation_timeout = window.setTimeout =>
      @e_call_et.termination_reason = z.calling.enum.TERMINATION_REASON.CONNECTION_DROP
      @e_participant_et.is_connected false
      @e_call_et.interrupted_participants.push @participant_et
      if @negotiation_mode() is z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT
        @restart_negotiation z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART, false
    , E_FLOW_CONFIG.NEGOTIATION_RESTART_TIMEOUT

  ###
  Set the SDP send timeout.
  @private
  @param initial_timeout [Boolean] Optional Boolean defaulting to true in order to choose appropriate timeout length
  ###
  _set_send_sdp_timeout: (initial_timeout = true) ->
    @send_sdp_timeout = window.setTimeout =>
      @logger.debug 'Sending local SDP on timeout'
      @send_local_sdp true
    , if initial_timeout then E_FLOW_CONFIG.SDP_SEND_TIMEOUT else E_FLOW_CONFIG.SDP_SEND_TIMEOUT_RESET


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
      @logger.warn "We need to switch SDP state of flow with '#{@remote_user.name()}' to answer."
      @restart_negotiation z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART, true
      return false
    @logger.warn "Remote side needs to switch SDP state of flow with '#{@remote_user.name()}' to answer."
    return true


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
      try
        media_stream = @audio.wrap_microphone_stream media_stream
      catch error
        @audio.audio_context = @e_call_et.media_repository.get_audio_context()
        media_stream = @audio.wrap_microphone_stream media_stream

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
      @logger.info "Upgraded the MediaStream to update '#{media_stream_info.type}' successfully", upgraded_media_stream_info.stream
      @restart_negotiation z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE, false, upgraded_media_stream_info.stream
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
    return if not @peer_connection

    if @peer_connection.removeTrack
      return unless @peer_connection.signalingState is z.calling.rtc.SignalingState.STABLE
      for media_stream_track in media_stream.getTracks()
        for rtp_sender in @peer_connection.getSenders() when rtp_sender.track.id is media_stream_track.id
          @peer_connection.removeTrack rtp_sender
          @logger.info "Removed local '#{media_stream_track.kind}' MediaStreamTrack from PeerConnection"
          break
    else if @peer_connection.signalingState isnt z.calling.rtc.SignalingState.CLOSED
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
    @telemetry.reset_statistics()
    @logger.info "Resetting flow with user '#{@remote_user.id}'"
    @_remove_media_stream @media_stream() if @media_stream()
    @_close_data_channel()
    @_close_peer_connection()
    @_reset_signaling_states()
    @pc_initialized false

  ###
  Reset the signaling states.
  @private
  ###
  _reset_signaling_states: ->
    @signaling_state z.calling.rtc.SignalingState.NEW
    @connection_state z.calling.rtc.ICEConnectionState.NEW
    @gathering_state z.calling.rtc.ICEGatheringState.NEW


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
