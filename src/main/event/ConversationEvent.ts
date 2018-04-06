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

import {BackendEvent} from './BackendEvent';
import {
  CONVERSATION_TYPE,
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  ConversationMembers,
  Conversation,
} from '../conversation';

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
  OTR_MESSAGE_ADD = 'conversation.otr-message-add',
  RENAME = 'conversation.rename',
  TYPING = 'conversation.typing',
}

enum CONVERSATION_TYPING {
  STARTED = 'started',
  STOPPED = 'stopped',
}

interface ConversationEvent extends BackendEvent {
  type: CONVERSATION_EVENT;
  conversation: string;
  from: string;
  time: string;
  data: {};
}

interface ConversationAccessUpdateEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.ACCESS_UPDATE;
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
}

interface ConversationCodeDeleteEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.CODE_DELETE;
}

interface ConversationCodeUpdateEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.CODE_UPDATE;
  data: {
    key: string;
    code: string;
    uri: string;
  };
}

interface ConversationConnectRequestEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.CONNECT_REQUEST;
  data: {
    recipient: string;
  };
}

interface ConversationCreateEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.CREATE;
  data: Conversation;
}

interface ConversationDeleteEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.DELETE;
}

interface ConversationMemberJoinEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.MEMBER_JOIN;
  data: {
    user_ids: string[];
  };
}

interface ConversationMemberLeaveEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.MEMBER_LEAVE;
  data: {
    user_ids: string[];
  };
}

interface ConversationMemberUpdateEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.MEMBER_UPDATE;
  data: {
    otr_muted?: boolean;
    otr_muted_ref?: string;
    otr_archived?: boolean;
    otr_archived_ref?: string;
    hidden?: boolean;
    hidden_ref?: string;
  };
}

interface ConversationOtrMessageAddEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.OTR_MESSAGE_ADD;
  data: {
    sender: string;
    recipient: string;
    text: string;
    data?: string;
  };
}

interface ConversationRenameEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.RENAME;
  data: {
    name: string;
  };
}

interface ConversationTypingEvent extends ConversationEvent {
  type: CONVERSATION_EVENT.TYPING;
  data: {
    status: CONVERSATION_TYPING.STARTED | CONVERSATION_TYPING.STOPPED;
  };
}

export {
  CONVERSATION_EVENT,
  CONVERSATION_TYPING,
  ConversationEvent,
  ConversationAccessUpdateEvent,
  ConversationCodeDeleteEvent,
  ConversationCodeUpdateEvent,
  ConversationConnectRequestEvent,
  ConversationCreateEvent,
  ConversationDeleteEvent,
  ConversationMemberJoinEvent,
  ConversationMemberLeaveEvent,
  ConversationMemberUpdateEvent,
  ConversationOtrMessageAddEvent,
  ConversationRenameEvent,
  ConversationTypingEvent,
};
