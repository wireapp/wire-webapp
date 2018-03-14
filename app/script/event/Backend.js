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
window.z.event = z.event || {};

z.event.Backend = {
  CONVERSATION: {
    ACCESS_UPDATE: 'conversation.access-update',
    CODE_DELETE: 'conversation.code-delete',
    CODE_UPDATE: 'conversation.code-update',
    CONNECT_REQUEST: 'conversation.connect-request',
    CREATE: 'conversation.create',
    DELETE: 'conversation.delete',
    MEMBER_JOIN: 'conversation.member-join',
    MEMBER_LEAVE: 'conversation.member-leave',
    MEMBER_UPDATE: 'conversation.member-update',
    OTR_MESSAGE_ADD: 'conversation.otr-message-add',
    RENAME: 'conversation.rename',
    TYPING: 'conversation.typing',
  },
  TEAM: {
    CONVERSATION_CREATE: 'team.conversation-create',
    CONVERSATION_DELETE: 'team.conversation-delete',
    CREATE: 'team.create',
    DELETE: 'team.delete',
    MEMBER_JOIN: 'team.member-join',
    MEMBER_LEAVE: 'team.member-leave',
    MEMBER_UPDATE: 'team.member-update',
    UPDATE: 'team.update',
  },
  USER: {
    ACTIVATE: 'user.activate',
    CLIENT_ADD: 'user.client-add',
    CLIENT_REMOVE: 'user.client-remove',
    CONNECTION: 'user.connection',
    DELETE: 'user.delete',
    UPDATE: 'user.update',
  },
};
