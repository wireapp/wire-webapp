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

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {ProteusConversation} from 'src/script/conversation/ConversationSelectors';

import {mlsMigrationLogger} from './MLSMigrationLogger';

export const initialiseMigrationOfProteusConversations = async (
  proteusConversations: ProteusConversation[],
  {
    core,
    apiClient,
    conversationRepository,
  }: {
    core: Account;
    apiClient: APIClient;
    conversationRepository: ConversationRepository;
  },
) => {
  if (proteusConversations.length < 1) {
    return;
  }

  mlsMigrationLogger.info(`Initialising MLS migration for ${proteusConversations.length} "proteus" conversations`);
  for (const proteusConversation of proteusConversations) {
    await initialiseMigrationOfProteusConversation(proteusConversation, {core, apiClient, conversationRepository});
  }
};

const initialiseMigrationOfProteusConversation = async (
  proteusConversation: ProteusConversation,
  {
    core,
    apiClient,
    conversationRepository,
  }: {
    core: Account;
    apiClient: APIClient;
    conversationRepository: ConversationRepository;
  },
) => {
  mlsMigrationLogger.info(
    `Initialising MLS migration for "proteus" conversation: ${proteusConversation.qualifiedId.id}`,
  );

  try {
    //change the conversation protocol to mixed
    await apiClient.api.conversation.putConversationProtocol(
      proteusConversation.qualifiedId,
      ConversationProtocol.MIXED,
    );

    //refetch the conversation to get all new fields including groupId, epoch and new protocol
    const remoteConversationData = await apiClient.api.conversation.getConversation(proteusConversation.qualifiedId);
    await conversationRepository.updateConversationLocally(proteusConversation.id, remoteConversationData);

    //create MLS group with derived groupId
  } catch (error) {
    mlsMigrationLogger.error(
      `Error while initialising MLS migration for "proteus" conversation: ${proteusConversation.qualifiedId.id}`,
      error,
    );
  }
};
