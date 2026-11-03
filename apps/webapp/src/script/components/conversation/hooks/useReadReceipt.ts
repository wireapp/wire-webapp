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

import {useCallback, useRef} from 'react';

import type {Clock, TimeoutIdentifier} from '@enormora/clock/clock';
import {isNonEmptyArray, isUndefined} from '@sindresorhus/is';
import {groupBy} from 'underscore';

import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/message';

type ReadMessageBuffer = {conversation: Conversation; message: Message; generation: number};
type ReadReceiptClock = Pick<Clock, 'setTimeout' | 'clearTimeout'>;

type UseReadReceiptSenderOptions = {
  readonly messageSender: Pick<MessageRepository, 'sendReadReceipt'>;
  readonly clock: ReadReceiptClock;
};

const DEBOUNCE = 500;

type UseReadReceiptSenderResult = {
  addReadReceiptToBatch: (conversation: Conversation, message: Message) => void;
  cancelPendingReadReceiptsForConversation: (conversation: Conversation) => void;
};
export const useReadReceiptSender = (options: UseReadReceiptSenderOptions): UseReadReceiptSenderResult => {
  const {messageSender, clock} = options;
  const readMessagesBuffer = useRef<ReadMessageBuffer[]>([]);
  const flushTimer = useRef<TimeoutIdentifier | undefined>(undefined);

  const flush = useCallback(() => {
    const readMessages = readMessagesBuffer.current.filter(({conversation, generation}) => {
      return !conversation.isAutoReadSuppressed() && conversation.autoReadGeneration === generation;
    });
    readMessagesBuffer.current = [];
    const scheduledFlushTimer = flushTimer.current;
    if (!isUndefined(scheduledFlushTimer)) {
      clock.clearTimeout(scheduledFlushTimer);
    }
    flushTimer.current = undefined;

    if (isNonEmptyArray(readMessages)) {
      const groupedMessages = groupBy(readMessages, ({conversation, message}) => {
        return conversation.id + message.from;
      });

      Object.values(groupedMessages).forEach(readMessagesBatch => {
        const [firstEntry, ...otherEntries] = readMessagesBatch;

        if (firstEntry !== undefined) {
          const {conversation, message: firstMessage} = firstEntry;
          const otherMessageIds = otherEntries.map(({message}) => {
            return message;
          });
          messageSender.sendReadReceipt(conversation, firstMessage, otherMessageIds);
        }
      });
    }
  }, [clock, messageSender]);

  const cancelPendingReadReceiptsForConversation = useCallback(
    (conversationToCancel: Conversation): void => {
      readMessagesBuffer.current = readMessagesBuffer.current.filter(readMessage => {
        return (
          readMessage.conversation.id !== conversationToCancel.id ||
          readMessage.conversation.domain !== conversationToCancel.domain
        );
      });

      if (!isNonEmptyArray(readMessagesBuffer.current) && !isUndefined(flushTimer.current)) {
        clock.clearTimeout(flushTimer.current);
        flushTimer.current = undefined;
      }
    },
    [clock],
  );

  return {
    addReadReceiptToBatch: (conversation: Conversation, message: Message) => {
      if (conversation.isAutoReadSuppressed()) {
        return;
      }
      // Check that the message has not already been batched for a future read receipt
      const hasBatchedReadReceipts = readMessagesBuffer.current.some(readReceipt => {
        return readReceipt.message.id === message.id;
      });
      if (hasBatchedReadReceipts) {
        return;
      }

      if (!isUndefined(flushTimer.current)) {
        clock.clearTimeout(flushTimer.current);
      }

      // add the message in the buffer of read messages (actual read receipt will be sent in the next batch)
      const entry = {conversation, message, generation: conversation.autoReadGeneration};
      readMessagesBuffer.current = readMessagesBuffer.current.concat(entry);
      flushTimer.current = clock.setTimeout(flush, DEBOUNCE);
    },
    cancelPendingReadReceiptsForConversation,
  };
};
