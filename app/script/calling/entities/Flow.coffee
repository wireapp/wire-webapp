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

# Static array of where to put people in the stereo scape.
AUDIO_BITRATE = '30'
AUDIO_PTIME = '60'

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
        @logger.log @logger.levels.INFO, "Creator: We are the official '#{z.calling.rtc.SDPType.OFFER}'"
        @is_answer false
      else
        @logger.log @logger.levels.INFO, "Creator: We are the official '#{z.calling.rtc.SDPType.ANSWER}'"
        @is_answer true


    ###############################################################################
    # PeerConnection
    ###############################################################################

    @peer_connection = undefined
    @payload = ko.observable undefined
    @pc_initialized = ko.observable false
    @pc_initialized.subscribe (is_initialized) =>
      @telemetry.set_peer_connection @peer_connection
      @telemetry.schedule_check 5000 if is_initialized

    @audio_stream = @call_et.local_audio_stream
    @video_stream = @call_et.local_video_stream

    @has_media_stream = ko.pureComputed => return @video_stream()? or @audio_stream()?

    @connection_state = ko.observable z.calling.rtc.ICEConnectionState.NEW
    @gathering_state = ko.observable z.calling.rtc.ICEGatheringState.NEW
    @signaling_state = ko.observable z.calling.rtc.SignalingState.NEW

    @connection_state.subscribe (ice_connection_state) =>
      switch ice_connection_state
        when z.calling.rtc.ICEConnectionState.CHECKING
          @telemetry.time_step z.telemetry.calling.CallSetupSteps.ICE_CONNECTION_CHECKING

        when z.calling.rtc.ICEConnectionState.COMPLETED, z.calling.rtc.ICEConnectionState.CONNECTED
          @telemetry.start_statistics ice_connection_state
          @call_et.is_connected true
          @participant_et.is_connected true
          @call_et.interrupted_participants.remove @participant_et
          @call_et.state z.calling.enum.CallState.ONGOING

        when z.calling.rtc.ICEConnectionState.DISCONNECTED
          @participant_et.is_connected false
          @call_et.interrupted_participants.push @participant_et
          @is_answer false
          @negotiation_mode z.calling.enum.SDPNegotiationMode.ICE_RESTART

        when z.calling.rtc.ICEConnectionState.FAILED
          @participant_et.is_connected false
          if @is_group()
            @call_et.interrupted_participants.remove @participant_et
            @call_et.delete_participant @participant_et if @call_et.self_client_joined()
          else
            amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @call_et.id

        when z.calling.rtc.ICEConnectionState.CLOSED
          @participant_et.is_connected false
          @call_et.delete_participant @participant_et if @call_et.self_client_joined()

    @signaling_state.subscribe (signaling_state) =>
      if signaling_state is z.calling.rtc.SignalingState.CLOSED and not @converted_own_sdp_state()
        @logger.log @logger.levels.DEBUG, "PeerConnection with '#{@remote_user.name()}' was closed"
        @call_et.delete_participant @participant_et
        @_remove_media_streams()
        if not @is_group()
          @call_et.finished_reason = z.calling.enum.CallFinishedReason.CONNECTION_DROPPED

    @negotiation_mode = ko.observable z.calling.enum.SDPNegotiationMode.DEFAULT
    @negotiation_needed = ko.observable false


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
          @should_add_local_sdp true

    @has_sent_local_sdp = ko.observable false
    @should_add_local_sdp = ko.observable true

    @send_sdp_timeout = undefined

    @can_set_local_sdp = ko.pureComputed =>
      in_connection_progress = @connection_state() is z.calling.rtc.ICEConnectionState.CHECKING
      progress_gathering_states = [z.calling.rtc.ICEGatheringState.GATHERING, z.calling.rtc.ICEGatheringState.COMPLETE]
      in_progress = in_connection_progress and @gathering_state() in progress_gathering_states

      in_offer_state = @local_sdp_type() is z.calling.rtc.SDPType.OFFER
      in_wrong_state = in_offer_state and @signaling_state() is z.calling.rtc.SignalingState.REMOTE_OFFER
      is_blocked = @signaling_state() is z.calling.rtc.SignalingState.CLOSED

      return @local_sdp() and @should_add_local_sdp() and not is_blocked and not in_progress and not in_wrong_state

    @can_set_local_sdp.subscribe (can_set) =>
      if can_set
        @logger.log @logger.levels.DEBUG, "State changed - can_set_local_sdp: #{can_set}"
        @_set_local_sdp()


    ###############################################################################
    # Remote SDP
    ###############################################################################

    @remote_sdp_type = ko.observable undefined
    @remote_sdp = ko.observable undefined
    @remote_sdp.subscribe (sdp) =>
      if sdp
        @remote_sdp_type sdp.type
        @should_add_remote_sdp true

    @should_add_remote_sdp = ko.observable false

    @can_set_remote_sdp = ko.pureComputed =>
      is_remote_offer = @remote_sdp_type() is z.calling.rtc.SDPType.OFFER
      have_local_offer = @signaling_state() is z.calling.rtc.SignalingState.LOCAL_OFFER
      in_wrong_state = is_remote_offer and have_local_offer

      return @pc_initialized() and @should_add_remote_sdp() and not in_wrong_state

    @can_set_remote_sdp.subscribe (can_set) =>
      if can_set
        @logger.log @logger.levels.DEBUG, "State changed - can_set_remote_sdp: '#{can_set}'"
        @_set_remote_sdp()
        .then =>
          if @has_sent_local_sdp() and @remote_sdp().type is z.calling.rtc.SDPType.OFFER
            @is_answer true


    ###############################################################################
    # Gates
    ###############################################################################

    @can_create_sdp = ko.pureComputed =>
      in_state_for_creation = @negotiation_needed() and @signaling_state() isnt z.calling.rtc.SignalingState.CLOSED
      can_create = @pc_initialized() and in_state_for_creation
      @logger.log @logger.levels.OFF, "State recalculated - can_create_answer: #{can_create}"
      return can_create

    @can_create_sdp.subscribe (can_create) =>
      if can_create
        @logger.log @logger.levels.DEBUG, "State changed - can_create_sdp: #{can_create}"

    @can_create_answer = ko.pureComputed =>
      answer_state = @is_answer() and @signaling_state() is z.calling.rtc.SignalingState.REMOTE_OFFER
      can_create = @can_create_sdp() and answer_state
      @logger.log @logger.levels.OFF, "State recalculated - can_create_answer: #{can_create}"
      return can_create

    @can_create_answer.subscribe (can_create) =>
      if can_create
        @logger.log @logger.levels.DEBUG, "State changed - can_create_answer: #{can_create}"
        @negotiation_needed false
        @_create_answer()

    @can_create_offer = ko.pureComputed =>
      offer_state = not @is_answer() and @signaling_state() is z.calling.rtc.SignalingState.STABLE
      can_create = @can_create_sdp() and offer_state
      @logger.log @logger.levels.OFF, "State recalculated - can_create_offer: #{can_create}"
      return can_create

    @can_create_offer.subscribe (can_create) =>
      if can_create
        @logger.log @logger.levels.DEBUG, "State changed - can_create_offer: #{can_create}"
        @negotiation_needed false
        @_create_offer()

    @can_initialize_peer_connection = ko.pureComputed =>
      can_initialize = @has_media_stream() and @payload() and not @pc_initialized()
      @logger.log @logger.levels.OFF, "State recalculated - can_initialize_peer_connection: #{can_initialize}"
      return can_initialize

    @can_initialize_peer_connection.subscribe (can_initialize) =>
      if can_initialize
        @logger.log @logger.levels.DEBUG, "State changed - can_initialize_peer_connection: #{can_initialize}"
        @_initialize_peer_connection()

    @can_set_ice_candidates = ko.pureComputed =>
      can_set = @local_sdp() and @remote_sdp() and @signaling_state() is z.calling.rtc.SignalingState.STABLE
      @logger.log @logger.levels.OFF, "State recalculated - can_set_ice_candidates: #{can_set}"
      return can_set

    @can_set_ice_candidates.subscribe (can_set) =>
      if can_set
        @logger.log @logger.levels.DEBUG, "State changed - can_set_ice_candidates: #{can_set}"
        @_add_cached_ice_candidates()

    @logger.log @logger.levels.INFO, "Flow has an initial panning of '#{@participant_et.panning()}'"


  ###############################################################################
  # Payload handling
  ###############################################################################

  ###
  Add the payload to the flow.
  @note Magic here is that if the remote_user is not the creator then the creator *MUST* be us even if creator is null
  @param payload [RTCConfiguration] Configuration to be used to set up the PeerConnection
  ###
  add_payload: (payload) =>
    @logger.log @logger.levels.INFO, "Setting payload to be used for flow with '#{@remote_user.name()}'"
    return @logger.log @logger.levels.WARN, 'Payload already set' if @payload()

    @creator_user_id payload.creator
    @payload @_rewrite_payload payload
    if payload.remote_user isnt payload.creator
      @logger.log @logger.levels.INFO, "We are the creator of flow with user '#{@remote_user.name()}'"
      @is_answer false
    else
      @logger.log @logger.levels.INFO, "We are not the creator of flow with user '#{@remote_user.name()}'"
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
    return payload


  ###############################################################################
  # PeerConnection handling
  ###############################################################################

  ###
  Close the PeerConnection.
  @private
  ###
  _close_peer_connection: ->
    @logger.log @logger.levels.INFO, "Closing PeerConnection with '#{@remote_user.name()}'"
    if @peer_connection?
      @peer_connection.onsignalingstatechange = =>
        @logger.log @logger.levels.DEBUG, "State change ignored - signaling state: #{@peer_connection.signalingState}"
      @peer_connection.close()
    @logger.log @logger.levels.DEBUG, 'Closing PeerConnection successful'

  ###
  Create the PeerConnection configuration.
  @private
  @return [RTCConfiguration] Configuration object to initialize PeerConnection
  ###
  _configure_peer_connection: ->
    return {} =
      iceServers: @payload().ice_servers
      bundlePolicy: 'max-bundle'
      rtcpMuxPolicy: 'require'

  ###
  Initialize the PeerConnection for the flow.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
  @private
  ###
  _create_peer_connection: ->
    @peer_connection = new window.RTCPeerConnection @_configure_peer_connection()
    @telemetry.time_step z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED
    @signaling_state @peer_connection.signalingState
    @logger.log @logger.levels.DEBUG, "PeerConnection with '#{@remote_user.name()}' created", @payload().ice_servers

    ###
    A MediaStream was added to the PeerConnection.
    @param event [MediaStreamEvent] Event that contains the newly added MediaStream
    ###
    @peer_connection.onaddstream = (event) =>
      @logger.log @logger.levels.DEBUG, 'Remote MediaStream added to PeerConnection',
        {stream: event.stream, audio_tracks: event.stream.getAudioTracks(), video_tracks: event.stream.getVideoTracks()}
      media_stream = z.calling.handler.MediaStreamHandler.detect_media_stream_type event.stream
      if media_stream.type is z.calling.enum.MediaType.AUDIO
        media_stream = @audio.wrap_speaker_stream event.stream
      media_stream_info = new z.calling.payloads.MediaStreamInfo z.calling.enum.MediaStreamSource.REMOTE, @id, media_stream, @call_et
      amplify.publish z.event.WebApp.CALL.MEDIA.ADD_STREAM, media_stream_info

    ###
    A MediaStreamTrack was added to the PeerConnection.
    @param event [MediaStreamTrackEvent] Event that contains the newly added MediaStreamTrack
    ###
    @peer_connection.onaddtrack = (event) =>
      @logger.log @logger.levels.DEBUG, 'Remote MediaStreamTrack added to PeerConnection', event

    ###
    A MediaStream was removed from the PeerConnection.
    @param event [MediaStreamEvent] Event that a MediaStream has been removed
    ###
    @peer_connection.onremovestream = (event) =>
      @logger.log @logger.levels.DEBUG, 'Remote MediaStream removed from PeerConnection', event

    ###
    A MediaStreamTrack was removed from the PeerConnection.
    @param event [MediaStreamTrackEvent] Event that a MediaStreamTrack has been removed
    ###
    @peer_connection.onremovetrack = (event) =>
      @logger.log @logger.levels.DEBUG, 'Remote MediaStreamTrack removed from PeerConnection', event

    ###
    A local ICE candidates is available.
    @param event [RTCPeerConnectionIceEvent] Event that contains the generated ICE candidate
    ###
    @peer_connection.onicecandidate = (event) =>
      @logger.log @logger.levels.INFO, 'New ICE candidate generated', event
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.ICE_GATHERING_STARTED
      if @has_sent_local_sdp()
        if event.candidate
          @_send_ice_candidate event.candidate
        else
          @logger.log @logger.levels.INFO, 'End of ICE candidates - trickling end candidate'
          @_send_ice_candidate @_fake_ice_candidate 'a=end-of-candidates'
      else if not event.candidate
        @logger.log @logger.levels.INFO, 'End of ICE candidates - sending SDP'
        @telemetry.time_step z.telemetry.calling.CallSetupSteps.ICE_GATHERING_COMPLETED
        @_send_local_sdp()

    # ICE connection state has changed.
    @peer_connection.oniceconnectionstatechange = (event) =>
      @logger.log @logger.levels.DEBUG, 'State changed - ICE connection', event
      return if not @peer_connection or @call_et.state() is z.calling.enum.CallState.ENDED

      @logger.log @logger.levels.LEVEL_1, "ICE connection state: #{@peer_connection.iceConnectionState}"
      @logger.log @logger.levels.LEVEL_1, "ICE gathering state: #{@peer_connection.iceGatheringState}"

      @gathering_state @peer_connection.iceGatheringState
      @connection_state @peer_connection.iceConnectionState

    # SDP negotiation needed.
    @peer_connection.onnegotiationneeded = (event) =>
      if not @negotiation_needed()
        @logger.log @logger.levels.DEBUG, 'State changed - negotiation needed: true', event
        @negotiation_needed true

    # Signaling state has changed.
    @peer_connection.onsignalingstatechange = (event) =>
      @logger.log @logger.levels.DEBUG, "State changed - signaling state: #{@peer_connection.signalingState}", event
      @signaling_state @peer_connection.signalingState

  # Initialize the PeerConnection.
  _initialize_peer_connection: ->
    @_create_peer_connection()
    @_add_media_streams()
    @pc_initialized true


  ###############################################################################
  # SDP handling
  ###############################################################################

  ###
  Save the remote SDP received from backend within the flow.
  @param remote_sdp [RTCSessionDescription] Remote Session Description Protocol
  ###
  save_remote_sdp: (remote_sdp) =>
    @logger.log @logger.levels.DEBUG, "Saving remote SDP of type '#{remote_sdp.type}'"
    @telemetry.time_step z.telemetry.calling.CallSetupSteps.REMOTE_SDP_RECEIVED
    @remote_sdp @_rewrite_sdp remote_sdp, z.calling.enum.SDPSource.REMOTE

  ###
  Create a local SDP of type 'answer'.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  @private
  ###
  _create_answer: ->
    @logger.log @logger.levels.INFO, "Creating '#{z.calling.rtc.SDPType.ANSWER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createAnswer()
    .then (sdp_answer) =>
      @logger.log @logger.levels.DEBUG, "Creating '#{z.calling.rtc.SDPType.ANSWER}' successful", sdp_answer
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.LOCAL_SDP_CREATED
      @local_sdp @_rewrite_sdp sdp_answer, z.calling.enum.SDPSource.LOCAL
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Creating '#{z.calling.rtc.SDPType.ANSWER}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'create_sdp', type: z.calling.rtc.SDPType.ANSWER}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes

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

    @logger.log @logger.levels.INFO, "Creating '#{z.calling.rtc.SDPType.OFFER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createOffer offer_options
    .then (sdp_offer) =>
      @logger.log @logger.levels.DEBUG, "Creating '#{z.calling.rtc.SDPType.OFFER}' successful", sdp_offer
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.LOCAL_SDP_CREATED
      @local_sdp @_rewrite_sdp sdp_offer, z.calling.enum.SDPSource.LOCAL
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Creating '#{z.calling.rtc.SDPType.OFFER}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'create_sdp', type: z.calling.rtc.SDPType.OFFER}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes
      @_solve_colliding_states()

  ###
  Rewrite the SDP for compatibility reasons.

  @private
  @param rtc_sdp [RTCSessionDescription] Session Description Protocol to be rewritten
  @param sdp_source [z.calling.enum.SDPSource] Source of the SDP - local or remote
  @return [RTCSessionDescription] Rewritten Session Description Protocol
  ###
  _rewrite_sdp: (rtc_sdp, sdp_source = z.calling.enum.SDPSource.REMOTE) ->
    if sdp_source is z.calling.enum.SDPSource.LOCAL
      rtc_sdp.sdp = rtc_sdp.sdp.replace 'UDP/TLS/', ''

    sdp_lines = rtc_sdp.sdp.split '\r\n'
    outlines = []

    ice_candidates = []

    for sdp_line in sdp_lines
      outline = sdp_line

      if sdp_line.startsWith 't='
        if sdp_source is z.calling.enum.SDPSource.LOCAL and not z.util.Environment.frontend.is_localhost()
          outlines.push sdp_line
          browser_string = "#{z.util.Environment.browser.name} #{z.util.Environment.browser.version}"
          if z.util.Environment.electron
            outline = "a=tool:electron #{z.util.Environment.version()} #{z.util.Environment.version false} (#{browser_string})"
          else
            outline = "a=tool:webapp #{z.util.Environment.version false} (#{browser_string})"
          @logger.log @logger.levels.INFO, "Added tool version to local SDP: #{outline}"

      else if sdp_line.startsWith 'a=candidate'
        ice_candidates.push sdp_line

      else if sdp_line.startsWith 'a=group'
        if @negotiation_mode() is z.calling.enum.SDPNegotiationMode.STREAM_CHANGE and sdp_source is z.calling.enum.SDPSource.LOCAL
          outlines.push 'a=x-streamchange'
          @logger.log @logger.levels.INFO, 'Added stream renegotiation flag to local SDP'

      # Code to nail in bit-rate and ptime settings for improved performance and experience
      else if sdp_line.startsWith 'm=audio'
        if @negotiation_mode() is z.calling.enum.SDPNegotiationMode.ICE_RESTART or sdp_source is z.calling.enum.SDPSource.LOCAL and @is_group()
          outlines.push sdp_line
          outline = "b=AS:#{AUDIO_BITRATE}"
          @logger.log @logger.levels.INFO, "Limited audio bit-rate in local SDP: #{outline}"

      else if sdp_line.startsWith 'm=video'
        if sdp_source is z.calling.enum.SDPSource.LOCAL and @_should_rewrite_codecs()
          outline = sdp_line.replace(' 98', '').replace ' 116', ''
          @logger.log @logger.levels.WARN, 'Removed video codecs to prevent video freeze due to issue in Chrome 50 and 51' if outline isnt sdp_line

      else if sdp_line.startsWith 'a=fmtp'
        if sdp_source is z.calling.enum.SDPSource.LOCAL and @_should_rewrite_codecs()
          if sdp_line.endsWith '98 apt=116'
            @logger.log @logger.levels.WARN, 'Removed FMTP line to prevent video freeze due to issue in Chrome 50 and 51'
            outline = undefined

      else if sdp_line.startsWith 'a=rtpmap'
        if sdp_source is z.calling.enum.SDPSource.LOCAL and @_should_rewrite_codecs()
          if sdp_line.endsWith('98 rtx/90000') or sdp_line.endsWith '116 red/90000'
            @logger.log @logger.levels.WARN, 'Removed RTPMAP line to prevent video freeze due to issue in Chrome 50 and 51'
            outline = undefined

        if @negotiation_mode() is z.calling.enum.SDPNegotiationMode.ICE_RESTART or sdp_source is z.calling.enum.SDPSource.LOCAL and @is_group()
          if z.util.contains sdp_line, 'opus'
            outlines.push sdp_line
            outline = "a=ptime:#{AUDIO_PTIME}"
            @logger.log @logger.levels.INFO, "Changed audio p-time in local SDP: #{outline}"

      if outline isnt undefined
        outlines.push outline

    @logger.log @logger.levels.INFO,
      "'#{ice_candidates.length}' ICE candidate(s) found in '#{sdp_source}' SDP", ice_candidates

    rewritten_sdp = outlines.join '\r\n'

    if rtc_sdp.sdp isnt rewritten_sdp
      rtc_sdp.sdp = rewritten_sdp
      @logger.log @logger.levels.INFO, "Rewrote '#{sdp_source}' SDP of type '#{rtc_sdp.type}'", rtc_sdp

    return rtc_sdp

  ###
  Initiates the sending of the local Session Description Protocol to the backend.
  @private
  ###
  _send_local_sdp: ->
    @local_sdp @_rewrite_sdp @peer_connection.localDescription, z.calling.enum.SDPSource.LOCAL
    sdp_info = new z.calling.payloads.SDPInfo {conversation_id: @conversation_id, flow_id: @id, sdp: @local_sdp()}

    on_success = =>
      window.clearTimeout @send_sdp_timeout
      @logger.log @logger.levels.INFO, "Sending local SDP of type '#{@local_sdp().type}' successful"
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SEND
      @has_sent_local_sdp true

    on_failure = =>
      @logger.log @logger.levels.WARN, "Failed to send local SDP of type '#{@local_sdp().type}'"

    @logger.log @logger.levels.INFO, "Sending local SDP for flow with '#{@remote_user.name()}'\n#{@local_sdp().sdp}"
    amplify.publish z.event.WebApp.CALL.SIGNALING.SEND_LOCAL_SDP_INFO, sdp_info, on_success, on_failure

  ###
  Sets the local Session Description Protocol on the PeerConnection.
  @private
  ###
  _set_local_sdp: ->
    @logger.log @logger.levels.INFO, "Setting local SDP of type '#{@local_sdp().type}'", @local_sdp()
    @peer_connection.setLocalDescription @local_sdp()
    .then =>
      @logger.log @logger.levels.DEBUG,
        "Setting local SDP of type '#{@local_sdp().type}' successful", @peer_connection.localDescription
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SET
      @should_add_local_sdp false
      @send_sdp_timeout = window.setTimeout =>
        @_send_local_sdp() if not @has_sent_local_sdp()
      , 1000
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Setting local SDP of type '#{@local_sdp().type}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'set_sdp', location: 'local', type: @local_sdp()?.type}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes

  ###
  Sets the remote Session Description Protocol on the PeerConnection.
  @private
  ###
  _set_remote_sdp: ->
    @logger.log @logger.levels.INFO, "Setting remote SDP of type '#{@remote_sdp().type}'\n#{@remote_sdp().sdp}"
    @peer_connection.setRemoteDescription @remote_sdp()
    .then =>
      @logger.log @logger.levels.DEBUG,
        "Setting remote SDP of type '#{@remote_sdp().type}' successful", @peer_connection.remoteDescription
      @telemetry.time_step z.telemetry.calling.CallSetupSteps.REMOTE_SDP_SET
      @should_add_remote_sdp false
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Setting remote SDP of type '#{@remote_sdp().type}' failed: #{error.name} - #{error.message}", error
      attributes = {cause: error.name, step: 'set_sdp', location: 'remote', type: @remote_sdp()?.type}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes

  ###
  Solve colliding SDP states.
  @note If we receive a remote offer while we have a local offer, we need to check who needs to switch his SDP type.
  @private
  ###
  _solve_colliding_states: ->
    we_switched_state = false
    if @self_user_id < @remote_user_id
      @logger.log @logger.levels.WARN,
        "We need to switch state of flow with '#{@remote_user.name()}'. Local SDP needs to be changed."
      we_switched_state = true
      @_switch_local_sdp_state()
    else
      @logger.log @logger.levels.WARN,
        "Remote side needs to switch state of flow with '#{@remote_user.name()}'. Waiting for new remote SDP."

    return we_switched_state


  ###############################################################################
  # SDP sate collision handling
  ###############################################################################

  ###
  Switch the local SDP state.
  @note Set converted flag first, because it influences the tear-down of the PeerConnection
  @private
  ###
  _switch_local_sdp_state: ->
    @logger.log @logger.levels.DEBUG, '_switch_local_sdp_state'

    @logger.log @logger.levels.LEVEL_2,
      "Switching from local #{@local_sdp_type()} to local '#{z.calling.rtc.SDPType.ANSWER}'"

    @converted_own_sdp_state true
    @is_answer true
    remote_sdp_cache = @remote_sdp()
    @_close_peer_connection()
    @_reset_signaling_states()
    @_initialize_peer_connection()
    @remote_sdp remote_sdp_cache
    @_set_remote_sdp()
    @converted_own_sdp_state false


  ###############################################################################
  # ICE candidate handling
  ###############################################################################

  ###
  Add or cache remote ICE candidate.
  @param ice_candidate [RTCIceCandidate] Received remote ICE candidate
  ###
  add_remote_ice_candidate: (ice_candidate) =>
    if z.util.contains ice_candidate.candidate, 'end-of-candidates'
      @logger.log @logger.levels.INFO, 'Ignoring remote non-candidate'
      return

    if @can_set_ice_candidates()
      @_add_ice_candidate ice_candidate
      @ice_candidates_cache.push ice_candidate
    else
      @ice_candidates_cache.push ice_candidate
      @logger.log @logger.levels.INFO, 'Cached ICE candidate for flow'

  ###
  Add all cached ICE candidates to the flow.
  @private
  ###
  _add_cached_ice_candidates: ->
    if @ice_candidates_cache.length
      @logger.log @logger.levels.INFO, "Adding '#{@ice_candidates_cache.length}' cached ICE candidates"
      @_add_ice_candidate ice_candidate for ice_candidate in @ice_candidates_cache
    else
      @logger.log @logger.levels.INFO, 'No cached ICE candidates found'

  ###
  Add a remote ICE candidate to the flow directly.
  @private
  @param ice_candidate [RTCICECandidate] Received remote ICE candidate
  ###
  _add_ice_candidate: (ice_candidate) ->
    @logger.log @logger.levels.INFO, "Adding ICE candidate to flow with '#{@remote_user.name()}'", ice_candidate
    @peer_connection.addIceCandidate ice_candidate
    .then =>
      @logger.log @logger.levels.DEBUG, 'Adding ICE candidate successful'
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Adding ICE candidate failed: #{error.name}", error
      attributes = {cause: error.name, step: 'add_candidate', type: z.calling.rtc.SDPType.OFFER}
      @call_et.telemetry.track_event z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes

  ###
  Create a fake ICE candidate from a message.
  @param candidate_message [String] Candidate message for the RTCICECandidate
  @return [Object] Object containing data for RTCICECandidate
  ###
  _fake_ice_candidate: (candidate_message) ->
    return {} =
      candidate: candidate_message
      sdpMLineIndex: 0
      sdpMid: 'audio'

  ###
  Send an ICE candidate to the backend.
  @private
  @param ice_candidate [RTCICECandidate] Local ICE candidate to be send
  ###
  _send_ice_candidate: (ice_candidate) ->
    if not z.util.contains ice_candidate.candidate, 'UDP'
      return @logger.log @logger.levels.INFO, "Local ICE candidate ignored as it is not of type 'UDP'"

    if @conversation_id and @id
      ice_info = new z.calling.payloads.ICECandidateInfo @conversation_id, @id, ice_candidate
      @logger.log @logger.levels.INFO, 'Sending ICE candidate', ice_info
      amplify.publish z.event.WebApp.CALL.SIGNALING.SEND_ICE_CANDIDATE_INFO, ice_info

  ###
  Should a local SDP be rewritten to prevent frozen video.
  @note All sections that rewrite the SDP for this can be removed once we require Chrome 52
  @return [Boolean] Should SDP be rewritten
  ###
  _should_rewrite_codecs: ->
    return z.util.Environment.browser.requires.calling_codec_rewrite


  ###############################################################################
  # Media stream handling
  ###############################################################################

  ###
  Inject an audio file into the flow.
  @param audio_file_path [String] Path to the audio file
  @param callback [Function] Function to be called when completed
  ###
  inject_audio_file: (audio_file_path, callback) =>
    @audio.inject_audio_file audio_file_path, callback

  ###
  Switch out the local MediaStream.
  @param media_stream_info [z.calling.payloads.MediaStreamInfo] Object containing the required MediaStream information
  @return [Promise] Promise that resolves when the updated MediaStream is used
  ###
  switch_media_stream: (media_stream_info) =>
    if @peer_connection.getSenders?
      @_replace_media_track media_stream_info
      .then ->
        return [media_stream_info, false]
    else
      @_replace_media_stream media_stream_info
      .then (media_stream_info) =>
        @is_answer false
        return [media_stream_info, true]

  ###
  Adds a local MediaStream to the PeerConnection.
  @private
  @param media_stream [MediaStream] MediaStream to add to the PeerConnection
  ###
  _add_media_stream: (media_stream) =>
    if media_stream.type is z.calling.enum.MediaType.AUDIO
      @peer_connection.addStream @audio.wrap_microphone_stream media_stream
    else
      @peer_connection.addStream media_stream
    @logger.log @logger.levels.INFO, "Added local MediaStream of type '#{media_stream.type}' to PeerConnection",
      {stream: media_stream, audio_tracks: media_stream.getAudioTracks(), video_tracks: media_stream.getVideoTracks()}

  ###
  Adds the local MediaStreams to the PeerConnection.
  @private
  ###
  _add_media_streams: ->
    media_streams_identical = @_compare_local_media_streams()

    @_add_media_stream @audio_stream() if @audio_stream()
    @_add_media_stream @video_stream() if @video_stream() and not media_streams_identical

  ###
  Compare whether local audio and video streams are identical.
  @private
  ###
  _compare_local_media_streams: ->
    return @audio_stream() and @video_stream() and @audio_stream().id is @video_stream().id

  ###
  Replace the MediaStream attached to the PeerConnection.
  @param media_stream_info [z.calling.payloads.MediaStreamInfo] Object containing the required MediaStream information
  ###
  _replace_media_stream: (media_stream_info) =>
    Promise.resolve @_remove_media_streams media_stream_info.type
    .then =>
      @negotiation_mode z.calling.enum.SDPNegotiationMode.STREAM_CHANGE
      return @_upgrade_media_stream media_stream_info
    .then (media_stream_info) =>
      @_add_media_stream media_stream_info.stream
      @logger.log @logger.levels.INFO, 'Replaced the MediaStream successfully', media_stream_info.stream
      return media_stream_info

  ###
  Replace the a MediaStreamTrack attached to the MediaStream of the PeerConnection.
  @param media_stream_info [z.calling.payloads.MediaStreamInfo] Object containing the required MediaStream information
  ###
  _replace_media_track: (media_stream_info) =>
    media_stream_track = media_stream_info.stream.getTracks()[0]
    return Promise.all (sender.replaceTrack media_stream_track for sender in @peer_connection.getSenders() when sender.track.kind is media_stream_info.type)
    .then =>
      @logger.log @logger.levels.INFO, "Replaced the '#{media_stream_info.type}' track"
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed to replace the '#{media_stream_info.type}' track: #{error.name} - #{error.message}", error

  ###
  Reset the flows MediaStream and media elements.
  @private
  @param media_stream [MediaStream] Local MediaStream to remove from the PeerConnection
  ###
  _remove_media_stream: (media_stream) =>
    if @peer_connection
      try
        if @peer_connection.signalingState isnt z.calling.rtc.SignalingState.CLOSED
          @peer_connection.removeStream media_stream
          @logger.log @logger.levels.INFO, "Removed local MediaStream of type '#{media_stream.type}' from PeerConnection",
            {stream: media_stream, audio_tracks: media_stream.getAudioTracks(), video_tracks: media_stream.getVideoTracks()}
      # @param [InvalidStateError] error
      catch error
        @logger.log @logger.levels.ERROR, "We caught the #{error.name}: #{error.message}", error
        Raygun.send new Error('Failed to remove MediaStream from PeerConnection'), error
    else
      @logger.log @logger.levels.INFO, 'No PeerConnection found to remove MediaStream from'

  ###
  Reset the flows MediaStream and media elements.
  @private
  @param media_type [z.calling.enum.MediaType] Optional media type of MediaStreams to be removed
  ###
  _remove_media_streams: (media_type = z.calling.enum.MediaType.AUDIO_VIDEO) =>
    switch media_type
      when z.calling.enum.MediaType.AUDIO_VIDEO
        media_streams_identical = @_compare_local_media_streams()

        @_remove_media_stream @audio_stream() if @audio_stream()
        @_remove_media_stream @video_stream() if @video_stream() and not media_streams_identical
      when z.calling.enum.MediaType.AUDIO
        @_remove_media_stream @audio_stream() if @audio_stream()
      when z.calling.enum.MediaType.VIDEO
        @_remove_media_stream @video_stream() if @video_stream()

  ###
  Upgrade a MediaStream with missing audio or video.
  @private
  @param media_stream_info [z.calling.payloads.MediaStreamInfo] Contains the info about the MediaStream to be updated
  @return [z.calling.payloads.MediaStreamInfo]
  ###
  _upgrade_media_stream: (media_stream_info) ->
    if media_stream_info.type is z.calling.enum.MediaType.AUDIO and @video_stream()
      media_stream_tracks = z.calling.handler.MediaStreamHandler.get_media_tracks @video_stream(), z.calling.enum.MediaType.VIDEO

    else if media_stream_info.type is z.calling.enum.MediaType.VIDEO and @audio_stream()
      media_stream_tracks = z.calling.handler.MediaStreamHandler.get_media_tracks @audio_stream(), z.calling.enum.MediaType.AUDIO

    if media_stream_tracks?.length
      @audio_stream().removeTrack media_stream_tracks[0] if @audio_stream()
      @video_stream().removeTrack media_stream_tracks[0] if @video_stream()
      media_stream_info.stream.addTrack media_stream_tracks[0]
      @logger.log @logger.levels.INFO, "Upgraded local MediaStream of type '#{media_stream_info.type}' with '#{media_stream_tracks[0].kind}'",
        {stream: media_stream_info.stream, audio_tracks: media_stream_info.stream.getAudioTracks(), video_tracks: media_stream_info.stream.getVideoTracks()}
      media_stream_info.update_stream_type()
    else
      @logger.log @logger.levels.INFO, 'No changes to the new local MediaStream',
        {stream: media_stream_info.stream, audio_tracks: media_stream_info.stream.getAudioTracks(), video_tracks: media_stream_info.stream.getVideoTracks()}

    return media_stream_info


  ###############################################################################
  # Reset
  ###############################################################################

  ###
  Reset the flow.
  @note Reset PC initialized first to prevent new local SDP
  ###
  reset_flow: =>
    @logger.log @logger.levels.INFO, "Resetting flow '#{@id}'"
    @telemetry.reset_statistics()
    .then (statistics) =>
      @logger.log @logger.levels.INFO, 'Flow network stats updated for the last time', statistics
      amplify.publish z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, @telemetry.create_report()
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Failed to reset flow networks stats: #{error.message}"
    try
      if @peer_connection?.signalingState isnt z.calling.rtc.SignalingState.CLOSED
        @_close_peer_connection()
    catch error
      @logger.log @logger.levels.ERROR, "We caught the #{error.name}: #{error.message}", error
    @_remove_media_streams()
    @_reset_signaling_states()
    @ice_candidates_cache = []
    @payload undefined
    @pc_initialized false
    @logger.log @logger.levels.DEBUG, "Resetting flow '#{@id}' with user '#{@remote_user.name()}' successful"

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

  # Get full telemetry report.
  get_telemetry: =>
    @telemetry.get_report()

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
