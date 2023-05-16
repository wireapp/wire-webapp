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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {
  ProteusConversation,
  MixedConversation,
  MLSConversation,
  isProteusConversation,
  isMixedConversation,
  isMLSConversation,
} from './ConversationSelectors';

import {Conversation} from '../entity/Conversation';

type ConversationsGroupedByProtocol = {
  [ConversationProtocol.PROTEUS]: ProteusConversation[];
  [ConversationProtocol.MIXED]: MixedConversation[];
  [ConversationProtocol.MLS]: MLSConversation[];
};

/**
 * Will group the conversations by protocol field and return an object with the grouped conversations
 *
 * @param apiClient -the instance of the apiClient
 * @param core - the instance of the core
 */
export const groupConversationsByProtocol = (conversations: Conversation[]): ConversationsGroupedByProtocol => {
  return conversations.reduce<ConversationsGroupedByProtocol>(
    (acc, conversation) => {
      if (isProteusConversation(conversation)) {
        acc[ConversationProtocol.PROTEUS].push(conversation);
        return acc;
      }
      if (isMixedConversation(conversation)) {
        acc[ConversationProtocol.MIXED].push(conversation);
        return acc;
      }
      if (isMLSConversation(conversation)) {
        acc[ConversationProtocol.MLS].push(conversation);
        return acc;
      }
      return acc;
    },
    {
      [ConversationProtocol.PROTEUS]: [],
      [ConversationProtocol.MIXED]: [],
      [ConversationProtocol.MLS]: [],
    },
  );
};
