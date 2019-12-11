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

import {amplify} from 'amplify';
import ko from 'knockout';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {debounce} from 'underscore';

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {koArrayPushAll, koArrayUnshiftAll} from 'Util/util';
import {truncate} from 'Util/StringUtil';

import {Config} from '../Config';

import {ReceiptMode} from '../conversation/ReceiptMode';
import {ACCESS_STATE} from '../conversation/AccessState';
import {NOTIFICATION_STATE} from '../conversation/NotificationSetting';
import {ConversationType} from '../conversation/ConversationType';
import {ConversationStatus} from '../conversation/ConversationStatus';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {ConversationVerificationState} from '../conversation/ConversationVerificationState';

import {WebAppEvents} from '../event/WebApp';
import {ClientRepository} from '../client/ClientRepository';
import {StatusType} from '../message/StatusType';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {HIDE_LEGAL_HOLD_MODAL} from '../view_model/content/LegalHoldModalViewModel';

export class Conversation {
  static get TIMESTAMP_TYPE() {
    return {
      ARCHIVED: 'archivedTimestamp',
      CLEARED: 'cleared_timestamp',
      LAST_EVENT: 'last_event_timestamp',
      LAST_READ: 'last_read_timestamp',
      LAST_SERVER: 'last_server_timestamp',
      MUTED: 'mutedTimestamp',
    };
  }

  /**
   * @param {string} conversation_id - Conversation ID
   */
  constructor(conversation_id = '') {
    this.id = conversation_id;

    this.logger = getLogger(`Conversation (${this.id})`);

    this.accessState = ko.observable(ACCESS_STATE.UNKNOWN);
    this.accessCode = ko.observable();
    this.creator = undefined;
    this.name = ko.observable();
    this.team_id = undefined;
    this.type = ko.observable();

    this.is_loaded = ko.observable(false);
    this.is_pending = ko.observable(false);

    this.participating_user_ets = ko.observableArray([]); // Does not include self user
    this.participating_user_ids = ko.observableArray([]); // Does not include self user
    this.selfUser = ko.observable();
    /** @type {ko.Observable<Record<string, string>>} */
    this.roles = ko.observable({});

    this.hasCreationMessage = false;

    this.firstUserEntity = ko.pureComputed(() => this.participating_user_ets()[0]);
    this.availabilityOfUser = ko.pureComputed(() => this.firstUserEntity()?.availability());

    this.isGuest = ko.observable(false);
    this.isManaged = false;

    this.inTeam = ko.pureComputed(() => this.team_id && !this.isGuest());
    this.isGuestRoom = ko.pureComputed(() => this.accessState() === ACCESS_STATE.TEAM.GUEST_ROOM);
    this.isTeamOnly = ko.pureComputed(() => this.accessState() === ACCESS_STATE.TEAM.TEAM_ONLY);
    this.withAllTeamMembers = ko.observable(undefined);

    this.isTeam1to1 = ko.pureComputed(() => {
      const isGroupConversation = this.type() === ConversationType.GROUP;
      const hasOneParticipant = this.participating_user_ids().length === 1;
      return isGroupConversation && hasOneParticipant && this.team_id && !this.name();
    });
    this.isGroup = ko.pureComputed(() => {
      const isGroupConversation = this.type() === ConversationType.GROUP;
      return isGroupConversation && !this.isTeam1to1();
    });
    this.is1to1 = ko.pureComputed(() => {
      const is1to1Conversation = this.type() === ConversationType.ONE2ONE;
      return is1to1Conversation || this.isTeam1to1();
    });
    this.isRequest = ko.pureComputed(() => this.type() === ConversationType.CONNECT);
    this.isSelf = ko.pureComputed(() => this.type() === ConversationType.SELF);

    this.hasGuest = ko.pureComputed(() => {
      const hasGuestUser = this.participating_user_ets().some(userEntity => userEntity.isGuest());
      return hasGuestUser && this.isGroup() && this.selfUser()?.inTeam();
    });
    this.hasService = ko.pureComputed(() => this.participating_user_ets().some(userEntity => userEntity.isService));

    // in case this is a one2one conversation this is the connection to that user
    this.connection = ko.observable(new ConnectionEntity());
    this.connection.subscribe(connectionEntity => {
      const connectedUserId = connectionEntity?.userId;
      if (connectedUserId && !this.participating_user_ids().includes(connectedUserId)) {
        this.participating_user_ids.push(connectedUserId);
      }
    });

    // E2EE conversation states
    this.archivedState = ko.observable(false).extend({notify: 'always'});
    this.mutedState = ko.observable(NOTIFICATION_STATE.EVERYTHING);
    this.verification_state = ko.observable(ConversationVerificationState.UNVERIFIED);

    this.archivedTimestamp = ko.observable(0);
    this.cleared_timestamp = ko.observable(0);
    this.last_event_timestamp = ko.observable(0);
    this.last_read_timestamp = ko.observable(0);
    this.last_server_timestamp = ko.observable(0);
    this.mutedTimestamp = ko.observable(0);

    // Conversation states for view
    this.notificationState = ko.pureComputed(() => {
      if (!this.selfUser()) {
        return NOTIFICATION_STATE.NOTHING;
      }
      const mutedState = this.mutedState();

      const knownNotificationStates = Object.values(NOTIFICATION_STATE);
      if (knownNotificationStates.includes(mutedState)) {
        const isStateMentionsAndReplies = mutedState === NOTIFICATION_STATE.MENTIONS_AND_REPLIES;
        const isInvalidState = isStateMentionsAndReplies && !this.selfUser().inTeam();

        return isInvalidState ? NOTIFICATION_STATE.NOTHING : mutedState;
      }

      if (typeof mutedState === 'boolean') {
        const migratedMutedState = this.selfUser().inTeam()
          ? NOTIFICATION_STATE.MENTIONS_AND_REPLIES
          : NOTIFICATION_STATE.NOTHING;
        return this.mutedState() ? migratedMutedState : NOTIFICATION_STATE.EVERYTHING;
      }

      return NOTIFICATION_STATE.EVERYTHING;
    });

    this.is_archived = this.archivedState;
    this.is_cleared = ko.pureComputed(() => this.last_event_timestamp() <= this.cleared_timestamp());
    this.is_verified = ko.pureComputed(() => {
      if (!this._isInitialized()) {
        return undefined;
      }

      return this.allUserEntities.every(userEntity => userEntity.is_verified());
    });

    this.legalHoldStatus = ko.observable(LegalHoldStatus.DISABLED);

    this.hasLegalHold = ko.computed(() => {
      const isInitialized = this._isInitialized();
      const hasLegalHold = isInitialized && this.allUserEntities.some(userEntity => userEntity.isOnLegalHold());
      if (isInitialized) {
        this.legalHoldStatus(hasLegalHold ? LegalHoldStatus.ENABLED : LegalHoldStatus.DISABLED);
      }
      if (!hasLegalHold) {
        amplify.publish(HIDE_LEGAL_HOLD_MODAL, this.id);
      }
      return hasLegalHold;
    });

    this.blockLegalHoldMessage = false;

    this.legalHoldStatus.subscribe(legalHoldStatus => {
      if (!this.blockLegalHoldMessage && this._isInitialized()) {
        amplify.publish(WebAppEvents.CONVERSATION.INJECT_LEGAL_HOLD_MESSAGE, {
          conversationEntity: this,
          legalHoldStatus,
          userId: this.selfUser().id,
        });
      }
    });

    this.isCreatedBySelf = ko.pureComputed(
      () => this.selfUser().id === this.creator && !this.removed_from_conversation(),
    );

    this.showNotificationsEverything = ko.pureComputed(() => {
      return this.notificationState() === NOTIFICATION_STATE.EVERYTHING;
    });
    this.showNotificationsNothing = ko.pureComputed(() => {
      return this.notificationState() === NOTIFICATION_STATE.NOTHING;
    });
    this.showNotificationsMentionsAndReplies = ko.pureComputed(() => {
      return this.notificationState() === NOTIFICATION_STATE.MENTIONS_AND_REPLIES;
    });

    this.status = ko.observable(ConversationStatus.CURRENT_MEMBER);
    this.removed_from_conversation = ko.pureComputed(() => {
      return this.status() === ConversationStatus.PAST_MEMBER;
    });
    this.isActiveParticipant = ko.pureComputed(() => !this.removed_from_conversation() && !this.isGuest());
    this.isClearable = ko.pureComputed(() => !this.isRequest() && !this.is_cleared());
    this.isLeavable = ko.pureComputed(() => this.isGroup() && !this.removed_from_conversation());
    this.isMutable = ko.pureComputed(() => !this.isRequest() && !this.removed_from_conversation());

    // Messages
    this.localMessageTimer = ko.observable(null);
    this.globalMessageTimer = ko.observable(null);

    this.receiptMode = ko.observable(ReceiptMode.DELIVERY);

    this.messageTimer = ko.pureComputed(() => this.globalMessageTimer() || this.localMessageTimer());
    this.hasGlobalMessageTimer = ko.pureComputed(() => this.globalMessageTimer() > 0);

    this.messages_unordered = ko.observableArray();
    this.messages = ko.pureComputed(() =>
      this.messages_unordered().sort((message_a, message_b) => {
        return message_a.timestamp() - message_b.timestamp();
      }),
    );

    this.hasAdditionalMessages = ko.observable(true);

    this.messages_visible = ko
      .pureComputed(() => (!this.id ? [] : this.messages().filter(messageEntity => messageEntity.visible())))
      .extend({trackArrayChanges: true});

    // Calling
    this.unreadState = ko.pureComputed(() => {
      const unreadState = {
        allEvents: [],
        allMessages: [],
        calls: [],
        otherMessages: [],
        pings: [],
        selfMentions: [],
        selfReplies: [],
      };

      for (let index = this.messages().length - 1; index >= 0; index--) {
        const messageEntity = this.messages()[index];
        if (messageEntity.visible()) {
          const isReadMessage = messageEntity.timestamp() <= this.last_read_timestamp() || messageEntity.user().is_me;
          if (isReadMessage) {
            break;
          }

          const isMissedCall = messageEntity.is_call() && !messageEntity.was_completed();
          const isPing = messageEntity.is_ping();
          const isMessage = messageEntity.is_content();
          const isSelfMentioned = isMessage && this.selfUser() && messageEntity.isUserMentioned(this.selfUser().id);
          const isSelfQuoted = isMessage && this.selfUser() && messageEntity.isUserQuoted(this.selfUser().id);

          if (isMissedCall || isPing || isMessage) {
            unreadState.allMessages.push(messageEntity);
          }

          if (isSelfMentioned) {
            unreadState.selfMentions.push(messageEntity);
          } else if (isSelfQuoted) {
            unreadState.selfReplies.push(messageEntity);
          } else if (isMissedCall) {
            unreadState.calls.push(messageEntity);
          } else if (isPing) {
            unreadState.pings.push(messageEntity);
          } else if (isMessage) {
            unreadState.otherMessages.push(messageEntity);
          }

          unreadState.allEvents.push(messageEntity);
        }
      }

      return unreadState;
    });

    this.hasUnread = ko.pureComputed(() => {
      const isIgnored = this.isRequest() || this.showNotificationsNothing();
      if (isIgnored) {
        return false;
      }
      const {
        allMessages: unreadMessages,
        selfMentions: unreadSelfMentions,
        selfReplies: unreadSelfReplies,
      } = this.unreadState();

      return this.showNotificationsMentionsAndReplies()
        ? unreadSelfMentions.length > 0 || unreadSelfReplies.length > 0
        : unreadMessages.length > 0;
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
      if (this.isRequest() || this.is1to1()) {
        const [userEntity] = this.participating_user_ets();
        const userName = userEntity?.name();
        return userName ? userName : '…';
      }

      if (this.isGroup()) {
        if (this.name()) {
          return this.name();
        }

        const hasUserEntities = !!this.participating_user_ets().length;
        if (hasUserEntities) {
          const isJustServices = this.participating_user_ets().every(userEntity => userEntity.isService);
          const joinedNames = this.participating_user_ets()
            .filter(userEntity => isJustServices || !userEntity.isService)
            .map(userEntity => userEntity.first_name())
            .join(', ');

          const maxLength = ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
          return truncate(joinedNames, maxLength, false);
        }

        const hasUserIds = !!this.participating_user_ids().length;
        if (!hasUserIds) {
          return t('conversationsEmptyConversation');
        }
      }

      return '…';
    });

    this.shouldPersistStateChanges = false;
    this.publishPersistState = debounce(() => amplify.publish(WebAppEvents.CONVERSATION.PERSIST_STATE, this), 100);

    this._initSubscriptions();
  }

  _isInitialized() {
    const hasMappedUsers = this.participating_user_ets().length || !this.participating_user_ids().length;
    return Boolean(this.selfUser() && hasMappedUsers);
  }

  _initSubscriptions() {
    [
      this.archivedState,
      this.archivedTimestamp,
      this.cleared_timestamp,
      this.messageTimer,
      this.isGuest,
      this.last_event_timestamp,
      this.last_read_timestamp,
      this.last_server_timestamp,
      this.mutedState,
      this.mutedTimestamp,
      this.name,
      this.participating_user_ids,
      this.receiptMode,
      this.status,
      this.type,
      this.verification_state,
    ].forEach(property => property.subscribe(this.persistState.bind(this)));
  }

  get allUserEntities() {
    return [this.selfUser()].concat(this.participating_user_ets());
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
    if (!this.unreadState().allEvents.length) {
      this.remove_messages();
      this.is_loaded(false);
      this.hasAdditionalMessages(true);
    }
  }

  /**
   * Set the timestamp of a given type.
   * @note This will only increment timestamps
   * @param {string|number} timestamp - Timestamp to be set
   * @param {Conversation.TIMESTAMP_TYPE} type - Type of timestamp to be updated
   * @param {boolean} forceUpdate - set the timestamp regardless of previous timestamp value (no checks)
   * @returns {boolean|number} Timestamp value which can be 'false' (boolean) if there is no timestamp
   */
  setTimestamp(timestamp, type, forceUpdate = false) {
    if (typeof timestamp === 'string') {
      timestamp = window.parseInt(timestamp, 10);
    }

    const entityTimestamp = this[type];
    if (!entityTimestamp) {
      throw new z.error.ConversationError(z.error.ConversationError.TYPE.INVALID_PARAMETER);
    }

    const updatedTimestamp = forceUpdate ? timestamp : this._incrementTimeOnly(entityTimestamp(), timestamp);

    if (updatedTimestamp !== false) {
      entityTimestamp(updatedTimestamp);
    }
    return updatedTimestamp;
  }

  /**
   * Increment only on timestamp update
   * @param {number} currentTimestamp - Current timestamp
   * @param {number} updatedTimestamp - Timestamp from update
   * @returns {number|false} Updated timestamp or `false` if not increased
   */
  _incrementTimeOnly(currentTimestamp, updatedTimestamp) {
    const timestampIncreased = updatedTimestamp > currentTimestamp;
    return timestampIncreased ? updatedTimestamp : false;
  }

  /**
   * Adds a single message to the conversation.
   * @param {Message} messageEntity - Message entity to be added to the conversation.
   * @returns {Message | undefined} replacedEntity - If a message was replaced in the conversation, returns the original message
   */
  add_message(messageEntity) {
    if (messageEntity) {
      const messageWithLinkPreview = () => this._findDuplicate(messageEntity.id, messageEntity.from);
      const editedMessage = () => this._findDuplicate(messageEntity.replacing_message_id, messageEntity.from);
      const alreadyAdded = messageWithLinkPreview() || editedMessage();
      if (alreadyAdded) {
        return false;
      }

      this.update_timestamps(messageEntity);
      this.messages_unordered.push(messageEntity);
      amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.ADDED, messageEntity);
      return true;
    }
  }

  /**
   * Adds multiple messages to the conversation.
   * @param {Array<Message>} message_ets - Array of message entities to be added to the conversation
   * @returns {undefined} No return value
   */
  add_messages(message_ets) {
    message_ets = message_ets.map(message_et => this._checkForDuplicate(message_et)).filter(message_et => message_et);

    // in order to avoid multiple db writes check the messages from the end and stop once
    // we found a message from self user
    for (let counter = message_ets.length - 1; counter >= 0; counter--) {
      const message_et = message_ets[counter];
      if (message_et.user()?.is_me) {
        this.update_timestamps(message_et);
        break;
      }
    }

    koArrayPushAll(this.messages_unordered, message_ets);
  }

  getFirstUnreadSelfMention() {
    return this.unreadState()
      .selfMentions.slice()
      .pop();
  }

  get_last_known_timestamp(currentTimestamp) {
    const last_known_timestamp = Math.max(this.last_server_timestamp(), this.last_event_timestamp());
    return last_known_timestamp || currentTimestamp;
  }

  get_latest_timestamp(currentTimestamp) {
    return Math.max(this.last_server_timestamp(), this.last_event_timestamp(), currentTimestamp);
  }

  get_next_iso_date(currentTimestamp) {
    if (typeof currentTimestamp !== 'number') {
      currentTimestamp = Date.now();
    }
    const timestamp = Math.max(this.last_server_timestamp() + 1, currentTimestamp);
    return new Date(timestamp).toISOString();
  }

  getNumberOfServices() {
    return this.participating_user_ets().filter(userEntity => userEntity.isService).length;
  }

  getNumberOfParticipants(countSelf = true, countServices = true) {
    const adjustCountForSelf = countSelf && !this.removed_from_conversation() ? 1 : 0;
    const adjustCountForServices = countServices ? 0 : this.getNumberOfServices();

    return this.participating_user_ids().length + adjustCountForSelf - adjustCountForServices;
  }

  getNumberOfClients() {
    const participantsMapped = this.participating_user_ids().length === this.participating_user_ets().length;
    if (participantsMapped) {
      return this.participating_user_ets().reduce((accumulator, userEntity) => {
        return userEntity.devices().length
          ? accumulator + userEntity.devices().length
          : accumulator + ClientRepository.CONFIG.AVERAGE_NUMBER_OF_CLIENTS;
      }, this.selfUser().devices().length);
    }

    return this.getNumberOfParticipants() * ClientRepository.CONFIG.AVERAGE_NUMBER_OF_CLIENTS;
  }

  /**
   * Prepends messages with new batch of messages.
   * @param {Array<Message>} message_ets - Array of messages to be added to conversation
   * @returns {undefined} No return value
   */
  prepend_messages(message_ets) {
    message_ets = message_ets.map(message_et => this._checkForDuplicate(message_et)).filter(message_et => message_et);

    koArrayUnshiftAll(this.messages_unordered, message_ets);
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
    if (timestamp && typeof timestamp === 'number') {
      return this.messages_unordered.remove(message_et => timestamp >= message_et.timestamp());
    }
    this.messages_unordered.removeAll();
  }

  shouldUnarchive() {
    if (!this.archivedState() || this.showNotificationsNothing()) {
      return false;
    }

    const isNewerMessage = messageEntity => messageEntity.timestamp() > this.archivedTimestamp();

    const {allEvents, allMessages, selfMentions, selfReplies} = this.unreadState();
    if (this.showNotificationsMentionsAndReplies()) {
      const mentionsAndReplies = selfMentions.concat(selfReplies);
      return mentionsAndReplies.some(isNewerMessage);
    }

    const hasNewMessage = allMessages.some(isNewerMessage);
    if (hasNewMessage) {
      return true;
    }

    return allEvents.some(messageEntity => {
      if (!isNewerMessage(messageEntity)) {
        return false;
      }

      const isCallActivation = messageEntity.is_call() && messageEntity.is_activation();
      const isMemberJoin = messageEntity.is_member() && messageEntity.isMemberJoin();
      const wasSelfUserAdded = isMemberJoin && messageEntity.isUserAffected(this.selfUser().id);

      return isCallActivation || wasSelfUserAdded;
    });
  }

  /**
   * Checks for message duplicates.
   *
   * @private
   * @param {Message} messageEntity - Message entity to be added to the conversation
   * @returns {Message|undefined} Message if it is not a duplicate
   */
  _checkForDuplicate(messageEntity) {
    if (messageEntity) {
      const existingMessageEntity = this._findDuplicate(messageEntity.id, messageEntity.from);
      if (existingMessageEntity) {
        const logData = {additionalMessage: messageEntity, existingMessage: existingMessageEntity};
        this.logger.warn(`Filtered message '${messageEntity.id}' as duplicate in view`, logData);
        return undefined;
      }
      return messageEntity;
    }
  }

  _findDuplicate(messageId, from) {
    if (messageId) {
      return this.messages_unordered().find(messageEntity => {
        const sameId = messageEntity.id === messageId;
        const sameSender = messageEntity.from === from;
        return sameId && sameSender;
      });
    }
  }

  update_timestamp_server(time, is_backend_timestamp = false) {
    if (is_backend_timestamp) {
      const timestamp = new Date(time).getTime();

      if (!isNaN(timestamp)) {
        this.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.LAST_SERVER);
      }
    }
  }

  /**
   * Update information about conversation activity from single message.
   *
   * @private
   * @param {Message} message_et - Message to be added to conversation
   * @returns {undefined} No return value
   */
  update_timestamps(message_et) {
    if (message_et) {
      const timestamp = message_et.timestamp();

      if (timestamp <= this.last_server_timestamp()) {
        if (message_et.timestamp_affects_order()) {
          this.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.LAST_EVENT);

          const from_self = message_et.user()?.is_me;
          if (from_self) {
            this.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.LAST_READ);
          }
        }
      }
    }
  }

  /**
   * Get all messages.
   * @returns {Array<Message>} Array of all message in the conversation
   */
  get_all_messages() {
    return this.messages();
  }

  /**
   * Get the first message of the conversation.
   * @returns {Message|undefined} First message entity or undefined
   */
  getFirstMessage() {
    return this.messages()[0];
  }

  /**
   * Get the last message of the conversation.
   * @returns {Message|undefined} Last message entity or undefined
   */
  getLastMessage() {
    return this.messages()[this.messages().length - 1];
  }

  /**
   * Get the message before a given message.
   * @param {Message} message_et - Message to look up from
   * @returns {Message | undefined} Previous message
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
   * @returns {Message} Last message edited
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
   * @returns {Message} Last delivered message
   */
  getLastDeliveredMessage() {
    return this.messages()
      .slice()
      .reverse()
      .find(messageEntity => {
        const isDelivered = messageEntity.status() >= StatusType.DELIVERED;
        return isDelivered && messageEntity.user().is_me;
      });
  }

  /**
   * Get a message by it's unique ID.
   * Only lookup in the loaded message list which is a limited view of all the messages in DB.
   *
   * @param {string} messageId - ID of message to be retrieved
   * @returns {Message|undefined} Message with ID or undefined
   */
  getMessage(messageId) {
    return this.messages().find(messageEntity => messageEntity.id === messageId);
  }

  updateGuests() {
    this.getTemporaryGuests().forEach(userEntity => userEntity.checkGuestExpiration());
  }

  getTemporaryGuests() {
    const userEntities = this.selfUser()
      ? this.participating_user_ets().concat(this.selfUser())
      : this.participating_user_ets();
    return userEntities.filter(userEntity => userEntity.isTemporaryGuest());
  }

  getUsersWithUnverifiedClients() {
    const userEntities = this.selfUser()
      ? this.participating_user_ets().concat(this.selfUser())
      : this.participating_user_ets();
    return userEntities.filter(userEntity => !userEntity.is_verified());
  }

  supportsVideoCall(isCreatingUser = false) {
    if (this.is1to1()) {
      return true;
    }

    const participantCount = this.getNumberOfParticipants(true, false);
    const passesParticipantLimit = participantCount <= Config.MAX_VIDEO_PARTICIPANTS;

    if (!passesParticipantLimit) {
      return false;
    }

    if (this.selfUser().inTeam()) {
      return true;
    }

    if (isCreatingUser) {
      return false;
    }

    return true;
  }

  serialize() {
    return {
      archived_state: this.archivedState(),
      archived_timestamp: this.archivedTimestamp(),
      cleared_timestamp: this.cleared_timestamp(),
      ephemeral_timer: this.localMessageTimer(),
      global_message_timer: this.globalMessageTimer(),
      id: this.id,
      is_guest: this.isGuest(),
      is_managed: this.isManaged,
      last_event_timestamp: this.last_event_timestamp(),
      last_read_timestamp: this.last_read_timestamp(),
      last_server_timestamp: this.last_server_timestamp(),
      legal_hold_status: this.legalHoldStatus(),
      muted_state: this.mutedState(),
      muted_timestamp: this.mutedTimestamp(),
      name: this.name(),
      others: this.participating_user_ids(),
      receipt_mode: this.receiptMode(),
      status: this.status(),
      team_id: this.team_id,
      type: this.type(),
      verification_state: this.verification_state(),
    };
  }
}
