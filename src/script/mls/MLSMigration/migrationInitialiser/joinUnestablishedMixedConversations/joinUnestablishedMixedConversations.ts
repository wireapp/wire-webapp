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

import {Account} from '@wireapp/core';

import {isMixedConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {initMLSGroupConversations} from 'src/script/mls/MLSConversations';
import {partition} from 'Util/ArrayUtil';

import {mlsMigrationLogger} from '../../MLSMigrationLogger';

interface MigrationJoinMixedConversationHandler {
  tryEstablishingMLSGroup: (params: {
    groupId: string;
    conversationId: QualifiedId;
    selfUserId: QualifiedId;
    qualifiedUsers: QualifiedId[];
  }) => Promise<void>;
}

interface JoinUnestablishedMixedConversationsParams {
  core: Account;
  conversationHandler: MigrationJoinMixedConversationHandler;
}

export const joinUnestablishedMixedConversations = async (
  conversations: Conversation[],
  selfUserId: QualifiedId,
  {core, conversationHandler}: JoinUnestablishedMixedConversationsParams,
) => {
  const mixedConversations = conversations.filter(isMixedConversation);
  mlsMigrationLogger.info(`Found ${mixedConversations.length} "mixed" conversations, joining unestablished ones...`);

  const [establishedMixedConversations, unestablishedMixedConversations] = partition(
    mixedConversations,
    mixedConversation => mixedConversation.epoch > 0,
  );

  await initMLSGroupConversations(establishedMixedConversations, {
    core,
    onError: ({id}, error) =>
      mlsMigrationLogger.error(`Failed when joining a mls group of mixed conversation with id ${id}, error: `, error),
  });

  // It's possible that the client has updated the protocol to mixed and then crashed, before it has established the MLS group.
  // In this case, we should try to establish the MLS group again.
  for (const conversation of unestablishedMixedConversations) {
    mlsMigrationLogger.info(`Trying to establish MLS group for mixed conversation with id ${conversation.id}`);

    const otherUsersToAdd = conversation.participating_user_ids();

    try {
      await conversationHandler.tryEstablishingMLSGroup({
        conversationId: conversation.qualifiedId,
        groupId: conversation.groupId,
        qualifiedUsers: otherUsersToAdd,
        selfUserId: selfUserId,
      });
    } catch (error) {
      mlsMigrationLogger.error(
        `Failed to establish MLS group for mixed conversation with id ${conversation.id}, error: `,
        error,
      );
    }
  }
};
