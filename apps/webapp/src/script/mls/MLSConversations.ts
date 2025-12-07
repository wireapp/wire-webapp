/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {
  isMLSCapableConversation,
  isMLSConversation,
  isSelfConversation,
  isTeamConversation,
  MLSCapableConversation,
  MLSConversation,
} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {getLogger} from 'Util/Logger';

import {Account} from '@wireapp/core';

const logger = getLogger('Webapp/MLSConversations');

/**
 * Will initialize all the MLS conversations that the user is member of but that are not yet locally established.
 *
 * @param conversations - all the conversations that the user is part of
 * @param core - the instance of the core
 */
export async function initMLSGroupConversations(
  conversations: Conversation[],
  conversationRepository: ConversationRepository,
  {
    core,
    onSuccessfulJoin,
    onError,
  }: {
    core: Account;
    onSuccessfulJoin?: (conversation: Conversation) => void;
    onError?: (conversation: Conversation, error: unknown) => void;
  },
): Promise<void> {
  const {mls: mlsService, conversation: conversationService} = core.service || {};
  if (!mlsService || !conversationService) {
    throw new Error('MLS or Conversation service is not available!');
  }

  const mlsGroupConversations = conversations.filter(
    (conversation): conversation is MLSCapableConversation =>
      conversation.isGroupOrChannel() && isMLSCapableConversation(conversation),
  );

  for (const mlsConversation of mlsGroupConversations) {
    await initMLSGroupConversation(mlsConversation, conversationRepository, {
      core,
      onSuccessfulJoin,
      onError,
    });
  }
}

/**
 * Will initialize a single MLS conversation that the user is member of but that are not yet locally established.
 *
 * @param mlsConversation - the conversation to initialize
 * @param core - the instance of the core
 */
export async function initMLSGroupConversation(
  mlsConversation: MLSCapableConversation,
  conversationRepository: ConversationRepository,
  {
    core,
    onSuccessfulJoin,
    onError,
  }: {
    core: Account;
    onSuccessfulJoin?: (conversation: Conversation) => void;
    onError?: (conversation: Conversation, error: unknown) => void;
  },
): Promise<void> {
  const {mls: mlsService, conversation: conversationService} = core.service || {};
  if (!mlsService || !conversationService) {
    throw new Error('MLS or Conversation service is not available!');
  }

  try {
    const {groupId, qualifiedId} = mlsConversation;

    const doesMLSGroupExist = await conversationService.mlsGroupExistsLocally(groupId);

    // if group is already established, we just schedule periodic key material updates
    if (doesMLSGroupExist) {
      await mlsService.scheduleKeyMaterialRenewal(groupId);
      return;
    }

    // otherwise we should try to ensure the conversation exists (this will establish it if epoch is 0, or join by external commit if epoch > 0)
    console.info('Conversation does not exist, ensuring establishment');
    await conversationRepository.ensureConversationExists({
      groupId,
      conversationId: qualifiedId,
      epoch: mlsConversation.epoch,
      core,
    });

    onSuccessfulJoin?.(mlsConversation);
  } catch (error) {
    onError?.(mlsConversation, error);
  }
}

/**
 * Will register self and team MLS conversations.
 * The self conversation and the team conversation are special conversations created by noone and, thus, need to be manually created by the first device that detects them
 *
 * @param conversations all the conversations the user is part of
 * @param selfUser entity of the self user
 * @param selfClientId id of the current client
 * @param core instance of the core
 */
export async function initialiseSelfAndTeamConversations(
  conversations: Conversation[],
  conversationRepository: ConversationRepository,
  selfUser: User,
  selfClientId: string,
  core: Account,
): Promise<void> {
  const {mls: mlsService, conversation: conversationService} = core.service || {};
  if (!mlsService || !conversationService) {
    throw new Error('MLS or Conversation service is not available!');
  }

  const conversationsToEstablish = conversations.filter(
    (conversation): conversation is MLSConversation =>
      isMLSConversation(conversation) && (isSelfConversation(conversation) || isTeamConversation(conversation)),
  );

  await Promise.all(
    conversationsToEstablish.map(async conversation => {
      if (conversation.epoch < 1) {
        return mlsService.registerConversation(conversation.groupId, [selfUser.qualifiedId], {
          creator: {
            user: selfUser,
            client: selfClientId,
          },
        });
      }

      // If the conversation is already established, we don't need to do anything.
      const isGroupAlreadyEstablished = await mlsService.isConversationEstablished(conversation.groupId);
      logger.info('Checking if group is already established', {
        isGroupAlreadyEstablished,
        qualifiedId: conversation.qualifiedId,
      });
      if (isGroupAlreadyEstablished) {
        return Promise.resolve();
      }

      logger.info('Conversation does not exist, ensuring establishment', {
        conversationId: conversation.qualifiedId,
        groupId: conversation.groupId,
        epoch: conversation.epoch,
      });

      // Otherwise, we need to ensure the conversation exists by establishing it or joining it by external commit.
      await conversationRepository.ensureConversationExists({
        conversationId: conversation.qualifiedId,
        groupId: conversation.groupId,
        epoch: conversation.epoch,
        core,
      });
    }),
  );
}
