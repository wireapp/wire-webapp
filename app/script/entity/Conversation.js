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
window.z.entity = z.entity || {};

z.entity.Conversation = class Conversation {
  /**
   * Constructs a new conversation entity.
   * @class z.entity.Conversation
   * @param {string} conversation_id - Conversation ID
   */
  constructor(conversation_id = '') {
    this.id = conversation_id;

    this.logger = new z.util.Logger(`z.entity.Conversation (${this.id})`, z.config.LOGGER.OPTIONS);

    this.accessState = ko.observable(z.conversation.ACCESS_STATE.UNKNOWN);
    this.accessCode = ko.observable();
    this.creator = undefined;
    this.name = ko.observable();
    this.team_id = undefined;
    this.type = ko.observable();

    const inputStorageKey = `${z.storage.StorageKey.CONVERSATION.INPUT}|${this.id}`;
    this.input = ko.observable(z.util.StorageUtil.getValue(inputStorageKey) || '');
    this.input.subscribe(text => z.util.StorageUtil.setValue(inputStorageKey, text.trim()));

    this.is_loaded = ko.observable(false);
    this.is_pending = ko.observable(false);

    this.participating_user_ets = ko.observableArray([]); // Does not include self user
    this.participating_user_ids = ko.observableArray([]);
    this.self = undefined;

    this.hasCreationMessage = false;

    this.firstUserEntity = ko.pureComputed(() => this.participating_user_ets()[0]);
    this.availabilityOfUser = ko.pureComputed(() => this.firstUserEntity() && this.firstUserEntity().availability());

    this.isGuest = ko.observable(false);
    this.isManaged = false;

    this.inTeam = ko.pureComputed(() => this.team_id && !this.isGuest());
    this.isGuestRoom = ko.pureComputed(() => this.accessState() === z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);
    this.isTeamOnly = ko.pureComputed(() => this.accessState() === z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY);

    this.isTeam1to1 = ko.pureComputed(() => {
      const isGroupConversation = this.type() === z.conversation.ConversationType.REGULAR;
      const hasOneParticipant = this.participating_user_ids().length === 1;
      return isGroupConversation && hasOneParticipant && this.team_id && !this.name();
    });
    this.is_group = ko.pureComputed(() => {
      const isGroupConversation = this.type() === z.conversation.ConversationType.REGULAR;
      return isGroupConversation && !this.isTeam1to1();
    });
    this.is_one2one = ko.pureComputed(() => {
      const is1to1Conversation = this.type() === z.conversation.ConversationType.ONE2ONE;
      return is1to1Conversation || this.isTeam1to1();
    });
    this.is_request = ko.pureComputed(() => this.type() === z.conversation.ConversationType.CONNECT);
    this.is_self = ko.pureComputed(() => this.type() === z.conversation.ConversationType.SELF);

    // in case this is a one2one conversation this is the connection to that user
    this.connection = ko.observable(new z.entity.Connection());
    this.connection.subscribe(connection_et => {
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
    this.last_server_timestamp = ko.observable(0);
    this.muted_timestamp = ko.observable(0);

    // Conversation states for view
    this.is_archived = this.archived_state;
    this.is_cleared = ko.pureComputed(() => this.last_event_timestamp() <= this.cleared_timestamp());
    this.is_muted = this.muted_state;
    this.is_verified = ko.pureComputed(() => {
      if (this.self && (this.participating_user_ets().length || !this.participating_user_ids().length)) {
        const all_users = [this.self].concat(this.participating_user_ets());
        return all_users.every(user_et => user_et.is_verified());
      }
    });

    this.status = ko.observable(z.conversation.ConversationStatus.CURRENT_MEMBER);
    this.removed_from_conversation = ko.pureComputed(() => {
      return this.status() === z.conversation.ConversationStatus.PAST_MEMBER;
    });
    this.isActiveParticipant = ko.pureComputed(() => !this.removed_from_conversation() && !this.isGuest());

    this.removed_from_conversation.subscribe(is_removed => {
      if (!is_removed) {
        return this.archived_state(false);
      }
    });

    // Messages
    this.ephemeral_timer = ko.observable(false);

    this.messages_unordered = ko.observableArray();
    this.messages = ko.pureComputed(() =>
      this.messages_unordered().sort((message_a, message_b) => {
        return message_a.timestamp() - message_b.timestamp();
      })
    );

    this.hasAdditionalMessages = ko.observable(true);

    this.messages_visible = ko
      .pureComputed(() => (!this.id ? [] : this.messages().filter(messageEntity => messageEntity.visible())))
      .extend({trackArrayChanges: true});

    // Calling
    this.call = ko.observable(undefined);
    this.has_local_call = ko.pureComputed(() => !!this.call() && !this.call().isOngoingOnAnotherClient());
    this.has_active_call = ko.pureComputed(() => {
      return this.has_local_call() ? !z.calling.enum.CALL_STATE_GROUP.IS_ENDED.includes(this.call().state()) : false;
    });
    this.has_joinable_call = ko.pureComputed(() => {
      return this.has_local_call() ? z.calling.enum.CALL_STATE_GROUP.CAN_JOIN.includes(this.call().state()) : false;
    });

    this.unread_events = ko.pureComputed(() => {
      const unread_event = [];
      const messages = this.messages();

      for (let index = messages.length - 1; index >= 0; index--) {
        const message_et = messages[index];
        if (message_et.visible()) {
          if (message_et.timestamp() <= this.last_read_timestamp() || message_et.user().is_me) {
            break;
          }
          unread_event.push(message_et);
        }
      }

      return unread_event;
    });

    this.unread_event_count = ko.pureComputed(() => this.unread_events().length);

    this.unread_message_count = ko.pureComputed(() => {
      return this.unread_events().filter(message_et => {
        const is_missed_call = message_et.is_call() && message_et.was_missed();
        return is_missed_call || message_et.is_ping() || message_et.is_content();
      }).length;
    });

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
        const [userEntity] = this.participating_user_ets();
        const userName = userEntity && userEntity.name();
        return userName ? userName : '…';
      }

      if (this.is_group()) {
        if (this.name()) {
          return this.name();
        }

        const hasUserEntities = !!this.participating_user_ets().length;
        if (hasUserEntities) {
          const isJustBots = this.participating_user_ets().every(userEntity => userEntity.isBot);
          const joinedNames = this.participating_user_ets()
            .filter(userEntity => isJustBots || !userEntity.isBot)
            .map(userEntity => userEntity.first_name())
            .join(', ');

          const maxLength = z.conversation.ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
          return z.util.StringUtil.truncate(joinedNames, maxLength, false);
        }

        const hasUserIds = !!this.participating_user_ids().length;
        if (!hasUserIds) {
          return z.l10n.text(z.string.conversationsEmptyConversation);
        }
      }

      return '…';
    });

    this.shouldPersistStateChanges = false;
    this.publishPersistState = _.debounce(() => amplify.publish(z.event.WebApp.CONVERSATION.PERSIST_STATE, this), 100);

    this._initSubscriptions();
  }

  _initSubscriptions() {
    [
      this.archived_state,
      this.archived_timestamp,
      this.cleared_timestamp,
      this.ephemeral_timer,
      this.isGuest,
      this.last_event_timestamp,
      this.last_read_timestamp,
      this.last_server_timestamp,
      this.muted_state,
      this.muted_timestamp,
      this.name,
      this.participating_user_ids,
      this.status,
      this.type,
      this.verification_state,
    ].forEach(property => property.subscribe(this.persistState));
  }

  persistState() {
    if (this.shouldPersistStateChanges) {
      this.publishPersistState();
    }
  }

  setStateChangePersistence(persistChanges) {
    this.shouldPersistStateChanges = persistChanges;
  }

  /**
   * Remove all message from conversation unless there are unread messages.
   * @returns {undefined} No return value
   */
  release() {
    if (!this.unread_event_count()) {
      this.remove_messages();
      this.is_loaded(false);
      this.hasAdditionalMessages(true);
    }
  }

  /**
   * Set the timestamp of a given type.
   * @note This will only increment timestamps
   * @param {string|number} timestamp - Timestamp to be set
   * @param {z.conversation.TIMESTAMP_TYPE} type - Type of timestamp to be updated
   * @returns {boolean|number} Timestamp value which can be 'false' (boolean) if there is no timestamp
   */
  set_timestamp(timestamp, type) {
    let entity_timestamp;
    if (_.isString(timestamp)) {
      timestamp = window.parseInt(timestamp, 10);
    }

    switch (type) {
      case z.conversation.TIMESTAMP_TYPE.ARCHIVED:
        entity_timestamp = this.archived_timestamp;
        break;
      case z.conversation.TIMESTAMP_TYPE.CLEARED:
        entity_timestamp = this.cleared_timestamp;
        break;
      case z.conversation.TIMESTAMP_TYPE.LAST_EVENT:
        entity_timestamp = this.last_event_timestamp;
        break;
      case z.conversation.TIMESTAMP_TYPE.LAST_READ:
        entity_timestamp = this.last_read_timestamp;
        break;
      case z.conversation.TIMESTAMP_TYPE.LAST_SERVER:
        entity_timestamp = this.last_server_timestamp;
        break;
      case z.conversation.TIMESTAMP_TYPE.MUTED:
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
   * @param {number} current_timestamp - Current timestamp
   * @param {number} updated_timestamp - Timestamp from update
   * @returns {number|boolean} Updated timestamp or false if not increased
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
    message_et = this._checkForDuplicate(message_et);
    if (message_et) {
      this.update_timestamps(message_et);
      this.messages_unordered.push(message_et);
      amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, message_et);
    }
  }

  /**
   * Adds multiple messages to the conversation.
   * @param {Array<z.entity.Message>} message_ets - Array of message entities to be added to the conversation
   * @returns {undefined} No return value
   */
  add_messages(message_ets) {
    message_ets = message_ets.map(message_et => this._checkForDuplicate(message_et)).filter(message_et => message_et);

    // in order to avoid multiple db writes check the messages from the end and stop once
    // we found a message from self user
    for (let counter = message_ets.length - 1; counter >= 0; counter--) {
      const message_et = message_ets[counter];
      if (message_et.user() && message_et.user().is_me) {
        this.update_timestamps(message_et);
        break;
      }
    }

    z.util.koArrayPushAll(this.messages_unordered, message_ets);
  }

  get_last_known_timestamp(time_offset) {
    const last_known_timestamp = Math.max(this.last_server_timestamp(), this.last_event_timestamp());
    return last_known_timestamp || z.util.TimeUtil.adjustCurrentTimestamp(time_offset);
  }

  get_latest_timestamp(time_offset) {
    const current_timestamp = z.util.TimeUtil.adjustCurrentTimestamp(Math.min(0, time_offset));
    return Math.max(this.last_server_timestamp(), this.last_event_timestamp(), current_timestamp);
  }

  get_next_iso_date(time_offset) {
    const current_timestamp = z.util.TimeUtil.adjustCurrentTimestamp(time_offset);
    const timestamp = Math.max(this.last_server_timestamp() + 1, current_timestamp);
    return new Date(timestamp).toISOString();
  }

  getNumberOfBots() {
    return this.participating_user_ets().filter(userEntity => userEntity.isBot).length;
  }

  getNumberOfParticipants(countSelf = true, countBots = true) {
    const adjustCountForSelf = countSelf && !this.removed_from_conversation() ? 1 : 0;

    if (!countBots) {
      const numberOfParticipants = this.participating_user_ets().filter(userEntity => !userEntity.isBot).length;
      return numberOfParticipants + adjustCountForSelf;
    }

    return this.participating_user_ids().length + adjustCountForSelf;
  }

  getNumberOfClients() {
    const participantsMapped = this.participating_user_ids().length === this.participating_user_ets().length;
    if (participantsMapped) {
      return this.participating_user_ets().reduce((accumulator, userEntity) => {
        if (userEntity.devices().length) {
          return accumulator + userEntity.devices().length;
        }
        return accumulator + z.client.ClientRepository.CONFIG.AVERAGE_NUMBER_OF_CLIENTS;
      }, this.self.devices().length);
    }

    return this.getNumberOfParticipants() * z.client.ClientRepository.CONFIG.AVERAGE_NUMBER_OF_CLIENTS;
  }

  /**
   * Prepends messages with new batch of messages.
   * @param {Array<z.entity.Message>} message_ets - Array of messages to be added to conversation
   * @returns {undefined} No return value
   */
  prepend_messages(message_ets) {
    message_ets = message_ets.map(message_et => this._checkForDuplicate(message_et)).filter(message_et => message_et);

    z.util.koArrayUnshiftAll(this.messages_unordered, message_ets);
  }

  /**
   * Removes message from the conversation by message id.
   * @param {string} message_id - ID of the message entity to be removed from the conversation
   * @returns {undefined} No return value
   */
  remove_message_by_id(message_id) {
    this.messages_unordered.remove(message_et => message_id && message_id === message_et.id);
  }

  /**
   * Removes messages from the conversation.
   * @param {number} [timestamp] - Optional timestamp which messages should be removed
   * @returns {undefined} No return value
   */
  remove_messages(timestamp) {
    if (timestamp && _.isNumber(timestamp)) {
      return this.messages_unordered.remove(message_et => timestamp >= message_et.timestamp());
    }
    this.messages_unordered.removeAll();
  }

  should_unarchive() {
    if (this.archived_state()) {
      const has_new_event = this.last_event_timestamp() > this.archived_timestamp();

      return has_new_event && !this.is_muted();
    }
    return false;
  }

  /**
   * Checks for message duplicates.
   *
   * @private
   * @param {z.entity.Message} messageEt - Message entity to be added to the conversation
   * @returns {z.entity.Message|undefined} Message if it is not a duplicate
   */
  _checkForDuplicate(messageEt) {
    if (messageEt) {
      for (const existingMessageEt of this.messages_unordered()) {
        const duplicateMessageId = messageEt.id && existingMessageEt.id === messageEt.id;
        const fromSameSender = existingMessageEt.from === messageEt.from;

        if (duplicateMessageId && fromSameSender) {
          const logData = {additionalMessage: messageEt, existingMessage: existingMessageEt};
          this.logger.warn(`Filtered message '${messageEt.id}' as duplicate in view`, logData);
          return undefined;
        }
      }
    }

    return messageEt;
  }

  update_timestamp_server(time, is_backend_timestamp = false) {
    if (is_backend_timestamp) {
      const timestamp = new Date(time).getTime();

      if (!_.isNaN(timestamp)) {
        this.set_timestamp(timestamp, z.conversation.TIMESTAMP_TYPE.LAST_SERVER);
      }
    }
  }

  /**
   * Update information about conversation activity from single message.
   *
   * @private
   * @param {z.entity.Message} message_et - Message to be added to conversation
   * @returns {undefined} No return value
   */
  update_timestamps(message_et) {
    if (message_et) {
      const timestamp = message_et.timestamp();

      if (timestamp <= this.last_server_timestamp()) {
        if (message_et.timestamp_affects_order()) {
          this.set_timestamp(timestamp, z.conversation.TIMESTAMP_TYPE.LAST_EVENT);

          const from_self = message_et.user() && message_et.user().is_me;
          if (from_self) {
            this.set_timestamp(timestamp, z.conversation.TIMESTAMP_TYPE.LAST_READ);
          }
        }
      }
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
  getFirstMessage() {
    return this.messages()[0];
  }

  /**
   * Get the last message of the conversation.
   * @returns {z.entity.Message|undefined} Last message entity or undefined
   */
  getLastMessage() {
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
    const pendingUploads = [];

    for (const messageEntity of this.messages()) {
      const [assetEntity] = (messageEntity.assets && messageEntity.assets()) || [];
      const isPendingUpload = assetEntity && assetEntity.pending_upload && assetEntity.pending_upload();
      if (isPendingUpload) {
        pendingUploads.push(messageEntity);
      }
    }

    return pendingUploads.length;
  }

  updateGuests() {
    this.getTemporaryGuests().forEach(userEntity => userEntity.checkGuestExpiration());
  }

  getTemporaryGuests() {
    const userEntities = this.self ? this.participating_user_ets().concat(this.self) : this.participating_user_ets();
    return userEntities.filter(userEntity => userEntity.isTemporaryGuest());
  }

  getUsersWithUnverifiedClients() {
    const userEntities = this.self ? this.participating_user_ets().concat(this.self) : this.participating_user_ets();
    return userEntities.filter(userEntity => !userEntity.is_verified());
  }

  /**
   * Check whether the conversation is held with a service bot like Anna or Otto.
   * @returns {boolean} True, if conversation with a bot
   */
  isWithBot() {
    for (const user_et of this.participating_user_ets()) {
      if (user_et.isBot) {
        return true;
      }
    }

    if (!this.is_one2one()) {
      return false;
    }

    if (!(this.firstUserEntity() && this.firstUserEntity().username())) {
      return false;
    }

    return ['annathebot', 'ottothebot'].includes(this.firstUserEntity() && this.firstUserEntity().username());
  }

  serialize() {
    return {
      archived_state: this.archived_state(),
      archived_timestamp: this.archived_timestamp(),
      cleared_timestamp: this.cleared_timestamp(),
      ephemeral_timer: this.ephemeral_timer(),
      id: this.id,
      is_guest: this.isGuest(),
      is_managed: this.isManaged,
      last_event_timestamp: this.last_event_timestamp(),
      last_read_timestamp: this.last_read_timestamp(),
      last_server_timestamp: this.last_server_timestamp(),
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
