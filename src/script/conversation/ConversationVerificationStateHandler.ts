/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConversationState} from './ConversationState';
import {ConversationVerificationState} from './ConversationVerificationState';

import type {ClientEntity} from '../client/ClientEntity';
import {EventBuilder} from '../conversation/EventBuilder';
import type {Conversation} from '../entity/Conversation';
import type {EventRepository} from '../event/EventRepository';
import {VerificationMessageType} from '../message/VerificationMessageType';
import {UserState} from '../user/UserState';

export class ConversationVerificationStateHandler {
  private readonly logger: Logger;

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.logger = getLogger('ConversationVerificationStateHandler');

    amplify.subscribe(WebAppEvents.USER.CLIENT_ADDED, this.onClientAdded);
    amplify.subscribe(WebAppEvents.USER.CLIENT_REMOVED, this.onClientRemoved);
    amplify.subscribe(WebAppEvents.USER.CLIENTS_UPDATED, this.onClientsUpdated);
    amplify.subscribe(WebAppEvents.CLIENT.VERIFICATION_STATE_CHANGED, this.onClientVerificationChanged);
  }

  readonly onClientVerificationChanged = (userId: QualifiedId): void => {
    this.getActiveConversationsWithUsers([userId]).forEach(({conversationEntity, userIds}) => {
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
  readonly onClientAdded = (userId: QualifiedId, _clientEntity?: ClientEntity): void => {
    this.onClientsAdded([userId]);
  };

  /**
   * Multiple participants added clients.
   * @param userIds Multiple user IDs (can include self user ID)
   */
  onClientsAdded(userIds: QualifiedId[]): void {
    this.getActiveConversationsWithUsers(userIds).forEach(({conversationEntity, userIds: matchingUserIds}) => {
      this.checkChangeToDegraded(conversationEntity, matchingUserIds, VerificationMessageType.NEW_DEVICE);
    });
  }

  /**
   * Self user removed a client or other participants deleted clients.
   * @param userId ID of user that added client (can be self user ID)
   */
  readonly onClientRemoved = (userId: QualifiedId): void => {
    this.getActiveConversationsWithUsers([userId]).forEach(({conversationEntity}) => {
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
    this.getActiveConversationsWithUsers([userId]).forEach(({conversationEntity, userIds}) => {
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
    if (this.willChangeToVerified(conversationEntity)) {
      const allVerifiedEvent = EventBuilder.buildAllVerified(conversationEntity);
      this.eventRepository.injectEvent(allVerifiedEvent);
      return true;
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
    const shouldShowDegradationWarning = type !== VerificationMessageType.UNVERIFIED;
    const isConversationDegraded = this.willChangeToDegraded(conversationEntity, shouldShowDegradationWarning);

    if (isConversationDegraded) {
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

      const event = EventBuilder.buildDegraded(conversationEntity, userIds, type);
      this.eventRepository.injectEvent(event);

      return true;
    }

    return false;
  }

  /**
   * Get all conversation where self user and the given users are active.
   *
   * @param userIds Multiple user IDs (can include self user ID)
   * @returns Array of objects containing the conversation entities and matching user IDs
   */
  private getActiveConversationsWithUsers(
    userIds: QualifiedId[],
  ): {conversationEntity: Conversation; userIds: QualifiedId[]}[] {
    return this.conversationState
      .filteredConversations()
      .map((conversationEntity: Conversation) => {
        if (!conversationEntity.removed_from_conversation()) {
          const userIdsInConversation = conversationEntity
            .participating_user_ids()
            .concat(this.userState.self().qualifiedId);
          const matchingUserIds = userIdsInConversation.filter(userIdInConversation =>
            userIds.find(userId => matchQualifiedIds(userId, userIdInConversation)),
          );

          if (!!matchingUserIds.length) {
            return {conversationEntity, userIds: matchingUserIds};
          }
        }
        return undefined;
      })
      .filter(activeConversationInfo => !!activeConversationInfo) as {
      conversationEntity: Conversation;
      userIds: QualifiedId[];
    }[];
  }

  /**
   * Check whether to degrade conversation and set corresponding state.
   *
   * @param conversationEntity Conversation entity to evaluate
   * @param shouldShowDegradationWarning Should a modal warn about the degradation?
   * @returns `true` if conversation state changed to degraded
   */
  private willChangeToDegraded(conversationEntity: Conversation, shouldShowDegradationWarning = true): boolean {
    const state = conversationEntity.verification_state();
    const isDegraded = state === ConversationVerificationState.DEGRADED;

    if (isDegraded) {
      return false;
    }

    // Explicit Boolean check to prevent state changes on undefined
    const isStateVerified = state === ConversationVerificationState.VERIFIED;
    const isConversationUnverified = conversationEntity.is_verified() === false;
    if (isStateVerified && isConversationUnverified) {
      conversationEntity.verification_state(
        shouldShowDegradationWarning
          ? ConversationVerificationState.DEGRADED
          : ConversationVerificationState.UNVERIFIED,
      );
      this.logger.log(`Verification of conversation '${conversationEntity.id}' changed to degraded`);
      return true;
    }

    return false;
  }

  /**
   * Check whether to verify conversation and set corresponding state
   *
   * @param conversationEntity Conversation entity to evaluate
   * @returns `true` if conversation state changed to verified
   */
  private willChangeToVerified(conversationEntity: Conversation): boolean {
    const state = conversationEntity.verification_state();
    const isStateVerified = state === ConversationVerificationState.VERIFIED;
    if (isStateVerified) {
      return false;
    }

    // Explicit Boolean check to prevent state changes on undefined
    const isConversationVerified = conversationEntity.is_verified() === true;
    if (isConversationVerified) {
      conversationEntity.verification_state(ConversationVerificationState.VERIFIED);
      this.logger.log(`Verification state of conversation '${conversationEntity.id}' changed to verified`);
      return true;
    }

    return false;
  }
}
