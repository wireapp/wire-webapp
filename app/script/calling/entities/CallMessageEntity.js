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

window.z = window.z || {};
window.z.calling = z.calling || {};
window.z.calling.entities = z.calling.entities || {};

z.calling.entities.CallMessageEntity = class CallMessageEntity {
  static get CONFIG() {
    return {
      PAYLOAD_TYPES: {
        PROPS: [
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START,
          z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC,
          z.calling.enum.CALL_MESSAGE_TYPE.SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.UPDATE,
        ],
        SDP: [
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.UPDATE,
        ],
        TARGETED: [
          z.calling.enum.CALL_MESSAGE_TYPE.CANCEL,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.UPDATE,
        ],
      },
      SESSION_ID_LENGTH: 4,
      VERSION: '3.0',
    };
  }

  /**
   * Construct a new call message entity.
   *
   * @class z.calling.entities.CallMessageEntity
   * @param {z.calling.enum.CALL_MESSAGE_TYPE} type - Type of call message
   * @param {boolean} [response=false] - Is message a response, defaults to false
   * @param {string} sessionId - Optional session ID
   */
  constructor(type, response = false, sessionId) {
    this.type = type;
    this.response = response;
    this.sessionId = sessionId || this._createSessionId();
  }

  /**
   * Add additional payload to message.
   * @param {Object} [additionalProperties={}] - Optional object containing additional message payload
   * @returns {undefined} No return value
   */
  addProperties(additionalProperties = {}) {
    Object.entries(additionalProperties).forEach(([key, value]) => (this[key] = value));
  }

  /**
   * Cast call message to JSON.
   * @returns {{version: string, resp: boolean, sessid: string, type: z.calling.enum.CALL_MESSAGE_TYPE}} - JSON representation of call message
   */
  toJSON() {
    const json_payload = {
      resp: this.response,
      sessid: this.sessionId,
      type: this.type,
      version: CallMessageEntity.CONFIG.VERSION,
    };

    const isPropsMessageType = CallMessageEntity.CONFIG.PAYLOAD_TYPES.PROPS.includes(this.type);
    if (isPropsMessageType) {
      json_payload.props = this.properties;
      const isTypePropSync = this.type === z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC;
      if (!isTypePropSync) {
        json_payload.sdp = this.sdp;
      }
    }

    const isSdpMessageType = CallMessageEntity.CONFIG.PAYLOAD_TYPES.SDP.includes(this.type);
    if (isSdpMessageType) {
      json_payload.sdp = this.sdp;
    }

    const isTargetedMessageType = CallMessageEntity.CONFIG.PAYLOAD_TYPES.TARGETED.includes(this.type);
    if (isTargetedMessageType) {
      json_payload.dest_clientid = this.remoteClientId;
      json_payload.dest_userid = this.remoteUserId;
    }

    return json_payload;
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
   * @returns {string} Random char session ID of length CallMessageEntity.CONFIG.SESSION_ID_LENGTH
   */
  _createSessionId() {
    return _.range(CallMessageEntity.CONFIG.SESSION_ID_LENGTH)
      .map(() => z.util.StringUtil.getRandomChar())
      .join('');
  }
};
