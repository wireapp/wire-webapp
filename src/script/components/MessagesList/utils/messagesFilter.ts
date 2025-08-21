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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';

import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {ProtocolUpdateMessage} from 'Repositories/entity/message/ProtocolUpdateMessage';
import {SystemMessage} from 'Repositories/entity/message/SystemMessage';
import {ClientEvent} from 'Repositories/event/Client';

import {isMemberMessage} from '../../../guards/Message';

/**
 * Filters out duplicated system messages.
 * It can happen that the backend sends us an event we've created (we've already received directly from an api call response, e.g. when renaming a conversation).
 * @param messages - messages to filter
 * @returns filtered messages
 */
const filterDuplicatedSystemMessages = (messages: MessageEntity[]) => {
  return messages.reduce<MessageEntity[]>((uniqMessages, currentMessage) => {
    if (isMemberMessage(currentMessage)) {
      const typesToFilter = [
        CONVERSATION_EVENT.MEMBER_JOIN,
        CONVERSATION_EVENT.MEMBER_LEAVE,
        ClientEvent.CONVERSATION.GROUP_CREATION,
      ] as string[];

      const uniqMemberMessages = uniqMessages.filter(isMemberMessage);

      if (!!uniqMemberMessages.length && typesToFilter.includes(currentMessage.type)) {
        switch (currentMessage.type) {
          case ClientEvent.CONVERSATION.GROUP_CREATION:
            // Dont show duplicated group creation messages
            if (uniqMemberMessages.some(m => m.type === currentMessage.type)) {
              return uniqMessages;
            }
          case CONVERSATION_EVENT.MEMBER_JOIN:
          case CONVERSATION_EVENT.MEMBER_LEAVE:
            // Dont show duplicated member join/leave messages that follow each other
            if (uniqMemberMessages?.[uniqMemberMessages.length - 1]?.hash() === currentMessage.hash()) {
              return uniqMessages;
            }
        }
      }
    }

    if (currentMessage.isSystem()) {
      const systemMessagesToFilter = [CONVERSATION_EVENT.RENAME, CONVERSATION_EVENT.PROTOCOL_UPDATE] as string[];
      if (systemMessagesToFilter.includes(currentMessage.type)) {
        const uniqUpdateMessages = uniqMessages.filter(
          (message): message is SystemMessage => message.isSystem() && systemMessagesToFilter.includes(message.type),
        );

        if (uniqUpdateMessages.length > 0) {
          const prevMessage = uniqUpdateMessages?.[uniqUpdateMessages.length - 1];
          if (!prevMessage) {
            return [...uniqMessages, currentMessage];
          }

          if (prevMessage.isConversationRename() && currentMessage.isConversationRename()) {
            // for rename messages, only name changes are relevant, caption stays the same
            if (prevMessage.name === currentMessage.name) {
              return uniqMessages;
            }
            return [...uniqMessages, currentMessage];
          }

          if (prevMessage instanceof ProtocolUpdateMessage && currentMessage instanceof ProtocolUpdateMessage) {
            // for protocol update messages, only protocol changes are relevant
            if (prevMessage.protocol === currentMessage.protocol) {
              return uniqMessages;
            }
            return [...uniqMessages, currentMessage];
          }

          // Dont show duplicated system messages that follow each other
          if (prevMessage.caption === currentMessage.caption) {
            return uniqMessages;
          }
        }
      }
    }

    return [...uniqMessages, currentMessage];
  }, []);
};

const filterHiddenMessages = (messages: MessageEntity[]) => messages.filter(message => message.visible());

export const filterMessages = (messages: MessageEntity[]) => {
  return filterHiddenMessages(filterDuplicatedSystemMessages(messages));
};
