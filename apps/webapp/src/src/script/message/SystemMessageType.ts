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

/**
 * @todo Refactor to use member-join and member-leave instead of normal. It duplicates "SuperType".
 */
export enum SystemMessageType {
  CONNECTION_ACCEPTED = 'created-one-to-one',
  CONNECTION_CONNECTED = 'connected',
  CONNECTION_REQUEST = 'connecting',
  CONVERSATION_CREATE = 'created-group',
  CONVERSATION_DELETE = 'deleted-group',
  CONVERSATION_MESSAGE_TIMER_UPDATE = 'message-timer-update',
  CONVERSATION_RECEIPT_MODE_UPDATE = 'receipt-mode-update',
  CONVERSATION_RENAME = 'rename',
  CONVERSATION_PROTOCOL_UPDATE = 'protocol-update',
  JOINED_AFTER_MLS_MIGRATION = 'joined-after-mls-migration',
  MLS_MIGRATION_ONGOING_CALL = 'mls-migration-ongoing-call',
  CONVERSATION_RESUME = 'resume',
  MEMBER_JOIN = 'join',
  MEMBER_LEAVE = 'leave',
  NORMAL = 'normal',
  MLS_CONVERSATION_RECOVERED = 'mls-conversation-recovered',
  ONE2ONE_MIGRATED_TO_MLS = 'one2one-migrated-to-mls',
  E2EI_VERIFIED = 'e2ei-verified',
}
