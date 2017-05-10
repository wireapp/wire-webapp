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
window.z.calling.mapper = z.calling.mapper || {};

z.calling.mapper.ECallMessageMapper = (function() {

  const _build_e_call_message = function(type, response, session_id, additional_payload) {
    const e_call_message_et = new z.calling.entities.ECallMessage(type, response, session_id);

    if (additional_payload) {
      e_call_message_et.add_properties(additional_payload);
    }

    return e_call_message_et;
  };

  const _build_cancel = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL, response, session_id, additional_payload);
  };

  const _build_group_check = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK, response, session_id, additional_payload);
  };

  const _build_group_leave = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE, response, session_id, additional_payload);
  };

  const _build_group_setup = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP, response, session_id, additional_payload);
  };

  const _build_group_start = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START, response, session_id, additional_payload);
  };

  const _build_hangup = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, response, session_id, additional_payload);
  };

  const _build_prop_sync = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, response, session_id, additional_payload);
  };

  const _build_reject = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT, response, session_id, additional_payload);
  };

  const _build_setup = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP, response, session_id, additional_payload);
  };

  const _build_update = function(response, session_id, additional_payload) {
    return _build_e_call_message(z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE, response, session_id, additional_payload);
  };

  /**
   * Map incoming e-call message into entity.
   *
   * @private
   * @param {Object} event - E-call event object
   * @returns {ECallMessage} E-call message entity
   */
  const _map_event = function(event) {
    const {content: e_call_message, conversation: conversation_id, from: user_id, sender: client_id, time} = event;

    const additional_properties = {
      client_id: client_id,
      conversation_id: conversation_id,
      time: time,
      user_id: user_id,
    };

    let content = undefined;
    switch (e_call_message.type) {
      case z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP: {
        const {dest_clientid, dest_userid, props: properties, sdp} = e_call_message;

        content = {
          dest_client_id: dest_clientid,
          dest_user_id: dest_userid,
          props: properties,
          sdp: sdp,
        };
        break;
      }

      case z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC: {
        const {props: properties} = e_call_message;

        content = {
          props: properties,
        };
        break;
      }

      case z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP:
      case z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE: {
        const {props: properties, sdp} = e_call_message;

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

    const {type, resp: response, sessid: session_id} = e_call_message;
    const e_call_message_et = new z.calling.entities.ECallMessage(type, response, session_id);

    e_call_message_et.add_properties(additional_properties);

    return e_call_message_et;
  };

  return {
    build_cancel: _build_cancel,
    build_group_check: _build_group_check,
    build_group_leave: _build_group_leave,
    build_group_setup: _build_group_setup,
    build_group_start: _build_group_start,
    build_hangup: _build_hangup,
    build_prop_sync: _build_prop_sync,
    build_reject: _build_reject,
    build_setup: _build_setup,
    build_update: _build_update,
    map_event: _map_event,
  };
})();
