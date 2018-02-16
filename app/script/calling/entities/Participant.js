/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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
   * @param {Call} callEntity - Call entity
   * @param {z.entity.User} user - User entity to base the participant on
   * @param {CallSetupTimings} timings - Timing statistics of call setup steps
   */
  constructor(callEntity, user, timings) {
    this.callEntity = callEntity;
    this.user = user;
    this.id = this.user.id;
    this.sessionId = undefined;

    this.logger = new z.util.Logger(`z.calling.entities.Participant (${this.id})`, z.config.LOGGER.OPTIONS);

    this.isConnected = ko.observable(false);
    this.panning = ko.observable(0.0);
    this.wasConnected = false;

    this.state = {
      audioSend: ko.observable(true),
      screenSend: ko.observable(false),
      videoSend: ko.observable(false),
    };

    this.flowEntity = new z.calling.entities.Flow(this.callEntity, this, timings);

    this.isConnected.subscribe(isConnected => {
      if (isConnected && !this.wasConnected) {
        amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.READY_TO_TALK);
        this.wasConnected = true;
      }
    });
  }

  /**
   * Reset the participant.
   * @returns {undefined} No return value
   */
  resetParticipant() {
    if (this.flowEntity) {
      this.flowEntity.reset_flow();
    }
  }

  /**
   * Start negotiating the peer connection.
   * @returns {undefined} No return value
   */
  startNegotiation() {
    this.flowEntity.startNegotiation();
  }

  /**
   * Update the participant state.
   * @param {CallMessage} callMessageEntity - Call message to update state from.
   * @returns {Promise} Resolves when the state was updated
   */
  updateState(callMessageEntity) {
    const {clientId, props, sdp: rtcSdp, sessionId} = callMessageEntity;

    return this.updateProperties(props).then(() => {
      this.sessionId = sessionId;
      this.flowEntity.setRemoteClientId(clientId);

      if (rtcSdp) {
        return this.flowEntity.saveRemoteSdp(callMessageEntity);
      }

      return false;
    });
  }

  /**
   * Update the state properties
   * @param {Object} properties - Properties to update with
   * @returns {Promise} Resolves when the properties have been updated
   */
  updateProperties(properties) {
    return Promise.resolve().then(() => {
      if (properties) {
        const {audiosend: audioSend, screensend: screenSend, videosend: videoSend} = properties;

        if (audioSend !== undefined) {
          this.state.audioSend(audioSend === z.calling.enum.PROPERTY_STATE.TRUE);
        }

        if (screenSend !== undefined) {
          this.state.screenSend(screenSend === z.calling.enum.PROPERTY_STATE.TRUE);
        }

        if (videoSend !== undefined) {
          this.state.videoSend(videoSend === z.calling.enum.PROPERTY_STATE.TRUE);
        }
      }
    });
  }

  /**
   * Verifiy client IDs match.
   * @param {string} clientId - Client ID to match with participant one
   * @returns {undefined} No return value
   */
  verifyClientId(clientId) {
    if (clientId) {
      const connectedClientId = this.flowEntity.remoteClientId;

      if (connectedClientId && clientId !== connectedClientId) {
        this.logger.warn(
          `State change requested from '${clientId}' while we are connected to '${connectedClientId}'`,
          this
        );
        throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER);
      }
      this.flowEntity.remoteClientId = clientId;
    } else {
      throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Sender ID missing');
    }
  }
};
