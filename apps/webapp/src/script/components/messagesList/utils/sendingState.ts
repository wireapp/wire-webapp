/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {StatusType} from '../../../message/statusType';
import type {Message} from '../../../repositories/entity/message/message';

type SendingState = 'sent' | 'pending' | 'failed';

function getSendingState(message: Message): SendingState {
  const status = message.status();
  if (status === StatusType.SENDING) {
    return 'pending';
  }
  if (status === StatusType.FAILED || status === StatusType.FEDERATION_ERROR) {
    return 'failed';
  }
  return 'sent';
}

/** Messages in another sending state than the one before them start a group of their own, with their own header */
export function startsSendingStateGroup(message: Message, previousMessage: Message | undefined): boolean {
  return previousMessage !== undefined && getSendingState(message) !== getSendingState(previousMessage);
}

/** The message the offline notice goes above: the first one that waits to be sent */
export function findFirstPendingMessage(messages: readonly Message[]): Message | undefined {
  return messages.find(message => {
    return message.isContent() && message.status() === StatusType.SENDING;
  });
}
