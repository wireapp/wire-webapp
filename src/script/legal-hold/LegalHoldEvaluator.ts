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

import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

type MappedEventData = {
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

// @see https://github.com/wearezeta/documentation/blob/master/topics/legal-hold/use-cases/009-receive-message.png
export const hasMessageLegalHoldFlag = (messageData: MappedEventData): boolean => {
  return messageData.legal_hold_status !== LegalHoldStatus.UNKNOWN;
};

export const renderLegalHoldMessage = (
  messageData: MappedEventData,
  localConversationState: LegalHoldStatus,
): boolean => {
  if (hasMessageLegalHoldFlag(messageData)) {
    return messageData.legal_hold_status !== localConversationState;
  }
  return false;
};

export const haveMessagesChangedLegalHoldState = (
  messageData: MappedEventData[],
  localConversationState: LegalHoldStatus,
): boolean => {
  return messageData.some(
    ({legal_hold_status}) =>
      legal_hold_status !== LegalHoldStatus.UNKNOWN && legal_hold_status !== localConversationState,
  );
};

export const getLegalHoldChangedComparator = (oldState: LegalHoldStatus): ((newState: LegalHoldStatus) => boolean) => {
  return (newState: LegalHoldStatus) => oldState !== newState;
};
