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

import {Account} from '@wireapp/core';

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';

import {mlsMigrationLogger} from '../../MLSMigrationLogger';

interface JoinUnestablishedMixedConversationsParams {
  core: Account;
}

export const joinUnestablishedMixedConversations = async (
  mixedConversations: MixedConversation[],
  {core}: JoinUnestablishedMixedConversationsParams,
) => {
  mlsMigrationLogger.info(
    `Found ${mixedConversations.length} "mixed" conversations, checking if all of them have established MLS groups...`,
  );

  for (const mixedConversation of mixedConversations) {
    await joinUnestablishedMixedConversation(mixedConversation, {core});
  }
};

const joinUnestablishedMixedConversation = async (
  mixedConversation: MixedConversation,
  {core}: JoinUnestablishedMixedConversationsParams,
) => {
  const conversationService = core.service?.conversation;
  if (!conversationService) {
    throw new Error('ConversationService is not available');
  }

  const isMLSGroupAlreadyEstablished = await conversationService.isMLSConversationEstablished(
    mixedConversation.groupId,
  );

  if (isMLSGroupAlreadyEstablished) {
    return;
  }

  mlsMigrationLogger.info(
    `Found "mixed" conversation without established MLS group: ${mixedConversation.qualifiedId.id}, joining via external commit...`,
  );

  await conversationService.joinByExternalCommit(mixedConversation.qualifiedId);
};
