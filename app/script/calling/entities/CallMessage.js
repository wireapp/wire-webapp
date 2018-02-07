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

z.calling.entities.CallMessage = class CallMessage {
  static get CONFIG() {
    return {
      SESSION_ID_LENGTH: 4,
      VERSION: '3.0',
    };
  }

  /**
   * Construct a new call message entity.
   *
   * @class z.calling.entities.CallMessage
   * @param {z.calling.enum.CALL_MESSAGE_TYPE} type - Type of call message
   * @param {boolean} [response=false] - Is message a response, defaults to false
   * @param {string} sessionId - Optional session ID
   */
  constructor(type, response = false, sessionId) {
    this.type = type;
    this.response = response;
    this.sessionId = sessionId || this.createSessionId();
  }

  /**
   * Add additional payload to message.
   * @param {Object} [additionalProperties={}] - Optional object containing additional message payload
   * @returns {undefined} No return value
   */
  addProperties(additionalProperties = {}) {
    for (const key in additionalProperties) {
      if (additionalProperties.hasOwnProperty(key)) {
        this[key] = additionalProperties[key];
      }
    }
  }

  /**
   * Cast call message to JSON.
   * @returns {{version: string, resp: boolean, sessid: string, type: z.calling.enum.CALL_MESSAGE_TYPE}} - JSON representation of call message
   */
  toJSON() {
    const jsonPayload = {
      resp: this.response,
      sessid: this.sessionId,
      type: this.type,
      version: CallMessage.CONFIG.VERSION,
    };

    const extendedMessageTypes = [
      z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
      z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC,
      z.calling.enum.CALL_MESSAGE_TYPE.SETUP,
      z.calling.enum.CALL_MESSAGE_TYPE.UPDATE,
    ];

    if (extendedMessageTypes.includes(this.type)) {
      jsonPayload.props = this.props;
      if (this.type !== z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC) {
        jsonPayload.sdp = this.sdp;
      }
    }

    const targetedMessageTypes = [
      z.calling.enum.CALL_MESSAGE_TYPE.CANCEL,
      z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
      z.calling.enum.CALL_MESSAGE_TYPE.UPDATE,
    ];

    if (targetedMessageTypes.includes(this.type)) {
      jsonPayload.destClientid = this.remoteClientId;
      jsonPayload.destUserid = this.remoteUserId;
    }

    return jsonPayload;
  }

  /**
   * Cast call message to string.
   * @returns {string} Stringified JSON representation of call message
   */
  toContentString() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Create a session ID.
   * @private
   * @returns {string} Random char session ID of length CallMessage.CONFIG.SESSION_ID_LENGTH
   */
  createSessionId() {
    return _.range(CallMessage.CONFIG.SESSION_ID_LENGTH)
      .map(() => z.util.StringUtil.getRandomCharacter())
      .join('');
  }
};
