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

z.calling.entities.EParticipant = class EParticipant {
  /**
   * Construct a new e-participant.
   * @param {ECall} e_call_et - E-call entity
   * @param {z.entity.User} user - User entity to base the participant on
   * @param {CallSetupTimings} timings - Timing statistics of call setup steps
   * @param {ECallMessage} e_call_message_et - E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
   */
  constructor(e_call_et, user, timings, e_call_message_et) {
    this.e_call_et = e_call_et;
    this.user = user;
    this.id = this.user.id;
    this.session_id = undefined;

    this.is_connected = ko.observable(false);
    this.panning = ko.observable(0.0);
    this.was_connected = false;

    this.state = {
      audio_send: ko.observable(true),
      screen_send: ko.observable(false),
      video_send: ko.observable(false),
    };

    this.e_flow_et = new z.calling.entities.EFlow(this.e_call_et, this, timings, e_call_message_et);
    if (e_call_message_et) {
      const {props: properties} = e_call_message_et;

      this.update_properties(properties);
    }

    this.is_connected.subscribe(function(is_connected) {
      if (is_connected && !this.was_connected) {
        amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.READY_TO_TALK);
        this.was_connected = true;
      }
    });
  }

  /**
   * Reset the participant.
   * @returns {undefined} No return value
   */
  reset_participant() {
    if (this.e_flow_et) {
      this.e_flow_et.reset_flow();
    }
  }

  /**
   * Start negotiating the peer connection.
   * @returns {undefined} No return value
   */
  start_negotiation() {
    this.e_flow_et.start_negotiation();
  }

  /**
   * Update the participant state.
   * @param {ECallMessage} e_call_message_et - E-call message to update state from.
   * @returns {Promise} Resolves with the participant when the state was updated
   */
  update_state(e_call_message_et) {
    const {props, session_id, type} = e_call_message_et;

    return this.update_properties(props)
      .then(() => {
        this.session_id = session_id;
        if (type !== z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC) {
          return this.e_flow_et.save_remote_sdp(e_call_message_et);
        }
      })
      .then(() => {
        return this;
      });
  }

  /**
   * Update the state properties
   * @param {Object} properties - Properties to update with
   * @returns {Promise} Resolves when the properties have been updated
   */
  update_properties(properties) {
    return Promise.resolve()
    .then(() => {
      if (properties) {
        const {audiosend: audio_send, screensend: screen_send, videosend: video_send} = properties;

        if (audio_send !== undefined) {
          this.state.audio_send(audio_send === z.calling.enum.PROPERTY_STATE.TRUE);
        }

        if (screen_send !== undefined) {
          this.state.screen_send(screen_send === z.calling.enum.PROPERTY_STATE.TRUE);
        }

        if (video_send !== undefined) {
          this.state.video_send(video_send === z.calling.enum.PROPERTY_STATE.TRUE);
        }
      }
    });
  }

  /**
   * Verifiy client IDs match.
   * @param {string} client_id - Client ID to match with participant one
   * @returns {undefined} No return value
   */
  verify_client_id(client_id) {
    if (client_id) {
      if (this.e_flow_et.remote_client_id && client_id !== this.e_flow_et.remote_client_id) {
        throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_SENDER);
      }
      this.e_flow_et.remote_client_id = client_id;
    } else {
      throw new z.calling.v3.CallError(z.calling.v3.CallError.TYPE.WRONG_SENDER, 'Sender ID missing');
    }
  }
};
