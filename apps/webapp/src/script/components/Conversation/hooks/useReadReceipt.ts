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

import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/Message';
import {groupBy} from 'underscore';

type ReadMessageBuffer = {conversation: Conversation; message: Message};

const DEBOUNCE = 500;

export const useReadReceiptSender = (messageSender: Pick<MessageRepository, 'sendReadReceipt'>) => {
  const readMessagesBuffer = useRef<ReadMessageBuffer[]>([]);
  const flushTimer = useRef<number>();

  const flush = useCallback(() => {
    const readMessages = readMessagesBuffer.current;
    if (readMessages.length) {
      const groupedMessages = groupBy(readMessages, ({conversation, message}) => conversation.id + message.from);

      Object.values(groupedMessages).forEach(readMessagesBatch => {
        const [firstEntry, ...otherEntries] = readMessagesBatch;

        if (firstEntry) {
          const {conversation, message: firstMessage} = firstEntry;
          const otherMessageIds = otherEntries.map(({message}) => message);
          messageSender.sendReadReceipt(conversation, firstMessage, otherMessageIds);
        }
      });
      readMessagesBuffer.current = [];
    }
  }, [messageSender]);

  return {
    addReadReceiptToBatch: (conversation: Conversation, message: Message) => {
      // Check that the message has not already been batched for a future read receipt
      const hasBatchedReadReceipts = readMessagesBuffer.current.some(
        readReceipt => readReceipt.message.id === message.id,
      );
      if (hasBatchedReadReceipts) {
        return;
      }

      if (flushTimer.current) {
        window.clearTimeout(flushTimer.current);
      }

      // add the message in the buffer of read messages (actual read receipt will be sent in the next batch)
      const entry = {conversation, message};
      readMessagesBuffer.current = readMessagesBuffer.current.concat(entry);
      flushTimer.current = window.setTimeout(flush, DEBOUNCE);
    },
  };
};
