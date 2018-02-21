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

z.calling.CallMessageBuilder = (() => {
  const _buildCallMessage = (type, response, sessionId, additionalPayload) => {
    const callMessageEntity = new z.calling.entities.CallMessageEntity(type, response, sessionId);

    if (additionalPayload) {
      callMessageEntity.addProperties(additionalPayload);
    }

    return callMessageEntity;
  };

  const _buildCancel = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.CANCEL, response, sessionId, additionalPayload);
  };

  const _buildGroupCheck = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK, response, sessionId, additionalPayload);
  };

  const _buildGroupLeave = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE, response, sessionId, additionalPayload);
  };

  const _buildGroupSetup = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP, response, sessionId, additionalPayload);
  };

  const _buildGroupStart = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START, response, sessionId, additionalPayload);
  };

  const _buildHangup = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.HANGUP, response, sessionId, additionalPayload);
  };

  const _buildPropSync = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC, response, sessionId, additionalPayload);
  };

  const _buildReject = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.REJECT, response, sessionId, additionalPayload);
  };

  const _buildSetup = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.SETUP, response, sessionId, additionalPayload);
  };

  const _buildUpdate = (response, sessionId, additionalPayload) => {
    return _buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.UPDATE, response, sessionId, additionalPayload);
  };

  /**
   * Create additional payload.
   *
   * @param {string} conversationId - ID of conversation
   * @param {string} selfUserId - ID of self user
   * @param {string} [remoteUserId] - Optional ID of remote user
   * @param {string} [remoteClientId] - Optional ID of remote client
   * @returns {{conversationId: string, remoteClientId: string, remoteUserId: *, time: string, userId: string}} Additional payload
   */
  const _createPayload = (conversationId, selfUserId, remoteUserId, remoteClientId) => {
    return {conversationId, remoteClientId, remoteUserId, time: new Date().toISOString(), userId: selfUserId};
  };

  /**
   * Create properties payload for call events.
   *
   * @param {Object} selfState - Current self state
   * @param {z.media.MediaType|boolean} payloadType - Media type of property change or forced videosend state
   * @param {boolean} [invert=false] - Invert state
   * @param {Object} additionalPayload - Optional additional payload to be added
   * @returns {Object} call message props object
   */
  const _createPayloadPropSync = (selfState, payloadType, invert, additionalPayload) => {
    const payload = {};

    if (_.isBoolean(payloadType)) {
      payload.properties = {videosend: `${payloadType}`};
    } else {
      let audioSendState;
      let screenSendState;
      let videoSendState = undefined;

      switch (payloadType) {
        case z.media.MediaType.AUDIO: {
          const {audioSend: audioSelfState} = selfState;

          audioSendState = invert ? !audioSelfState() : audioSelfState();

          payload.properties = {audiosend: `${audioSendState}`};
          break;
        }

        case z.media.MediaType.SCREEN: {
          const {screenSend: screenSelfState, videoSend: videoSelfState} = selfState;

          screenSendState = invert ? !screenSelfState() : screenSelfState();
          videoSendState = invert ? z.calling.enum.PROPERTY_STATE.FALSE : videoSelfState();

          payload.properties = {
            screensend: `${screenSendState}`,
            videosend: `${videoSendState}`,
          };
          break;
        }

        case z.media.MediaType.VIDEO: {
          const {screenSend: screenSelfState, videoSend: videoSelfState} = selfState;

          screenSendState = invert ? z.calling.enum.PROPERTY_STATE.FALSE : screenSelfState();
          videoSendState = invert ? !videoSelfState() : videoSelfState();

          payload.properties = {
            screensend: `${screenSendState}`,
            videosend: `${videoSendState}`,
          };
          break;
        }

        default:
          throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    return additionalPayload ? Object.assign(payload, additionalPayload) : payload;
  };

  return {
    buildCancel: _buildCancel,
    buildGroupCheck: _buildGroupCheck,
    buildGroupLeave: _buildGroupLeave,
    buildGroupSetup: _buildGroupSetup,
    buildGroupStart: _buildGroupStart,
    buildHangup: _buildHangup,
    buildPropSync: _buildPropSync,
    buildReject: _buildReject,
    buildSetup: _buildSetup,
    buildUpdate: _buildUpdate,
    createPayload: _createPayload,
    createPayloadPropSync: _createPayloadPropSync,
  };
})();
