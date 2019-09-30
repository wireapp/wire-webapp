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

import {ConversationEventData} from '@wireapp/api-client/dist/commonjs/event/';
import {ConversationContent} from '../content';

export enum PayloadBundleState {
  INCOMING = 'PayloadBundleState.INCOMING',
  OUTGOING_SENT = 'PayloadBundleState.OUTGOING_SENT',
  OUTGOING_UNSENT = 'PayloadBundleState.OUTGOING_UNSENT',
}

export interface PayloadBundle {
  content?: ConversationContent | ConversationEventData;
  conversation: string;
  from: string;
  fromClientId?: string;
  id: string;
  state: PayloadBundleState;
  timestamp: number;
  type: PayloadBundleType;
  messageTimer?: number;
}

export enum PayloadBundleType {
  ASSET = 'PayloadBundleType.ASSET',
  ASSET_ABORT = 'PayloadBundleType.ASSET_ABORT',
  ASSET_IMAGE = 'PayloadBundleType.ASSET_IMAGE',
  ASSET_META = 'PayloadBundleType.ASSET_META',
  AVAILABILITY = 'PayloadBundleType.AVAILABILITY',
  CALL = 'PayloadBundleType.CALL',
  CLEARED = 'PayloadBundleType.CLEARED',
  CLIENT_ACTION = 'PayloadBundleType.CLIENT_ACTION',
  CLIENT_ADD = 'PayloadBundleType.CLIENT_ADD',
  CLIENT_REMOVE = 'PayloadBundleType.CLIENT_REMOVE',
  CONFIRMATION = 'PayloadBundleType.CONFIRMATION',
  CONNECTION_REQUEST = 'PayloadBundleType.CONNECTION_REQUEST',
  CONVERSATION_CLEAR = 'PayloadBundleType.CONVERSATION_CLEAR',
  CONVERSATION_RENAME = 'PayloadBundleType.CONVERSATION_RENAME',
  LAST_READ_UPDATE = 'PayloadBundleType.LAST_READ_UPDATE',
  LOCATION = 'PayloadBundleType.LOCATION',
  MEMBER_JOIN = 'PayloadBundleType.MEMBER_JOIN',
  MESSAGE_DELETE = 'PayloadBundleType.MESSAGE_DELETE',
  MESSAGE_EDIT = 'PayloadBundleType.MESSAGE_EDIT',
  MESSAGE_HIDE = 'PayloadBundleType.MESSAGE_HIDE',
  PING = 'PayloadBundleType.PING',
  REACTION = 'PayloadBundleType.REACTION',
  TEXT = 'PayloadBundleType.TEXT',
  TIMER_UPDATE = 'PayloadBundleType.TIMER_UPDATE',
  TYPING = 'PayloadBundleType.TYPING',
  UNKNOWN = 'PayloadBundleType.UNKNOWN',
}
