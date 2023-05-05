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

import {ConversationProtocol, CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';

import {Account} from '@wireapp/core';

import {
  isProteusConversation,
  isMixedConversation,
  isMLSConversation,
  MixedConversation,
  MLSConversation,
  ProteusConversation,
} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';

/**
 * Will check the config of migration feature and try to initialise/finalise the migration on provided conversations.
 *
 * @param conversations - all the conversations that the user is part of
 * @param core - the instance of the core
 */
export const migrateConversationsToMLS = async ({
  conversations,
  core,
  isOwnedByTeam,
}: {
  conversations: Conversation[];
  core: Account;
  isOwnedByTeam: (conversation: Conversation) => boolean;
}) => {
  //TODO: implement logic for 1on1 conversations (both team owned and federated)
  const groupConversations = conversations.filter(
    conversation => conversation.type() === CONVERSATION_TYPE.REGULAR && isOwnedByTeam(conversation),
  );

  const {proteus: proteusConversations, mixed: mixedConversations} = groupConversationsByProtocol(groupConversations);

  await initialiseMigrationOfProteusConversations({proteusConversations, core});
  await finaliseMigrationOfMixedConversations({mixedConversations, core});
};

const initialiseMigrationOfProteusConversations = async ({
  proteusConversations,
  core,
}: {
  proteusConversations: ProteusConversation[];
  core: Account;
}) => {};

const finaliseMigrationOfMixedConversations = async ({
  mixedConversations,
  core,
}: {
  mixedConversations: MixedConversation[];
  core: Account;
}) => {};

const groupConversationsByProtocol = (conversations: Conversation[]) => {
  const groupedConversations: {
    [ConversationProtocol.PROTEUS]: ProteusConversation[];
    [ConversationProtocol.MIXED]: MixedConversation[];
    [ConversationProtocol.MLS]: MLSConversation[];
  } = {
    [ConversationProtocol.PROTEUS]: [],
    [ConversationProtocol.MIXED]: [],
    [ConversationProtocol.MLS]: [],
  };

  for (const conversation of conversations) {
    if (isProteusConversation(conversation)) {
      groupedConversations[ConversationProtocol.PROTEUS].push(conversation);
      continue;
    }
    if (isMixedConversation(conversation)) {
      groupedConversations[ConversationProtocol.MIXED].push(conversation);
      continue;
    }
    if (isMLSConversation(conversation)) {
      groupedConversations[ConversationProtocol.MLS].push(conversation);
      continue;
    }
  }

  return groupedConversations;
};
