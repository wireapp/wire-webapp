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

z.event.EventTypeHandling = {
  CONFIRM: [
    z.event.Client.CONVERSATION.ASSET_ADD,
    z.event.Client.CONVERSATION.KNOCK,
    z.event.Client.CONVERSATION.LOCATION,
    z.event.Client.CONVERSATION.MESSAGE_ADD,
  ],
  IGNORE: [z.event.Backend.CONVERSATION.TYPING],
  STORE: [
    z.event.Backend.CONVERSATION.MEMBER_JOIN,
    z.event.Backend.CONVERSATION.MEMBER_LEAVE,
    z.event.Backend.CONVERSATION.RENAME,
    z.event.Client.CONVERSATION.DELETE_EVERYWHERE,
    z.event.Client.CONVERSATION.GROUP_CREATION,
    z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    z.event.Client.CONVERSATION.KNOCK,
    z.event.Client.CONVERSATION.LOCATION,
    z.event.Client.CONVERSATION.MESSAGE_ADD,
    z.event.Client.CONVERSATION.MISSED_MESSAGES,
    z.event.Client.CONVERSATION.ONE2ONE_CREATION,
    z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE,
    z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT,
    z.event.Client.CONVERSATION.VERIFICATION,
    z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
  ],
};
