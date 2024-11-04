/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ClientEvent} from 'Repositories/event/Client';
import {ConversationRecord, EventRecord, UserRecord} from 'Repositories/storage';

export function preprocessEvents(events: EventRecord[]): EventRecord[] {
  // The verification message are not relevant for a new device (no conversation can be verified on a new device).
  return events.filter(event => event.type !== ClientEvent.CONVERSATION.VERIFICATION);
}

export function preprocessConversations(conversations: ConversationRecord[]): ConversationRecord[] {
  return conversations.map(conversation => {
    // On a new device, no conversation can be verified since the device has no verified connections with other users.
    // We need to delete that property to be sure we don't wrongly display a conversation as verified.
    delete (conversation as any).verification_state;
    return conversation;
  });
}

export function preprocessUsers(users: UserRecord[]): UserRecord[] {
  return users.map(user => {
    // The availability of a user is not relevant for a new device
    delete user.availability;
    return user;
  });
}
