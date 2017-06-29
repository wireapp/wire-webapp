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

z.calling.entities.Call = class Call {
  static get CONFIG() {
    return {
      GROUP_CHECK_ACTIVITY_TIMEOUT: 2 * 60,
      GROUP_CHECK_MAXIMUM_TIMEOUT: 90,
      GROUP_CHECK_MINIMUM_TIMEOUT: 60,
      STATE_TIMEOUT: 30 * 1000,
      TIMER_UPDATE_INTERVAL: 1000,
      TIMER_UPDATE_START: 100,
    };
  }

  /**
   * Construct a new call entity.
   *
   * @class z.calling.entities.Call
   * @param {z.entity.Conversation} conversation_et - Conversation the call takes place in
   * @param {z.entity.User} creating_user - Entity of user starting the call
   * @param {string} session_id - Session ID to identify call
   * @param {z.calling.CallingRepository} calling_repository - Calling Repository
   */
  constructor(conversation_et, creating_user, session_id, calling_repository) {
    this.conversation_et = conversation_et;
    this.creating_user = creating_user;
    this.session_id = session_id;
    this.calling_repository = calling_repository;

    const {id: conversation_id, is_group} = conversation_et;
    const {media_stream_handler, media_repository, self_state, telemetry, user_repository} = this.calling_repository;

    this.logger = new z.util.Logger(`z.calling.entities.Call (${conversation_id})`, z.config.LOGGER.OPTIONS);

    // IDs and references
    this.id = conversation_id;
    this.timings = undefined;

    this.media_repository = media_repository;
    this.self_user = user_repository.self();
    this.self_state = self_state;
    this.telemetry = telemetry;

    // States
    this.call_timer_interval = undefined;
    this.timer_start = undefined;
    this.direction = undefined;
    this.duration_time = ko.observable(0);
    this.group_check_timeout = undefined;
    this.termination_reason = undefined;

    this.is_connected = ko.observable(false);
    this.is_group = is_group();

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
      if (this.is_connected() && !this.is_group) {
        return this.interrupted_participants().length > 0;
      }

      return false;
    });

    this.participants_count = ko.pureComputed(() => this.get_number_of_participants(this.self_user_joined()));

    // Observable subscriptions
    this.was_connected = false;
    this.is_connected.subscribe((is_connected) => {
      if (is_connected) {
        this.was_connected = true;
        if (this.is_group) {
          this.schedule_group_check();
        }

        const attributes = {direction: this.direction};
        this.telemetry.track_event(z.tracking.EventName.CALLING.ESTABLISHED_CALL, this, attributes);
        this.timer_start = Date.now() - Call.CONFIG.TIMER_UPDATE_START;

        this.call_timer_interval = window.setInterval(() => {
          const duration_in_seconds = Math.floor((Date.now() - this.timer_start) / 1000);

          this.duration_time(duration_in_seconds);
        }, Call.CONFIG.TIMER_UPDATE_INTERVAL);
      }
    });

    this.is_declined.subscribe((is_declined) => {
      if (is_declined) {
        this._stop_ring_tone(true);
      }
    });

    this.network_interruption.subscribe((is_interrupted) => {
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
        this._reset_flows();
      }
    });

    this.state.subscribe((state) => {
      this.logger.info(`Call state '${this.id}' changed to '${state}'`);

      this._clear_state_timeout();

      if (z.calling.enum.CALL_STATE_GROUP.STOP_RINGING.includes(state)) {
        this._on_state_stop_ringing();
      } else if (z.calling.enum.CALL_STATE_GROUP.IS_RINGING.includes(state)) {
        this._on_state_start_ringing(state === z.calling.enum.CALL_STATE.INCOMING);
      }

      if (state === z.calling.enum.CALL_STATE.CONNECTING) {
        const attributes = {direction: this.direction};
        this.telemetry.track_event(z.tracking.EventName.CALLING.JOINED_CALL, this, attributes);
      }

      this.previous_state = state;
    });

    if (this.is_group) {
      this.schedule_group_check();
    }

    this.conversation_et.call(this);
  }


  //##############################################################################
  // Call states
  //##############################################################################

  /**
   * Deactivate the call.
   *
   * @param {CallMessage} call_message_et - Call message for deactivation
   * @param {z.calling.enum.TERMINATION_REASON} [termination_reason=z.calling.enum.TERMINATION_REASON.SELF_USER] - Call termination reason
   * @returns {undefined} No return value
   */
  deactivate_call(call_message_et, termination_reason = z.calling.enum.TERMINATION_REASON.SELF_USER) {
    const reason = !this.was_connected ? z.calling.enum.TERMINATION_REASON.MISSED : z.calling.enum.TERMINATION_REASON.COMPLETED;

    this.termination_reason = termination_reason;
    this.calling_repository.inject_deactivate_event(call_message_et, z.event.EventRepository.SOURCE.WEB_SOCKET, this.creating_user, reason);

    if (this.participants().length <= 1) {
      return this.calling_repository.delete_call(this.id);
    }
    this.calling_repository.media_stream_handler.reset_media_stream();
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

    if (z.calling.enum.CALL_STATE_GROUP.CAN_CONNECT.includes(this.state())) {
      this.state(z.calling.enum.CALL_STATE.CONNECTING);
    }

    if (this.is_group) {
      const response = this.state() !== z.calling.enum.CALL_STATE.OUTGOING;
      const additional_payload = z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id);
      const prop_sync_payload = z.calling.CallMessageBuilder.create_payload_prop_sync(this.self_state, z.media.MediaType.AUDIO, false, additional_payload);

      this.send_call_message(z.calling.CallMessageBuilder.build_group_start(response, this.session_id, prop_sync_payload));
    } else {
      const [user_id] = this.conversation_et.participating_user_ids();

      this.calling_repository.user_repository.get_user_by_id(user_id)
        .then((remote_user_et) => this.add_participant(remote_user_et));
    }
  }

  /**
   * Leave the call.
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Call termination reason
   * @returns {undefined} No return value
   */
  leave_call(termination_reason) {
    this._clear_timeouts();

    if (this.state() === z.calling.enum.CALL_STATE.ONGOING && !this.is_group) {
      this.state(z.calling.enum.CALL_STATE.DISCONNECTING);
    }

    let call_message_et = undefined;
    if (this.is_connected()) {
      call_message_et = z.calling.CallMessageBuilder.build_hangup(false, this.session_id);
    } else {
      call_message_et = z.calling.CallMessageBuilder.build_cancel(false, this.session_id);
    }

    const event_promises = this.get_flows()
      .map(({remote_client_id, remote_user_id}) => {
        call_message_et.add_properties(z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id, remote_user_id, remote_client_id));
        return this.send_call_message(call_message_et);
      });

    Promise.all(event_promises)
      .then(() => Promise.all(this.participants().map(({id}) => this.reset_participant(id))))
      .then(() => {
        const additional_payload = z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id);

        if (this.is_group) {
          call_message_et = z.calling.CallMessageBuilder.build_group_leave(false, this.session_id, additional_payload);
          this.send_call_message(call_message_et);
        } else {
          call_message_et.add_properties(additional_payload);
        }

        this.set_self_state(false, termination_reason);
        this.deactivate_call(call_message_et, termination_reason);
      });
  }

  /**
   * Check if group call should continue after participant left.
   * @param {CallMessage} call_message_et - Last member leaving call
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Reason for call participant to leave
   * @returns {undefined} No return value
   */
  participant_left(call_message_et, termination_reason) {
    if (!this.participants().length) {
      if (this.self_client_joined()) {
        return this.leave_call(termination_reason);
      }

      this.deactivate_call(call_message_et, termination_reason);
    }
  }

  /**
   * Reject the call.
   * @returns {undefined} No return value
   */
  reject_call() {
    const additional_payload = z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id);

    this.state(z.calling.enum.CALL_STATE.REJECTED);

    if (this.is_remote_video_send()) {
      this.calling_repository.media_stream_handler.reset_media_stream();
    }

    this.send_call_message(z.calling.CallMessageBuilder.build_reject(false, this.session_id, additional_payload));
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
    const call_event_promises = this.get_flows()
      .map(({remote_client_id, remote_user_id}) => {
        const additional_payload = z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id, remote_user_id, remote_client_id);
        const prop_sync_payload = z.calling.CallMessageBuilder.create_payload_prop_sync(this.self_state, media_type, true, additional_payload);

        return this.send_call_message(z.calling.CallMessageBuilder.build_prop_sync(false, this.session_id, prop_sync_payload));
      });

    return Promise.all(call_event_promises);
  }

  /**
   * Clear the group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clear_group_check_timeout() {
    if (this.group_check_timeout) {
      window.clearTimeout(this.group_check_timeout);
      this.group_check_timeout = undefined;
    }
  }

  /**
   * Clear all timeouts.
   * @private
   * @returns {undefined} No return value
   */
  _clear_timeouts() {
    this.get_flows().map((flow_et) => flow_et.clear_timeouts());
    this._clear_group_check_timeout();
    this._clear_state_timeout();
  }

  /**
   * Set the outgoing group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _set_send_group_check_timeout() {
    const maximum_timeout = Call.CONFIG.GROUP_CHECK_MAXIMUM_TIMEOUT;
    const minimum_timeout = Call.CONFIG.GROUP_CHECK_MINIMUM_TIMEOUT;
    const timeout_in_seconds = z.util.NumberUtil.get_random_number(minimum_timeout, maximum_timeout);

    this.logger.debug(`Set sending group check after random timeout of '${timeout_in_seconds}s'`);
    this.group_check_timeout = window.setTimeout(() => {
      if (this.participants().length) {
        this.logger.debug(`Sending group check after random timeout of '${timeout_in_seconds}s'`);
        const additional_payload = z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id);

        this.send_call_message(z.calling.CallMessageBuilder.build_group_check(true, this.session_id, additional_payload));
        return this.schedule_group_check();
      }

      this.leave_call(z.calling.enum.TERMINATION_REASON.OTHER_USER);
    }, timeout_in_seconds * 1000);
  }

  /**
   * Set the incoming group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _set_verify_group_check_timeout() {
    const timeout_in_seconds = Call.CONFIG.GROUP_CHECK_ACTIVITY_TIMEOUT;

    this.logger.debug(`Set verifying group check after '${timeout_in_seconds}s'`);
    this.group_check_timeout = window.setTimeout(() => {
      this.logger.debug('Removing on group check timeout');
      const additional_payload = z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id, this.creating_user.id);
      const call_message_et = z.calling.CallMessageBuilder.build_group_leave(false, this.session_id, additional_payload);

      this.deactivate_call(call_message_et, z.calling.enum.TERMINATION_REASON.MISSED);
    }, timeout_in_seconds * 1000);
  }


  //##############################################################################
  // Call states
  //##############################################################################

  /**
   * Confirm an incoming message.
   * @param {CallMessage} incoming_call_message_et - Incoming call message to be confirmed
   * @returns {Promise} Resolves when message was confirmed
   */
  confirm_message(incoming_call_message_et) {
    const {client_id, type, user_id} = incoming_call_message_et;

    const additional_payload = z.calling.CallMessageBuilder.create_payload(this.id, this.self_user.id, user_id, client_id);
    let call_message_et;

    switch (type) {
      case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP: {
        call_message_et = z.calling.CallMessageBuilder.build_hangup(true, this.session_id, additional_payload);
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC: {
        const prop_sync_payload = z.calling.CallMessageBuilder.create_payload_prop_sync(this.self_state, z.media.MediaType.VIDEO, false, additional_payload);

        call_message_et = z.calling.CallMessageBuilder.build_prop_sync(true, this.session_id, prop_sync_payload);
        break;
      }

      default: {
        this.logger.error(`Tried to confirm call event of wrong type '${type}'`, call_message_et);
        return Promise.resolve();
      }
    }

    return this.send_call_message(call_message_et);
  }

  /**
   * Send call message.
   * @param {CallMessage} call_message_et - Call message to be send
   * @returns {Promise} Resolves when the event has been send
   */
  send_call_message(call_message_et) {
    return this.calling_repository.send_call_message(this.conversation_et, call_message_et);
  }

  /**
   * Set remote version of call
   * @param {CallMessage} call_message_et - Call message to get remote version from
   * @returns {undefined} No return value
   */
  set_remote_version(call_message_et) {
    const {sdp: rtc_sdp} = call_message_et;

    if (rtc_sdp) {
      this.telemetry.set_remote_version(z.calling.SDPMapper.get_tool_version(rtc_sdp));
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
        if (this.is_group) {
          return this.state(z.calling.enum.CALL_STATE.REJECTED);
        }

        return amplify.publish(z.event.WebApp.CALL.STATE.DELETE, this.id);
      }

      return amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.id, z.calling.enum.TERMINATION_REASON.TIMEOUT);
    },
    Call.CONFIG.STATE_TIMEOUT);
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
   * @param {Participant} participant_et - Updated participant
   * @param {boolean} negotiate - Should negotiation be started immediately
   * @returns {Participant} Changed participant
   */
  _update_state(participant_et, negotiate) {
    this._update_remote_state();

    if (negotiate) {
      participant_et.start_negotiation();
    }

    return participant_et;
  }


  //##############################################################################
  // Participants
  //##############################################################################

  /**
   * Add an participant to the call.
   *
   * @param {z.entities.User} user_et - User entity to be added to the call
   * @param {CallMessage} call_message_et - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {boolean} [negotiate=true] - Should negotiation be started immediately
   * @returns {Promise} Resolves with added participant
   */
  add_participant(user_et, call_message_et, negotiate = true) {
    const {id: user_id} = user_et;

    return this.get_participant_by_id(user_id)
      .then(() => this.update_participant(user_id, call_message_et, negotiate))
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        const participant_et = new z.calling.entities.Participant(this, user_et, this.timings, call_message_et);

        this.logger.info(`Adding call participant '${user_et.name()}'`, participant_et);
        this.participants.push(participant_et);

        return participant_et.update_state(call_message_et)
          .catch((_error) => {
            if (_error.type !== z.calling.CallError.TYPE.SDP_STATE_COLLISION) {
              throw error;
            }

            negotiate = false;
          })
          .then(() => this._update_state(participant_et, negotiate));
      });
  }

  /**
   * Remove an participant from the call.
   *
   * @param {string} user_id - ID of user to be removed from the call
   * @param {string} client_id - ID of client that requested the removal from the call
   * @param {z.calling.enum.TERMINATION_REASON} termination_reason - Call termination reason
   * @returns {Promise} Resolves with the call entity
   */
  delete_participant(user_id, client_id, termination_reason) {
    return this.get_participant_by_id(user_id)
      .then((participant_et) => {
        if (client_id) {
          participant_et.verify_client_id(client_id);
        }

        participant_et.reset_participant();
        this.interrupted_participants.remove(participant_et);
        this.participants.remove(participant_et);

        this._update_remote_state();
        this.calling_repository.media_element_handler.remove_media_element(user_id);

        if (this.self_client_joined()) {
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
        }

        this.logger.info(`Removed call participant '${participant_et.user.name()}'`);
        return this;
      })
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
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
   * @returns {Promise} Resolves with the call participant that matches given user ID
   */
  get_participant_by_id(user_id) {
    for (const participant_et of this.participants()) {
      if (participant_et.id === user_id) {
        return Promise.resolve(participant_et);
      }
    }

    return Promise.reject(new z.calling.CallError(z.calling.CallError.TYPE.NOT_FOUND, 'No participant for given user ID found'));
  }

  /**
   * Remove an participant from the call.
   * @param {string} user_id - ID of user to be removed from the call
   * @returns {Promise} Resolves with the call entity
   */
  reset_participant(user_id) {
    return this.get_participant_by_id(user_id)
      .then((participant_et) => {
        participant_et.reset_participant();
        this.interrupted_participants.remove(participant_et);

        this._update_remote_state();
        this.calling_repository.media_element_handler.remove_media_element(user_id);
      });
  }

  /**
   * Update call participant with call message.
   *
   * @param {string} user_id - ID of participant to update
   * @param {CallMessage} call_message_et - Call message to update user with
   * @param {boolean} [negotiate=false] - Should negotiation be started
   * @returns {Promise} Resolves when participant was updated
   */
  update_participant(user_id, call_message_et, negotiate = false) {
    return this.get_participant_by_id(user_id)
      .then((participant_et) => {
        if (call_message_et) {
          const {client_id} = call_message_et;

          if (client_id) {
            participant_et.verify_client_id(client_id);
          }

          this.logger.info(`Updating call participant '${participant_et.user.name()}'`, call_message_et);
          return participant_et.update_state(call_message_et);
        }

        return participant_et;
      })
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.SDP_STATE_COLLISION) {
          throw error;
        }

        negotiate = false;
      })
      .then((participant_et) => this._update_state(participant_et, negotiate))
      .catch((error) => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Verify call message belongs to call by session id.
   *
   * @private
   * @param {CallMessage} call_message_et - Call message entity
   * @returns {Promise} Resolves with the Call entity if verification passed
   */
  verify_session_id(call_message_et) {
    const {user_id, session_id} = call_message_et;

    if (session_id === this.session_id) {
      return Promise.resolve(this);
    }

    return this.get_participant_by_id(user_id)
      .then(({session_id: participant_session_id}) => {
        if (session_id === participant_session_id) {
          return this;
        }

        throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Session IDs not matching');
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
      .filter((participant_et) => participant_et.flow_et)
      .map((participant_et) => participant_et.flow_et);
  }

  /**
   * Get full flow telemetry report of the call.
   * @returns {Array<Object>} Array of flow telemetry reports for calling service automation
   */
  get_flow_telemetry() {
    return this.get_flows().map((flow_et) => flow_et.get_telemetry());
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
        .forEach((participant_et, index) => {
          const panning = this._calculate_panning(index, this.participants().length);

          this.logger.debug(`Panning for '${participant_et.user.name()}' recalculated to '${panning}'`);
          participant_et.panning(panning);
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
  _reset_flows() {
    this.get_flows().forEach((flow_et) => flow_et.reset_flow());
  }


  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Log flow status to console.
   * @returns {undefined} No return value
   */
  log_status() {
    this.get_flows().forEach((flow_et) => flow_et.log_status());
  }

  /**
   * Log flow setup step timings to console.
   * @returns {undefined} No return value
   */
  log_timings() {
    this.get_flows().forEach((flow_et) => flow_et.log_timings());
  }
};
