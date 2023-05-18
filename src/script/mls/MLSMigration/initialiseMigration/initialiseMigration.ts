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

import {Account} from '@wireapp/core';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {ProteusConversation, isMixedConversation} from 'src/script/conversation/ConversationSelectors';

import {addMixedConversationMembersToMLSGroup} from '../addMixedConversationMembersToMLSGroup';
import {mlsMigrationLogger} from '../MLSMigrationLogger';

interface InitialiseMigrationOfProteusConversationParams {
  core: Account;
  conversationRepository: ConversationRepository;
  selfUserId: QualifiedId;
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
  proteusConversations: ProteusConversation[],
  {core, conversationRepository, selfUserId}: InitialiseMigrationOfProteusConversationParams,
) => {
  if (proteusConversations.length < 1) {
    return;
  }

  mlsMigrationLogger.info(`Initialising MLS migration for ${proteusConversations.length} "proteus" conversations`);
  for (const proteusConversation of proteusConversations) {
    await initialiseMigrationOfProteusConversation(proteusConversation, {
      core,
      conversationRepository,
      selfUserId,
    });
  }
};

const initialiseMigrationOfProteusConversation = async (
  proteusConversation: ProteusConversation,
  {core, conversationRepository, selfUserId}: InitialiseMigrationOfProteusConversationParams,
) => {
  mlsMigrationLogger.info(
    `Initialising MLS migration for "proteus" conversation: ${proteusConversation.qualifiedId.id}`,
  );

  try {
    //update conversation protocol on both backend and local store
    const updatedMixedConversation = await conversationRepository.updateConversationProtocol(
      proteusConversation,
      ConversationProtocol.MIXED,
    );

    //we have to make sure that conversation's protocol is mixed and it contains groupId
    if (!isMixedConversation(updatedMixedConversation)) {
      throw new Error(`Conversation ${updatedMixedConversation.qualifiedId.id} was not updated to mixed protocol.`);
    }

    //create MLS group with derived groupId
    const {mls: mlsService} = core.service || {};
    if (!mlsService) {
      throw new Error('MLS service is not available!');
    }

    const {groupId} = updatedMixedConversation;

    const isMLSGroupAlreadyEstablished = await mlsService.conversationExists(groupId);
    if (isMLSGroupAlreadyEstablished) {
      mlsMigrationLogger.info(
        `MLS Group for conversation ${updatedMixedConversation.qualifiedId.id} already exists, skipping the initialisation.`,
      );
      return;
    }

    //we try to register empty conversation
    const groupCreationResponse = await mlsService.registerConversation(groupId, [], {
      user: selfUserId,
      client: core.clientId,
    });

    //if there's no response, it means that commit bundle was not sent successfully
    //at this point we should wipe conversation locally
    //it's possible that somebody else has already created the group,
    //we should wait for the welcome message or try joining with external commit later
    if (!groupCreationResponse) {
      mlsMigrationLogger.info(
        `MLS Group for conversation ${updatedMixedConversation.qualifiedId.id} was not created, wiping the conversation.`,
      );
      await mlsService.wipeConversation(groupId);
      return;
    }

    mlsMigrationLogger.info(
      `MLS Group for conversation ${updatedMixedConversation.qualifiedId.id} was initialised successfully, adding other users...`,
    );

    await addMixedConversationMembersToMLSGroup(updatedMixedConversation, {core, selfUserId});
  } catch (error) {
    mlsMigrationLogger.error(
      `Error while initialising MLS migration for "proteus" conversation: ${proteusConversation.qualifiedId.id}`,
      error,
    );
  }
};
