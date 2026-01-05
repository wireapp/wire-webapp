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

import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Conversation} from 'Repositories/entity/Conversation';
import {UserState} from 'Repositories/user/UserState';
import {VerificationMessageType} from 'src/script/message/VerificationMessageType';
import {getLogger, Logger} from 'Util/Logger';

import {isMixedConversation, isProteusConversation} from '../../ConversationSelectors';
import {ConversationState} from '../../ConversationState';
import {ConversationVerificationState} from '../../ConversationVerificationState';
import {
  getActiveConversationsWithUsers,
  attemptChangeToVerified,
  attemptChangeToDegraded,
  OnConversationVerificationStateChange,
} from '../shared';

export class ProteusConversationVerificationStateHandler {
  private readonly logger: Logger;

  constructor(
    private readonly onConversationVerificationStateChange: OnConversationVerificationStateChange,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.logger = getLogger('ProteusConversationVerificationStateHandler');

    amplify.subscribe(WebAppEvents.USER.CLIENT_ADDED, this.onClientAdded);
    amplify.subscribe(WebAppEvents.USER.CLIENT_REMOVED, this.onClientRemoved);
    amplify.subscribe(WebAppEvents.USER.CLIENTS_UPDATED, this.onClientsUpdated);
    amplify.subscribe(WebAppEvents.CLIENT.VERIFICATION_STATE_CHANGED, this.onClientVerificationChanged);
  }

  readonly onClientVerificationChanged = (userId: QualifiedId): void => {
    getActiveConversationsWithUsers({
      userIds: [userId],
      conversationState: this.conversationState,
      userState: this.userState,
    }).forEach(({conversationEntity, userIds}) => {
      const isStateChange = this.checkChangeToVerified(conversationEntity);

      if (!isStateChange) {
        this.checkChangeToDegraded(conversationEntity, userIds, VerificationMessageType.UNVERIFIED);
      }
    });
  };

  /**
   * Self user or other participant added clients.
   * @param userId ID of user that added client (can be self user ID)
   */
  readonly onClientAdded = (userId: QualifiedId): void => {
    this.onClientsAdded([userId]);
  };

  /**
   * Multiple participants added clients.
   * @param userIds Multiple user IDs (can include self user ID)
   */
  onClientsAdded(userIds: QualifiedId[]): void {
    getActiveConversationsWithUsers({
      userIds,
      conversationState: this.conversationState,
      userState: this.userState,
    }).forEach(({conversationEntity, userIds: matchingUserIds}) => {
      this.checkChangeToDegraded(conversationEntity, matchingUserIds, VerificationMessageType.NEW_DEVICE);
    });
  }

  /**
   * Self user removed a client or other participants deleted clients.
   * @param userId ID of user that added client (can be self user ID)
   */
  readonly onClientRemoved = (userId: QualifiedId): void => {
    getActiveConversationsWithUsers({
      userIds: [userId],
      conversationState: this.conversationState,
      userState: this.userState,
    }).forEach(({conversationEntity}) => {
      this.checkChangeToVerified(conversationEntity);
    });
  };

  /**
   * A new conversation was created.
   * @param conversationEntity New conversation entity
   */
  onConversationCreate(conversationEntity: Conversation): void {
    this.checkChangeToVerified(conversationEntity);
  }

  /**
   * Clients of a user were updated.
   */
  readonly onClientsUpdated = (userId: QualifiedId): void => {
    getActiveConversationsWithUsers({
      userIds: [userId],
      conversationState: this.conversationState,
      userState: this.userState,
    }).forEach(({conversationEntity, userIds}) => {
      const isStateChange = this.checkChangeToVerified(conversationEntity);
      if (!isStateChange) {
        this.checkChangeToDegraded(conversationEntity, userIds, VerificationMessageType.NEW_DEVICE);
      }
    });
  };

  /**
   * New member(s) joined the conversation.
   * @param conversationEntity Changed conversation entity
   * @param userIds IDs of added members
   */
  onMemberJoined(conversationEntity: Conversation, userIds: QualifiedId[]): void {
    this.checkChangeToDegraded(conversationEntity, userIds, VerificationMessageType.NEW_MEMBER);
  }

  /**
   * Member(s) left the conversation.
   * @param conversationEntity Changed conversation entity
   */
  onMemberLeft(conversationEntity: Conversation): void {
    this.checkChangeToVerified(conversationEntity);
  }

  /**
   * Change that could verify conversation.
   *
   * @param conversationEntity Changed conversation entity
   * @returns `true` if state changed
   */
  private checkChangeToVerified(conversationEntity: Conversation): boolean {
    // We want to process only Proteus and Mixed conversations
    if (isProteusConversation(conversationEntity) || isMixedConversation(conversationEntity)) {
      const conversationVerificationState = attemptChangeToVerified({conversationEntity, logger: this.logger});

      if (conversationVerificationState) {
        this.onConversationVerificationStateChange({
          conversationEntity,
          conversationVerificationState,
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Change that could degrade conversation.
   *
   * @param conversationEntity Changed conversation entity
   * @param userIds IDs of affected users
   * @param type Type of degradation
   * @returns `true` if state changed
   */
  private checkChangeToDegraded(
    conversationEntity: Conversation,
    userIds: QualifiedId[],
    type: VerificationMessageType,
  ): boolean {
    // We want to process only Proteus or Mixed conversations
    if (isProteusConversation(conversationEntity) || isMixedConversation(conversationEntity)) {
      const conversationVerificationState = attemptChangeToDegraded({
        conversationEntity,
        logger: this.logger,
      });

      if (conversationVerificationState !== undefined) {
        /**
         * TEMPORARY DEBUGGING FIX:
         * We have seen conversations in a degraded state without an unverified device in there.
         * Previously the code would hide this fact, not create a system message and then fail when it tried to prompt
         * the user to grant subsequent message sending - essentially blocking the conversation.
         *
         * As we are unsure of the trigger of the degradation we temporarily throw an error to get to the bottom of this.
         * The conversation is also reset to the verified state to ensure we can continue to send messages.
         */
        if (!userIds.length) {
          conversationEntity.verification_state(ConversationVerificationState.VERIFIED);
          throw new Error('Conversation degraded without affected users');
        }

        this.onConversationVerificationStateChange({
          conversationEntity,
          conversationVerificationState,
          userIds,
          verificationMessageType: type,
        });

        return true;
      }
    }

    return false;
  }
}
