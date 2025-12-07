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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {isMixedConversation, MixedConversation} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {initMLSGroupConversation} from 'src/script/mls/MLSConversations';

import {Account} from '@wireapp/core';

import {mlsMigrationLogger} from '../../MLSMigrationLogger';

interface JoinUnestablishedMixedConversationsParams {
  core: Account;
}

export const joinUnestablishedMixedConversations = async (
  conversations: Conversation[],
  conversationRepository: ConversationRepository,
  selfUserId: QualifiedId,
  {core}: JoinUnestablishedMixedConversationsParams,
) => {
  const mixedConversations = conversations.filter(isMixedConversation);
  mlsMigrationLogger.info(`Found ${mixedConversations.length} "mixed" conversations, joining unestablished ones...`);

  for (const conversation of mixedConversations) {
    await joinUnestablishedMixedConversation(conversation, conversationRepository, selfUserId, {
      core,
    });
  }
};

export const joinUnestablishedMixedConversation = async (
  mixedConversation: MixedConversation,
  conversationRepository: ConversationRepository,
  selfUserId: QualifiedId,
  {core}: JoinUnestablishedMixedConversationsParams,
  shouldRetry = true,
) => {
  if (mixedConversation.epoch > 0) {
    return initMLSGroupConversation(mixedConversation, conversationRepository, {
      core,
      onError: ({id}, error) =>
        mlsMigrationLogger.error(`Failed when joining a mls group of mixed conversation with id ${id}, error: `, error),
    });
  }

  // It's possible that the client has updated the protocol to mixed and then crashed, before it has established the MLS group.
  // In this case, we should try to establish the MLS group again.
  mlsMigrationLogger.info(`Trying to establish MLS group for mixed conversation with id ${mixedConversation.id}`);

  const otherUsersToAdd = mixedConversation.participating_user_ids();

  try {
    await conversationRepository.tryEstablishingMLSGroup({
      conversationId: mixedConversation.qualifiedId,
      groupId: mixedConversation.groupId,
      qualifiedUsers: otherUsersToAdd,
      selfUserId: selfUserId,
    });
  } catch (error) {
    mlsMigrationLogger.error(
      `Failed to establish MLS group for mixed conversation with id ${mixedConversation.id}, error: `,
      error,
    );
    if (!shouldRetry) {
      return;
    }

    mlsMigrationLogger.info(`Retrying to join unestablished mixed conversation with id ${mixedConversation.id}`);
    await joinUnestablishedMixedConversation(mixedConversation, conversationRepository, selfUserId, {core}, false);
  }
};
