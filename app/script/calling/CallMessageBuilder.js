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

z.calling.CallMessageBuilder = (function() {
  const buildCallMessage = function(type, response, sessionId, additionalPayload) {
    const callMessageEt = new z.calling.entities.CallMessage(type, response, sessionId);

    if (additionalPayload) {
      callMessageEt.add_properties(additionalPayload);
    }

    return callMessageEt;
  };

  const buildCancel = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.CANCEL, response, sessionId, additionalPayload);
  };

  const buildGroupCheck = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK, response, sessionId, additionalPayload);
  };

  const buildGroupLeave = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE, response, sessionId, additionalPayload);
  };

  const buildGroupSetup = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP, response, sessionId, additionalPayload);
  };

  const buildGroupStart = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START, response, sessionId, additionalPayload);
  };

  const buildHangup = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.HANGUP, response, sessionId, additionalPayload);
  };

  const buildPropSync = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC, response, sessionId, additionalPayload);
  };

  const buildReject = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.REJECT, response, sessionId, additionalPayload);
  };

  const buildSetup = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.SETUP, response, sessionId, additionalPayload);
  };

  const buildUpdate = function(response, sessionId, additionalPayload) {
    return buildCallMessage(z.calling.enum.CALL_MESSAGE_TYPE.UPDATE, response, sessionId, additionalPayload);
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
  const createPayload = function(conversationId, selfUserId, remoteUserId, remoteClientId) {
    return {
      conversationId: conversationId,
      remoteClientId: remoteClientId,
      remoteUserId: remoteUserId,
      time: new Date().toISOString(),
      userId: selfUserId,
    };
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
  const createPayloadPropSync = function(selfState, payloadType, invert, additionalPayload) {
    let payload;

    if (_.isBoolean(payloadType)) {
      payload = {
        props: {
          videosend: `${payloadType}`,
        },
      };
    } else {
      let audioSendState;
      let screenSendState;
      let videoSendState = undefined;

      switch (payloadType) {
        case z.media.MediaType.AUDIO: {
          const {audioSend: audioSelfState} = selfState;

          audioSendState = invert ? !audioSelfState() : audioSelfState();

          payload = {
            props: {
              audiosend: `${audioSendState}`,
            },
          };
          break;
        }

        case z.media.MediaType.SCREEN: {
          const {screenSend: screenSelfState, videoSend: videoSelfState} = selfState;

          screenSendState = invert ? !screenSelfState() : screenSelfState();
          videoSendState = invert ? z.calling.enum.PROPERTY_STATE.FALSE : videoSelfState();

          payload = {
            props: {
              screensend: `${screenSendState}`,
              videosend: `${videoSendState}`,
            },
          };
          break;
        }

        case z.media.MediaType.VIDEO: {
          const {screenSend: screenSelfState, videoSend: videoSelfState} = selfState;

          screenSendState = invert ? z.calling.enum.PROPERTY_STATE.FALSE : screenSelfState();
          videoSendState = invert ? !videoSelfState() : videoSelfState();

          payload = {
            props: {
              screensend: `${screenSendState}`,
              videosend: `${videoSendState}`,
            },
          };
          break;
        }

        default:
          throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    if (additionalPayload) {
      payload = $.extend(payload, additionalPayload);
    }
    return payload;
  };

  return {
    buildCancel: buildCancel,
    buildGroupcheck: buildGroupCheck,
    buildGroupleave: buildGroupLeave,
    buildGroupsetup: buildGroupSetup,
    buildGroupstart: buildGroupStart,
    buildHangup: buildHangup,
    buildPropSync: buildPropSync,
    buildReject: buildReject,
    buildSetup: buildSetup,
    buildUpdate: buildUpdate,
    createPayload: createPayload,
    createPayloadPropSync: createPayloadPropSync,
  };
})();
