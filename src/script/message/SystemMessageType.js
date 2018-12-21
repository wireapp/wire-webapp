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

window.z = window.z || {};
window.z.message = z.message || {};

/**
 * Enum for different system message types.
 * @todo Refactor to use member-join and member-leave instead of normal. It duplicates "z.message.SuperType".
 * @type {z.message.SystemMessageType} Enum of system message types
 */
z.message.SystemMessageType = {
  CONNECTION_ACCEPTED: 'created-one-to-one',
  CONNECTION_CONNECTED: 'connected',
  CONNECTION_REQUEST: 'connecting',
  CONVERSATION_CREATE: 'created-group',
  CONVERSATION_MESSAGE_TIMER_UPDATE: 'message-timer-update',
  CONVERSATION_RECEIPT_MODE_UPDATE: 'receipt-mode-update',
  CONVERSATION_RENAME: 'rename',
  CONVERSATION_RESUME: 'resume',
  MEMBER_JOIN: 'join',
  MEMBER_LEAVE: 'leave',
  NORMAL: 'normal',
};
