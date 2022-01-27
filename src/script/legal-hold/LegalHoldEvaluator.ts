/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import {CONVERSATION} from '../event/Client';

export type MappedEvent = Record<string, any> & {
  data?: MappedEventData;
  type: CONVERSATION_EVENT | CONVERSATION;
};

type MappedEventData = Record<string, any> & {
  expects_read_confirmation?: boolean;
  legal_hold_status?: LegalHoldStatus;
};

export const isUserOnLegalHold = (user: User): boolean => {
  return user.isOnLegalHold();
};

export const areSomeUsersOnLegalHold = (users: User[]): boolean => {
  return users.some(isUserOnLegalHold);
};

export const isConversationOnLegalHold = (conversation: Conversation): boolean => {
  const amIonLegalHold = isUserOnLegalHold(conversation.selfUser());
  const areOthersOnLegalHold = areSomeUsersOnLegalHold(conversation.participating_user_ets());
  return amIonLegalHold || areOthersOnLegalHold;
};

export const hasMessageLegalHoldFlag = (mappedEvent: MappedEvent): boolean => {
  const supportsLegalHoldFlag = [CONVERSATION.MESSAGE_ADD].includes(mappedEvent.type as CONVERSATION);
  const hasLegalHoldFlag =
    mappedEvent.data &&
    typeof mappedEvent.data.legal_hold_status !== 'undefined' &&
    mappedEvent.data.legal_hold_status !== LegalHoldStatus.UNKNOWN;
  return supportsLegalHoldFlag && hasLegalHoldFlag;
};

export const renderLegalHoldMessage = (mappedEvent: MappedEvent, localConversationState: LegalHoldStatus): boolean => {
  if (hasMessageLegalHoldFlag(mappedEvent)) {
    return mappedEvent.data.legal_hold_status !== localConversationState;
  }
  return false;
};
