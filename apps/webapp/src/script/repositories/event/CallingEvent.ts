/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import type {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {InCallEmojiType} from '@wireapp/core/lib/conversation';
import {CALL_MESSAGE_TYPE} from 'Repositories/calling/enum/CallMessageType';

import {CALL} from './Client';

interface CallingRemoteMuteEventContentData {
  targets: QualifiedUserClients;
}

interface CallingEventContentData {
  [CALL_MESSAGE_TYPE.REMOTE_MUTE]: CallingRemoteMuteEventContentData;
  [CALL_MESSAGE_TYPE.EMOJIS]: {};
  [CALL_MESSAGE_TYPE.HAND_RAISED]: {};
}

type CallingEventContent = {
  [EventType in CALL_MESSAGE_TYPE]: EventType extends keyof CallingEventContentData
    ? {
        type: EventType;
        version: string;
        data: CallingEventContentData[EventType];
        emojis: InCallEmojiType;
        isHandUp: boolean;
      }
    : {type: EventType; version: string};
}[CALL_MESSAGE_TYPE];

export interface CallingEvent {
  /**
   * content is an object that comes from avs
   */
  content: CallingEventContent;
  targetConversation?: QualifiedId;
  conversation: string;
  from: string;
  qualified_conversation?: QualifiedId;
  qualified_from?: QualifiedId;
  sender: string;
  time?: string;
  type: CALL;
  senderClientId?: string;
}
