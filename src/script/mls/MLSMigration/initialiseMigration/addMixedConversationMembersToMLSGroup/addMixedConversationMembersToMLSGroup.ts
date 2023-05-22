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
import {KeyPackageClaimUser} from '@wireapp/core/lib/conversation';

import {Account} from '@wireapp/core';

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';

import {mlsMigrationLogger} from '../../MLSMigrationLogger';

/**
 * Will add all existing members of mixed conversation to its MLS group.
 *
 * @param mixedConversation - mixed conversation to which group users should be added
 * @param core - instance of core
 * @param selfUserId - id of the current (self) user
 */
export const addMixedConversationMembersToMLSGroup = async (
  mixedConversation: MixedConversation,
  {core, selfUserId}: {core: Account; selfUserId: QualifiedId},
) => {
  //if group was created successfully, we can add other clients to the group (including our own other clients, but skipping current client)
  const otherUsersToAdd = mixedConversation.participating_user_ids();

  const usersToAdd: KeyPackageClaimUser[] = [...otherUsersToAdd, {...selfUserId, skipOwnClientId: core.clientId}];

  const conversationService = core.service?.conversation;

  if (!conversationService) {
    throw new Error('Conversation service is not available!');
  }

  const addUsersResponse = await conversationService.addUsersToMLSConversation({
    groupId: mixedConversation.groupId,
    conversationId: mixedConversation.qualifiedId,
    qualifiedUsers: usersToAdd,
  });

  mlsMigrationLogger.info(
    `Added ${usersToAdd.length} users to MLS Group for conversation ${mixedConversation.qualifiedId.id}.`,
  );

  return addUsersResponse;
};
