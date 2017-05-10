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
window.z.calling.v3 = z.calling.v3 || {};

z.calling.v3.CallError = class CallError extends Error {
  constructor(type, message) {
    super();

    this.name = this.constructor.name;
    this.stack = (new Error()).stack;
    this.type = type || z.calling.v3.CallError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.calling.v3.CallError.TYPE.NO_CONVERSATION_ID:
        this.message = 'No conversation ID given';
        break;
      case z.calling.v3.CallError.TYPE.NO_DATA_CHANNEL:
        this.message = 'No established data channel for e-call';
        break;
      case z.calling.v3.CallError.TYPE.NO_REPLACEABLE_TRACK:
        this.message = 'No replaceable MediaStreamTrack found';
        break;
      case z.calling.v3.CallError.TYPE.NO_USER_ID:
        this.message = 'User ID to target message not given';
        break;
      case z.calling.v3.CallError.TYPE.NOT_FOUND:
        this.message = 'No e-call for conversation ID found';
        break;
      case z.calling.v3.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED:
        this.message = 'PeerConnection does not support RtcRtpSender extension';
        break;
      case z.calling.v3.CallError.TYPE.UNSUPPORTED_VERSION:
        this.message = 'Unsupported version of the e-call protocol';
        break;
      case z.calling.v3.CallError.TYPE.WRONG_CONVERSATION_TYPE:
        this.message = 'Wrong conversation type for e-call message';
        break;
      case z.calling.v3.CallError.TYPE.WRONG_PAYLOAD_FORMAT:
        this.message = 'Payload for an e-call message is in wrong format';
        break;
      case z.calling.v3.CallError.TYPE.WRONG_SENDER:
        this.message = 'Call change from wrong sender';
        break;
      default:
        this.message = 'Unknown ECallError';
    }
  }

  static get TYPE() {
    return {
      NO_CONVERSATION_ID: 'z.calling.v3.CallError.TYPE.NO_CONVERSATION_ID',
      NO_DATA_CHANNEL: 'z.calling.v3.CallError.TYPE.NO_DATA_CHANNEL',
      NO_REPLACEABLE_TRACK: 'z.calling.v3.CallError.TYPE.NO_REPLACEABLE_TRACK',
      NO_USER_ID: 'z.calling.v3.CallError.TYPE.NO_USER_ID',
      NOT_FOUND: 'z.calling.v3.CallError.TYPE.NOT_FOUND',
      RTP_SENDER_NOT_SUPPORTED: 'z.calling.v3.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED',
      UNKNOWN: 'z.calling.v3.CallError.TYPE.UNKNOWN',
      UNSUPPORTED_VERSION: 'z.calling.v3.CallError.TYPE.UNSUPPORTED_VERSION',
      WRONG_CONVERSATION_TYPE: 'z.calling.v3.CallError.TYPE.WRONG_CONVERSATION_TYPE',
      WRONG_PAYLOAD_FORMAT: 'z.calling.v3.CallError.TYPE.WRONG_PAYLOAD_FORMAT',
      WRONG_SENDER: 'z.calling.v3.CallError.TYPE.WRONG_SENDER',
    };
  }
};
