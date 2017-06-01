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
window.z.entity = z.entity || {};

z.entity.Conversation = class Conversation {
  /**
   * Constructs a new conversation entity.
   * @class z.entity.Conversation
   * @param {string} conversation_id - Conversation ID
   */
  constructor(conversation_id = '') {
    this.creator = undefined;
    this.id = conversation_id;
    this.name = ko.observable();
    this.team_id = undefined;
    this.type = ko.observable();

    this.input = ko.observable(z.util.StorageUtil.get_value(`${z.storage.StorageKey.CONVERSATION.INPUT}|${this.id}`) || '');
    this.input.subscribe((text) => z.util.StorageUtil.set_value(`${z.storage.StorageKey.CONVERSATION.INPUT}|${this.id}`, text));

    this.is_loaded = ko.observable(false);
    this.is_pending = ko.observable(false);

    this.participating_user_ets = ko.observableArray([]); // Does not include self user
    this.participating_user_ids = ko.observableArray([]);
    this.self = undefined;
    this.number_of_participants = ko.pureComputed(() => this.participating_user_ids().length);

    this.is_guest = false;
    this.is_managed = false;

    this.is_group = ko.pureComputed(() => {
      const group_type = this.type() === z.conversation.ConversationType.REGULAR;
      const group_conversation = group_type && !this.team_id;
      const team_group_conversation = group_type && this.team_id && this.participating_user_ids().length !== 1;

      return group_conversation || team_group_conversation;
    });
    this.is_one2one = ko.pureComputed(() => {
      const group_type = this.type() === z.conversation.ConversationType.REGULAR;
      const one2one_conversation = this.type() === z.conversation.ConversationType.ONE2ONE;
      const team_one2one_conversation = group_type && this.team_id && this.participating_user_ids().length === 1;

      return one2one_conversation || team_one2one_conversation;
    });
    this.is_request = ko.pureComputed(() => this.type() === z.conversation.ConversationType.CONNECT);
    this.is_self = ko.pureComputed(() => this.type() === z.conversation.ConversationType.SELF);

    // in case this is a one2one conversation this is the connection to that user
    this.connection = ko.observable(new z.entity.Connection());
    this.connection.subscribe((connection_et) => {
      if (!this.participating_user_ids().includes(connection_et.to)) {
        return this.participating_user_ids([connection_et.to]);
      }
    });

    // E2EE conversation states
    this.archived_state = ko.observable(false).extend({notify: 'always'});
    this.muted_state = ko.observable(false);
    this.verification_state = ko.observable(z.conversation.ConversationVerificationState.UNVERIFIED);

    this.archived_timestamp = ko.observable(0);
    this.cleared_timestamp = ko.observable(0);
    this.last_event_timestamp = ko.observable(0);
    this.last_read_timestamp = ko.observable(0);
    this.muted_timestamp = ko.observable(0);

    // Conversation states for view
    this.is_muted = ko.pureComputed(() => this.muted_state());

    this.is_archived = ko.pureComputed(() => {
      const archived = this.last_event_timestamp() <= this.archived_timestamp();
      if (archived) {
        return this.archived_state();
      }
      return this.archived_state() && this.muted_state();

    });

    this.is_cleared = ko.pureComputed(() => this.last_event_timestamp() <= this.cleared_timestamp());

    this.is_verified = ko.pureComputed(() => {
      const all_users = [this.self].concat(this.participating_user_ets());
      return all_users.every((user_et) => user_et != null ? user_et.is_verified() : undefined);
    });

    this.status = ko.observable(z.conversation.ConversationStatus.CURRENT_MEMBER);
    this.removed_from_conversation = ko.pureComputed(() => this.status() === z.conversation.ConversationStatus.PAST_MEMBER);

    this.removed_from_conversation.subscribe((is_removed) => {
      if (!is_removed) {
        return this.archived_state(false);
      }
    });

    // Messages
    this.ephemeral_timer = ko.observable(false);

    this.messages_unordered = ko.observableArray();
    this.messages = ko.pureComputed(() => this.messages_unordered().sort((message_a, message_b) => {
      return message_a.timestamp() - message_b.timestamp();
    }));
    this.messages.subscribe(() => this.update_latest_from_message(this.get_last_message()));

    this.creation_message = undefined;

    this.has_further_messages = ko.observable(true);

    this.messages_visible = ko.pureComputed(() => {
      if (this.id === '') {
        return [];
      }

      const message_ets = this.messages().filter((message_et) => message_et.visible());

      const first_message = this.get_first_message();
      if (!this.has_further_messages() && !((first_message != null ? first_message.is_member() : undefined) && first_message.is_creation())) {
        if (this.creation_message == null) {
          this.creation_message = this._creation_message();
        }
        if (this.creation_message != null) {
          message_ets.unshift(this.creation_message);
        }
      }
      return message_ets;
    }).extend({trackArrayChanges: true});

    // Calling
    this.call = ko.observable(undefined);
    this.has_active_call = ko.pureComputed(() => {
      if (!this.call()) {
        return false;
      }
      return !z.calling.enum.CALL_STATE_GROUP.IS_ENDED.includes(this.call().state()) && !this.call().is_ongoing_on_another_client();
    });

    this.unread_events = ko.pureComputed(() => {
      const unread_event = [];
      const messages = this.messages();
      for (let index = messages.length - 1; index >= 0; index--) {
        const message_et = messages[index];
        if (message_et.visible()) {
          if ((message_et.timestamp() <= this.last_read_timestamp()) || message_et.user().is_me) {
            break;
          }
          unread_event.push(message_et);
        }
      }
      return unread_event;
    });

    this.unread_event_count = ko.pureComputed(() => this.unread_events().length);

    /**
     * Display name strategy:
     *
     * 'One-to-One Conversations' and 'Connection Requests':
     * We should not use the conversation name received from the backend as fallback as it will always contain the
     * name of the user who received the connection request initially
     *
     * - Name of the other participant
     * - Name of the other user of the associated connection
     * - "..." if neither of those has been attached yet
     *
     * 'Group Conversation':
     * - Conversation name received from backend
     * - If unnamed, we will create a name from the participant names
     * - Join the user's first names to a comma separated list or uses the user's first name if only one user participating
     * - "..." if the user entities have not yet been attached yet
     */
    this.display_name = ko.pureComputed(() => {
      if (this.is_request() || this.is_one2one()) {
        if (this.participating_user_ets()[0] && this.participating_user_ets()[0].name) {
          return this.participating_user_ets()[0].name();
        }

        return '…';
      }

      if (this.is_group()) {
        if (this.name()) {
          return this.name();
        }

        if (this.participating_user_ets().length > 0) {
          return this.participating_user_ets()
            .map((user_et) => user_et.first_name())
            .join(', ');
        }

        if (this.participating_user_ids().length === 0) {
          return z.l10n.text(z.string.conversations_empty_conversation);
        }

        return '…';
      }

      return this.name();
    });

    this.persist_state = _.debounce(() => {
      amplify.publish(z.event.WebApp.CONVERSATION.PERSIST_STATE, this);
    }, 100);

    amplify.subscribe(z.event.WebApp.CONVERSATION.LOADED_STATES, this._subscribe_to_states_updates.bind(this));
  }

  _subscribe_to_states_updates() {
    return [
      this.archived_state,
      this.cleared_timestamp,
      this.ephemeral_timer,
      this.last_event_timestamp,
      this.last_read_timestamp,
      this.muted_state,
      this.name,
      this.participating_user_ids,
      this.status,
      this.type,
      this.verification_state,
    ].forEach((property) => property.subscribe(this.persist_state));
  }

  /**
   * Remove all message from conversation unless there are unread messages.
   * @returns {undefined} No return value
   */
  release() {
    if (!this.unread_event_count()) {
      this.remove_messages();
      this.is_loaded(false);
      return this.has_further_messages(true);
    }
  }

  /**
   * Set the timestamp of a given type.
   * @note This will only increment timestamps
   * @param {string} timestamp - Timestamp to be set
   * @param {z.conversation.ConversationUpdateType} type - Type of timestamp to be updated
   * @returns {boolean|number} Timestamp value which can be 'false' (boolean) if there is no timestamp
   */
  set_timestamp(timestamp, type) {
    let entity_timestamp;
    if (_.isString(timestamp)) {
      timestamp = window.parseInt(timestamp, 10);
    }

    switch (type) {
      case z.conversation.ConversationUpdateType.ARCHIVED_TIMESTAMP:
        entity_timestamp = this.archived_timestamp;
        break;
      case z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP:
        entity_timestamp = this.cleared_timestamp;
        break;
      case z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP:
        entity_timestamp = this.last_event_timestamp;
        break;
      case z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP:
        entity_timestamp = this.last_read_timestamp;
        break;
      case z.conversation.ConversationUpdateType.MUTED_TIMESTAMP:
        entity_timestamp = this.muted_timestamp;
        break;
      default:
        break;
    }

    const updated_timestamp = this._increment_time_only(entity_timestamp(), timestamp);
    if (updated_timestamp) {
      entity_timestamp(updated_timestamp);
    }
    return updated_timestamp;
  }

  /**
   * Increment only on timestamp update
   * @param {z.entity.Conversation} current_timestamp - Current timestamp
   * @param {string} updated_timestamp - Timestamp from update
   * @returns {string|boolean} Updated timestamp or false if not increased
   */
  _increment_time_only(current_timestamp, updated_timestamp) {
    if (updated_timestamp > current_timestamp) {
      return updated_timestamp;
    }
    return false;

  }

  /**
   * Adds a single message to the conversation.
   * @param {z.entity.Message} message_et - Message entity to be added to the conversation
   * @returns {undefined} No return value
   */
  add_message(message_et) {
    amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, message_et);
    this._update_last_read_from_message(message_et);
    this.messages_unordered.push(this._check_for_duplicate_nonce(message_et, this.get_last_message()));
  }

  /**
   * Adds multiple messages to the conversation.
   * @param {Array<z.entity.Message>} message_ets - Array of message entities to be added to the conversation
   * @returns {undefined} No return value
   */
  add_messages(message_ets) {
    let message_et;
    for (let index = 0; index < message_ets.length; index++) {
      message_et = message_ets[index];
      message_et = this._check_for_duplicate_nonce(message_ets[index - 1], message_et);
    }

    // in order to avoid multiple db writes check the messages from the end and stop once
    // we found a message from self user
    for (let counter = message_ets.length - 1; counter >= 0; counter--) {
      message_et = message_ets[counter];
      if (message_et.user() && message_et.user().is_me) {
        this._update_last_read_from_message(message_et);
        break;
      }
    }

    z.util.ko_array_push_all(this.messages_unordered, message_ets);
  }

  /**
   * Prepends messages with new batch of messages.
   * @param {Array<z.entity.Message>} message_ets - Array of messages to be added to conversation
   * @returns {undefined} No return value
   */
  prepend_messages(message_ets) {
    const last_message_et = message_ets[message_ets.length - 1];
    this._check_for_duplicate_nonce(last_message_et, this.get_first_message());

    for (let index = message_ets.length - 1; index >= 0; index--) {
      let message_et = message_ets[index];
      message_et = this._check_for_duplicate_nonce(message_ets[index - 1], message_et);
    }

    z.util.ko_array_unshift_all(this.messages_unordered, message_ets);
  }

  /**
   * Removes message from the conversation by message id.
   * @param {string} message_id - ID of the message entity to be removed from the conversation
   * @returns {undefined} No return value
   */
  remove_message_by_id(message_id) {
    const messages = this.messages_unordered();
    for (let index = messages.length - 1; index >= 0; index--) {
      const message_et = messages[index];
      if (message_et.id === message_id) {
        this.messages_unordered.remove(message_et);
      }
    }
  }

  /**
   * Removes a single message from the conversation.
   * @param {z.entity.Message} message_et - Message entity to be removed from the conversation
   * @returns {undefined} No return value
   */
  remove_message(message_et) {
    this.messages_unordered.remove(message_et);
  }

  /**
   * Removes all messages from the conversation.
   * @returns {undefined} No return value
   */
  remove_messages() {
    this.messages_unordered.removeAll();
  }

  /**
   * Checks for message duplicates by nonce and returns the message.
   * @private
   * @note If a message is send to the backend multiple times by a client they will be in the conversation multiple times
   * @param {z.entity.Message} message_et - Message entity to be added to the conversation
   * @param {z.entity.Message} other_message_et - Other message entity to compare with
   * @returns {undefined} No return value
   */
  _check_for_duplicate_nonce(message_et, other_message_et) {
    if ((message_et == null) || (other_message_et == null)) {
      return message_et;
    }

    if (message_et.has_nonce() && other_message_et.has_nonce() && (message_et.nonce === other_message_et.nonce)) {
      const sorted_messages = z.entity.Message.sort_by_timestamp([message_et, other_message_et]);
      if ((message_et.type === z.event.Client.CONVERSATION.ASSET_META) && (other_message_et.type === z.event.Client.CONVERSATION.ASSET_META)) {
        // android sends to meta messages with the same content. we would store both and but only update the first one
        // whenever we reload the conversation the nonce check would hide the older one and we would show the non updated message
        // to fix that we hide the newer one
        sorted_messages[1].visible(false); // hide newer
      } else {
        sorted_messages[0].visible(false); // hide older
      }
    }

    return message_et;
  }

  /**
   * Creates the placeholder message after clearing a conversation.
   * @private
   * @note Only create the message if the group participants have been set
   * @returns {undefined} No return value
   */
  _creation_message() {
    if (this.participating_user_ets().length === 0) {
      return undefined;
    }

    const message_et = new z.entity.MemberMessage();
    message_et.type = z.message.SuperType.MEMBER;
    message_et.timestamp(new Date(0));
    message_et.user_ids(this.participating_user_ids());
    message_et.user_ets(this.participating_user_ets().slice(0));

    if ([z.conversation.ConversationType.CONNECT, z.conversation.ConversationType.ONE2ONE].includes(this.type())) {
      if (this.participating_user_ets()[0].is_outgoing_request()) {
        message_et.member_message_type = z.message.SystemMessageType.CONNECTION_REQUEST;
      } else {
        message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED;
      }
    } else {
      message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE;
      if (this.creator === this.self.id) {
        message_et.user(this.self);
      } else {
        message_et.user_ets.push(this.self);

        const user_et = ko.utils.arrayFirst(this.participating_user_ets(), (current_user_et) => current_user_et.id === this.creator);

        if (user_et) {
          message_et.user(user_et);
        } else {
          message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_RESUME;
        }
      }
    }
    return message_et;
  }

  /**
   * Update information about last activity from single message.
   * @param {z.entity.Message} message_et - Message to be added to conversation
   * @returns {undefined} No return value
   */
  update_latest_from_message(message_et) {
    if ((message_et != null) && message_et.visible() && message_et.should_effect_conversation_timestamp) {
      this.set_timestamp(message_et.timestamp(), z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP);
    }
  }

  /**
   * Update last read if message sender is self
   * @private
   * @param {z.entity.Message} message_et - Message entity
   * @returns {undefined} No return value
   */
  _update_last_read_from_message(message_et) {
    const is_me = message_et.user() && message_et.user().is_me;
    const has_timestamp = message_et.timestamp();

    if (is_me && has_timestamp && message_et.should_effect_conversation_timestamp) {
      this.set_timestamp(message_et.timestamp(), z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP);
    }
  }

  /**
   * Get all messages.
   * @returns {Array<z.entity.Message>} Array of all message in the conversation
   */
  get_all_messages() {
    return this.messages();
  }

  /**
   * Get the first message of the conversation.
   * @returns {z.entity.Message|undefined} First message entity or undefined
   */
  get_first_message() {
    return this.messages()[0];
  }

  /**
   * Get the last message of the conversation.
   * @returns {z.entity.Message|undefined} Last message entity or undefined
   */
  get_last_message() {
    return this.messages()[this.messages().length - 1];
  }

  /**
   * Get the message before a given message.
   * @param {z.entity.Message} message_et - Message to look up from
   * @returns {z.entity.Message | undefined} Previous message
   */
  get_previous_message(message_et) {
    const messages_visible = this.messages_visible();
    const message_index = messages_visible.indexOf(message_et);
    if (message_index > 0) {
      return messages_visible[message_index - 1];
    }
  }

  /**
   * Get the last text message that was added by self user.
   * @returns {z.entity.Message} Last message edited
   */
  get_last_editable_message() {
    const messages = this.messages();
    for (let index = messages.length - 1; index >= 0; index--) {
      const message_et = messages[index];
      if (message_et.is_editable()) {
        return message_et;
      }
    }
  }

  /**
   * Get the last delivered message.
   * @returns {z.entity.Message} Last delivered message
   */
  get_last_delivered_message() {
    const messages = this.messages();
    for (let index = messages.length - 1; index >= 0; index--) {
      const message_et = messages[index];
      if (message_et.status() === z.message.StatusType.DELIVERED) {
        return message_et;
      }
    }
  }

  /**
   * Get a message by it's unique ID.
   * @param {string} id - ID of message to be retrieved
   * @returns {z.entity.Message|undefined} Message with ID or undefined
   */
  get_message_by_id(id) {
    for (const message_et of this.messages()) {
      if (message_et.id === id) {
        return message_et;
      }
    }
  }

  /**
   * Get Number of pending uploads for this conversation.
   * @returns {number} Count of pending uploads
   */
  get_number_of_pending_uploads() {
    const pending_uploads = [];

    for (const message_et of this.messages()) {
      if (message_et.assets && message_et.assets()[0] && message_et.assets()[0].pending_upload && message_et.assets()[0].pending_upload()) {
        pending_uploads.push(message_et);
      }
    }

    return pending_uploads.length;
  }

  get_users_with_unverified_clients() {
    return [this.self]
      .concat(this.participating_user_ets())
      .filter((user_et) => !user_et.is_verified());
  }

  /**
   * Check whether the conversation is held with a bot like Anna or Otto.
   * @returns {boolean} True, if conversation with a bot
   */
  is_with_bot() {
    for (const user_et of this.participating_user_ets()) {
      if (user_et.is_bot) {
        return true;
      }
    }

    if (!this.is_one2one()) {
      return false;
    }

    if (!(this.participating_user_ets()[0] && this.participating_user_ets()[0].username())) {
      return false;
    }

    return ['annathebot', 'ottothebot'].includes(this.participating_user_ets()[0].username());
  }

  serialize() {
    return {
      archived_state: this.archived_state(),
      archived_timestamp: this.archived_timestamp(),
      cleared_timestamp: this.cleared_timestamp(),
      ephemeral_timer: this.ephemeral_timer(),
      id: this.id,
      is_guest: this.is_guest,
      is_managed: this.is_managed,
      last_event_timestamp: this.last_event_timestamp(),
      last_read_timestamp: this.last_read_timestamp(),
      muted_state: this.muted_state(),
      muted_timestamp: this.muted_timestamp(),
      name: this.name(),
      others: this.participating_user_ids(),
      status: this.status(),
      team_id: this.team_id,
      type: this.type(),
      verification_state: this.verification_state(),
    };
  }
};
