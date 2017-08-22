/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

window.z = window.z || {};
window.z.calling = z.calling || {};
window.z.calling.entities = z.calling.entities || {};

z.calling.entities.Flow = class Flow {
  static get CONFIG() {
    return {
      DATA_CHANNEL_LABEL: 'calling-3.0',
      NEGOTIATION_FAILED_TIMEOUT: 30 * 1000 + 500,
      NEGOTIATION_RESTART_TIMEOUT: 2500,
      SDP_SEND_TIMEOUT: 5 * 1000,
      SDP_SEND_TIMEOUT_RESET: 1000,
    };
  }

  /**
   * Construct a new flow entity.
   *
   * @class z.calling.entities.Flow
   * @param {Call} call_et - Call entity that the flow belongs to
   * @param {Participant} participant_et - Participant entity that the flow belongs to
   * @param {CallSetupTimings} timings - Timing statistics of call setup steps
   */
  constructor(call_et, participant_et, timings) {
    this.calling_repository = call_et.calling_repository;

    this.call_et = call_et;
    this.participant_et = participant_et;
    this.logger = new z.util.Logger(`z.calling.entities.Flow (${this.participant_et.id})`, z.config.LOGGER.OPTIONS);

    this.id = this.participant_et.id;
    this.conversation_id = this.call_et.id;

    // States
    this.is_answer = ko.observable(false);

    // Audio
    this.audio = new z.calling.entities.FlowAudio(this, this.calling_repository.media_repository);

    // Users
    this.remote_client_id = undefined;
    this.remote_user = this.participant_et.user;
    this.remote_user_id = this.remote_user.id;
    this.self_user = this.call_et.self_user;
    this.self_user_id = this.self_user.id;

    // Telemetry
    this.telemetry = new z.telemetry.calling.FlowTelemetry(this.id, this.remote_user_id, this.call_et, timings);


    //##############################################################################
    // PeerConnection
    //##############################################################################

    this.peer_connection = undefined;
    this.pc_initialized = ko.observable(false);

    this.media_stream = this.call_et.local_media_stream;
    this.data_channel = undefined;
    this.data_channel_opened = false;

    this.connection_state = ko.observable(z.calling.rtc.ICE_CONNECTION_STATE.NEW);
    this.gathering_state = ko.observable(z.calling.rtc.ICE_GATHERING_STATE.NEW);
    this.signaling_state = ko.observable(z.calling.rtc.SIGNALING_STATE.NEW);

    this.connection_state.subscribe((ice_connection_state) => {
      switch (ice_connection_state) {
        case z.calling.rtc.ICE_CONNECTION_STATE.CHECKING: {
          this.telemetry.schedule_check(this.call_et.telemetry.media_type, this.is_answer());
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.COMPLETED:
        case z.calling.rtc.ICE_CONNECTION_STATE.CONNECTED: {
          this._clear_negotiation_timeout();
          this.negotiation_mode(z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT);
          this.telemetry.start_statistics();

          this.call_et.is_connected(true);
          this.participant_et.is_connected(true);

          this.call_et.interrupted_participants.remove(this.participant_et);
          this.call_et.state(z.calling.enum.CALL_STATE.ONGOING);
          this.call_et.termination_reason = undefined;
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.CLOSED: {
          this.participant_et.is_connected(false);

          if (this.call_et.self_client_joined()) {
            this.call_et.delete_participant(this.participant_et.id, this.remote_client_id);
          }
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.DISCONNECTED: {
          this._set_negotiation_restart_timeout();
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.FAILED: {
          if (this.call_et.self_client_joined()) {
            this._remove_participant();
          }
          break;
        }

        default: {
          break;
        }
      }
    });

    this.signaling_state.subscribe((signaling_state) => {
      switch (signaling_state) {
        case z.calling.rtc.SIGNALING_STATE.CLOSED: {
          this.logger.info(`PeerConnection with '${this.remote_user.name()}' was closed`);
          this.call_et.delete_participant(this.participant_et.id, this.remote_client_id);
          break;
        }

        case z.calling.rtc.SIGNALING_STATE.STABLE: {
          this._clear_negotiation_timeout();
          break;
        }

        default: {
          break;
        }
      }
    });

    this.negotiation_mode = ko.observable(z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT);
    this.negotiation_needed = ko.observable(false);
    this.negotiation_timeout = undefined;

    this.sdp_state_changing = ko.observable(false);


    //##############################################################################
    // Local SDP
    //##############################################################################

    this.local_sdp_type = ko.observable(undefined);
    this.local_sdp = ko.observable(undefined);
    this.local_sdp.subscribe((sdp = {}) => {
      this.local_sdp_type(sdp.type);

      if (sdp.type) {
        if (!this.should_send_local_sdp()) {
          this.should_send_local_sdp(true);
          this.should_set_local_sdp(true);
        }
      }
    });

    this.should_send_local_sdp = ko.observable(false);
    this.should_set_local_sdp = ko.observable(false);

    this.send_sdp_timeout = undefined;

    this.proper_local_sdp_state = ko.pureComputed(() => {
      const is_answer = this.local_sdp_type() === z.calling.rtc.SDP_TYPE.ANSWER;
      const is_offer = this.local_sdp_type() === z.calling.rtc.SDP_TYPE.OFFER;
      const in_remote_offer_state = this.signaling_state() === z.calling.rtc.SIGNALING_STATE.REMOTE_OFFER;
      const in_stable_state = this.signaling_state() === z.calling.rtc.SIGNALING_STATE.STABLE;

      return (is_offer && in_stable_state) || (is_answer && in_remote_offer_state);
    });

    this.can_set_local_sdp = ko.pureComputed(() => {
      const in_connection_progress = this.connection_state() === z.calling.rtc.ICE_CONNECTION_STATE.CHECKING;
      const progress_gathering_states = [z.calling.rtc.ICE_GATHERING_STATE.COMPLETE, z.calling.rtc.ICE_GATHERING_STATE.GATHERING];
      const in_progress = in_connection_progress && progress_gathering_states.includes(this.gathering_state());

      return this.local_sdp() && this.should_set_local_sdp() && this.proper_local_sdp_state() && !in_progress && !this.sdp_state_changing();
    });

    this.can_set_local_sdp.subscribe((can_set) => {
      if (can_set) {
        this._set_local_sdp();
      }
    });


    //##############################################################################
    // Remote SDP
    //##############################################################################

    this.remote_sdp_type = ko.observable(undefined);
    this.remote_sdp = ko.observable(undefined);
    this.remote_sdp.subscribe((sdp = {}) => {
      this.remote_sdp_type(sdp.type);

      if (sdp.type) {
        this.should_set_remote_sdp(true);
      }
    });

    this.should_set_remote_sdp = ko.observable(false);

    this.proper_remote_sdp_state = ko.pureComputed(() => {
      const is_answer = this.remote_sdp_type() === z.calling.rtc.SDP_TYPE.ANSWER;
      const is_offer = this.remote_sdp_type() === z.calling.rtc.SDP_TYPE.OFFER;
      const in_local_offer_state = this.signaling_state() === z.calling.rtc.SIGNALING_STATE.LOCAL_OFFER;
      const in_stable_state = this.signaling_state() === z.calling.rtc.SIGNALING_STATE.STABLE;

      return (is_offer && in_stable_state) || (is_answer && in_local_offer_state);
    });

    this.can_set_remote_sdp = ko.pureComputed(() => {
      return this.pc_initialized() && this.should_set_remote_sdp() && this.proper_remote_sdp_state() && !this.sdp_state_changing();
    });

    this.can_set_remote_sdp.subscribe((can_set) => {
      if (can_set) {
        this._set_remote_sdp();
      }
    });


    //##############################################################################
    // Gates
    //##############################################################################

    this.can_create_sdp = ko.pureComputed(() => {
      const in_state_for_creation = this.negotiation_needed() && this.signaling_state() !== z.calling.rtc.SIGNALING_STATE.CLOSED;
      return this.pc_initialized() && in_state_for_creation;
    });

    this.can_create_sdp_answer = ko.pureComputed(() => {
      const answer_state = this.is_answer() && this.signaling_state() === z.calling.rtc.SIGNALING_STATE.REMOTE_OFFER;
      return this.can_create_sdp() && answer_state;
    });

    this.can_create_sdp_answer.subscribe((can_create) => {
      if (can_create) {
        this._create_sdp_answer();
      }
    });

    this.can_create_sdp_offer = ko.pureComputed(() => {
      const offer_state = !this.is_answer() && this.signaling_state() === z.calling.rtc.SIGNALING_STATE.STABLE;
      return this.can_create_sdp() && offer_state;
    });

    this.can_create_sdp_offer.subscribe((can_create) => {
      if (can_create) {
        this._create_sdp_offer();
      }
    });
  }

  /**
   * Restart the peer connection negotiation.
   *
   * @param {z.calling.enum.SDP_NEGOTIATION_MODE} negotiation_mode - Mode for renegotiation
   * @param {boolean} is_answer - Flow is answer
   * @param {MediaStream} [media_stream] - Local media stream
   * @returns {undefined} No return value
   */
  restart_negotiation(negotiation_mode, is_answer, media_stream) {
    this.logger.info(`Negotiation restart triggered by '${negotiation_mode}'`);

    this.clear_timeouts();
    this._close_peer_connection();
    this._close_data_channel();
    this._reset_signaling_states();
    this.is_answer(is_answer);
    this._reset_sdp();

    if (negotiation_mode !== z.calling.enum.SDP_NEGOTIATION_MODE.STATE_COLLISION) {
      this.start_negotiation(negotiation_mode, media_stream);
    }
  }

  /**
   * Set the remote client ID.
   * @param {string} client_id - Remote client ID
   * @returns {Undefined} No return value
   */
  set_remote_client_id(client_id) {
    if (!this.remote_client_id) {
      this.remote_client_id = client_id;
      this.logger.info(`Identified remote client as '${client_id}'`);
    }
  }

  /**
   * Start the peer connection negotiation.
   *
   * @param {z.calling.enum.SDP_NEGOTIATION_MODE} [negotiation_mode=z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT] - Mode for renegotiation
   * @param {MediaStream} [media_stream=this.media_stream()] - Local media stream
   * @returns {undefined} No return value
   */
  start_negotiation(negotiation_mode = z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT, media_stream = this.media_stream()) {
    this.logger.info(`Start negotiating PeerConnection with '${this.remote_user.name()}' triggered by '${negotiation_mode}'`);

    this._create_peer_connection()
      .then(() => {
        this._add_media_stream(media_stream);
        this.audio.hookup(true);
        this._set_sdp_states();
        this.negotiation_mode(negotiation_mode);
        this.negotiation_needed(true);
        this.pc_initialized(true);
        this._set_negotiation_failed_timeout();
      });
  }

  /**
   * Remove the participant from the call
   *
   * @private
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Reason for termination
   * @returns {undefined} No return value
   */
  _remove_participant(termination_reason) {
    this.participant_et.is_connected(false);

    this.call_et.delete_participant(this.participant_et.id, this.remote_client_id, z.calling.enum.TERMINATION_REASON.CONNECTION_DROP)
      .then(() => {
        if (!this.call_et.participants().length) {
          if (!termination_reason) {
            termination_reason = this.call_et.is_connected() ? z.calling.enum.TERMINATION_REASON.CONNECTION_DROP : z.calling.enum.TERMINATION_REASON.CONNECTION_FAILED;
          }
          amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.call_et.id, termination_reason);
        }
      });
  }

  /**
   * Set SDP gate states.
   * @private
   * @returns {undefined} No return value
   */
  _set_sdp_states() {
    this.should_set_remote_sdp(true);
    this.should_set_local_sdp(true);
    this.should_send_local_sdp(true);
  }


  //##############################################################################
  // PeerConnection handling
  //##############################################################################

  /**
   * Close the PeerConnection.
   * @private
   * @returns {undefined} No return value
   */
  _close_peer_connection() {
    if (this.peer_connection) {
      this.peer_connection.oniceconnectionstatechange = () => {
        this.logger.log(this.logger.levels.OFF, 'State change ignored - ICE connection');
      };

      this.peer_connection.onsignalingstatechange = () => {
        this.logger.log(this.logger.levels.OFF, `State change ignored - signaling state: ${this.peer_connection.signalingState}`);
      };

      if (this.peer_connection.signalingState !== z.calling.rtc.SIGNALING_STATE.CLOSED) {
        this.peer_connection.close();
        this.logger.info(`Closing PeerConnection '${this.remote_user.name()}' successful`);
      }
    }
  }

  /**
   * Create the PeerConnection configuration.
   * @private
   * @returns {Promise} Resolves with the configuration object to initialize PeerConnection
   */
  _create_peer_connection_configuration() {
    return this.calling_repository.get_config()
      .then(({ice_servers}) => {
        return {
          bundlePolicy: 'max-bundle',
          iceServers: ice_servers,
          rtcpMuxPolicy: 'require', // @deprecated Default value beginning Chrome 57
        };
      });
  }

  /**
   * Initialize the PeerConnection for the flow.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
   * @private
   * @returns {Promise} Resolves when the PeerConnection was created
   */
  _create_peer_connection() {
    return this._create_peer_connection_configuration()
      .then((pc_configuration) => {
        this.peer_connection = new window.RTCPeerConnection(pc_configuration);
        this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED);
        this.signaling_state(this.peer_connection.signalingState);
        this.logger.debug(`PeerConnection with '${this.remote_user.name()}' created - is_answer '${this.is_answer()}'`, pc_configuration);

        this.peer_connection.onaddstream = this._on_add_stream.bind(this);
        this.peer_connection.ontrack = this._on_track.bind(this);
        this.peer_connection.ondatachannel = this._on_data_channel.bind(this);
        this.peer_connection.onicecandidate = this._on_ice_candidate.bind(this);
        this.peer_connection.oniceconnectionstatechange = this._on_ice_connection_state_change.bind(this);
        this.peer_connection.onremovestream = this._on_remove_stream.bind(this);
        this.peer_connection.onsignalingstatechange = this._on_signaling_state_change.bind(this);

        this.telemetry.set_peer_connection(this.peer_connection);
      });
  }

  /**
   * A MediaStream was added to the PeerConnection.
   *
   * @deprecated
   * @private
   * @param {MediaStream} media_stream - MediaStream from event
   * @returns {undefined} No return value
   */
  _on_add_stream({stream: media_stream}) {
    this.logger.info('Remote MediaStream added to PeerConnection',
      {
        audio_tracks: media_stream.getAudioTracks(),
        stream: media_stream,
        video_tracks: media_stream.getVideoTracks(),
      });

    media_stream = z.media.MediaStreamHandler.detect_media_stream_type(media_stream);
    if (media_stream.type === z.media.MediaType.AUDIO) {
      media_stream = this.audio.wrap_audio_output_stream(media_stream);
    }

    const media_stream_info = new z.media.MediaStreamInfo(z.media.MediaStreamSource.REMOTE, this.remote_user.id, media_stream, this.call_et);
    amplify.publish(z.event.WebApp.CALL.MEDIA.ADD_STREAM, media_stream_info);
  }

  /**
   * A local ICE candidates is available.
   *
   * @private
   * @param {RTCIceCandidate} ice_candidate - RTCIceCandidate from event
   * @returns {undefined} No return value
   */
  _on_ice_candidate({candidate: ice_candidate}) {
    if (!ice_candidate) {
      if (this.should_send_local_sdp()) {
        this.logger.info('Generation of ICE candidates completed - sending SDP');
        this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.ICE_GATHERING_COMPLETED);
        this.send_local_sdp();
      }
    }
  }

  /**
   * ICE connection state has changed.
   *
   * @private
   * @param {Object} event - State change event
   * @returns {undefined} No return value
   */
  _on_ice_connection_state_change(event) {
    const ending_call_states = [z.calling.enum.CALL_STATE.DISCONNECTING, z.calling.enum.CALL_STATE.ENDED];
    const is_ending_call = ending_call_states.includes(this.call_et.state());

    if (this.peer_connection || !is_ending_call) {
      this.logger.info('State changed - ICE connection', event);
      this.logger.log(this.logger.levels.LEVEL_1, `ICE connection state: ${this.peer_connection.iceConnectionState}`);
      this.logger.log(this.logger.levels.LEVEL_1, `ICE gathering state: ${this.peer_connection.iceGatheringState}`);

      this.gathering_state(this.peer_connection.iceGatheringState);
      this.connection_state(this.peer_connection.iceConnectionState);
    }
  }

  /**
   * A MediaStream was removed from the PeerConnection.
   *
   * @private
   * @param {MediaStreamEvent} event - Event that a MediaStream has been removed
   * @returns {undefined} No return value
  */
  _on_remove_stream(event) {
    this.logger.info('Remote MediaStream removed from PeerConnection', event);
  }

  /**
   * Signaling state has changed.
   *
   * @private
   * @param {Object} event - State change event
   * @returns {undefined} No return value
   */
  _on_signaling_state_change(event) {
    this.logger.info(`State changed - signaling state: ${this.peer_connection.signalingState}`, event);
    this.signaling_state(this.peer_connection.signalingState);
  }

  /**
   * A MediaStreamTrack was added to the PeerConnection.
   *
   * @private
   * @param {RTCTrackEvent} event - Event that contains the newly added MediaStreamTrack
   * @returns {undefined} No return value
   */
  _on_track(event) {
    this.logger.info('Remote MediaStreamTrack added to PeerConnection', event);
  }


  //##############################################################################
  // Data channel handling
  //##############################################################################

  /**
   * Send an call message through the data channel.
   * @param {CallMessage} call_message_et - Call message to be send
   * @returns {undefined} No return value
   */
  send_message(call_message_et) {
    const {conversation_id, response, type} = call_message_et;

    if (this.data_channel && this.data_channel_opened) {
      try {
        this.data_channel.send(call_message_et.to_content_string());
        this.logger.info(`Sending '${type}' message to conversation '${conversation_id}' via data channel`, call_message_et.to_JSON());
        return;
      } catch (error) {
        if (!response) {
          this.logger.warn(`Failed to send calling message via data channel: ${error.name}`, error);
          throw new z.calling.CallError(z.calling.CallError.TYPE.NO_DATA_CHANNEL);
        }
      }
    }

    throw new z.calling.CallError(z.calling.CallError.TYPE.NO_DATA_CHANNEL);
  }

  /**
   * Close the data channel.
   * @private
   * @returns {undefined} No return value
   */
  _close_data_channel() {
    if (this.data_channel) {
      if (this.data_channel.readyState === z.calling.rtc.DATA_CHANNEL_STATE.OPEN) {
        this.data_channel.close();
      }
      delete this.data_channel;
    }
    this.data_channel_opened = false;
  }

  /**
   * Initialize the data channel.
   * @private
   * @returns {undefined} No return value
   */
  _initialize_data_channel() {
    if (this.peer_connection.createDataChannel && !this.data_channel) {
      this._setup_data_channel(this.peer_connection.createDataChannel(Flow.CONFIG.DATA_CHANNEL_LABEL, {ordered: true}));
    }
  }

  /**
   * Set up the data channel.
   *
   * @private
   * @param {RTCDataChannel} data_channel - Data channel object
   * @returns {undefined} No return value
   */
  _setup_data_channel(data_channel) {
    this.data_channel = data_channel;
    data_channel.onclose = this._on_close.bind(this);
    data_channel.onerror = this._on_error.bind(this);
    data_channel.onmessage = this._on_message.bind(this);
    data_channel.onopen = this._on_open.bind(this);
  }

  /**
   * A data channel was received on the PeerConnection.
   *
   * @private
   * @param {RTCDataChannel} data_channel - Data channel from event
   * @returns {undefined} No return value
   */
  _on_data_channel({channel: data_channel}) {
    this._setup_data_channel(data_channel);
  }

  /**
   * Data channel was closed.
   *
   * @private
   * @param {RTCDataChannel} data_channel - Data channel that was closed
   * @returns {undefined} No return value
   */
  _on_close({target: data_channel}) {
    this.logger.info(`Data channel '${data_channel.label}' was closed`, data_channel);

    if (this.data_channel && this.data_channel.readyState === z.calling.rtc.DATA_CHANNEL_STATE.CLOSED) {
      delete this.data_channel;
      this.data_channel_opened = false;
    }
  }

  /**
   * An error was caught on the data channel.
   *
   * @private
   * @param {Error} error - Error thrown
   * @returns {undefined} No return value
   */
  _on_error(error) {
    throw error;
  }

  /**
   * New incoming message on the data channel.
   *
   * @private
   * @param {string} message - Incoming message
   * @returns {undefined} No return value
   */
  _on_message({data: message}) {
    const call_message = JSON.parse(message);
    const {resp: response, type} = call_message;
    const {conversation_et} = this.call_et;

    if (response === true) {
      this.logger.debug(`Received confirmation for '${type}' message via data channel`, call_message);
    } else {
      this.logger.debug(`Received '${type}' (response: ${response}) message via data channel`, call_message);
    }

    const call_event = z.conversation.EventBuilder.build_calling(conversation_et, call_message, this.remote_user_id, this.remote_client_id);
    amplify.publish(z.event.WebApp.CALL.EVENT_FROM_BACKEND, call_event, z.event.EventRepository.SOURCE.WEB_SOCKET);
  }

  /**
   * Data channel was successfully opened.
   *
   * @private
   * @param {RTCDataChannel} data_channel - Opened data channel
   * @returns {undefined} No return value
   */
  _on_open({target: data_channel}) {
    this.logger.info(`Data channel '${data_channel.label}' was opened and can be used`, data_channel);
    this.data_channel_opened = true;
  }


  //##############################################################################
  // SDP handling
  //##############################################################################

  /**
   * Save the remote SDP received via an call message within the flow.
   *
   * @note The resolving value indicates whether negotiation should be skipped for the current state.
   * @param {CallMessage} call_message_et - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {Promise} Resolves when the remote SDP was saved
   */
  save_remote_sdp(call_message_et) {
    let skip_negotiation = false;

    return z.calling.SDPMapper.map_call_message_to_object(call_message_et)
      .then((rtc_sdp) => z.calling.SDPMapper.rewrite_sdp(rtc_sdp, z.calling.enum.SDP_SOURCE.REMOTE, this))
      .then(({sdp: remote_sdp}) => {
        const is_remote_offer = remote_sdp.type === z.calling.rtc.SDP_TYPE.OFFER;
        if (is_remote_offer) {
          switch (this.signaling_state()) {
            case z.calling.rtc.SIGNALING_STATE.LOCAL_OFFER: {
              if (this._solve_colliding_states()) {
                return true;
              }
              break;
            }

            case z.calling.rtc.SIGNALING_STATE.NEW:
            case z.calling.rtc.SIGNALING_STATE.STABLE: {
              const is_update = call_message_et.type === z.calling.enum.CALL_MESSAGE_TYPE.UPDATE;

              if (is_update) {
                this.restart_negotiation(z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE, true);
                skip_negotiation = true;
              }

              this.is_answer(true);
              break;
            }

            default: {
              break;
            }
          }
        }

        this.remote_sdp(remote_sdp);
        this.logger.debug(`Saved remote '${remote_sdp.type}' SDP`, this.remote_sdp());
        return skip_negotiation;
      });
  }

  /**
   * Initiates sending the local RTCSessionDescriptionProtocol to the remote user.
   * @param {boolean} [sending_on_timeout=false] - SDP sending on timeout
   * @returns {undefined} No return value
   */
  send_local_sdp(sending_on_timeout = false) {
    this._clear_send_sdp_timeout();

    z.calling.SDPMapper.rewrite_sdp(this.peer_connection.localDescription, z.calling.enum.SDP_SOURCE.LOCAL, this)
      .then(({ice_candidates, sdp: local_sdp}) => {
        this.local_sdp(local_sdp);

        if (sending_on_timeout && this.negotiation_mode() === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT) {
          if (!this._contains_relay_candidate(ice_candidates)) {
            this.logger.warn(`Local SDP does not contain any relay ICE candidates, resetting timeout\n${ice_candidates}`, ice_candidates);
            return this._set_send_sdp_timeout(false);
          }
        }

        this.logger.debug(`Sending local '${local_sdp.type}' SDP containing '${ice_candidates.length}' ICE candidates for flow with '${this.remote_user.name()}'\n${this.local_sdp().sdp}`);
        this.should_send_local_sdp(false);

        const response = local_sdp.type === z.calling.rtc.SDP_TYPE.ANSWER;
        let call_message_et;

        if (this.negotiation_mode() === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT) {
          if (this.call_et.is_group) {
            call_message_et = z.calling.CallMessageBuilder.build_group_setup(response, this.call_et.session_id, this._create_additional_payload());
          } else {
            call_message_et = z.calling.CallMessageBuilder.build_setup(response, this.call_et.session_id, this._create_additional_payload());
          }
        } else {
          call_message_et = z.calling.CallMessageBuilder.build_update(response, this.call_et.session_id, this._create_additional_payload());
        }

        return this.call_et.send_call_message(call_message_et)
          .then(() => {
            this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SEND);
            this.logger.debug(`Sending local '${local_sdp.type}' SDP successful`, this.local_sdp());
          });
      })
      .catch((error) => {
        this.should_send_local_sdp(true);
        throw error;
      });
  }

  /**
   * Clear the negotiation timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clear_negotiation_timeout() {
    if (this.negotiation_timeout) {
      window.clearTimeout(this.negotiation_timeout);
      this.negotiation_timeout = undefined;
    }
  }

  /**
   * Clear the SDP send timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clear_send_sdp_timeout() {
    if (this.send_sdp_timeout) {
      window.clearTimeout(this.send_sdp_timeout);
      this.send_sdp_timeout = undefined;
    }
  }


  /**
   * Check for relay candidate among given ICE candidates
   *
   * @private
   * @param {Array<string>} ice_candidates - ICE candidate strings from SDP
   * @returns {boolean} True if relay candidate found
   */
  _contains_relay_candidate(ice_candidates) {
    for (const ice_candidate of ice_candidates) {
      if (ice_candidate.toLowerCase().includes('relay')) {
        return true;
      }
    }
  }

  /**
   * Create a local SDP of type 'answer'.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
   * @private
   * @returns {undefined} No return value
   */
  _create_sdp_answer() {
    this.negotiation_needed(false);
    this.logger.debug(`Creating '${z.calling.rtc.SDP_TYPE.ANSWER}' for flow with '${this.remote_user.name()}'`);

    this.peer_connection.createAnswer()
      .then((rtc_sdp) => this._create_sdp_success(rtc_sdp))
      .catch((error) => this._create_sdp_failure(error, z.calling.rtc.SDP_TYPE.ANSWER));
  }

  /**
   * Failed to create local SDP
   *
   * @private
   * @param {Error} error - Error that was thrown
   * @param {z.calling.rtc.SDP_TYPE} sdp_type - Type of SDP
   * @returns {undefined} No return value
   */
  _create_sdp_failure(error, sdp_type) {
    const {message, name} = error;
    this.logger.error(`Creating '${sdp_type}' failed: ${name} - ${message}`, error);

    const attributes = {cause: name, step: 'create_sdp', type: sdp_type};
    this.call_et.telemetry.track_event(z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes);

    amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.call_et.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED);
  }

  /**
   * Creating local SDP succeeded.
   *
   * @private
   * @param {RTCSessionDescription} rct_sdp - New local SDP
   * @returns {undefined} No return value
   */
  _create_sdp_success(rct_sdp) {
    this.logger.info(`Creating '${rct_sdp.type}' successful`, rct_sdp);

    z.calling.SDPMapper.rewrite_sdp(rct_sdp, z.calling.enum.SDP_SOURCE.LOCAL, this)
      .then(({sdp: local_sdp}) => this.local_sdp(local_sdp));
  }

  /**
   * Create a local SDP of type 'offer'.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
   * @private
   * @param {boolean} restart - Is ICE restart negotiation
   * @returns {undefined} No return value
   */
  _create_sdp_offer(restart) {
    this.negotiation_needed(false);
    this._initialize_data_channel();

    const offer_options = {
      iceRestart: restart,
      voiceActivityDetection: true,
    };

    this.logger.debug(`Creating '${z.calling.rtc.SDP_TYPE.OFFER}' for flow with '${this.remote_user.name()}'`);

    this.peer_connection.createOffer(offer_options)
      .then((rtc_sdp) => this._create_sdp_success(rtc_sdp))
      .catch((error) => this._create_sdp_failure(error, z.calling.rtc.SDP_TYPE.OFFER));
  }

  /**
   * Create the additional payload.
   * @private
   * @returns {Object} Additional payload
   */
  _create_additional_payload() {
    const payload = z.calling.CallMessageBuilder.create_payload(this.conversation_id, this.self_user_id, this.remote_user_id, this.remote_client_id);
    const additional_payload = Object.assign({remote_user: this.remote_user, sdp: this.local_sdp().sdp}, payload);

    return z.calling.CallMessageBuilder.create_payload_prop_sync(this.call_et.self_state, this.call_et.self_state.video_send(), false, additional_payload);
  }

  /**
   * Sets the local Session Description Protocol on the PeerConnection.
   * @private
   * @returns {undefined} No return value
   */
  _set_local_sdp() {
    this.sdp_state_changing(true);
    const local_sdp = this.local_sdp();
    this.logger.debug(`Setting local '${local_sdp.type}' SDP`, local_sdp);

    this.peer_connection.setLocalDescription(local_sdp)
      .then(() => {
        this.logger.info(`Setting local '${local_sdp.type}' SDP successful`, this.peer_connection.localDescription);
        this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SET);

        this.should_set_local_sdp(false);
        this.sdp_state_changing(false);
        this._set_send_sdp_timeout();
      })
      .catch((error) => this._set_sdp_failure(error, z.calling.enum.SDP_SOURCE.LOCAL, local_sdp.type));
  }

  /**
   * Sets the remote Session Description Protocol on the PeerConnection.
   * @private
   * @returns {undefined} No return value
   */
  _set_remote_sdp() {
    this.sdp_state_changing(false);
    const remote_sdp = this.remote_sdp();
    this.logger.debug(`Setting remote '${remote_sdp.type}' SDP\n${remote_sdp.sdp}`, remote_sdp);

    this.peer_connection.setRemoteDescription(remote_sdp)
      .then(() => {
        this.logger.info(`Setting remote '${remote_sdp.type}' SDP successful`, this.peer_connection.remoteDescription);
        this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.REMOTE_SDP_SET);

        this.should_set_remote_sdp(false);
        this.sdp_state_changing(false);
      })
      .catch((error) => this._set_sdp_failure(error, z.calling.enum.SDP_SOURCE.REMOTE, remote_sdp.type));
  }

  /**
   * Failed to set SDP.
   *
   * @private
   * @param {Error} error - Error that was thrown
   * @param {z.calling.enum.SDP_SOURCE} sdp_source - Source of SDP
   * @param {z.calling.rtc.SDP_TYPE} sdp_type - SDP type
   * @returns {undefined} No return value
   */
  _set_sdp_failure(error, sdp_source, sdp_type) {
    const {message, name} = error;

    const failed_local_sdp = sdp_source === z.calling.enum.SDP_SOURCE.LOCAL && !this.proper_local_sdp_state();
    const failed_remote_sdp = sdp_source === z.calling.enum.SDP_SOURCE.REMOTE && !this.proper_remote_sdp_state();

    if (failed_local_sdp || failed_remote_sdp) {
      this._solve_colliding_sdps(failed_local_sdp);
      return this.sdp_state_changing(false);
    }

    this.logger.error(`Setting ${sdp_source} '${sdp_type}' SDP failed: ${name} - ${message}`, error);

    const attributes = {cause: name, location: sdp_source, step: 'set_sdp', type: sdp_type};
    this.call_et.telemetry.track_event(z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes);

    this._remove_participant(z.calling.enum.TERMINATION_REASON.SDP_FAILED);
  }

  /**
   * Set the negotiation failed timeout.
   * @private
   * @returns {undefined} No return value
   */
  _set_negotiation_failed_timeout() {
    this.negotiation_timeout = window.setTimeout(() => {
      this.logger.info('Removing call participant on negotiation timeout');
      this._remove_participant(z.calling.enum.TERMINATION_REASON.RENEGOTIATION);
    }, Flow.CONFIG.NEGOTIATION_FAILED_TIMEOUT);
  }

  /**
   * Set the negotiation restart timeout.
   * @private
   * @returns {undefined} No return value
   */
  _set_negotiation_restart_timeout() {
    this.negotiation_timeout = window.setTimeout(() => {
      this.call_et.termination_reason = z.calling.enum.TERMINATION_REASON.CONNECTION_DROP;
      this.participant_et.is_connected(false);

      this.call_et.interrupted_participants.push(this.participant_et);
      if (this.negotiation_mode() === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT) {
        return this.restart_negotiation(z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART, false);
      }
    }, Flow.CONFIG.NEGOTIATION_RESTART_TIMEOUT);
  }

  /**
   * Set the SDP send timeout.
   * @private
   * @param {boolean} [initial_timeout=true] - Choose initial timeout length
   * @returns {undefined} No return value
   */
  _set_send_sdp_timeout(initial_timeout = true) {
    this.send_sdp_timeout = window.setTimeout(() => {
      this.logger.info('Sending local SDP on timeout');
      this.send_local_sdp(true);
    },
    initial_timeout ? Flow.CONFIG.SDP_SEND_TIMEOUT : Flow.CONFIG.SDP_SEND_TIMEOUT_RESET);
  }


  //##############################################################################
  // SDP state collision handling
  //##############################################################################

  /**
   * Solve colliding SDP states.
   *
   * @note If we receive a remote offer while we have a local offer, we need to check who needs to switch his SDP type.
   * @private
   * @param {boolean} [force_renegotiation=false] - Force local renegotiation to switch to
   * @returns {boolean} False if we locally needed to switch sides
   */
  _solve_colliding_states(force_renegotiation = false) {
    this.logger.debug(`Solving state collision: Self user ID '${this.self_user_id}', remote user ID '${this.remote_user_id}', force_renegotiation '${force_renegotiation}'`);

    const self_user_id_looses = this.self_user_id < this.remote_user_id;
    if (self_user_id_looses || force_renegotiation) {
      this.logger.warn(`We need to switch SDP state of flow with '${this.remote_user.name()}' to answer.`);

      this.restart_negotiation(z.calling.enum.SDP_NEGOTIATION_MODE.STATE_COLLISION, true);
      return force_renegotiation || false;
    }

    this.logger.warn(`Remote side '${this.remote_user.name()}' needs to switch SDP state flow to answer.`);
    return true;
  }

  /**
   * Solve colliding SDP states when setting SDP failed.
   * @private
   * @param {boolean} failed_local_sdp - Failed to set local SDP
   * @returns {undefined} No return value
   */
  _solve_colliding_sdps(failed_local_sdp) {
    const remote_sdp = this.remote_sdp();

    if (!this._solve_colliding_states(failed_local_sdp)) {
      this.remote_sdp(remote_sdp);
    }
  }


  //##############################################################################
  // Media stream handling
  //##############################################################################

  /**
   * Update the local MediaStream.
   * @param {z.media.MediaStreamInfo} media_stream_info - Object containing the required MediaStream information
   * @returns {Promise} Resolves when the updated MediaStream is used
   */
  update_media_stream(media_stream_info) {
    return this._replace_media_track(media_stream_info)
      .catch((error) => {
        const {message, type} = error;
        const expected_error_types = [
          z.calling.CallError.TYPE.NO_REPLACEABLE_TRACK,
          z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED,
        ];

        if (expected_error_types.includes(type)) {
          this.logger.debug(`Replacement of MediaStream and renegotiation necessary: ${message}`, error);
          return this._replace_media_stream(media_stream_info);
        }
        throw error;
      });
  }

  /**
   * Adds a local MediaStream to the PeerConnection.
   *
   * @private
   * @param {MediaStream} media_stream - MediaStream to add to the PeerConnection
   * @returns {undefined} No return value
   */
  _add_media_stream(media_stream) {
    if (media_stream) {
      if (media_stream.type === z.media.MediaType.AUDIO) {
        media_stream = this.audio.wrap_audio_input_stream(media_stream);
      }

      if (this.peer_connection.addTrack) {
        return media_stream.getTracks()
          .forEach((media_stream_track) => {
            this.peer_connection.addTrack(media_stream_track, media_stream);

            this.logger.debug(`Added local '${media_stream_track.kind}' MediaStreamTrack to PeerConnection`,
              {
                audio_tracks: media_stream.getAudioTracks(),
                stream: media_stream,
                video_tracks: media_stream.getVideoTracks(),
              });
          });
      }

      this.peer_connection.addStream(media_stream);
      this.logger.debug(`Added local '${media_stream.type}' MediaStream to PeerConnection`,
        {
          audio_tracks: media_stream.getAudioTracks(),
          stream: media_stream,
          video_tracks: media_stream.getVideoTracks(),
        });
    } else {
      throw new Error('Failed to add MediaStream: Provided MediaStream undefined');
    }
  }

  /**
   * Get RTC Sender of matching type.
   *
   * @private
   * @param {z.media.MediaType} media_type - Requested MediaType
   * @returns {RTCRtpSender} Matching RTC Rtp Sender
   */
  _get_rtc_sender(media_type) {
    for (const rtp_sender of this.peer_connection.getSenders()) {
      const {track: media_stream_track} = rtp_sender;

      if (media_stream_track.kind === media_type) {
        if (!rtp_sender.replaceTrack) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED);
        }

        return rtp_sender;
      }
    }

    throw new z.calling.CallError(z.calling.CallError.TYPE.NO_REPLACEABLE_TRACK);
  }

  /**
   * Replace the MediaStream attached to the PeerConnection.
   *
   * @private
   * @param {z.media.MediaStreamInfo} media_stream_info - Object containing the required MediaStream information
   * @returns {Promise} Resolves when MediaStream has been replaced
   */
  _replace_media_stream(media_stream_info) {
    const media_type = media_stream_info.type;

    return Promise.resolve()
      .then(() => this._remove_media_stream(this.media_stream()))
      .then(() => this._upgrade_media_stream(media_stream_info))
      .then((upgraded_media_stream_info) => {
        const {stream: media_stream} = upgraded_media_stream_info;
        upgraded_media_stream_info.replaced = true;

        this.logger.info(`Upgraded the MediaStream to update '${media_type}'`, media_stream);
        this.restart_negotiation(z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE, false, media_stream);
        return upgraded_media_stream_info;
      })
      .catch((error) => {
        this.logger.error(`Failed to replace local MediaStream: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Replace the a MediaStreamTrack attached to the MediaStream of the PeerConnection.
   *
   * @private
   * @param {z.media.MediaStreamInfo} media_stream_info - Object containing the required MediaStream information
   * @returns {Promise} Resolves when a MediaStreamTrack has been replaced
   */
  _replace_media_track(media_stream_info) {
    const {stream: media_stream, type: media_type} = media_stream_info;

    return Promise.resolve()
      .then(() => {
        if (this.peer_connection.getSenders) {
          return this._get_rtc_sender(media_type);
        }

        throw new z.calling.CallError(z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED);
      })
      .then((rtp_sender) => {
        const [media_stream_track] = media_stream.getTracks();

        rtp_sender.replaceTrack(media_stream_track);
      })
      .then(() => {
        this.logger.debug(`Replaced the '${media_type}' track`);
        return media_stream_info;
      })
      .catch((error) => {
        const {message, name, type} = error;

        if (![z.calling.CallError.TYPE.NO_REPLACEABLE_TRACK, z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED].includes(type)) {
          this.logger.error(`Failed to replace the '${media_type}' track: ${name} - ${message}`, error);
        }
        throw error;
      });
  }

  /**
   * Removes a MediaStreamTrack from the PeerConnection.
   *
   * @private
   * @param {string} track_id - ID of MediaStreamTrack
   * @param {z.media.MediaType} media_type - MediaType of MediaStreamTrack
   * @returns {undefined} No return value
   */
  _remove_media_stream_track(track_id, media_type) {
    for (const rtp_sender of this.peer_connection.getSenders()) {
      const {track: media_stream_track} = rtp_sender;

      if (media_stream_track.id === track_id) {
        this.peer_connection.removeTrack(rtp_sender);
        this.logger.debug(`Removed local '${media_type}' MediaStreamTrack from PeerConnection`);
        break;
      }
    }
  }

  /**
   * Remove all MediaStreamTracks of a MediaStream from the PeerConnection.
   *
   * @private
   * @param {MediaStream} media_stream - Local MediaStream to remove from the PeerConnection
   * @returns {undefined} No return value
   */
  _remove_media_stream_tracks(media_stream) {
    media_stream.getTracks()
      .forEach(({id: track_id, kind: media_type}) => this._remove_media_stream_track(track_id, media_type));
  }

  /**
   * Remove the MediaStream.
   *
   * @private
   * @param {MediaStream} media_stream - Local MediaStream to stop
   * @returns {undefined} No return value
   */
  _remove_media_stream(media_stream) {
    if (this.peer_connection) {
      const signaling_state_stable = this.peer_connection.signalingState === z.calling.rtc.SIGNALING_STATE.STABLE;

      if (signaling_state_stable && typeof this.peer_connection.removeTrack === 'function') {
        return this._remove_media_stream_tracks(media_stream);
      }

      const signaling_state_not_closed = this.peer_connection.signalingState !== z.calling.rtc.SIGNALING_STATE.CLOSED;
      if (signaling_state_not_closed && typeof this.peer_connection.removeStream === 'function') {
        this.peer_connection.removeStream(media_stream);
        this.logger.debug(`Removed local '${media_stream.type}' MediaStream from PeerConnection`,
          {
            audio_tracks: media_stream.getAudioTracks(),
            stream: media_stream,
            video_tracks: media_stream.getVideoTracks(),
          });
      }

    }
  }

  /**
   * Upgrade the local MediaStream with new MediaStreamTracks
   *
   * @private
   * @param {z.media.MediaStreamInfo} media_stream_info - MediaStreamInfo containing new MediaStreamTracks
   * @returns {z.media.MediaStreamInfo} New MediaStream to be used
   */
  _upgrade_media_stream(media_stream_info) {
    if (this.media_stream()) {
      const {stream: new_media_stream, type: media_type} = media_stream_info;

      z.media.MediaStreamHandler.get_media_tracks(this.media_stream(), media_type)
        .forEach((media_stream_track) => {
          this.media_stream().removeTrack(media_stream_track);
          media_stream_track.stop();
          this.logger.debug(`Stopping MediaStreamTrack of kind '${media_stream_track.kind}' successful`, media_stream_track);
        });

      const media_stream = this.media_stream().clone();

      z.media.MediaStreamHandler.get_media_tracks(new_media_stream, media_type)
        .forEach((media_stream_track) => media_stream.addTrack(media_stream_track));

      return new z.media.MediaStreamInfo(z.media.MediaStreamSource.LOCAL, 'self', media_stream);
    }

    return media_stream_info;
  }


  //##############################################################################
  // Reset
  //##############################################################################

  /**
   * Clear the timeouts.
   * @returns {undefined} No return value
   */
  clear_timeouts() {
    this._clear_negotiation_timeout();
    this._clear_send_sdp_timeout();
  }

  /**
   * Reset the flow.
   * @returns {undefined} No return value
    */
  reset_flow() {
    this.clear_timeouts();
    this.telemetry.reset_statistics();

    this.logger.debug(`Resetting flow with user '${this.remote_user.id}'`);
    this.remote_client_id = undefined;

    if (this.media_stream()) {
      this._remove_media_stream(this.media_stream());
    }

    this._close_data_channel();
    this._close_peer_connection();
    this._reset_signaling_states();
    this._reset_sdp();
    this.pc_initialized(false);
  }

  /**
   * Reset the SDP.
   * @private
   * @returns {undefined} No return value
   */
  _reset_sdp() {
    this.local_sdp(undefined);
    this.remote_sdp(undefined);
  }

  /**
   * Reset the signaling states.
   * @private
   * @returns {undefined} No return value
   */
  _reset_signaling_states() {
    this.connection_state(z.calling.rtc.ICE_CONNECTION_STATE.NEW);
    this.gathering_state(z.calling.rtc.ICE_GATHERING_STATE.NEW);
    this.signaling_state(z.calling.rtc.SIGNALING_STATE.NEW);
  }


  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Get full telemetry report for automation.
   * @returns {Object} Automation report
   */
  get_telemetry() {
    return this.telemetry.get_automation_report();
  }

  /**
   * Log flow status to console.
   * @returns {undefined} No return value
   */
  log_status() {
    this.telemetry.log_status(this.participant_et);
  }

  /**
   * Log flow setup step timings to console.
   * @returns {undefined} No return value
   */
  log_timings() {
    this.telemetry.log_timings();
  }

  /**
   * Report flow status to Raygun.
   * @returns {undefined} No return value
   */
  report_status() {
    this.telemetry.report_status();
  }

  /**
   * Report flow setup step timings to Raygun.
   * @returns {undefined} No return value
   */
  report_timings() {
    return this.telemetry.report_timings();
  }
};
