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

import poster from 'poster-image';
import {
  Asset,
  Cleared,
  ClientAction,
  Confirmation,
  Ephemeral,
  External,
  GenericMessage,
  Knock,
  LastRead,
  LegalHoldStatus,
  Location,
  MessageDelete,
  MessageEdit,
  MessageHide,
  Reaction,
  Text,
} from '@wireapp/protocol-messaging';
import {flatten} from 'underscore';
import {ConnectionStatus} from '@wireapp/api-client/dist/connection';

import {getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {PromiseQueue} from 'Util/PromiseQueue';
import {Declension, joinNames, t} from 'Util/LocalizerUtil';
import {getDifference, getNextItem} from 'Util/ArrayUtil';
import {arrayToBase64, createRandomUuid, koArrayPushAll, loadUrlBlob, sortGroupsByLastEvent} from 'Util/util';
import {areMentionsDifferent, isTextDifferent} from 'Util/messageComparator';
import {capitalizeFirstChar, compareTransliteration, sortByPriority, startsWith} from 'Util/StringUtil';

import {AssetUploadFailedReason} from '../assets/AssetUploadFailedReason';
import {encryptAesAsset} from '../assets/AssetCrypto';

import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';

import {ClientEvent} from '../event/Client';
import {EventTypeHandling} from '../event/EventTypeHandling';
import {BackendEvent} from '../event/Backend';
import {WebAppEvents} from '../event/WebApp';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {EventRepository} from '../event/EventRepository';

import {Conversation} from '../entity/Conversation';
import {Message} from '../entity/message/Message';

import * as trackingHelpers from '../tracking/Helpers';

import {ConversationMapper} from './ConversationMapper';
import {ConversationType} from './ConversationType';
import {ConversationStateHandler} from './ConversationStateHandler';
import {EventInfoEntity} from './EventInfoEntity';
import {EventMapper} from './EventMapper';
import {ACCESS_MODE} from './AccessMode';
import {ACCESS_ROLE} from './AccessRole';
import {ACCESS_STATE} from './AccessState';
import {ConversationStatus} from './ConversationStatus';
import {ConversationVerificationState} from './ConversationVerificationState';
import {ConversationVerificationStateHandler} from './ConversationVerificationStateHandler';
import {NOTIFICATION_STATE} from './NotificationSetting';
import {ConversationEphemeralHandler} from './ConversationEphemeralHandler';
import {ClientMismatchHandler} from './ClientMismatchHandler';
import {ConversationLabelRepository} from './ConversationLabelRepository';

import {buildMetadata, isVideo, isImage, isAudio} from '../assets/AssetMetaDataBuilder';
import {AssetTransferState} from '../assets/AssetTransferState';
import {AssetRemoteData} from '../assets/AssetRemoteData';

import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {AudioType} from '../audio/AudioType';
import {QUEUE_STATE} from '../service/QueueState';
import {EventName} from '../tracking/EventName';

import {SystemMessageType} from '../message/SystemMessageType';
import {StatusType} from '../message/StatusType';
import {SuperType} from '../message/SuperType';
import {MessageCategory} from '../message/MessageCategory';
import {ReactionType} from '../message/ReactionType';
import {Config} from '../Config';

import {BaseError} from '../error/BaseError';
import {BackendClientError} from '../error/BackendClientError';
import {showLegalHoldWarning} from '../legal-hold/LegalHoldWarning';
import * as LegalHoldEvaluator from '../legal-hold/LegalHoldEvaluator';
import {DeleteConversationMessage} from '../entity/message/DeleteConversationMessage';
import {ConversationRoleRepository} from './ConversationRoleRepository';
import {DefaultRole} from './ConversationRoleRepository';

// Conversation repository for all conversation interactions with the conversation service
export class ConversationRepository {
  static get CONFIG() {
    return {
      CONFIRMATION_THRESHOLD: TIME_IN_MILLIS.WEEK,
      EXTERNAL_MESSAGE_THRESHOLD: 200 * 1024,
      GROUP: {
        MAX_NAME_LENGTH: 64,
        MAX_SIZE: Config.MAX_GROUP_PARTICIPANTS,
      },
    };
  }

  static get CONSENT_TYPE() {
    return {
      INCOMING_CALL: 'incoming_call',
      MESSAGE: 'message',
      OUTGOING_CALL: 'outgoing_call',
    };
  }

  /**
   * Construct a new Conversation Repository.
   *
   * @param {ConversationService} conversation_service Backend REST API conversation service implementation
   * @param {AssetService} asset_service Backend REST API asset service implementation
   * @param {ClientRepository} client_repository Repository for client interactions
   * @param {ConnectionRepository} connectionRepository Repository for all connnection interactions
   * @param {CryptographyRepository} cryptography_repository Repository for all cryptography interactions
   * @param {EventRepository} eventRepository Repository that handles events
   * @param {GiphyRepository} giphy_repository Repository for Giphy GIFs
   * @param {LinkPreviewRepository} link_repository Repository for link previews
   * @param {MessageSender} messageSender Message sending queue handler
   * @param {serverTimeHandler} serverTimeHandler Handles time shift between server and client
   * @param {TeamRepository} teamRepository Repository for teams
   * @param {UserRepository} user_repository Repository for all user interactions
   * @param {PropertiesRepository} propertyRepository Repository that stores all account preferences
   * @param {AssetUploader} assetUploader Manages uploading assets and keeping track of current uploads
   */
  constructor(
    conversation_service,
    asset_service,
    client_repository,
    connectionRepository,
    cryptography_repository,
    eventRepository,
    giphy_repository,
    link_repository,
    messageSender,
    serverTimeHandler,
    teamRepository,
    user_repository,
    propertyRepository,
    assetUploader,
  ) {
    this.eventRepository = eventRepository;
    this.eventService = eventRepository.eventService;
    this.conversation_service = conversation_service;
    this.asset_service = asset_service;
    this.client_repository = client_repository;
    this.connectionRepository = connectionRepository;
    this.cryptography_repository = cryptography_repository;
    this.giphy_repository = giphy_repository;
    this.link_repository = link_repository;
    this.serverTimeHandler = serverTimeHandler;
    this.teamRepository = teamRepository;
    this.user_repository = user_repository;
    this.propertyRepository = propertyRepository;
    this.assetUploader = assetUploader;
    this.logger = getLogger('ConversationRepository');

    this.conversationMapper = new ConversationMapper();
    this.event_mapper = new EventMapper();
    this.verificationStateHandler = new ConversationVerificationStateHandler(
      this,
      this.eventRepository,
      this.serverTimeHandler,
    );
    this.clientMismatchHandler = new ClientMismatchHandler(
      this,
      this.cryptography_repository,
      this.eventRepository,
      this.serverTimeHandler,
      this.user_repository,
    );

    this.active_conversation = ko.observable();
    this.conversations = ko.observableArray([]);

    this.isTeam = this.teamRepository.isTeam;
    this.isTeam.subscribe(() => this.map_guest_status_self());
    this.team = this.teamRepository.team;
    this.teamMembers = this.teamRepository.teamMembers;

    this.selfUser = this.user_repository.self;

    this.block_event_handling = ko.observable(true);
    this.fetching_conversations = {};
    this.conversationsWithNewEvents = new Map();
    this.block_event_handling.subscribe(eventHandlingState => {
      if (!eventHandlingState) {
        this._checkChangedConversations();
      }
    });

    this.self_conversation = ko.pureComputed(() => {
      if (this.selfUser()) {
        return this.find_conversation_by_id(this.selfUser().id);
      }
    });

    this.filtered_conversations = ko.pureComputed(() => {
      return this.conversations().filter(conversationEntity => {
        const states_to_filter = [ConnectionStatus.BLOCKED, ConnectionStatus.CANCELLED, ConnectionStatus.PENDING];

        if (conversationEntity.isSelf() || states_to_filter.includes(conversationEntity.connection().status())) {
          return false;
        }

        return !(conversationEntity.is_cleared() && conversationEntity.removed_from_conversation());
      });
    });

    this.sorted_conversations = ko.pureComputed(() => {
      return this.filtered_conversations().sort(sortGroupsByLastEvent);
    });

    this.receiving_queue = new PromiseQueue({name: 'ConversationRepository.Receiving'});
    this.messageSender = messageSender;

    // @note Only use the client request queue as to unblock if not blocked by event handling or the cryptographic order of messages will be ruined and sessions might be deleted
    this.conversation_service.backendClient.queueState.subscribe(queueState => {
      const queueReady = queueState === QUEUE_STATE.READY;
      this.messageSender.pauseQueue(!queueReady || this.block_event_handling());
    });

    this.conversations_archived = ko.observableArray([]);
    this.conversations_cleared = ko.observableArray([]);
    this.conversations_unarchived = ko.observableArray([]);

    this.init_handled = 0;
    this.init_promise = undefined;
    this.init_total = 0;

    this._init_subscriptions();

    this.stateHandler = new ConversationStateHandler(this.conversation_service, this.conversationMapper);
    this.ephemeralHandler = new ConversationEphemeralHandler(this.conversationMapper, this.eventService, {
      onMessageTimeout: this.handleMessageExpiration.bind(this),
    });

    this.connectedUsers = ko.pureComputed(() => {
      const inviterId = this.teamRepository.memberInviters()[this.selfUser().id];
      const inviter = inviterId ? this.user_repository.users().find(({id}) => id === inviterId) : null;
      const connectedUsers = inviter ? [inviter] : [];
      for (const conversation of this.conversations()) {
        for (const user of conversation.participating_user_ets()) {
          const isNotService = !user.isService;
          const isNotIncluded = !connectedUsers.includes(user);
          if (isNotService && isNotIncluded && (user.isTeamMember() || user.isConnected())) {
            connectedUsers.push(user);
          }
        }
      }
      return connectedUsers;
    });

    this.conversationLabelRepository = new ConversationLabelRepository(
      this.conversations,
      this.conversations_unarchived,
      propertyRepository.propertiesService,
    );

    this.conversationRoleRepository = new ConversationRoleRepository(this);
  }

  checkMessageTimer(messageEntity) {
    this.ephemeralHandler.checkMessageTimer(messageEntity, this.serverTimeHandler.getTimeOffset());
  }

  _initStateUpdates() {
    ko.computed(() => {
      const conversationsArchived = [];
      const conversationsCleared = [];
      const conversationsUnarchived = [];

      this.sorted_conversations().forEach(conversationEntity => {
        if (conversationEntity.is_cleared()) {
          conversationsCleared.push(conversationEntity);
        } else if (conversationEntity.is_archived()) {
          conversationsArchived.push(conversationEntity);
        } else {
          conversationsUnarchived.push(conversationEntity);
        }
      });

      this.conversations_archived(conversationsArchived);
      this.conversations_cleared(conversationsCleared);
      this.conversations_unarchived(conversationsUnarchived);
    });
  }

  _init_subscriptions() {
    amplify.subscribe(WebAppEvents.CONVERSATION.ASSET.CANCEL, this.cancel_asset_upload.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.DELETE, this.deleteConversationLocally.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, this.onConversationEvent.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.MAP_CONNECTION, this.map_connection.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.MISSED_EVENTS, this.on_missed_events.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.PERSIST_STATE, this.save_conversation_state_in_db.bind(this));
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.set_notification_handling_state.bind(this));
    amplify.subscribe(WebAppEvents.TEAM.MEMBER_LEAVE, this.teamMemberLeave.bind(this));
    amplify.subscribe(WebAppEvents.USER.UNBLOCKED, this.unblocked_user.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.INJECT_LEGAL_HOLD_MESSAGE, this.injectLegalHoldMessage.bind(this));

    this.eventService.addEventUpdatedListener(this._updateLocalMessageEntity.bind(this));
    this.eventService.addEventDeletedListener(this._deleteLocalMessageEntity.bind(this));
  }

  async _updateLocalMessageEntity({obj: updatedEvent, oldObj: oldEvent}) {
    const conversationEntity = this.find_conversation_by_id(updatedEvent.conversation);
    const replacedMessageEntity = await this._replaceMessageInConversation(
      conversationEntity,
      oldEvent.id,
      updatedEvent,
    );
    if (replacedMessageEntity) {
      const messageEntity = await this._updateMessageUserEntities(replacedMessageEntity);
      amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, oldEvent.id, messageEntity);
    }
  }

  _deleteLocalMessageEntity({oldObj: deletedEvent}) {
    const conversationEntity = this.find_conversation_by_id(deletedEvent.conversation);
    if (conversationEntity) {
      conversationEntity.remove_message_by_id(deletedEvent.id);
    }
  }

  /**
   * Remove obsolete conversations locally.
   * @returns {undefined} No return value
   */
  cleanup_conversations() {
    this.conversations().forEach(conversationEntity => {
      if (
        conversationEntity.isGroup() &&
        conversationEntity.is_cleared() &&
        conversationEntity.removed_from_conversation()
      ) {
        this.conversation_service.delete_conversation_from_db(conversationEntity.id);
        this.deleteConversationFromRepository(conversationEntity.id);
      }
    });
  }

  //##############################################################################
  // Conversation service interactions
  //##############################################################################

  /**
   * Create a group conversation.
   * @note Do not include the requestor among the users
   *
   * @param {Array<User>} userEntities Users (excluding the creator) to be part of the conversation
   * @param {string} [groupName] Name for the conversation
   * @param {string} [accessState] State for conversation access
   * @param {Object} [options] Additional conversation creation options (like "receipt_mode")
   * @returns {Promise} Resolves when the conversation was created
   */
  createGroupConversation(userEntities, groupName, accessState, options) {
    const userIds = userEntities.map(userEntity => userEntity.id);
    let payload = {
      conversation_role: DefaultRole.WIRE_MEMBER,
      name: groupName,
      users: userIds,
      ...options,
    };

    if (this.team().id) {
      payload.team = {
        managed: false,
        teamid: this.team().id,
      };

      if (accessState) {
        let accessPayload;

        switch (accessState) {
          case ACCESS_STATE.TEAM.GUEST_ROOM:
            accessPayload = {
              access: [ACCESS_MODE.INVITE, ACCESS_MODE.CODE],
              access_role: ACCESS_ROLE.NON_ACTIVATED,
            };
            break;
          case ACCESS_STATE.TEAM.TEAM_ONLY:
            accessPayload = {
              access: [ACCESS_MODE.INVITE],
              access_role: ACCESS_ROLE.TEAM,
            };
            break;
          default:
            break;
        }

        if (accessPayload) {
          payload = {...payload, ...accessPayload};
        }
      }
    }

    return this.conversation_service
      .postConversations(payload)
      .then(response => this._onCreate({conversation: response.id, data: response}))
      .then(({conversationEntity}) => conversationEntity)
      .catch(error => this._handleConversationCreateError(error, userIds));
  }

  /**
   * Create a guest room.
   * @returns {Promise} Resolves with the conversation that was created
   */
  createGuestRoom() {
    const groupName = t('guestRoomConversationName');
    return this.createGroupConversation([], groupName, ACCESS_STATE.TEAM.GUEST_ROOM);
  }

  /**
   * Get a conversation from the backend.
   * @param {string} conversationId Conversation to be retrieved from the backend
   * @returns {Promise} Resolve with the conversation entity
   */
  fetch_conversation_by_id(conversationId) {
    if (this.fetching_conversations.hasOwnProperty(conversationId)) {
      return new Promise((resolve, reject) => {
        this.fetching_conversations[conversationId].push({reject_fn: reject, resolve_fn: resolve});
      });
    }

    this.fetching_conversations[conversationId] = [];

    return this.conversation_service
      .get_conversation_by_id(conversationId)
      .then(response => {
        const conversationEntity = this.mapConversations(response);

        this.logger.info(`Fetched conversation '${conversationId}' from backend`);
        this.save_conversation(conversationEntity);

        this.fetching_conversations[conversationId].forEach(({resolve_fn}) => resolve_fn(conversationEntity));
        delete this.fetching_conversations[conversationId];

        return conversationEntity;
      })
      .catch(({code}) => {
        if (code === BackendClientError.STATUS_CODE.NOT_FOUND) {
          this.deleteConversationLocally(conversationId);
        }
        const error = new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);

        this.fetching_conversations[conversationId].forEach(({reject_fn}) => reject_fn(error));
        delete this.fetching_conversations[conversationId];

        throw error;
      });
  }

  getConversations() {
    const remoteConversationsPromise = this.conversation_service.getAllConversations().catch(error => {
      this.logger.error(`Failed to get all conversations from backend: ${error.message}`);
      return [];
    });

    return Promise.all([this.conversation_service.load_conversation_states_from_db(), remoteConversationsPromise])
      .then(([localConversations, remoteConversations]) => {
        if (!remoteConversations.length) {
          return localConversations;
        }

        const data = this.conversationMapper.mergeConversation(localConversations, remoteConversations);
        return this.conversation_service.save_conversations_in_db(data);
      })
      .then(conversationsData => this.mapConversations(conversationsData))
      .then(conversationEntities => {
        this.save_conversations(conversationEntities);
        return this.conversations();
      });
  }

  updateConversationStates(conversationsData) {
    const handledConversationEntities = [];

    return Promise.resolve()
      .then(() => {
        const unknownConversations = [];

        conversationsData.forEach(conversationData => {
          const localEntity = this.conversations().find(({id}) => id === conversationData.id);

          if (localEntity) {
            const entity = this.conversationMapper.updateSelfStatus(localEntity, conversationData, true);
            return handledConversationEntities.push(entity);
          }

          unknownConversations.push(conversationData);
        });

        return unknownConversations.length ? this.mapConversations(unknownConversations) : [];
      })
      .then(conversationEntities => {
        if (conversationEntities.length) {
          this.save_conversations(conversationEntities);
        }
        conversationEntities = conversationEntities.concat(handledConversationEntities);

        const handledConversationData = conversationEntities.map(conversationEntity => conversationEntity.serialize());
        this.conversation_service.save_conversations_in_db(handledConversationData);
        return conversationEntities;
      });
  }

  /**
   * Get Message with given ID from the database.
   *
   * @param {Conversation} conversationEntity Conversation message belongs to
   * @param {string} messageId ID of message
   * @param {boolean} skipConversationMessages Don't use message entity from conversation
   * @param {boolean} ensureUser Make sure message entity has a valid user
   * @returns {Promise} Resolves with the message
   */
  get_message_in_conversation_by_id(
    conversationEntity,
    messageId,
    skipConversationMessages = false,
    ensureUser = false,
  ) {
    const messageEntity = !skipConversationMessages && conversationEntity.getMessage(messageId);
    const messagePromise = messageEntity
      ? Promise.resolve(messageEntity)
      : this.eventService.loadEvent(conversationEntity.id, messageId).then(event => {
          if (event) {
            return this.event_mapper.mapJsonEvent(event, conversationEntity);
          }
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND);
        });

    if (ensureUser) {
      return messagePromise.then(message => {
        if (message.from && !message.user().id) {
          return this.user_repository.get_user_by_id(message.from).then(userEntity => {
            message.user(userEntity);
            return message;
          });
        }
        return message;
      });
    }
    return messagePromise;
  }

  /**
   * Get preceding messages starting with the given message.
   * @param {Conversation} conversationEntity Respective conversation
   * @returns {Promise} Resolves with the messages
   */
  getPrecedingMessages(conversationEntity) {
    conversationEntity.is_pending(true);

    const firstMessageEntity = conversationEntity.getFirstMessage();
    const upperBound = firstMessageEntity
      ? new Date(firstMessageEntity.timestamp())
      : new Date(conversationEntity.get_latest_timestamp(this.serverTimeHandler.toServerTimestamp()) + 1);

    return this.eventService
      .loadPrecedingEvents(conversationEntity.id, new Date(0), upperBound, Config.MESSAGES_FETCH_LIMIT)
      .then(events => this._addPrecedingEventsToConversation(events, conversationEntity))
      .then(mappedMessageEntities => {
        conversationEntity.is_pending(false);
        return mappedMessageEntities;
      });
  }

  _addPrecedingEventsToConversation(events, conversationEntity) {
    const hasAdditionalMessages = events.length === Config.MESSAGES_FETCH_LIMIT;

    return this._addEventsToConversation(events, conversationEntity).then(mappedMessageEntities => {
      conversationEntity.hasAdditionalMessages(hasAdditionalMessages);

      if (!hasAdditionalMessages) {
        const firstMessage = conversationEntity.getFirstMessage();
        const checkCreationMessage = firstMessage && firstMessage.is_member() && firstMessage.isCreation();
        if (checkCreationMessage) {
          const groupCreationMessageIn1to1 = conversationEntity.is1to1() && firstMessage.isGroupCreation();
          const one2oneConnectionMessageInGroup = conversationEntity.isGroup() && firstMessage.isConnection();
          const wrongMessageTypeForConversation = groupCreationMessageIn1to1 || one2oneConnectionMessageInGroup;

          if (wrongMessageTypeForConversation) {
            this.deleteMessage(conversationEntity, firstMessage);
            conversationEntity.hasCreationMessage = false;
          } else {
            conversationEntity.hasCreationMessage = true;
          }
        }

        const addCreationMessage = !conversationEntity.hasCreationMessage;
        if (addCreationMessage) {
          this._addCreationMessage(conversationEntity, this.selfUser().isTemporaryGuest());
        }
      }

      return mappedMessageEntities;
    });
  }

  _addCreationMessage(conversationEntity, isTemporaryGuest, timestamp, eventSource) {
    conversationEntity.hasCreationMessage = true;

    if (conversationEntity.inTeam()) {
      const allTeamMembersParticipate = this.teamMembers().length
        ? this.teamMembers().every(teamMember => conversationEntity.participating_user_ids().includes(teamMember.id))
        : false;

      conversationEntity.withAllTeamMembers(allTeamMembersParticipate);
    }

    const creationEvent = conversationEntity.isGroup()
      ? z.conversation.EventBuilder.buildGroupCreation(conversationEntity, isTemporaryGuest, timestamp)
      : z.conversation.EventBuilder.build1to1Creation(conversationEntity);

    this.eventRepository.injectEvent(creationEvent, eventSource);
  }

  /**
   * Get specified message and load number preceding and subsequent messages defined by padding.
   *
   * @param {Conversation} conversationEntity Conversation entity
   * @param {Message} messageEntity Message entity
   * @param {number} [padding=30] Number of messages to load around the targeted message
   * @returns {Promise} Resolves with the message
   */
  getMessagesWithOffset(conversationEntity, messageEntity, padding = 30) {
    const messageDate = new Date(messageEntity.timestamp());
    const conversationId = conversationEntity.id;

    conversationEntity.is_pending(true);

    return this.eventService
      .loadPrecedingEvents(conversationId, new Date(0), messageDate, Math.floor(padding / 2))
      .then(precedingMessages => {
        return this.eventService
          .loadFollowingEvents(conversationEntity.id, messageDate, padding - precedingMessages.length)
          .then(followingMessages => precedingMessages.concat(followingMessages));
      })
      .then(messages => this._addEventsToConversation(messages, conversationEntity))
      .then(mappedMessageEntities => {
        conversationEntity.is_pending(false);
        return mappedMessageEntities;
      });
  }

  /**
   * Get subsequent messages starting with the given message.
   *
   * @param {Conversation} conversationEntity Conversation entity
   * @param {Message} messageEntity Message entity
   * @param {boolean} includeMessage Include given message in the results
   * @returns {Promise} Resolves with the messages
   */
  getSubsequentMessages(conversationEntity, messageEntity, includeMessage) {
    const messageDate = new Date(messageEntity.timestamp());
    conversationEntity.is_pending(true);

    return this.eventService
      .loadFollowingEvents(conversationEntity.id, messageDate, Config.MESSAGES_FETCH_LIMIT, includeMessage)
      .then(events => this._addEventsToConversation(events, conversationEntity))
      .then(mappedNessageEntities => {
        conversationEntity.is_pending(false);
        return mappedNessageEntities;
      });
  }

  /**
   * Get messages for given category. Category param acts as lower bound.
   *
   * @param {Conversation} conversationEntity Conversation entity
   * @param {MessageCategory} [category=MessageCategory.NONE] Message category
   * @returns {Promise} Array of message entities
   */
  get_events_for_category(conversationEntity, category = MessageCategory.NONE) {
    return this.eventService
      .loadEventsWithCategory(conversationEntity.id, category)
      .then(events => this.event_mapper.mapJsonEvents(events, conversationEntity))
      .then(messageEntities => this._updateMessagesUserEntities(messageEntities));
  }

  /**
   * Search for given text in conversation.
   *
   * @param {Conversation} conversationEntity Conversation entity
   * @param {string} query Query strings
   * @returns {Promise} Array of message entities
   */
  searchInConversation(conversationEntity, query) {
    if (!conversationEntity || !query.length) {
      return Promise.resolve({});
    }

    return this.conversation_service
      .search_in_conversation(conversationEntity.id, query)
      .then(events => this.event_mapper.mapJsonEvents(events, conversationEntity))
      .then(messageEntities => this._updateMessagesUserEntities(messageEntities))
      .then(messageEntities => ({messageEntities, query}));
  }

  /**
   * Get conversation unread events.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation to start from
   * @returns {undefined} No return value
   */
  _get_unread_events(conversationEntity) {
    const first_message = conversationEntity.getFirstMessage();
    const lower_bound = new Date(conversationEntity.last_read_timestamp());
    const upper_bound = first_message
      ? new Date(first_message.timestamp())
      : new Date(conversationEntity.get_latest_timestamp(this.serverTimeHandler.toServerTimestamp()) + 1);

    if (lower_bound < upper_bound) {
      conversationEntity.is_pending(true);

      return this.eventService
        .loadPrecedingEvents(conversationEntity.id, lower_bound, upper_bound)
        .then(events => {
          if (events.length) {
            this._addEventsToConversation(events, conversationEntity);
          }
          conversationEntity.is_pending(false);
        })
        .catch(error => {
          this.logger.info(`Could not load unread events for conversation: ${conversationEntity.id}`, error);
        });
    }
  }

  /**
   * Update conversation with a user you just unblocked
   * @param {User} user_et User you unblocked
   * @returns {undefined} No return value
   */
  unblocked_user(user_et) {
    this.get1To1Conversation(user_et).then(conversationEntity =>
      conversationEntity.status(ConversationStatus.CURRENT_MEMBER),
    );
  }

  /**
   * Update all conversations on app init.
   * @returns {Promise<Conversation[]>} No return value
   */
  updateConversationsOnAppInit() {
    this.logger.info('Updating group participants');
    return this.updateUnarchivedConversations().then(() => {
      const updatePromises = this.sorted_conversations().map(conversationEntity => {
        return this.updateParticipatingUserEntities(conversationEntity, true);
      });
      return Promise.all(updatePromises);
    });
  }

  /**
   * Update users and events for archived conversations currently visible.
   * @returns {undefined} No return value
   */
  updateArchivedConversations() {
    this.updateConversations(this.conversations_archived());
  }

  /**
   * Update users and events for all unarchived conversations.
   * @returns {Promise<Conversation[]>} No return value
   */
  updateUnarchivedConversations() {
    return this.updateConversations(this.conversations_unarchived());
  }

  updateConversationFromBackend(conversationEntity) {
    return this.conversation_service.get_conversation_by_id(conversationEntity.id).then(conversationData => {
      const {name, message_timer} = conversationData;
      this.conversationMapper.updateProperties(conversationEntity, {name});
      this.conversationMapper.updateSelfStatus(conversationEntity, {message_timer});
    });
  }

  /**
   * Get users and events for conversations.
   *
   * @note To reduce the number of backend calls we merge the user IDs of all conversations first.
   * @param {Array<Conversation>} conversationEntities Array of conversation entities to be updated
   * @returns {undefined} No return value
   */
  updateConversations(conversationEntities) {
    const mapOfUserIds = conversationEntities.map(conversationEntity => conversationEntity.participating_user_ids());
    const userIds = flatten(mapOfUserIds);

    return this.user_repository
      .get_users_by_id(userIds)
      .then(() => conversationEntities.forEach(conversationEntity => this._fetch_users_and_events(conversationEntity)));
  }

  //##############################################################################
  // Repository interactions
  //##############################################################################

  /**
   * Deletes a conversation from the repository.
   * @param {string} conversation_id ID of conversation to be deleted from the repository
   * @returns {undefined} No return value
   */
  deleteConversationFromRepository(conversation_id) {
    this.conversations.remove(conversationEntity => conversationEntity.id === conversation_id);
  }

  deleteConversation(conversationEntity) {
    this.conversation_service
      .deleteConversation(this.team().id, conversationEntity.id)
      .then(() => {
        this.deleteConversationLocally(conversationEntity.id, true);
      })
      .catch(() => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            message: t('modalConversationDeleteErrorMessage', conversationEntity.name()),
            title: t('modalConversationDeleteErrorHeadline'),
          },
        });
      });
  }

  deleteConversationLocally(conversationId, skipNotification = false) {
    const conversationEntity = this.find_conversation_by_id(conversationId);
    if (!conversationEntity) {
      return;
    }
    if (this.is_active_conversation(conversationEntity)) {
      const nextConversation = this.get_next_conversation(conversationEntity);
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversation);
    }
    if (!skipNotification) {
      const deletionMessage = new DeleteConversationMessage(conversationEntity);
      amplify.publish(WebAppEvents.NOTIFICATION.NOTIFY, deletionMessage);
    }
    if (this.conversationLabelRepository.getConversationCustomLabel(conversationEntity, true)) {
      this.conversationLabelRepository.removeConversationFromAllLabels(conversationEntity, true);
      this.conversationLabelRepository.saveLabels();
    }
    this.deleteConversationFromRepository(conversationId);
    this.conversation_service.delete_conversation_from_db(conversationId);
  }

  /**
   * Find a local conversation by ID.
   * @param {string} conversation_id ID of conversation to get
   * @returns {Conversation | undefined} Conversation is locally available
   */
  find_conversation_by_id(conversation_id) {
    // we prevent access to local conversation if the team is deleted
    return this.teamRepository.isTeamDeleted()
      ? undefined
      : this.conversations().find(conversation => conversation.id === conversation_id);
  }

  get_all_users_in_conversation(conversation_id) {
    return this.get_conversation_by_id(conversation_id).then(conversationEntity =>
      [this.selfUser()].concat(conversationEntity.participating_user_ets()),
    );
  }

  /**
   * Check for conversation locally and fetch it from the server otherwise.
   * @param {string} conversation_id ID of conversation to get
   * @returns {Promise<ConversationEntity | undefined>} Resolves with the Conversation entity or `undefined` if not found
   */
  get_conversation_by_id(conversation_id) {
    if (typeof conversation_id !== 'string') {
      return Promise.reject(new z.error.ConversationError(z.error.ConversationError.TYPE.NO_CONVERSATION_ID));
    }
    const conversationEntity = this.find_conversation_by_id(conversation_id);
    if (conversationEntity) {
      return Promise.resolve(conversationEntity);
    }
    return this.fetch_conversation_by_id(conversation_id).catch(error => {
      const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (isConversationNotFound) {
        this.logger.warn(`Failed to get conversation '${conversation_id}': ${error.message}`, error);
      }

      throw error;
    });
  }

  /**
   * Get group conversations by name.
   *
   * @param {string} query Query to be searched in group conversation names
   * @param {boolean} isHandle Query string is handle
   * @returns {Array<Conversation>} Matching group conversations
   */
  getGroupsByName(query, isHandle) {
    return this.sorted_conversations()
      .filter(conversationEntity => {
        if (!conversationEntity.isGroup()) {
          return false;
        }

        const queryString = isHandle ? `@${query}` : query;
        if (compareTransliteration(conversationEntity.display_name(), queryString)) {
          return true;
        }

        for (const userEntity of conversationEntity.participating_user_ets()) {
          const nameString = isHandle ? userEntity.username() : userEntity.name();
          if (startsWith(nameString, query)) {
            return true;
          }
        }

        return false;
      })
      .sort((conversationA, conversationB) => {
        return sortByPriority(conversationA.display_name(), conversationB.display_name(), query);
      })
      .map(conversationEntity => {
        this.updateParticipatingUserEntities(conversationEntity);
        return conversationEntity;
      });
  }

  /**
   * Get the most recent event timestamp from any conversation.
   * @param {boolean} [increment=false] Increment by one for unique timestamp
   * @returns {number} Timestamp value
   */
  getLatestEventTimestamp(increment = false) {
    const mostRecentConversation = this.getMostRecentConversation(true);
    if (mostRecentConversation) {
      const lastEventTimestamp = mostRecentConversation.last_event_timestamp();
      return lastEventTimestamp + (increment ? 1 : 0);
    }

    return 1;
  }

  /**
   * Get the next unarchived conversation.
   *
   * @param {Conversation} conversationEntity Conversation to start from
   * @returns {Conversation} Next conversation
   */
  get_next_conversation(conversationEntity) {
    return getNextItem(this.conversations_unarchived(), conversationEntity);
  }

  /**
   * Get unarchived conversation with the most recent event.
   * @param {boolean} [allConversations=false] Search all conversations
   * @returns {Conversation} Most recent conversation
   */
  getMostRecentConversation(allConversations = false) {
    const [conversationEntity] = allConversations ? this.sorted_conversations() : this.conversations_unarchived();
    return conversationEntity;
  }

  /**
   * Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
   * @returns {Promise} Resolve with the most active conversations
   */
  get_most_active_conversations() {
    return this.conversation_service.get_active_conversations_from_db().then(conversation_ids => {
      return conversation_ids
        .map(conversation_id => this.find_conversation_by_id(conversation_id))
        .filter(conversationEntity => conversationEntity);
    });
  }

  /**
   * Get conversation with a user.
   * @param {User} userEntity User entity for whom to get the conversation
   * @returns {Promise} Resolves with the conversation with requested user
   */
  get1To1Conversation(userEntity) {
    const inCurrentTeam = userEntity.inTeam() && userEntity.isTeamMember();

    if (inCurrentTeam) {
      const matchingConversationEntity = this.conversations().find(conversationEntity => {
        if (!conversationEntity.is1to1()) {
          // Disregard conversations that are not 1:1
          return false;
        }

        const inTeam = userEntity.teamId === conversationEntity.team_id;
        if (!inTeam) {
          // Disregard conversations that are not in the team
          return false;
        }

        const isActiveConversation = !conversationEntity.removed_from_conversation();
        if (!isActiveConversation) {
          // Disregard coversations that self is no longer part of
          return false;
        }

        const [userId] = conversationEntity.participating_user_ids();
        return userEntity.id === userId;
      });

      return matchingConversationEntity
        ? Promise.resolve(matchingConversationEntity)
        : this.createGroupConversation([userEntity]);
    }

    const conversationId = userEntity.connection().conversationId;
    return this.get_conversation_by_id(conversationId)
      .then(conversationEntity => {
        conversationEntity.connection(userEntity.connection());
        return this.updateParticipatingUserEntities(conversationEntity);
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
      });
  }

  /**
   * Check whether conversation is currently displayed.
   * @param {Conversation} conversationEntity Conversation to be saved
   * @returns {boolean} Is the conversation active
   */
  is_active_conversation(conversationEntity) {
    const activeConversation = this.active_conversation();
    return !!activeConversation && !!conversationEntity && activeConversation.id === conversationEntity.id;
  }

  /**
   * Check whether message has been read.
   *
   * @param {string} conversation_id Conversation ID
   * @param {string} message_id Message ID
   * @returns {Promise} Resolves with `true` if message is marked as read
   */
  is_message_read(conversation_id, message_id) {
    if (!conversation_id || !message_id) {
      return Promise.resolve(false);
    }

    return this.get_conversation_by_id(conversation_id)
      .then(conversationEntity => {
        return this.get_message_in_conversation_by_id(conversationEntity, message_id).then(
          message_et => conversationEntity.last_read_timestamp() >= message_et.timestamp(),
        );
      })
      .catch(error => {
        const messageNotFound = error.type === z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (messageNotFound) {
          return true;
        }

        throw error;
      });
  }

  initialize_conversations() {
    this._initStateUpdates();
    this.init_total = this.receiving_queue.getLength();

    if (this.init_total > 5) {
      this.logger.log(`Handling '${this.init_total}' additional messages on app start`);
      return new Promise((resolve, reject) => (this.init_promise = {reject_fn: reject, resolve_fn: resolve}));
    }
  }

  joinConversationWithCode(key, code) {
    return this.conversation_service.postConversationJoin(key, code).then(response => {
      if (response) {
        return this._onCreate(response);
      }
    });
  }

  /**
   * Maps user connection to the corresponding conversation.
   *
   * @note If there is no conversation it will request it from the backend
   * @param {ConnectionEntity} connectionEntity Connections
   * @param {boolean} [show_conversation=false] Open the new conversation
   * @returns {Promise} Resolves when connection was mapped return value
   */
  map_connection(connectionEntity, show_conversation = false) {
    return Promise.resolve(this.find_conversation_by_id(connectionEntity.conversationId))
      .then(conversationEntity => {
        if (!conversationEntity) {
          if (connectionEntity.isConnected() || connectionEntity.isOutgoingRequest()) {
            return this.fetch_conversation_by_id(connectionEntity.conversationId);
          }
        }
        return conversationEntity;
      })
      .then(conversationEntity => {
        if (!conversationEntity) {
          return;
        }
        conversationEntity.connection(connectionEntity);

        if (connectionEntity.isConnected()) {
          conversationEntity.type(ConversationType.ONE2ONE);
        }

        this.updateParticipatingUserEntities(conversationEntity).then(updatedConversationEntity => {
          if (show_conversation) {
            amplify.publish(WebAppEvents.CONVERSATION.SHOW, updatedConversationEntity);
          }

          this.conversations.notifySubscribers();
        });

        return conversationEntity;
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
      });
  }

  /**
   * @returns {Promise<void[]>} resolves when deleted conversations are locally deleted, too.
   */
  checkForDeletedConversations() {
    return Promise.all(
      this.conversations().map(async conversation => {
        try {
          await this.conversation_service.get_conversation_by_id(conversation.id);
        } catch ({code}) {
          if (code === BackendClientError.STATUS_CODE.NOT_FOUND) {
            this.deleteConversationLocally(conversation.id, true);
          }
        }
      }),
    );
  }

  /**
   * Maps user connections to the corresponding conversations.
   * @param {Array<ConnectionEntity>} connectionEntities Connections entities
   * @returns {undefined} No return value
   */
  map_connections(connectionEntities) {
    this.logger.info(`Mapping '${connectionEntities.length}' user connection(s) to conversations`, connectionEntities);
    connectionEntities.map(connectionEntity => this.map_connection(connectionEntity));
  }

  /**
   * Map conversation payload.
   *
   * @param {JSON} payload Payload to map
   * @param {number} [initialTimestamp=this.getLatestEventTimestamp()] Initial server and event timestamp
   * @returns {Conversation|Array<Conversation>} Mapped conversation/s
   */
  mapConversations(payload, initialTimestamp = this.getLatestEventTimestamp()) {
    const conversationsData = payload.length ? payload : [payload];
    const entitites = this.conversationMapper.mapConversations(conversationsData, initialTimestamp);
    entitites.forEach(conversationEntity => {
      this._mapGuestStatusSelf(conversationEntity);
      conversationEntity.selfUser(this.selfUser());
      conversationEntity.setStateChangePersistence(true);
    });

    return payload.length ? entitites : entitites[0];
  }

  map_guest_status_self() {
    this.filtered_conversations().forEach(conversationEntity => this._mapGuestStatusSelf(conversationEntity));

    if (this.isTeam()) {
      this.selfUser().inTeam(true);
      this.selfUser().isTeamMember(true);
    }
  }

  _mapGuestStatusSelf(conversationEntity) {
    const conversationTeamId = conversationEntity.team_id;
    const selfTeamId = this.team() && this.team().id;
    const isConversationGuest = !!(conversationTeamId && (!selfTeamId || selfTeamId !== conversationTeamId));
    conversationEntity.isGuest(isConversationGuest);
  }

  /**
   * Sends a message to backend that the conversation has been fully read.
   * The message will allow all the self clients to synchronize conversation read state.
   *
   * @param {Conversation} conversationEntity Conversation to be marked as read
   * @returns {undefined} No return value
   */
  markAsRead(conversationEntity) {
    const conversationId = conversationEntity.id;
    const timestamp = conversationEntity.last_read_timestamp();
    const protoLastRead = new LastRead({
      conversationId,
      lastReadTimestamp: timestamp,
    });
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.LAST_READ]: protoLastRead,
      messageId: createRandomUuid(),
    });

    const eventInfoEntity = new EventInfoEntity(genericMessage, this.self_conversation().id);
    this.sendGenericMessageToConversation(eventInfoEntity)
      .then(() => {
        amplify.publish(WebAppEvents.NOTIFICATION.REMOVE_READ);
        this.logger.info(`Marked conversation '${conversationId}' as read on '${new Date(timestamp).toISOString()}'`);
      })
      .catch(error => {
        const errorMessage = 'Failed to update last read timestamp';
        this.logger.error(`${errorMessage}: ${error.message}`, error);
        Raygun.send(new Error(errorMessage), {label: error.label, message: error.message});
      });
  }

  /**
   * Save a conversation in the repository.
   * @param {Conversation} conversationEntity Conversation to be saved in the repository
   * @returns {Promise} Resolves when conversation was saved
   */
  save_conversation(conversationEntity) {
    const localEntity = this.find_conversation_by_id(conversationEntity.id);
    if (!localEntity) {
      this.conversations.push(conversationEntity);
      return this.save_conversation_state_in_db(conversationEntity);
    }
    return Promise.resolve(localEntity);
  }

  /**
   * Persists a conversation state in the database.
   * @param {Conversation} conversationEntity Conversation of which the state should be persisted
   * @returns {Promise} Resolves when conversation was saved
   */
  save_conversation_state_in_db(conversationEntity) {
    return this.conversation_service.save_conversation_state_in_db(conversationEntity);
  }

  /**
   * Save conversations in the repository.
   * @param {Array<Conversation>} conversationEntities Conversations to be saved in the repository
   * @returns {undefined} No return value
   */
  save_conversations(conversationEntities) {
    koArrayPushAll(this.conversations, conversationEntities);
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not unarchive conversations when handling the notification stream
   * @param {NOTIFICATION_HANDLING_STATE} handling_state State of the notifications stream handling
   * @returns {undefined} No return value
   */
  set_notification_handling_state(handling_state) {
    const updated_handling_state = handling_state !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.block_event_handling() !== updated_handling_state) {
      this.block_event_handling(updated_handling_state);
      this.messageSender.pauseQueue(this.block_event_handling());
      this.logger.info(`Block handling of conversation events: ${this.block_event_handling()}`);
    }
  }

  /**
   * Update participating users in a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to be updated
   * @param {boolean} [offline=false] Should we only look for cached contacts
   * @param {boolean} [updateGuests=false] Update conversation guests
   * @returns {Promise} Resolves when users have been updated
   */
  updateParticipatingUserEntities(conversationEntity, offline = false, updateGuests = false) {
    return this.user_repository
      .get_users_by_id(conversationEntity.participating_user_ids(), offline)
      .then(userEntities => {
        userEntities.sort((userA, userB) => sortByPriority(userA.first_name(), userB.first_name()));
        conversationEntity.participating_user_ets(userEntities);

        if (updateGuests) {
          conversationEntity.updateGuests();
        }

        return conversationEntity;
      });
  }

  //##############################################################################
  // Send events
  //##############################################################################

  /**
   * Add users to an existing conversation.
   *
   * @param {Conversation} conversationEntity Conversation to add users to
   * @param {Array<User>} userEntities Users to be added to the conversation
   * @returns {Promise} Resolves when members were added
   */
  addMembers(conversationEntity, userEntities) {
    const userIds = userEntities.map(userEntity => userEntity.id);

    return this.conversation_service
      .postMembers(conversationEntity.id, userIds)
      .then(response => {
        if (response) {
          this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
        }
      })
      .catch(error => this._handleAddToConversationError(error, conversationEntity, userIds));
  }

  addMissingMember(conversationId, userIds, timestamp) {
    return this.get_conversation_by_id(conversationId).then(conversationEntity => {
      const [sender] = userIds;
      const event = z.conversation.EventBuilder.buildMemberJoin(conversationEntity, sender, userIds, timestamp);
      return this.eventRepository.injectEvent(event, EventRepository.SOURCE.INJECTED);
    });
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param {Conversation} conversationEntity Conversation to add service to
   * @param {string} providerId ID of service provider
   * @param {string} serviceId ID of service
   * @returns {Promise} Resolves when service was added
   */
  addService(conversationEntity, providerId, serviceId) {
    return this.conversation_service
      .postBots(conversationEntity.id, providerId, serviceId)
      .then(response => {
        const event = response ? response.event : undefined;
        if (event) {
          const logMessage = `Successfully added service to conversation '${conversationEntity.display_name()}'`;
          this.logger.debug(logMessage, response);
          return this.eventRepository.injectEvent(response.event, EventRepository.SOURCE.BACKEND_RESPONSE);
        }

        return event;
      })
      .catch(error => this._handleAddToConversationError(error, conversationEntity, [serviceId]));
  }

  _handleAddToConversationError(error, conversationEntity, userIds) {
    switch (error.label) {
      case BackendClientError.LABEL.NOT_CONNECTED: {
        this._handleUsersNotConnected(userIds);
        break;
      }

      case BackendClientError.LABEL.BAD_GATEWAY:
      case BackendClientError.LABEL.SERVER_ERROR:
      case BackendClientError.LABEL.SERVICE_DISABLED:
      case BackendClientError.LABEL.TOO_MANY_BOTS: {
        const messageText = t('modalServiceUnavailableMessage');
        const titleText = t('modalServiceUnavailableHeadline');

        this._showModal(messageText, titleText);
        break;
      }

      case BackendClientError.LABEL.TOO_MANY_MEMBERS: {
        this._handleTooManyMembersError(conversationEntity.getNumberOfParticipants());
        break;
      }

      default: {
        throw error;
      }
    }
  }

  /**
   * Clear conversation content and archive the conversation.
   *
   * @note According to spec we archive a conversation when we clear it.
   * It will be unarchived once it is opened through search. We use the archive flag to distinguish states.
   *
   * @param {Conversation} conversationEntity Conversation to clear
   * @param {boolean} [leaveConversation=false] Should we leave the conversation before clearing the content?
   * @returns {undefined} No return value
   */
  clear_conversation(conversationEntity, leaveConversation = false) {
    const isActiveConversation = this.is_active_conversation(conversationEntity);
    const nextConversationEntity = this.get_next_conversation(conversationEntity);

    if (leaveConversation) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
    }

    this._updateClearedTimestamp(conversationEntity);
    this._clear_conversation(conversationEntity);

    if (leaveConversation) {
      this.removeMember(conversationEntity, this.selfUser().id);
    }

    if (isActiveConversation) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity);
    }
  }

  /**
   * Update cleared of conversation using timestamp.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation to update
   * @returns {undefined} No return value
   */
  _updateClearedTimestamp(conversationEntity) {
    const timestamp = conversationEntity.get_last_known_timestamp(this.serverTimeHandler.toServerTimestamp());

    if (timestamp && conversationEntity.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.CLEARED)) {
      const protoCleared = new Cleared({
        clearedTimestamp: timestamp,
        conversationId: conversationEntity.id,
      });
      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.CLEARED]: protoCleared,
        messageId: createRandomUuid(),
      });

      const eventInfoEntity = new EventInfoEntity(genericMessage, this.self_conversation().id);
      this.sendGenericMessageToConversation(eventInfoEntity).then(() => {
        this.logger.info(`Cleared conversation '${conversationEntity.id}' on '${new Date(timestamp).toISOString()}'`);
      });
    }
  }

  leaveGuestRoom() {
    if (this.selfUser().isTemporaryGuest()) {
      const conversationEntity = this.getMostRecentConversation(true);
      return this.conversation_service.deleteMembers(conversationEntity.id, this.selfUser().id);
    }
  }

  /**
   * Remove member from conversation.
   *
   * @param {Conversation} conversationEntity Conversation to remove member from
   * @param {string} userId ID of member to be removed from the conversation
   * @returns {Promise} Resolves when member was removed from the conversation
   */
  removeMember(conversationEntity, userId) {
    return this.conversation_service.deleteMembers(conversationEntity.id, userId).then(response => {
      const roles = conversationEntity.roles();
      delete roles[userId];
      conversationEntity.roles(roles);
      const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
      const event =
        response || z.conversation.EventBuilder.buildMemberLeave(conversationEntity, userId, true, currentTimestamp);

      this.eventRepository.injectEvent(event, EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Remove service from conversation.
   *
   * @param {Conversation} conversationEntity Conversation to remove service from
   * @param {User} userId ID of service user to be removed from the conversation
   * @returns {Promise} Resolves when service was removed from the conversation
   */
  removeService(conversationEntity, userId) {
    return this.conversation_service.deleteBots(conversationEntity.id, userId).then(response => {
      const hasResponse = response && response.event;
      const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
      const event = hasResponse
        ? response.event
        : z.conversation.EventBuilder.buildMemberLeave(conversationEntity, userId, true, currentTimestamp);

      this.eventRepository.injectEvent(event, EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Rename conversation.
   *
   * @param {Conversation} conversationEntity Conversation to rename
   * @param {string} name New conversation name
   * @returns {Promise} Resolves when conversation was renamed
   */
  renameConversation(conversationEntity, name) {
    return this.conversation_service.updateConversationName(conversationEntity.id, name).then(response => {
      if (response) {
        this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
        return response;
      }
    });
  }

  /**
   * Set the global message timer
   *
   * @param {Conversation} conversationEntity Conversation to update
   * @param {number} messageTimer New message timer value
   * @returns {Promise} Resolves when conversation was updated on server side
   */
  updateConversationMessageTimer(conversationEntity, messageTimer) {
    messageTimer = ConversationEphemeralHandler.validateTimer(messageTimer);

    return this.conversation_service
      .updateConversationMessageTimer(conversationEntity.id, messageTimer)
      .then(response => {
        if (response) {
          this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
          return response;
        }
      });
  }

  updateConversationReceiptMode(conversationEntity, receiptMode) {
    return this.conversation_service
      .updateConversationReceiptMode(conversationEntity.id, receiptMode)
      .then(response => {
        if (response) {
          this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
          return response;
        }
      });
  }

  reset_session(user_id, client_id, conversation_id) {
    this.logger.info(`Resetting session with client '${client_id}' of user '${user_id}'.`);

    return this.cryptography_repository
      .deleteSession(user_id, client_id)
      .then(session_id => {
        if (session_id) {
          this.logger.info(`Deleted session with client '${client_id}' of user '${user_id}'.`);
        } else {
          this.logger.warn('No local session found to delete.');
        }

        return this.sendSessionReset(user_id, client_id, conversation_id);
      })
      .catch(error => {
        const logMessage = `Failed to reset session for client '${client_id}' of user '${user_id}': ${error.message}`;
        this.logger.warn(logMessage, error);
        throw error;
      });
  }

  /**
   * Send a specific GIF to a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to send message in
   * @param {string} url URL of giphy image
   * @param {string} tag tag tag used for gif search
   * @param {QuoteEntity} [quoteEntity] Quote as part of the message
   * @returns {Promise} Resolves when the gif was posted
   */
  sendGif(conversationEntity, url, tag, quoteEntity) {
    if (!tag) {
      tag = t('extensionsGiphyRandom');
    }

    return loadUrlBlob(url).then(blob => {
      const textMessage = t('extensionsGiphyMessage', tag, {}, true);
      this.sendText(conversationEntity, textMessage, null, quoteEntity);
      return this.upload_images(conversationEntity, [blob]);
    });
  }

  /**
   * Team member was removed.
   * @param {string} teamId ID of team that member was removed from
   * @param {string} userId ID of leaving user
   * @param {Date} isoDate Date of member removal
   * @returns {undefined} No return value
   */
  teamMemberLeave(teamId, userId, isoDate) {
    this.user_repository.get_user_by_id(userId).then(userEntity => {
      this.conversations()
        .filter(conversationEntity => {
          const conversationInTeam = conversationEntity.team_id === teamId;
          const userIsParticipant = conversationEntity.participating_user_ids().includes(userId);
          return conversationInTeam && userIsParticipant && !conversationEntity.removed_from_conversation();
        })
        .forEach(conversationEntity => {
          const leaveEvent = z.conversation.EventBuilder.buildTeamMemberLeave(conversationEntity, userEntity, isoDate);
          this.eventRepository.injectEvent(leaveEvent);
        });
    });
  }

  /**
   * Set the notification state of a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to change notification state off
   * @param {NotificationSetting} notificationState New notification state
   * @returns {Promise} Resolves when the notification stated was change
   */
  setNotificationState(conversationEntity, notificationState) {
    if (!conversationEntity || notificationState === undefined) {
      return Promise.reject(new z.error.ConversationError(BaseError.TYPE.MISSING_PARAMETER));
    }

    const validNotificationStates = Object.values(NOTIFICATION_STATE);
    if (!validNotificationStates.includes(notificationState)) {
      return Promise.reject(new z.error.ConversationError(BaseError.TYPE.INVALID_PARAMETER));
    }

    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const otrMuted = notificationState !== NOTIFICATION_STATE.EVERYTHING;
    const payload = {
      otr_muted: otrMuted,
      otr_muted_ref: new Date(conversationEntity.get_last_known_timestamp(currentTimestamp)).toISOString(),
      otr_muted_status: notificationState,
    };

    return this.conversation_service
      .update_member_properties(conversationEntity.id, payload)
      .then(() => {
        const response = {data: payload, from: this.selfUser().id};
        this._onMemberUpdate(conversationEntity, response);

        const {otr_muted: muted, otr_muted_ref: mutedRef, otr_muted_status: mutedStatus} = payload;
        const logMessage = `Changed notification state of conversation to '${muted} | ${mutedStatus}' on '${mutedRef}'`;
        this.logger.info(logMessage);
        return response;
      })
      .catch(error => {
        const log = `Failed to change notification state of conversation '${conversationEntity.id}': ${error.message}`;
        const rejectError = new Error(log);
        this.logger.warn(rejectError.message, error);
        throw rejectError;
      });
  }

  /**
   * Archive a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to rename
   * @returns {Promise} Resolves when the conversation was archived
   */
  archiveConversation(conversationEntity) {
    return this._toggleArchiveConversation(conversationEntity, true).then(() => {
      this.logger.info(`Conversation '${conversationEntity.id}' archived`);
    });
  }

  /**
   * Un-archive a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to unarchive
   * @param {boolean} [forceChange=false] Force state change without new message
   * @param {string} trigger Trigger for unarchive
   * @returns {Promise} Resolves when the conversation was unarchived
   */
  unarchiveConversation(conversationEntity, forceChange = false, trigger = 'unknown') {
    return this._toggleArchiveConversation(conversationEntity, false, forceChange).then(() => {
      this.logger.info(`Conversation '${conversationEntity.id}' unarchived by trigger '${trigger}'`);
    });
  }

  _toggleArchiveConversation(conversationEntity, newState, forceChange) {
    if (!conversationEntity) {
      const error = new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
      return Promise.reject(error);
    }

    const stateChange = conversationEntity.is_archived() !== newState;

    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const archiveTimestamp = conversationEntity.get_last_known_timestamp(currentTimestamp);
    const sameTimestamp = conversationEntity.archivedTimestamp() === archiveTimestamp;
    const skipChange = sameTimestamp && !forceChange;

    if (!stateChange && skipChange) {
      return Promise.reject(new z.error.ConversationError(z.error.ConversationError.TYPE.NO_CHANGES));
    }

    const payload = {
      otr_archived: newState,
      otr_archived_ref: new Date(archiveTimestamp).toISOString(),
    };

    const conversationId = conversationEntity.id;

    const updatePromise = conversationEntity.removed_from_conversation()
      ? Promise.resolve()
      : this.conversation_service.update_member_properties(conversationId, payload).catch(error => {
          const logMessage = `Failed to change archived state of '${conversationId}' to '${newState}': ${error.code}`;
          this.logger.error(logMessage);

          const isNotFound = error.code === BackendClientError.STATUS_CODE.NOT_FOUND;
          if (!isNotFound) {
            throw error;
          }
        });

    return updatePromise.then(() => {
      const response = {
        data: payload,
        from: this.selfUser().id,
      };

      this._onMemberUpdate(conversationEntity, response);
    });
  }

  _checkChangedConversations() {
    this.conversationsWithNewEvents.forEach(conversationEntity => {
      if (conversationEntity.shouldUnarchive()) {
        this.unarchiveConversation(conversationEntity, false, 'event from notification stream');
      }
    });

    this.conversationsWithNewEvents.clear();
  }

  /**
   * Clears conversation content from view and the database.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation entity to delete
   * @param {number} [timestamp] Optional timestamps for which messages to remove
   * @returns {undefined} No return value
   */
  _clear_conversation(conversationEntity, timestamp) {
    this._deleteMessages(conversationEntity, timestamp);

    if (conversationEntity.removed_from_conversation()) {
      this.conversation_service.delete_conversation_from_db(conversationEntity.id);
      this.deleteConversationFromRepository(conversationEntity.id);
    }
  }

  _handleConversationCreateError(error, userIds) {
    switch (error.label) {
      case BackendClientError.LABEL.CLIENT_ERROR:
        this._handleTooManyMembersError();
        break;
      case BackendClientError.LABEL.NOT_CONNECTED:
        this._handleUsersNotConnected(userIds);
        break;
      default:
        throw error;
    }
  }

  _handleTooManyMembersError(participants = ConversationRepository.CONFIG.GROUP.MAX_SIZE) {
    const openSpots = ConversationRepository.CONFIG.GROUP.MAX_SIZE - participants;
    const substitutions = {number1: ConversationRepository.CONFIG.GROUP.MAX_SIZE, number2: Math.max(0, openSpots)};

    const messageText = t('modalConversationTooManyMembersMessage', substitutions);
    const titleText = t('modalConversationTooManyMembersHeadline');
    this._showModal(messageText, titleText);
  }

  _handleUsersNotConnected(userIds = []) {
    const [userID] = userIds;
    const userPromise = userIds.length === 1 ? this.user_repository.get_user_by_id(userID) : Promise.resolve();

    userPromise.then(userEntity => {
      const username = userEntity ? userEntity.first_name() : undefined;
      const messageText = username
        ? t('modalConversationNotConnectedMessageOne', username)
        : t('modalConversationNotConnectedMessageMany');
      const titleText = t('modalConversationNotConnectedHeadline');
      this._showModal(messageText, titleText);
    });
  }

  _showModal(messageText, titleText) {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: messageText,
        title: titleText,
      },
    });
  }

  _isUserCancellationError(error) {
    const errorTypes = [
      z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION,
      z.error.ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
    ];
    return errorTypes.includes(error.type);
  }

  /**
   * Send a read receipt for the last message in a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to update
   * @param {Message} messageEntity Message to send a read receipt for
   * @param {Array<Message>} [moreMessageEntities] More messages to send a read receipt for
   * @returns {undefined} No return value
   */
  sendReadReceipt(conversationEntity, messageEntity, moreMessageEntities = []) {
    this._sendConfirmationStatus(conversationEntity, messageEntity, Confirmation.Type.READ, moreMessageEntities);
  }

  //##############################################################################
  // Send encrypted events
  //##############################################################################

  send_asset_remotedata(conversationEntity, file, messageId, asImage) {
    let genericMessage;

    return this.get_message_in_conversation_by_id(conversationEntity, messageId)
      .then(() => {
        const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
        const options = {
          expectsReadConfirmation: this.expectReadReceipt(conversationEntity),
          legalHoldStatus: conversationEntity.legalHoldStatus(),
          retention,
        };

        const uploadPromise = this.assetUploader.uploadAsset(messageId, file, options, asImage);
        return uploadPromise;
      })
      .then(asset => {
        genericMessage = new GenericMessage({
          [GENERIC_MESSAGE_TYPE.ASSET]: asset,
          messageId,
        });

        if (conversationEntity.messageTimer()) {
          genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
        }

        const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
        return this.sendGenericMessageToConversation(eventInfoEntity);
      })
      .then(payload => {
        const {uploaded: assetData} = conversationEntity.messageTimer()
          ? genericMessage.ephemeral.asset
          : genericMessage.asset;

        const data = {
          key: assetData.assetId,
          otr_key: assetData.otrKey,
          sha256: assetData.sha256,
          token: assetData.assetToken,
        };

        const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
        const assetAddEvent = z.conversation.EventBuilder.buildAssetAdd(conversationEntity, data, currentTimestamp);

        assetAddEvent.id = messageId;
        assetAddEvent.time = payload.time;

        return this._on_asset_upload_complete(conversationEntity, assetAddEvent);
      });
  }

  /**
   * Send asset metadata message to specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that should receive the file
   * @param {File} file File to send
   * @param {boolean} allowImageDetection allow images to be treated as images (not files)
   * @returns {Promise} Resolves when the asset metadata was sent
   */
  send_asset_metadata(conversationEntity, file, allowImageDetection) {
    return buildMetadata(file)
      .catch(error => {
        const logMessage = `Couldn't render asset preview from metadata. Asset might be corrupt: ${error.message}`;
        this.logger.warn(logMessage, error);
        return undefined;
      })
      .then(metadata => {
        const assetOriginal = new Asset.Original({mimeType: file.type, name: file.name, size: file.size});

        if (isAudio(file)) {
          assetOriginal.audio = metadata;
        } else if (isVideo(file)) {
          assetOriginal.video = metadata;
        } else if (allowImageDetection && isImage(file)) {
          assetOriginal.image = metadata;
        }

        const protoAsset = new Asset({
          [PROTO_MESSAGE_TYPE.ASSET_ORIGINAL]: assetOriginal,
          [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: this.expectReadReceipt(conversationEntity),
          [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: conversationEntity.legalHoldStatus(),
        });

        return protoAsset;
      })
      .then(asset => {
        let genericMessage = new GenericMessage({
          [GENERIC_MESSAGE_TYPE.ASSET]: asset,
          messageId: createRandomUuid(),
        });

        if (conversationEntity.messageTimer()) {
          genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
        }

        return this._send_and_inject_generic_message(conversationEntity, genericMessage);
      })
      .catch(error => {
        const log = `Failed to upload metadata for asset in conversation '${conversationEntity.id}': ${error.message}`;
        this.logger.warn(log, error);

        if (this._isUserCancellationError(error)) {
          throw error;
        }
      });
  }

  /**
   * Send asset preview message to specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that should receive the preview
   * @param {File} file File to generate preview from
   * @param {string} messageId Message ID of the message to generate a preview for
   * @returns {Promise} Resolves when the asset preview was sent
   */
  sendAssetPreview(conversationEntity, file, messageId) {
    return poster(file)
      .then(imageBlob => {
        if (!imageBlob) {
          throw Error('No image available');
        }

        const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
        const options = {
          expectsReadConfirmation: this.expectReadReceipt(conversationEntity),
          legalHoldStatus: conversationEntity.legalHoldStatus(),
          retention,
        };

        const messageEntityPromise = this.get_message_in_conversation_by_id(conversationEntity, messageId);
        return messageEntityPromise.then(messageEntity => {
          return this.assetUploader.uploadAsset(messageEntity.id, imageBlob, options).then(uploadedImageAsset => {
            const assetPreview = new Asset.Preview(imageBlob.type, imageBlob.size, uploadedImageAsset.uploaded);
            const protoAsset = new Asset({
              [PROTO_MESSAGE_TYPE.ASSET_PREVIEW]: assetPreview,
              [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: options.expectsReadConfirmation,
              [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: options.legalHoldStatus,
            });

            const genericMessage = new GenericMessage({
              [GENERIC_MESSAGE_TYPE.ASSET]: protoAsset,
              messageId,
            });

            return this._send_and_inject_generic_message(conversationEntity, genericMessage, false);
          });
        });
      })
      .catch(error => {
        const message = `No preview for asset '${messageId}' in conversation '${conversationEntity.id}' uploaded `;
        this.logger.warn(message, error);
      });
  }

  /**
   * Send asset upload failed message to specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that should receive the file
   * @param {string} messageId ID of the metadata message
   * @param {AssetUploadFailedReason} [reason=AssetUploadFailedReason.FAILED] Cause for the failed upload (optional)
   * @returns {Promise} Resolves when the asset failure was sent
   */
  send_asset_upload_failed(conversationEntity, messageId, reason = AssetUploadFailedReason.FAILED) {
    const wasCancelled = reason === AssetUploadFailedReason.CANCELLED;
    const protoReason = wasCancelled ? Asset.NotUploaded.CANCELLED : Asset.NotUploaded.FAILED;
    const protoAsset = new Asset({
      [PROTO_MESSAGE_TYPE.ASSET_NOT_UPLOADED]: protoReason,
      [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: this.expectReadReceipt(conversationEntity),
      [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: conversationEntity.legalHoldStatus(),
    });

    const generic_message = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.ASSET]: protoAsset,
      messageId,
    });

    return this._send_and_inject_generic_message(conversationEntity, generic_message);
  }

  /**
   * Send confirmation for a content message in specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that content message was received in
   * @param {Message} messageEntity Message for which to acknowledge receipt
   * @param {Confirmation.Type} type The type of confirmation to send
   * @param {Array<Message>} [moreMessageEntities] More messages to send a read receipt for
   * @returns {undefined} No return value
   */
  _sendConfirmationStatus(conversationEntity, messageEntity, type, moreMessageEntities = []) {
    const typeToConfirm = EventTypeHandling.CONFIRM.includes(messageEntity.type);

    if (messageEntity.user().is_me || !typeToConfirm) {
      return;
    }

    if (type === Confirmation.Type.DELIVERED) {
      const otherUserIn1To1 = conversationEntity.is1to1();
      const CONFIRMATION_THRESHOLD = ConversationRepository.CONFIG.CONFIRMATION_THRESHOLD;
      const withinThreshold = messageEntity.timestamp() >= Date.now() - CONFIRMATION_THRESHOLD;

      if (!otherUserIn1To1 || !withinThreshold) {
        return;
      }
    }

    const moreMessageIds = moreMessageEntities.length ? moreMessageEntities.map(entity => entity.id) : undefined;
    const protoConfirmation = new Confirmation({
      firstMessageId: messageEntity.id,
      moreMessageIds,
      type,
    });
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.CONFIRMATION]: protoConfirmation,
      messageId: createRandomUuid(),
    });

    this.messageSender.queueMessage(() => {
      return this.create_recipients(conversationEntity.id, true, [messageEntity.from]).then(recipients => {
        const options = {nativePush: false, precondition: [messageEntity.from], recipients};
        const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id, options);

        return this._sendGenericMessage(eventInfoEntity);
      });
    });
  }

  /**
   * Send call message in specified conversation.
   *
   * @param {EventInfoEntity} eventInfoEntity Event info to be send
   * @param {string} conversationId id of the conversation to send call message to
   * @returns {Promise} Resolves when the confirmation was sent
   */
  sendCallingMessage(eventInfoEntity, conversationId) {
    return this.messageSender.queueMessage(() => {
      const options = eventInfoEntity.options;
      const recipientsPromise = options.recipients
        ? Promise.resolve(eventInfoEntity)
        : this.create_recipients(conversationId, false).then(recipients => {
            eventInfoEntity.updateOptions({recipients});
            return eventInfoEntity;
          });
      return recipientsPromise.then(infoEntity => this._sendGenericMessage(infoEntity));
    });
  }

  /**
   * Send knock in specified conversation.
   * @param {Conversation} conversationEntity Conversation to send knock in
   * @returns {Promise} Resolves after sending the knock
   */
  sendKnock(conversationEntity) {
    const protoKnock = new Knock({
      [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: this.expectReadReceipt(conversationEntity),
      [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: conversationEntity.legalHoldStatus(),
      hotKnock: false,
    });

    let genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.KNOCK]: protoKnock,
      messageId: createRandomUuid(),
    });

    if (conversationEntity.messageTimer()) {
      genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
    }

    return this._send_and_inject_generic_message(conversationEntity, genericMessage).catch(error => {
      if (!this._isUserCancellationError(error)) {
        this.logger.error(`Error while sending knock: ${error.message}`, error);
        throw error;
      }
    });
  }

  /**
   * Send link preview in specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that should receive the message
   * @param {string} textMessage Plain text message that possibly contains link
   * @param {GenericMessage} genericMessage GenericMessage of containing text or edited message
   * @param {Array<MentionEntity>} [mentionEntities] Mentions as part of message
   * @param {QuoteEntity} quoteEntity Link to a quoted message
   * @returns {Promise} Resolves after sending the message
   */
  sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities, quoteEntity) {
    const conversationId = conversationEntity.id;
    const messageId = genericMessage.messageId;

    return this.link_repository
      .getLinkPreviewFromString(textMessage)
      .then(linkPreview => {
        if (linkPreview) {
          const protoText = this._createTextProto(
            messageId,
            textMessage,
            mentionEntities,
            quoteEntity,
            [linkPreview],
            this.expectReadReceipt(conversationEntity),
            conversationEntity.legalHoldStatus(),
          );
          genericMessage[GENERIC_MESSAGE_TYPE.TEXT] = protoText;

          return this.get_message_in_conversation_by_id(conversationEntity, messageId);
        }

        this.logger.debug(`No link preview for message '${messageId}' in conversation '${conversationId}' created`);
      })
      .then(messageEntity => {
        if (messageEntity) {
          const assetEntity = messageEntity.get_first_asset();
          const messageContentUnchanged = assetEntity.text === textMessage;

          if (messageContentUnchanged) {
            this.logger.debug(`Sending link preview for message '${messageId}' in conversation '${conversationId}'`);
            return this._send_and_inject_generic_message(conversationEntity, genericMessage, false);
          }

          this.logger.debug(`Skipped sending link preview as message '${messageId}' in '${conversationId}' changed`);
        }
      })
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          this.logger.warn(`Failed sending link preview for message '${messageId}' in '${conversationId}'`);
          throw error;
        }

        this.logger.warn(`Skipped link preview for unknown message '${messageId}' in '${conversationId}'`);
      });
  }

  /**
   * Send location message in specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that should receive the message
   * @param {number} longitude Longitude of the location
   * @param {number} latitude Latitude of the location
   * @param {string} name Name of the location
   * @param {number} zoom Zoom factor for the map (Google Maps)
   * @returns {Promise} Resolves after sending the location
   */
  sendLocation(conversationEntity, longitude, latitude, name, zoom) {
    const protoLocation = new Location({
      expectsReadConfirmation: this.expectReadReceipt(conversationEntity),
      latitude,
      legalHoldStatus: conversationEntity.legalHoldStatus(),
      longitude,
      name,
      zoom,
    });
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.LOCATION]: protoLocation,
      messageId: createRandomUuid(),
    });

    const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
    return this.sendGenericMessageToConversation(eventInfoEntity);
  }

  /**
   * Send edited message in specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation entity
   * @param {string} textMessage Edited plain text message
   * @param {Message} originalMessageEntity Original message entity
   * @param {Array<MentionEntity>} [mentionEntities] Mentions as part of the message
   * @returns {Promise} Resolves after sending the message
   */
  sendMessageEdit(conversationEntity, textMessage, originalMessageEntity, mentionEntities) {
    const hasDifferentText = isTextDifferent(originalMessageEntity, textMessage);
    const hasDifferentMentions = areMentionsDifferent(originalMessageEntity, mentionEntities);
    const wasEdited = hasDifferentText || hasDifferentMentions;

    if (!wasEdited) {
      return Promise.reject(new z.error.ConversationError(z.error.ConversationError.TYPE.NO_MESSAGE_CHANGES));
    }

    const messageId = createRandomUuid();

    const protoText = this._createTextProto(
      messageId,
      textMessage,
      mentionEntities,
      undefined,
      undefined,
      this.expectReadReceipt(conversationEntity),
      conversationEntity.legalHoldStatus(),
    );
    const protoMessageEdit = new MessageEdit({replacingMessageId: originalMessageEntity.id, text: protoText});
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.EDITED]: protoMessageEdit,
      messageId,
    });

    return this._send_and_inject_generic_message(conversationEntity, genericMessage, false)
      .then(() => {
        return this.sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities);
      })
      .catch(error => {
        if (!this._isUserCancellationError(error)) {
          this.logger.error(`Error while editing message: ${error.message}`, error);
          throw error;
        }
      });
  }

  /**
   * Toggle like status of message.
   *
   * @param {Conversation} conversationEntity Conversation entity
   * @param {Message} message_et Message to react to
   * @returns {undefined} No return value
   */
  toggle_like(conversationEntity, message_et) {
    if (!conversationEntity.removed_from_conversation()) {
      const reaction = message_et.is_liked() ? ReactionType.NONE : ReactionType.LIKE;
      message_et.is_liked(!message_et.is_liked());

      window.setTimeout(() => this.sendReaction(conversationEntity, message_et, reaction), 100);
    }
  }

  /**
   * Send reaction to a content message in specified conversation.
   * @param {Conversation} conversationEntity Conversation to send reaction in
   * @param {Message} messageEntity Message to react to
   * @param {ReactionType} reaction Reaction
   * @returns {Promise} Resolves after sending the reaction
   */
  sendReaction(conversationEntity, messageEntity, reaction) {
    const protoReaction = new Reaction({emoji: reaction, messageId: messageEntity.id});
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.REACTION]: protoReaction,
      messageId: createRandomUuid(),
    });

    return this._send_and_inject_generic_message(conversationEntity, genericMessage);
  }

  /**
   * Sending a message to the remote end of a session reset.
   *
   * @note When we reset a session then we must inform the remote client about this action. It sends a ProtocolBuffer message
   *  (which will not be rendered in the view) to the remote client. This message only needs to be sent to the affected
   *  remote client, therefore we force the message sending.
   *
   * @param {string} userId User ID
   * @param {string} clientId Client ID
   * @param {string} conversationId Conversation ID
   * @returns {Promise} Resolves after sending the session reset
   */
  sendSessionReset(userId, clientId, conversationId) {
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.CLIENT_ACTION]: ClientAction.RESET_SESSION,
      messageId: createRandomUuid(),
    });

    const options = {
      precondition: true,
      recipients: {[userId]: [clientId]},
    };
    const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId, options);

    return this._sendGenericMessage(eventInfoEntity)
      .then(response => {
        this.logger.info(`Sent info about session reset to client '${clientId}' of user '${userId}'`);
        return response;
      })
      .catch(error => {
        this.logger.error(`Sending conversation reset failed: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Send text message in specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that should receive the message
   * @param {string} textMessage Plain text message
   * @param {Array<MentionEntity>} [mentionEntities] Mentions as part of the message
   * @param {QuoteEntity} [quoteEntity] Quote as part of the message
   * @returns {Promise} Resolves after sending the message
   */
  sendText(conversationEntity, textMessage, mentionEntities, quoteEntity) {
    const messageId = createRandomUuid();

    const protoText = this._createTextProto(
      messageId,
      textMessage,
      mentionEntities,
      quoteEntity,
      undefined,
      this.expectReadReceipt(conversationEntity),
      conversationEntity.legalHoldStatus(),
    );
    let genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.TEXT]: protoText,
      messageId,
    });

    if (conversationEntity.messageTimer()) {
      genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
    }

    return this._send_and_inject_generic_message(conversationEntity, genericMessage).then(() => genericMessage);
  }

  /**
   * Send text message with link preview in specified conversation.
   *
   * @param {Conversation} conversationEntity Conversation that should receive the message
   * @param {string} textMessage Plain text message
   * @param {Array<MentionEntity>} [mentionEntities] Mentions part of the message
   * @param {QuoteEntity} [quoteEntity] Quoted message
   * @returns {Promise} Resolves after sending the message
   */
  sendTextWithLinkPreview(conversationEntity, textMessage, mentionEntities, quoteEntity) {
    return this.sendText(conversationEntity, textMessage, mentionEntities, quoteEntity)
      .then(genericMessage => {
        return this.sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities, quoteEntity);
      })
      .catch(error => {
        if (!this._isUserCancellationError(error)) {
          this.logger.error(`Error while sending text message: ${error.message}`, error);
          throw error;
        }
      });
  }

  _createTextProto(
    messageId,
    textMessage,
    mentionEntities,
    quoteEntity,
    linkPreviews,
    expectsReadConfirmation,
    legalHoldStatus,
  ) {
    const protoText = new Text({content: textMessage, expectsReadConfirmation, legalHoldStatus});

    if (mentionEntities && mentionEntities.length) {
      const logMessage = `Adding '${mentionEntities.length}' mentions to message '${messageId}'`;
      this.logger.debug(logMessage, mentionEntities);

      const protoMentions = mentionEntities
        .filter(mentionEntity => {
          if (mentionEntity) {
            try {
              return mentionEntity.validate(textMessage);
            } catch (error) {
              const log = `Removed invalid mention when sending message '${messageId}': ${error.message}`;
              this.logger.warn(log, mentionEntity);
              return false;
            }
          }
        })
        .map(mentionEntity => mentionEntity.toProto());

      protoText[PROTO_MESSAGE_TYPE.MENTIONS] = protoMentions;
    }

    if (quoteEntity) {
      const protoQuote = quoteEntity.toProto();
      this.logger.debug(`Adding quote to message '${messageId}'`, protoQuote);
      protoText[PROTO_MESSAGE_TYPE.QUOTE] = protoQuote;
    }

    if (linkPreviews && linkPreviews.length) {
      this.logger.debug(`Adding link preview to message '${messageId}'`, linkPreviews);
      protoText[PROTO_MESSAGE_TYPE.LINK_PREVIEWS] = linkPreviews;
    }

    return protoText;
  }

  /**
   * Wraps generic message in ephemeral message.
   *
   * @param {GenericMessage} genericMessage Message to be wrapped
   * @param {number} millis Expire time in milliseconds
   * @returns {Message} New proto message
   */
  _wrap_in_ephemeral_message(genericMessage, millis) {
    const ephemeralExpiration = ConversationEphemeralHandler.validateTimer(millis);

    const protoEphemeral = new Ephemeral({
      [genericMessage.content]: genericMessage[genericMessage.content],
      [PROTO_MESSAGE_TYPE.EPHEMERAL_EXPIRATION]: ephemeralExpiration,
    });

    genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.EPHEMERAL]: protoEphemeral,
      messageId: genericMessage.messageId,
    });

    return genericMessage;
  }

  //##############################################################################
  // Send Generic Messages
  //##############################################################################

  /**
   * Create a user client map for a given conversation.
   *
   * @param {string} conversation_id Conversation ID
   * @param {boolean} [skip_own_clients=false] True, if other own clients should be skipped (to not sync messages on own clients)
   * @param {Array<string>} user_ids Optionally the intended recipient users
   * @returns {Promise} Resolves with a user client map
   */
  create_recipients(conversation_id, skip_own_clients = false, user_ids) {
    return this.get_all_users_in_conversation(conversation_id).then(user_ets => {
      const recipients = {};

      for (const user_et of user_ets) {
        if (!(skip_own_clients && user_et.is_me)) {
          if (user_ids && !user_ids.includes(user_et.id)) {
            continue;
          }

          recipients[user_et.id] = user_et.devices().map(client_et => client_et.id);
        }
      }

      return recipients;
    });
  }

  sendGenericMessageToConversation(eventInfoEntity) {
    return this.messageSender.queueMessage(() => {
      return this.create_recipients(eventInfoEntity.conversationId).then(recipients => {
        eventInfoEntity.updateOptions({recipients});
        return this._sendGenericMessage(eventInfoEntity);
      });
    });
  }

  _send_and_inject_generic_message(conversationEntity, genericMessage, syncTimestamp = true) {
    return Promise.resolve()
      .then(() => {
        if (conversationEntity.removed_from_conversation()) {
          throw new Error('Cannot send message to conversation you are not part of');
        }

        const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
        const optimisticEvent = z.conversation.EventBuilder.buildMessageAdd(conversationEntity, currentTimestamp);
        return this.cryptography_repository.cryptographyMapper.mapGenericMessage(genericMessage, optimisticEvent);
      })
      .then(mappedEvent => {
        const {KNOCK: TYPE_KNOCK, EPHEMERAL: TYPE_EPHEMERAL} = GENERIC_MESSAGE_TYPE;
        const isPing = message => message.content === TYPE_KNOCK;
        const isEphemeralPing = message => message.content === TYPE_EPHEMERAL && isPing(message.ephemeral);
        const shouldPlayPingAudio = isPing(genericMessage) || isEphemeralPing(genericMessage);
        if (shouldPlayPingAudio) {
          amplify.publish(WebAppEvents.AUDIO.PLAY, AudioType.OUTGOING_PING);
        }

        return mappedEvent;
      })
      .then(mappedEvent => this.eventRepository.injectEvent(mappedEvent))
      .then(injectedEvent => {
        const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
        eventInfoEntity.setTimestamp(injectedEvent.time);
        return this.sendGenericMessageToConversation(eventInfoEntity).then(sentPayload => ({
          event: injectedEvent,
          sentPayload,
        }));
      })
      .then(({event, sentPayload}) => {
        this._trackContributed(conversationEntity, genericMessage);
        const backendIsoDate = syncTimestamp ? sentPayload.time : '';
        return this._updateMessageAsSent(conversationEntity, event, backendIsoDate).then(() => event);
      });
  }

  /**
   * Update message as sent in db and view.
   *
   * @param {Conversation} conversationEntity Conversation entity
   * @param {Object} eventJson Event object
   * @param {string} isoDate If defined it will update event timestamp
   * @returns {Promise} Resolves when sent status was updated
   */
  async _updateMessageAsSent(conversationEntity, eventJson, isoDate) {
    try {
      const messageEntity = await this.get_message_in_conversation_by_id(conversationEntity, eventJson.id);
      messageEntity.status(StatusType.SENT);
      const changes = {status: StatusType.SENT};
      if (isoDate) {
        changes.time = isoDate;
        const timestamp = new Date(isoDate).getTime();
        if (!isNaN(timestamp)) {
          messageEntity.timestamp(timestamp);
          conversationEntity.update_timestamp_server(timestamp, true);
          conversationEntity.update_timestamps(messageEntity);
        }
      }
      this.checkMessageTimer(messageEntity);
      if (EventTypeHandling.STORE.includes(messageEntity.type) || messageEntity.has_asset_image()) {
        return this.eventService.updateEvent(messageEntity.primary_key, changes);
      }
    } catch (error) {
      if (error.type !== z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
  }

  /**
   * Send encrypted external message
   *
   * @private
   * @param {EventInfoEntity} eventInfoEntity Event to be send
   * @returns {Promise} Resolves after sending the external message
   */
  async _sendExternalGenericMessage(eventInfoEntity) {
    const {genericMessage, options} = eventInfoEntity;
    const messageType = eventInfoEntity.getType();
    this.logger.info(`Sending external message of type '${messageType}'`, genericMessage);

    try {
      const encryptedAsset = await encryptAesAsset(GenericMessage.encode(genericMessage).finish());
      const keyBytes = new Uint8Array(encryptedAsset.keyBytes);
      const sha256 = new Uint8Array(encryptedAsset.sha256);

      const externalMessage = new External({otrKey: keyBytes, sha256});

      const genericMessageExternal = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.EXTERNAL]: externalMessage,
        messageId: createRandomUuid(),
      });

      const payload = await this.cryptography_repository.encryptGenericMessage(
        options.recipients,
        genericMessageExternal,
      );
      payload.data = await arrayToBase64(encryptedAsset.cipherText);
      payload.native_push = options.nativePush;
      return this._sendEncryptedMessage(eventInfoEntity, payload);
    } catch (error) {
      this.logger.info('Failed sending external message', error);
      throw error;
    }
  }

  /**
   * Sends a generic message to a conversation.
   *
   * @private
   * @param {EventInfoEntity} eventInfoEntity Info about event
   * @returns {Promise} Resolves when the message was sent
   */
  _sendGenericMessage(eventInfoEntity) {
    return this._grantOutgoingMessage(eventInfoEntity)
      .then(() => this._shouldSendAsExternal(eventInfoEntity))
      .then(sendAsExternal => {
        if (sendAsExternal) {
          return this._sendExternalGenericMessage(eventInfoEntity);
        }

        const {genericMessage, options} = eventInfoEntity;
        return this.cryptography_repository.encryptGenericMessage(options.recipients, genericMessage).then(payload => {
          payload.native_push = options.nativePush;
          return this._sendEncryptedMessage(eventInfoEntity, payload);
        });
      })
      .catch(error => {
        const isRequestTooLarge = error.code === BackendClientError.STATUS_CODE.REQUEST_TOO_LARGE;
        if (isRequestTooLarge) {
          return this._sendExternalGenericMessage(eventInfoEntity);
        }

        throw error;
      });
  }

  /**
   * Sends otr message to a conversation.
   *
   * @private
   * @note Options for the precondition check on missing clients are:
   *   'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending
   *
   * @param {EventInfoEntity} eventInfoEntity Info about message to be sent
   * @param {Object} payload Payload
   * @returns {Promise} Promise that resolves after sending the encrypted message
   */
  _sendEncryptedMessage(eventInfoEntity, payload) {
    const {conversationId, genericMessage, options} = eventInfoEntity;
    const messageId = genericMessage.messageId;
    let messageType = eventInfoEntity.getType();

    if (messageType === GENERIC_MESSAGE_TYPE.CONFIRMATION) {
      messageType += ` (type: "${eventInfoEntity.genericMessage.confirmation.type}")`;
    }

    const numberOfUsers = Object.keys(payload.recipients).length;
    const numberOfClients = Object.values(payload.recipients)
      .map(clientId => Object.keys(clientId).length)
      .reduce((totalClients, clients) => totalClients + clients, 0);

    const logMessage = `Sending '${messageType}' message (${messageId}) to conversation '${conversationId}'`;
    this.logger.info(logMessage, payload);

    if (numberOfUsers > numberOfClients) {
      this.logger.warn(
        `Sending '${messageType}' message (${messageId}) to just '${numberOfClients}' clients but there are '${numberOfUsers}' users in conversation '${conversationId}'`,
      );
    }

    return this.conversation_service
      .post_encrypted_message(conversationId, payload, options.precondition)
      .then(response => {
        this.clientMismatchHandler.onClientMismatch(eventInfoEntity, response, payload);
        return response;
      })
      .catch(error => {
        const isUnknownClient = error.label === BackendClientError.LABEL.UNKNOWN_CLIENT;
        if (isUnknownClient) {
          return this.client_repository.removeLocalClient();
        }

        if (!error.missing) {
          throw error;
        }

        let updatedPayload;
        return this.clientMismatchHandler
          .onClientMismatch(eventInfoEntity, error, payload)
          .then(payloadWithMissingClients => {
            updatedPayload = payloadWithMissingClients;

            const userIds = Object.keys(error.missing);
            return this._grantOutgoingMessage(eventInfoEntity, userIds);
          })
          .then(() => {
            this.logger.info(
              `Updated '${messageType}' message (${messageId}) for conversation '${conversationId}'. Will ignore missing receivers.`,
              updatedPayload,
            );
            return this.conversation_service.post_encrypted_message(conversationId, updatedPayload, true);
          });
      });
  }

  async updateAllClients(conversationEntity, blockSystemMessage = true) {
    if (blockSystemMessage) {
      conversationEntity.blockLegalHoldMessage = true;
    }
    const sender = this.client_repository.currentClient().id;
    try {
      await this.conversation_service.post_encrypted_message(conversationEntity.id, {recipients: {}, sender});
    } catch (error) {
      if (error.missing) {
        const remoteUserClients = error.missing;
        const localUserClients = await this.create_recipients(conversationEntity.id);
        const selfId = this.selfUser().id;

        const deletedUserClients = Object.entries(localUserClients).reduce((deleted, [userId, clients]) => {
          if (userId === selfId) {
            return deleted;
          }
          const deletedClients = getDifference(remoteUserClients[userId], clients);
          if (deletedClients.length) {
            deleted[userId] = deletedClients;
          }
          return deleted;
        }, {});

        await Promise.all(
          Object.entries(deletedUserClients).map(([userId, clients]) =>
            Promise.all(clients.map(clientId => this.user_repository.remove_client_from_user(userId, clientId))),
          ),
        );

        const missingUserIds = Object.entries(remoteUserClients).reduce((missing, [userId, clients]) => {
          if (userId === selfId) {
            return missing;
          }
          const missingClients = getDifference(localUserClients[userId] || [], clients);
          if (missingClients.length) {
            missing.push(userId);
          }
          return missing;
        }, []);

        await Promise.all(
          missingUserIds.map(async userId => {
            const clients = await this.user_repository.getClientsByUserId(userId, false);
            await Promise.all(clients.map(client => this.user_repository.addClientToUser(userId, client)));
          }),
        );
      }
    }
    if (blockSystemMessage) {
      conversationEntity.blockLegalHoldMessage = false;
    }
  }

  async injectLegalHoldMessage({
    conversationEntity,
    conversationId,
    userId,
    timestamp,
    legalHoldStatus,
    beforeTimestamp = false,
  }) {
    if (typeof legalHoldStatus === 'undefined') {
      return;
    }
    if (!timestamp) {
      const conversation = conversationEntity || this.find_conversation_by_id(conversationId);
      const servertime = this.serverTimeHandler.toServerTimestamp();
      timestamp = conversation.get_latest_timestamp(servertime);
    }
    const legalHoldUpdateMessage = z.conversation.EventBuilder.buildLegalHoldMessage(
      conversationId || conversationEntity.id,
      userId,
      timestamp,
      legalHoldStatus,
      beforeTimestamp,
    );
    await this.eventRepository.injectEvent(legalHoldUpdateMessage);
  }

  async _grantOutgoingMessage(eventInfoEntity, userIds) {
    const messageType = eventInfoEntity.getType();
    const allowedMessageTypes = ['cleared', 'clientAction', 'confirmation', 'deleted', 'lastRead'];
    if (allowedMessageTypes.includes(messageType)) {
      return Promise.resolve();
    }

    const isMessageEdit = messageType === GENERIC_MESSAGE_TYPE.EDITED;

    // Legal Hold
    const conversationEntity = this.find_conversation_by_id(eventInfoEntity.conversationId);
    const localLegalHoldStatus = conversationEntity.legalHoldStatus();
    await this.updateAllClients(conversationEntity, !isMessageEdit);
    const updatedLocalLegalHoldStatus = conversationEntity.legalHoldStatus();

    const {genericMessage} = eventInfoEntity;
    genericMessage[messageType][PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS] = updatedLocalLegalHoldStatus;

    const haveNewClientsChangeLegalHoldStatus = localLegalHoldStatus !== updatedLocalLegalHoldStatus;

    if (!isMessageEdit && haveNewClientsChangeLegalHoldStatus) {
      const {conversationId, timestamp: numericTimestamp} = eventInfoEntity;
      await this.injectLegalHoldMessage({
        beforeTimestamp: true,
        conversationId,
        legalHoldStatus: updatedLocalLegalHoldStatus,
        timestamp: numericTimestamp,
        userId: this.selfUser().id,
      });
    }

    const shouldShowLegalHoldWarning =
      haveNewClientsChangeLegalHoldStatus && updatedLocalLegalHoldStatus === LegalHoldStatus.ENABLED;

    const isCallingMessage = messageType === GENERIC_MESSAGE_TYPE.CALLING;
    const consentType = isCallingMessage
      ? ConversationRepository.CONSENT_TYPE.OUTGOING_CALL
      : ConversationRepository.CONSENT_TYPE.MESSAGE;

    return this.grantMessage(eventInfoEntity, consentType, userIds, shouldShowLegalHoldWarning);
  }

  grantMessage(eventInfoEntity, consentType, userIds, shouldShowLegalHoldWarning = false) {
    return this.get_conversation_by_id(eventInfoEntity.conversationId).then(conversationEntity => {
      const legalHoldMessageTypes = [
        GENERIC_MESSAGE_TYPE.ASSET,
        GENERIC_MESSAGE_TYPE.EDITED,
        GENERIC_MESSAGE_TYPE.IMAGE,
        GENERIC_MESSAGE_TYPE.TEXT,
      ];
      const isLegalHoldMessageType =
        eventInfoEntity.genericMessage && legalHoldMessageTypes.includes(eventInfoEntity.genericMessage.content);

      const verificationState = conversationEntity.verification_state();
      const conversationDegraded = verificationState === ConversationVerificationState.DEGRADED;

      if (conversationEntity.needsLegalHoldApproval) {
        conversationEntity.needsLegalHoldApproval = false;
        return showLegalHoldWarning(conversationEntity, conversationDegraded);
      } else if (shouldShowLegalHoldWarning) {
        conversationEntity.needsLegalHoldApproval = !this.selfUser().isOnLegalHold() && isLegalHoldMessageType;
      }

      if (!conversationDegraded) {
        return false;
      }

      return new Promise((resolve, reject) => {
        let sendAnyway = false;

        userIds = userIds || conversationEntity.getUsersWithUnverifiedClients().map(userEntity => userEntity.id);

        return this.user_repository
          .get_users_by_id(userIds)
          .then(userEntities => {
            let actionString;
            let messageString;
            let titleString;

            const hasMultipleUsers = userEntities.length > 1;
            const userNames = joinNames(userEntities, Declension.NOMINATIVE);
            const titleSubstitutions = capitalizeFirstChar(userNames);

            if (hasMultipleUsers) {
              titleString = t('modalConversationNewDeviceHeadlineMany', titleSubstitutions);
            } else {
              const [userEntity] = userEntities;

              if (userEntity) {
                titleString = userEntity.is_me
                  ? t('modalConversationNewDeviceHeadlineYou', titleSubstitutions)
                  : t('modalConversationNewDeviceHeadlineOne', titleSubstitutions);
              } else {
                const conversationId = eventInfoEntity.conversationId;
                const type = eventInfoEntity.getType();

                const log = `Missing user IDs to grant '${type}' message in '${conversationId}' (${consentType})`;
                this.logger.error(log);

                const error = new Error('Failed to grant outgoing message');
                const customData = {
                  consentType,
                  messageType: type,
                  participants: conversationEntity.getNumberOfParticipants(false),
                  verificationState,
                };

                Raygun.send(error, customData);

                reject(error);
              }
            }

            switch (consentType) {
              case ConversationRepository.CONSENT_TYPE.INCOMING_CALL: {
                actionString = t('modalConversationNewDeviceIncomingCallAction');
                messageString = t('modalConversationNewDeviceIncomingCallMessage');
                break;
              }

              case ConversationRepository.CONSENT_TYPE.OUTGOING_CALL: {
                actionString = t('modalConversationNewDeviceOutgoingCallAction');
                messageString = t('modalConversationNewDeviceOutgoingCallMessage');
                break;
              }

              default: {
                actionString = t('modalConversationNewDeviceAction');
                messageString = t('modalConversationNewDeviceMessage');
                break;
              }
            }

            amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
              close: () => {
                if (!sendAnyway) {
                  const errorType = z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION;
                  reject(new z.error.ConversationError(errorType));
                }
              },
              primaryAction: {
                action: () => {
                  sendAnyway = true;
                  conversationEntity.verification_state(ConversationVerificationState.UNVERIFIED);
                  resolve(true);
                },
                text: actionString,
              },
              text: {
                message: messageString,
                title: titleString,
              },
            });
          })
          .catch(reject);
      });
    });
  }

  /**
   * Estimate whether message should be send as type external.
   *
   * @private
   * @param {EventInfoEntity} eventInfoEntity Info about event
   * @returns {boolean} Is payload likely to be too big so that we switch to type external?
   */
  _shouldSendAsExternal(eventInfoEntity) {
    const {conversationId, genericMessage} = eventInfoEntity;

    return this.get_conversation_by_id(conversationId).then(conversationEntity => {
      const messageInBytes = new Uint8Array(GenericMessage.encode(genericMessage).finish()).length;
      const estimatedPayloadInBytes = conversationEntity.getNumberOfClients() * messageInBytes;

      return estimatedPayloadInBytes > ConversationRepository.CONFIG.EXTERNAL_MESSAGE_THRESHOLD;
    });
  }

  /**
   * Post images to a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to post the images
   * @param {Array|FileList} images Images
   * @returns {undefined} No return value
   */
  upload_images(conversationEntity, images) {
    this.upload_files(conversationEntity, images, true);
  }

  /**
   * Post files to a conversation.
   *
   * @param {Conversation} conversationEntity Conversation to post the files
   * @param {Array|FileList} files files
   * @param {AssetType} [asImage=false] whether or not the file should be treated as an image
   * @returns {undefined} No return value
   */
  upload_files(conversationEntity, files, asImage) {
    if (this._can_upload_assets_to_conversation(conversationEntity)) {
      Array.from(files).forEach(file => this.upload_file(conversationEntity, file, asImage));
    }
  }

  /**
   * Post file to a conversation using v3
   *
   * @param {Conversation} conversationEntity Conversation to post the file
   * @param {Object} file File object
   * @param {AssetType} [asImage=false] whether or not the file should be treated as an image
   * @returns {Promise} Resolves when file was uploaded
   */

  async upload_file(conversationEntity, file, asImage) {
    let messageId;
    try {
      const uploadStarted = Date.now();
      const injectedEvent = await this.send_asset_metadata(conversationEntity, file, asImage);
      messageId = injectedEvent.id;
      if (isVideo(file)) {
        await this.sendAssetPreview(conversationEntity, file, messageId);
      }
      await this.send_asset_remotedata(conversationEntity, file, messageId, asImage);
      const uploadDuration = (Date.now() - uploadStarted) / TIME_IN_MILLIS.SECOND;
      this.logger.info(`Finished to upload asset for conversation'${conversationEntity.id} in ${uploadDuration}`);
    } catch (error) {
      if (this._isUserCancellationError(error)) {
        throw error;
      }
      this.logger.error(`Failed to upload asset for conversation '${conversationEntity.id}': ${error.message}`, error);
      const messageEntity = await this.get_message_in_conversation_by_id(conversationEntity, messageId);
      this.send_asset_upload_failed(conversationEntity, messageEntity.id);
      return this.update_message_as_upload_failed(messageEntity);
    }
  }

  /**
   * Delete message for everyone.
   *
   * @param {Conversation} conversationEntity Conversation to delete message from
   * @param {Message} messageEntity Message to delete
   * @param {Array<string>|boolean} [precondition] Optional level that backend checks for missing clients
   * @returns {Promise} Resolves when message was deleted
   */
  deleteMessageForEveryone(conversationEntity, messageEntity, precondition) {
    const conversationId = conversationEntity.id;
    const messageId = messageEntity.id;

    return Promise.resolve()
      .then(() => {
        if (!messageEntity.user().is_me && !messageEntity.ephemeral_expires()) {
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_USER);
        }

        const protoMessageDelete = new MessageDelete({messageId});
        const genericMessage = new GenericMessage({
          [GENERIC_MESSAGE_TYPE.DELETED]: protoMessageDelete,
          messageId: createRandomUuid(),
        });

        return this.messageSender.queueMessage(() => {
          return this.create_recipients(conversationId, false, precondition).then(recipients => {
            const options = {precondition, recipients};
            const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId, options);
            this._sendGenericMessage(eventInfoEntity);
          });
        });
      })
      .then(() => {
        amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageId, conversationId);
        return this._delete_message_by_id(conversationEntity, messageId);
      })
      .catch(error => {
        const isConversationNotFound = error.code === BackendClientError.STATUS_CODE.NOT_FOUND;
        if (isConversationNotFound) {
          this.logger.warn(`Conversation '${conversationId}' not found. Deleting message for self user only.`);
          return this.deleteMessage(conversationEntity, messageEntity);
        }
        const message = `Failed to delete message '${messageId}' in conversation '${conversationId}' for everyone`;
        this.logger.info(message, error);
        throw error;
      });
  }

  /**
   * Delete message on your own clients.
   *
   * @param {Conversation} conversationEntity Conversation to delete message from
   * @param {Message} messageEntity Message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  deleteMessage(conversationEntity, messageEntity) {
    return Promise.resolve()
      .then(() => {
        const protoMessageHide = new MessageHide({
          conversationId: conversationEntity.id,
          messageId: messageEntity.id,
        });
        const genericMessage = new GenericMessage({
          [GENERIC_MESSAGE_TYPE.HIDDEN]: protoMessageHide,
          messageId: createRandomUuid(),
        });

        const eventInfoEntity = new EventInfoEntity(genericMessage, this.self_conversation().id);
        return this.sendGenericMessageToConversation(eventInfoEntity);
      })
      .then(() => {
        amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageEntity.id, conversationEntity.id);
        return this._delete_message_by_id(conversationEntity, messageEntity.id);
      })
      .catch(error => {
        this.logger.info(
          `Failed to send delete message with id '${messageEntity.id}' for conversation '${conversationEntity.id}'`,
          error,
        );
        throw error;
      });
  }

  /**
   * Can user upload assets to conversation.
   * @param {Conversation} conversationEntity Conversation to check
   * @returns {boolean} Can assets be uploaded
   */
  _can_upload_assets_to_conversation(conversationEntity) {
    return !!conversationEntity && !conversationEntity.isRequest() && !conversationEntity.removed_from_conversation();
  }

  //##############################################################################
  // Event callbacks
  //##############################################################################

  /**
   * Listener for incoming events.
   *
   * @param {Object} eventJson JSON data for event
   * @param {EventRepository.SOURCE} [eventSource=EventRepository.SOURCE.STREAM] Source of event
   * @returns {Promise} Resolves when event was handled
   */
  onConversationEvent(eventJson, eventSource = EventRepository.SOURCE.STREAM) {
    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    const logMessage = `Conversation Event: '${eventJson.type}' (Source: ${eventSource})`;
    this.logger.info(logMessage, logObject);

    return this._pushToReceivingQueue(eventJson, eventSource);
  }

  _handleConversationEvent(eventJson, eventSource = EventRepository.SOURCE.STREAM) {
    if (!eventJson) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const {conversation, data: eventData, type} = eventJson;
    const conversationId = eventData?.conversationId || conversation;
    this.logger.info(`Handling event '${type}' in conversation '${conversationId}' (Source: ${eventSource})`);

    const inSelfConversation = conversationId === this.self_conversation() && this.self_conversation().id;
    if (inSelfConversation) {
      const typesInSelfConversation = [
        BackendEvent.CONVERSATION.MEMBER_UPDATE,
        ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
      ];

      const isExpectedType = typesInSelfConversation.includes(type);
      if (!isExpectedType) {
        return Promise.reject(new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_CONVERSATION));
      }
    }

    const isConversationCreate = type === BackendEvent.CONVERSATION.CREATE;
    const onEventPromise = isConversationCreate ? Promise.resolve() : this.get_conversation_by_id(conversationId);
    let previouslyArchived;

    return onEventPromise
      .then(conversationEntity => {
        if (conversationEntity) {
          // Check if conversation was archived
          previouslyArchived = conversationEntity.is_archived();

          const isBackendTimestamp = eventSource !== EventRepository.SOURCE.INJECTED;
          conversationEntity.update_timestamp_server(eventJson.server_time || eventJson.time, isBackendTimestamp);
        }

        return conversationEntity;
      })
      .then(conversationEntity => this._checkLegalHoldStatus(conversationEntity, eventJson))
      .then(conversationEntity => this._checkConversationParticipants(conversationEntity, eventJson, eventSource))
      .then(conversationEntity => this._triggerFeatureEventHandlers(conversationEntity, eventJson, eventSource))
      .then(conversationEntity => this._reactToConversationEvent(conversationEntity, eventJson, eventSource))
      .then((entityObject = {}) => this._handleConversationNotification(entityObject, eventSource, previouslyArchived))
      .catch(error => {
        const ignoredErrorTypes = [
          z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND,
          z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ];

        if (!ignoredErrorTypes.includes(error.type)) {
          throw error;
        }
      });
  }

  /**
   * Check that sender of received event is a known conversation participant.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation targeted by the event
   * @param {Object} eventJson JSON data of the event
   * @param {EventRepository.SOURCE} eventSource Source of event
   * @returns {Promise} Resolves when the participant list has been checked
   */
  _checkConversationParticipants(conversationEntity, eventJson, eventSource) {
    // We ignore injected events
    const isInjectedEvent = eventSource === EventRepository.SOURCE.INJECTED;
    if (isInjectedEvent || !conversationEntity) {
      return conversationEntity;
    }

    const {from: sender, id, type, time} = eventJson;

    if (sender) {
      const allParticipantIds = conversationEntity.participating_user_ids().concat(this.selfUser().id);
      const isFromUnknownUser = !allParticipantIds.includes(sender);

      if (isFromUnknownUser) {
        const membersUpdateMessages = [
          BackendEvent.CONVERSATION.MEMBER_LEAVE,
          BackendEvent.CONVERSATION.MEMBER_JOIN,
          ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE,
        ];
        const isMembersUpdateEvent = membersUpdateMessages.includes(eventJson.type);
        if (isMembersUpdateEvent) {
          const isFromUpdatedMember = eventJson.data.user_ids.includes(sender);
          if (isFromUpdatedMember) {
            // we ignore leave/join events that are sent by the user actually leaving or joining
            return conversationEntity;
          }
        }

        const message = `Received '${type}' event '${id}' from user '${sender}' unknown in '${conversationEntity.id}'`;
        this.logger.warn(message, eventJson);

        const timestamp = new Date(time).getTime() - 1;
        return this.addMissingMember(conversationEntity.id, [sender], timestamp).then(() => conversationEntity);
      }
    }

    return conversationEntity;
  }

  async _checkLegalHoldStatus(conversationEntity, eventJson) {
    if (!LegalHoldEvaluator.hasMessageLegalHoldFlag(eventJson)) {
      return conversationEntity;
    }

    const renderLegalHoldMessage = LegalHoldEvaluator.renderLegalHoldMessage(
      eventJson,
      conversationEntity.legalHoldStatus(),
    );

    if (!renderLegalHoldMessage) {
      return conversationEntity;
    }

    const {
      conversation: conversationId,
      data: {legal_hold_status: messageLegalHoldStatus},
      from: userId,
      time: isoTimestamp,
    } = eventJson;

    await this.injectLegalHoldMessage({
      beforeTimestamp: true,
      conversationId,
      legalHoldStatus: messageLegalHoldStatus,
      timestamp: isoTimestamp,
      userId,
    });

    await this.updateAllClients(conversationEntity);

    if (messageLegalHoldStatus === conversationEntity.legalHoldStatus()) {
      return conversationEntity;
    }

    await this.injectLegalHoldMessage({
      conversationId,
      legalHoldStatus: conversationEntity.legalHoldStatus(),
      timestamp: isoTimestamp,
      userId,
    });

    return conversationEntity;
  }

  /**
   * Triggers the methods associated with a specific event.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation targeted by the event
   * @param {Object} eventJson JSON data of the event
   * @param {EventRepository.SOURCE} eventSource Source of event
   * @returns {Promise<any>} Resolves when the event has been treated
   */
  _reactToConversationEvent(conversationEntity, eventJson, eventSource) {
    switch (eventJson.type) {
      case BackendEvent.CONVERSATION.CREATE:
        return this._onCreate(eventJson, eventSource);

      case BackendEvent.CONVERSATION.DELETE:
        return this.deleteConversationLocally(eventJson.conversation);

      case BackendEvent.CONVERSATION.MEMBER_JOIN:
        return this._onMemberJoin(conversationEntity, eventJson);

      case BackendEvent.CONVERSATION.MEMBER_LEAVE:
      case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE:
        return this._onMemberLeave(conversationEntity, eventJson);

      case BackendEvent.CONVERSATION.MEMBER_UPDATE:
        return this._onMemberUpdate(conversationEntity, eventJson);

      case BackendEvent.CONVERSATION.RENAME:
        return this._onRename(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.ASSET_ADD:
        return this._onAssetAdd(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.GROUP_CREATION:
        return this._onGroupCreation(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.MESSAGE_DELETE:
        return this._onMessageDeleted(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.MESSAGE_HIDDEN:
        return this._onMessageHidden(eventJson);

      case ClientEvent.CONVERSATION.ONE2ONE_CREATION:
        return this._on1to1Creation(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.REACTION:
        return this._onReaction(conversationEntity, eventJson);

      case BackendEvent.CONVERSATION.RECEIPT_MODE_UPDATE:
        return this._onReceiptModeChanged(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.MESSAGE_ADD:
        const isMessageEdit = !!eventJson.edited_time;
        if (isMessageEdit) {
          // in case of an edition, the DB listener will take care of updating the local entity
          return {conversationEntity};
        }
        return this._addEventToConversation(conversationEntity, eventJson);

      case BackendEvent.CONVERSATION.MESSAGE_TIMER_UPDATE:
      case ClientEvent.CONVERSATION.DELETE_EVERYWHERE:
      case ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
      case ClientEvent.CONVERSATION.KNOCK:
      case ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE:
      case ClientEvent.CONVERSATION.LOCATION:
      case ClientEvent.CONVERSATION.MISSED_MESSAGES:
      case ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT:
      case ClientEvent.CONVERSATION.VERIFICATION:
      case ClientEvent.CONVERSATION.VOICE_CHANNEL_ACTIVATE:
      case ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE:
        return this._addEventToConversation(conversationEntity, eventJson);
    }
  }

  /**
   * Calls the feature specific event handler on the current event being handled.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation targeted by the event
   * @param {Object} eventJson JSON data of the event
   * @param {EventRepository.SOURCE} eventSource Source of event
   * @returns {Promise} Resolves when all the handlers have done their job
   */
  _triggerFeatureEventHandlers(conversationEntity, eventJson, eventSource) {
    const conversationEventHandlers = [this.ephemeralHandler, this.stateHandler];
    const handlePromises = conversationEventHandlers.map(handler =>
      handler.handleConversationEvent(conversationEntity, eventJson, eventSource),
    );
    return Promise.all(handlePromises).then(() => conversationEntity);
  }

  /**
   * Handles conversation update and notification message.
   *
   * @private
   * @param {Object} entityObject Object containing the conversation and the message that are targeted by the event
   * @param {EventRepository.SOURCE} eventSource Source of event
   * @param {boolean} previouslyArchived `true` if the previous state of the conversation was archived
   * @returns {Promise} Resolves when the conversation was updated
   */
  _handleConversationNotification(entityObject = {}, eventSource, previouslyArchived) {
    const {conversationEntity, messageEntity} = entityObject;

    if (conversationEntity) {
      const eventFromWebSocket = eventSource === EventRepository.SOURCE.WEB_SOCKET;
      const eventFromStream = eventSource === EventRepository.SOURCE.STREAM;

      if (messageEntity) {
        const isRemoteEvent = eventFromStream || eventFromWebSocket;

        if (isRemoteEvent) {
          this._sendConfirmationStatus(conversationEntity, messageEntity, Confirmation.Type.DELIVERED);
        }

        if (!eventFromStream) {
          amplify.publish(WebAppEvents.NOTIFICATION.NOTIFY, messageEntity, undefined, conversationEntity);
        }

        if (conversationEntity.is_cleared()) {
          conversationEntity.cleared_timestamp(0);
        }
      }

      // Check if event needs to be un-archived
      if (previouslyArchived) {
        // Add to check for un-archiving at the end of stream handling
        if (eventFromStream) {
          return this.conversationsWithNewEvents.set(conversationEntity.id, conversationEntity);
        }

        if (eventFromWebSocket && conversationEntity.shouldUnarchive()) {
          return this.unarchiveConversation(conversationEntity, false, 'event from WebSocket');
        }
      }
    }
  }

  /**
   * Push to receiving queue.
   * @param {Object} eventJson JSON data for event
   * @param {EventRepository.SOURCE} source Source of event
   * @returns {undefined} No return value
   */
  _pushToReceivingQueue(eventJson, source) {
    this.receiving_queue
      .push(() => this._handleConversationEvent(eventJson, source))
      .then(() => {
        if (this.init_promise) {
          const eventFromStream = source === EventRepository.SOURCE.STREAM;
          if (eventFromStream) {
            this.init_handled = this.init_handled + 1;
            if (this.init_handled % 5 === 0 || this.init_handled < 5) {
              const content = {
                handled: this.init_handled,
                total: this.init_total,
              };
              const progress = (this.init_handled / this.init_total) * 20 + 75;

              amplify.publish(WebAppEvents.APP.UPDATE_PROGRESS, progress, t('initEvents'), content);
            }
          }

          if (!this.receiving_queue.getLength() || !eventFromStream) {
            this.init_promise.resolve_fn();
            this.init_promise = undefined;
          }
        }
      })
      .catch(error => {
        if (this.init_promise) {
          this.init_promise.reject_fn(error);
          this.init_promise = undefined;
        } else {
          throw error;
        }
      });
  }

  /**
   * Add "missed events" system message to conversation.
   * @returns {undefined} No return value
   */
  on_missed_events() {
    this.filtered_conversations()
      .filter(conversationEntity => !conversationEntity.removed_from_conversation())
      .forEach(conversationEntity => {
        const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
        const missed_event = z.conversation.EventBuilder.buildMissed(conversationEntity, currentTimestamp);
        this.eventRepository.injectEvent(missed_event);
      });
  }

  _on1to1Creation(conversationEntity, eventJson) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity)
      .then(messageEntity => this._updateMessageUserEntities(messageEntity))
      .then(messageEntity => {
        const userEntity = messageEntity.otherUser();
        const isOutgoingRequest = userEntity && userEntity.isOutgoingRequest();
        if (isOutgoingRequest) {
          messageEntity.memberMessageType = SystemMessageType.CONNECTION_REQUEST;
        }

        conversationEntity.add_message(messageEntity);
        return {conversationEntity};
      });
  }

  /**
   * An asset was uploaded.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation to add the event to
   * @param {Object} event_json JSON data of 'conversation.asset-upload-complete' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_asset_upload_complete(conversationEntity, event_json) {
    return this.get_message_in_conversation_by_id(conversationEntity, event_json.id)
      .then(message_et => this.update_message_as_upload_complete(conversationEntity, message_et, event_json))
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }

        this.logger.error(`Upload complete: Could not find message with id '${event_json.id}'`, event_json);
      });
  }

  /**
   * A conversation was created.
   *
   * @private
   * @param {Object} eventJson JSON data of 'conversation.create' event
   * @param {EventRepository.SOURCE} eventSource Source of event
   * @returns {Promise} Resolves when the event was handled
   */
  async _onCreate(eventJson, eventSource) {
    const {conversation: conversationId, data: eventData, time} = eventJson;
    const eventTimestamp = new Date(time).getTime();
    const initialTimestamp = isNaN(eventTimestamp) ? this.getLatestEventTimestamp(true) : eventTimestamp;
    try {
      const existingConversationEntity = this.find_conversation_by_id(conversationId);
      if (existingConversationEntity) {
        throw new z.error.ConversationError(z.error.ConversationError.TYPE.NO_CHANGES);
      }

      const conversationEntity = this.mapConversations(eventData, initialTimestamp);
      if (conversationEntity) {
        if (conversationEntity.participating_user_ids().length) {
          this._addCreationMessage(conversationEntity, false, initialTimestamp, eventSource);
        }
        await this.updateParticipatingUserEntities(conversationEntity);
        this.verificationStateHandler.onConversationCreate(conversationEntity);
        await this.save_conversation(conversationEntity);
      }
      return {conversationEntity};
    } catch (error) {
      const isNoChanges = error.type === z.error.ConversationError.TYPE.NO_CHANGES;
      if (!isNoChanges) {
        throw error;
      }
    }
  }

  async _onGroupCreation(conversationEntity, eventJson) {
    const messageEntity = await this.event_mapper.mapJsonEvent(eventJson, conversationEntity);
    const creatorId = conversationEntity.creator;
    const createdByParticipant = !!conversationEntity.participating_user_ids().find(userId => userId === creatorId);
    const createdBySelfUser = conversationEntity.isCreatedBySelf();

    const creatorIsParticipant = createdByParticipant || createdBySelfUser;

    const data = await this.conversation_service.get_conversation_by_id(conversationEntity.id);
    const allMembers = [...data.members.others, data.members.self];
    const conversationRoles = allMembers.reduce((roles, member) => {
      roles[member.id] = member.conversation_role;
      return roles;
    }, {});
    conversationEntity.roles(conversationRoles);

    if (!creatorIsParticipant) {
      messageEntity.memberMessageType = SystemMessageType.CONVERSATION_RESUME;
    }

    const updatedMessageEntity = await this._updateMessageUserEntities(messageEntity);
    if (conversationEntity && updatedMessageEntity) {
      conversationEntity.add_message(updatedMessageEntity);
    }

    return {conversationEntity, messageEntity: updatedMessageEntity};
  }

  /**
   * Users were added to a group conversation.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation to add users to
   * @param {Object} eventJson JSON data of 'conversation.member-join' event
   * @returns {Promise} Resolves when the event was handled
   */
  async _onMemberJoin(conversationEntity, eventJson) {
    // Ignore if we join a 1to1 conversation (accept a connection request)
    const connectionEntity = this.connectionRepository.getConnectionByConversationId(conversationEntity.id);
    const isPendingConnection = connectionEntity && connectionEntity.isIncomingRequest();
    if (isPendingConnection) {
      return Promise.resolve();
    }

    const eventData = eventJson.data;

    eventData.user_ids.forEach(userId => {
      const isSelfUser = userId === this.selfUser().id;
      const isParticipatingUser = conversationEntity.participating_user_ids().includes(userId);
      if (!isSelfUser && !isParticipatingUser) {
        conversationEntity.participating_user_ids.push(userId);
      }
    });

    // Self user joins again
    const selfUserRejoins = eventData.user_ids.includes(this.selfUser().id);
    if (selfUserRejoins) {
      conversationEntity.status(ConversationStatus.CURRENT_MEMBER);
      await this.conversationRoleRepository.updateConversationRoles(conversationEntity);
    }

    const updateSequence = selfUserRejoins ? this.updateConversationFromBackend(conversationEntity) : Promise.resolve();

    return updateSequence
      .then(() => this.updateParticipatingUserEntities(conversationEntity, false, true))
      .then(() => this._addEventToConversation(conversationEntity, eventJson))
      .then(({messageEntity}) => {
        this.verificationStateHandler.onMemberJoined(conversationEntity, eventData.user_ids);
        return {conversationEntity, messageEntity};
      });
  }

  /**
   * Members of a group conversation were removed or left.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation to remove users from
   * @param {Object} eventJson JSON data of 'conversation.member-leave' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberLeave(conversationEntity, eventJson) {
    const {data: eventData, from} = eventJson;
    const isFromSelf = from === this.selfUser().id;
    const removesSelfUser = eventData.user_ids.includes(this.selfUser().id);
    const selfLeavingClearedConversation = isFromSelf && removesSelfUser && conversationEntity.is_cleared();

    if (removesSelfUser) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);

      if (this.selfUser().isTemporaryGuest()) {
        eventJson.from = this.selfUser().id;
      }
    }

    if (!selfLeavingClearedConversation) {
      return this._addEventToConversation(conversationEntity, eventJson)
        .then(({messageEntity}) => {
          messageEntity
            .userEntities()
            .filter(userEntity => !userEntity.is_me)
            .forEach(userEntity => {
              conversationEntity.participating_user_ids.remove(userEntity.id);

              if (userEntity.isTemporaryGuest()) {
                userEntity.clearExpirationTimeout();
              }
            });

          return this.updateParticipatingUserEntities(conversationEntity).then(() => messageEntity);
        })
        .then(messageEntity => {
          this.verificationStateHandler.onMemberLeft(conversationEntity);

          if (isFromSelf && conversationEntity.removed_from_conversation()) {
            this.archiveConversation(conversationEntity);
          }

          return {conversationEntity, messageEntity};
        });
    }
  }

  /**
   * Membership properties for a conversation were updated.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation entity that will be updated
   * @param {Object} eventJson JSON data of 'conversation.member-update' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberUpdate(conversationEntity, eventJson) {
    const {conversation: conversationId, data: eventData, from} = eventJson;

    const isConversationRoleUpdate = !!eventData.conversation_role;
    if (isConversationRoleUpdate) {
      const {target: userId, conversation_role} = eventData;
      const conversation = this.conversations().find(({id}) => id === conversationId);
      if (conversation) {
        const roles = conversation.roles();
        roles[userId] = conversation_role;
        conversation.roles(roles);
      }
      return;
    }

    const isBackendEvent = eventData.otr_archived_ref || eventData.otr_muted_ref;
    const inSelfConversation = !this.self_conversation() || conversationId === this.self_conversation().id;
    if (!inSelfConversation && conversationId && !isBackendEvent) {
      throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_CONVERSATION);
    }

    const isFromSelf = !this.selfUser() || from === this.selfUser().id;
    if (!isFromSelf) {
      throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_USER);
    }

    const isActiveConversation = this.is_active_conversation(conversationEntity);
    const nextConversationEt = isActiveConversation ? this.get_next_conversation(conversationEntity) : undefined;
    const previouslyArchived = conversationEntity.is_archived();

    this.conversationMapper.updateSelfStatus(conversationEntity, eventData);

    const wasUnarchived = previouslyArchived && !conversationEntity.is_archived();
    if (wasUnarchived) {
      return this._fetch_users_and_events(conversationEntity);
    }

    if (conversationEntity.is_cleared()) {
      this._clear_conversation(conversationEntity, conversationEntity.cleared_timestamp());
    }

    if (isActiveConversation && (conversationEntity.is_archived() || conversationEntity.is_cleared())) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEt);
    }
  }

  /**
   * An asset received in a conversation.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation to add the event to
   * @param {Object} event JSON data of 'conversation.asset-add'
   * @returns {Promise} Resolves when the event was handled
   */
  _onAssetAdd(conversationEntity, event) {
    const fromSelf = event.from === this.selfUser().id;

    const isRemoteFailure = !fromSelf && event.data.status === AssetTransferState.UPLOAD_FAILED;
    const isLocalCancel = fromSelf && event.data.reason === AssetUploadFailedReason.CANCELLED;

    if (isRemoteFailure || isLocalCancel) {
      return conversationEntity.remove_message_by_id(event.id);
    }

    return this._addEventToConversation(conversationEntity, event).then(({messageEntity}) => {
      const firstAsset = messageEntity.get_first_asset();
      if (firstAsset.is_image() || firstAsset.status() === AssetTransferState.UPLOADED) {
        return {conversationEntity, messageEntity};
      }
    });
  }

  /**
   * A hide message received in a conversation.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation to add the event to
   * @param {Object} eventJson JSON data of 'conversation.message-delete'
   * @returns {Promise} Resolves when the event was handled
   */
  _onMessageDeleted(conversationEntity, eventJson) {
    const {data: eventData, from, id: eventId, time} = eventJson;

    return this.get_message_in_conversation_by_id(conversationEntity, eventData.message_id)
      .then(deletedMessageEntity => {
        if (deletedMessageEntity.ephemeral_expires()) {
          return;
        }

        const isSameSender = from === deletedMessageEntity.from;
        if (!isSameSender) {
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_USER);
        }

        const isFromSelf = from === this.selfUser().id;
        if (!isFromSelf) {
          return this._addDeleteMessage(conversationEntity.id, eventId, time, deletedMessageEntity);
        }
      })
      .then(() => {
        amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, eventData.message_id, conversationEntity.id);
        return this._delete_message_by_id(conversationEntity, eventData.message_id);
      })
      .catch(error => {
        const isNotFound = error.type === z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (!isNotFound) {
          this.logger.info(`Failed to delete message for conversation '${conversationEntity.id}'`, error);
          throw error;
        }
      });
  }

  /**
   * A hide message received in a conversation.
   *
   * @private
   * @param {Object} eventJson JSON data of 'conversation.message-hidden'
   * @returns {Promise} Resolves when the event was handled
   */
  _onMessageHidden(eventJson) {
    const {conversation: conversationId, data: eventData, from} = eventJson;

    return Promise.resolve()
      .then(() => {
        const inSelfConversation = !this.self_conversation() || conversationId === this.self_conversation().id;
        if (!inSelfConversation) {
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_CONVERSATION);
        }

        const isFromSelf = !this.selfUser() || from === this.selfUser().id;
        if (!isFromSelf) {
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_USER);
        }

        return this.get_conversation_by_id(eventData.conversation_id);
      })
      .then(conversationEntity => {
        amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, eventData.message_id, conversationEntity.id);
        return this._delete_message_by_id(conversationEntity, eventData.message_id);
      })
      .catch(error => {
        this.logger.info(
          `Failed to delete message '${eventData.message_id}' for conversation '${eventData.conversation_id}'`,
          error,
        );
        throw error;
      });
  }

  /**
   * Someone reacted to a message.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation entity that a message was reacted upon in
   * @param {Object} eventJson JSON data of 'conversation.reaction' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onReaction(conversationEntity, eventJson) {
    const conversationId = conversationEntity.id;
    const eventData = eventJson.data;
    const messageId = eventData.message_id;

    return this.get_message_in_conversation_by_id(conversationEntity, messageId)
      .then(messageEntity => {
        if (!messageEntity || !messageEntity.is_content()) {
          const type = messageEntity ? messageEntity.type : 'unknown';

          const log = `Cannot react to '${type}' message '${messageId}' in conversation '${conversationId}'`;
          this.logger.error(log, messageEntity);
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_TYPE);
        }

        const changes = messageEntity.getUpdatedReactions(eventJson);
        if (changes) {
          const log = `Updating reactions of message '${messageId}' in conversation '${conversationId}'`;
          this.logger.debug(log, {changes, event: eventJson});

          this.eventService.updateEventSequentially(messageEntity.primary_key, changes);
          return this._prepareReactionNotification(conversationEntity, messageEntity, eventJson);
        }
      })
      .catch(error => {
        const isNotFound = error.type === z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (!isNotFound) {
          const log = `Failed to handle reaction to message '${messageId}' in conversation '${conversationId}'`;
          this.logger.error(log, {error, event: eventJson});
          throw error;
        }
      });
  }

  /**
   * A conversation was renamed.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation entity that will be renamed
   * @param {Object} eventJson JSON data of 'conversation.rename' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onRename(conversationEntity, eventJson) {
    return this._addEventToConversation(conversationEntity, eventJson).then(({messageEntity}) => {
      this.conversationMapper.updateProperties(conversationEntity, eventJson.data);
      return {conversationEntity, messageEntity};
    });
  }

  /**
   * A conversation receipt mode was changed
   *
   * @private
   * @param {Conversation} conversationEntity Conversation entity that will be renamed
   * @param {Object} eventJson JSON data of 'conversation.receipt-mode-update' event
   * @returns {Promise<{conversationEntity, messageEntity}>} Resolves when the event was handled
   */
  _onReceiptModeChanged(conversationEntity, eventJson) {
    return this._addEventToConversation(conversationEntity, eventJson).then(({messageEntity}) => {
      this.conversationMapper.updateSelfStatus(conversationEntity, {receipt_mode: eventJson.data.receipt_mode});
      return {conversationEntity, messageEntity};
    });
  }

  handleMessageExpiration(messageEntity) {
    amplify.publish(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, messageEntity);
    const shouldDeleteMessage = !messageEntity.user().is_me || messageEntity.is_ping();
    if (shouldDeleteMessage) {
      this.get_conversation_by_id(messageEntity.conversation_id).then(conversationEntity => {
        const isPingFromSelf = messageEntity.user().is_me && messageEntity.is_ping();
        const deleteForSelf = isPingFromSelf || conversationEntity.removed_from_conversation();
        if (deleteForSelf) {
          return this.deleteMessage(conversationEntity, messageEntity);
        }

        const userIds = conversationEntity.isGroup() ? [this.selfUser().id, messageEntity.from] : undefined;
        this.deleteMessageForEveryone(conversationEntity, messageEntity, userIds);
      });
    }
  }

  //##############################################################################
  // Private
  //##############################################################################

  _initMessageEntity(conversationEntity, eventJson) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity, true)
      .then(messageEntity => this._updateMessageUserEntities(messageEntity));
  }

  async _replaceMessageInConversation(conversationEntity, eventId, newData) {
    const originalMessage = conversationEntity.getMessage(eventId);
    if (!originalMessage) {
      return undefined;
    }
    const replacedMessageEntity = await this.event_mapper.updateMessageEvent(originalMessage, newData);
    await this.ephemeralHandler.validateMessage(replacedMessageEntity);
    return replacedMessageEntity;
  }

  /**
   * Convert a JSON event into an entity and add it to a given conversation.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation entity the event will be added to
   * @param {Object} eventJson Event data
   * @returns {Promise} Promise that resolves with the message entity for the event
   */
  async _addEventToConversation(conversationEntity, eventJson) {
    const messageEntity = await this._initMessageEntity(conversationEntity, eventJson);
    if (conversationEntity && messageEntity) {
      const wasAdded = conversationEntity.add_message(messageEntity);
      if (wasAdded) {
        await this.ephemeralHandler.validateMessage(messageEntity);
      }
    }
    return {conversationEntity, messageEntity};
  }

  /**
   * Convert multiple JSON events into entities and add them to a given conversation.
   *
   * @private
   * @param {Array} events Event data
   * @param {Conversation} conversationEntity Conversation entity the events will be added to
   * @param {boolean} [prepend=true] Should existing messages be prepended
   * @returns {Promise} Resolves with an array of mapped messages
   */
  async _addEventsToConversation(events, conversationEntity, prepend = true) {
    const mappedEvents = await this.event_mapper.mapJsonEvents(events, conversationEntity, true);
    const updatedEvents = await this._updateMessagesUserEntities(mappedEvents);
    const validatedMessages = await this.ephemeralHandler.validateMessages(updatedEvents);
    if (prepend && conversationEntity.messages().length) {
      conversationEntity.prepend_messages(validatedMessages);
    } else {
      conversationEntity.add_messages(validatedMessages);
    }
    return validatedMessages;
  }

  /**
   * Fetch all unread events and users of a conversation.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation fetch events and users for
   * @returns {undefined} No return value
   */
  _fetch_users_and_events(conversationEntity) {
    if (!conversationEntity.is_loaded() && !conversationEntity.is_pending()) {
      this.updateParticipatingUserEntities(conversationEntity);
      this._get_unread_events(conversationEntity);
    }
  }

  /**
   * Forward the reaction event to the Notification repository for browser and audio notifications.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation that event was received in
   * @param {Message} messageEntity Message that has been reacted upon
   * @param {Object} eventJson -] JSON data of received reaction event
   * @returns {Promise} Resolves when the notification was prepared
   */
  _prepareReactionNotification(conversationEntity, messageEntity, eventJson) {
    const {data: event_data, from} = eventJson;

    const messageFromSelf = messageEntity.from === this.selfUser().id;
    if (messageFromSelf && event_data.reaction) {
      return this.user_repository.get_user_by_id(from).then(userEntity => {
        const reactionMessageEntity = new Message(messageEntity.id, SuperType.REACTION);
        reactionMessageEntity.user(userEntity);
        reactionMessageEntity.reaction = event_data.reaction;
        return {conversationEntity, messageEntity: reactionMessageEntity};
      });
    }

    return Promise.resolve({conversationEntity});
  }

  _updateMessagesUserEntities(messageEntities) {
    return Promise.all(messageEntities.map(messageEntity => this._updateMessageUserEntities(messageEntity)));
  }

  /**
   * Updates the user entities that are part of a message.
   *
   * @private
   * @param {Message} messageEntity Message to be updated
   * @returns {Promise} Resolves when users have been update
   */
  _updateMessageUserEntities(messageEntity) {
    return this.user_repository.get_user_by_id(messageEntity.from).then(userEntity => {
      messageEntity.user(userEntity);

      if (messageEntity.is_member() || messageEntity.userEntities) {
        return this.user_repository.get_users_by_id(messageEntity.userIds()).then(userEntities => {
          userEntities.sort((userA, userB) => sortByPriority(userA.first_name(), userB.first_name()));
          messageEntity.userEntities(userEntities);
          return messageEntity;
        });
      }

      if (messageEntity.is_content()) {
        const userIds = Object.keys(messageEntity.reactions());

        messageEntity.reactions_user_ets.removeAll();
        if (userIds.length) {
          return this.user_repository.get_users_by_id(userIds).then(userEntities => {
            messageEntity.reactions_user_ets(userEntities);
            return messageEntity;
          });
        }
      }

      return messageEntity;
    });
  }

  /**
   * Cancel asset upload.
   * @param {string} messageId Id of the message which upload has been cancelled
   * @returns {undefined} No return value
   */
  cancel_asset_upload(messageId) {
    this.send_asset_upload_failed(this.active_conversation(), messageId, AssetUploadFailedReason.CANCELLED);
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation that contains the message
   * @param {Message} message_et Message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  _delete_message(conversationEntity, message_et) {
    return this.eventService.deleteEventByKey(message_et.primary_key);
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation that contains the message
   * @param {string} message_id ID of message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  _delete_message_by_id(conversationEntity, message_id) {
    return this.eventService.deleteEvent(conversationEntity.id, message_id);
  }

  /**
   * Delete messages from UI and database.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation that contains the message
   * @param {number} [timestamp] Timestamp as upper bound which messages to remove
   * @returns {undefined} No return value
   */
  _deleteMessages(conversationEntity, timestamp) {
    conversationEntity.hasCreationMessage = false;

    const iso_date = timestamp ? new Date(timestamp).toISOString() : undefined;
    this.eventService.deleteEvents(conversationEntity.id, iso_date);
  }

  /**
   * Add delete message to conversation.
   *
   * @private
   * @param {string} conversationId ID of conversation
   * @param {string} messageId ID of message
   * @param {string} time ISO 8601 formatted time string
   * @param {Message} messageEntity Message to delete
   * @returns {undefined} No return value
   */
  _addDeleteMessage(conversationId, messageId, time, messageEntity) {
    const deleteEvent = z.conversation.EventBuilder.buildDelete(conversationId, messageId, time, messageEntity);
    this.eventRepository.injectEvent(deleteEvent);
  }

  //##############################################################################
  // Message updates
  //##############################################################################

  /**
   * Update asset in UI and DB as failed
   * @param {Message} message_et Message to update
   * @param {string} [reason=AssetTransferState.UPLOAD_FAILED] Failure reason
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_failed(message_et, reason = AssetTransferState.UPLOAD_FAILED) {
    if (message_et) {
      if (!message_et.is_content()) {
        throw new Error(`Tried to update wrong message type as upload failed '${message_et.super_type}'`);
      }

      const asset_et = message_et.get_first_asset();
      if (asset_et) {
        const is_proper_asset = asset_et.is_audio() || asset_et.is_file() || asset_et.is_video();
        if (!is_proper_asset) {
          throw new Error(`Tried to update message with wrong asset type as upload failed '${asset_et.type}'`);
        }

        asset_et.status(reason);
        asset_et.upload_failed_reason(AssetUploadFailedReason.FAILED);
      }

      return this.eventService.updateEventAsUploadFailed(message_et.primary_key, reason);
    }
  }

  expectReadReceipt(conversationEntity) {
    if (conversationEntity.is1to1()) {
      return !!this.propertyRepository.receiptMode();
    }

    if (conversationEntity.team_id && conversationEntity.isGroup()) {
      return !!conversationEntity.receiptMode();
    }

    return false;
  }

  /**
   * Update asset in UI and DB as completed.
   *
   * @param {Conversation} conversationEntity Conversation that contains the message
   * @param {Message} message_et Message to update
   * @param {Object} event_json Uploaded asset event information
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_complete(conversationEntity, message_et, event_json) {
    const {id, key, otr_key, sha256, token} = event_json.data;
    const asset_et = message_et.get_first_asset();

    const resource = key
      ? AssetRemoteData.v3(key, otr_key, sha256, token)
      : AssetRemoteData.v2(conversationEntity.id, id, otr_key, sha256);

    asset_et.original_resource(resource);
    asset_et.status(AssetTransferState.UPLOADED);
    message_et.status(StatusType.SENT);

    return this.eventService.updateEventAsUploadSucceeded(message_et.primary_key, event_json);
  }

  //##############################################################################
  // Tracking helpers
  //##############################################################################

  /**
   * Track generic messages for media actions.
   *
   * @private
   * @param {Conversation} conversationEntity Conversation entity
   * @param {GenericMessage} genericMessage Protobuf message
   * @param {CallMessageEntity} callMessageEntity Optional call message
   * @returns {undefined} No return value
   */
  _trackContributed(conversationEntity, genericMessage, callMessageEntity) {
    let messageTimer;
    const isEphemeral = genericMessage.content === GENERIC_MESSAGE_TYPE.EPHEMERAL;

    if (isEphemeral) {
      genericMessage = genericMessage.ephemeral;
      messageTimer = genericMessage[PROTO_MESSAGE_TYPE.EPHEMERAL_EXPIRATION] / TIME_IN_MILLIS.SECOND;
    }

    const messageContentType = genericMessage.content;
    let actionType;
    let numberOfMentions;
    switch (messageContentType) {
      case 'asset': {
        const protoAsset = genericMessage.asset;
        if (protoAsset.original) {
          actionType = protoAsset.original.image ? 'photo' : 'file';
        }
        break;
      }

      case 'image': {
        actionType = 'photo';
        break;
      }

      case 'knock': {
        actionType = 'ping';
        break;
      }

      case 'text': {
        const protoText = genericMessage.text;
        const length = protoText[PROTO_MESSAGE_TYPE.LINK_PREVIEWS].length;
        if (!length) {
          actionType = 'text';
          numberOfMentions = protoText.mentions.length;
        }
        break;
      }

      default:
        break;
    }

    if (actionType) {
      let attributes = {
        action: actionType,
        conversation_type: trackingHelpers.getConversationType(conversationEntity),
        ephemeral_time: isEphemeral ? messageTimer : undefined,
        is_ephemeral: isEphemeral,
        is_global_ephemeral: !!conversationEntity.globalMessageTimer(),
        mention_num: numberOfMentions,
        with_service: conversationEntity.hasService(),
      };

      const isTeamConversation = !!conversationEntity.team_id;
      if (isTeamConversation) {
        attributes = {...attributes, ...trackingHelpers.getGuestAttributes(conversationEntity)};
      }

      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CONTRIBUTED, attributes);
    }
  }
}
