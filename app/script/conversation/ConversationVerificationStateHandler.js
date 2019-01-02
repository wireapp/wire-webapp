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

window.z = window.z || {};
window.z.conversation = z.conversation || {};

z.conversation.ConversationVerificationStateHandler = class ConversationVerificationStateHandler {
  constructor(conversationRepository, eventRepository, serverTimeRepository) {
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
    this.serverTimeRepository = serverTimeRepository;
    this.logger = new z.util.Logger('z.conversation.ConversationVerificationStateHandler', z.config.LOGGER.OPTIONS);

    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, this.onClientAdded.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_REMOVED, this.onClientRemoved.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENTS_UPDATED, this.onClientsUpdated.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.VERIFICATION_STATE_CHANGED, this.onClientVerificationChanged.bind(this));
  }

  /**
   * Handle client verification state change.
   * @param {string} userId - Self user ID
   * @returns {undefined} No return value
   */
  onClientVerificationChanged(userId) {
    this._getActiveConversationsWithUsers([userId]).forEach(({conversationEntity, userIds}) => {
      const isStateChange = this._checkChangeToVerified(conversationEntity);
      if (!isStateChange) {
        this._checkChangeToDegraded(conversationEntity, userIds, z.message.VerificationMessageType.UNVERIFIED);
      }
    });
  }

  /**
   * Self user or other participant added clients.
   * @param {string} userId - ID of user that added client (can be self user ID)
   * @returns {undefined} No return value
   */
  onClientAdded(userId) {
    this.onClientsAdded([userId]);
  }

  /**
   * Multiple participants added clients.
   * @param {Array<string>} userIds - Multiple user IDs (can include self user ID)
   * @returns {undefined} No return value
   */
  onClientsAdded(userIds) {
    this._getActiveConversationsWithUsers(userIds).forEach(({conversationEntity, userIds: matchingUserIds}) => {
      this._checkChangeToDegraded(conversationEntity, matchingUserIds, z.message.VerificationMessageType.NEW_DEVICE);
    });
  }

  /**
   * Self user removed a client or other participants deleted clients.
   * @param {string} userId - ID of user that added client (can be self user ID)
   * @returns {undefined} No return value
   */
  onClientRemoved(userId) {
    this._getActiveConversationsWithUsers([userId]).forEach(({conversationEntity, userIds}) => {
      this._checkChangeToVerified(conversationEntity);
    });
  }

  /**
   * A new conversation was created.
   * @param {z.entity.Conversation} conversationEntity - New conversation entity
   * @returns {undefined} No return value
   */
  onConversationCreate(conversationEntity) {
    this._checkChangeToVerified(conversationEntity);
  }

  /**
   * Clients of a user were updated.
   * @param {string} userId - User ID
   * @returns {undefined} No return value
   */
  onClientsUpdated(userId) {
    this._getActiveConversationsWithUsers([userId]).forEach(({conversationEntity, userIds}) => {
      const isStateChange = this._checkChangeToVerified(conversationEntity);
      if (!isStateChange) {
        this._checkChangeToDegraded(conversationEntity, userIds, z.message.VerificationMessageType.NEW_DEVICE);
      }
    });
  }

  /**
   * New member(s) joined the conversation.
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @param {Array<string>} userIds - IDs of added members
   * @returns {undefined} No return value
   */
  onMemberJoined(conversationEntity, userIds) {
    this._checkChangeToDegraded(conversationEntity, userIds, z.message.VerificationMessageType.NEW_MEMBER);
  }

  /**
   * Member(s) left the conversation.
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @returns {undefined} No return value
   */
  onMemberLeft(conversationEntity) {
    this._checkChangeToVerified(conversationEntity);
  }

  /**
   * Change that could verify conversation.
   *
   * @private
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @returns {boolean} True if state changed
   */
  _checkChangeToVerified(conversationEntity) {
    if (this._willChangeToVerified(conversationEntity)) {
      const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
      const allVerifiedEvent = z.conversation.EventBuilder.buildAllVerified(conversationEntity, currentTimestamp);
      this.eventRepository.injectEvent(allVerifiedEvent);
      return true;
    }
  }

  /**
   * Change that could degrade conversation.
   *
   * @private
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @param {Array<string>} userIds - IDs of affected users
   * @param {z.message.VerificationMessageType} type - Type of degradation
   * @returns {boolean} True if state changed
   */
  _checkChangeToDegraded(conversationEntity, userIds, type) {
    const isConversationDegraded = this._willChangeToDegraded(conversationEntity);
    if (isConversationDegraded) {
      /**
       * TEMPORARY DEBUGGING FIX:
       * We have seen conversations in a degraded state without an unverified device in there.
       * Previously the code would hide this fact, not create a system message and then fail when it tried to prompt
       * the user to grant subsequent message sending - essentially blocking the conversation.
       *
       * As we are unsure of the trigger of the degradation we temporarly throw an error to get to the bottom of this.
       * The conversation is also reset to the verified state to ensure we can continue to send messages.
       */
      if (!userIds.length) {
        conversationEntity.verification_state(z.conversation.ConversationVerificationState.VERIFIED);
        throw new Error('Conversation degraded without affected users');
      }

      const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
      const event = z.conversation.EventBuilder.buildDegraded(conversationEntity, userIds, type, currentTimestamp);
      this.eventRepository.injectEvent(event);

      return true;
    }
  }

  /**
   * Get all conversation where self user and the given users are active.
   *
   * @private
   * @param {Array<string>} userIds - Multiple user IDs (can include self user ID)
   * @returns {Array<Object>} Array of objects containing the conversation entities and matching user IDs
   */
  _getActiveConversationsWithUsers(userIds) {
    return this.conversationRepository
      .filtered_conversations()
      .map(conversationEntity => {
        if (!conversationEntity.removed_from_conversation()) {
          const selfUserId = this.conversationRepository.selfUser().id;
          const userIdsInConversation = conversationEntity.participating_user_ids().concat(selfUserId);
          const matchingUserIds = _.intersection(userIdsInConversation, userIds);

          if (!!matchingUserIds.length) {
            return {conversationEntity, userIds: matchingUserIds};
          }
        }
      })
      .filter(activeConversationInfo => !!activeConversationInfo);
  }

  /**
   * Check whether to degrade conversation and set corresponding state.
   *
   * @private
   * @param {z.entity.Conversation} conversationEntity - Conversation entity to evaluate
   * @returns {boolean} Conversation changing to degraded
   */
  _willChangeToDegraded(conversationEntity) {
    const state = conversationEntity.verification_state();
    const isDegraded = state === z.conversation.ConversationVerificationState.DEGRADED;
    if (isDegraded) {
      return false;
    }

    // Explicit Boolean check to prevent state changes on undefined
    const isStateVerified = state === z.conversation.ConversationVerificationState.VERIFIED;
    const isConversationUnverified = conversationEntity.is_verified() === false;
    if (isStateVerified && isConversationUnverified) {
      conversationEntity.verification_state(z.conversation.ConversationVerificationState.DEGRADED);
      this.logger.log(`Verification of conversation '${conversationEntity.id}' changed to degraded`);
      return true;
    }

    return false;
  }

  /**
   * Check whether to verify conversation and set corresponding state
   *
   * @private
   * @param {z.entity.Conversation} conversationEntity - Conversation entity to evaluate
   * @returns {boolean} Conversation changing to verified
   */
  _willChangeToVerified(conversationEntity) {
    const state = conversationEntity.verification_state();
    const isStateVerified = state === z.conversation.ConversationVerificationState.VERIFIED;
    if (isStateVerified) {
      return false;
    }

    // Explicit Boolean check to prevent state changes on undefined
    const isConversationVerified = conversationEntity.is_verified() === true;
    if (isConversationVerified) {
      conversationEntity.verification_state(z.conversation.ConversationVerificationState.VERIFIED);
      this.logger.log(`Verification state of conversation '${conversationEntity.id}' changed to verified`);
      return true;
    }

    return false;
  }
};
