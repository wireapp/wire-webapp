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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {
  ProteusConversation,
  isMixedConversation,
  isProteusConversation,
} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';

import {mlsMigrationLogger} from '../MLSMigrationLogger';

interface MigrationInitConversationHandler {
  updateConversationProtocol: (
    conversation: Conversation,
    protocol: CONVERSATION_PROTOCOL.MLS | CONVERSATION_PROTOCOL.MIXED,
  ) => Promise<Conversation>;
  tryEstablishingMLSGroup: (params: {
    groupId: string;
    conversationId: QualifiedId;
    selfUserId: QualifiedId;
    qualifiedUsers: QualifiedId[];
  }) => Promise<void>;
}

/**
 * Will initialise MLS migration for provided proteus conversations.
 *
 * @param proteusConversations - proteus conversations to initialise MLS migration for
 * @param core - instance of core
 * @param conversationRepository - conversation repository
 * @param selfUserId - id of the current (self) user
 */
export const initialiseMigrationOfProteusConversations = async (
  conversations: Conversation[],
  selfUserId: QualifiedId,
  {updateConversationProtocol, tryEstablishingMLSGroup}: MigrationInitConversationHandler,
) => {
  const proteusConversations = conversations.filter(isProteusConversation);
  if (proteusConversations.length < 1) {
    return;
  }

  mlsMigrationLogger.info(`Initialising MLS migration for ${proteusConversations.length} "proteus" conversations`);
  for (const proteusConversation of proteusConversations) {
    await initialiseMigrationOfProteusConversation(proteusConversation, selfUserId, {
      updateConversationProtocol,
      tryEstablishingMLSGroup,
    });
  }
};

const initialiseMigrationOfProteusConversation = async (
  proteusConversation: ProteusConversation,
  selfUserId: QualifiedId,
  {updateConversationProtocol, tryEstablishingMLSGroup}: MigrationInitConversationHandler,
) => {
  mlsMigrationLogger.info(
    `Initialising MLS migration for "proteus" conversation: ${proteusConversation.qualifiedId.id}`,
  );

  try {
    //update conversation protocol on both backend and local store
    const updatedMixedConversation = await updateConversationProtocol(proteusConversation, CONVERSATION_PROTOCOL.MIXED);

    //we have to make sure that conversation's protocol has really changed to mixed and it contains groupId
    if (!isMixedConversation(updatedMixedConversation)) {
      throw new Error(`Conversation ${updatedMixedConversation.qualifiedId.id} was not updated to mixed protocol.`);
    }

    mlsMigrationLogger.info(
      `Conversation ${updatedMixedConversation.qualifiedId.id} was updated to mixed protocol successfully, trying to initialise MLS Group...`,
    );

    const otherUsersToAdd = updatedMixedConversation.participating_user_ids();

    await tryEstablishingMLSGroup({
      conversationId: updatedMixedConversation.qualifiedId,
      groupId: updatedMixedConversation.groupId,
      qualifiedUsers: otherUsersToAdd,
      selfUserId: selfUserId,
    });
  } catch (error) {
    mlsMigrationLogger.error(
      `Error while initialising MLS migration for "proteus" conversation: ${proteusConversation.qualifiedId.id}`,
      error,
    );
  }
};
