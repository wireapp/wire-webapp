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


z.calling.entities.ECallMessage = class ECallMessage {
  static get CONFIG() {
    return {
      SESSION_ID_LENGTH: 4,
      VERSION: '3.0',
    };
  }

  /**
   * Construct a new e-call message entity.
   *
   * @param {z.calling.enum.E_CALL_MESSAGE_TYPE} type - Type of e-call message
   * @param {boolean} [response=false] - Is message a response, defaults to false
   * @param {string} session_id - Optional session ID
   */
  constructor(type, response = false, session_id) {
    this.type = type;
    this.response = response;
    this.session_id = session_id || this._create_session_id();
  }

  /**
   * Add additional payload to message.
   * @param {Object} [additional_properties={}] - Optional object containing additional message payload
   * @returns {undefined} No return value
   */
  add_properties(additional_properties = {}) {
    for (const key in additional_properties) {
      if (additional_properties.hasOwnProperty(key)) {
        this[key] = additional_properties[key];
      }
    }
  }

  /**
   * Cast e-call message to JSON.
   * @returns {{version: string, resp: boolean, sessid: string, type: z.calling.enum.E_CALL_MESSAGE_TYPE}} - JSON representation of e-call message
   */
  to_JSON() {
    const json_payload = {
      resp: this.response,
      sessid: this.session_id,
      type: this.type,
      version: ECallMessage.CONFIG.VERSION,
    };

    const extended_message_types = [
      z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP,
      z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC,
      z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP,
      z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE,
    ];

    if (extended_message_types.includes(this.type)) {
      json_payload.props = this.props;
      if (this.type !== z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC) {
        json_payload.sdp = this.sdp;
      }
    }

    if (this.type === z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP) {
      json_payload.dest_clientid = this.remote_client_id;
      json_payload.dest_userid = this.remote_user_id;
    }

    return json_payload;
  }

  /**
   * Cast e-call message to string.
   * @returns {string} Stringified JSON representation of e-call message
   */
  to_content_string() {
    return JSON.stringify(this.to_JSON());
  }

  /**
   * Create a session ID.
   * @private
   * @returns {string} Random char session ID of length z.calling.entities.ECallMessage.CONFIG.SESSION_ID_LENGTH
   */
  _create_session_id() {
    return _.range(ECallMessage.CONFIG.SESSION_ID_LENGTH)
      .map(function() {
        return z.util.StringUtil.get_random_character();
      })
      .join('');
  }
};
