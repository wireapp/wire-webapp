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
  constructor(conversation_repository) {
    this.conversation_repository = conversation_repository;
    this.logger = new z.util.Logger('z.conversation.ConversationVerificationStateHandler', z.config.LOGGER.OPTIONS);

    amplify.subscribe(z.event.WebApp.USER.CLIENT_ADDED, this.on_client_add.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENT_REMOVED, this.on_client_removed.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CLIENTS_UPDATED, this.on_clients_updated.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.VERIFICATION_STATE_CHANGED, this.on_client_verification_changed.bind(this));
  }

  /**
   * Handle client verification state change.
   * @param {string} user_id - Self user ID
   * @returns {undefined} No return value
   */
  on_client_verification_changed(user_id) {
    this._get_active_conversations().forEach((conversation_et) => {
      if (this._will_change_to_degraded(conversation_et)) {
        const degraded_event = z.conversation.EventBuilder.build_degraded(conversation_et, [user_id], z.message.VerificationMessageType.UNVERIFIED);
        amplify.publish(z.event.WebApp.EVENT.INJECT, degraded_event);
      } else if (this._will_change_to_verified(conversation_et)) {
        const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversation_et);
        amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
      }
    });
  }

  /**
   * Self user added a client or other participants added clients.
   * @param {string|Array<string>} user_ids - Can include self user ID
   * @returns {undefined} No return value
   */
  on_client_add(user_ids) {
    if (_.isString(user_ids)) {
      user_ids = [user_ids];
    }

    this._get_active_conversations().forEach((conversation_et) => {
      if (this._will_change_to_degraded(conversation_et)) {
        const user_ids_in_conversation = _.intersection(user_ids, conversation_et.participating_user_ids().concat(conversation_et.self.id));

        if (user_ids_in_conversation.length) {
          const degraded_event = z.conversation.EventBuilder.build_degraded(conversation_et, user_ids, z.message.VerificationMessageType.NEW_DEVICE);
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
    this._get_active_conversations().forEach((conversation_et) => {
      if (this._will_change_to_verified(conversation_et)) {
        const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversation_et);
        amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
      }
    });
  }

  /**
   * Clients of a user were updated.
   * @param {string} user_id - User ID
   * @returns {undefined} No return value
   */
  on_clients_updated(user_id) {
    this._get_active_conversations().forEach((conversation_et) => {
      if (this._will_change_to_degraded(conversation_et)) {
        const degraded_event = z.conversation.EventBuilder.build_degraded(conversation_et, [user_id], z.message.VerificationMessageType.NEW_DEVICE);
        amplify.publish(z.event.WebApp.EVENT.INJECT, degraded_event);
      } else if (this._will_change_to_verified(conversation_et)) {
        const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversation_et);
        amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
      }
    });
  }

  /**
   * New member(s) joined the conversation
   * @param {z.entity.Conversation} conversation_et - Changed conversation entity
   * @param {string|Array<string>} user_ids - IDs of added members
   * @returns {undefined} No return value
   */
  on_member_joined(conversation_et, user_ids) {
    if (_.isString(user_ids)) {
      user_ids = [user_ids];
    }

    if (this._will_change_to_degraded(conversation_et)) {
      const degraded_event = z.conversation.EventBuilder.build_degraded(conversation_et, user_ids, z.message.VerificationMessageType.NEW_MEMBER);
      amplify.publish(z.event.WebApp.EVENT.INJECT, degraded_event);
    }
  }

  /**
   * Member(s) left the conversation
   * @param {z.entity.Conversation} conversation_et - Changed conversation entity
   * @returns {undefined} No return value
   */
  on_member_left(conversation_et) {
    if (this._will_change_to_verified(conversation_et)) {
      const all_verified_event = z.conversation.EventBuilder.build_all_verified(conversation_et);
      amplify.publish(z.event.WebApp.EVENT.INJECT, all_verified_event);
    }
  }

  /**
   * Get all conversation where self user is active
   * @returns {Array<z.entity.Conversation>} Array of conversation entities
   */
  _get_active_conversations() {
    return this.conversation_repository.filtered_conversations().filter((conversation_et) => !conversation_et.removed_from_conversation());
  }

  /**
   * Check whether to degrade conversation and set corresponding state
   * @param {z.entity.Conversation} conversation_et - Conversation entity to evaluate
   * @returns {boolean} Conversation changing to degraded
   */
  _will_change_to_degraded(conversation_et) {
    const state = conversation_et.verification_state();

    if (state === z.conversation.ConversationVerificationState.DEGRADED) {
      return false;
    }

    if ((state === z.conversation.ConversationVerificationState.VERIFIED) && !conversation_et.is_verified()) {
      conversation_et.verification_state(z.conversation.ConversationVerificationState.DEGRADED);
      return true;
    }

    return false;
  }

  /**
   * Check whether to verify conversation and set corresponding state
   * @param {z.entity.Conversation} conversation_et - Conversation entity to evaluate
   * @returns {boolean} Conversation changing to verified
   */
  _will_change_to_verified(conversation_et) {
    if (conversation_et.verification_state() === z.conversation.ConversationVerificationState.VERIFIED) {
      return false;
    }

    if (conversation_et.is_verified()) {
      conversation_et.verification_state(z.conversation.ConversationVerificationState.VERIFIED);
      return true;
    }

    return false;
  }
};
