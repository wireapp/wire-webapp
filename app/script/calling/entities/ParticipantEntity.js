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

z.calling.entities.ParticipantEntity = class ParticipantEntity {
  /**
   * Construct a new participant.
   *
   * @class z.calling.entities.ParticipantEntity
   * @param {z.calling.entities.CallEntity} callEntity - Call entity
   * @param {z.entity.User} user - User entity to base the participant on
   * @param {CallSetupTimings} timings - Timing statistics of call setup steps
   */
  constructor(callEntity, user, timings) {
    this.callEntity = callEntity;
    this.user = user;
    this.id = this.user.id;
    this.sessionId = undefined;

    this.logger = new z.telemetry.calling.CallLogger(
      `z.calling.entities.ParticipantEntity (${this.id})`,
      z.config.LOGGER.OPTIONS
    );

    this.isConnected = ko.observable(false);
    this.panning = ko.observable(0.0);
    this.wasConnected = false;

    this.state = {
      audioSend: ko.observable(true),
      screenSend: ko.observable(false),
      videoSend: ko.observable(false),
    };

    this.flowEntity = new z.calling.entities.FlowEntity(this.callEntity, this, timings);

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
      this.flowEntity.resetFlow();
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
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to update state from.
   * @returns {Promise} Resolves when the state was updated
   */
  updateState(callMessageEntity) {
    const {clientId, properties, sdp: rtcSdp, sessionId} = callMessageEntity;

    return this.updateProperties(properties).then(() => {
      this.sessionId = sessionId;
      this.flowEntity.setRemoteClientId(clientId);

      return rtcSdp ? this.flowEntity.saveRemoteSdp(callMessageEntity) : false;
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
          const isAudioSend = audioSend === z.calling.enum.PROPERTY_STATE.TRUE;
          this.state.audioSend(isAudioSend);
        }

        if (screenSend !== undefined) {
          const isScreenSend = screenSend === z.calling.enum.PROPERTY_STATE.TRUE;
          this.state.screenSend(isScreenSend);
        }

        if (videoSend !== undefined) {
          const isVideoSend = videoSend === z.calling.enum.PROPERTY_STATE.TRUE;
          this.state.videoSend(isVideoSend);
        }
      }
    });
  }

  /**
   * Verify client IDs match.
   * @param {string} clientId - Client ID to match with participant one
   * @returns {undefined} No return value
   */
  verifyClientId(clientId) {
    if (clientId) {
      const connectedClientId = this.flowEntity.remoteClientId;

      const isExpectedId = clientId === connectedClientId;
      const requestedByWrongSender = connectedClientId && !isExpectedId;
      if (requestedByWrongSender) {
        const logMessage = `State change requested from '${clientId}' while we are connected to '${connectedClientId}'`;
        this.logger.warn(logMessage, this);
        throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER);
      }

      this.flowEntity.remoteClientId = clientId;
    } else {
      throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Sender ID missing');
    }
  }
};
