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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {KeyPackageClaimUser} from '@wireapp/core/lib/conversation';

import {Account} from '@wireapp/core';

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

/**
 * Will initialize all the MLS conversations that the user is member of but that are not yet locally established.
 *
 * @param conversations - all the conversations that the user is part of
 * @param core - the instance of the core
 */
export async function initMLSGroupConversations(
  conversations: Conversation[],
  selfUser: User,
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
    await initMLSGroupConversation(mlsConversation, selfUser.qualifiedId, {
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
  selfUserQualifiedId: QualifiedId,
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

    //if group is already established, we just schedule periodic key material updates
    if (doesMLSGroupExist) {
      await mlsService.scheduleKeyMaterialRenewal(groupId);
      return;
    }

    //otherwise we should try joining via external commit
    await conversationService.joinByExternalCommit(qualifiedId);
    await addOtherSelfClientsToMLSConversation(mlsConversation, selfUserQualifiedId, core.clientId, core);

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
      if (isGroupAlreadyEstablished) {
        return Promise.resolve();
      }

      // Otherwise, we need to join the conversation via external commit.
      await conversationService.joinByExternalCommit(conversation.qualifiedId);
      await addOtherSelfClientsToMLSConversation(conversation, selfUser.qualifiedId, selfClientId, core);
    }),
  );
}

/**
 * Will add all other user's self clients to the mls group.
 *
 * @param conversation id of the conversation
 * @param selfUserId id of the self user who's clients should be added
 * @param selfClientId id of the current client (that should be skipped)
 * @param core instance of the core
 */
export async function addOtherSelfClientsToMLSConversation(
  conversation: Conversation,
  selfUserId: QualifiedId,
  selfClientId: string,
  core: Account,
) {
  try {
    const {groupId, qualifiedId} = conversation;

    if (!groupId) {
      throw new Error(`No group id found for MLS conversation ${conversation.id}`);
    }

    const selfQualifiedUser: KeyPackageClaimUser = {
      ...selfUserId,
      skipOwnClientId: selfClientId,
    };

    await core.service?.conversation.addUsersToMLSConversation({
      conversationId: qualifiedId,
      groupId,
      qualifiedUsers: [selfQualifiedUser],
    });
  } catch (error) {
    console.warn(
      `Error when tried to add other self clients to MLS conversation ${conversation.qualifiedId.id} ${conversation.qualifiedId.domain}`,
      error,
    );
  }
}
