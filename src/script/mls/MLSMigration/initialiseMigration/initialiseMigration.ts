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
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {KeyPackageClaimUser} from '@wireapp/core/lib/conversation';

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {ProteusConversation, isMixedConversation} from 'src/script/conversation/ConversationSelectors';

import {mlsMigrationLogger} from '../MLSMigrationLogger';

export const initialiseMigrationOfProteusConversations = async (
  proteusConversations: ProteusConversation[],
  {
    core,
    apiClient,
    conversationRepository,
    selfUserId,
  }: {
    core: Account;
    apiClient: APIClient;
    conversationRepository: ConversationRepository;
    selfUserId: QualifiedId;
  },
) => {
  if (proteusConversations.length < 1) {
    return;
  }

  mlsMigrationLogger.info(`Initialising MLS migration for ${proteusConversations.length} "proteus" conversations`);
  for (const proteusConversation of proteusConversations) {
    await initialiseMigrationOfProteusConversation(proteusConversation, {
      core,
      apiClient,
      conversationRepository,
      selfUserId,
    });
  }
};

const initialiseMigrationOfProteusConversation = async (
  proteusConversation: ProteusConversation,
  {
    core,
    apiClient,
    conversationRepository,
    selfUserId,
  }: {
    core: Account;
    apiClient: APIClient;
    conversationRepository: ConversationRepository;
    selfUserId: QualifiedId;
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

    //update fields that came after protocol update
    const {cipher_suite: cipherSuite, epoch, group_id: newGroupId, protocol} = remoteConversationData;
    const updatedConversation = ConversationMapper.updateProperties(proteusConversation, {
      cipherSuite,
      epoch,
      groupId: newGroupId,
      protocol,
    });

    //we have to make sure that conversation's protocol is mixed and it contains groupId
    if (!isMixedConversation(updatedConversation)) {
      throw new Error(`Conversation ${updatedConversation.qualifiedId.id} was not updated to mixed protocol.`);
    }

    //create MLS group with derived groupId
    const {mls: mlsService, conversation: conversationService} = core.service || {};
    if (!mlsService || !conversationService) {
      throw new Error('MLS and Conversation services are not available!');
    }

    const {participating_user_ids, groupId} = updatedConversation;

    const doesConversationExist = await mlsService.conversationExists(groupId);
    if (doesConversationExist) {
      mlsMigrationLogger.info(
        `MLS Group for conversation ${updatedConversation.qualifiedId.id} already exists, skipping the initialisation.`,
      );
      return;
    }

    //we try to register empty conversation
    const groupCreationResponse = await mlsService.registerConversation(groupId, [], {
      user: selfUserId,
      client: core.clientId,
    });

    //if there's no response, it means that commit bundle was not sent properly
    //at this point we should wipe conversation locally
    //it's possible that somebody else has already created the group,
    //we should wait for the welcome message or try joining with external commit later
    if (!groupCreationResponse) {
      mlsMigrationLogger.info(
        `MLS Group for conversation ${updatedConversation.qualifiedId.id} was not created, wiping the conversation.`,
      );
      await mlsService.wipeConversation(groupId);
      return;
    }

    mlsMigrationLogger.info(
      `MLS Group for conversation ${updatedConversation.qualifiedId.id} was initialised successfully, adding other users...`,
    );

    //if group was created successfully, we can add other clients to the group (including our own other clients, but skipping current client)
    const otherUsersToAdd = participating_user_ids();
    const usersToAdd: KeyPackageClaimUser[] = [...otherUsersToAdd, {...selfUserId, skipOwnClientId: core.clientId}];

    await conversationService.addUsersToMLSConversation({
      groupId,
      conversationId: updatedConversation.qualifiedId,
      qualifiedUsers: usersToAdd,
    });

    mlsMigrationLogger.info(
      `Added ${usersToAdd.length} users to MLS Group for conversation ${updatedConversation.qualifiedId.id}.`,
    );
  } catch (error) {
    mlsMigrationLogger.error(
      `Error while initialising MLS migration for "proteus" conversation: ${proteusConversation.qualifiedId.id}`,
      error,
    );
  }
};
