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

import {ConversationRepository} from '../conversation/ConversationRepository';
import {
  isMLSCapableConversation,
  isMLSConversation,
  isSelfConversation,
  isTeamConversation,
  MLSConversation,
} from '../conversation/ConversationSelectors';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

type MLSConversationRepository = Pick<
  ConversationRepository,
  'findConversationByGroupId' | 'getConversationById' | 'conversationRoleRepository'
>;

/**
 * Will initialize all the MLS conversations that the user is member of but that are not yet locally established.
 *
 * @param conversations - all the conversations that the user is part of
 * @param core - the instance of the core
 */
export async function initMLSConversations(
  conversations: Conversation[],
  core: Account,
  onSuccessfulJoin?: (conversation: Conversation) => void,
): Promise<void> {
  const {mls: mlsService, conversation: conversationService} = core.service || {};
  if (!mlsService || !conversationService) {
    throw new Error('MLS or Conversation service is not available!');
  }

  const mlsConversations = conversations.filter(isMLSCapableConversation);

  await Promise.allSettled(
    mlsConversations.map(async mlsConversation => {
      const {groupId, qualifiedId} = mlsConversation;

      const doesMLSGroupExist = await conversationService.mlsGroupExistsLocally(groupId);

      //if group is already established, we just schedule periodic key material updates
      if (doesMLSGroupExist) {
        return mlsService.scheduleKeyMaterialRenewal(groupId);
      }

      //otherwise we should try joining via external commit
      await conversationService.joinByExternalCommit(qualifiedId);

      if (onSuccessfulJoin) {
        return onSuccessfulJoin(mlsConversation);
      }
    }),
  );
}

/**
 * Will initialise the MLS callbacks for the core.
 * It should be called before processing messages queue as the callbacks are being used when decrypting mls messages.
 *
 * @param core - the instance of the core
 * @param conversationRepository - conversations repository
 */
export async function initMLSCallbacks(
  core: Account,
  conversationRepository: MLSConversationRepository,
): Promise<void> {
  return core.configureMLSCallbacks({
    groupIdFromConversationId: async conversationId => {
      const conversation = await conversationRepository.getConversationById(conversationId);
      return conversation?.groupId;
    },
    // These rules are enforced by backend, no need to implement them on the client side.
    authorize: async () => true,
    userAuthorize: async () => true,
  });
}

/**
 * Will register self and team MLS conversations.
 * The self conversation and the team conversation are special conversations created by noone and, thus, need to be manually created by the first device that detects them
 *
 * @param conversations all the conversations the user is part of
 * @param core instance of the core
 */
export async function registerUninitializedSelfAndTeamConversations(
  conversations: Conversation[],
  selfUser: User,
  selfClientId: string,
  core: Account,
): Promise<void> {
  const mlsService = core.service?.mls;

  if (!mlsService) {
    throw new Error('MLS service not available');
  }

  const uninitializedConversations = conversations.filter(
    (conversation): conversation is MLSConversation =>
      isMLSConversation(conversation) &&
      conversation.epoch === 0 &&
      (isSelfConversation(conversation) || isTeamConversation(conversation)),
  );

  await Promise.all(
    uninitializedConversations.map(conversation =>
      mlsService.registerConversation(conversation.groupId, [selfUser.qualifiedId], {
        user: selfUser,
        client: selfClientId,
      }),
    ),
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
}
