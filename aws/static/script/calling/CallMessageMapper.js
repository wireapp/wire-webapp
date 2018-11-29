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

z.calling.CallMessageMapper = {
  /**
   * Map incoming call message into entity.
   *
   * @private
   * @param {Object} event - Call event object
   * @returns {z.calling.entities.CallMessageEntity} Call message entity
   */
  mapEvent(event) {
    const {content: callMessage, conversation: conversationId, from: userId, sender: clientId, time} = event;

    const additionalProperties = {clientId, conversationId, time, userId};

    let content = undefined;
    switch (callMessage.type) {
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
      case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE: {
        const {
          dest_clientid: destinationClientId,
          dest_userid: destinationUserId,
          props: properties,
          sdp,
        } = callMessage;

        content = {destinationClientId, destinationUserId, properties, sdp};
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC: {
        const properties = callMessage.props;

        content = {properties};
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START:
      case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
        const {props: properties, sdp} = callMessage;

        content = {properties, sdp};
        break;
      }

      default: {
        break;
      }
    }

    if (content) {
      Object.assign(additionalProperties, content);
    }

    const {type, resp: response, sessid: sessionId} = callMessage;
    const callMessageEntity = new z.calling.entities.CallMessageEntity(type, response, sessionId);

    callMessageEntity.addProperties(additionalProperties);

    return callMessageEntity;
  },
};
