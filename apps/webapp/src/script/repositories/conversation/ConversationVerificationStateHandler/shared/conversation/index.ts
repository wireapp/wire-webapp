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

import {Conversation} from 'Repositories/entity/Conversation';
import {UserState} from 'Repositories/user/UserState';
import {Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {isMLSCapableConversation, MLSCapableConversation} from '../../../ConversationSelectors';
import {ConversationState} from '../../../ConversationState';
import {ConversationVerificationState} from '../../../ConversationVerificationState';

interface GetActiveConversationsWithUsersParams {
  userIds: QualifiedId[];
  conversationState: ConversationState;
  userState: UserState;
}
type GetActiveConversationsWithUsersResult = {conversationEntity: Conversation; userIds: QualifiedId[]}[];

export const getActiveConversationsWithUsers = ({
  conversationState,
  userIds,
  userState,
}: GetActiveConversationsWithUsersParams): GetActiveConversationsWithUsersResult => {
  return conversationState
    .filteredConversations()
    .map((conversationEntity: Conversation) => {
      if (!conversationEntity.isSelfUserRemoved()) {
        const userIdsInConversation = conversationEntity.participating_user_ids().concat(userState.self().qualifiedId);
        const matchingUserIds = userIdsInConversation.filter(userIdInConversation =>
          userIds.find(userId => matchQualifiedIds(userId, userIdInConversation)),
        );

        if (!!matchingUserIds.length) {
          return {conversationEntity, userIds: matchingUserIds};
        }
      }
      return undefined;
    })
    .flatMap(activeConversationInfo => (!!activeConversationInfo ? [activeConversationInfo] : []));
};

interface GetConversationByGroupIdParams {
  conversationState: ConversationState;
  groupId: string;
}
export const getConversationByGroupId = ({
  conversationState,
  groupId,
}: GetConversationByGroupIdParams): MLSCapableConversation | undefined => {
  const conversation = conversationState.conversations().find(conversation => conversation.groupId === groupId);
  return conversation && isMLSCapableConversation(conversation) ? conversation : undefined;
};

/**
 * Check whether to degrade conversation and set corresponding state.
 *
 * @param conversationEntity Conversation entity to evaluate
 * @param shouldShowDegradationWarning Should a modal warn about the degradation?
 * @returns `true` if conversation state changed to degraded
 */
interface AttemptChangeToDegradedParams {
  conversationEntity: Conversation;
  shouldShowDegradationWarning?: boolean;
  logger: Logger;
}
export const attemptChangeToDegraded = ({
  conversationEntity,
  logger,
  shouldShowDegradationWarning = true,
}: AttemptChangeToDegradedParams): ConversationVerificationState | undefined => {
  const state = conversationEntity.verification_state();
  const isAlreadyDegraded = state === ConversationVerificationState.DEGRADED;

  if (isAlreadyDegraded) {
    return undefined;
  }

  // Explicit Boolean check to prevent state changes on undefined
  const isStateVerified = state === ConversationVerificationState.VERIFIED;
  const isConversationUnverified = conversationEntity.is_verified() === false;
  if (isStateVerified && isConversationUnverified) {
    const conversationVerificationState = shouldShowDegradationWarning
      ? ConversationVerificationState.DEGRADED
      : ConversationVerificationState.UNVERIFIED;
    conversationEntity.verification_state(conversationVerificationState);
    logger.log(`Verification of conversation '${conversationEntity.id}' changed to degraded`);
    return conversationVerificationState;
  }

  return undefined;
};

/**
 * Check whether to verify conversation and set corresponding state
 *
 * @param conversationEntity Conversation entity to evaluate
 * @returns `true` if conversation state changed to verified
 */
interface AttemptChangeToVerifiedParams {
  conversationEntity: Conversation;
  logger: Logger;
}
export const attemptChangeToVerified = ({
  conversationEntity,
  logger,
}: AttemptChangeToVerifiedParams): ConversationVerificationState | undefined => {
  const state = conversationEntity.verification_state();
  const isAlreadyVerified = state === ConversationVerificationState.VERIFIED;

  if (isAlreadyVerified) {
    return undefined;
  }

  // Explicit Boolean check to prevent state changes on undefined
  const isConversationVerified = conversationEntity.is_verified() === true;
  if (isConversationVerified) {
    conversationEntity.verification_state(ConversationVerificationState.VERIFIED);
    logger.log(`Verification state of conversation '${conversationEntity.id}' changed to verified`);
    return ConversationVerificationState.VERIFIED;
  }

  return undefined;
};
