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

z.calling.CallMessageBuilder = (function() {
  const _build_call_message = function(type, response, session_id, additional_payload) {
    const call_message_et = new z.calling.entities.CallMessage(type, response, session_id);

    if (additional_payload) {
      call_message_et.add_properties(additional_payload);
    }

    return call_message_et;
  };

  const _build_cancel = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.CANCEL, response, session_id, additional_payload);
  };

  const _build_group_check = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK, response, session_id, additional_payload);
  };

  const _build_group_leave = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE, response, session_id, additional_payload);
  };

  const _build_group_setup = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP, response, session_id, additional_payload);
  };

  const _build_group_start = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START, response, session_id, additional_payload);
  };

  const _build_hangup = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.HANGUP, response, session_id, additional_payload);
  };

  const _build_prop_sync = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC, response, session_id, additional_payload);
  };

  const _build_reject = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.REJECT, response, session_id, additional_payload);
  };

  const _build_setup = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.SETUP, response, session_id, additional_payload);
  };

  const _build_update = function(response, session_id, additional_payload) {
    return _build_call_message(z.calling.enum.CALL_MESSAGE_TYPE.UPDATE, response, session_id, additional_payload);
  };

  /**
   * Create additional payload.
   *
   * @param {string} conversation_id - ID of conversation
   * @param {string} self_user_id - ID of self user
   * @param {string} [remote_user_id] - Optional ID of remote user
   * @param {string} [remote_client_id] - Optional ID of remote client
   * @returns {{conversation_id: string, remote_client_id: string, remote_user_id: *, time: string, user_id: string}} Additional payload
   */
  const _create_payload = function(conversation_id, self_user_id, remote_user_id, remote_client_id) {
    return {
      conversation_id: conversation_id,
      remote_client_id: remote_client_id,
      remote_user_id: remote_user_id,
      time: new Date().toISOString(),
      user_id: self_user_id,
    };
  };

  /**
   * Create properties payload for call events.
   *
   * @param {Object} self_state - Current self state
   * @param {z.media.MediaType|boolean} payload_type - Media type of property change or forced videosend state
   * @param {boolean} [invert=false] - Invert state
   * @param {Object} additional_payload - Optional additional payload to be added
   * @returns {Object} call message props object
   */
  const _create_payload_prop_sync = function(self_state, payload_type, invert, additional_payload) {
    let payload;

    if (_.isBoolean(payload_type)) {
      payload = {
        props: {
          videosend: `${payload_type}`,
        },
      };
    } else {
      let audio_send_state;
      let screen_send_state;
      let video_send_state = undefined;

      switch (payload_type) {
        case z.media.MediaType.AUDIO: {
          const {audio_send: audio_self_state} = self_state;

          audio_send_state = invert ? !audio_self_state() : audio_self_state();

          payload = {
            props: {
              audiosend: `${audio_send_state}`,
            },
          };
          break;
        }

        case z.media.MediaType.SCREEN: {
          const {screen_send: screen_self_state, video_send: video_self_state} = self_state;

          screen_send_state = invert ? !screen_self_state() : screen_self_state();
          video_send_state = invert ? z.calling.enum.PROPERTY_STATE.FALSE : video_self_state();

          payload = {
            props: {
              screensend: `${screen_send_state}`,
              videosend: `${video_send_state}`,
            },
          };
          break;
        }

        case z.media.MediaType.VIDEO: {
          const {screen_send: screen_self_state, video_send: video_self_state} = self_state;

          screen_send_state = invert ? z.calling.enum.PROPERTY_STATE.FALSE : screen_self_state();
          video_send_state = invert ? !video_self_state() : video_self_state();

          payload = {
            props: {
              screensend: `${screen_send_state}`,
              videosend: `${video_send_state}`,
            },
          };
          break;
        }

        default:
          throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }

    if (additional_payload) {
      payload = $.extend(payload, additional_payload);
    }
    return payload;
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
    create_payload: _create_payload,
    create_payload_prop_sync: _create_payload_prop_sync,
  };
})();
