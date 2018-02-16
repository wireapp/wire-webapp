/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
    this.conversation_repository = conversationRepository;
    this.time_offset = this.conversation_repository.time_offset;
    this.logger = new z.util.Logger('z.conversation.ConversationVerificationStateHandler', z.config.LOGGER.OPTIONS);

    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, this.on_client_add.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_REMOVED, this.on_client_removed.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENTS_UPDATED, this.on_clients_updated.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.VERIFICATION_STATE_CHANGED, this.on_client_verification_changed.bind(this));
  }

  /**
   * Handle client verification state change.
   * @param {string} userId - Self user ID
   * @returns {undefined} No return value
   */
  on_client_verification_changed(userId) {
    this._get_active_conversations().forEach(conversationEntity => {
      if (this._will_change_to_degraded(conversationEntity)) {
        const degraded_event = z.conversation.EventBuilder.build_degraded(
          conversationEntity,
          [userId],
          z.message.VerificationMessageType.UNVERIFIED,
          this.time_offset
        );
        amplify.publish(z.event.WebApp.EVENT.INJECT, degraded_event);
      } else if (this._will_change_to_verified(conversationEntity)) {
        const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversationEntity, this.time_offset);
        amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
      }
    });
  }

  /**
   * Self user added a client or other participants added clients.
   * @param {string|Array<string>} userIds - Can include self user ID
   * @returns {undefined} No return value
   */
  on_client_add(userIds) {
    if (_.isString(userIds)) {
      userIds = [userIds];
    }

    this._get_active_conversations().forEach(conversationEntity => {
      if (this._will_change_to_degraded(conversationEntity)) {
        const userIdsInConversation = _.intersection(
          userIds,
          conversationEntity.participating_user_ids().concat(conversationEntity.self.id)
        );

        if (userIdsInConversation.length) {
          const degraded_event = z.conversation.EventBuilder.build_degraded(
            conversationEntity,
            userIds,
            z.message.VerificationMessageType.NEW_DEVICE,
            this.time_offset
          );
          return amplify.publish(z.event.WebApp.EVENT.INJECT, degraded_event);
        }
      }
    });
  }

  /**
   * Self user removed a client or other participants deleted clients.
   * @returns {undefined} No return value
   */
  on_client_removed() {
    this._get_active_conversations().forEach(conversationEntity => {
      if (this._will_change_to_verified(conversationEntity)) {
        const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversationEntity, this.time_offset);
        amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
      }
    });
  }

  /**
   * Clients of a user were updated.
   * @param {string} userId - User ID
   * @returns {undefined} No return value
   */
  on_clients_updated(userId) {
    this._get_active_conversations().forEach(conversationEntity => {
      if (this._will_change_to_degraded(conversationEntity)) {
        const degraded_event = z.conversation.EventBuilder.build_degraded(
          conversationEntity,
          [userId],
          z.message.VerificationMessageType.NEW_DEVICE,
          this.time_offset
        );
        amplify.publish(z.event.WebApp.EVENT.INJECT, degraded_event);
      } else if (this._will_change_to_verified(conversationEntity)) {
        const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversationEntity, this.time_offset);
        amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
      }
    });
  }

  /**
   * New member(s) joined the conversation
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @param {string|Array<string>} userIds - IDs of added members
   * @returns {undefined} No return value
   */
  on_member_joined(conversationEntity, userIds) {
    if (_.isString(userIds)) {
      userIds = [userIds];
    }

    if (this._will_change_to_degraded(conversationEntity)) {
      const degraded_event = z.conversation.EventBuilder.build_degraded(
        conversationEntity,
        userIds,
        z.message.VerificationMessageType.NEW_MEMBER,
        this.time_offset
      );
      amplify.publish(z.event.WebApp.EVENT.INJECT, degraded_event);
    }
  }

  /**
   * Member(s) left the conversation
   * @param {z.entity.Conversation} conversationEntity - Changed conversation entity
   * @returns {undefined} No return value
   */
  on_member_left(conversationEntity) {
    if (this._will_change_to_verified(conversationEntity)) {
      const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversationEntity, this.time_offset);
      amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
    }
  }

  /**
   * Get all conversation where self user is active
   * @returns {Array<z.entity.Conversation>} Array of conversation entities
   */
  _get_active_conversations() {
    return this.conversation_repository
      .filtered_conversations()
      .filter(conversationEntity => !conversationEntity.removed_from_conversation());
  }

  /**
   * Check whether to degrade conversation and set corresponding state
   * @param {z.entity.Conversation} conversationEntity - Conversation entity to evaluate
   * @returns {boolean} Conversation changing to degraded
   */
  _will_change_to_degraded(conversationEntity) {
    const state = conversationEntity.verification_state();

    if (state === z.conversation.ConversationVerificationState.DEGRADED) {
      return false;
    }

    if (state === z.conversation.ConversationVerificationState.VERIFIED && !conversationEntity.is_verified()) {
      conversationEntity.verification_state(z.conversation.ConversationVerificationState.DEGRADED);
      return true;
    }

    return false;
  }

  /**
   * Check whether to verify conversation and set corresponding state
   * @param {z.entity.Conversation} conversationEntity - Conversation entity to evaluate
   * @returns {boolean} Conversation changing to verified
   */
  _will_change_to_verified(conversationEntity) {
    if (conversationEntity.verification_state() === z.conversation.ConversationVerificationState.VERIFIED) {
      return false;
    }

    if (conversationEntity.is_verified()) {
      conversationEntity.verification_state(z.conversation.ConversationVerificationState.VERIFIED);
      return true;
    }

    return false;
  }
};
