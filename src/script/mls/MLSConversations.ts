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
import {isQualifiedId} from '@wireapp/core/lib/util';

import {Logger} from '@wireapp/commons';
import {Account} from '@wireapp/core';

import {useMLSConversationState} from './mlsConversationState';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {
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

export async function initMLSConversations(
  conversations: Conversation[],
  selfUser: User,
  core: Account,
  conversationRepository: MLSConversationRepository,
): Promise<void> {
  core.configureMLSCallbacks({
    groupIdFromConversationId: async conversationId => {
      const conversation = await conversationRepository.getConversationById(conversationId);
      return conversation?.groupId;
    },
    // These rules are enforced by backend, no need to implement them on the client side.
    authorize: async () => true,
    userAuthorize: async () => true,
  });

  const mlsConversations = conversations.filter(isMLSConversation);
  await joinNewConversations(mlsConversations, core);
}

/**
 * Will join all the conversation that the current user is part of but that are not joined by the current user's device
 *
 * @param conversations - all the conversations that the user is part of
 * @param core - the instance of the core
 */
async function joinNewConversations(conversations: MLSConversation[], core: Account): Promise<void> {
  // We send external proposal to all the MLS conversations that are in an unknown state (not established nor pendingWelcome)
  await useMLSConversationState.getState().sendExternalToPendingJoin(
    conversations,
    groupId => core.service!.conversation.isMLSConversationEstablished(groupId),
    conversationId => core.service!.conversation.joinByExternalCommit(conversationId),
  );
}

/**
 * Will register special conversations agains the core.
 * The self conversation and the team conversation as special conversation that are created by noone and, thus, need to be manually created by the first device that detects them
 *
 * @param conversations all the conversations the user is part of
 * @param core instance of the core
 */
export async function registerUninitializedConversations(
  conversations: Conversation[],
  selfUser: User,
  selfClientId: string,
  core: Account,
): Promise<void> {
  const uninitializedConversations = conversations.filter(
    (conversation): conversation is MLSConversation =>
      isMLSConversation(conversation) &&
      conversation.epoch === 0 &&
      (isSelfConversation(conversation) || isTeamConversation(conversation)),
  );

  await Promise.all(
    uninitializedConversations.map(conversation =>
      core.service?.mls.registerConversation(conversation.groupId, [selfUser.qualifiedId], {
        user: selfUser,
        client: selfClientId,
      }),
    ),
  );
}

export async function addOtherSelfClientsToLinkJoinedConversation(
  selfUserId: QualifiedId,
  clientId: string,
  conversationRepository: MLSConversationRepository,
  core: Account,
  logger: Logger,
) {
  const linkJoinedConversationId = localStorage.getItem('conversationJoinedByCode');

  if (!linkJoinedConversationId) {
    return;
  }

  const conversationId = JSON.parse(linkJoinedConversationId);

  if (!isQualifiedId(conversationId)) {
    return;
  }

  try {
    const conversation = await conversationRepository.getConversationById(conversationId);
    const {groupId, isUsingMLSProtocol} = conversation;

    if (!isUsingMLSProtocol || !groupId) {
      return;
    }

    const selfQualifiedUser: KeyPackageClaimUser = {
      ...selfUserId,
      skipOwnClientId: clientId,
    };

    await core.service?.conversation.addUsersToMLSConversation({
      conversationId,
      groupId,
      qualifiedUsers: [selfQualifiedUser],
    });
  } catch (error) {
    logger.warn(
      `Client was not able to add other self clients to MLS group of conversation ${conversationId.id}`,
      error,
    );
  }

  localStorage.removeItem('conversationJoinedByCode');
}
