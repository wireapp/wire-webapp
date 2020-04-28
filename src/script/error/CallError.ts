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

import {BaseError, BASE_ERROR_TYPE} from './BaseError';

enum CALL_ERROR_TYPE {
  MISTARGETED_MESSAGE = 'MISTARGETED_MESSAGE',
  NO_CONVERSATION_ID = 'NO_CONVERSATION_ID',
  NO_DATA_CHANNEL = 'NO_DATA_CHANNEL',
  NO_REPLACEABLE_TRACK = 'NO_REPLACEABLE_TRACK',
  NO_USER_ID = 'NO_USER_ID',
  NOT_FOUND = 'NOT_FOUND',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  RTP_SENDER_NOT_SUPPORTED = 'RTP_SENDER_NOT_SUPPORTED',
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  WRONG_CONVERSATION_TYPE = 'WRONG_CONVERSATION_TYPE',
  WRONG_PAYLOAD_FORMAT = 'WRONG_PAYLOAD_FORMAT',
  WRONG_SENDER = 'WRONG_SENDER',
  WRONG_STATE = 'WRONG_STATE',
}

export class CallError extends BaseError {
  constructor(type: CALL_ERROR_TYPE | BASE_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<CALL_ERROR_TYPE, string> {
    return {
      MISTARGETED_MESSAGE: 'Message targeted at another client',
      NOT_FOUND: 'No call for conversation ID found',
      NOT_SUPPORTED: 'Calling is not supported',
      NO_CONVERSATION_ID: 'No conversation ID given',
      NO_DATA_CHANNEL: 'No established data channel for call',
      NO_REPLACEABLE_TRACK: 'No replaceable MediaStreamTrack found',
      NO_USER_ID: 'Missing user ID to target message',
      RTP_SENDER_NOT_SUPPORTED: 'PeerConnection does not support RtcRtpSender extension',
      UNSUPPORTED_VERSION: 'Unsupported version of the call protocol',
      WRONG_CONVERSATION_TYPE: 'Wrong conversation type for call message',
      WRONG_PAYLOAD_FORMAT: 'Payload for a call message is in wrong format',
      WRONG_SENDER: 'Call change from wrong sender',
      WRONG_STATE: 'Call in wrong state for change',
    };
  }

  static get TYPE(): Record<CALL_ERROR_TYPE, CALL_ERROR_TYPE> {
    return {
      MISTARGETED_MESSAGE: CALL_ERROR_TYPE.MISTARGETED_MESSAGE,
      NOT_FOUND: CALL_ERROR_TYPE.NOT_FOUND,
      NOT_SUPPORTED: CALL_ERROR_TYPE.NOT_SUPPORTED,
      NO_CONVERSATION_ID: CALL_ERROR_TYPE.NO_CONVERSATION_ID,
      NO_DATA_CHANNEL: CALL_ERROR_TYPE.NO_DATA_CHANNEL,
      NO_REPLACEABLE_TRACK: CALL_ERROR_TYPE.NO_REPLACEABLE_TRACK,
      NO_USER_ID: CALL_ERROR_TYPE.NO_USER_ID,
      RTP_SENDER_NOT_SUPPORTED: CALL_ERROR_TYPE.RTP_SENDER_NOT_SUPPORTED,
      UNSUPPORTED_VERSION: CALL_ERROR_TYPE.UNSUPPORTED_VERSION,
      WRONG_CONVERSATION_TYPE: CALL_ERROR_TYPE.WRONG_CONVERSATION_TYPE,
      WRONG_PAYLOAD_FORMAT: CALL_ERROR_TYPE.WRONG_PAYLOAD_FORMAT,
      WRONG_SENDER: CALL_ERROR_TYPE.WRONG_SENDER,
      WRONG_STATE: CALL_ERROR_TYPE.WRONG_STATE,
    };
  }
}
