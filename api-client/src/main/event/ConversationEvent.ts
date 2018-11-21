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

import {
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  Conversation,
  ConversationMessageTimerUpdate,
  MemberUpdate,
} from '../conversation/';
import {BackendEvent} from './BackendEvent';

enum CONVERSATION_EVENT {
  ACCESS_UPDATE = 'conversation.access-update',
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
  RENAME = 'conversation.rename',
  TYPING = 'conversation.typing',
}

enum CONVERSATION_TYPING {
  STARTED = 'started',
  STOPPED = 'stopped',
}

interface ConversationEvent extends BackendEvent {
  conversation: string;
  data: {};
  from: string;
  time: string;
  type: CONVERSATION_EVENT;
}

interface ConversationAccessUpdateEvent extends ConversationEvent {
  data: {
    access:
      | CONVERSATION_ACCESS.PRIVATE
      | CONVERSATION_ACCESS.INVITE
      | CONVERSATION_ACCESS.LINK
      | CONVERSATION_ACCESS.CODE;
    access_role:
      | CONVERSATION_ACCESS_ROLE.ACTIVATED
      | CONVERSATION_ACCESS_ROLE.PRIVATE
      | CONVERSATION_ACCESS_ROLE.TEAM
      | CONVERSATION_ACCESS_ROLE.NON_ACTIVATED;
  };
  type: CONVERSATION_EVENT.ACCESS_UPDATE;
}

interface ConversationCodeDeleteEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.CODE_DELETE;
}

interface ConversationCodeUpdateEvent extends ConversationEvent {
  data: {
    code: string;
    key: string;
    uri: string;
  };
  type: CONVERSATION_EVENT.CODE_UPDATE;
}

interface ConversationConnectRequestEvent extends ConversationEvent {
  data: {
    recipient: string;
  };
  type: CONVERSATION_EVENT.CONNECT_REQUEST;
}

interface ConversationCreateEvent extends ConversationEvent {
  data: Conversation;
  type: CONVERSATION_EVENT.CREATE;
}

interface ConversationDeleteEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.DELETE;
}

interface ConversationMemberJoinEvent extends ConversationEvent {
  data: {
    user_ids: string[];
  };
  type: CONVERSATION_EVENT.MEMBER_JOIN;
}

interface ConversationMemberLeaveEvent extends ConversationEvent {
  data: {
    user_ids: string[];
  };
  type: CONVERSATION_EVENT.MEMBER_LEAVE;
}

interface ConversationMemberUpdateEvent extends ConversationEvent {
  data: MemberUpdate;
  type: CONVERSATION_EVENT.MEMBER_UPDATE;
}

interface ConversationMessageTimerUpdateEvent extends ConversationEvent {
  data: ConversationMessageTimerUpdate;
  type: CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE;
}

interface ConversationOtrMessageAddEvent extends ConversationEvent {
  data: {
    recipient: string;
    sender: string;
    text: string;
  };
  type: CONVERSATION_EVENT.OTR_MESSAGE_ADD;
}

interface ConversationRenameEvent extends ConversationEvent {
  data: {
    name: string;
  };
  type: CONVERSATION_EVENT.RENAME;
}

interface ConversationTypingEvent extends ConversationEvent {
  data: {
    status: CONVERSATION_TYPING.STARTED | CONVERSATION_TYPING.STOPPED;
  };
  type: CONVERSATION_EVENT.TYPING;
}

export {
  CONVERSATION_EVENT,
  CONVERSATION_TYPING,
  ConversationAccessUpdateEvent,
  ConversationCodeDeleteEvent,
  ConversationCodeUpdateEvent,
  ConversationConnectRequestEvent,
  ConversationCreateEvent,
  ConversationDeleteEvent,
  ConversationEvent,
  ConversationMemberJoinEvent,
  ConversationMemberLeaveEvent,
  ConversationMemberUpdateEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationOtrMessageAddEvent,
  ConversationRenameEvent,
  ConversationTypingEvent,
};
