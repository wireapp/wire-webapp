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

import {CONVERSATION_EVENT, ConversationEvent} from '@wireapp/api-client/lib/event';

import {ClientConversationEvent} from 'Repositories/conversation/EventBuilder';

import {ClientEvent} from './Client';

export function eventShouldBeStored(event: {type: any}): event is ClientConversationEvent | ConversationEvent {
  return EventTypeHandling.STORE.includes(event.type);
}

export const EventTypeHandling = {
  CONFIRM: [
    ClientEvent.CONVERSATION.ASSET_ADD,
    ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD,
    ClientEvent.CONVERSATION.KNOCK,
    ClientEvent.CONVERSATION.LOCATION,
    ClientEvent.CONVERSATION.MESSAGE_ADD,
    ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD,
  ],
  STORE: [
    CONVERSATION_EVENT.MEMBER_JOIN,
    CONVERSATION_EVENT.MEMBER_LEAVE,
    CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE,
    CONVERSATION_EVENT.RECEIPT_MODE_UPDATE,
    CONVERSATION_EVENT.RENAME,
    CONVERSATION_EVENT.PROTOCOL_UPDATE,
    ClientEvent.CONVERSATION.FEDERATION_STOP,
    ClientEvent.CONVERSATION.ASSET_ADD,
    ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD,
    ClientEvent.CONVERSATION.DELETE_EVERYWHERE,
    ClientEvent.CONVERSATION.GROUP_CREATION,
    ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    ClientEvent.CONVERSATION.KNOCK,
    ClientEvent.CONVERSATION.CALL_TIME_OUT,
    ClientEvent.CONVERSATION.FAILED_TO_ADD_USERS,
    ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE,
    ClientEvent.CONVERSATION.LOCATION,
    ClientEvent.CONVERSATION.MESSAGE_ADD,
    ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD,
    ClientEvent.CONVERSATION.REACTION,
    ClientEvent.CONVERSATION.MISSED_MESSAGES,
    ClientEvent.CONVERSATION.JOINED_AFTER_MLS_MIGRATION,
    ClientEvent.CONVERSATION.MLS_MIGRATION_ONGOING_CALL,
    ClientEvent.CONVERSATION.MLS_CONVERSATION_RECOVERED,
    ClientEvent.CONVERSATION.ONE2ONE_MIGRATED_TO_MLS,
    ClientEvent.CONVERSATION.ONE2ONE_CREATION,
    ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE,
    ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT,
    ClientEvent.CONVERSATION.VERIFICATION,
    ClientEvent.CONVERSATION.E2EI_VERIFICATION,
    ClientEvent.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
  ],
};
