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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';

import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import type {Conversation} from 'Repositories/entity/conversation';
import type {User} from 'Repositories/entity/user';
import {CONVERSATION} from 'Repositories/event/client';

export type MappedEvent = Record<string, any> & {
  data?: MappedEventData | string;
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
  const selfUser = conversation.selfUser();
  const amIonLegalHold = selfUser !== undefined ? isUserOnLegalHold(selfUser) : false;
  const areOthersOnLegalHold = areSomeUsersOnLegalHold(conversation.participating_user_ets());
  return amIonLegalHold || areOthersOnLegalHold;
};

export const hasMessageLegalHoldFlag = (mappedEvent: MappedEvent): boolean => {
  const supportsLegalHoldFlag = [CONVERSATION.MESSAGE_ADD].includes(mappedEvent.type as CONVERSATION);
  const mappedEventData = mappedEvent.data;
  const hasLegalHoldFlag =
    mappedEventData !== undefined &&
    typeof mappedEventData !== 'string' &&
    typeof mappedEventData.legal_hold_status !== 'undefined' &&
    mappedEventData.legal_hold_status !== LegalHoldStatus.UNKNOWN;
  return supportsLegalHoldFlag && hasLegalHoldFlag;
};

export const renderLegalHoldMessage = (mappedEvent: MappedEvent, localConversationState: LegalHoldStatus): boolean => {
  const mappedEventData = mappedEvent.data;
  if (hasMessageLegalHoldFlag(mappedEvent) && mappedEventData !== undefined && typeof mappedEventData !== 'string') {
    return mappedEventData.legal_hold_status !== localConversationState;
  }
  return false;
};
