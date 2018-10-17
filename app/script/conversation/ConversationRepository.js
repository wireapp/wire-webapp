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

// Conversation repository for all conversation interactions with the conversation service
z.conversation.ConversationRepository = class ConversationRepository {
  static get CONFIG() {
    return {
      CONFIRMATION_THRESHOLD: z.util.TimeUtil.UNITS_IN_MILLIS.WEEK,
      EXTERNAL_MESSAGE_THRESHOLD: 200 * 1024,
      GROUP: {
        MAX_NAME_LENGTH: 64,
        MAX_SIZE: 300,
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
   * @param {ConversationService} conversation_service - Backend REST API conversation service implementation
   * @param {AssetService} asset_service - Backend REST API asset service implementation
   * @param {ClientRepository} client_repository - Repository for client interactions
   * @param {CryptographyRepository} cryptography_repository - Repository for all cryptography interactions
   * @param {EventRepository} eventRepository - Repository that handles events
   * @param {GiphyRepository} giphy_repository - Repository for Giphy GIFs
   * @param {LinkPreviewRepository} link_repository - Repository for link previews
   * @param {z.time.ServerTimeRepository} serverTimeRepository - Handles time shift between server and client
   * @param {TeamRepository} team_repository - Repository for teams
   * @param {UserRepository} user_repository - Repository for all user and connection interactions
   */
  constructor(
    conversation_service,
    asset_service,
    client_repository,
    cryptography_repository,
    eventRepository,
    giphy_repository,
    link_repository,
    serverTimeRepository,
    team_repository,
    user_repository
  ) {
    this.eventRepository = eventRepository;
    this.eventService = eventRepository.eventService;
    this.conversation_service = conversation_service;
    this.asset_service = asset_service;
    this.client_repository = client_repository;
    this.cryptography_repository = cryptography_repository;
    this.giphy_repository = giphy_repository;
    this.link_repository = link_repository;
    this.serverTimeRepository = serverTimeRepository;
    this.team_repository = team_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.conversation.ConversationRepository', z.config.LOGGER.OPTIONS);

    this.conversationMapper = new z.conversation.ConversationMapper();
    this.event_mapper = new z.conversation.EventMapper();
    this.verification_state_handler = new z.conversation.ConversationVerificationStateHandler(
      this,
      this.eventRepository,
      this.serverTimeRepository
    );
    this.clientMismatchHandler = new z.conversation.ClientMismatchHandler(
      this,
      this.cryptography_repository,
      this.eventRepository,
      this.serverTimeRepository,
      this.user_repository
    );

    this.active_conversation = ko.observable();
    this.conversations = ko.observableArray([]);

    this.isTeam = this.team_repository.isTeam;
    this.isTeam.subscribe(() => this.map_guest_status_self());
    this.team = this.team_repository.team;
    this.teamMembers = this.team_repository.teamMembers;

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
        return this._find_conversation_by_id(this.selfUser().id);
      }
    });

    this.filtered_conversations = ko.pureComputed(() => {
      return this.conversations().filter(conversation_et => {
        const states_to_filter = [
          z.user.ConnectionStatus.BLOCKED,
          z.user.ConnectionStatus.CANCELLED,
          z.user.ConnectionStatus.PENDING,
        ];

        if (conversation_et.is_self() || states_to_filter.includes(conversation_et.connection().status())) {
          return false;
        }

        return !(conversation_et.is_cleared() && conversation_et.removed_from_conversation());
      });
    });

    this.sorted_conversations = ko.pureComputed(() => {
      return this.filtered_conversations().sort(z.util.sortGroupsByLastEvent);
    });

    this.receiving_queue = new z.util.PromiseQueue({name: 'ConversationRepository.Receiving'});
    this.sending_queue = new z.util.PromiseQueue({name: 'ConversationRepository.Sending', paused: true});

    // @note Only use the client request queue as to unblock if not blocked by event handling or the cryptographic order of messages will be ruined and sessions might be deleted
    this.conversation_service.client.queueState.subscribe(queueState => {
      const queueReady = queueState === z.service.QUEUE_STATE.READY;
      this.sending_queue.pause(!queueReady || this.block_event_handling());
    });

    this.conversations_archived = ko.observableArray([]);
    this.conversations_calls = ko.observableArray([]);
    this.conversations_cleared = ko.observableArray([]);
    this.conversations_unarchived = ko.observableArray([]);

    this.init_handled = 0;
    this.init_promise = undefined;
    this.init_total = 0;

    this._init_subscriptions();

    this.stateHandler = new z.conversation.ConversationStateHandler(this.conversation_service, this.conversationMapper);
    this.ephemeralHandler = new z.conversation.ConversationEphemeralHandler(
      this.conversationMapper,
      this.eventService,
      {onMessageTimeout: this.handleMessageExpiration.bind(this)}
    );
  }

  checkMessageTimer(messageEntity) {
    this.ephemeralHandler.checkMessageTimer(messageEntity, this.serverTimeRepository.getTimeOffset());
  }

  _initStateUpdates() {
    ko.computed(() => {
      const conversationsArchived = [];
      const conversationsCalls = [];
      const conversationsCleared = [];
      const conversationsUnarchived = [];

      this.sorted_conversations().forEach(conversationEntity => {
        const conversationWithCall = this.selfUser().isTemporaryGuest()
          ? conversationEntity.hasActiveCall() || conversationEntity.hasJoinableCall()
          : conversationEntity.hasActiveCall();
        if (conversationWithCall) {
          if (conversationEntity.call().isOngoing()) {
            conversationsCalls.unshift(conversationEntity);
          } else {
            conversationsCalls.push(conversationEntity);
          }
        }
        if (conversationEntity.is_cleared()) {
          conversationsCleared.push(conversationEntity);
        } else if (conversationEntity.is_archived()) {
          conversationsArchived.push(conversationEntity);
        } else {
          conversationsUnarchived.push(conversationEntity);
        }
      });

      this.conversations_archived(conversationsArchived);
      this.conversations_calls(conversationsCalls);
      this.conversations_cleared(conversationsCleared);
      this.conversations_unarchived(conversationsUnarchived);
    });
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.ASSET.CANCEL, this.cancel_asset_upload.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, this.onConversationEvent.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MAP_CONNECTION, this.map_connection.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MISSED_EVENTS, this.on_missed_events.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.PERSIST_STATE, this.save_conversation_state_in_db.bind(this));
    amplify.subscribe(
      z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE,
      this.set_notification_handling_state.bind(this)
    );
    amplify.subscribe(z.event.WebApp.TEAM.MEMBER_LEAVE, this.teamMemberLeave.bind(this));
    amplify.subscribe(z.event.WebApp.USER.UNBLOCKED, this.unblocked_user.bind(this));
  }

  /**
   * Remove obsolete conversations locally.
   * @returns {undefined} No return value
   */
  cleanup_conversations() {
    this.conversations().forEach(conversation_et => {
      if (conversation_et.isGroup() && conversation_et.is_cleared() && conversation_et.removed_from_conversation()) {
        this.conversation_service.delete_conversation_from_db(conversation_et.id);
        this.delete_conversation(conversation_et.id);
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
   * @param {Array<z.entity.User>} userEntities - Users (excluding the requestor) to be part of the conversation
   * @param {string} [groupName] - Name for the conversation
   * @param {string} [accessState] - State for conversation access
   * @returns {Promise} Resolves when the conversation was created
   */
  createGroupConversation(userEntities, groupName, accessState) {
    const userIds = userEntities.map(userEntity => userEntity.id);
    const payload = {
      name: groupName,
      users: userIds,
    };

    if (this.team().id) {
      payload.team = {
        managed: false,
        teamid: this.team().id,
      };

      if (accessState) {
        let accessPayload;

        switch (accessState) {
          case z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM:
            accessPayload = {
              access: [z.conversation.ACCESS_MODE.INVITE, z.conversation.ACCESS_MODE.CODE],
              access_role: z.conversation.ACCESS_ROLE.NON_ACTIVATED,
            };
            break;
          case z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY:
            accessPayload = {
              access: [z.conversation.ACCESS_MODE.INVITE],
              access_role: z.conversation.ACCESS_ROLE.TEAM,
            };
            break;
          default:
            break;
        }

        if (accessPayload) {
          Object.assign(payload, accessPayload);
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
    const groupName = z.l10n.text(z.string.guestRoomConversationName);
    return this.createGroupConversation([], groupName, z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);
  }

  /**
   * Get a conversation from the backend.
   * @param {string} conversation_id - Conversation to be retrieved from the backend
   * @returns {Promise} Resolve with the conversation entity
   */
  fetch_conversation_by_id(conversation_id) {
    if (this.fetching_conversations.hasOwnProperty(conversation_id)) {
      return new Promise((resolve, reject) => {
        this.fetching_conversations[conversation_id].push({reject_fn: reject, resolve_fn: resolve});
      });
    }

    this.fetching_conversations[conversation_id] = [];

    return this.conversation_service
      .get_conversation_by_id(conversation_id)
      .then(response => {
        const conversation_et = this.mapConversations(response);

        this.logger.info(`Fetched conversation '${conversation_id}' from backend`);
        this.save_conversation(conversation_et);

        this.fetching_conversations[conversation_id].forEach(({resolve_fn}) => resolve_fn(conversation_et));
        delete this.fetching_conversations[conversation_id];

        return conversation_et;
      })
      .catch(() => {
        const error = new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);

        this.fetching_conversations[conversation_id].forEach(({reject_fn}) => reject_fn(error));
        delete this.fetching_conversations[conversation_id];

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
   * @param {Conversation} conversationEntity - Conversation message belongs to
   * @param {string} messageId - ID of message
   * @returns {Promise} Resolves with the message
   */
  get_message_in_conversation_by_id(conversationEntity, messageId) {
    const messageEntity = conversationEntity.get_message_by_id(messageId);
    if (messageEntity) {
      return Promise.resolve(messageEntity);
    }

    return this.eventService.loadEvent(conversationEntity.id, messageId).then(event => {
      if (event) {
        return this.event_mapper.mapJsonEvent(event, conversationEntity);
      }
      throw new z.error.ConversationError(z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND);
    });
  }

  /**
   * Get preceding messages starting with the given message.
   * @param {Conversation} conversationEntity - Respective conversation
   * @returns {Promise} Resolves with the messages
   */
  getPrecedingMessages(conversationEntity) {
    conversationEntity.is_pending(true);

    const firstMessageEntity = conversationEntity.getFirstMessage();
    const upperBound = firstMessageEntity
      ? new Date(firstMessageEntity.timestamp())
      : new Date(conversationEntity.get_latest_timestamp(this.serverTimeRepository.toServerTimestamp()) + 1);

    return this.eventService
      .loadPrecedingEvents(conversationEntity.id, new Date(0), upperBound, z.config.MESSAGES_FETCH_LIMIT)
      .then(events => this._addPrecedingEventsToConversation(events, conversationEntity))
      .then(mappedMessageEntities => {
        conversationEntity.is_pending(false);
        return mappedMessageEntities;
      });
  }

  _addPrecedingEventsToConversation(events, conversationEntity) {
    const hasAdditionalMessages = events.length === z.config.MESSAGES_FETCH_LIMIT;

    return this._addEventsToConversation(events, conversationEntity).then(mappedMessageEntities => {
      conversationEntity.hasAdditionalMessages(hasAdditionalMessages);

      if (!hasAdditionalMessages) {
        const firstMessage = conversationEntity.getFirstMessage();
        const checkCreationMessage = firstMessage && firstMessage.is_member() && firstMessage.isCreation();
        if (checkCreationMessage) {
          const groupCreationMessageIn1to1 = conversationEntity.is_one2one() && firstMessage.isGroupCreation();
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
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {Message} messageEntity - Message entity
   * @param {number} [padding=15] - Padding
   * @returns {Promise} Resolves with the message
   */
  getMessagesWithOffset(conversationEntity, messageEntity, padding = 15) {
    const messageDate = new Date(messageEntity.timestamp());
    const conversationId = conversationEntity.id;

    conversationEntity.is_pending(true);

    const preceedingPromise = this.eventService.loadPrecedingEvents(conversationId, new Date(0), messageDate, padding);
    const followingPromise = this.eventService.loadFollowingEvents(conversationEntity.id, messageDate, padding);
    return Promise.all([preceedingPromise, followingPromise])
      .then(([olderEvents, newerEvents]) => {
        this._addEventsToConversation(olderEvents.concat(newerEvents), conversationEntity);
      })
      .then(mappedMessageEntnties => {
        conversationEntity.is_pending(false);
        return mappedMessageEntnties;
      });
  }

  /**
   * Get subsequent messages starting with the given message.
   *
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {Message} messageEntity - Message entity
   * @param {boolean} includeMessage - Include given message in the results
   * @returns {Promise} Resolves with the messages
   */
  getSubsequentMessages(conversationEntity, messageEntity, includeMessage) {
    const messageDate = new Date(messageEntity.timestamp());
    conversationEntity.is_pending(true);

    return this.eventService
      .loadFollowingEvents(conversationEntity.id, messageDate, z.config.MESSAGES_FETCH_LIMIT, includeMessage)
      .then(events => this._addEventsToConversation(events, conversationEntity))
      .then(mappedNessageEntities => {
        conversationEntity.is_pending(false);
        return mappedNessageEntities;
      });
  }

  /**
   * Get messages for given category. Category param acts as lower bound.
   *
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {MessageCategory} [category=z.message.MessageCategory.NONE] - Message category
   * @returns {Promise} Array of message entities
   */
  get_events_for_category(conversationEntity, category = z.message.MessageCategory.NONE) {
    return this.eventService
      .loadEventsWithCategory(conversationEntity.id, category)
      .then(events => this.event_mapper.mapJsonEvents(events, conversationEntity))
      .then(messageEntities => this._updateMessagesUserEntities(messageEntities));
  }

  /**
   * Search for given text in conversation.
   *
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {string} query - Query strings
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
   * @param {Conversation} conversation_et - Conversation to start from
   * @returns {undefined} No return value
   */
  _get_unread_events(conversation_et) {
    const first_message = conversation_et.getFirstMessage();
    const lower_bound = new Date(conversation_et.last_read_timestamp());
    const upper_bound = first_message
      ? new Date(first_message.timestamp())
      : new Date(conversation_et.get_latest_timestamp(this.serverTimeRepository.toServerTimestamp()) + 1);

    if (lower_bound < upper_bound) {
      conversation_et.is_pending(true);

      return this.eventService
        .loadPrecedingEvents(conversation_et.id, lower_bound, upper_bound)
        .then(events => {
          if (events.length) {
            this._addEventsToConversation(events, conversation_et);
          }
          conversation_et.is_pending(false);
        })
        .catch(error => {
          this.logger.info(`Could not load unread events for conversation: ${conversation_et.id}`, error);
        });
    }
  }

  /**
   * Update conversation with a user you just unblocked
   * @param {User} user_et - User you unblocked
   * @returns {undefined} No return value
   */
  unblocked_user(user_et) {
    this.get1To1Conversation(user_et).then(conversation_et =>
      conversation_et.status(z.conversation.ConversationStatus.CURRENT_MEMBER)
    );
  }

  /**
   * Update all conversations on app init.
   * @returns {undefined} No return value
   */
  updateConversationsOnAppInit() {
    this.logger.info('Updating group participants');
    this.updateUnarchivedConversations();
    this.sorted_conversations().map(conversationEntity => {
      this.updateParticipatingUserEntities(conversationEntity, true);
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
   * @returns {undefined} No return value
   */
  updateUnarchivedConversations() {
    this.updateConversations(this.conversations_unarchived());
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
   * @param {Array<Conversation>} conversationEntities - Array of conversation entities to be updated
   * @returns {undefined} No return value
   */
  updateConversations(conversationEntities) {
    const mapOfUserIds = conversationEntities.map(conversationEntity => conversationEntity.participating_user_ids());
    const userIds = _.flatten(mapOfUserIds);

    this.user_repository
      .get_users_by_id(userIds)
      .then(() => conversationEntities.forEach(conversationEntity => this._fetch_users_and_events(conversationEntity)));
  }

  //##############################################################################
  // Repository interactions
  //##############################################################################

  /**
   * Deletes a conversation from the repository.
   * @param {string} conversation_id - ID of conversation to be deleted from the repository
   * @returns {undefined} No return value
   */
  delete_conversation(conversation_id) {
    this.conversations.remove(conversation_et => conversation_et.id === conversation_id);
  }

  /**
   * Find a local conversation by ID.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Promise} Resolves with the conversation entity
   */
  find_conversation_by_id(conversation_id) {
    return Promise.resolve().then(() => {
      if (!conversation_id) {
        throw new z.error.ConversationError(z.error.ConversationError.TYPE.NO_CONVERSATION_ID);
      }

      const conversation_et = this._find_conversation_by_id(conversation_id);
      if (conversation_et) {
        return conversation_et;
      }

      throw new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
    });
  }

  /**
   * Check for conversation locally.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Conversation} Conversation is locally available
   */
  _find_conversation_by_id(conversation_id) {
    return this.conversations().find(conversation => conversation.id === conversation_id);
  }

  get_all_users_in_conversation(conversation_id) {
    return this.get_conversation_by_id(conversation_id).then(conversation_et =>
      [this.selfUser()].concat(conversation_et.participating_user_ets())
    );
  }

  /**
   * Check for conversation locally and fetch it from the server otherwise.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Promise} Resolves with the Conversation entity
   */
  get_conversation_by_id(conversation_id) {
    if (!_.isString(conversation_id)) {
      return Promise.reject(new z.error.ConversationError(z.error.ConversationError.TYPE.NO_CONVERSATION_ID));
    }

    return this.find_conversation_by_id(conversation_id)
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (isConversationNotFound) {
          return this.fetch_conversation_by_id(conversation_id);
        }

        throw error;
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          this.logger.error(`Failed to get conversation '${conversation_id}': ${error.message}`, error);
        }

        throw error;
      });
  }

  /**
   * Get group conversations by name.
   *
   * @param {string} query - Query to be searched in group conversation names
   * @param {boolean} isHandle - Query string is handle
   * @returns {Array<Conversation>} Matching group conversations
   */
  getGroupsByName(query, isHandle) {
    return this.sorted_conversations()
      .filter(conversationEntity => {
        if (!conversationEntity.isGroup()) {
          return false;
        }

        const queryString = isHandle ? `@${query}` : query;
        if (z.util.StringUtil.compareTransliteration(conversationEntity.display_name(), queryString)) {
          return true;
        }

        for (const userEntity of conversationEntity.participating_user_ets()) {
          const nameString = isHandle ? userEntity.username() : userEntity.name();
          if (z.util.StringUtil.startsWith(nameString, query)) {
            return true;
          }
        }

        return false;
      })
      .sort((conversationA, conversationB) => {
        return z.util.StringUtil.sortByPriority(conversationA.display_name(), conversationB.display_name(), query);
      })
      .map(conversationEntity => {
        this.updateParticipatingUserEntities(conversationEntity);
        return conversationEntity;
      });
  }

  /**
   * Get the most recent event timestamp from any conversation.
   * @param {boolean} [increment=false] - Increment by one for unique timestamp
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
   * @param {Conversation} conversation_et - Conversation to start from
   * @returns {Conversation} Next conversation
   */
  get_next_conversation(conversation_et) {
    return z.util.ArrayUtil.getNextItem(this.conversations_unarchived(), conversation_et);
  }

  /**
   * Get unarchived conversation with the most recent event.
   * @param {boolean} [allConversations=false] - Search all conversations
   * @returns {Conversation} Most recent conversation
   */
  getMostRecentConversation(allConversations = false) {
    const [conversation_et] = allConversations ? this.sorted_conversations() : this.conversations_unarchived();
    return conversation_et;
  }

  /**
   * Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
   * @returns {Promise} Resolve with the most active conversations
   */
  get_most_active_conversations() {
    return this.conversation_service.get_active_conversations_from_db().then(conversation_ids => {
      return conversation_ids
        .map(conversation_id => this._find_conversation_by_id(conversation_id))
        .filter(conversation_et => conversation_et);
    });
  }

  /**
   * Get conversation with a user.
   * @param {User} userEntity - User entity for whom to get the conversation
   * @returns {Promise} Resolves with the conversation with requested user
   */
  get1To1Conversation(userEntity) {
    const inCurrentTeam = userEntity.inTeam() && userEntity.isTeamMember();

    if (inCurrentTeam) {
      const matchingConversationEntity = this.conversations().find(conversationEntity => {
        if (!conversationEntity.is_one2one()) {
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

    const conversationId = userEntity.connection().conversation_id;
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
   * @param {Conversation} conversation_et - Conversation to be saved
   * @returns {boolean} Is the conversation active
   */
  is_active_conversation(conversation_et) {
    if (this.active_conversation()) {
      return this.active_conversation().id === conversation_et.id;
    }
  }

  /**
   * Check whether message has been read.
   *
   * @param {string} conversation_id - Conversation ID
   * @param {string} message_id - Message ID
   * @returns {Promise} Resolves with true if message is marked as read
   */
  is_message_read(conversation_id, message_id) {
    if (!conversation_id || !message_id) {
      return Promise.resolve(false);
    }

    return this.get_conversation_by_id(conversation_id)
      .then(conversation_et => {
        return this.get_message_in_conversation_by_id(conversation_et, message_id).then(
          message_et => conversation_et.last_read_timestamp() >= message_et.timestamp()
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
   * @param {Connection} connection_et - Connections
   * @param {boolean} [show_conversation=false] - Open the new conversation
   * @returns {Promise} Resolves when connection was mapped return value
   */
  map_connection(connection_et, show_conversation = false) {
    const {conversation_id} = connection_et;

    return this.find_conversation_by_id(conversation_id)
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }

        if (connection_et.is_connected() || connection_et.is_outgoing_request()) {
          return this.fetch_conversation_by_id(conversation_id);
        }

        throw new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
      })
      .then(conversation_et => {
        conversation_et.connection(connection_et);

        if (connection_et.is_connected()) {
          conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        }

        this.updateParticipatingUserEntities(conversation_et).then(updated_conversation_et => {
          if (show_conversation) {
            amplify.publish(z.event.WebApp.CONVERSATION.SHOW, updated_conversation_et);
          }

          this.conversations.notifySubscribers();
        });

        return conversation_et;
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
      });
  }

  /**
   * Maps user connections to the corresponding conversations.
   * @param {Array<Connection>} connection_ets - Connections entities
   * @returns {undefined} No return value
   */
  map_connections(connection_ets) {
    this.logger.info(`Mapping '${connection_ets.length}' user connection(s) to conversations`, connection_ets);
    connection_ets.map(connection_et => this.map_connection(connection_et));
  }

  /**
   * Map conversation payload.
   *
   * @param {JSON} payload - Payload to map
   * @param {number} [initialTimestamp=this.getLatestEventTimestamp()] - Initial server and event timestamp
   * @returns {z.entity.Conversation|Array<z.entity.Conversation>} Mapped conversation/s
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
    this.filtered_conversations().forEach(conversation_et => this._mapGuestStatusSelf(conversation_et));

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
   * Mark conversation as read.
   * @param {Conversation} conversationEntity - Conversation to be marked as read
   * @returns {undefined} No return value
   */
  markAsRead(conversationEntity) {
    if (conversationEntity) {
      const hasUnreadEvents = conversationEntity.last_read_timestamp() < conversationEntity.last_server_timestamp();
      const isNotMarkedAsRead = hasUnreadEvents || conversationEntity.unreadState().allEvents.length;
      if (isNotMarkedAsRead && !this.block_event_handling()) {
        this._updateLastReadTimestamp(conversationEntity);
        amplify.publish(z.event.WebApp.NOTIFICATION.REMOVE_READ);
      }
    }
  }

  /**
   * Save a conversation in the repository.
   * @param {Conversation} conversation_et - Conversation to be saved in the repository
   * @returns {Promise} Resolves when conversation was saved
   */
  save_conversation(conversation_et) {
    return this.find_conversation_by_id(conversation_et.id).catch(error => {
      const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (isConversationNotFound) {
        this.conversations.push(conversation_et);
        return this.save_conversation_state_in_db(conversation_et);
      }

      throw error;
    });
  }

  /**
   * Persists a conversation state in the database.
   * @param {Conversation} conversation_et - Conversation of which the state should be persisted
   * @returns {Promise} Resolves when conversation was saved
   */
  save_conversation_state_in_db(conversation_et) {
    return this.conversation_service.save_conversation_state_in_db(conversation_et);
  }

  /**
   * Save conversations in the repository.
   * @param {Array<Conversation>} conversation_ets - Conversations to be saved in the repository
   * @returns {undefined} No return value
   */
  save_conversations(conversation_ets) {
    z.util.koArrayPushAll(this.conversations, conversation_ets);
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not unarchive conversations when handling the notification stream
   * @param {z.event.NOTIFICATION_HANDLING_STATE} handling_state - State of the notifications stream handling
   * @returns {undefined} No return value
   */
  set_notification_handling_state(handling_state) {
    const updated_handling_state = handling_state !== z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.block_event_handling() !== updated_handling_state) {
      this.block_event_handling(updated_handling_state);
      this.sending_queue.pause(this.block_event_handling());
      this.logger.info(`Block handling of conversation events: ${this.block_event_handling()}`);
    }
  }

  /**
   * Update participating users in a conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to be updated
   * @param {boolean} [offline=false] - Should we only look for cached contacts
   * @param {boolean} [updateGuests=false] - Update conversation guests
   * @returns {Promise} Resolves when users have been updated
   */
  updateParticipatingUserEntities(conversationEntity, offline = false, updateGuests = false) {
    return this.user_repository
      .get_users_by_id(conversationEntity.participating_user_ids(), offline)
      .then(userEntities => {
        userEntities.sort((userA, userB) => z.util.StringUtil.sortByPriority(userA.first_name(), userB.first_name()));
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
   * @param {Conversation} conversationEntity - Conversation to add users to
   * @param {Array<z.entity.User>} userEntities - Users to be added to the conversation
   * @returns {Promise} Resolves when members were added
   */
  addMembers(conversationEntity, userEntities) {
    const userIds = userEntities.map(userEntity => userEntity.id);

    return this.conversation_service
      .postMembers(conversationEntity.id, userIds)
      .then(response => {
        if (response) {
          this.eventRepository.injectEvent(response, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
        }
      })
      .catch(error => this._handleAddToConversationError(error, conversationEntity, userIds));
  }

  addMissingMember(conversationId, userIds, timestamp) {
    return this.get_conversation_by_id(conversationId).then(conversationEntity => {
      const [sender] = userIds;
      const event = z.conversation.EventBuilder.buildMemberJoin(conversationEntity, sender, userIds, timestamp);
      return this.eventRepository.injectEvent(event, z.event.EventRepository.SOURCE.INJECTED);
    });
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to add service to
   * @param {string} providerId - ID of service provider
   * @param {string} serviceId - ID of service
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
          return this.eventRepository.injectEvent(response.event, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
        }

        return event;
      })
      .catch(error => this._handleAddToConversationError(error, conversationEntity, [serviceId]));
  }

  _handleAddToConversationError(error, conversationEntity, userIds) {
    switch (error.label) {
      case z.error.BackendClientError.LABEL.NOT_CONNECTED: {
        this._handleUsersNotConnected(userIds);
        break;
      }

      case z.error.BackendClientError.LABEL.BAD_GATEWAY:
      case z.error.BackendClientError.LABEL.SERVER_ERROR:
      case z.error.BackendClientError.LABEL.SERVICE_DISABLED:
      case z.error.BackendClientError.LABEL.TOO_MANY_BOTS: {
        const messageText = z.l10n.text(z.string.modalServiceUnavailableMessage);
        const titleText = z.l10n.text(z.string.modalServiceUnavailableHeadline);

        this._showModal(messageText, titleText);
        break;
      }

      case z.error.BackendClientError.LABEL.TOO_MANY_MEMBERS: {
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
   * @param {Conversation} conversation_et - Conversation to clear
   * @param {boolean} [leave_conversation=false] - Should we leave the conversation before clearing the content?
   * @returns {undefined} No return value
   */
  clear_conversation(conversation_et, leave_conversation = false) {
    const is_active_conversation = this.is_active_conversation(conversation_et);
    const next_conversation_et = this.get_next_conversation(conversation_et);

    if (leave_conversation) {
      conversation_et.status(z.conversation.ConversationStatus.PAST_MEMBER);
    }

    this._updateClearedTimestamp(conversation_et);
    this._clear_conversation(conversation_et);

    if (leave_conversation) {
      this.removeMember(conversation_et, this.selfUser().id);
    }

    if (is_active_conversation) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_et);
    }
  }

  /**
   * Update cleared of conversation using timestamp.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to update
   * @returns {undefined} No return value
   */
  _updateClearedTimestamp(conversationEntity) {
    const timestamp = conversationEntity.get_last_known_timestamp(this.serverTimeRepository.toServerTimestamp());

    if (timestamp && conversationEntity.setTimestamp(timestamp, z.entity.Conversation.TIMESTAMP_TYPE.CLEARED)) {
      const protoCleared = new z.proto.Cleared(conversationEntity.id, timestamp);
      const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
      genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLEARED, protoCleared);

      const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, this.self_conversation().id);
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
   * @param {Conversation} conversationEntity - Conversation to remove member from
   * @param {string} userId - ID of member to be removed from the conversation
   * @returns {Promise} Resolves when member was removed from the conversation
   */
  removeMember(conversationEntity, userId) {
    return this.conversation_service.deleteMembers(conversationEntity.id, userId).then(response => {
      const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
      const event = !!response
        ? response
        : z.conversation.EventBuilder.buildMemberLeave(conversationEntity, userId, true, currentTimestamp);

      this.eventRepository.injectEvent(event, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Remove service from conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to remove service from
   * @param {z.entity.User} userId - ID of service user to be removed from the conversation
   * @returns {Promise} Resolves when service was removed from the conversation
   */
  removeService(conversationEntity, userId) {
    return this.conversation_service.deleteBots(conversationEntity.id, userId).then(response => {
      const hasResponse = response && response.event;
      const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
      const event = hasResponse
        ? response.event
        : z.conversation.EventBuilder.buildMemberLeave(conversationEntity, userId, true, currentTimestamp);

      this.eventRepository.injectEvent(event, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Rename conversation.
   *
   * @param {Conversation} conversation_et - Conversation to rename
   * @param {string} name - New conversation name
   * @returns {Promise} Resolves when conversation was renamed
   */
  renameConversation(conversation_et, name) {
    return this.conversation_service.updateConversationName(conversation_et.id, name).then(response => {
      if (response) {
        this.eventRepository.injectEvent(response, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
        return response;
      }
    });
  }

  /**
   * Set the global message timer
   *
   * @param {Conversation} conversationEntity - Conversation to update
   * @param {number} messageTimer - New message timer value
   * @returns {Promise} Resolves when conversation was updated on server side
   */
  updateConversationMessageTimer(conversationEntity, messageTimer) {
    messageTimer = z.conversation.ConversationEphemeralHandler.validateTimer(messageTimer);

    return this.conversation_service
      .updateConversationMessageTimer(conversationEntity.id, messageTimer)
      .then(response => {
        if (response) {
          this.eventRepository.injectEvent(response, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
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
   * @param {Conversation} conversationEntity - Conversation to send message in
   * @param {string} url - URL of giphy image
   * @param {string} tag - tag tag used for gif search
   * @returns {Promise} Resolves when the gif was posted
   */
  sendGif(conversationEntity, url, tag) {
    if (!tag) {
      tag = z.l10n.text(z.string.extensionsGiphyRandom);
    }

    return z.util.loadUrlBlob(url).then(blob => {
      const textMessage = z.l10n.text(z.string.extensionsGiphyMessage, tag);
      this.sendText(conversationEntity, textMessage);
      return this.upload_images(conversationEntity, [blob]);
    });
  }

  /**
   * Team member was removed.
   * @param {string} teamId - ID of team that member was removed from
   * @param {string} userId - ID of leaving user
   * @param {Date} isoDate - Date of member removal
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
   * @param {z.entity.Conversation} conversationEntity - Conversation to change notification state off
   * @param {z.conversation.NotificationSetting} notificationState - New notification state
   * @returns {Promise} Resolves when the notification stated was change
   */
  setNotificationState(conversationEntity, notificationState) {
    if (!conversationEntity || notificationState === undefined) {
      return Promise.reject(new z.error.ConversationError(z.error.BaseError.TYPE.MISSING_PARAMETER));
    }

    const validNotificationStates = Object.values(z.conversation.NotificationSetting.STATE);
    if (!validNotificationStates.includes(notificationState)) {
      return Promise.reject(new z.error.ConversationError(z.error.BaseError.TYPE.INVALID_PARAMETER));
    }

    const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
    const otrMuted = notificationState !== z.conversation.NotificationSetting.STATE.EVERYTHING;
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
   * @param {Conversation} conversationEntity - Conversation to rename
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
   * @param {Conversation} conversationEntity - Conversation to unarchive
   * @param {boolean} [forceChange=false] - Force state change without new message
   * @param {string} trigger - Trigger for unarchive
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

    const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
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

          const isNotFound = error.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND;
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
   * @param {Conversation} conversation_et - Conversation entity to delete
   * @param {number} [timestamp] - Optional timestamps for which messages to remove
   * @returns {undefined} No return value
   */
  _clear_conversation(conversation_et, timestamp) {
    this._deleteMessages(conversation_et, timestamp);

    if (conversation_et.removed_from_conversation()) {
      this.conversation_service.delete_conversation_from_db(conversation_et.id);
      this.delete_conversation(conversation_et.id);
    }
  }

  _handleConversationCreateError(error, userIds) {
    switch (error.label) {
      case z.error.BackendClientError.LABEL.CLIENT_ERROR:
        this._handleTooManyMembersError();
        break;
      case z.error.BackendClientError.LABEL.NOT_CONNECTED:
        this._handleUsersNotConnected(userIds);
        break;
      default:
        throw error;
    }
  }

  _handleTooManyMembersError(participants = ConversationRepository.CONFIG.GROUP.MAX_SIZE) {
    const openSpots = ConversationRepository.CONFIG.GROUP.MAX_SIZE - participants;
    const substitutions = {number1: ConversationRepository.CONFIG.GROUP.MAX_SIZE, number2: Math.max(0, openSpots)};

    const messageText = z.l10n.text(z.string.modalConversationTooManyMembersMessage, substitutions);
    const titleText = z.l10n.text(z.string.modalConversationTooManyMembersHeadline);
    this._showModal(messageText, titleText);
  }

  _handleUsersNotConnected(userIds = []) {
    const [userID] = userIds;
    const userPromise = userIds.length === 1 ? this.user_repository.get_user_by_id(userID) : Promise.resolve();

    userPromise.then(userEntity => {
      const username = userEntity ? userEntity.first_name() : undefined;
      const messageStringId = username
        ? z.string.modalConversationNotConnectedMessageOne
        : z.string.modalConversationNotConnectedMessageMany;

      const messageText = z.l10n.text(messageStringId, username);
      const titleText = z.l10n.text(z.string.modalConversationNotConnectedHeadline);
      this._showModal(messageText, titleText);
    });
  }

  _showModal(messageText, titleText) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: messageText,
        title: titleText,
      },
    });
  }

  /**
   * Update last read of conversation using timestamp.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to update
   * @returns {undefined} No return value
   */
  _updateLastReadTimestamp(conversationEntity) {
    const timestamp = conversationEntity.get_last_known_timestamp(this.serverTimeRepository.toServerTimestamp());
    const conversationId = conversationEntity.id;

    if (timestamp && conversationEntity.setTimestamp(timestamp, z.entity.Conversation.TIMESTAMP_TYPE.LAST_READ)) {
      const protoLeastRead = new z.proto.LastRead(conversationId, conversationEntity.last_read_timestamp());
      const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
      genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.LAST_READ, protoLeastRead);

      const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, this.self_conversation().id);
      this.sendGenericMessageToConversation(eventInfoEntity)
        .then(() => {
          this.logger.info(`Marked conversation '${conversationId}' as read on '${new Date(timestamp).toISOString()}'`);
        })
        .catch(error => {
          const errorMessage = 'Failed to update last read timestamp';
          this.logger.error(`${errorMessage}: ${error.message}`, error);
          Raygun.send(new Error(errorMessage), {label: error.label, message: error.message});
        });
    }
  }

  //##############################################################################
  // Send encrypted events
  //##############################################################################

  send_asset_remotedata(conversationEntity, file, messageId) {
    let genericMessage;

    return this.get_message_in_conversation_by_id(conversationEntity, messageId)
      .then(messageEntity => {
        const assetEntity = messageEntity.get_first_asset();
        const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
        const options = {retention};

        assetEntity.uploaded_on_this_client(true);
        return this.asset_service.uploadAsset(file, options, xhr => {
          xhr.upload.onprogress = event => assetEntity.upload_progress(Math.round((event.loaded / event.total) * 100));
          assetEntity.upload_cancel = () => xhr.abort();
        });
      })
      .then(asset => {
        genericMessage = new z.proto.GenericMessage(messageId);
        genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversationEntity.messageTimer()) {
          genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
        }

        const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, conversationEntity.id);
        return this.sendGenericMessageToConversation(eventInfoEntity);
      })
      .then(payload => {
        const {uploaded: assetData} = conversationEntity.messageTimer()
          ? genericMessage.ephemeral.asset
          : genericMessage.asset;

        const data = {
          key: assetData.asset_id,
          otr_key: assetData.otr_key,
          sha256: assetData.sha256,
          token: assetData.asset_token,
        };

        const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
        const assetAddEvent = z.conversation.EventBuilder.buildAssetAdd(conversationEntity, data, currentTimestamp);

        assetAddEvent.id = messageId;
        assetAddEvent.time = payload.time;

        return this._on_asset_upload_complete(conversationEntity, assetAddEvent);
      });
  }

  /**
   * Send asset metadata message to specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation that should receive the file
   * @param {File} file - File to send
   * @returns {Promise} Resolves when the asset metadata was sent
   */
  send_asset_metadata(conversation_et, file) {
    return z.assets.AssetMetaDataBuilder.buildMetadata(file)
      .catch(error => {
        const logMessage = `Couldn't render asset preview from metadata. Asset might be corrupt: ${error.message}`;
        this.logger.warn(logMessage, error);
        return undefined;
      })
      .then(metadata => {
        const protoAsset = new z.proto.Asset();

        let assetOriginal = undefined;
        if (z.assets.AssetMetaDataBuilder.isAudio(file)) {
          assetOriginal = new z.proto.Asset.Original(file.type, file.size, file.name, null, null, metadata);
        } else if (z.assets.AssetMetaDataBuilder.isVideo(file)) {
          assetOriginal = new z.proto.Asset.Original(file.type, file.size, file.name, null, metadata);
        } else if (z.assets.AssetMetaDataBuilder.isImage(file)) {
          assetOriginal = new z.proto.Asset.Original(file.type, file.size, file.name, metadata);
        } else {
          assetOriginal = new z.proto.Asset.Original(file.type, file.size, file.name);
        }
        protoAsset.set(z.cryptography.PROTO_MESSAGE_TYPE.ASSET_ORIGINAL, assetOriginal);

        return protoAsset;
      })
      .then(asset => {
        let generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversation_et.messageTimer()) {
          generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.messageTimer());
        }

        return this._send_and_inject_generic_message(conversation_et, generic_message);
      })
      .catch(error => {
        const log = `Failed to upload metadata for asset in conversation '${conversation_et.id}': ${error.message}`;
        this.logger.warn(log, error);

        if (error.type === z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }
      });
  }

  /**
   * Send asset preview message to specified conversation.
   *
   * @param {Conversation} conversationEntity - Conversation that should receive the preview
   * @param {File} file - File to generate preview from
   * @param {string} messageId - Message ID of the message to generate a preview for
   * @returns {Promise} Resolves when the asset preview was sent
   */
  sendAssetPreview(conversationEntity, file, messageId) {
    return poster(file)
      .then(imageBlob => {
        if (!imageBlob) {
          throw Error('No image available');
        }

        const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
        const options = {retention};

        return this.asset_service.uploadAsset(imageBlob, options).then(uploadedImageAsset => {
          const protoAsset = new z.proto.Asset();
          const assetPreview = new z.proto.Asset.Preview(imageBlob.type, imageBlob.size, uploadedImageAsset.uploaded);
          protoAsset.set(z.cryptography.PROTO_MESSAGE_TYPE.ASSET_PREVIEW, assetPreview);

          const genericMessage = new z.proto.GenericMessage(messageId);
          genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, protoAsset);

          return this._send_and_inject_generic_message(conversationEntity, genericMessage);
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
   * @param {Conversation} conversation_et - Conversation that should receive the file
   * @param {string} messageId - ID of the metadata message
   * @param {z.assets.AssetUploadFailedReason} [reason=z.assets.AssetUploadFailedReason.FAILED] - Cause for the failed upload (optional)
   * @returns {Promise} Resolves when the asset failure was sent
   */
  send_asset_upload_failed(conversation_et, messageId, reason = z.assets.AssetUploadFailedReason.FAILED) {
    const wasCancelled = reason === z.assets.AssetUploadFailedReason.CANCELLED;
    const protoReason = wasCancelled ? z.proto.Asset.NotUploaded.CANCELLED : z.proto.Asset.NotUploaded.FAILED;
    const protoAsset = new z.proto.Asset();
    protoAsset.set(z.cryptography.PROTO_MESSAGE_TYPE.ASSET_NOT_UPLOADED, protoReason);

    const generic_message = new z.proto.GenericMessage(messageId);
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, protoAsset);

    return this._send_and_inject_generic_message(conversation_et, generic_message);
  }

  /**
   * Send confirmation for a content message in specified conversation.
   *
   * @param {Conversation} conversationEntity - Conversation that content message was received in
   * @param {Message} messageEntity - Message for which to acknowledge receipt
   * @returns {undefined} No return value
   */
  sendConfirmationStatus(conversationEntity, messageEntity) {
    const otherUserIn1To1 = !messageEntity.user().is_me && conversationEntity.is_one2one();
    const {CONFIRMATION_THRESHOLD} = ConversationRepository.CONFIG;
    const withinThreshold = messageEntity.timestamp() >= Date.now() - CONFIRMATION_THRESHOLD;
    const typeToConfirm = z.event.EventTypeHandling.CONFIRM.includes(messageEntity.type);

    const sendConfirmation = otherUserIn1To1 && withinThreshold && typeToConfirm;
    if (sendConfirmation) {
      const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
      const protoConfirmation = new z.proto.Confirmation(z.proto.Confirmation.Type.DELIVERED, messageEntity.id);
      genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.CONFIRMATION, protoConfirmation);

      this.sending_queue.push(() => {
        return this.create_recipients(conversationEntity.id, true, [messageEntity.user().id]).then(recipients => {
          const options = {nativePush: false, precondition: [messageEntity.user().id], recipients};
          const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, conversationEntity.id, options);

          return this._sendGenericMessage(eventInfoEntity);
        });
      });
    }
  }

  /**
   * Send call message in specified conversation.
   *
   * @param {z.conversation.EventInfoEntity} eventInfoEntity - Event info to be send
   * @param {Conversation} conversationEntity - Conversation to send call message to
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Content for call message
   * @returns {Promise} Resolves when the confirmation was sent
   */
  sendCallingMessage(eventInfoEntity, conversationEntity, callMessageEntity) {
    return this.sending_queue
      .push(() => {
        const options = eventInfoEntity.options;
        const recipientsPromise = options.recipients
          ? Promise.resolve(eventInfoEntity)
          : this.create_recipients(conversationEntity.id, false).then(recipients => {
              eventInfoEntity.updateOptions({recipients});
              return eventInfoEntity;
            });

        return recipientsPromise.then(infoEntity => this._sendGenericMessage(infoEntity));
      })
      .then(() => {
        const initiatingCallMessage = [
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START,
          z.calling.enum.CALL_MESSAGE_TYPE.SETUP,
        ];

        const isCallInitiation = initiatingCallMessage.includes(callMessageEntity.type);
        if (isCallInitiation) {
          return this._trackContributed(conversationEntity, eventInfoEntity.genericMessage, callMessageEntity);
        }
      })
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }

        amplify.publish(z.event.WebApp.CALL.STATE.DELETE, callMessageEntity.conversationId);
      });
  }

  /**
   * Sends image asset in specified conversation using v3 api.
   *
   * @param {Conversation} conversationEntity - Conversation to send image in
   * @param {File|Blob} image - Image
   * @returns {Promise} Resolves when the image was sent
   */
  send_image_asset(conversationEntity, image) {
    const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
    const options = {retention};

    return this.asset_service
      .uploadImageAsset(image, options)
      .then(asset => {
        let genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
        genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversationEntity.messageTimer()) {
          genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
        }

        return this._send_and_inject_generic_message(conversationEntity, genericMessage);
      })
      .catch(error => {
        const message = `Failed to upload otr asset for conversation ${conversationEntity.id}: ${error.message}`;
        this.logger.error(message, error);
        throw error;
      });
  }

  /**
   * Send knock in specified conversation.
   * @param {Conversation} conversationEntity - Conversation to send knock in
   * @returns {Promise} Resolves after sending the knock
   */
  sendKnock(conversationEntity) {
    let genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    const protoKnock = new z.proto.Knock(false);
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK, protoKnock);

    if (conversationEntity.messageTimer()) {
      genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
    }

    return this._send_and_inject_generic_message(conversationEntity, genericMessage).catch(error => {
      if (error.type !== z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
        this.logger.error(`Error while sending knock: ${error.message}`, error);
        throw error;
      }
    });
  }

  /**
   * Send link preview in specified conversation.
   *
   * @param {Conversation} conversationEntity - Conversation that should receive the message
   * @param {string} textMessage - Plain text message that possibly contains link
   * @param {z.proto.GenericMessage} genericMessage - GenericMessage of containing text or edited message
   * @param {Array<z.message.MentionEntity>} [mentionEntities] - Mentions as part of message
   * @returns {Promise} Resolves after sending the message
   */
  sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities) {
    const conversationId = conversationEntity.id;
    const messageId = genericMessage.message_id;

    return this.link_repository
      .getLinkPreviewFromString(textMessage)
      .then(linkPreview => {
        if (linkPreview) {
          const protoText = this._createTextProto(messageId, textMessage, mentionEntities, [linkPreview]);
          genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, protoText);

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
            return this._send_and_inject_generic_message(conversationEntity, genericMessage);
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
   * @param {Conversation} conversationEntity - Conversation that should receive the message
   * @param {number} longitude - Longitude of the location
   * @param {number} latitude - Latitude of the location
   * @param {string} name - Name of the location
   * @param {number} zoom - Zoom factor for the map (Google Maps)
   * @returns {Promise} Resolves after sending the location
   */
  sendLocation(conversationEntity, longitude, latitude, name, zoom) {
    const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    const protoLocation = new z.proto.Location(longitude, latitude, name, zoom);
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.LOCATION, protoLocation);

    const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, conversationEntity.id);
    return this.sendGenericMessageToConversation(eventInfoEntity);
  }

  /**
   * Send edited message in specified conversation.
   *
   * @param {z.entity.Conversation} conversationEntity - Conversation entity
   * @param {string} textMessage - Edited plain text message
   * @param {z.entity.Message} originalMessageEntity - Original message entity
   * @param {Array<z.message.MentionEntity>} [mentionEntities] - Mentions as part of the message
   * @returns {Promise} Resolves after sending the message
   */
  sendMessageEdit(conversationEntity, textMessage, originalMessageEntity, mentionEntities) {
    const hasDifferentText = z.util.MessageComparator.isTextDifferent(originalMessageEntity, textMessage);
    const hasDifferentMentions = z.util.MessageComparator.areMentionsDifferent(originalMessageEntity, mentionEntities);
    const wasEdited = hasDifferentText || hasDifferentMentions;

    if (!wasEdited) {
      return Promise.reject(new z.error.ConversationError(z.error.ConversationError.TYPE.NO_MESSAGE_CHANGES));
    }

    const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    const protoText = this._createTextProto(genericMessage.message_id, textMessage, mentionEntities);
    const protoMessageEdit = new z.proto.MessageEdit(originalMessageEntity.id, protoText);
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.EDITED, protoMessageEdit);

    return this._send_and_inject_generic_message(conversationEntity, genericMessage, false)
      .then(() => {
        if (z.util.Environment.desktop) {
          return this.sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities);
        }
      })
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          this.logger.error(`Error while editing message: ${error.message}`, error);
          throw error;
        }
      });
  }

  /**
   * Toggle like status of message.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Message} message_et - Message to react to
   * @param {boolean} button - Source of toggle
   * @returns {undefined} No return value
   */
  toggle_like(conversation_et, message_et, button) {
    if (!conversation_et.removed_from_conversation()) {
      const reaction = message_et.is_liked() ? z.message.ReactionType.NONE : z.message.ReactionType.LIKE;
      message_et.is_liked(!message_et.is_liked());

      window.setTimeout(() => this.sendReaction(conversation_et, message_et, reaction), 100);
    }
  }

  /**
   * Send reaction to a content message in specified conversation.
   * @param {Conversation} conversationEntity - Conversation to send reaction in
   * @param {Message} messageEntity - Message to react to
   * @param {z.message.ReactionType} reaction - Reaction
   * @returns {Promise} Resolves after sending the reaction
   */
  sendReaction(conversationEntity, messageEntity, reaction) {
    const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    const protoReaction = new z.proto.Reaction(reaction, messageEntity.id);
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.REACTION, protoReaction);

    return this._send_and_inject_generic_message(conversationEntity, genericMessage);
  }

  /**
   * Sending a message to the remote end of a session reset.
   *
   * @note When we reset a session then we must inform the remote client about this action. It sends a ProtocolBuffer message
   *  (which will not be rendered in the view) to the remote client. This message only needs to be sent to the affected
   *  remote client, therefore we force the message sending.
   *
   * @param {string} userId - User ID
   * @param {string} clientId - Client ID
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} Resolves after sending the session reset
   */
  sendSessionReset(userId, clientId, conversationId) {
    const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLIENT_ACTION, z.proto.ClientAction.RESET_SESSION);

    const options = {
      precondition: true,
      recipients: {[userId]: [clientId]},
    };
    const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, conversationId, options);

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
   * @param {Conversation} conversationEntity - Conversation that should receive the message
   * @param {string} textMessage - Plain text message
   * @param {Array<z.message.MentionEntity>} [mentionEntities] - Mentions as part of the message
   * @returns {Promise} Resolves after sending the message
   */
  sendText(conversationEntity, textMessage, mentionEntities) {
    let genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    const protoText = this._createTextProto(genericMessage.message_id, textMessage, mentionEntities);
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, protoText);

    if (conversationEntity.messageTimer()) {
      genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
    }

    return this._send_and_inject_generic_message(conversationEntity, genericMessage).then(() => genericMessage);
  }

  /**
   * Send text message with link preview in specified conversation.
   *
   * @param {Conversation} conversationEntity - Conversation that should receive the message
   * @param {string} textMessage - Plain text message
   * @param {Array<z.message.MentionEntity>} [mentionEntities] - Mentions part of the message
   * @returns {Promise} Resolves after sending the message
   */
  sendTextWithLinkPreview(conversationEntity, textMessage, mentionEntities) {
    return this.sendText(conversationEntity, textMessage, mentionEntities)
      .then(genericMessage => {
        if (z.util.Environment.desktop) {
          return this.sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities);
        }
      })
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          this.logger.error(`Error while sending text message: ${error.message}`, error);
          throw error;
        }
      });
  }

  _createTextProto(messageId, textMessage, mentionEntities, linkPreviews) {
    const protoText = new z.proto.Text(textMessage);

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
      protoText.set(z.cryptography.PROTO_MESSAGE_TYPE.MENTIONS, protoMentions);
    }

    if (linkPreviews && linkPreviews.length) {
      const logMessage = `Adding link preview to message '${messageId}'`;
      this.logger.debug(logMessage, linkPreviews);

      protoText.set(z.cryptography.PROTO_MESSAGE_TYPE.LINK_PREVIEWS, linkPreviews);
    }

    return protoText;
  }

  /**
   * Wraps generic message in ephemeral message.
   *
   * @param {z.proto.GenericMessage} genericMessage - Message to be wrapped
   * @param {number} millis - Expire time in milliseconds
   * @returns {z.proto.Message} New proto message
   */
  _wrap_in_ephemeral_message(genericMessage, millis) {
    const protoEphemeral = new z.proto.Ephemeral();
    const ephemeralExpiration = z.conversation.ConversationEphemeralHandler.validateTimer(millis);

    protoEphemeral.set(z.cryptography.PROTO_MESSAGE_TYPE.EPHEMERAL_EXPIRATION, ephemeralExpiration);
    protoEphemeral.set(genericMessage.content, genericMessage[genericMessage.content]);

    genericMessage = new z.proto.GenericMessage(genericMessage.message_id);
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL, protoEphemeral);
    return genericMessage;
  }

  //##############################################################################
  // Send Generic Messages
  //##############################################################################

  /**
   * Create a user client map for a given conversation.
   *
   * @param {string} conversation_id - Conversation ID
   * @param {boolean} [skip_own_clients=false] - True, if other own clients should be skipped (to not sync messages on own clients)
   * @param {Array<string>} user_ids - Optionally the intended recipient users
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
    return this.sending_queue.push(() => {
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

        const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
        const optimisticEvent = z.conversation.EventBuilder.buildMessageAdd(conversationEntity, currentTimestamp);
        return this.cryptography_repository.cryptographyMapper.mapGenericMessage(genericMessage, optimisticEvent);
      })
      .then(mappedEvent => {
        const {KNOCK: TYPE_KNOCK, EPHEMERAL: TYPE_EPHEMERAL} = z.cryptography.GENERIC_MESSAGE_TYPE;
        const isPing = message => message.content === TYPE_KNOCK;
        const isEphemeralPing = message => message.content === TYPE_EPHEMERAL && isPing(message.ephemeral);
        const shouldPlayPingAudio = isPing(genericMessage) || isEphemeralPing(genericMessage);
        if (shouldPlayPingAudio) {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.OUTGOING_PING);
        }

        return mappedEvent;
      })
      .then(mappedEvent => this.eventRepository.injectEvent(mappedEvent))
      .then(injectedEvent => {
        const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, conversationEntity.id);
        eventInfoEntity.setTimestamp(injectedEvent.time);
        return this.sendGenericMessageToConversation(eventInfoEntity).then(sentPayload => {
          return {event: injectedEvent, sentPayload};
        });
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
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {Object} eventJson - Event object
   * @param {string} isoDate - If defined it will update event timestamp
   * @returns {Promise} Resolves when sent status was updated
   */
  _updateMessageAsSent(conversationEntity, eventJson, isoDate) {
    return this.get_message_in_conversation_by_id(conversationEntity, eventJson.id)
      .then(messageEntity => {
        messageEntity.status(z.message.StatusType.SENT);

        const changes = {status: z.message.StatusType.SENT};
        if (isoDate) {
          changes.time = isoDate;

          const timestamp = new Date(isoDate).getTime();
          if (!_.isNaN(timestamp)) {
            messageEntity.timestamp(timestamp);
            conversationEntity.update_timestamp_server(timestamp, true);
            conversationEntity.update_timestamps(messageEntity);
          }
        }

        this.checkMessageTimer(messageEntity);
        if (z.event.EventTypeHandling.STORE.includes(messageEntity.type) || messageEntity.has_asset_image()) {
          return this.eventService.updateEvent(messageEntity.primary_key, changes);
        }
      })
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Send encrypted external message
   *
   * @private
   * @param {z.conversation.EventInfoEntity} eventInfoEntity - Event to be send
   * @returns {Promise} Resolves after sending the external message
   */
  _sendExternalGenericMessage(eventInfoEntity) {
    const {genericMessage, options} = eventInfoEntity;
    const messageType = eventInfoEntity.getType();
    this.logger.info(`Sending external message of type '${messageType}'`, genericMessage);

    return z.assets.AssetCrypto.encryptAesAsset(genericMessage.toArrayBuffer())
      .then(({cipherText, keyBytes, sha256}) => {
        const genericMessageExternal = new z.proto.GenericMessage(z.util.createRandomUuid());
        const externalMessage = new z.proto.External(new Uint8Array(keyBytes), new Uint8Array(sha256));
        genericMessageExternal.set(z.cryptography.GENERIC_MESSAGE_TYPE.EXTERNAL, externalMessage);

        return this.cryptography_repository
          .encryptGenericMessage(options.recipients, genericMessageExternal)
          .then(payload => {
            payload.data = z.util.arrayToBase64(cipherText);
            payload.native_push = options.nativePush;
            return this._sendEncryptedMessage(eventInfoEntity, payload);
          });
      })
      .catch(error => {
        this.logger.info('Failed sending external message', error);
        throw error;
      });
  }

  /**
   * Sends a generic message to a conversation.
   *
   * @private
   * @param {z.conversation.EventInfoEntity} eventInfoEntity - Info about event
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
        const isRequestTooLarge = error.code === z.error.BackendClientError.STATUS_CODE.REQUEST_TOO_LARGE;
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
   * @param {z.conversation.EventInfoEntity} eventInfoEntity - Info about message to be sent
   * @param {Object} payload - Payload
   * @returns {Promise} Promise that resolves after sending the encrypted message
   */
  _sendEncryptedMessage(eventInfoEntity, payload) {
    const {conversationId, genericMessage, options} = eventInfoEntity;
    const messageId = genericMessage.message_id;
    const messageType = eventInfoEntity.getType();

    const logMessage = `Sending '${messageType}' message '${messageId}' to conversation '${conversationId}'`;
    this.logger.info(logMessage, payload);

    return this.conversation_service
      .post_encrypted_message(conversationId, payload, options.precondition)
      .then(response => {
        this.clientMismatchHandler.onClientMismatch(eventInfoEntity, response, payload);
        return response;
      })
      .catch(error => {
        const isUnknownClient = error.label === z.error.BackendClientError.LABEL.UNKNOWN_CLIENT;
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
            this.logger.info(`Updated '${messageType}' message for conversation '${conversationId}'`, updatedPayload);
            return this.conversation_service.post_encrypted_message(conversationId, updatedPayload, true);
          });
      });
  }

  _grantOutgoingMessage(eventInfoEntity, userIds) {
    const messageType = eventInfoEntity.getType();
    const allowedMessageTypes = ['cleared', 'confirmation', 'deleted', 'lastRead'];
    if (allowedMessageTypes.includes(messageType)) {
      return Promise.resolve();
    }

    const isCallingMessage = messageType === z.cryptography.GENERIC_MESSAGE_TYPE.CALLING;
    const consentType = isCallingMessage
      ? ConversationRepository.CONSENT_TYPE.OUTGOING_CALL
      : ConversationRepository.CONSENT_TYPE.MESSAGE;

    return this.grantMessage(eventInfoEntity, consentType, userIds);
  }

  grantMessage(eventInfoEntity, consentType, userIds) {
    return this.get_conversation_by_id(eventInfoEntity.conversationId).then(conversationEntity => {
      const verificationState = conversationEntity.verification_state();
      const conversationDegraded = verificationState === z.conversation.ConversationVerificationState.DEGRADED;

      if (!conversationDegraded) {
        return false;
      }

      return new Promise((resolve, reject) => {
        let sendAnyway = false;

        userIds = userIds || conversationEntity.getUsersWithUnverifiedClients().map(userEntity => userEntity.id);

        return this.user_repository
          .get_users_by_id(userIds)
          .then(userEntities => {
            let actionStringId;
            let messageStringId;
            let titleStringId;

            const hasMultipleUsers = userEntities.length > 1;
            if (hasMultipleUsers) {
              titleStringId = z.string.modalConversationNewDeviceHeadlineMany;
            } else {
              const [userEntity] = userEntities;

              if (userEntity) {
                titleStringId = userEntity.is_me
                  ? z.string.modalConversationNewDeviceHeadlineYou
                  : z.string.modalConversationNewDeviceHeadlineOne;
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

            const userNames = z.util.LocalizerUtil.joinNames(userEntities, z.string.Declension.NOMINATIVE);
            const titleSubstitutions = z.util.StringUtil.capitalizeFirstChar(userNames);

            switch (consentType) {
              case ConversationRepository.CONSENT_TYPE.INCOMING_CALL: {
                actionStringId = z.string.modalConversationNewDeviceIncomingCallAction;
                messageStringId = z.string.modalConversationNewDeviceIncomingCallMessage;
                break;
              }

              case ConversationRepository.CONSENT_TYPE.OUTGOING_CALL: {
                actionStringId = z.string.modalConversationNewDeviceOutgoingCallAction;
                messageStringId = z.string.modalConversationNewDeviceOutgoingCallMessage;
                break;
              }

              default: {
                actionStringId = z.string.modalConversationNewDeviceAction;
                messageStringId = z.string.modalConversationNewDeviceMessage;
                break;
              }
            }

            amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
              action: () => {
                sendAnyway = true;
                conversationEntity.verification_state(z.conversation.ConversationVerificationState.UNVERIFIED);

                resolve(true);
              },
              close: () => {
                if (!sendAnyway) {
                  const errorType = z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION;
                  reject(new z.error.ConversationError(errorType));
                }
              },
              text: {
                action: z.l10n.text(actionStringId),
                message: z.l10n.text(messageStringId),
                title: z.l10n.text(titleStringId, titleSubstitutions),
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
   * @param {z.conversation.EventInfoEntity} eventInfoEntity - Info about event
   * @returns {boolean} Is payload likely to be too big so that we switch to type external?
   */
  _shouldSendAsExternal(eventInfoEntity) {
    const {conversationId, genericMessage} = eventInfoEntity;

    return this.get_conversation_by_id(conversationId).then(conversationEntity => {
      const messageInBytes = new Uint8Array(genericMessage.toArrayBuffer()).length;
      const estimatedPayloadInBytes = conversationEntity.getNumberOfClients() * messageInBytes;

      return estimatedPayloadInBytes > ConversationRepository.CONFIG.EXTERNAL_MESSAGE_THRESHOLD;
    });
  }

  /**
   * Post images to a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to post the images
   * @param {Array|FileList} images - Images
   * @returns {undefined} No return value
   */
  upload_images(conversation_et, images) {
    if (this._can_upload_assets_to_conversation(conversation_et)) {
      Array.from(images).forEach(image => this.send_image_asset(conversation_et, image));
    }
  }

  /**
   * Post files to a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to post the files
   * @param {Array|FileList} files - files
   * @returns {undefined} No return value
   */
  upload_files(conversation_et, files) {
    if (this._can_upload_assets_to_conversation(conversation_et)) {
      Array.from(files).forEach(file => this.upload_file(conversation_et, file));
    }
  }

  /**
   * Post file to a conversation using v3
   *
   * @param {Conversation} conversation_et - Conversation to post the file
   * @param {Object} file - File object
   * @returns {Promise} Resolves when file was uploaded
   */
  upload_file(conversation_et, file) {
    let message_id;
    const upload_started = Date.now();

    return this.send_asset_metadata(conversation_et, file)
      .then(({id}) => {
        message_id = id;
        return this.sendAssetPreview(conversation_et, file, message_id);
      })
      .then(() => this.send_asset_remotedata(conversation_et, file, message_id))
      .then(() => {
        const upload_duration = (Date.now() - upload_started) / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;
        this.logger.info(`Finished to upload asset for conversation'${conversation_et.id} in ${upload_duration}`);
      })
      .catch(error => {
        if (error.type === z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }

        this.logger.error(`Failed to upload asset for conversation '${conversation_et.id}': ${error.message}`, error);
        return this.get_message_in_conversation_by_id(conversation_et, message_id).then(message_et => {
          this.send_asset_upload_failed(conversation_et, message_et.id);
          return this.update_message_as_upload_failed(message_et);
        });
      });
  }

  /**
   * Delete message for everyone.
   *
   * @param {Conversation} conversationEntity - Conversation to delete message from
   * @param {Message} messageEntity - Message to delete
   * @param {Array<string>|boolean} [precondition] - Optional level that backend checks for missing clients
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

        const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
        const protoMessageDelete = new z.proto.MessageDelete(messageId);
        genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.DELETED, protoMessageDelete);

        return this.sending_queue.push(() => {
          return this.create_recipients(conversationId, false, precondition).then(recipients => {
            const options = {precondition, recipients};
            const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, conversationId, options);
            this._sendGenericMessage(eventInfoEntity);
          });
        });
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, messageId, conversationId);
        return this._delete_message_by_id(conversationEntity, messageId);
      })
      .catch(error => {
        const isConversationNotFound = error.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND;
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
   * @param {Conversation} conversationEntity - Conversation to delete message from
   * @param {Message} messageEntity - Message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  deleteMessage(conversationEntity, messageEntity) {
    return Promise.resolve()
      .then(() => {
        const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
        const protoMessageHide = new z.proto.MessageHide(conversationEntity.id, messageEntity.id);
        genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.HIDDEN, protoMessageHide);

        const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, this.self_conversation().id);
        return this.sendGenericMessageToConversation(eventInfoEntity);
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, messageEntity.id, conversationEntity.id);
        return this._delete_message_by_id(conversationEntity, messageEntity.id);
      })
      .catch(error => {
        this.logger.info(
          `Failed to send delete message with id '${messageEntity.id}' for conversation '${conversationEntity.id}'`,
          error
        );
        throw error;
      });
  }

  /**
   * Can user upload assets to conversation.
   * @param {Conversation} conversation_et - Conversation to check
   * @returns {boolean} Can assets be uploaded
   */
  _can_upload_assets_to_conversation(conversation_et) {
    if (!conversation_et || conversation_et.is_request() || conversation_et.removed_from_conversation()) {
      return false;
    }

    if (conversation_et.is_one2one() && !conversation_et.connection().is_connected) {
      return false;
    }

    return true;
  }

  /**
   * Count number of pending uploads
   * @returns {number} Number of pending uploads
   */
  get_number_of_pending_uploads() {
    return this.conversations().reduce((sum, conversationEntity) => {
      return sum + conversationEntity.get_number_of_pending_uploads();
    }, 0);
  }

  //##############################################################################
  // Event callbacks
  //##############################################################################

  /**
   * Listener for incoming events.
   *
   * @param {Object} eventJson - JSON data for event
   * @param {z.event.EventRepository.SOURCE} [eventSource=z.event.EventRepository.SOURCE.STREAM] - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  onConversationEvent(eventJson, eventSource = z.event.EventRepository.SOURCE.STREAM) {
    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    const logMessage = `»» Conversation Event: '${eventJson.type}' (Source: ${eventSource})`;
    this.logger.info(logMessage, logObject);

    return this._pushToReceivingQueue(eventJson, eventSource);
  }

  _handleConversationEvent(eventJson, eventSource = z.event.EventRepository.SOURCE.STREAM) {
    if (!eventJson) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const {conversation, data: eventData, type} = eventJson;
    const conversationId = (eventData && eventData.conversationId) || conversation;
    this.logger.info(`Handling event '${type}' in conversation '${conversationId}' (Source: ${eventSource})`);

    const inSelfConversation = conversationId === this.self_conversation() && this.self_conversation().id;
    if (inSelfConversation) {
      const typesInSelfConversation = [
        z.event.Backend.CONVERSATION.MEMBER_UPDATE,
        z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
      ];

      const isExpectedType = typesInSelfConversation.includes(type);
      if (!isExpectedType) {
        return Promise.reject(new z.error.ConversationError(z.error.ConversationError.TYPE.WRONG_CONVERSATION));
      }
    }

    const isConversationCreate = type === z.event.Backend.CONVERSATION.CREATE;
    const onEventPromise = isConversationCreate ? Promise.resolve() : this.get_conversation_by_id(conversationId);
    let previouslyArchived;

    return onEventPromise
      .then(conversationEntity => {
        if (conversationEntity) {
          // Check if conversation was archived
          previouslyArchived = conversationEntity.is_archived();

          const isBackendTimestamp = eventSource !== z.event.EventRepository.SOURCE.INJECTED;
          conversationEntity.update_timestamp_server(eventJson.server_time || eventJson.time, isBackendTimestamp);
        }

        return conversationEntity;
      })
      .then(conversationEntity => this._checkConversationParticipants(conversationEntity, eventJson, eventSource))
      .then(conversationEntity => this._triggerFeatureEventHandlers(conversationEntity, eventJson, eventSource))
      .then(conversationEntity => this._reactToConversationEvent(conversationEntity, eventJson, eventSource))
      .then((entityObject = {}) => this._handleConversationNotification(entityObject, eventSource, previouslyArchived))
      .catch(error => {
        const isMessageNotFound = error.type === z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (!isMessageNotFound) {
          throw error;
        }
      });
  }

  /**
   * Check that sender of received event is a known conversation participant.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation targeted by the event
   * @param {Object} eventJson - JSON data of the event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise} Resolves when the participant list has been checked
   */
  _checkConversationParticipants(conversationEntity, eventJson, eventSource) {
    // We ignore injected events
    const isInjectedEvent = eventSource === z.event.EventRepository.SOURCE.INJECTED;
    if (isInjectedEvent || !conversationEntity) {
      return conversationEntity;
    }

    const {from: sender, id, type, time} = eventJson;

    if (sender) {
      const allParticipantIds = conversationEntity.participating_user_ids().concat(this.selfUser().id);
      const isFromUnknownUser = !allParticipantIds.includes(sender);

      if (isFromUnknownUser) {
        const leavingEventTypes = [
          z.event.Backend.CONVERSATION.MEMBER_LEAVE,
          z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE,
        ];
        const isLeaveEvent = leavingEventTypes.includes(eventJson.type);
        if (isLeaveEvent) {
          const isFromLeavingUser = eventJson.data.user_ids.includes(sender);
          if (isFromLeavingUser) {
            // we ignore leave events that are sent by the user actually leaving
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

  /**
   * Triggers the methods associated with a specific event.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation targeted by the event
   * @param {Object} eventJson - JSON data of the event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise<any>} Resolves when the event has been treated
   */
  _reactToConversationEvent(conversationEntity, eventJson, eventSource) {
    switch (eventJson.type) {
      case z.event.Backend.CONVERSATION.CREATE:
        return this._onCreate(eventJson, eventSource);

      case z.event.Backend.CONVERSATION.MEMBER_JOIN:
        return this._onMemberJoin(conversationEntity, eventJson);

      case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
      case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE:
        return this._onMemberLeave(conversationEntity, eventJson);

      case z.event.Backend.CONVERSATION.MEMBER_UPDATE:
        return this._onMemberUpdate(conversationEntity, eventJson);

      case z.event.Backend.CONVERSATION.RENAME:
        return this._onRename(conversationEntity, eventJson);

      case z.event.Client.CONVERSATION.ASSET_ADD:
        return this._onAssetAdd(conversationEntity, eventJson);

      case z.event.Client.CONVERSATION.CONFIRMATION:
        return this._on_confirmation(conversationEntity, eventJson);

      case z.event.Client.CONVERSATION.GROUP_CREATION:
        return this._onGroupCreation(conversationEntity, eventJson);

      case z.event.Client.CONVERSATION.MESSAGE_DELETE:
        return this._onMessageDeleted(conversationEntity, eventJson);

      case z.event.Client.CONVERSATION.MESSAGE_HIDDEN:
        return this._onMessageHidden(eventJson);

      case z.event.Client.CONVERSATION.ONE2ONE_CREATION:
        return this._on1to1Creation(conversationEntity, eventJson);

      case z.event.Client.CONVERSATION.REACTION:
        return this._onReaction(conversationEntity, eventJson);

      case z.event.Backend.CONVERSATION.MESSAGE_TIMER_UPDATE:
      case z.event.Client.CONVERSATION.DELETE_EVERYWHERE:
      case z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
      case z.event.Client.CONVERSATION.KNOCK:
      case z.event.Client.CONVERSATION.LOCATION:
      case z.event.Client.CONVERSATION.MESSAGE_ADD:
      case z.event.Client.CONVERSATION.MISSED_MESSAGES:
      case z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT:
      case z.event.Client.CONVERSATION.VERIFICATION:
      case z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE:
      case z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE:
        return this._addEventToConversation(conversationEntity, eventJson);
    }
  }

  /**
   * Calls the feature specific event handler on the current event being handled.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation targeted by the event
   * @param {Object} eventJson - JSON data of the event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise} Resolves when all the handlers have done their job
   */
  _triggerFeatureEventHandlers(conversationEntity, eventJson, eventSource) {
    const conversationEventHandlers = [this.ephemeralHandler, this.stateHandler];
    const handlePromises = conversationEventHandlers.map(handler =>
      handler.handleConversationEvent(conversationEntity, eventJson, eventSource)
    );
    return Promise.all(handlePromises).then(() => conversationEntity);
  }

  /**
   * Handles conversation update and notification message.
   *
   * @private
   * @param {Object} entityObject - Object containing the conversation and the message that are targeted by the event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @param {boolean} previouslyArchived - true if the previous state of the conversation was archived
   * @returns {Promise} Resolves when the conversation was updated
   */
  _handleConversationNotification(entityObject = {}, eventSource, previouslyArchived) {
    const {conversationEntity, messageEntity} = entityObject;

    if (conversationEntity) {
      const eventFromWebSocket = eventSource === z.event.EventRepository.SOURCE.WEB_SOCKET;
      const eventFromStream = eventSource === z.event.EventRepository.SOURCE.STREAM;

      if (messageEntity) {
        const isRemoteEvent = eventFromStream || eventFromWebSocket;

        if (isRemoteEvent) {
          this.sendConfirmationStatus(conversationEntity, messageEntity);
        }

        if (!eventFromStream) {
          amplify.publish(z.event.WebApp.NOTIFICATION.NOTIFY, messageEntity, undefined, conversationEntity);
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
   * @param {Object} eventJson - JSON data for event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _pushToReceivingQueue(eventJson, source) {
    this.receiving_queue
      .push(() => this._handleConversationEvent(eventJson, source))
      .then(() => {
        if (this.init_promise) {
          const eventFromStream = source === z.event.EventRepository.SOURCE.STREAM;
          if (eventFromStream) {
            this.init_handled = this.init_handled + 1;
            if (this.init_handled % 5 === 0 || this.init_handled < 5) {
              const content = {
                handled: this.init_handled,
                total: this.init_total,
              };
              const progress = (this.init_handled / this.init_total) * 20 + 75;

              amplify.publish(z.event.WebApp.APP.UPDATE_PROGRESS, progress, z.string.initEvents, content);
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
   * Add missed events message to conversations.
   * @returns {undefined} No return value
   */
  on_missed_events() {
    this.filtered_conversations()
      .filter(conversation_et => !conversation_et.removed_from_conversation())
      .forEach(conversation_et => {
        const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
        const missed_event = z.conversation.EventBuilder.buildMissed(conversation_et, currentTimestamp);
        this.eventRepository.injectEvent(missed_event);
      });
  }

  _on1to1Creation(conversationEntity, eventJson) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity)
      .then(messageEntity => this._updateMessageUserEntities(messageEntity))
      .then(messageEntity => {
        const userEntity = messageEntity.otherUser();
        const isOutgoingRequest = userEntity && userEntity.is_outgoing_request();
        if (isOutgoingRequest) {
          messageEntity.memberMessageType = z.message.SystemMessageType.CONNECTION_REQUEST;
        }

        conversationEntity.add_message(messageEntity);
        return {conversationEntity};
      });
  }

  /**
   * An asset was uploaded.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.asset-upload-complete' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_asset_upload_complete(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.id)
      .then(message_et => this.update_message_as_upload_complete(conversation_et, message_et, event_json))
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }

        this.logger.error(`Upload complete: Could not find message with id '${event_json.id}'`, event_json);
      });
  }

  /**
   * Received confirmation of message.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity that a message was reacted upon in
   * @param {Object} event_json - JSON data of 'conversation.confirmation' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_confirmation(conversation_et, event_json) {
    const event_data = event_json.data;

    return this.get_message_in_conversation_by_id(conversation_et, event_data.message_id)
      .then(message_et => {
        const was_updated = message_et.update_status(event_data.status);

        if (was_updated) {
          const changes = {status: message_et.status()};
          return this.eventService.updateEvent(message_et.primary_key, changes);
        }
      })
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          this.logger.info(
            `Failed to handle status update of a message in conversation '${conversation_et.id}'`,
            error
          );
          throw error;
        }
      });
  }

  /**
   * A conversation was created.
   *
   * @private
   * @param {Object} eventJson - JSON data of 'conversation.create' event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise} Resolves when the event was handled
   */
  _onCreate(eventJson, eventSource) {
    const {conversation: conversationId, data: eventData, time} = eventJson;
    const eventTimestamp = new Date(time).getTime();
    const initialTimestamp = _.isNaN(eventTimestamp) ? this.getLatestEventTimestamp(true) : eventTimestamp;

    return this.find_conversation_by_id(conversationId)
      .then(conversationEntity => {
        if (conversationEntity) {
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.NO_CHANGES);
        }
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (isConversationNotFound) {
          return this.mapConversations(eventData, initialTimestamp);
        }

        throw error;
      })
      .then(conversationEntity => this.updateParticipatingUserEntities(conversationEntity))
      .then(conversationEntity => this.save_conversation(conversationEntity))
      .then(conversationEntity => {
        if (conversationEntity) {
          if (conversationEntity.participating_user_ids().length) {
            this._addCreationMessage(conversationEntity, false, initialTimestamp, eventSource);
          }

          this.verification_state_handler.onConversationCreate(conversationEntity);
          return {conversationEntity};
        }
      })
      .catch(error => {
        const isNoChanges = error.type === z.error.ConversationError.TYPE.NO_CHANGES;
        if (!isNoChanges) {
          throw error;
        }
      });
  }

  _onGroupCreation(conversationEntity, eventJson) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity)
      .then(messageEntity => {
        const creatorId = conversationEntity.creator;
        const createdByParticipant = !!conversationEntity.participating_user_ids().find(userId => userId === creatorId);
        const createdBySelfUser = this.selfUser().id === creatorId && !conversationEntity.removed_from_conversation();

        const creatorIsParticipant = createdByParticipant || createdBySelfUser;
        if (!creatorIsParticipant) {
          messageEntity.memberMessageType = z.message.SystemMessageType.CONVERSATION_RESUME;
        }

        return this._updateMessageUserEntities(messageEntity);
      })
      .then(messageEntity => {
        if (conversationEntity && messageEntity) {
          conversationEntity.add_message(messageEntity);
        }

        return {conversationEntity, messageEntity};
      });
  }

  /**
   * User were added to a group conversation.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to add users to
   * @param {Object} eventJson - JSON data of 'conversation.member-join' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberJoin(conversationEntity, eventJson) {
    // Ignore if we join a 1to1 conversation (accept a connection request)
    const connectionEntity = this.user_repository.get_connection_by_conversation_id(conversationEntity.id);
    const isPendingConnection = connectionEntity && connectionEntity.status() === z.user.ConnectionStatus.PENDING;
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
      conversationEntity.status(z.conversation.ConversationStatus.CURRENT_MEMBER);
    }

    const updateSequence = selfUserRejoins ? this.updateConversationFromBackend(conversationEntity) : Promise.resolve();

    return updateSequence
      .then(() => this.updateParticipatingUserEntities(conversationEntity, false, true))
      .then(() => this._addEventToConversation(conversationEntity, eventJson))
      .then(({messageEntity}) => {
        this.verification_state_handler.onMemberJoined(conversationEntity, eventData.user_ids);
        return {conversationEntity, messageEntity};
      });
  }

  /**
   * Members of a group conversation were removed or left.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to remove users from
   * @param {Object} eventJson - JSON data of 'conversation.member-leave' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberLeave(conversationEntity, eventJson) {
    const {data: eventData, from} = eventJson;
    const isFromSelf = from === this.selfUser().id;
    const removesSelfUser = eventData.user_ids.includes(this.selfUser().id);
    const selfLeavingClearedConversation = isFromSelf && removesSelfUser && conversationEntity.is_cleared();

    if (removesSelfUser) {
      conversationEntity.status(z.conversation.ConversationStatus.PAST_MEMBER);

      if (conversationEntity.call()) {
        const reason = z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE;
        amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, conversationEntity.id, reason);
      }

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

              if (conversationEntity.call()) {
                amplify.publish(z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, conversationEntity.id, userEntity.id);
              }
            });

          return this.updateParticipatingUserEntities(conversationEntity).then(() => messageEntity);
        })
        .then(messageEntity => {
          this.verification_state_handler.onMemberLeft(conversationEntity);

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
   * @param {Conversation} conversationEntity - Conversation entity that will be updated
   * @param {Object} eventJson - JSON data of 'conversation.member-update' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberUpdate(conversationEntity, eventJson) {
    const {conversation: conversationId, data: eventData, from} = eventJson;

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

    if (!conversationEntity.showNotificationsEverything()) {
      const hasIncomingCall = conversationEntity.call() && conversationEntity.call().isIncoming();
      if (hasIncomingCall) {
        amplify.publish(z.event.WebApp.CALL.STATE.REJECT, conversationEntity.id, false);
      }
    }

    if (isActiveConversation && (conversationEntity.is_archived() || conversationEntity.is_cleared())) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, nextConversationEt);
    }
  }

  /**
   * An asset received in a conversation.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to add the event to
   * @param {Object} event - JSON data of 'conversation.asset-add'
   * @returns {Promise} Resolves when the event was handled
   */
  _onAssetAdd(conversationEntity, event) {
    const fromSelf = event.from === this.selfUser().id;

    const isRemoteFailure = !fromSelf && event.data.status === z.assets.AssetTransferState.UPLOAD_FAILED;
    const isLocalCancel = fromSelf && event.data.reason === z.assets.AssetUploadFailedReason.CANCELLED;

    if (isRemoteFailure || isLocalCancel) {
      return conversationEntity.remove_message_by_id(event.id);
    }

    return this._addEventToConversation(conversationEntity, event).then(({messageEntity}) => {
      const firstAsset = messageEntity.get_first_asset();
      if (firstAsset.is_image() || firstAsset.status() === z.assets.AssetTransferState.UPLOADED) {
        return {conversationEntity, messageEntity};
      }
    });
  }

  /**
   * A hide message received in a conversation.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to add the event to
   * @param {Object} eventJson - JSON data of 'conversation.message-delete'
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
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, eventData.message_id, conversationEntity.id);
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
   * @param {Object} eventJson - JSON data of 'conversation.message-hidden'
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
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, eventData.message_id, conversationEntity.id);
        return this._delete_message_by_id(conversationEntity, eventData.message_id);
      })
      .catch(error => {
        this.logger.info(
          `Failed to delete message '${eventData.message_id}' for conversation '${eventData.conversation_id}'`,
          error
        );
        throw error;
      });
  }

  /**
   * Someone reacted to a message.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation entity that a message was reacted upon in
   * @param {Object} eventJson - JSON data of 'conversation.reaction' event
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

        const changes = messageEntity.update_reactions(eventJson);
        if (changes) {
          const log = `Updating reactions of message '${messageId}' in conversation '${conversationId}'`;
          this.logger.debug(log, {changes, event: eventJson});

          return this._updateMessageUserEntities(messageEntity).then(changedMessageEntity => {
            this.eventService.updateEventSequentially(changedMessageEntity.primary_key, changes);
            return this._prepareReactionNotification(conversationEntity, changedMessageEntity, eventJson);
          });
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
   * @param {Conversation} conversationEntity - Conversation entity that will be renamed
   * @param {Object} eventJson - JSON data of 'conversation.rename' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onRename(conversationEntity, eventJson) {
    return this._addEventToConversation(conversationEntity, eventJson).then(({messageEntity}) => {
      this.conversationMapper.updateProperties(conversationEntity, eventJson.data);
      return {conversationEntity, messageEntity};
    });
  }

  handleMessageExpiration(messageEntity) {
    amplify.publish(z.event.WebApp.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, messageEntity);
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

  /**
   * Convert a JSON event into an entity and add it to a given conversation.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation entity the event will be added to
   * @param {Object} eventJson - Event data
   * @returns {Promise} Promise that resolves with the message entity for the event
   */
  _addEventToConversation(conversationEntity, eventJson) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity, true)
      .then(messageEntity => this._updateMessageUserEntities(messageEntity))
      .then(messageEntity => this.ephemeralHandler.validateMessage(messageEntity))
      .then(messageEntity => {
        if (conversationEntity && messageEntity) {
          conversationEntity.add_message(messageEntity, true);
        }
        return {conversationEntity, messageEntity};
      });
  }

  /**
   * Convert multiple JSON events into entities and add them to a given conversation.
   *
   * @private
   * @param {Array} events - Event data
   * @param {Conversation} conversationEntity - Conversation entity the events will be added to
   * @param {boolean} [prepend=true] - Should existing messages be prepended
   * @returns {Promise} Resolves with an array of mapped messages
   */
  _addEventsToConversation(events, conversationEntity, prepend = true) {
    return this.event_mapper
      .mapJsonEvents(events, conversationEntity, true)
      .then(messageEntities => this._updateMessagesUserEntities(messageEntities))
      .then(messageEntities => this.ephemeralHandler.validateMessages(messageEntities))
      .then(messageEntities => {
        if (prepend && conversationEntity.messages().length) {
          conversationEntity.prepend_messages(messageEntities);
        } else {
          conversationEntity.add_messages(messageEntities);
        }
        return messageEntities;
      });
  }

  /**
   * Fetch all unread events and users of a conversation.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation fetch events and users for
   * @returns {undefined} No return value
   */
  _fetch_users_and_events(conversation_et) {
    if (!conversation_et.is_loaded() && !conversation_et.is_pending()) {
      this.updateParticipatingUserEntities(conversation_et);
      this._get_unread_events(conversation_et);
    }
  }

  /**
   * Forward the reaction event to the Notification repository for browser and audio notifications.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation that event was received in
   * @param {Message} messageEntity - Message that has been reacted upon
   * @param {Object} eventJson -] JSON data of received reaction event
   * @returns {Promise} Resolves when the notification was prepared
   */
  _prepareReactionNotification(conversationEntity, messageEntity, eventJson) {
    const {data: event_data, from} = eventJson;

    const messageFromSelf = messageEntity.from === this.selfUser().id;
    if (messageFromSelf && event_data.reaction) {
      return this.user_repository.get_user_by_id(from).then(userEntity => {
        const reactionMessageEntity = new z.entity.Message(messageEntity.id, z.message.SuperType.REACTION);
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
   * @param {Message} messageEntity - Message to be updated
   * @returns {Promise} Resolves when users have been update
   */
  _updateMessageUserEntities(messageEntity) {
    return this.user_repository.get_user_by_id(messageEntity.from).then(userEntity => {
      messageEntity.user(userEntity);

      if (messageEntity.is_member() || messageEntity.userEntities) {
        return this.user_repository.get_users_by_id(messageEntity.userIds()).then(userEntities => {
          userEntities.sort((userA, userB) => z.util.StringUtil.sortByPriority(userA.first_name(), userB.first_name()));
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

        if (messageEntity.has_asset_text()) {
          messageEntity.assets().forEach(assetEntity => {
            if (assetEntity.is_text()) {
              assetEntity.theme_color = messageEntity.user().accent_color();
            }
          });
        }
      }

      return messageEntity;
    });
  }

  /**
   * Cancel asset upload.
   * @param {Message} message_et - Message on which the cancel was initiated
   * @returns {undefined} No return value
   */
  cancel_asset_upload(message_et) {
    this.send_asset_upload_failed(
      this.active_conversation(),
      message_et.id,
      z.assets.AssetUploadFailedReason.CANCELLED
    );
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {Message} message_et - Message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  _delete_message(conversation_et, message_et) {
    conversation_et.remove_message_by_id(message_et.id);
    return this.eventService.deleteEventByKey(message_et.primary_key);
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {string} message_id - ID of message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  _delete_message_by_id(conversation_et, message_id) {
    conversation_et.remove_message_by_id(message_id);
    return this.eventService.deleteEvent(conversation_et.id, message_id);
  }

  /**
   * Delete messages from UI and database.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation that contains the message
   * @param {number} [timestamp] - Timestamp as upper bound which messages to remove
   * @returns {undefined} No return value
   */
  _deleteMessages(conversationEntity, timestamp) {
    conversationEntity.remove_messages(timestamp);
    conversationEntity.hasCreationMessage = false;

    const iso_date = timestamp ? new Date(timestamp).toISOString() : undefined;
    this.eventService.deleteEvents(conversationEntity.id, iso_date);
  }

  /**
   * Add delete message to conversation.
   *
   * @private
   * @param {string} conversationId - ID of conversation
   * @param {string} messageId - ID of message
   * @param {string} time - ISO 8601 formatted time string
   * @param {Message} messageEntity - Message to delete
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
   * @param {Message} message_et - Message to update
   * @param {string} [reason=z.assets.AssetTransferState.UPLOAD_FAILED] - Failure reason
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_failed(message_et, reason = z.assets.AssetTransferState.UPLOAD_FAILED) {
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
        asset_et.upload_failed_reason(z.assets.AssetUploadFailedReason.FAILED);
      }

      return this.eventService.updateEventAsUploadFailed(message_et.primary_key, reason);
    }
  }

  /**
   * Update asset in UI and DB as completed.
   *
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {Message} message_et - Message to update
   * @param {Object} event_json - Uploaded asset event information
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_complete(conversation_et, message_et, event_json) {
    const {id, key, otr_key, sha256, token} = event_json.data;
    const asset_et = message_et.get_first_asset();

    const resource = key
      ? z.assets.AssetRemoteData.v3(key, otr_key, sha256, token)
      : z.assets.AssetRemoteData.v2(conversation_et.id, id, otr_key, sha256);

    asset_et.original_resource(resource);
    asset_et.status(z.assets.AssetTransferState.UPLOADED);
    message_et.status(z.message.StatusType.SENT);

    return this.eventService.updateEventAsUploadSucceeded(message_et.primary_key, event_json);
  }

  //##############################################################################
  // Tracking helpers
  //##############################################################################

  /**
   * Track generic messages for media actions.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {z.proto.GenericMessage} genericMessage - Protobuf message
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Optional call message
   * @returns {undefined} No return value
   */
  _trackContributed(conversationEntity, genericMessage, callMessageEntity) {
    let messageTimer;
    const isEphemeral = genericMessage.content === z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL;

    if (isEphemeral) {
      genericMessage = genericMessage.ephemeral;
      messageTimer = genericMessage.expire_after_millis / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;
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

      case 'calling': {
        const {properties} = callMessageEntity;
        const isVideoCall = properties.videosend === z.calling.enum.PROPERTY_STATE.TRUE;
        actionType = isVideoCall ? 'video_call' : 'audio_call';
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
        if (!protoText.link_preview.length) {
          actionType = 'text';
          numberOfMentions = protoText.mentions.length;
        }
        break;
      }

      default:
        break;
    }

    if (actionType) {
      const attributes = {
        action: actionType,
        conversation_type: z.tracking.helpers.getConversationType(conversationEntity),
        ephemeral_time: isEphemeral ? messageTimer : undefined,
        is_ephemeral: isEphemeral,
        is_global_ephemeral: !!conversationEntity.globalMessageTimer(),
        mention_num: numberOfMentions,
        with_service: conversationEntity.hasService(),
      };

      const isTeamConversation = !!conversationEntity.team_id;
      if (isTeamConversation) {
        Object.assign(attributes, z.tracking.helpers.getGuestAttributes(conversationEntity));
      }

      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONTRIBUTED, attributes);
    }
  }
};
