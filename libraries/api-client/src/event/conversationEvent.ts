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

import {SUBCONVERSATION_ID} from '../conversation';
import {
  ConversationAccessUpdateData,
  ConversationCodeUpdateData,
  ConversationConnectRequestData,
  ConversationCreateData,
  ConversationMemberJoinData,
  ConversationMemberLeaveData,
  ConversationMemberUpdateData,
  ConversationMessageTimerUpdateData,
  ConversationOtrMessageAddData,
  ConversationReceiptModeUpdateData,
  ConversationRenameData,
  ConversationTypingData,
  ConversationMLSWelcomeData,
  ConversationMLSMessageAddData,
} from '../conversation/data/';
import {ConversationAddPermissionUpdateData} from '../conversation/data/ConversationAddPermissionUpdateData';
import {ConversationMLSResetData} from '../conversation/data/ConversationMLSResetData';
import {ConversationProtocolUpdateData} from '../conversation/data/ConversationProtocolUpdateData';
import {QualifiedId} from '../user';

export enum CONVERSATION_EVENT {
  ACCESS_UPDATE = 'conversation.access-update',
  PROTOCOL_UPDATE = 'conversation.protocol-update',
  CODE_DELETE = 'conversation.code-delete',
  CODE_UPDATE = 'conversation.code-update',
  CONNECT_REQUEST = 'conversation.connect-request',
  CREATE = 'conversation.create',
  DELETE = 'conversation.delete',
  MEMBER_JOIN = 'conversation.member-join',
  MEMBER_LEAVE = 'conversation.member-leave',
  MEMBER_UPDATE = 'conversation.member-update',
  MESSAGE_TIMER_UPDATE = 'conversation.message-timer-update',
  OTR_MESSAGE_ADD = 'conversation.otr-message-add',
  MLS_MESSAGE_ADD = 'conversation.mls-message-add',
  MLS_WELCOME_MESSAGE = 'conversation.mls-welcome',
  MLS_RESET = 'conversation.mls-reset',
  RECEIPT_MODE_UPDATE = 'conversation.receipt-mode-update',
  ADD_PERMISSION_UPDATE = 'conversation.add-permission-update',
  RENAME = 'conversation.rename',
  TYPING = 'conversation.typing',
}

export type ConversationEventData =
  | ConversationAccessUpdateData
  | ConversationProtocolUpdateData
  | ConversationCodeUpdateData
  | ConversationConnectRequestData
  | ConversationCreateData
  | ConversationMemberJoinData
  | ConversationMemberLeaveData
  | ConversationMemberUpdateData
  | ConversationMessageTimerUpdateData
  | ConversationOtrMessageAddData
  | ConversationMLSWelcomeData
  | ConversationMLSMessageAddData
  | ConversationMLSResetData
  | ConversationReceiptModeUpdateData
  | ConversationRenameData
  | ConversationTypingData
  | ConversationAddPermissionUpdateData
  | null;

export type ConversationEvent =
  | ConversationAccessUpdateEvent
  | ConversationProtocolUpdateEvent
  | ConversationCodeDeleteEvent
  | ConversationConnectRequestEvent
  | ConversationCreateEvent
  | ConversationDeleteEvent
  | ConversationMemberJoinEvent
  | ConversationMemberLeaveEvent
  | ConversationMemberUpdateEvent
  | ConversationMessageTimerUpdateEvent
  | ConversationOtrMessageAddEvent
  | ConversationMLSMessageAddEvent
  | ConversationMLSResetEvent
  | ConversationMLSWelcomeEvent
  | ConversationReceiptModeUpdateEvent
  | ConversationRenameEvent
  | ConversationTypingEvent
  | ConversationAddPermissionUpdateEvent;

export interface BaseConversationEvent {
  conversation: string;
  data: ConversationEventData;
  from: string;
  qualified_conversation?: QualifiedId;
  qualified_from?: QualifiedId;
  time: string;
  server_time?: string;
  type: CONVERSATION_EVENT;
}

export interface ConversationAccessUpdateEvent extends BaseConversationEvent {
  data: ConversationAccessUpdateData;
  type: CONVERSATION_EVENT.ACCESS_UPDATE;
}

export interface ConversationProtocolUpdateEvent extends BaseConversationEvent {
  data: ConversationProtocolUpdateData;
  type: CONVERSATION_EVENT.PROTOCOL_UPDATE;
}

export interface ConversationCodeDeleteEvent extends BaseConversationEvent {
  data: null;
  type: CONVERSATION_EVENT.CODE_DELETE;
}

export interface ConversationCodeUpdateEvent extends BaseConversationEvent {
  data: ConversationCodeUpdateData;
  type: CONVERSATION_EVENT.CODE_UPDATE;
}

export interface ConversationConnectRequestEvent extends BaseConversationEvent {
  data: ConversationConnectRequestData;
  type: CONVERSATION_EVENT.CONNECT_REQUEST;
}

export interface ConversationCreateEvent extends BaseConversationEvent {
  data: ConversationCreateData;
  type: CONVERSATION_EVENT.CREATE;
}

export interface ConversationDeleteEvent extends BaseConversationEvent {
  data: null;
  type: CONVERSATION_EVENT.DELETE;
}

export interface ConversationMemberJoinEvent extends BaseConversationEvent {
  data: ConversationMemberJoinData;
  type: CONVERSATION_EVENT.MEMBER_JOIN;
}

export interface ConversationMemberLeaveEvent extends BaseConversationEvent {
  data: ConversationMemberLeaveData;
  type: CONVERSATION_EVENT.MEMBER_LEAVE;
}

export interface ConversationMemberUpdateEvent extends BaseConversationEvent {
  data: ConversationMemberUpdateData;
  type: CONVERSATION_EVENT.MEMBER_UPDATE;
}

export interface ConversationMessageTimerUpdateEvent extends BaseConversationEvent {
  data: ConversationMessageTimerUpdateData;
  type: CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE;
}

export interface ConversationOtrMessageAddEvent extends BaseConversationEvent {
  data: ConversationOtrMessageAddData;
  type: CONVERSATION_EVENT.OTR_MESSAGE_ADD;
}

export interface ConversationMLSMessageAddEvent extends BaseConversationEvent {
  data: ConversationMLSMessageAddData;
  type: CONVERSATION_EVENT.MLS_MESSAGE_ADD;
  /** if the message is sent in a subconversation, there is the identifier of the subconversation */
  subconv?: SUBCONVERSATION_ID;
  senderClientId: string;
}

export interface ConversationMLSWelcomeEvent extends BaseConversationEvent {
  data: ConversationMLSWelcomeData;
  type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE;
}

export interface ConversationMLSResetEvent extends BaseConversationEvent {
  data: ConversationMLSResetData;
  type: CONVERSATION_EVENT.MLS_RESET;
}

export interface ConversationReceiptModeUpdateEvent extends BaseConversationEvent {
  data: ConversationReceiptModeUpdateData;
  type: CONVERSATION_EVENT.RECEIPT_MODE_UPDATE;
}

export interface ConversationRenameEvent extends BaseConversationEvent {
  data: ConversationRenameData;
  type: CONVERSATION_EVENT.RENAME;
}

export interface ConversationTypingEvent extends BaseConversationEvent {
  data: ConversationTypingData;
  type: CONVERSATION_EVENT.TYPING;
}

export interface ConversationAddPermissionUpdateEvent extends BaseConversationEvent {
  data: ConversationAddPermissionUpdateData;
  type: CONVERSATION_EVENT.ADD_PERMISSION_UPDATE;
}
