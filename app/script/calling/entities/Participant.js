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

z.calling.entities.Participant = class Participant {
  /**
   * Construct a new participant.
   *
   * @class z.calling.entities.Participant
   * @param {Call} call_et - Call entity
   * @param {z.entity.User} user - User entity to base the participant on
   * @param {CallSetupTimings} timings - Timing statistics of call setup steps
   */
  constructor(call_et, user, timings) {
    this.call_et = call_et;
    this.user = user;
    this.id = this.user.id;
    this.session_id = undefined;

    this.logger = new z.util.Logger(`z.calling.entities.Participant (${this.id})`, z.config.LOGGER.OPTIONS);

    this.is_connected = ko.observable(false);
    this.panning = ko.observable(0.0);
    this.was_connected = false;

    this.state = {
      audio_send: ko.observable(true),
      screen_send: ko.observable(false),
      video_send: ko.observable(false),
    };

    this.flow_et = new z.calling.entities.Flow(this.call_et, this, timings);

    this.is_connected.subscribe((is_connected) => {
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
    if (this.flow_et) {
      this.flow_et.reset_flow();
    }
  }

  /**
   * Start negotiating the peer connection.
   * @returns {undefined} No return value
   */
  start_negotiation() {
    this.flow_et.start_negotiation();
  }

  /**
   * Update the participant state.
   * @param {CallMessage} call_message_et - Call message to update state from.
   * @returns {Promise} Resolves with the participant when the state was updated
   */
  update_state(call_message_et) {
    if (!call_message_et) {
      return Promise.resolve(this);
    }

    const {client_id, props, sdp: rtc_sdp, session_id} = call_message_et;

    return this.update_properties(props)
      .then(() => {
        this.session_id = session_id;
        this.flow_et.set_remote_client_id(client_id);

        if (rtc_sdp) {
          return this.flow_et.save_remote_sdp(call_message_et);
        }
      })
      .then(() => this);
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
      const connected_client_id = this.flow_et.remote_client_id;

      if (connected_client_id && client_id !== connected_client_id) {
        this.logger.warn(`State change requested from '${client_id}' while we are connected to '${connected_client_id}'`, this);
        throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER);
      }
      this.flow_et.remote_client_id = client_id;
    } else {
      throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Sender ID missing');
    }
  }
};
