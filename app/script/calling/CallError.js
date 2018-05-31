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

z.calling.CallError = class CallError extends Error {
  constructor(type, message) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || CallError.TYPE.UNKNOWN;

    if (message) {
      this.message = message;
    } else {
      switch (this.type) {
        case CallError.TYPE.MISTARGETED_MESSAGE:
          this.message = 'Message targeted at another client';
          break;
        case CallError.TYPE.NO_CONVERSATION_ID:
          this.message = 'No conversation ID given';
          break;
        case CallError.TYPE.NO_DATA_CHANNEL:
          this.message = 'No established data channel for call';
          break;
        case CallError.TYPE.NO_REPLACEABLE_TRACK:
          this.message = 'No replaceable MediaStreamTrack found';
          break;
        case CallError.TYPE.NO_USER_ID:
          this.message = 'User ID to target message not given';
          break;
        case CallError.TYPE.NOT_FOUND:
          this.message = 'No call for conversation ID found';
          break;
        case CallError.TYPE.NOT_SUPPORTED:
          this.message = 'Calling is not supported';
          break;
        case CallError.TYPE.RTP_SENDER_NOT_SUPPORTED:
          this.message = 'PeerConnection does not support RtcRtpSender extension';
          break;
        case CallError.TYPE.UNSUPPORTED_VERSION:
          this.message = 'Unsupported version of the call protocol';
          break;
        case CallError.TYPE.WRONG_CONVERSATION_TYPE:
          this.message = 'Wrong conversation type for call message';
          break;
        case CallError.TYPE.WRONG_PAYLOAD_FORMAT:
          this.message = 'Payload for a call message is in wrong format';
          break;
        case CallError.TYPE.WRONG_SENDER:
          this.message = 'Call change from wrong sender';
          break;
        case CallError.TYPE.WRONG_STATE:
          this.message = 'Call in wrong state for change';
          break;
        default:
          this.message = 'Unknown CallError';
      }
    }
  }

  static get TYPE() {
    return {
      MISTARGETED_MESSAGE: 'CallError.TYPE.MISTARGETED_MESSAGE',
      NO_CONVERSATION_ID: 'CallError.TYPE.NO_CONVERSATION_ID',
      NO_DATA_CHANNEL: 'CallError.TYPE.NO_DATA_CHANNEL',
      NO_REPLACEABLE_TRACK: 'CallError.TYPE.NO_REPLACEABLE_TRACK',
      NO_USER_ID: 'CallError.TYPE.NO_USER_ID',
      NOT_FOUND: 'CallError.TYPE.NOT_FOUND',
      NOT_SUPPORTED: 'CallError.TYPE.NOT_SUPPORTED',
      RTP_SENDER_NOT_SUPPORTED: 'CallError.TYPE.RTP_SENDER_NOT_SUPPORTED',
      UNKNOWN: 'CallError.TYPE.UNKNOWN',
      UNSUPPORTED_VERSION: 'CallError.TYPE.UNSUPPORTED_VERSION',
      WRONG_CONVERSATION_TYPE: 'CallError.TYPE.WRONG_CONVERSATION_TYPE',
      WRONG_PAYLOAD_FORMAT: 'CallError.TYPE.WRONG_PAYLOAD_FORMAT',
      WRONG_SENDER: 'CallError.TYPE.WRONG_SENDER',
      WRONG_STATE: 'CallError.TYPE.WRONG_STATE',
    };
  }
};
