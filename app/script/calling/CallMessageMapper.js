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

z.calling.CallMessageMapper = (function() {
  /**
   * Map incoming call message into entity.
   *
   * @private
   * @param {Object} event - Call event object
   * @returns {CallMessage} Call message entity
   */
  const _mapEvent = function(event) {
    const {content: callMessage, conversation: conversationId, from: userId, sender: clientId, time} = event;

    const additionalProperties = {
      clientId: clientId,
      conversationId: conversationId,
      time: time,
      userId: userId,
    };

    let content = undefined;
    switch (callMessage.type) {
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
      case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE: {
        const {dest_clientid, dest_userid, props: properties, sdp} = callMessage;

        content = {
          destClientId: dest_clientid,
          destUserId: dest_userid,
          props: properties,
          sdp: sdp,
        };
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC: {
        const {props: properties} = callMessage;

        content = {
          props: properties,
        };
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
        const {props: properties, sdp} = callMessage;

        content = {
          props: properties,
          sdp: sdp,
        };
        break;
      }

      default: {
        break;
      }
    }

    if (content) {
      $.extend(additionalProperties, content);
    }

    const {type, resp: response, sessid: sessionId} = callMessage;
    const callMessageEntity = new z.calling.entities.CallMessage(type, response, sessionId);

    callMessageEntity.add_properties(additionalProperties);

    return callMessageEntity;
  };

  return {
    mapEvent: _mapEvent,
  };
})();
