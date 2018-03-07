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

'use strict';

window.z = window.z || {};
window.z.conversation = z.conversation || {};

z.conversation.ConversationVerificationStateHandler = class ConversationVerificationStateHandler {
  constructor(conversationRepository) {
    this.conversationRepository = conversationRepository;
    this.timeOffset = this.conversationRepository.timeOffset;
    this.logger = new z.util.Logger('z.conversation.ConversationVerificationStateHandler', z.config.LOGGER.OPTIONS);

    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, this.onClientAdd.bind(this));
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
    this._getActiveConversations().forEach(conversationEntity => {
      const isStateChange = this._checkChangeToVerified(conversationEntity);
      if (!isStateChange) {
        this._checkChangeToDegraded(conversationEntity, [userId], z.message.VerificationMessageType.UNVERIFIED);
      }
    });
  }

  /**
   * Self user other participants added clients.
   * @param {string|Array<string>} userIds - One or multiple user IDs (Can include self user ID)
   * @returns {undefined} No return value
   */
  onClientAdd(userIds) {
    if (_.isString(userIds)) {
      userIds = [userIds];
    }

    this._getActiveConversations().forEach(conversationEntity => {
      this._checkChangeToDegraded(conversationEntity, userIds, z.message.VerificationMessageType.NEW_DEVICE);
    });
  }

  /**
   * Self user removed a client or other participants deleted clients.
   * @returns {undefined} No return value
   */
  onClientRemoved() {
    this._getActiveConversations().forEach(conversationEntity => this._checkChangeToVerified(conversationEntity));
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
    this._getActiveConversations().forEach(conversationEntity => {
      const isStateChange = this._checkChangeToVerified(conversationEntity);
      if (!isStateChange) {
        this._checkChangeToDegraded(conversationEntity, [userId], z.message.VerificationMessageType.NEW_DEVICE);
      }
    });
  }

  /**
   * New member(s) joined the conversation
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @param {Array<string>} userIds - IDs of added members
   * @returns {undefined} No return value
   */
  onMemberJoined(conversationEntity, userIds) {
    this._checkChangeToDegraded(conversationEntity, userIds, z.message.VerificationMessageType.NEW_MEMBER);
  }

  /**
   * Member(s) left the conversation
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @returns {undefined} No return value
   */
  onMemberLeft(conversationEntity) {
    this._checkChangeToVerified(conversationEntity);
  }

  /**
   * Change that could verify conversation
   *
   * @private
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @returns {boolean} True if state changed
   */
  _checkChangeToVerified(conversationEntity) {
    if (this._willChangeToVerified(conversationEntity)) {
      const allVerifiedEvent = z.conversation.EventBuilder.buildAllVerified(conversationEntity, this.timeOffset);
      amplify.publish(z.event.WebApp.EVENT.INJECT, allVerifiedEvent);
      return true;
    }
  }

  /**
   * Change that could degrade conversation
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
      const userIdsInConversation = conversationEntity.participating_user_ids().concat(conversationEntity.self.id);
      userIds = _.intersection(userIds, userIdsInConversation);

      if (userIds.length) {
        const event = z.conversation.EventBuilder.buildDegraded(conversationEntity, userIds, type, this.timeOffset);
        amplify.publish(z.event.WebApp.EVENT.INJECT, event);
        return true;
      }
    }
  }

  /**
   * Get all conversation where self user is active
   * @private
   * @returns {Array<z.entity.Conversation>} Array of conversation entities
   */
  _getActiveConversations() {
    return this.conversationRepository
      .filtered_conversations()
      .filter(conversationEntity => !conversationEntity.removed_from_conversation());
  }

  /**
   * Check whether to degrade conversation and set corresponding state
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

    const isVerified = state === z.conversation.ConversationVerificationState.VERIFIED;
    if (isVerified && !conversationEntity.is_verified()) {
      conversationEntity.verification_state(z.conversation.ConversationVerificationState.DEGRADED);
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
    const isVerified = state === z.conversation.ConversationVerificationState.VERIFIED;
    if (isVerified) {
      return false;
    }

    if (conversationEntity.is_verified()) {
      conversationEntity.verification_state(z.conversation.ConversationVerificationState.VERIFIED);
      return true;
    }

    return false;
  }
};
