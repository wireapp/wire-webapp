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
  const _map_event = function(event) {
    const {content: call_message, conversation: conversation_id, from: user_id, sender: client_id, time} = event;

    const additional_properties = {
      client_id: client_id,
      conversation_id: conversation_id,
      time: time,
      user_id: user_id,
    };

    let content = undefined;
    switch (call_message.type) {
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
      case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE: {
        const {dest_clientid, dest_userid, props: properties, sdp} = call_message;

        content = {
          dest_client_id: dest_clientid,
          dest_user_id: dest_userid,
          props: properties,
          sdp: sdp,
        };
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC: {
        const {props: properties} = call_message;

        content = {
          props: properties,
        };
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
        const {props: properties, sdp} = call_message;

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
      $.extend(additional_properties, content);
    }

    const {type, resp: response, sessid: session_id} = call_message;
    const call_message_et = new z.calling.entities.CallMessage(type, response, session_id);

    call_message_et.add_properties(additional_properties);

    return call_message_et;
  };

  return {
    map_event: _map_event,
  };
})();
