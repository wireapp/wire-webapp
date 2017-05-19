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

z.calling.entities.ECall = class ECall {
  static get CONFIG() {
    return {
      GROUP_CHECK_ACTIVITY_TIMEOUT: 2 * 60 * 1000,
      GROUP_CHECK_MAXIMUM_TIMEOUT: 90,
      GROUP_CHECK_MINIMUM_TIMEOUT: 60,
      STATE_TIMEOUT: 30 * 1000,
      TIMER_UPDATE_INTERVAL: 1000,
      TIMER_UPDATE_START: 100,
    };
  }

  /**
   * Construct a new e-call entity.
   * @param {z.entity.Conversation} conversation_et - Conversation the call takes place in
   * @param {z.entity.User} creating_user - Entity of user starting the call
   * @param {string} session_id - Session ID to identify call
   * @param {z.calling.v3.CallCenter} v3_call_center - V3 call center
   */
  constructor(conversation_et, creating_user, session_id, v3_call_center) {
    this.conversation_et = conversation_et;
    this.creating_user = creating_user;
    this.session_id = session_id;
    this.v3_call_center = v3_call_center;

    const {id: conversation_id, is_group} = conversation_et;
    const {calling_config, media_stream_handler, media_repository, self_state, telemetry, user_repository} = this.v3_call_center;

    this.logger = new z.util.Logger(`z.calling.entities.ECall (${conversation_id})`, z.config.LOGGER.OPTIONS);

    // IDs and references
    this.id = conversation_id;
    this.timings = undefined;

    this.media_repository = media_repository;
    this.config = calling_config;
    this.self_user = user_repository.self();
    this.self_state = self_state;
    this.telemetry = telemetry;

    // States
    this.call_timer_interval = undefined;
    this.timer_start = undefined;
    this.duration_time = ko.observable(0);
    this.data_channel_opened = false;
    this.group_check_timeout = undefined;
    this.termination_reason = undefined;

    this.is_connected = ko.observable(false);
    this.is_group = is_group;

    this.self_client_joined = ko.observable(false);
    this.self_user_joined = ko.observable(false);
    this.state = ko.observable(z.calling.enum.CALL_STATE.UNKNOWN);
    this.previous_state = undefined;

    this.participants = ko.observableArray([]);
    this.max_number_of_participants = 0;
    this.interrupted_participants = ko.observableArray([]);

    // Media
    this.local_media_stream = media_stream_handler.local_media_stream;
    this.local_media_type = media_stream_handler.local_media_type;
    this.remote_media_type = ko.observable(z.media.MediaType.NONE);

    // Statistics
    this._reset_timer();

    // Computed values
    this.is_declined = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.REJECTED);

    this.is_ongoing_on_another_client = ko.pureComputed(() => this.self_user_joined() && !this.self_client_joined());
    this.is_remote_screen_send = ko.pureComputed(() => this.remote_media_type() === z.media.MediaType.SCREEN);
    this.is_remote_video_send = ko.pureComputed(() => this.remote_media_type() === z.media.MediaType.VIDEO);

    this.network_interruption = ko.pureComputed(() => {
      if (this.is_connected() && !this.is_group()) {
        return this.interrupted_participants().length > 0;
      }

      return false;
    });

    this.participants_count = ko.pureComputed(() => this.get_number_of_participants(this.self_user_joined()));

    // Observable subscriptions
    this.is_connected.subscribe((is_connected) => {
      if (is_connected) {
        this.telemetry.track_event(z.tracking.EventName.CALLING.ESTABLISHED_CALL, this);
        this.timer_start = Date.now() - ECall.CONFIG.TIMER_UPDATE_START;

        this.call_timer_interval = window.setInterval(() => {
          const duration_in_seconds = Math.floor((Date.now() - this.timer_start) / 1000);

          this.duration_time(duration_in_seconds);
        },
        ECall.CONFIG.TIMER_UPDATE_INTERVAL);
      }
    });

    this.is_declined.subscribe((is_declined) => {
      if (is_declined) {
        this._stop_ring_tone(true);
      }
    });

    this.network_interruption.subscribe(function(is_interrupted) {
      if (is_interrupted) {
        return amplify.publish(z.event.WebApp.AUDIO.PLAY_IN_LOOP, z.audio.AudioType.NETWORK_INTERRUPTION);
      }
      amplify.publish(z.event.WebApp.AUDIO.STOP, z.audio.AudioType.NETWORK_INTERRUPTION);
    });

    this.participants_count.subscribe((users_in_call) => {
      this.max_number_of_participants = Math.max(users_in_call, this.max_number_of_participants);
    });

    this.self_client_joined.subscribe((is_joined) => {
      if (!is_joined) {
        this.is_connected(false);

        if (z.calling.enum.CALL_STATE_GROUP.IS_ENDING.includes(this.state())) {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.TALK_LATER);
        }

        if (this.termination_reason) {
          this.telemetry.track_duration(this);
        }

        this._reset_timer();
        this._reset_e_flows();
      }
    });

    this.state.subscribe((state) => {
      this.logger.info(`E-call state '${this.id}' changed to '${state}'`);

      this._clear_state_timeout();

      if (z.calling.enum.CALL_STATE_GROUP.STOP_RINGING.includes(state)) {
        this._on_state_stop_ringing();
      } else if (z.calling.enum.CALL_STATE_GROUP.IS_RINGING.includes(state)) {
        this._on_state_start_ringing(state === z.calling.enum.CALL_STATE.INCOMING);
      }

      if (state === z.calling.enum.CALL_STATE.CONNECTING) {
        const attributes = {direction: this.previous_state === z.calling.enum.CALL_STATE.OUTGOING ? z.calling.enum.CALL_STATE.OUTGOING : z.calling.enum.CALL_STATE.INCOMING};
        this.telemetry.track_event(z.tracking.EventName.CALLING.JOINED_CALL, this, attributes);
      }

      this.previous_state = state;
    });

    if (this.is_group()) {
      this.schedule_group_check();
    }

    this.conversation_et.call(this);
  }


  //##############################################################################
  // Call states
  //##############################################################################

  /**
   * Check if group call should continue.
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Call termination reason
   * @returns {undefined} No return value
   */
  check_activity(termination_reason) {
    if (!this.participants().length) {
      if (this.self_client_joined()) {
        this.leave_call(termination_reason);
      } else {
        this.deactivate_call();
      }
    }
  }

  /**
   * Deactivate the call.
   *
   * @param {ECallMessage} e_call_message_et - E-call message for deactivation
   * @param {z.calling.enum.TERMINATION_REASON} [termination_reason=z.calling.enum.TERMINATION_REASON.SELF_USER] - Call termination reason
   * @returns {undefined} No return value
   */
  deactivate_call(e_call_message_et, termination_reason = z.calling.enum.TERMINATION_REASON.SELF_USER) {
    const reason = z.calling.enum.CALL_STATE_GROUP.WAS_MISSED.includes(this.state()) ? z.calling.enum.TERMINATION_REASON.MISSED : z.calling.enum.TERMINATION_REASON.COMPLETED;

    this.termination_reason = termination_reason;
    this.v3_call_center.inject_deactivate_event(e_call_message_et, this.creating_user, reason);

    if (this.participants().length <= 1) {
      this.v3_call_center.delete_call(this.id);
    } else {
      this.v3_call_center.media_stream_handler.reset_media_stream();
    }
  }

  /**
   * Delete the call.
   * @returns {undefined} No return value
   */
  delete_call() {
    this.state(z.calling.enum.CALL_STATE.ENDED);
    this.reset_call();
  }

  /**
   * Join the call.
   * @returns {undefined} No return value
   */
  join_call() {
    this.set_self_state(true);

    if ([z.calling.enum.CALL_STATE.INCOMING, z.calling.enum.CALL_STATE.REJECTED].includes(this.state())) {
      this.state(z.calling.enum.CALL_STATE.CONNECTING);
    }

    if (this.is_group()) {
      const response = this.state() === z.calling.enum.CALL_STATE.CONNECTING;
      const additional_payload = this.v3_call_center.create_additional_payload(this.id);
      const prop_sync_payload = this.v3_call_center.create_payload_prop_sync(z.media.MediaType.AUDIO, false, additional_payload);

      this.send_e_call_event(z.calling.mapper.ECallMessageMapper.build_group_start(response, this.session_id, prop_sync_payload));
    } else {
      const [user_id] = this.conversation_et.participating_user_ids();

      this.v3_call_center.user_repository.get_user_by_id(user_id)
        .then((remote_user_et) => this.add_e_participant(remote_user_et));
    }
  }

  /**
   * Leave the call.
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Call termination reason
   * @returns {undefined} No return value
   */
  leave_call(termination_reason) {
    this._clear_timeouts();

    if (this.state() === z.calling.enum.CALL_STATE.ONGOING && !this.is_group()) {
      this.state(z.calling.enum.CALL_STATE.DISCONNECTING);
    }

    let e_call_message_et = undefined;
    if (this.is_connected()) {
      e_call_message_et = z.calling.mapper.ECallMessageMapper.build_hangup(false, this.session_id);
    } else {
      e_call_message_et = z.calling.mapper.ECallMessageMapper.build_cancel(false, this.session_id);
    }

    const event_promises = this.get_flows()
      .map(({remote_client_id, remote_user_id}) => {
        e_call_message_et.add_properties(this.v3_call_center.create_additional_payload(this.id, remote_user_id, remote_client_id));
        return this.send_e_call_event(e_call_message_et);
      });

    Promise.all(event_promises)
      .then(() => Promise.all(this.participants().map(({id}) => this.reset_e_participant(id))))
      .then(() => {
        const additional_payload = this.v3_call_center.create_additional_payload(this.id);

        if (this.is_group()) {
          e_call_message_et = z.calling.mapper.ECallMessageMapper.build_group_leave(false, this.session_id, additional_payload);
          this.send_e_call_event(e_call_message_et);
        } else {
          e_call_message_et.add_properties(additional_payload);
        }

        this.set_self_state(false, termination_reason);
        this.deactivate_call(e_call_message_et, termination_reason);
      });
  }

  /**
   * Reject the call.
   * @returns {undefined} No return value
   */
  reject_call() {
    const additional_payload = this.v3_call_center.create_additional_payload(this.id);

    this.state(z.calling.enum.CALL_STATE.REJECTED);

    if (this.is_remote_video_send()) {
      this.v3_call_center.media_stream_handler.reset_media_stream();
    }

    this.send_e_call_event(z.calling.mapper.ECallMessageMapper.build_reject(false, this.session_id, additional_payload));
  }

  /**
   * Schedule the check for group activity.
   * @returns {undefined} No return value
   */
  schedule_group_check() {
    this._clear_group_check_timeout();

    if (this.is_connected()) {
      this._set_send_group_check_timeout();
    } else {
      this._set_verify_group_check_timeout();
    }
  }

  /**
   * Set the self state.
   * @param {boolean} joined_state - Self joined state
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Call termination reason
   * @returns {undefined} No return value
   */
  set_self_state(joined_state, termination_reason) {
    if (termination_reason && !this.termination_reason) {
      this.termination_reason = termination_reason;
    }
    this.self_user_joined(joined_state);
    this.self_client_joined(joined_state);
  }

  /**
   * Toggle media of this call.
   * @param {z.media.MediaType} media_type - MediaType to toggle
   * @returns {Promise} Resolves when state has been toggled
   */
  toggle_media(media_type) {
    const e_call_event_promises = this.get_flows()
      .map(({remote_client_id, remote_user_id}) => {
        const additional_payload = this.v3_call_center.create_additional_payload(this.id, remote_user_id, remote_client_id);
        const prop_sync_payload = this.v3_call_center.create_payload_prop_sync(media_type, true, additional_payload);

        return this.send_e_call_event(z.calling.mapper.ECallMessageMapper.build_prop_sync(false, this.session_id, prop_sync_payload));
      });

    return Promise.all(e_call_event_promises);
  }

  /**
   * Clear the group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clear_group_check_timeout() {
    if (this.check_group_check_timeout) {
      window.clearTimeout(this.check_group_check_timeout);
      this.check_group_check_timeout = undefined;
    }
  }

  /**
   * Clear all timeouts.
   * @private
   * @returns {undefined} No return value
   */
  _clear_timeouts() {
    this.get_flows().map((e_flow_et) => e_flow_et.clear_timeouts());
    this._clear_group_check_timeout();
    this._clear_state_timeout();
  }

  /**
   * Set the outgoing group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _set_send_group_check_timeout() {
    const maximum_timeout = ECall.CONFIG.GROUP_CHECK_MAXIMUM_TIMEOUT;
    const minimum_timeout = ECall.CONFIG.GROUP_CHECK_MINIMUM_TIMEOUT;
    const timeout_in_milliseconds = 1000 * z.util.NumberUtil.get_random_number(minimum_timeout, maximum_timeout);

    this.group_check_timeout = window.setTimeout(() => {
      const additional_payload = this.v3_call_center.create_additional_payload(this.id);
      this.send_e_call_event(z.calling.mapper.ECallMessageMapper.build_group_check(true, this.session_id, additional_payload));
    },
    timeout_in_milliseconds);
  }

  /**
   * Set the incoming group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _set_verify_group_check_timeout() {
    this.group_check_timeout = window.setTimeout(() => {
      // @todo Create expected deactivation message
      this.deactivate_call();
    },
    ECall.CONFIG.GROUP_CHECK_ACTIVITY_TIMEOUT);
  }


  //##############################################################################
  // Call states
  //##############################################################################

  /**
   * Confirm an incoming message.
   * @param {ECallMessage} incoming_e_call_message_et - Incoming e-call message to be confirmed
   * @returns {undefined} No return value
   */
  confirm_message(incoming_e_call_message_et) {
    const {client_id, type, user_id} = incoming_e_call_message_et;

    const additional_payload = this.v3_call_center.create_additional_payload(this.id, user_id, client_id);
    let e_call_message_et;

    switch (type) {
      case z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP: {
        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_hangup(true, this.session_id, additional_payload);
        break;
      }

      case z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC: {
        const prop_sync_payload = this.v3_call_center.create_payload_prop_sync(z.media.MediaType.VIDEO, false, additional_payload);

        e_call_message_et = z.calling.mapper.ECallMessageMapper.build_prop_sync(true, this.session_id, prop_sync_payload);
        break;
      }

      default: {
        return this.logger.error(`Tried to confirm e-call event of wrong type '${type}'`, e_call_message_et);
      }
    }

    this.send_e_call_event(e_call_message_et);
  }

  /**
   * Send e-call message.
   * @param {ECallMessage} e_call_message_et - E-call message to be send
   * @returns {Promise} Resolves when the event has been send
   */
  send_e_call_event(e_call_message_et) {
    return this.v3_call_center.send_e_call_event(this.conversation_et, e_call_message_et);
  }

  /**
   * Set remote version of call
   * @param {ECallMessage} e_call_message_et - E-call message to get remote version from
   * @returns {undefined} No return value
   */
  set_remote_version(e_call_message_et) {
    const {sdp: rtc_sdp} = e_call_message_et;

    if (rtc_sdp) {
      this.telemetry.set_remote_version(z.calling.mapper.SDPMapper.get_tool_version(rtc_sdp));
    }
  }

  /**
   * Clear the state timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clear_state_timeout() {
    if (this.state_timeout) {
      window.clearTimeout(this.state_timeout);
      this.state_timeout = undefined;
    }
  }

  /**
   * Start ringing sound.
   *
   * @private
   * @param {boolean} is_incoming - Call is incoming
   * @returns {undefined} No return value
   */
  _on_state_start_ringing(is_incoming) {
    this._play_ring_tone(is_incoming);
    this._set_state_timeout(is_incoming);
  }

  /**
   * Stop ringing sound.
   * @private
   * @returns {undefined} No return value
   */
  _on_state_stop_ringing() {
    if (z.calling.enum.CALL_STATE_GROUP.IS_RINGING.includes(this.previous_state)) {
      this._stop_ring_tone(this.previous_state === z.calling.enum.CALL_STATE.INCOMING);
    }
  }

  /**
   * Play the ring tone.
   *
   * @private
   * @param {boolean} is_incoming - Call is incoming
   * @returns {undefined} No return value
   */
  _play_ring_tone(is_incoming) {
    const audio_id = is_incoming ? z.audio.AudioType.INCOMING_CALL : z.audio.AudioType.OUTGOING_CALL;

    amplify.publish(z.event.WebApp.AUDIO.PLAY_IN_LOOP, audio_id);
  }

  /**
   * Set the state timeout.
   *
   * @private
   * @param {boolean} is_incoming - Call is incoming
   * @returns {undefined} No return value
   */
  _set_state_timeout(is_incoming) {
    this.state_timeout = window.setTimeout(() => {
      this._stop_ring_tone(is_incoming);

      if (is_incoming) {
        if (this.is_group()) {
          return this.state(z.calling.enum.CALL_STATE.REJECTED);
        }

        return amplify.publish(z.event.WebApp.CALL.STATE.DELETE, this.id);
      }

      return amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.id, z.calling.enum.TERMINATION_REASON.TIMEOUT);
    },
    ECall.CONFIG.STATE_TIMEOUT);
  }

  /**
   * Stop the ring tone.
   *
   * @private
   * @param {boolean} is_incoming - Call is incoming
   * @returns {undefined} No return value
   */
  _stop_ring_tone(is_incoming) {
    const audio_id = is_incoming ? z.audio.AudioType.INCOMING_CALL : z.audio.AudioType.OUTGOING_CALL;

    amplify.publish(z.event.WebApp.AUDIO.STOP, audio_id);
  }

  /**
   * Update the remote participant state.
   * @private
   * @returns {undefined} No return value
   */
  _update_remote_state() {
    let media_type_changed = false;

    this.participants().forEach(({state}) => {
      if (state.screen_send()) {
        this.remote_media_type(z.media.MediaType.SCREEN);
        media_type_changed = true;
      } else if (state.video_send()) {
        this.remote_media_type(z.media.MediaType.VIDEO);
        media_type_changed = true;
      }
    });

    if (!media_type_changed) {
      this.remote_media_type(z.media.MediaType.AUDIO);
    }
  }

  /**
   * Update the state on participant change.
   *
   * @private
   * @param {EParticipant} e_participant_et - Updated participant
   * @param {boolean} negotiate - Should negotiation be started immediately
   * @returns {EParticipant} Changed e-participant
   */
  _update_state(e_participant_et, negotiate) {
    this._update_remote_state();

    if (negotiate) {
      e_participant_et.start_negotiation();
    }

    return e_participant_et;
  }


  //##############################################################################
  // Participants
  //##############################################################################

  /**
   * Add an e-participant to the e-call.
   *
   * @param {z.entities.User} user_et - User entity to be added to the e-call
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   * @param {boolean} [negotiate=true] - Should negotiation be started immediately
   * @returns {Promise} Resolves with added participant
   */
  add_e_participant(user_et, e_call_message_et, negotiate = true) {
    const {id: user_id} = user_et;

    return this.get_e_participant_by_id(user_id)
      .then(() => this.update_e_participant(user_id, e_call_message_et, negotiate))
      .catch((error) => {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        const e_participant_et = new z.calling.entities.EParticipant(this, user_et, this.timings, e_call_message_et);

        this.logger.info(`Adding e-call participant '${user_et.name()}'`, e_participant_et);
        this.participants.push(e_participant_et);

        return e_participant_et.update_state(e_call_message_et)
          .catch(function(_error) {
            if (_error.type !== z.calling.v3.CallError.TYPE.SDP_STATE_COLLISION) {
              throw error;
            }

            negotiate = false;
          })
          .then(() => this._update_state(e_participant_et, negotiate));
      });
  }

  /**
   * Remove an e-participant from the call.
   *
   * @param {string} user_id - ID of user to be removed from the e-call
   * @param {string} client_id - ID of client that requested the removal from the e-call
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Call termination reason
   * @returns {Promise} Resolves with the e-call entity
   */
  delete_e_participant(user_id, client_id, termination_reason) {
    return this.get_e_participant_by_id(user_id)
      .then((e_participant_et) => {
        if (client_id) {
          e_participant_et.verify_client_id(client_id);
        }

        e_participant_et.reset_participant();
        this.interrupted_participants.remove(e_participant_et);
        this.participants.remove(e_participant_et);

        this._update_remote_state();
        this.v3_call_center.media_element_handler.remove_media_element(user_id);

        switch (termination_reason) {
          case z.calling.enum.TERMINATION_REASON.OTHER_USER: {
            amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.TALK_LATER);
            break;
          }

          case z.calling.enum.TERMINATION_REASON.CONNECTION_DROP:
          case z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE: {
            amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP);
            break;
          }

          default: {
            break;
          }
        }

        this.logger.info(`Removed e-call participant '${e_participant_et.user.name()}'`);
        return this;
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        return this;
      });
  }

  /**
   * Get the number of participants in the call.
   * @param {boolean} [add_self_user=false] - Add self user to count
   * @returns {number} Number of participants in call
   */
  get_number_of_participants(add_self_user = false) {
    if (add_self_user) {
      return this.participants().length + 1;
    }

    return this.participants().length;
  }

  /**
   * Get a call participant by his id.
   * @param {string} user_id - User ID of participant to be returned
   * @returns {Promise} Resolves with the e-call participant that matches given user ID
   */
  get_e_participant_by_id(user_id) {
    for (const e_participant_et of this.participants()) {
      if (e_participant_et.id === user_id) {
        return Promise.resolve(e_participant_et);
      }
    }

    return Promise.reject(new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.NOT_FOUND, 'No participant for given user ID found'));
  }

  /**
   * Remove an e-participant from the call.
   *
   * @param {string} user_id - ID of user to be removed from the e-call
   * @param {string} client_id - ID of client that requested the removal from the e-call
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Call termination reason
   * @returns {Promise} Resolves with the e-call entity
   */
  reset_e_participant(user_id) {
    return this.get_e_participant_by_id(user_id)
      .then((e_participant_et) => {
        e_participant_et.reset_participant();
        this.interrupted_participants.remove(e_participant_et);
        this.participants.remove(e_participant_et);

        this._update_remote_state();
        this.v3_call_center.media_element_handler.remove_media_element(user_id);
      });
  }

  /**
   * Update e-call participant with e-call message.
   *
   * @param {string} user_id - ID of participant to update
   * @param {ECallMessage} e_call_message_et - E-call message to update user with
   * @param {boolean} [negotiate=false] - Should negotiation be started
   * @returns {Promise} Resolves when participant was updated
   */
  update_e_participant(user_id, e_call_message_et, negotiate = false) {
    return this.get_e_participant_by_id(user_id)
      .then((e_participant_et) => {
        if (e_call_message_et) {
          const {client_id} = e_call_message_et;

          if (client_id) {
            e_participant_et.verify_client_id(client_id);
          }

          this.logger.info(`Updating e-call participant '${e_participant_et.user.name()}'`, e_call_message_et);
          return e_participant_et.update_state(e_call_message_et);
        }

        return e_participant_et;
      })
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.SDP_STATE_COLLISION) {
          throw error;
        }

        negotiate = false;
      })
      .then((e_participant_et) => this._update_state(e_participant_et, negotiate))
      .catch(function(error) {
        if (error.type !== z.calling.v3.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Verify e-call message belongs to e-call by session id.
   *
   * @private
   * @param {ECallMessage} e_call_message_et - E-call message entity
   * @returns {Promise} Resolves with the e-call entity if verification passed
   */
  verify_session_id(e_call_message_et) {
    const {user_id, session_id} = e_call_message_et;

    if (session_id === this.session_id) {
      return Promise.resolve(this);
    }

    return this.get_e_participant_by_id(user_id)
      .then(({session_id: participant_session_id}) => {
        if (session_id === participant_session_id) {
          return this;
        }

        throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_SENDER, 'Session IDs not matching');
      });
  }


  //##############################################################################
  // Misc
  //##############################################################################

  /**
   * Get all flows of the call.
   * @returns {Array<z.calling.Flow>} Array of flows
   */
  get_flows() {
    return this.participants()
      .filter((e_participant_et) => e_participant_et.e_flow_et)
      .map((e_participant_et) => e_participant_et.e_flow_et);
  }

  /**
   * Get full flow telemetry report of the call.
   * @returns {Array<Object>} Array of flow telemetry reports for calling service automation
   */
  get_flow_telemetry() {
    return this.get_flows().map((e_flow_et) => e_flow_et.get_telemetry());
  }

  /**
   * Initiate the call telemetry.
   * @param {boolean} [video_send=false] - Call with video
   * @returns {undefined} No return value
   */
  initiate_telemetry(video_send = false) {
    this.telemetry.set_media_type(video_send);
    this.timings = new z.telemetry.calling.CallSetupTimings(this.id);
  }

  /**
   * Calculates the panning (from left to right) to position a user in a group call.
   *
   * @private
   * @param {number} index - Index of a user in a sorted array
   * @param {number} total - Number of users
   * @returns {number} Panning in the range of -1 to 1 with -1 on the left
   */
  _calculate_panning(index, total) {
    if (total === 1) {
      return 0.0;
    }

    const position = -(total - 1.0) / (total + 1.0);
    const delta = (-2.0 * position) / (total - 1.0);

    return position + (delta * index);
  }

  /**
   * Sort the call participants by their audio panning.
   *
   * @note The idea is to calculate Jenkins' one-at-a-time hash (JOAAT) for each participant and then
   *  sort all participants in an array by their JOAAT hash. After that the array index of each user
   *  is used to allocate the position with the return value of this function.
   *
   * @returns {undefined} No return value
   */
  _sort_participants_by_panning() {
    if (this.participants().length >= 2) {
      this.participants
        .sort((participant_a, participant_b) => participant_a.user.joaat_hash - participant_b.user.joaat_hash)
        .forEach((e_participant_et, index) => {
          const panning = this._calculate_panning(index, this.participants().length);

          this.logger.debug(`Panning for '${e_participant_et.user.name()}' recalculated to '${panning}'`);
          e_participant_et.panning(panning);
        });

      const panning_order = this.participants()
        .map(({user}) => user.name())
        .join(', ');

      this.logger.info(`New panning order: ${panning_order}`);
    }
  }


  //##############################################################################
  // Reset
  //##############################################################################

  /**
   * Reset the call states.
   * @private
   * @returns {undefined} No return value
   */
  reset_call() {
    this.set_self_state(false);
    this.is_connected(false);
    this.session_id = undefined;
    this.termination_reason = undefined;
    amplify.publish(z.event.WebApp.AUDIO.STOP, z.audio.AudioType.NETWORK_INTERRUPTION);
  }

  /**
   * Reset the call timers.
   * @private
   * @returns {undefined} No return value
   */
  _reset_timer() {
    if (this.call_timer_interval) {
      window.clearInterval(this.call_timer_interval);
      this.timer_start = undefined;
    }
    this.duration_time(0);
  }

  /**
   * Reset all flows of the call.
   * @private
   * @returns {undefined} No return value
   */
  _reset_e_flows() {
    this.get_flows().forEach((e_flow_et) => e_flow_et.reset_flow());
  }


  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Log flow status to console.
   * @returns {undefined} No return value
   */
  log_status() {
    this.get_flows().forEach((e_flow_et) => e_flow_et.log_status());
  }

  /**
   * Log flow setup step timings to console.
   * @returns {undefined} No return value
   */
  log_timings() {
    this.get_flows().forEach((e_flow_et) => e_flow_et.log_timings());
  }
};
