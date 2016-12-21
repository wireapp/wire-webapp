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
z.e_call.entities ?= {}

# Static array of where to put people in the stereo scape.
CONFIG =
  AUDIO_BITRATE: '30'
  AUDIO_PTIME: '60'
  RTC_DATA_CHANNEL_LABEL: 'calling-3.0'

# E-Flow entity.
class z.e_call.entities.EFlow
  ###
  Construct a new e-flow entity.

  @param e_call_et [z.e_call.ECall] E-Call entity that the e-flow belongs to
  @param e_participant_et [z.e_call.entities.EParticipant] E-Participant entity that the e-flow belongs to
  @param e_call_message [z.e_call.entities.ECallSetupMessage] Optional e-call setup message entity
  ###
  constructor: (@e_call_et, @e_participant_et, e_call_message) ->
    @logger = new z.util.Logger "z.e_call.EFlow (#{@e_participant_et.id})", z.config.LOGGER.OPTIONS

    @id = @e_participant_et.id
    @conversation_id = @e_call_et.id

    # States
    @is_answer = ko.observable undefined
    @is_group = @e_call_et.is_group

    # Audio
    @audio = new z.calling.entities.FlowAudio @, @e_call_et.audio_repository.get_audio_context()

    # Users
    @remote_user = @e_participant_et.user
    @remote_user_id = @remote_user.id
    @self_user_id = @e_call_et.self_user.id


    ###############################################################################
    # PeerConnection
    ###############################################################################

    @peer_connection = undefined
    @pc_initialized = ko.observable false

    @audio_stream = @e_call_et.local_audio_stream
    @video_stream = @e_call_et.local_video_stream
    @data_channels = {}


    @connection_state = ko.observable z.calling.rtc.ICEConnectionState.NEW
    @gathering_state = ko.observable z.calling.rtc.ICEGatheringState.NEW
    @signaling_state = ko.observable z.calling.rtc.SignalingState.NEW

    @connection_state.subscribe (ice_connection_state) =>
      switch ice_connection_state
        when z.calling.rtc.ICEConnectionState.CHECKING
          @logger.info 'Checking for ICE candidates on PeerConnection'

        when z.calling.rtc.ICEConnectionState.COMPLETED, z.calling.rtc.ICEConnectionState.CONNECTED
          @e_call_et.is_connected true
          @e_participant_et.is_connected true
          @e_call_et.interrupted_participants.remove @participant_et
          @e_call_et.state z.calling.enum.CallState.ONGOING

        when z.calling.rtc.ICEConnectionState.DISCONNECTED
          @e_participant_et.is_connected false
          @e_call_et.interrupted_participants.push @participant_et
          @is_answer false
          @negotiation_mode z.calling.enum.SDPNegotiationMode.ICE_RESTART

        when z.calling.rtc.ICEConnectionState.FAILED
          @e_participant_et.is_connected false
          if @is_group()
            return @e_call_et.delete_participant @participant_et if @e_call_et.self_client_joined()
          amplify.publish z.event.WebApp.CALL.STATE.LEAVE, @e_call_et.id

        when z.calling.rtc.ICEConnectionState.CLOSED
          @e_participant_et.is_connected false
          @e_call_et.delete_participant @e_participant_et if @e_call_et.self_client_joined()

    @signaling_state.subscribe (signaling_state) =>
      switch signaling_state
        when z.calling.rtc.SignalingState.CLOSED
          @logger.debug "PeerConnection with '#{@remote_user.name()}' was closed"
          @e_call_et.delete_participant @e_participant_et
          @_remove_media_streams()
          if not @is_group()
            @e_call_et.finished_reason = z.calling.enum.CallFinishedReason.CONNECTION_DROPPED

        when z.calling.rtc.SignalingState.REMOTE_OFFER
          @negotiation_needed true

        when z.calling.rtc.SignalingState.STABLE
          @negotiation_mode z.calling.enum.SDPNegotiationMode.DEFAULT

    @negotiation_mode = ko.observable z.calling.enum.SDPNegotiationMode.DEFAULT
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
          @should_add_local_sdp true

    @has_sent_local_sdp = ko.observable false
    @should_add_local_sdp = ko.observable true

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

      return @local_sdp() and @should_add_local_sdp() and in_proper_state and not in_progress

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
        @should_add_remote_sdp true

    @should_add_remote_sdp = ko.observable false

    @can_set_remote_sdp = ko.pureComputed =>
      is_answer = @remote_sdp_type() is z.calling.rtc.SDPType.ANSWER
      is_offer = @remote_sdp_type() is z.calling.rtc.SDPType.OFFER
      in_local_offer_state = @signaling_state() is z.calling.rtc.SignalingState.LOCAL_OFFER
      in_stable_state = @signaling_state() is z.calling.rtc.SignalingState.STABLE
      in_proper_state = (is_offer and in_stable_state) or (is_answer and in_local_offer_state)

      return @pc_initialized() and @should_add_remote_sdp() and in_proper_state

    @can_set_remote_sdp.subscribe (can_set) =>
      if can_set
        @logger.debug "State changed - can_set_remote_sdp: #{can_set}"
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
      return can_create

    @can_create_sdp.subscribe (can_create) =>
      if can_create
        @logger.debug "State changed - can_create_sdp: #{can_create}"

    @can_create_answer = ko.pureComputed =>
      answer_state = @is_answer() and @signaling_state() is z.calling.rtc.SignalingState.REMOTE_OFFER
      can_create = @can_create_sdp() and answer_state
      return can_create

    @can_create_answer.subscribe (can_create) =>
      if can_create
        @logger.debug "State changed - can_create_answer: #{can_create}"
        @negotiation_needed false
        @_create_answer()

    @can_create_offer = ko.pureComputed =>
      offer_state = not @is_answer() and @signaling_state() is z.calling.rtc.SignalingState.STABLE
      can_create = @can_create_sdp() and offer_state
      return can_create

    @can_create_offer.subscribe (can_create) =>
      if can_create
        @logger.debug "State changed - can_create_offer: #{can_create}"
        @negotiation_needed false
        @_create_offer()

    @initialize_e_flow e_call_message

  ###
  Initialize the e-flow.
  @note Magic here is that if an e_call_message is present, the remote user is the creator of the flow
  @param e_call_message [z.e_call.entities.ECallSetupMessage] Optional e-call setup message entity
  ###
  initialize_e_flow: (e_call_message) =>
    if e_call_message
      @logger.info "We are not the creator of flow with user '#{@remote_user.name()}'"
      @is_answer true
      @save_remote_sdp e_call_message
    else
      @logger.info "We are the creator of flow with user '#{@remote_user.name()}'"
      @is_answer false

  start_negotiation: =>
    @audio.hookup true
    @_create_peer_connection()
    @_add_media_streams()
    @negotiation_needed true
    @pc_initialized true


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
  _create_peer_connection_configuration: ->
    return {
      iceServers: @e_call_et.config().ice_servers
      bundlePolicy: 'max-bundle'
      rtcpMuxPolicy: 'require'
    }

  ###
  Initialize the PeerConnection for the flow.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
  @private
  ###
  _create_peer_connection: ->
    @peer_connection = new window.RTCPeerConnection @_create_peer_connection_configuration()
    @signaling_state @peer_connection.signalingState
    @logger.debug "PeerConnection with '#{@remote_user.name()}' created", @e_call_et.config().ice_servers

    @peer_connection.onaddstream = @_on_add_stream
    @peer_connection.onaddtrack = @_on_add_track
    @peer_connection.ondatachannel = @_on_data_channel
    @peer_connection.onicecandidate = @_on_ice_candidate
    @peer_connection.oniceconnectionstatechange = @_on_ice_connection_state_change
    @peer_connection.onnegotiationneeded = @_on_negotiation_needed
    @peer_connection.onremovestream = @_on_remove_stream
    @peer_connection.onremovetrack = @_on_remove_track
    @peer_connection.onsignalingstatechange = @_on_signaling_state_change

  ###
  A MediaStream was added to the PeerConnection.
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
    if not event.candidate
      if @has_sent_local_sdp()
        return @logger.info 'Generation of ICE candidates completed - SDP was already sent'
      @logger.debug 'Generation of ICE candidates completed - sending SDP'
      return @send_local_sdp()
    @logger.info 'Generated additional ICE candidate', event

# ICE connection state has changed.
  _on_ice_connection_state_change: (event) =>
    return if not @peer_connection or @e_call_et.state() in [z.calling.enum.CallState.DISCONNECTING, z.calling.enum.CallState.ENDED]

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
  # Data channel handling
  ###############################################################################

  send_message: (e_call_message) =>
    @data_channels[CONFIG.RTC_DATA_CHANNEL_LABEL].send e_call_message

  _initialize_data_channel: (data_channel_label) ->
    if @peer_connection.createDataChannel
      if @data_channels[data_channel_label]
        return @logger.warn "Data channel '#{data_channel_label}' already exists"
      @_setup_data_channel @peer_connection.createDataChannel data_channel_label, {ordered: true}

  _setup_data_channel: (data_channel) ->
    @logger.debug "Data channel '#{data_channel.label}' created", data_channel
    @data_channels[data_channel.label] = data_channel
    data_channel.onclose = @_on_close
    data_channel.onerror = @_on_error
    data_channel.onmessage = @_on_message
    data_channel.onopen = @_on_open

  _on_data_channel: (event) =>
    data_channel = event.channel
    @logger.debug "Data channel '#{data_channel.label}' was received", data_channel
    @_setup_data_channel data_channel

  _on_close: (event) =>
    data_channel = event.target
    @logger.debug "Data channel '#{data_channel.label}' was closed", data_channel
    delete @data_channels[data_channel.label]
    @e_call_et.data_channel_opened = false

  _on_error: (error) =>
    @logger.error "Data channel error: #{error.message}", event

  _on_message: (event) =>
    @logger.debug "Received message on data channel: #{event.data}", event
    amplify.publish z.event.WebApp.CALL.EVENT_FROM_BACKEND,
      conversation: @conversation_id
      from: @id
      content: JSON.parse event.data
      type: z.event.Client.CALL.E_CALL

  _on_open: (event) =>
    data_channel = event.target
    @logger.debug "Data channel '#{data_channel.label}' was opened and can be used", data_channel
    @e_call_et.data_channel_opened = true


  ###############################################################################
  # SDP handling
  ###############################################################################

  ###
  Save the remote SDP received via an e-call message within the e-flow.
  @param e_call_message [z.e_call.entities.ECallSetupMessage] E-call setup message entity
  ###
  save_remote_sdp: (e_call_message) =>
    @remote_sdp @_rewrite_sdp @_map_sdp(e_call_message), z.calling.enum.SDPSource.REMOTE
    @logger.info "Saved remote SDP of type '#{@remote_sdp().type}'", @remote_sdp()

  # Initiates sending the local RTCSessionDescriptionProtocol to the remote user.
  send_local_sdp: =>
    @_clear_send_sdp_timeout()
    @local_sdp @_rewrite_sdp @peer_connection.localDescription, z.calling.enum.SDPSource.LOCAL

    @logger.info "Sending local SDP of type '#{@local_sdp().type}' for flow with '#{@remote_user.name()}'\n#{@local_sdp().sdp}"
    @e_call_et.send_e_call_event new z.e_call.entities.ECallSetupMessage @local_sdp().type is z.calling.rtc.SDPType.ANSWER, @local_sdp().sdp, videosend: false, @e_call_et
    .then =>
      @has_sent_local_sdp true
      @logger.info "Sending local SDP of type '#{@local_sdp().type}' successful", @local_sdp()

  ###
  Create a local SDP of type 'answer'.
  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  @private
  ###
  _create_answer: ->
    @logger.info "Creating '#{z.calling.rtc.SDPType.ANSWER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createAnswer()
    .then (sdp_answer) =>
      @logger.debug "Creating '#{z.calling.rtc.SDPType.ANSWER}' successful", sdp_answer
      @local_sdp @_rewrite_sdp sdp_answer, z.calling.enum.SDPSource.LOCAL
    .catch (error) =>
      @logger.error "Creating '#{z.calling.rtc.SDPType.ANSWER}' failed: #{error.name} - #{error.message}", error

  ###
  Create a local SDP of type 'offer'.

  @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
  @private
  @param restart [Boolean] Is ICE restart negotiation
  ###
  _create_offer: (restart) ->
    @_initialize_data_channel CONFIG.RTC_DATA_CHANNEL_LABEL

    offer_options =
      iceRestart: restart
      offerToReceiveAudio: true
      offerToReceiveVideo: true
      voiceActivityDetection: true

    @logger.info "Creating '#{z.calling.rtc.SDPType.OFFER}' for flow with '#{@remote_user.name()}'"
    @peer_connection.createOffer offer_options
    .then (sdp_offer) =>
      @logger.debug "Creating '#{z.calling.rtc.SDPType.OFFER}' successful", sdp_offer
      @local_sdp @_rewrite_sdp sdp_offer, z.calling.enum.SDPSource.LOCAL
    .catch (error) =>
      @logger.error "Creating '#{z.calling.rtc.SDPType.OFFER}' failed: #{error.name} - #{error.message}", error

  ###
  Map e-call setup message to RTCSessionDescription.
  @param e_call_message [z.e_call.entities.ECallSetupMessage] E-call setup message entity
  @return [RTCSessionDescription] webRTC standard compliant RTCSessionDescription
  ###
  _map_sdp: (e_call_message) ->
    return new window.RTCSessionDescription
      sdp: e_call_message.sdp
      type: if e_call_message.resp in [true, 'true'] then z.calling.rtc.SDPType.ANSWER else z.calling.rtc.SDPType.OFFER

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
          @logger.info "Added tool version to local SDP: #{outline}"

      else if sdp_line.startsWith 'a=candidate'
        ice_candidates.push sdp_line

      else if sdp_line.startsWith 'a=group'
        if @negotiation_mode() is z.calling.enum.SDPNegotiationMode.STREAM_CHANGE and sdp_source is z.calling.enum.SDPSource.LOCAL
          outlines.push 'a=x-streamchange'
          @logger.info 'Added stream renegotiation flag to local SDP'

      # Code to nail in bit-rate and ptime settings for improved performance and experience
      else if sdp_line.startsWith 'm=audio'
        if @negotiation_mode() is z.calling.enum.SDPNegotiationMode.ICE_RESTART or (sdp_source is z.calling.enum.SDPSource.LOCAL and @is_group())
          outlines.push sdp_line
          outline = "b=AS:#{CONFIG.AUDIO_BITRATE}"
          @logger.info "Limited audio bit-rate in local SDP: #{outline}"

      else if sdp_line.startsWith 'a=rtpmap'
        if @negotiation_mode() is z.calling.enum.SDPNegotiationMode.ICE_RESTART or (sdp_source is z.calling.enum.SDPSource.LOCAL and @is_group())
          if z.util.contains sdp_line, 'opus'
            outlines.push sdp_line
            outline = "a=ptime:#{CONFIG.AUDIO_PTIME}"
            @logger.info "Changed audio p-time in local SDP: #{outline}"

      if outline isnt undefined
        outlines.push outline

    @logger.info "'#{sdp_source.charAt(0).toUpperCase()}#{sdp_source.slice 1}' SDP contains '#{ice_candidates.length}' ICE candidate(s)", ice_candidates

    rewritten_sdp = outlines.join '\r\n'

    if rtc_sdp.sdp isnt rewritten_sdp
      rtc_sdp.sdp = rewritten_sdp
      @logger.info "Rewrote '#{sdp_source}' SDP of type '#{rtc_sdp.type}'", rtc_sdp

    return rtc_sdp

  ###
  Sets the local Session Description Protocol on the PeerConnection.
  @private
  ###
  _set_local_sdp: ->
    @logger.info "Setting local SDP of type '#{@local_sdp().type}'", @local_sdp()
    @peer_connection.setLocalDescription @local_sdp()
    .then =>
      @logger.debug "Setting local SDP of type '#{@local_sdp().type}' successful", @peer_connection.localDescription
      @should_add_local_sdp false
      @send_sdp_timeout = window.setTimeout =>
        @logger.debug 'Sending local SDP on timeout'
        @send_local_sdp()
      , 1000
    .catch (error) =>
      @logger.error "Setting local SDP of type '#{@local_sdp().type}' failed: #{error.name} - #{error.message}", error

  ###
  Sets the remote Session Description Protocol on the PeerConnection.
  @private
  ###
  _set_remote_sdp: ->
    @logger.info "Setting remote SDP of type '#{@remote_sdp().type}'\n#{@remote_sdp().sdp}", @remote_sdp()
    @peer_connection.setRemoteDescription @remote_sdp()
    .then =>
      @logger.debug "Setting remote SDP of type '#{@remote_sdp().type}' successful", @peer_connection.remoteDescription
      @should_add_remote_sdp false
    .catch (error) =>
      @logger.error "Setting remote SDP of type '#{@remote_sdp().type}' failed: #{error.name} - #{error.message}", error


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
      if error.type in [z.calling.CallError::TYPE.NO_REPLACEABLE_TRACK, z.calling.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED]
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
      media_stream = @audio.wrap_microphone_stream media_stream

    if @peer_connection.addTrack
      for media_stream_track in media_stream.getTracks()
        @peer_connection.addTrack media_stream_track, media_stream
        @logger.info "Added local MediaStreamTrack of type '#{media_stream_track.kind}' to PeerConnection",
          {stream: media_stream, audio_tracks: media_stream.getAudioTracks(), video_tracks: media_stream.getVideoTracks()}
    else
      @peer_connection.addStream media_stream
      @logger.info "Added local MediaStream of type '#{media_stream.type}' to PeerConnection",
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
  @private
  @param media_stream_info [z.media.MediaStreamInfo] Object containing the required MediaStream information
  ###
  _replace_media_stream: (media_stream_info) ->
    Promise.resolve()
    .then =>
      return @_remove_media_streams media_stream_info.type
    .then =>
      @negotiation_mode z.calling.enum.SDPNegotiationMode.STREAM_CHANGE
      @_add_media_stream media_stream_info.stream
      @is_answer false
      @negotiation_needed true
      @logger.info 'Replaced the MediaStream successfully', media_stream_info.stream
      return media_stream_info
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
          return rtp_sender
        throw new z.calling.CallError z.calling.CallError::TYPE.NO_REPLACEABLE_TRACK
      else
        throw new z.calling.CallError z.calling.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED
    .then (rtp_sender) ->
      return rtp_sender.replaceTrack media_stream_info.stream.getTracks()[0]
    .then =>
      @logger.info "Replaced the '#{media_stream_info.type}' track"
      return media_stream_info
    .catch (error) =>
      if error.type not in [z.calling.CallError::TYPE.NOT_SUPPORTED, z.calling.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED]
        @logger.error "Failed to replace the '#{media_stream_info.type}' track: #{error.name} - #{error.message}", error
      throw error

  ###
  Reset the flows MediaStream and media elements.
  @private
  @param media_stream [MediaStream] Local MediaStream to remove from the PeerConnection
  ###
  _remove_media_stream: (media_stream) ->
    return @logger.info 'No PeerConnection found to remove MediaStream from' if not @peer_connection

    if @peer_connection.getSenders and @peer_connection.removeTrack
      for media_stream_track in media_stream.getTracks()
        for rtp_sender in @peer_connection.getSenders() when rtp_sender.track.id is media_stream_track.id
          @peer_connection.removeTrack rtp_sender
          @logger.info "Removed local MediaStreamTrack of type '#{media_stream_track.kind}' from PeerConnection"
    else if @peer_connection.signalingState isnt z.calling.rtc.SignalingState.CLOSED
      @peer_connection.removeStream media_stream
      @logger.info "Removed local MediaStream of type '#{media_stream.type}' from PeerConnection",
        {stream: media_stream, audio_tracks: media_stream.getAudioTracks(), video_tracks: media_stream.getVideoTracks()}

  ###
  Reset the flows MediaStream and media elements.
  @private
  @param media_type [z.media.MediaType] Optional media type of MediaStreams to be removed
  ###
  _remove_media_streams: (media_type = z.media.MediaType.AUDIO_VIDEO) ->
    switch media_type
      when z.media.MediaType.AUDIO_VIDEO
        media_streams_identical = @_compare_local_media_streams()

        @_remove_media_stream @audio_stream() if @audio_stream()
        @_remove_media_stream @video_stream() if @video_stream() and not media_streams_identical
      when z.media.MediaType.AUDIO
        @_remove_media_stream @audio_stream() if @audio_stream()
      when z.media.MediaType.VIDEO
        @_remove_media_stream @video_stream() if @video_stream()


  ###############################################################################
  # Reset
  ###############################################################################

  ###
  Reset the flow.
  @note Reset PC initialized first to prevent new local SDP
  ###
  reset_flow: =>
    @_clear_send_sdp_timeout()
    @logger.info "Resetting flow with user '#{@remote_user.id}'"
    .then (statistics) =>
      @logger.info 'Flow network stats updated for the last time', statistics
    .catch (error) =>
      @logger.warn "Failed to reset flow networks stats: #{error.message}"
    try
      if @peer_connection?.signalingState isnt z.calling.rtc.SignalingState.CLOSED
        @_close_peer_connection()
    catch error
      @logger.error "We caught the #{error.name}: #{error.message}", error
    @_remove_media_streams()
    @_reset_signaling_states()
    @pc_initialized false
    @logger.debug "Resetting flow '#{@remote_user.id}' with user '#{@remote_user.name()}' successful"

  ###
  Clear the SDP send timeout.
  @private
  ###
  _clear_send_sdp_timeout: ->
    if @send_sdp_timeout
      window.clearTimeout @send_sdp_timeout
      @send_sdp_timeout = undefined

  ###
  Reset the signaling states.
  @private
  ###
  _reset_signaling_states: ->
    @signaling_state z.calling.rtc.SignalingState.NEW
    @connection_state z.calling.rtc.ICEConnectionState.NEW
    @gathering_state z.calling.rtc.ICEGatheringState.NEW
