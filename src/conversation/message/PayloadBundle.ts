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

import {ConversationEventData, TeamEventData, UserEventData} from '@wireapp/api-client/lib/event/';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Message} from './Message';
import {MessageSendingState} from './Message.types';

import {NotificationSource} from '../../notification';
import {ConversationContent} from '../content';

export type PayloadBundleContent = ConversationContent | ConversationEventData | TeamEventData | UserEventData;

export interface BasePayloadBundle {
  content: PayloadBundleContent;
  conversation: string;
  qualifiedConversation?: QualifiedId;
  from: string;
  qualifiedFrom?: QualifiedId;
  fromClientId?: string;
  id: string;
  messageTimer?: number;
  source: NotificationSource;
  state: MessageSendingState;
  timestamp: number;
  type: PayloadBundleType;
}

export type PayloadBundle = Message | BasePayloadBundle;

export enum PayloadBundleType {
  ASSET = 'PayloadBundleType.ASSET',
  ASSET_ABORT = 'PayloadBundleType.ASSET_ABORT',
  ASSET_IMAGE = 'PayloadBundleType.ASSET_IMAGE',
  ASSET_META = 'PayloadBundleType.ASSET_META',
  BUTTON_ACTION = 'PayloadBundleType.BUTTON_ACTION',
  BUTTON_ACTION_CONFIRMATION = 'PayloadBundleType.BUTTON_ACTION_CONFIRMATION',
  CALL = 'PayloadBundleType.CALL',
  CLIENT_ACTION = 'PayloadBundleType.CLIENT_ACTION',
  CLIENT_ADD = 'PayloadBundleType.CLIENT_ADD',
  CLIENT_REMOVE = 'PayloadBundleType.CLIENT_REMOVE',
  COMPOSITE = 'PayloadBundleType.COMPOSITE',
  CONFIRMATION = 'PayloadBundleType.CONFIRMATION',
  CONNECTION_REQUEST = 'PayloadBundleType.CONNECTION_REQUEST',
  CONVERSATION_CLEAR = 'PayloadBundleType.CONVERSATION_CLEAR',
  CONVERSATION_RENAME = 'PayloadBundleType.CONVERSATION_RENAME',
  LOCATION = 'PayloadBundleType.LOCATION',
  MEMBER_JOIN = 'PayloadBundleType.MEMBER_JOIN',
  MESSAGE_DELETE = 'PayloadBundleType.MESSAGE_DELETE',
  MESSAGE_EDIT = 'PayloadBundleType.MESSAGE_EDIT',
  MESSAGE_HIDE = 'PayloadBundleType.MESSAGE_HIDE',
  MLS_WELCOME_MESSAGE = 'PayloadBundleType.MLS_WELCOME',
  PING = 'PayloadBundleType.PING',
  REACTION = 'PayloadBundleType.REACTION',
  IN_CALL_EMOJI = 'PayloadBundleType.IN_CALL_EMOJI',
  IN_CALL_HAND_RAISE = 'PayloadBundleType.IN_CALL_HAND_RAISE',
  TEAM_CONVERSATION_CREATE = 'PayloadBundleType.TEAM_CONVERSATION_CREATE',
  TEAM_CONVERSATION_DELETE = 'PayloadBundleType.TEAM_CONVERSATION_DELETE',
  TEAM_DELETE = 'PayloadBundleType.TEAM_DELETE',
  TEAM_MEMBER_JOIN = 'PayloadBundleType.TEAM_MEMBER_JOIN',
  TEAM_MEMBER_LEAVE = 'PayloadBundleType.TEAM_MEMBER_LEAVE',
  TEAM_UPDATE = 'PayloadBundleType.TEAM_UPDATE',
  TEXT = 'PayloadBundleType.TEXT',
  TIMER_UPDATE = 'PayloadBundleType.TIMER_UPDATE',
  TYPING = 'PayloadBundleType.TYPING',
  UNKNOWN = 'PayloadBundleType.UNKNOWN',
  USER_ACTIVATE = 'PayloadBundleType.USER_ACTIVATE',
  USER_CLIENT_ADD = 'PayloadBundleType.USER_CLIENT_ADD',
  USER_CLIENT_REMOVE = 'PayloadBundleType.USER_CLIENT_REMOVE',
  USER_CONNECTION = 'PayloadBundleType.USER_CONNECTION',
  USER_DELETE = 'PayloadBundleType.USER_DELETE',
  USER_LEGAL_HOLD_DISABLE = 'PayloadBundleType.USER_LEGAL_HOLD_DISABLE',
  USER_LEGAL_HOLD_ENABLE = 'PayloadBundleType.USER_LEGAL_HOLD_ENABLE',
  USER_LEGAL_HOLD_REQUEST = 'PayloadBundleType.USER_LEGAL_HOLD_REQUEST',
  USER_PROPERTIES_SET = 'PayloadBundleType.USER_PROPERTIES_SET',
  USER_UPDATE = 'PayloadBundleType.USER_UPDATE',
  MULTIPART = 'PayloadBundleType.MULTIPART',
}
