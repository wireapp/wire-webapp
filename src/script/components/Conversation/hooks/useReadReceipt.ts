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

import {groupBy} from 'underscore';

import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {Message} from 'src/script/entity/message/Message';

type ReadMessageBuffer = {conversation: Conversation; message: Message};

const DEBOUNCE = 500;

export const useReadReceiptSender = (sender: Pick<MessageRepository, 'sendReadReceipt'>) => {
  const readMessagesBuffer = useRef<ReadMessageBuffer[]>([]);
  const timer = useRef<number>();

  const sendReadReceiptBatch = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
    }

    const readMessages = readMessagesBuffer.current;
    if (readMessages.length) {
      const groupedMessages = groupBy(readMessages, ({conversation, message}) => conversation.id + message.from);

      timer.current = window.setTimeout(() => {
        Object.values(groupedMessages).forEach(readMessagesBatch => {
          const [firstEntry, ...otherEntries] = readMessagesBatch;

          if (firstEntry) {
            const {conversation, message: firstMessage} = firstEntry;
            const otherMessageIds = otherEntries.map(({message}) => message);
            sender.sendReadReceipt(conversation, firstMessage, otherMessageIds);
          }
        });
        readMessagesBuffer.current = [];
      }, DEBOUNCE);
    }
  }, [sender]);

  return {
    addReadReceiptToBatch: (conversation: Conversation, message: Message) => {
      // add the message in the buffer of read messages (actual read receipt will be sent in the next batch)
      const hasBatchedReadReceipts = readMessagesBuffer.current.some(
        readReceipt => readReceipt.message.id === message.id,
      );
      if (hasBatchedReadReceipts) {
        return;
      }
      const entry = {conversation, message};
      readMessagesBuffer.current = readMessagesBuffer.current.concat(entry);
      sendReadReceiptBatch();
    },
  };
};
