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

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';

import {mlsMigrationLogger} from '../../MLSMigrationLogger';

/**
 * Will try to establish MLS group for provided mixed conversation.
 *
 * @param mixedConversation - mixed conversation to establish MLS group for
 * @param core - instance of core
 * @param selfUserId - id of the current (self) user
 * @resolve boolean - true if client has initialised MLS group, false otherwise
 */
export const tryEstablishingMLSGroupForMixedConversation = async (
  mixedConversation: MixedConversation,
  {core, selfUserId}: {core: Account; selfUserId: QualifiedId},
): Promise<boolean> => {
  const {mls: mlsService} = core.service || {};
  if (!mlsService) {
    throw new Error('MLS service is not available!');
  }

  const {groupId} = mixedConversation;

  //client could receive welcome message in the meantime
  const isMLSGroupAlreadyEstablished = await mlsService.conversationExists(groupId);
  if (isMLSGroupAlreadyEstablished) {
    mlsMigrationLogger.info(
      `MLS Group for conversation ${mixedConversation.qualifiedId.id} already exists, skipping the initialisation.`,
    );
    return false;
  }

  //we try to register empty conversation
  try {
    await mlsService.registerConversation(groupId, [], {
      user: selfUserId,
      client: core.clientId,
    });
    return true;
  } catch (error) {
    //if an error is thrown it means that the commit bundle was not sent successfully
    //at this point we should wipe conversation locally
    //it's possible that somebody else has already created the group,
    //we should wait for the welcome message or try joining with external commit later
    mlsMigrationLogger.info(
      `MLS Group for conversation ${mixedConversation.qualifiedId.id} was not created, wiping the conversation.`,
    );
    await mlsService.wipeConversation(groupId);
    return false;
  }
};
