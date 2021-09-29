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

import ko from 'knockout';
import {amplify} from 'amplify';
import {Confirmation, LegalHoldStatus, Asset as ProtobufAsset} from '@wireapp/protocol-messaging';
import {flatten} from 'underscore';
import {WebAppEvents} from '@wireapp/webapp-events';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {
  CONVERSATION_EVENT,
  ConversationMessageTimerUpdateEvent,
  ConversationRenameEvent,
  ConversationMemberJoinEvent,
  ConversationCreateEvent,
  ConversationEvent,
  ConversationReceiptModeUpdateEvent,
  ConversationMemberLeaveEvent,
} from '@wireapp/api-client/src/event';
import {
  DefaultConversationRoleName as DefaultRole,
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_ACCESS,
  CONVERSATION_TYPE,
  NewConversation,
  Conversation as BackendConversation,
} from '@wireapp/api-client/src/conversation/';
import {container} from 'tsyringe';
import {ConversationReceiptModeUpdateData} from '@wireapp/api-client/src/conversation/data/';
import {BackendErrorLabel} from '@wireapp/api-client/src/http/';
import type {QualifiedId} from '@wireapp/api-client/src/user/';
import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {PromiseQueue} from 'Util/PromiseQueue';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getNextItem} from 'Util/ArrayUtil';
import {createRandomUuid, noop} from 'Util/util';
import {allowsAllFiles, getFileExtensionOrName, isAllowedFile} from 'Util/FileTypeUtil';
import {
  compareTransliteration,
  sortByPriority,
  startsWith,
  sortUsersByPriority,
  fixWebsocketString,
} from 'Util/StringUtil';
import {ClientEvent} from '../event/Client';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {EventRepository} from '../event/EventRepository';
import {
  AssetAddEvent,
  ButtonActionConfirmationEvent,
  ClientConversationEvent,
  DeleteEvent,
  EventBuilder,
  GroupCreationEvent,
  MessageHiddenEvent,
  OneToOneCreationEvent,
  QualifiedIdOptional,
  ReactionEvent,
  TeamMemberLeaveEvent,
} from '../conversation/EventBuilder';
import {Conversation} from '../entity/Conversation';
import {Message} from '../entity/message/Message';
import {ConversationMapper, ConversationDatabaseData} from './ConversationMapper';
import {ConversationStateHandler} from './ConversationStateHandler';
import {EventMapper} from './EventMapper';
import {ACCESS_STATE} from './AccessState';
import {ConversationStatus} from './ConversationStatus';
import {ConversationVerificationStateHandler} from './ConversationVerificationStateHandler';
import {NOTIFICATION_STATE} from './NotificationSetting';
import {ConversationEphemeralHandler} from './ConversationEphemeralHandler';
import {ConversationLabelRepository} from './ConversationLabelRepository';
import {AssetTransferState} from '../assets/AssetTransferState';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {SystemMessageType} from '../message/SystemMessageType';
import {SuperType} from '../message/SuperType';
import {MessageCategory} from '../message/MessageCategory';
import {Config} from '../Config';
import {BaseError, BASE_ERROR_TYPE} from '../error/BaseError';
import {BackendClientError} from '../error/BackendClientError';
import * as LegalHoldEvaluator from '../legal-hold/LegalHoldEvaluator';
import {DeleteConversationMessage} from '../entity/message/DeleteConversationMessage';
import {ConversationRoleRepository} from './ConversationRoleRepository';
import {ConversationError} from '../error/ConversationError';
import {ConversationService} from './ConversationService';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {UserRepository} from '../user/UserRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {ContentMessage} from '../entity/message/ContentMessage';
import {User} from '../entity/User';
import {EventService} from '../event/EventService';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {EventSource} from '../event/EventSource';
import {MemberMessage} from '../entity/message/MemberMessage';
import {FileAsset} from '../entity/message/FileAsset';
import type {EventRecord} from '../storage';
import {MessageRepository} from './MessageRepository';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';
import {TeamRepository} from '../team/TeamRepository';
import {ConversationState} from './ConversationState';
import {ConversationRecord} from '../storage/record/ConversationRecord';
import {UserFilter} from '../user/UserFilter';
import {ConversationFilter} from './ConversationFilter';
import {ConversationMemberUpdateEvent} from '@wireapp/api-client/src/event';
import {matchQualifiedIds} from 'Util/QualifiedId';

type ConversationDBChange = {obj: EventRecord; oldObj: EventRecord};
type FetchPromise = {rejectFn: (error: ConversationError) => void; resolveFn: (conversation: Conversation) => void};
type EntityObject = {conversationEntity: Conversation; messageEntity: Message};
type IncomingEvent = ConversationEvent | ClientConversationEvent;

export class ConversationRepository {
  private init_handled: number;
  private init_promise?: {rejectFn: (reason?: any) => void; resolveFn: (value?: unknown) => void};
  private init_total: number;
  private isBlockingNotificationHandling: boolean;
  private readonly conversationsWithNewEvents: Map<any, any>;
  private readonly ephemeralHandler: ConversationEphemeralHandler;
  public readonly conversationLabelRepository: ConversationLabelRepository;
  public readonly conversationRoleRepository: ConversationRoleRepository;
  private readonly event_mapper: EventMapper;
  private readonly eventService: EventService;
  public leaveCall: (conversationId: string) => void;
  private readonly receiving_queue: PromiseQueue;
  private readonly logger: Logger;
  public readonly stateHandler: ConversationStateHandler;
  public readonly verificationStateHandler: ConversationVerificationStateHandler;

  static get CONFIG() {
    return {
      CONFIRMATION_THRESHOLD: TIME_IN_MILLIS.WEEK,
      EXTERNAL_MESSAGE_THRESHOLD: 200 * 1024,
      GROUP: {
        MAX_NAME_LENGTH: 64,
        MAX_SIZE: Config.getConfig().MAX_GROUP_PARTICIPANTS,
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

  constructor(
    private readonly conversation_service: ConversationService,
    private readonly messageRepositoryProvider: () => MessageRepository,
    private readonly connectionRepository: ConnectionRepository,
    private readonly eventRepository: EventRepository,
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly propertyRepository: PropertiesRepository,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.eventService = eventRepository.eventService;

    this.logger = getLogger('ConversationRepository');

    this.event_mapper = new EventMapper();
    this.verificationStateHandler = new ConversationVerificationStateHandler(
      this.eventRepository,
      this.serverTimeHandler,
      this.userState,
      this.conversationState,
    );
    this.isBlockingNotificationHandling = true;
    this.conversationsWithNewEvents = new Map();

    this.teamState.isTeam.subscribe(() => this.mapGuestStatusSelf());
    this.receiving_queue = new PromiseQueue({name: 'ConversationRepository.Receiving'});

    this.init_handled = 0;
    this.init_promise = undefined;
    this.init_total = 0;

    this.initSubscriptions();

    this.stateHandler = new ConversationStateHandler(this.conversation_service);
    this.ephemeralHandler = new ConversationEphemeralHandler(this.eventService, {
      onMessageTimeout: this.handleMessageExpiration,
    });

    this.userState.directlyConnectedUsers = this.conversationState.connectedUsers;

    this.conversationLabelRepository = new ConversationLabelRepository(
      this.conversationState.conversations,
      this.conversationState.conversations_unarchived,
      propertyRepository.propertiesService,
    );

    this.conversationRoleRepository = new ConversationRoleRepository(this.teamRepository, this.conversation_service);
    this.leaveCall = noop;
  }

  checkMessageTimer(messageEntity: ContentMessage): void {
    this.ephemeralHandler.checkMessageTimer(messageEntity, this.serverTimeHandler.getTimeOffset());
  }

  private initStateUpdates(): void {
    ko.computed(() => {
      const conversationsArchived: Conversation[] = [];
      const conversationsCleared: Conversation[] = [];
      const conversationsUnarchived: Conversation[] = [];

      this.conversationState.sorted_conversations().forEach(conversationEntity => {
        if (conversationEntity.is_cleared()) {
          conversationsCleared.push(conversationEntity);
        } else if (conversationEntity.is_archived()) {
          conversationsArchived.push(conversationEntity);
        } else {
          conversationsUnarchived.push(conversationEntity);
        }
      });

      this.conversationState.conversations_archived(conversationsArchived);
      this.conversationState.conversations_cleared(conversationsCleared);
      this.conversationState.conversations_unarchived(conversationsUnarchived);
    });
  }

  private initSubscriptions(): void {
    amplify.subscribe(WebAppEvents.CONVERSATION.DELETE, this.deleteConversationLocally);
    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, this.onConversationEvent);
    amplify.subscribe(WebAppEvents.CONVERSATION.MAP_CONNECTION, this.mapConnection);
    amplify.subscribe(WebAppEvents.CONVERSATION.MISSED_EVENTS, this.onMissedEvents);
    amplify.subscribe(WebAppEvents.CONVERSATION.PERSIST_STATE, this.saveConversationStateInDb);
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setNotificationHandlingState);
    amplify.subscribe(WebAppEvents.TEAM.MEMBER_LEAVE, this.teamMemberLeave);
    amplify.subscribe(WebAppEvents.USER.UNBLOCKED, this.onUnblockUser);
    amplify.subscribe(WebAppEvents.CONVERSATION.INJECT_LEGAL_HOLD_MESSAGE, this.injectLegalHoldMessage);

    this.eventService.addEventUpdatedListener(this.updateLocalMessageEntity);
    this.eventService.addEventDeletedListener(this.deleteLocalMessageEntity);

    window.addEventListener<any>(WebAppEvents.CONVERSATION.JOIN, this.onConversationJoin);
  }

  private readonly updateLocalMessageEntity = async ({
    obj: updatedEvent,
    oldObj: oldEvent,
  }: ConversationDBChange): Promise<void> => {
    const conversationEntity = this.conversationState.findConversation(updatedEvent.conversation);
    const replacedMessageEntity = await this.replaceMessageInConversation(
      conversationEntity,
      oldEvent.id,
      updatedEvent,
    );
    if (replacedMessageEntity) {
      const messageEntity = await this.updateMessageUserEntities(replacedMessageEntity);
      amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, oldEvent.id, messageEntity);
    }
  };

  private readonly deleteLocalMessageEntity = ({oldObj: deletedEvent}: ConversationDBChange): void => {
    const conversationEntity = this.conversationState.findConversation(deletedEvent.conversation);
    if (conversationEntity) {
      conversationEntity.removeMessageById(deletedEvent.id);
    }
  };

  /**
   * Remove obsolete conversations locally.
   */
  cleanupConversations(): void {
    this.conversationState.conversations().forEach(conversationEntity => {
      if (
        conversationEntity.isGroup() &&
        conversationEntity.is_cleared() &&
        conversationEntity.removed_from_conversation()
      ) {
        const {id, domain} = conversationEntity;
        this.conversation_service.deleteConversationFromDb(id, domain);
        this.deleteConversationFromRepository(id, domain);
      }
    });
  }

  //##############################################################################
  // Conversation service interactions
  //##############################################################################

  /**
   * Create a group conversation.
   * @note Do not include the requester among the users
   *
   * @param userEntities Users (excluding the creator) to be part of the conversation
   * @param groupName Name for the conversation
   * @param accessState State for conversation access
   * @param options Additional conversation creation options (like "receipt_mode")
   * @returns Resolves when the conversation was created
   */
  public async createGroupConversation(
    userEntities: User[],
    groupName?: string,
    accessState?: string,
    options: Partial<NewConversation> = {},
  ): Promise<Conversation | undefined> {
    const sameFederatedDomainUserIds = userEntities
      .filter(userEntity => userEntity.isOnSameFederatedDomain())
      .map(userEntity => userEntity.id);
    const otherFederatedDomainUserIds = userEntities
      .filter(userEntity => !userEntity.isOnSameFederatedDomain())
      .map(userEntity => ({domain: userEntity.domain, id: userEntity.id}));
    let payload: NewConversation & {conversation_role: string} = {
      conversation_role: DefaultRole.WIRE_MEMBER,
      name: groupName,
      qualified_users: otherFederatedDomainUserIds,
      receipt_mode: null,
      users: sameFederatedDomainUserIds,
      ...options,
    };

    if (this.teamState.team().id) {
      payload.team = {
        managed: false,
        teamid: this.teamState.team().id,
      };

      if (accessState) {
        let accessPayload;

        switch (accessState) {
          case ACCESS_STATE.TEAM.GUEST_ROOM:
            accessPayload = {
              access: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
              access_role: CONVERSATION_ACCESS_ROLE.NON_ACTIVATED,
            };
            break;
          case ACCESS_STATE.TEAM.TEAM_ONLY:
            accessPayload = {
              access: [CONVERSATION_ACCESS.INVITE],
              access_role: CONVERSATION_ACCESS_ROLE.TEAM,
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

    try {
      const response = await this.conversation_service.postConversations(payload);
      const {conversationEntity} = await this.onCreate({
        conversation: response.id,
        data: {
          last_event: '0.0',
          last_event_time: '1970-01-01T00:00:00.000Z',
          receipt_mode: null,
          ...response,
        },
        from: this.userState.self().id,
        qualified_conversation: response.qualified_id,
        time: new Date().toISOString(),
        type: CONVERSATION_EVENT.CREATE,
      });
      return conversationEntity as Conversation;
    } catch (error) {
      this.handleConversationCreateError(error, sameFederatedDomainUserIds);
      return undefined;
    }
  }

  /**
   * Create a guest room.
   */
  public createGuestRoom(): Promise<Conversation | undefined> {
    const groupName = t('guestRoomConversationName');
    return this.createGroupConversation([], groupName, ACCESS_STATE.TEAM.GUEST_ROOM);
  }

  /**
   * Get a conversation from the backend.
   */
  private async fetchConversationById(conversationId: string, domain: string | null): Promise<Conversation> {
    const fetching_conversations: Record<string, FetchPromise[]> = {};
    if (fetching_conversations.hasOwnProperty(conversationId)) {
      return new Promise((resolve, reject) => {
        fetching_conversations[conversationId].push({rejectFn: reject, resolveFn: resolve});
      });
    }

    fetching_conversations[conversationId] = [];
    try {
      const response = await this.conversation_service.getConversationById(conversationId, domain);
      const [conversationEntity] = this.mapConversations([response]);

      this.logger.info(`Fetched conversation '${conversationId}' from backend`);
      this.saveConversation(conversationEntity);

      fetching_conversations[conversationId].forEach(({resolveFn}) => resolveFn(conversationEntity));
      delete fetching_conversations[conversationId];

      return conversationEntity;
    } catch (originalError) {
      if (originalError.code === HTTP_STATUS.NOT_FOUND) {
        this.deleteConversationLocally(conversationId, false, domain);
      }
      const error = new ConversationError(
        ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
        originalError,
      );
      fetching_conversations[conversationId].forEach(({rejectFn}) => rejectFn(error));
      delete fetching_conversations[conversationId];

      throw error;
    }
  }

  public async getConversations(): Promise<Conversation[]> {
    const remoteConversationsPromise = this.conversation_service.getAllConversations().catch(error => {
      this.logger.error(`Failed to get all conversations from backend: ${error.message}`);
      return [];
    });

    const [localConversations, remoteConversations] = await Promise.all([
      this.conversation_service.loadConversationStatesFromDb<ConversationDatabaseData>(),
      remoteConversationsPromise,
    ]);
    let conversationsData: any[];
    if (!remoteConversations.length) {
      conversationsData = localConversations;
    } else {
      const data = ConversationMapper.mergeConversation(localConversations, remoteConversations);
      conversationsData = (await this.conversation_service.saveConversationsInDb(data)) as any[];
    }
    const conversationEntities = this.mapConversations(conversationsData);
    this.saveConversations(conversationEntities);
    return this.conversationState.conversations();
  }

  public async updateConversationStates(conversationsDataArray: ConversationRecord[]) {
    const handledConversationEntities: Conversation[] = [];
    const unknownConversations: ConversationRecord[] = [];

    conversationsDataArray.forEach(conversationData => {
      const localEntity = this.conversationState
        .conversations()
        .find(({id, domain}) => id === conversationData.id && domain == conversationData.domain);

      if (localEntity) {
        const entity = ConversationMapper.updateSelfStatus(localEntity, conversationData as any, true);
        handledConversationEntities.push(entity);
        return;
      }

      unknownConversations.push(conversationData);
    });

    let conversationEntities: Conversation[] = [];

    if (unknownConversations.length) {
      conversationEntities = conversationEntities.concat(this.mapConversations(unknownConversations as any[]));
      this.saveConversations(conversationEntities);
    }

    conversationEntities = conversationEntities.concat(handledConversationEntities);
    const handledConversationData = conversationEntities.map(conversationEntity => conversationEntity.serialize());
    this.conversation_service.saveConversationsInDb(handledConversationData);
    return conversationEntities;
  }

  /**
   * Get preceding messages starting with the given message.
   * @param conversationEntity Respective conversation
   * @returns Resolves with the messages
   */
  public async getPrecedingMessages(conversationEntity: Conversation): Promise<ContentMessage[]> {
    conversationEntity.is_pending(true);

    const firstMessageEntity = conversationEntity.getFirstMessage();
    const upperBound = firstMessageEntity
      ? new Date(firstMessageEntity.timestamp())
      : new Date(conversationEntity.getLatestTimestamp(this.serverTimeHandler.toServerTimestamp()) + 1);

    const events = (await this.eventService.loadPrecedingEvents(
      conversationEntity.id,
      new Date(0),
      upperBound,
      Config.getConfig().MESSAGES_FETCH_LIMIT,
    )) as EventRecord[];
    const mappedMessageEntities = await this.addPrecedingEventsToConversation(events, conversationEntity);
    conversationEntity.is_pending(false);
    return mappedMessageEntities;
  }

  private async addPrecedingEventsToConversation(
    events: EventRecord[],
    conversationEntity: Conversation,
  ): Promise<ContentMessage[]> {
    const hasAdditionalMessages = events.length === Config.getConfig().MESSAGES_FETCH_LIMIT;

    const mappedMessageEntities = await this.addEventsToConversation(events, conversationEntity);
    conversationEntity.hasAdditionalMessages(hasAdditionalMessages);
    if (!hasAdditionalMessages) {
      const firstMessage = conversationEntity.getFirstMessage() as MemberMessage;
      const checkCreationMessage = firstMessage?.isMember() && firstMessage.isCreation();
      if (checkCreationMessage) {
        const groupCreationMessageIn1to1 = conversationEntity.is1to1() && firstMessage.isGroupCreation();
        const one2oneConnectionMessageInGroup = conversationEntity.isGroup() && firstMessage.isConnection();
        const wrongMessageTypeForConversation = groupCreationMessageIn1to1 || one2oneConnectionMessageInGroup;

        if (wrongMessageTypeForConversation) {
          this.messageRepositoryProvider().deleteMessage(conversationEntity, firstMessage);
          conversationEntity.hasCreationMessage = false;
        } else {
          conversationEntity.hasCreationMessage = true;
        }
      }

      const addCreationMessage = !conversationEntity.hasCreationMessage;
      if (addCreationMessage) {
        this.addCreationMessage(conversationEntity, this.userState.self().isTemporaryGuest());
      }
    }
    return mappedMessageEntities;
  }

  private addCreationMessage(
    conversationEntity: Conversation,
    isTemporaryGuest: boolean,
    timestamp?: number,
    eventSource?: EventSource,
  ): void {
    conversationEntity.hasCreationMessage = true;

    if (conversationEntity.inTeam()) {
      const allTeamMembersParticipate = this.teamState.teamMembers().length
        ? this.teamState
            .teamMembers()
            .every(
              teamMember =>
                !!conversationEntity
                  .participating_user_ids()
                  .find(user => user.id === teamMember.id && user.domain == teamMember.domain),
            )
        : false;

      conversationEntity.withAllTeamMembers(allTeamMembersParticipate);
    }

    const creationEvent = conversationEntity.isGroup()
      ? EventBuilder.buildGroupCreation(conversationEntity, isTemporaryGuest, timestamp)
      : EventBuilder.build1to1Creation(conversationEntity);

    this.eventRepository.injectEvent(creationEvent, eventSource);
  }

  /**
   * Get specified message and load number preceding and subsequent messages defined by padding.
   *
   * @param conversationEntity Conversation entity
   * @param messageEntity Message entity
   * @param padding Number of messages to load around the targeted message
   * @returns Resolves with the messages
   */
  public async getMessagesWithOffset(
    conversationEntity: Conversation,
    messageEntity: Message,
    padding = 30,
  ): Promise<ContentMessage[]> {
    const messageDate = new Date(messageEntity.timestamp());
    const conversationId = conversationEntity.id;

    conversationEntity.is_pending(true);

    const precedingMessages = (await this.eventService.loadPrecedingEvents(
      conversationId,
      new Date(0),
      messageDate,
      Math.floor(padding / 2),
    )) as EventRecord[];
    const followingMessages = (await this.eventService.loadFollowingEvents(
      conversationEntity.id,
      messageDate,
      padding - precedingMessages.length,
    )) as EventRecord[];
    const messages = precedingMessages.concat(followingMessages);
    const mappedMessageEntities = await this.addEventsToConversation(messages, conversationEntity);
    conversationEntity.is_pending(false);
    return mappedMessageEntities;
  }

  /**
   * Get subsequent messages starting with the given message.
   * @returns Resolves with the messages
   */
  async getSubsequentMessages(conversationEntity: Conversation, messageEntity: ContentMessage) {
    const messageDate = new Date(messageEntity.timestamp());
    conversationEntity.is_pending(true);

    const events = (await this.eventService.loadFollowingEvents(
      conversationEntity.id,
      messageDate,
      Config.getConfig().MESSAGES_FETCH_LIMIT,
    )) as EventRecord[];
    const mappedMessageEntities = await this.addEventsToConversation(events, conversationEntity, false);
    conversationEntity.is_pending(false);
    return mappedMessageEntities;
  }

  /**
   * Get messages for given category. Category param acts as lower bound.
   */
  async getEventsForCategory(conversationEntity: Conversation, category = MessageCategory.NONE): Promise<Message[]> {
    const events = (await this.eventService.loadEventsWithCategory(conversationEntity.id, category)) as EventRecord[];
    const messageEntities = (await this.event_mapper.mapJsonEvents(events, conversationEntity)) as Message[];
    return this.updateMessagesUserEntities(messageEntities);
  }

  /**
   * Search for given text in conversation.
   */
  public async searchInConversation(
    conversationEntity: Conversation,
    query: string,
  ): Promise<{messageEntities?: Message[]; query?: string}> {
    if (!conversationEntity || !query.length) {
      return {};
    }

    const events = await this.conversation_service.searchInConversation(conversationEntity.id, query);
    const mappedMessages = await this.event_mapper.mapJsonEvents(events, conversationEntity);
    const messageEntities = await this.updateMessagesUserEntities(mappedMessages);
    return {messageEntities, query};
  }

  /**
   * Get conversation unread events.
   *
   * @param conversationEntity Conversation to start from
   */
  private async getUnreadEvents(conversationEntity: Conversation): Promise<void> {
    const first_message = conversationEntity.getFirstMessage();
    const lower_bound = new Date(conversationEntity.last_read_timestamp());
    const upper_bound = first_message
      ? new Date(first_message.timestamp())
      : new Date(conversationEntity.getLatestTimestamp(this.serverTimeHandler.toServerTimestamp()) + 1);

    if (lower_bound < upper_bound) {
      conversationEntity.is_pending(true);

      try {
        const events = (await this.eventService.loadPrecedingEvents(
          conversationEntity.id,
          lower_bound,
          upper_bound,
        )) as EventRecord[];
        if (events.length) {
          this.addEventsToConversation(events, conversationEntity);
        }
      } catch (error) {
        this.logger.info(`Could not load unread events for conversation: ${conversationEntity.id}`, error);
      }
      conversationEntity.is_pending(false);
    }
  }

  /**
   * Update conversation with a user you just unblocked
   */
  private readonly onUnblockUser = async (user_et: User): Promise<void> => {
    const conversationEntity = await this.get1To1Conversation(user_et);
    if (typeof conversationEntity !== 'boolean') {
      conversationEntity.status(ConversationStatus.CURRENT_MEMBER);
    }
  };

  /**
   * Update all conversations on app init.
   */
  public async updateConversationsOnAppInit() {
    this.logger.info('Updating group participants');
    await this.updateUnarchivedConversations();
    const updatePromises = this.conversationState.sorted_conversations().map(conversationEntity => {
      return this.updateParticipatingUserEntities(conversationEntity, true);
    });
    return Promise.all(updatePromises);
  }

  /**
   * Update users and events for archived conversations currently visible.
   */
  public updateArchivedConversations() {
    this.updateConversations(this.conversationState.conversations_archived());
  }

  /**
   * Update users and events for all unarchived conversations.
   */
  private updateUnarchivedConversations() {
    return this.updateConversations(this.conversationState.conversations_unarchived());
  }

  private async updateConversationFromBackend(conversationEntity: Conversation) {
    const conversationData = await this.conversation_service.getConversationById(
      conversationEntity.id,
      conversationEntity.domain,
    );
    const {name, message_timer, type} = conversationData;
    ConversationMapper.updateProperties(conversationEntity, {name, type});
    ConversationMapper.updateSelfStatus(conversationEntity, {message_timer});
  }

  /**
   * Get users and events for conversations.
   *
   * @note To reduce the number of backend calls we merge the user IDs of all conversations first.
   * @param conversationEntities Array of conversation entities to be updated
   */
  public async updateConversations(conversationEntities: Conversation[]): Promise<void> {
    const mapOfUserIds = conversationEntities.map(conversationEntity => conversationEntity.participating_user_ids());
    const userIds = flatten(mapOfUserIds);
    await this.userRepository.getUsersById(userIds);
    conversationEntities.forEach(conversationEntity => this.fetchUsersAndEvents(conversationEntity));
  }

  //##############################################################################
  // Repository interactions
  //##############################################################################

  /**
   * Deletes a conversation from the repository.
   */
  private deleteConversationFromRepository(conversationId: string, domain: string | null) {
    this.conversationState.conversations.remove(conversation => {
      if (domain) {
        return conversation.id === conversationId && conversation.domain == domain;
      }
      return conversation.id === conversationId;
    });
  }

  public deleteConversation(conversationEntity: Conversation) {
    this.conversation_service
      .deleteConversation(this.teamState.team().id, conversationEntity.id)
      .then(() => {
        this.deleteConversationLocally(conversationEntity.id, true, conversationEntity.domain);
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

  private readonly deleteConversationLocally = (
    conversationId: string,
    skipNotification: boolean,
    domain: string | null,
  ) => {
    const conversationEntity = this.conversationState.findConversation(conversationId, domain);
    if (!conversationEntity) {
      return;
    }
    if (this.conversationState.isActiveConversation(conversationEntity)) {
      const nextConversation = this.getNextConversation(conversationEntity);
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversation, {});
    }
    if (!skipNotification) {
      const deletionMessage = new DeleteConversationMessage(conversationEntity);
      amplify.publish(WebAppEvents.NOTIFICATION.NOTIFY, deletionMessage);
    }
    if (this.conversationLabelRepository.getConversationCustomLabel(conversationEntity, true)) {
      this.conversationLabelRepository.removeConversationFromAllLabels(conversationEntity, true);
      this.conversationLabelRepository.saveLabels();
    }
    this.deleteConversationFromRepository(conversationId, domain);
    this.conversation_service.deleteConversationFromDb(conversationId, domain);
  };

  public async getAllUsersInConversation(conversationId: string, domain: string | null): Promise<User[]> {
    const conversationEntity = await this.getConversationById(conversationId, domain);
    const users = [this.userState.self()].concat(conversationEntity.participating_user_ets());
    return users;
  }

  /**
   * Check for conversation locally and fetch it from the server otherwise.
   * TODO(Federation): Remove "optional" from "domain"
   */
  async getConversationById(conversation_id: string, domain?: string | null): Promise<Conversation> {
    if (typeof conversation_id !== 'string') {
      throw new ConversationError(
        ConversationError.TYPE.NO_CONVERSATION_ID,
        ConversationError.MESSAGE.NO_CONVERSATION_ID,
      );
    }
    const conversationEntity = this.conversationState.findConversation(conversation_id, domain);
    if (conversationEntity) {
      return conversationEntity;
    }
    try {
      return await this.fetchConversationById(conversation_id, domain);
    } catch (error) {
      const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (isConversationNotFound) {
        this.logger.warn(`Failed to get conversation '${conversation_id}': ${error.message}`, error);
      }

      throw error;
    }
  }

  /**
   * Get group conversations by name.
   *
   * @param query Query to be searched in group conversation names
   * @param isHandle Query string is handle
   * @returns Matching group conversations
   */
  getGroupsByName(query: string, isHandle: boolean) {
    return this.conversationState
      .sorted_conversations()
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
   * @param increment Increment by one for unique timestamp
   * @returns Timestamp value
   */
  private getLatestEventTimestamp(increment = false) {
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
   * @param conversationEntity Conversation to start from
   * @returns Next conversation
   */
  getNextConversation(conversationEntity: Conversation) {
    return getNextItem(this.conversationState.conversations_unarchived(), conversationEntity);
  }

  /**
   * Get unarchived conversation with the most recent event.
   * @param allConversations Search all conversations
   * @returns Most recent conversation
   */
  getMostRecentConversation(allConversations = false) {
    const [conversationEntity] = allConversations
      ? this.conversationState.sorted_conversations()
      : this.conversationState.conversations_unarchived();
    return conversationEntity;
  }

  /**
   * Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
   * @returns Resolve with the most active conversations
   */
  getMostActiveConversations() {
    return this.conversation_service.getActiveConversationsFromDb().then(conversation_ids => {
      return conversation_ids
        .map(conversation_id => this.conversationState.findConversation(conversation_id))
        .filter(conversationEntity => conversationEntity);
    });
  }

  /**
   * Get conversation with a user.
   * @param userEntity User entity for whom to get the conversation
   * @returns Resolves with the conversation with requested user
   */
  async get1To1Conversation(userEntity: User): Promise<Conversation | false> {
    const inCurrentTeam = userEntity.inTeam() && userEntity.teamId === this.userState.self().teamId;

    if (inCurrentTeam) {
      const matchingConversationEntity = this.conversationState.conversations().find(conversationEntity => {
        if (!conversationEntity.is1to1()) {
          // Disregard conversations that are not 1:1
          return false;
        }

        const inTeam = ConversationFilter.isInTeam(conversationEntity, userEntity);
        if (!inTeam) {
          // Disregard conversations that are not in the team
          return false;
        }

        const isActiveConversation = !conversationEntity.removed_from_conversation();
        if (!isActiveConversation) {
          // Disregard conversations that self is no longer part of
          return false;
        }

        return ConversationFilter.is1To1WithUser(conversationEntity, userEntity);
      });

      if (matchingConversationEntity) {
        return matchingConversationEntity;
      }
      return this.createGroupConversation([userEntity]);
    }

    if (!userEntity.isOnSameFederatedDomain()) {
      return this.createGroupConversation([userEntity], `${userEntity.name()} & ${this.userState.self().name()}`);
    }

    const conversationId = userEntity.connection().conversationId;
    try {
      const conversationEntity = await this.getConversationById(conversationId);
      conversationEntity.connection(userEntity.connection());
      this.updateParticipatingUserEntities(conversationEntity);
      return conversationEntity;
    } catch (error) {
      const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (!isConversationNotFound) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Check whether message has been read.
   *
   * @param conversation_id Conversation ID
   * @param message_id Message ID
   * @returns Resolves with `true` if message is marked as read
   */
  async isMessageRead(conversation_id: string, message_id: string): Promise<boolean> {
    if (!conversation_id || !message_id) {
      return false;
    }

    try {
      const conversationEntity = await this.getConversationById(conversation_id);
      const messageEntity = await this.messageRepositoryProvider().getMessageInConversationById(
        conversationEntity,
        message_id,
      );
      return conversationEntity.last_read_timestamp() >= messageEntity.timestamp();
    } catch (error) {
      const messageNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
      if (messageNotFound) {
        return true;
      }

      throw error;
    }
  }

  initializeConversations(): Promise<unknown> | undefined {
    this.initStateUpdates();
    this.init_total = this.receiving_queue.getLength();

    if (this.init_total > 5) {
      this.logger.log(`Handling '${this.init_total}' additional messages on app start`);
      return new Promise((resolve, reject) => (this.init_promise = {rejectFn: reject, resolveFn: resolve}));
    }
    return undefined;
  }

  /**
   * Starts the join public conversation flow.
   * Opens conversation directly when it is already known.
   *
   * @param event Custom event containing join key/code
   */
  private readonly onConversationJoin = async (event: {detail: {code: string; key: string}}) => {
    const {key, code} = event.detail;

    const showNoConversationModal = () => {
      const titleText = t('modalConversationJoinNotFoundHeadline');
      const messageText = t('modalConversationJoinNotFoundMessage');
      this.showModal(messageText, titleText);
    };
    const showTooManyMembersModal = () => {
      const titleText = t('modalConversationJoinFullHeadline');
      const messageText = t('modalConversationJoinFullMessage');
      this.showModal(messageText, titleText);
    };

    try {
      const {id: conversationId, name: conversationName} = await this.conversation_service.getConversationJoin(
        key,
        code,
      );
      const knownConversation = this.conversationState.findConversation(conversationId);
      if (knownConversation && knownConversation.status() === ConversationStatus.CURRENT_MEMBER) {
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, knownConversation, {});
        return;
      }
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        primaryAction: {
          action: async () => {
            try {
              const response = await this.conversation_service.postConversationJoin(key, code);
              const conversationEntity = await this.getConversationById(conversationId);
              if (response) {
                await this.onMemberJoin(conversationEntity, response);
              }
              amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {});
            } catch (error) {
              switch (error.label) {
                case BackendErrorLabel.NO_CONVERSATION:
                case BackendErrorLabel.NO_CONVERSATION_CODE: {
                  showNoConversationModal();
                  break;
                }
                case BackendErrorLabel.TOO_MANY_MEMBERS: {
                  showTooManyMembersModal();
                  break;
                }

                default: {
                  throw error;
                }
              }
            }
          },
          text: t('modalConversationJoinConfirm'),
        },
        text: {
          message: t('modalConversationJoinMessage', {conversationName}),
          title: t('modalConversationJoinHeadline'),
        },
      });
    } catch (error) {
      switch (error.label) {
        case BackendErrorLabel.NO_CONVERSATION:
        case BackendErrorLabel.NO_CONVERSATION_CODE: {
          showNoConversationModal();
          break;
        }
        default: {
          throw error;
        }
      }
    }
  };

  /**
   * Maps user connection to the corresponding conversation.
   *
   * @note If there is no conversation it will request it from the backend
   * @returns Resolves when connection was mapped return value
   */
  private readonly mapConnection = (connectionEntity: ConnectionEntity): Promise<Conversation | undefined> => {
    return Promise.resolve(this.conversationState.findConversation(connectionEntity.conversationId))
      .then(conversationEntity => {
        if (!conversationEntity) {
          if (connectionEntity.isConnected() || connectionEntity.isOutgoingRequest()) {
            // TODO(Federation): Federated 1:1 connections are not yet implemented by the backend.
            return this.fetchConversationById(connectionEntity.conversationId, null);
          }
        }
        return conversationEntity;
      })
      .then(conversationEntity => {
        if (!conversationEntity) {
          return undefined;
        }
        conversationEntity.connection(connectionEntity);

        if (connectionEntity.isConnected()) {
          conversationEntity.type(CONVERSATION_TYPE.ONE_TO_ONE);
        }

        return this.updateParticipatingUserEntities(conversationEntity);
      })
      .then(updatedConversationEntity => {
        this.conversationState.conversations.notifySubscribers();
        return updatedConversationEntity;
      })
      .catch(error => {
        const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
        return undefined;
      });
  };

  /**
   * @returns resolves when deleted conversations are locally deleted, too.
   */
  checkForDeletedConversations() {
    return Promise.all(
      this.conversationState.conversations().map(async conversation => {
        try {
          await this.conversation_service.getConversationById(conversation.id, conversation.domain);
        } catch ({code}) {
          if (code === HTTP_STATUS.NOT_FOUND) {
            this.deleteConversationLocally(conversation.id, true, conversation.domain);
          }
        }
      }),
    );
  }

  /**
   * Maps user connections to the corresponding conversations.
   * @param connectionEntities Connections entities
   */
  mapConnections(connectionEntities: ConnectionEntity[]): Promise<Conversation>[] {
    this.logger.info(`Mapping '${connectionEntities.length}' user connection(s) to conversations`, connectionEntities);
    return connectionEntities.map(connectionEntity => this.mapConnection(connectionEntity));
  }

  /**
   * Map conversation payload.
   *
   * @param payload Payload to map
   * @param initialTimestamp Initial server and event timestamp
   * @returns Mapped conversation/s
   */
  mapConversations(payload: BackendConversation[], initialTimestamp = this.getLatestEventTimestamp()): Conversation[] {
    const entities = ConversationMapper.mapConversations(payload as ConversationDatabaseData[], initialTimestamp);
    entities.forEach(conversationEntity => {
      this._mapGuestStatusSelf(conversationEntity);
      conversationEntity.selfUser(this.userState.self());
      conversationEntity.setStateChangePersistence(true);
    });

    return entities;
  }

  private mapGuestStatusSelf() {
    this.conversationState
      .filtered_conversations()
      .forEach(conversationEntity => this._mapGuestStatusSelf(conversationEntity));

    if (this.teamState.isTeam()) {
      this.userState.self().inTeam(true);
      this.userState.self().isTeamMember(true);
    }
  }

  private _mapGuestStatusSelf(conversationEntity: Conversation) {
    const conversationTeamId = conversationEntity.team_id;
    const selfTeamId = this.teamState.team() && this.teamState.team().id;
    const isConversationGuest = !!(conversationTeamId && (!selfTeamId || selfTeamId !== conversationTeamId));
    conversationEntity.isGuest(isConversationGuest);
  }

  /**
   * Save a conversation in the repository.
   * @param conversationEntity Conversation to be saved in the repository
   * @returns Resolves when conversation was saved
   */
  private saveConversation(conversationEntity: Conversation) {
    const localEntity = this.conversationState.findConversation(conversationEntity.id);
    if (!localEntity) {
      this.conversationState.conversations.push(conversationEntity);
      return this.saveConversationStateInDb(conversationEntity);
    }
    return Promise.resolve(localEntity);
  }

  /**
   * Persists a conversation state in the database.
   * @param conversationEntity Conversation of which the state should be persisted
   * @returns Resolves when conversation was saved
   */
  private readonly saveConversationStateInDb = (conversationEntity: Conversation) => {
    return this.conversation_service.saveConversationStateInDb(conversationEntity);
  };

  /**
   * Save conversations in the repository.
   * @param conversationEntities Conversations to be saved in the repository
   */
  private saveConversations(conversationEntities: Conversation[]) {
    this.conversationState.conversations.push(...conversationEntities);
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not unarchive conversations when handling the notification stream
   * @param handlingState State of the notifications stream handling
   */
  private readonly setNotificationHandlingState = (handlingState: NOTIFICATION_HANDLING_STATE) => {
    const isFetchingFromStream = handlingState !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.isBlockingNotificationHandling !== isFetchingFromStream) {
      if (!isFetchingFromStream) {
        this.checkChangedConversations();
      }
      this.isBlockingNotificationHandling = isFetchingFromStream;
      this.logger.info(`Block handling of conversation events: ${this.isBlockingNotificationHandling}`);
    }
  };

  /**
   * Update participating users in a conversation.
   *
   * @param conversationEntity Conversation to be updated
   * @param offline Should we only look for cached contacts
   * @param updateGuests Update conversation guests
   * @returns Resolves when users have been updated
   */
  async updateParticipatingUserEntities(
    conversationEntity: Conversation,
    offline = false,
    updateGuests = false,
  ): Promise<Conversation> {
    const userEntities = await this.userRepository.getUsersById(conversationEntity.participating_user_ids(), offline);
    userEntities.sort(sortUsersByPriority);
    conversationEntity.participating_user_ets(userEntities);

    if (updateGuests) {
      conversationEntity.updateGuests();
    }

    return conversationEntity;
  }

  //##############################################################################
  // Send events
  //##############################################################################

  /**
   * Add users to an existing conversation.
   *
   * @param conversationEntity Conversation to add users to
   * @param userEntities Users to be added to the conversation
   * @returns Resolves when members were added
   */
  async addMembers(conversationEntity: Conversation, userEntities: User[]) {
    const userIds = userEntities.map(userEntity => userEntity.id);

    try {
      const response = await this.conversation_service.postMembers(conversationEntity.id, userIds);
      if (response) {
        this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
      }
    } catch (error) {
      return this.handleAddToConversationError(error, conversationEntity, userIds);
    }
  }

  addMissingMember(conversationEntity: Conversation, users: QualifiedIdOptional[], timestamp: number) {
    const [sender] = users;
    const event = EventBuilder.buildMemberJoin(conversationEntity, sender, users, timestamp);
    return this.eventRepository.injectEvent(event, EventRepository.SOURCE.INJECTED);
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param conversationEntity Conversation to add service to
   * @param providerId ID of service provider
   * @param serviceId ID of service
   * @returns Resolves when service was added
   */
  addService(conversationEntity: Conversation, providerId: string, serviceId: string) {
    return this.conversation_service
      .postBots(conversationEntity.id, providerId, serviceId)
      .then((response: any) => {
        const event = response?.event;
        if (event) {
          const logMessage = `Successfully added service to conversation '${conversationEntity.display_name()}'`;
          this.logger.debug(logMessage, response);
          return this.eventRepository.injectEvent(response.event, EventRepository.SOURCE.BACKEND_RESPONSE);
        }

        return event;
      })
      .catch(error => this.handleAddToConversationError(error, conversationEntity, [serviceId]));
  }

  private handleAddToConversationError(error: BackendClientError, conversationEntity: Conversation, userIds: string[]) {
    switch (error.label) {
      case BackendErrorLabel.NOT_CONNECTED: {
        this.handleUsersNotConnected(userIds);
        break;
      }

      case BackendClientError.LABEL.BAD_GATEWAY:
      case BackendClientError.LABEL.SERVER_ERROR:
      case BackendClientError.LABEL.SERVICE_DISABLED:
      case BackendClientError.LABEL.TOO_MANY_BOTS: {
        const messageText = t('modalServiceUnavailableMessage');
        const titleText = t('modalServiceUnavailableHeadline');

        this.showModal(messageText, titleText);
        break;
      }

      case BackendErrorLabel.TOO_MANY_MEMBERS: {
        this.handleTooManyMembersError(conversationEntity.getNumberOfParticipants());
        break;
      }
      case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT: {
        this.showLegalHoldConsentError();
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
   * @param conversationEntity Conversation to clear
   * @param leaveConversation Should we leave the conversation before clearing the content?
   */
  public clearConversation(conversationEntity: Conversation, leaveConversation = false) {
    const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);
    const nextConversationEntity = this.getNextConversation(conversationEntity);

    if (leaveConversation) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
      this.leaveCall(conversationEntity.id);
    }

    this.messageRepositoryProvider().updateClearedTimestamp(conversationEntity);
    this._clearConversation(conversationEntity);

    if (leaveConversation) {
      this.removeMember(conversationEntity, {domain: this.userState.self().domain, id: this.userState.self().id});
    }

    if (isActiveConversation) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity, {});
    }
  }

  async leaveGuestRoom(): Promise<void> {
    if (this.userState.self().isTemporaryGuest()) {
      const conversationEntity = this.getMostRecentConversation(true);
      await this.conversation_service.deleteMembers(conversationEntity.id, this.userState.self().id);
    }
  }

  /**
   * Remove member from conversation.
   *
   * @param conversationEntity Conversation to remove member from
   * @param user ID of member to be removed from the conversation
   * @returns Resolves when member was removed from the conversation
   */
  public async removeMember(conversationEntity: Conversation, user: QualifiedId) {
    const response = await this.conversation_service.deleteMembers(conversationEntity.id, user.id);
    const roles = conversationEntity.roles();
    delete roles[user.id];
    conversationEntity.roles(roles);
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const event = response || EventBuilder.buildMemberLeave(conversationEntity, user, true, currentTimestamp);
    this.eventRepository.injectEvent(event, EventRepository.SOURCE.BACKEND_RESPONSE);
    return event;
  }

  /**
   * Remove service from conversation.
   *
   * @param conversationEntity Conversation to remove service from
   * @param user ID of service user to be removed from the conversation
   * @returns Resolves when service was removed from the conversation
   */
  public removeService(conversationEntity: Conversation, user: QualifiedId) {
    return this.conversation_service.deleteBots(conversationEntity.id, user.id).then((response: any) => {
      // TODO: Can this even have a response? in the API Client it look like it always returns `void`
      const hasResponse = response?.event;
      const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
      const event = hasResponse
        ? response.event
        : EventBuilder.buildMemberLeave(conversationEntity, user, true, currentTimestamp);

      this.eventRepository.injectEvent(event, EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Rename conversation.
   *
   * @param conversationEntity Conversation to rename
   * @param name New conversation name
   * @returns Resolves when conversation was renamed
   */
  public async renameConversation(
    conversationEntity: Conversation,
    name: string,
  ): Promise<ConversationRenameEvent | undefined> {
    const response = await this.conversation_service.updateConversationName(conversationEntity.id, name);
    if (response) {
      this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
      return response;
    }
    return undefined;
  }

  /**
   * Set the global message timer
   */
  async updateConversationMessageTimer(
    conversationEntity: Conversation,
    messageTimer: number,
  ): Promise<ConversationMessageTimerUpdateEvent> {
    messageTimer = ConversationEphemeralHandler.validateTimer(messageTimer);

    const response = await this.conversation_service.updateConversationMessageTimer(
      conversationEntity.id,
      messageTimer,
    );
    if (response) {
      this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
    }
    return response;
  }

  public async updateConversationReceiptMode(
    conversationEntity: Conversation,
    receiptMode: ConversationReceiptModeUpdateData,
  ) {
    const response = await this.conversation_service.updateConversationReceiptMode(conversationEntity.id, receiptMode);
    if (response) {
      this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
    }
    return response;
  }

  /**
   * Team member was removed.
   * @param teamId ID of team that member was removed from
   * @param userId ID of leaving user
   * @param isoDate Date of member removal
   */
  readonly teamMemberLeave = async (
    teamId: string,
    userId: string,
    domain: string | null,
    isoDate = this.serverTimeHandler.toServerTimestamp(),
  ) => {
    const userEntity = await this.userRepository.getUserById(userId, domain);
    this.conversationState
      .conversations()
      .filter(conversationEntity => {
        const conversationInTeam = conversationEntity.team_id === teamId;
        const userIsParticipant = UserFilter.isParticipant(conversationEntity, userId, domain);
        return conversationInTeam && userIsParticipant && !conversationEntity.removed_from_conversation();
      })
      .forEach(conversationEntity => {
        const leaveEvent = EventBuilder.buildTeamMemberLeave(conversationEntity, userEntity, isoDate);
        this.eventRepository.injectEvent(leaveEvent);
      });
    userEntity.isDeleted = true;
  };

  /**
   * Set the notification state of a conversation.
   *
   * @param conversationEntity Conversation to change notification state off
   * @param notificationState New notification state
   * @returns Resolves when the notification stated was change
   */
  public async setNotificationState(conversationEntity: Conversation, notificationState: number) {
    if (!conversationEntity || notificationState === undefined) {
      return Promise.reject(
        new ConversationError(BaseError.TYPE.MISSING_PARAMETER as BASE_ERROR_TYPE, BaseError.MESSAGE.MISSING_PARAMETER),
      );
    }

    const validNotificationStates = Object.values(NOTIFICATION_STATE);
    if (!validNotificationStates.includes(notificationState)) {
      return Promise.reject(
        new ConversationError(BaseError.TYPE.INVALID_PARAMETER as BASE_ERROR_TYPE, BaseError.MESSAGE.INVALID_PARAMETER),
      );
    }

    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const payload = {
      otr_muted_ref: new Date(conversationEntity.getLastKnownTimestamp(currentTimestamp)).toISOString(),
      otr_muted_status: notificationState,
    };

    try {
      await this.conversation_service.updateMemberProperties(conversationEntity.id, payload);
      const response = {data: payload, from: this.userState.self().id};
      this.onMemberUpdate(conversationEntity, response);

      const {otr_muted_ref: mutedRef, otr_muted_status: mutedStatus} = payload;
      const logMessage = `Changed notification state of conversation to '${mutedStatus}' on '${mutedRef}'`;
      this.logger.info(logMessage);
      return response;
    } catch (error) {
      const log = `Failed to change notification state of conversation '${conversationEntity.id}': ${error.message}`;
      const rejectError = new Error(log);
      this.logger.warn(rejectError.message, error);
      throw rejectError;
    }
  }

  /**
   * Archive a conversation.
   *
   * @param conversationEntity Conversation to rename
   * @returns Resolves when the conversation was archived
   */
  public async archiveConversation(conversationEntity: Conversation) {
    await this.toggleArchiveConversation(conversationEntity, true);
    this.logger.info(`Conversation '${conversationEntity.id}' archived`);
  }

  /**
   * Un-archive a conversation.
   *
   * @param conversationEntity Conversation to unarchive
   * @param forceChange Force state change without new message
   * @param trigger Trigger for unarchive
   * @returns Resolves when the conversation was unarchived
   */
  public async unarchiveConversation(conversationEntity: Conversation, forceChange = false, trigger = 'unknown') {
    await this.toggleArchiveConversation(conversationEntity, false, forceChange);
    this.logger.info(`Conversation '${conversationEntity.id}' unarchived by trigger '${trigger}'`);
  }

  private async toggleArchiveConversation(
    conversationEntity: Conversation,
    newState: boolean,
    forceChange: boolean = false,
  ) {
    if (!conversationEntity) {
      const error = new ConversationError(
        ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
      );
      throw error;
    }

    const stateChange = conversationEntity.is_archived() !== newState;

    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const archiveTimestamp = conversationEntity.getLastKnownTimestamp(currentTimestamp);
    const sameTimestamp = conversationEntity.archivedTimestamp() === archiveTimestamp;
    const skipChange = sameTimestamp && !forceChange;

    if (!stateChange && skipChange) {
      throw new ConversationError(ConversationError.TYPE.NO_CHANGES, ConversationError.MESSAGE.NO_CHANGES);
    }

    const payload = {
      otr_archived: newState,
      otr_archived_ref: new Date(archiveTimestamp).toISOString(),
    };

    const conversationId = conversationEntity.id;

    const updatePromise = conversationEntity.removed_from_conversation()
      ? Promise.resolve()
      : this.conversation_service.updateMemberProperties(conversationId, payload).catch(error => {
          const logMessage = `Failed to change archived state of '${conversationId}' to '${newState}': ${error.code}`;
          this.logger.error(logMessage);

          const isNotFound = error.code === HTTP_STATUS.NOT_FOUND;
          if (!isNotFound) {
            throw error;
          }
        });

    await updatePromise;
    const response = {
      data: payload,
      from: this.userState.self().id,
    };
    this.onMemberUpdate(conversationEntity, response);
  }

  private checkChangedConversations() {
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
   * @param conversationEntity Conversation entity to delete
   * @param timestamp Optional timestamps for which messages to remove
   */
  private _clearConversation(conversationEntity: Conversation, timestamp?: number) {
    this.deleteMessages(conversationEntity, timestamp);

    if (conversationEntity.removed_from_conversation()) {
      this.conversation_service.deleteConversationFromDb(conversationEntity.id, conversationEntity.domain);
      this.deleteConversationFromRepository(conversationEntity.id, conversationEntity.domain);
    }
  }

  private handleConversationCreateError(error: BackendClientError, userIds: string[]): void {
    switch (error.label) {
      case BackendClientError.LABEL.CLIENT_ERROR:
        this.handleTooManyMembersError();
        break;
      case BackendClientError.LABEL.NOT_CONNECTED:
        this.handleUsersNotConnected(userIds);
        break;
      case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT:
        this.showLegalHoldConsentError();
        break;
      default:
        throw error;
    }
  }

  private handleTooManyMembersError(participants = ConversationRepository.CONFIG.GROUP.MAX_SIZE) {
    const openSpots = ConversationRepository.CONFIG.GROUP.MAX_SIZE - participants;
    const substitutions = {
      number1: ConversationRepository.CONFIG.GROUP.MAX_SIZE.toString(10),
      number2: Math.max(0, openSpots).toString(10),
    };

    const messageText = t('modalConversationTooManyMembersMessage', substitutions);
    const titleText = t('modalConversationTooManyMembersHeadline');
    this.showModal(messageText, titleText);
  }

  private async handleUsersNotConnected(userIds: string[] = []): Promise<void> {
    const titleText = t('modalConversationNotConnectedHeadline');

    if (userIds.length > 1) {
      this.showModal(t('modalConversationNotConnectedMessageMany'), titleText);
    } else {
      // TODO(Federation): Update code once connections are implemented on the backend
      const userEntity = await this.userRepository.getUserById(userIds[0], null);
      this.showModal(t('modalConversationNotConnectedMessageOne', userEntity.name()), titleText);
    }
  }

  private showModal(messageText: string, titleText: string) {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: messageText,
        title: titleText,
      },
    });
  }

  private showLegalHoldConsentError() {
    const replaceLinkLegalHold = replaceLink(
      Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK,
      '',
      'read-more-legal-hold',
    );

    const messageText = t('modalLegalHoldConversationMissingConsentMessage', {}, replaceLinkLegalHold);
    const titleText = t('modalUserCannotBeAddedHeadline');

    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        htmlMessage: messageText,
        title: titleText,
      },
    });
  }

  //##############################################################################
  // Send Generic Messages
  //##############################################################################

  readonly injectLegalHoldMessage = async ({
    conversationEntity,
    conversationId,
    userId,
    timestamp,
    legalHoldStatus,
    beforeTimestamp = false,
  }: {
    beforeTimestamp?: boolean;
    conversationEntity?: Conversation;
    conversationId: QualifiedIdOptional;
    legalHoldStatus: LegalHoldStatus;
    timestamp: string | number;
    userId: string;
  }) => {
    if (typeof legalHoldStatus === 'undefined') {
      return;
    }
    if (!timestamp) {
      // TODO(federation) find with qualified id
      const conversation = conversationEntity || this.conversationState.findConversation(conversationId.id);
      const servertime = this.serverTimeHandler.toServerTimestamp();
      timestamp = conversation.getLatestTimestamp(servertime);
    }
    const legalHoldUpdateMessage = EventBuilder.buildLegalHoldMessage(
      conversationId || conversationEntity,
      userId,
      timestamp,
      legalHoldStatus,
      beforeTimestamp,
    );
    await this.eventRepository.injectEvent(legalHoldUpdateMessage);
  };

  async injectFileTypeRestrictedMessage(
    conversation: Conversation,
    user: User,
    isIncoming: boolean,
    fileExt: string,
    id = createRandomUuid(),
  ) {
    const fileRestrictionMessage = EventBuilder.buildFileTypeRestricted(conversation, user, isIncoming, fileExt, id);
    await this.eventRepository.injectEvent(fileRestrictionMessage);
  }

  //##############################################################################
  // Event callbacks
  //##############################################################################

  /**
   * Listener for incoming events.
   *
   * @param eventJson JSON data for event
   * @param eventSource Source of event
   * @returns Resolves when event was handled
   */
  private readonly onConversationEvent = (eventJson: IncomingEvent, eventSource = EventRepository.SOURCE.STREAM) => {
    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    const logMessage = `Conversation Event: '${eventJson.type}' (Source: ${eventSource})`;
    this.logger.info(logMessage, logObject);

    return this.pushToReceivingQueue(eventJson, eventSource);
  };

  private handleConversationEvent(eventJson: IncomingEvent, eventSource = EventRepository.SOURCE.STREAM) {
    if (!eventJson) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const {data: eventData, type} = eventJson;
    const conversationId: QualifiedId = eventData?.qualified_conversation ||
      eventJson.qualified_conversation || {domain: null, id: eventJson.conversation};
    this.logger.info(`Handling event '${type}' in conversation '${conversationId}' (Source: ${eventSource})`);

    const selfConversation = this.conversationState.self_conversation();
    const inSelfConversation = selfConversation && matchQualifiedIds(conversationId, selfConversation);
    if (inSelfConversation) {
      const typesInSelfConversation = [CONVERSATION_EVENT.MEMBER_UPDATE, ClientEvent.CONVERSATION.MESSAGE_HIDDEN];

      const isExpectedType = typesInSelfConversation.includes(type);
      if (!isExpectedType) {
        return Promise.reject(
          new ConversationError(
            ConversationError.TYPE.WRONG_CONVERSATION,
            ConversationError.MESSAGE.WRONG_CONVERSATION,
          ),
        );
      }
    }

    const isConversationCreate = type === CONVERSATION_EVENT.CREATE;
    const onEventPromise = isConversationCreate
      ? Promise.resolve(null)
      : this.getConversationById(conversationId.id, conversationId.domain);
    let previouslyArchived = false;

    return onEventPromise
      .then((conversationEntity: Conversation) => {
        if (conversationEntity) {
          // Check if conversation was archived
          previouslyArchived = conversationEntity.is_archived();

          const isBackendTimestamp = eventSource !== EventRepository.SOURCE.INJECTED;
          conversationEntity.updateTimestampServer(eventJson.server_time || eventJson.time, isBackendTimestamp);
        }

        return conversationEntity;
      })
      .then(conversationEntity => this.checkLegalHoldStatus(conversationEntity, eventJson))
      .then(conversationEntity => this.checkConversationParticipants(conversationEntity, eventJson, eventSource))
      .then(conversationEntity => this.triggerFeatureEventHandlers(conversationEntity, eventJson))
      .then(
        conversationEntity => this.reactToConversationEvent(conversationEntity, eventJson, eventSource) as EntityObject,
      )
      .then((entityObject = {} as EntityObject) =>
        this.handleConversationNotification(entityObject as EntityObject, eventSource, previouslyArchived),
      )
      .catch((error: BaseError) => {
        const ignoredErrorTypes: string[] = [
          ConversationError.TYPE.MESSAGE_NOT_FOUND,
          ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ];

        const isRemovedFromConversation =
          (error as BackendClientError).label === BackendClientError.LABEL.ACCESS_DENIED;
        if (isRemovedFromConversation) {
          const messageText = t('conversationNotFoundMessage');
          const titleText = t('conversationNotFoundTitle', Config.getConfig().BRAND_NAME);

          this.showModal(messageText, titleText);
          return;
        }

        if (!ignoredErrorTypes.includes(error.type)) {
          throw error;
        }
      });
  }

  /**
   * Check that sender of received event is a known conversation participant.
   *
   * @param conversationEntity Conversation targeted by the event
   * @param eventJson JSON data of the event
   * @param eventSource Source of event
   * @returns Resolves when the participant list has been checked
   */
  private checkConversationParticipants(
    conversationEntity: Conversation,
    eventJson: IncomingEvent,
    eventSource: EventSource,
  ) {
    // We ignore injected events
    const isInjectedEvent = eventSource === EventRepository.SOURCE.INJECTED;
    if (isInjectedEvent || !conversationEntity) {
      return conversationEntity;
    }

    const {from: senderId, type, time} = eventJson;

    if (senderId) {
      const allParticipants = conversationEntity
        .participating_user_ids()
        .concat({domain: this.userState.self().domain, id: this.userState.self().id});
      const isFromUnknownUser = allParticipants.every(participant => participant.id !== senderId);

      if (isFromUnknownUser) {
        const membersUpdateMessages = [
          CONVERSATION_EVENT.MEMBER_LEAVE,
          CONVERSATION_EVENT.MEMBER_JOIN,
          ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE,
        ];
        const isMembersUpdateEvent = membersUpdateMessages.includes(eventJson.type);
        if (isMembersUpdateEvent) {
          const isFromUpdatedMember = eventJson.data.user_ids?.includes(senderId);
          if (isFromUpdatedMember) {
            // we ignore leave/join events that are sent by the user actually leaving or joining
            return conversationEntity;
          }
        }

        const message = `Received '${type}' event from user '${senderId}' unknown in '${conversationEntity.id}'`;
        this.logger.warn(message, eventJson);

        const qualifiedSender: QualifiedIdOptional = {domain: null, id: senderId};

        const timestamp = new Date(time).getTime() - 1;
        return this.addMissingMember(conversationEntity, [qualifiedSender], timestamp).then(() => conversationEntity);
      }
    }

    return conversationEntity;
  }

  private async checkLegalHoldStatus(conversationEntity: Conversation, eventJson: IncomingEvent) {
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
      qualified_conversation: conversationId,
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

    await this.messageRepositoryProvider().updateAllClients(conversationEntity, true);

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
   * @param conversationEntity Conversation targeted by the event
   * @param eventJson JSON data of the event
   * @param eventSource Source of event
   * @returns Resolves when the event has been treated
   */
  private reactToConversationEvent(
    conversationEntity: Conversation,
    eventJson: IncomingEvent,
    eventSource: EventSource,
  ) {
    switch (eventJson.type) {
      case CONVERSATION_EVENT.CREATE:
        return this.onCreate(eventJson, eventSource);

      case CONVERSATION_EVENT.DELETE:
        return this.deleteConversationLocally(eventJson.conversation, false, conversationEntity.domain);

      case CONVERSATION_EVENT.MEMBER_JOIN:
        return this.onMemberJoin(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MEMBER_LEAVE:
      case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE:
        return this.onMemberLeave(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MEMBER_UPDATE:
        return this.onMemberUpdate(conversationEntity, eventJson);

      case CONVERSATION_EVENT.RENAME:
        return this.onRename(conversationEntity, eventJson, eventSource === EventRepository.SOURCE.WEB_SOCKET);

      case ClientEvent.CONVERSATION.ASSET_ADD:
        return this.onAssetAdd(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.GROUP_CREATION:
        return this.onGroupCreation(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.MESSAGE_DELETE:
        return this.onMessageDeleted(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.MESSAGE_HIDDEN:
        return this.onMessageHidden(eventJson);

      case ClientEvent.CONVERSATION.ONE2ONE_CREATION:
        return this.on1to1Creation(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.REACTION:
        return this.onReaction(conversationEntity, eventJson);

      case CONVERSATION_EVENT.RECEIPT_MODE_UPDATE:
        return this.onReceiptModeChanged(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.BUTTON_ACTION_CONFIRMATION:
        return this.onButtonActionConfirmation(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.MESSAGE_ADD:
        const isMessageEdit = !!eventJson.edited_time;
        if (isMessageEdit) {
          // in case of an edition, the DB listener will take care of updating the local entity
          return {conversationEntity};
        }
        return this.addEventToConversation(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE:
      case ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD:
      case ClientEvent.CONVERSATION.DELETE_EVERYWHERE:
      case ClientEvent.CONVERSATION.FILE_TYPE_RESTRICTED:
      case ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG:
      case ClientEvent.CONVERSATION.KNOCK:
      case ClientEvent.CONVERSATION.CALL_TIME_OUT:
      case ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE:
      case ClientEvent.CONVERSATION.LOCATION:
      case ClientEvent.CONVERSATION.MISSED_MESSAGES:
      case ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT:
      case ClientEvent.CONVERSATION.VERIFICATION:
      case ClientEvent.CONVERSATION.VOICE_CHANNEL_ACTIVATE:
      case ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE:
        return this.addEventToConversation(conversationEntity, eventJson);
    }
  }

  /**
   * Calls the feature specific event handler on the current event being handled.
   *
   * @param conversationEntity Conversation targeted by the event
   * @param eventJson JSON data of the event
   * @param eventSource Source of event
   * @returns Resolves when all the handlers have done their job
   */
  private async triggerFeatureEventHandlers(conversationEntity: Conversation, eventJson: IncomingEvent) {
    const conversationEventHandlers = [this.ephemeralHandler, this.stateHandler];
    const handlePromises = conversationEventHandlers.map(handler =>
      handler.handleConversationEvent(conversationEntity, eventJson),
    );
    await Promise.all(handlePromises);
    return conversationEntity;
  }

  /**
   * Handles conversation update and notification message.
   *
   * @param entityObject Object containing the conversation and the message that are targeted by the event
   * @param eventSource Source of event
   * @param previouslyArchived `true` if the previous state of the conversation was archived
   * @returns Resolves when the conversation was updated
   */
  private async handleConversationNotification(
    entityObject: EntityObject,
    eventSource: EventSource,
    previouslyArchived: boolean,
  ) {
    const {conversationEntity, messageEntity} = entityObject;

    if (conversationEntity) {
      const eventFromWebSocket = eventSource === EventRepository.SOURCE.WEB_SOCKET;
      const eventFromStream = eventSource === EventRepository.SOURCE.STREAM;

      if (messageEntity) {
        const isRemoteEvent = eventFromStream || eventFromWebSocket;

        if (isRemoteEvent) {
          this.messageRepositoryProvider().sendConfirmationStatus(
            conversationEntity,
            messageEntity,
            Confirmation.Type.DELIVERED,
          );
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
   * @param eventJson JSON data for event
   * @param source Source of event
   */
  private pushToReceivingQueue(eventJson: IncomingEvent, source: EventSource) {
    this.receiving_queue
      .push(() => this.handleConversationEvent(eventJson, source))
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
            this.init_promise.resolveFn();
            this.init_promise = undefined;
          }
        }
      })
      .catch(error => {
        if (this.init_promise) {
          this.init_promise.rejectFn(error);
          this.init_promise = undefined;
        } else {
          throw error;
        }
      });
  }

  /**
   * Add "missed events" system message to conversation.
   */
  private readonly onMissedEvents = (): void => {
    this.conversationState
      .filtered_conversations()
      .filter(conversationEntity => !conversationEntity.removed_from_conversation())
      .forEach(conversationEntity => {
        const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
        const missed_event = EventBuilder.buildMissed(conversationEntity, currentTimestamp);
        this.eventRepository.injectEvent(missed_event);
      });
  };

  private on1to1Creation(conversationEntity: Conversation, eventJson: OneToOneCreationEvent) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity)
      .then(messageEntity => this.updateMessageUserEntities(messageEntity))
      .then((messageEntity: MemberMessage) => {
        const userEntity = messageEntity.otherUser();
        const isOutgoingRequest = userEntity && userEntity.isOutgoingRequest();
        if (isOutgoingRequest) {
          messageEntity.memberMessageType = SystemMessageType.CONNECTION_REQUEST;
        }

        conversationEntity.addMessage(messageEntity);
        return {conversationEntity};
      });
  }

  /**
   * A conversation was created.
   *
   * @param eventJson JSON data of 'conversation.create' event
   * @param eventSource Source of event
   * @returns Resolves when the event was handled
   */
  private async onCreate(
    eventJson: ConversationCreateEvent,
    eventSource?: EventSource,
  ): Promise<{conversationEntity: Conversation}> {
    const {conversation: conversationId, data: eventData, time} = eventJson;
    const eventTimestamp = new Date(time).getTime();
    const initialTimestamp = isNaN(eventTimestamp) ? this.getLatestEventTimestamp(true) : eventTimestamp;
    try {
      const existingConversationEntity = this.conversationState.findConversation(
        conversationId,
        eventJson.qualified_conversation?.domain,
      );
      if (existingConversationEntity) {
        throw new ConversationError(ConversationError.TYPE.NO_CHANGES, ConversationError.MESSAGE.NO_CHANGES);
      }

      const [conversationEntity] = this.mapConversations([eventData], initialTimestamp);
      if (conversationEntity) {
        if (conversationEntity.participating_user_ids().length) {
          this.addCreationMessage(conversationEntity, false, initialTimestamp, eventSource);
        }
        await this.updateParticipatingUserEntities(conversationEntity);
        this.verificationStateHandler.onConversationCreate(conversationEntity);
        await this.saveConversation(conversationEntity);
      }
      return {conversationEntity};
    } catch (error) {
      const isNoChanges = error.type === ConversationError.TYPE.NO_CHANGES;
      if (!isNoChanges) {
        throw error;
      }
    }
    return undefined;
  }

  private async onGroupCreation(conversationEntity: Conversation, eventJson: GroupCreationEvent) {
    const messageEntity = await this.event_mapper.mapJsonEvent(eventJson, conversationEntity);
    const creatorId = conversationEntity.creator;
    const creatorDomain = conversationEntity.domain;
    const createdByParticipant = !!conversationEntity
      .participating_user_ids()
      .find(userId => userId.id === creatorId && userId.domain == creatorDomain);
    const createdBySelfUser = conversationEntity.isCreatedBySelf();

    const creatorIsParticipant = createdByParticipant || createdBySelfUser;

    const data = await this.conversation_service.getConversationById(conversationEntity.id, conversationEntity.domain);
    const allMembers = [...data.members.others, data.members.self];
    const conversationRoles = allMembers.reduce<Record<string, string>>((roles, member) => {
      roles[member.id] = member.conversation_role;
      return roles;
    }, {});
    conversationEntity.roles(conversationRoles);

    if (!creatorIsParticipant) {
      (messageEntity as MemberMessage).memberMessageType = SystemMessageType.CONVERSATION_RESUME;
    }

    const updatedMessageEntity = await this.updateMessageUserEntities(messageEntity);
    if (conversationEntity && updatedMessageEntity) {
      conversationEntity.addMessage(updatedMessageEntity);
    }

    return {conversationEntity, messageEntity: updatedMessageEntity};
  }

  /**
   * Users were added to a group conversation.
   *
   * @param conversationEntity Conversation to add users to
   * @param eventJson JSON data of 'conversation.member-join' event
   * @returns Resolves when the event was handled
   */
  private async onMemberJoin(
    conversationEntity: Conversation,
    eventJson: ConversationMemberJoinEvent,
  ): Promise<void | EntityObject> {
    // Ignore if we join a 1to1 conversation (accept a connection request)
    const connectionEntity = this.connectionRepository.getConnectionByConversationId(conversationEntity.id);
    const isPendingConnection = connectionEntity && connectionEntity.isIncomingRequest();
    if (isPendingConnection) {
      return Promise.resolve();
    }

    const eventData = eventJson.data;

    if (eventData.users) {
      eventData.users.forEach(otherMember => {
        const isSelfUser =
          otherMember.id === this.userState.self().id &&
          otherMember.qualified_id?.domain == this.userState.self().domain;
        const isParticipatingUser = !!conversationEntity
          .participating_user_ids()
          .find(
            participatingUser =>
              participatingUser.id === otherMember.id && participatingUser.domain == otherMember.qualified_id?.domain,
          );
        if (!isSelfUser && !isParticipatingUser) {
          conversationEntity.participating_user_ids.push({
            domain: otherMember.qualified_id?.domain || null,
            id: otherMember.id,
          });
        }
      });
    } else {
      eventData.user_ids.forEach(userId => {
        const isSelfUser = userId === this.userState.self().id;
        const isParticipatingUser = conversationEntity.participating_user_ids().some(user => user.id === userId);
        if (!isSelfUser && !isParticipatingUser) {
          conversationEntity.participating_user_ids.push({domain: null, id: userId});
        }
      });
    }

    // Self user joins again
    const selfUserRejoins = eventData.user_ids.includes(this.userState.self().id);
    if (selfUserRejoins) {
      conversationEntity.status(ConversationStatus.CURRENT_MEMBER);
      await this.conversationRoleRepository.updateConversationRoles(conversationEntity);
    }

    const updateSequence =
      selfUserRejoins || connectionEntity?.isConnected()
        ? this.updateConversationFromBackend(conversationEntity)
        : Promise.resolve();

    const qualifiedUserIds =
      eventData.users?.map(user => user.qualified_id) || eventData.user_ids.map(userId => ({domain: null, id: userId}));

    return updateSequence
      .then(() => this.updateParticipatingUserEntities(conversationEntity, false, true))
      .then(() => this.addEventToConversation(conversationEntity, eventJson))
      .then(({messageEntity}) => {
        this.verificationStateHandler.onMemberJoined(conversationEntity, qualifiedUserIds);
        return {conversationEntity, messageEntity};
      });
  }

  /**
   * Members of a group conversation were removed or left.
   *
   * @param conversationEntity Conversation to remove users from
   * @param eventJson JSON data of 'conversation.member-leave' event
   * @returns Resolves when the event was handled
   */
  private async onMemberLeave(
    conversationEntity: Conversation,
    eventJson: ConversationMemberLeaveEvent | TeamMemberLeaveEvent,
  ): Promise<{conversationEntity: Conversation; messageEntity: Message} | undefined> {
    const {data: eventData, from} = eventJson;
    const isFromSelf = from === this.userState.self().id;
    const removesSelfUser = eventData.user_ids.includes(this.userState.self().id);
    const selfLeavingClearedConversation = isFromSelf && removesSelfUser && conversationEntity.is_cleared();

    if (removesSelfUser) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
      this.leaveCall(conversationEntity.id);
      if (this.userState.self().isTemporaryGuest()) {
        eventJson.from = this.userState.self().id;
      }
    }

    if (!selfLeavingClearedConversation) {
      const {messageEntity} = await this.addEventToConversation(conversationEntity, eventJson);
      (messageEntity as MemberMessage)
        .userEntities()
        .filter(userEntity => !userEntity.isMe)
        .forEach(userEntity => {
          conversationEntity.participating_user_ids.remove(userId => {
            return userId.id === userEntity.id && userId.domain == userEntity.domain;
          });

          if (userEntity.isTemporaryGuest()) {
            userEntity.clearExpirationTimeout();
          }
        });

      await this.updateParticipatingUserEntities(conversationEntity);

      this.verificationStateHandler.onMemberLeft(conversationEntity);

      if (isFromSelf && conversationEntity.removed_from_conversation()) {
        this.archiveConversation(conversationEntity);
      }

      return {conversationEntity, messageEntity};
    }

    return undefined;
  }

  /**
   * Membership properties for a conversation were updated.
   *
   * @param conversationEntity Conversation entity that will be updated
   * @param eventJson JSON data of 'conversation.member-update' event
   * @returns Resolves when the event was handled
   */
  private onMemberUpdate(conversationEntity: Conversation, eventJson: Partial<ConversationMemberUpdateEvent>) {
    const {qualified_conversation: conversationId, data: eventData, from} = eventJson;

    const isConversationRoleUpdate = !!eventData.conversation_role;
    if (isConversationRoleUpdate) {
      const {qualified_target: userId, conversation_role} = eventData;
      const conversation = this.conversationState
        .conversations()
        .find(conversation => matchQualifiedIds(conversation, conversationId));
      if (conversation) {
        const roles = conversation.roles();
        roles[userId.id] = conversation_role;
        conversation.roles(roles);
      }
      return;
    }

    const isBackendEvent = eventData.otr_archived_ref || eventData.otr_muted_ref;
    const selfConversation = this.conversationState.self_conversation();
    const inSelfConversation = selfConversation && matchQualifiedIds(selfConversation, conversationId);
    if (!inSelfConversation && conversationId && !isBackendEvent) {
      throw new ConversationError(
        ConversationError.TYPE.WRONG_CONVERSATION,
        ConversationError.MESSAGE.WRONG_CONVERSATION,
      );
    }

    const isFromSelf = !this.userState.self() || from === this.userState.self().id;
    if (!isFromSelf) {
      throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
    }

    const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);
    const nextConversationEntity = isActiveConversation ? this.getNextConversation(conversationEntity) : undefined;
    const previouslyArchived = conversationEntity.is_archived();

    ConversationMapper.updateSelfStatus(conversationEntity, eventData);

    const wasUnarchived = previouslyArchived && !conversationEntity.is_archived();
    if (wasUnarchived) {
      return this.fetchUsersAndEvents(conversationEntity);
    }

    if (conversationEntity.is_cleared()) {
      this._clearConversation(conversationEntity, conversationEntity.cleared_timestamp());
    }

    if (isActiveConversation && (conversationEntity.is_archived() || conversationEntity.is_cleared())) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity, {});
    }
  }

  /**
   * An asset received in a conversation.
   *
   * @param conversationEntity Conversation to add the event to
   * @param event JSON data of 'conversation.asset-add'
   * @returns Resolves when the event was handled
   */
  private async onAssetAdd(conversationEntity: Conversation, event: AssetAddEvent) {
    const fromSelf = event.from === this.userState.self().id;

    const isRemoteFailure = !fromSelf && event.data.status === AssetTransferState.UPLOAD_FAILED;
    const isLocalCancel = fromSelf && event.data.reason === ProtobufAsset.NotUploaded.CANCELLED;

    if (isRemoteFailure || isLocalCancel) {
      /**
       * WEBAPP-6916: An unsuccessful asset upload triggers a removal of the original asset message in the `EventRepository`.
       * Thus the event timestamps need to get updated, so that the latest event timestamp is from the message which was send before the original message.
       *
       * Info: Since the `EventRepository` does not have a reference to the `ConversationRepository` we do that event update at this location.
       * A more fitting place would be the `AssetTransferState.UPLOAD_FAILED` case in `EventRepository._handleAssetUpdate`.
       *
       * Our assumption is that the `_handleAssetUpdate` function (invoked by `notificationsQueue.subscribe`) is executed before this function.
       */
      return conversationEntity.updateTimestamps(conversationEntity.getLastMessage(), true);
    }

    if (!allowsAllFiles()) {
      const fileName = event.data.info.name;
      const contentType = event.data.content_type;
      if (!isAllowedFile(fileName, contentType)) {
        // TODO(Federation): Update code once sending assets is implemented on the backend
        const user = await this.userRepository.getUserById(event.from, null);
        return this.injectFileTypeRestrictedMessage(
          conversationEntity,
          user,
          true,
          getFileExtensionOrName(fileName),
          event.id,
        );
      }
    }
    const {messageEntity} = await this.addEventToConversation(conversationEntity, event);
    const firstAsset = (messageEntity as ContentMessage).getFirstAsset();
    if (firstAsset.isImage() || (firstAsset as FileAsset).status() === AssetTransferState.UPLOADED) {
      return {conversationEntity, messageEntity};
    }
  }

  /**
   * A hide message received in a conversation.
   *
   * @param conversationEntity Conversation to add the event to
   * @param eventJson JSON data of 'conversation.message-delete'
   * @returns Resolves when the event was handled
   */
  private onMessageDeleted(conversationEntity: Conversation, eventJson: DeleteEvent) {
    const {data: eventData, from, id: eventId, time} = eventJson;

    return this.messageRepositoryProvider()
      .getMessageInConversationById(conversationEntity, eventData.message_id)
      .then(deletedMessageEntity => {
        if (deletedMessageEntity.ephemeral_expires()) {
          return;
        }

        const isSameSender = from === deletedMessageEntity.from;
        if (!isSameSender) {
          throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
        }

        const isFromSelf = from === this.userState.self().id;
        if (!isFromSelf) {
          return this.addDeleteMessage(conversationEntity, eventId, time, deletedMessageEntity);
        }
      })
      .then(() => {
        return this.messageRepositoryProvider().deleteMessageById(conversationEntity, eventData.message_id);
      })
      .catch(error => {
        const isNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (!isNotFound) {
          this.logger.info(`Failed to delete message for conversation '${conversationEntity.id}'`, error);
          throw error;
        }
      });
  }

  /**
   * A hide message received in a conversation.
   *
   * @param eventJson JSON data of 'conversation.message-hidden'
   * @returns Resolves when the event was handled
   */
  private async onMessageHidden(eventJson: MessageHiddenEvent) {
    const {conversation: conversationId, data: eventData, from} = eventJson;

    try {
      const inSelfConversation =
        !this.conversationState.self_conversation() || conversationId === this.conversationState.self_conversation().id;
      if (!inSelfConversation) {
        throw new ConversationError(
          ConversationError.TYPE.WRONG_CONVERSATION,
          ConversationError.MESSAGE.WRONG_CONVERSATION,
        );
      }

      const isFromSelf = !this.userState.self() || from === this.userState.self().id;
      if (!isFromSelf) {
        throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
      }
      const conversationEntity = await this.getConversationById(eventData.conversation_id);
      return await this.messageRepositoryProvider().deleteMessageById(conversationEntity, eventData.message_id);
    } catch (error) {
      this.logger.info(
        `Failed to delete message '${eventData.message_id}' for conversation '${eventData.conversation_id}'`,
        error,
      );
      throw error;
    }
  }

  /**
   * Someone reacted to a message.
   *
   * @param conversationEntity Conversation entity that a message was reacted upon in
   * @param eventJson JSON data of 'conversation.reaction' event
   * @returns Resolves when the event was handled
   */
  private async onReaction(conversationEntity: Conversation, eventJson: ReactionEvent) {
    const conversationId = conversationEntity.id;
    const eventData = eventJson.data;
    const messageId = eventData.message_id;

    try {
      const messageEntity = await this.messageRepositoryProvider().getMessageInConversationById(
        conversationEntity,
        messageId,
      );
      if (!messageEntity || !messageEntity.isContent()) {
        const type = messageEntity ? messageEntity.type : 'unknown';

        const logMessage = `Cannot react to '${type}' message '${messageId}' in conversation '${conversationId}'`;
        this.logger.error(logMessage, messageEntity);
        throw new ConversationError(ConversationError.TYPE.WRONG_TYPE, ConversationError.MESSAGE.WRONG_TYPE);
      }

      const changes = messageEntity.getUpdatedReactions(eventJson);
      if (changes) {
        const logMessage = `Updating reactions of message '${messageId}' in conversation '${conversationId}'`;
        this.logger.debug(logMessage, {changes, event: eventJson});

        this.eventService.updateEventSequentially(messageEntity.primary_key, changes);
        return await this.prepareReactionNotification(conversationEntity, messageEntity, eventJson);
      }
    } catch (error) {
      const isNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
      if (!isNotFound) {
        const logMessage = `Failed to handle reaction to message '${messageId}' in conversation '${conversationId}'`;
        this.logger.error(logMessage, {error, event: eventJson});
        throw error;
      }
    }
    return undefined;
  }

  private async onButtonActionConfirmation(conversationEntity: Conversation, eventJson: ButtonActionConfirmationEvent) {
    const {messageId, buttonId} = eventJson.data;
    try {
      const messageEntity = await this.messageRepositoryProvider().getMessageInConversationById(
        conversationEntity,
        messageId,
      );
      if (!messageEntity || !messageEntity.isComposite()) {
        const type = messageEntity ? messageEntity.type : 'unknown';

        const log = `Cannot react to '${type}' message '${messageId}' in conversation '${conversationEntity.id}'`;
        this.logger.error(log, messageEntity);
        throw new ConversationError(ConversationError.TYPE.WRONG_TYPE, ConversationError.MESSAGE.WRONG_TYPE);
      }
      const changes = messageEntity.getSelectionChange(buttonId);
      if (changes) {
        this.eventService.updateEventSequentially(messageEntity.primary_key, changes);
      }
      return;
    } catch (error) {
      const isNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
      if (!isNotFound) {
        const log = `Failed to handle reaction to message '${messageId}' in conversation '${conversationEntity.id}'`;
        this.logger.error(log, {error, event: eventJson});
        throw error;
      }
    }
  }

  /**
   * A conversation was renamed.
   *
   * @param conversationEntity Conversation entity that will be renamed
   * @param eventJson JSON data of 'conversation.rename' event
   * @returns Resolves when the event was handled
   */
  private async onRename(conversationEntity: Conversation, eventJson: ConversationRenameEvent, isWebSocket = false) {
    if (isWebSocket && eventJson.data?.name) {
      eventJson.data.name = fixWebsocketString(eventJson.data.name);
    }
    const {messageEntity} = await this.addEventToConversation(conversationEntity, eventJson);
    ConversationMapper.updateProperties(conversationEntity, eventJson.data);
    return {conversationEntity, messageEntity};
  }

  /**
   * A conversation receipt mode was changed
   *
   * @param conversationEntity Conversation entity that will be renamed
   * @param eventJson JSON data of 'conversation.receipt-mode-update' event
   * @returns Resolves when the event was handled
   */
  private async onReceiptModeChanged(conversationEntity: Conversation, eventJson: ConversationReceiptModeUpdateEvent) {
    const {messageEntity} = await this.addEventToConversation(conversationEntity, eventJson);
    ConversationMapper.updateSelfStatus(conversationEntity, {receipt_mode: eventJson.data.receipt_mode});
    return {conversationEntity, messageEntity};
  }

  private readonly handleMessageExpiration = (messageEntity: ContentMessage) => {
    amplify.publish(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, messageEntity);
    const shouldDeleteMessage = !messageEntity.user().isMe || messageEntity.isPing();
    if (shouldDeleteMessage) {
      this.getConversationById(messageEntity.conversation_id).then(conversationEntity => {
        const isPingFromSelf = messageEntity.user().isMe && messageEntity.isPing();
        const deleteForSelf = isPingFromSelf || conversationEntity.removed_from_conversation();
        if (deleteForSelf) {
          return this.messageRepositoryProvider().deleteMessage(conversationEntity, messageEntity);
        }

        const userIds = conversationEntity.isGroup() ? [this.userState.self().id, messageEntity.from] : undefined;
        return this.messageRepositoryProvider().deleteMessageForEveryone(conversationEntity, messageEntity, userIds);
      });
    }
  };

  private async initMessageEntity(conversationEntity: Conversation, eventJson: IncomingEvent): Promise<Message> {
    const messageEntity = await this.event_mapper.mapJsonEvent(eventJson, conversationEntity);
    return this.updateMessageUserEntities(messageEntity);
  }

  private async replaceMessageInConversation(
    conversationEntity: Conversation,
    eventId: string,
    newData: EventRecord,
  ): Promise<ContentMessage | undefined> {
    const originalMessage = conversationEntity.getMessage(eventId);
    if (!originalMessage) {
      return undefined;
    }
    const replacedMessageEntity = await this.event_mapper.updateMessageEvent(
      originalMessage as ContentMessage,
      newData,
    );
    await this.ephemeralHandler.validateMessage(replacedMessageEntity);
    return replacedMessageEntity;
  }

  /**
   * Convert a JSON event into an entity and add it to a given conversation.
   *
   * @param conversationEntity Conversation entity the event will be added to
   * @param eventJson Event data
   * @returns Promise that resolves with the message entity for the event
   */
  private async addEventToConversation(
    conversationEntity: Conversation,
    eventJson: IncomingEvent,
  ): Promise<{conversationEntity: Conversation; messageEntity: Message}> {
    const messageEntity = (await this.initMessageEntity(conversationEntity, eventJson)) as Message;
    if (conversationEntity && messageEntity) {
      const wasAdded = conversationEntity.addMessage(messageEntity);
      if (wasAdded) {
        await this.ephemeralHandler.validateMessage(messageEntity as ContentMessage);
      }
    }
    return {conversationEntity, messageEntity};
  }

  /**
   * Convert multiple JSON events into entities and add them to a given conversation.
   *
   * @param events Event data
   * @param conversationEntity Conversation entity the events will be added to
   * @param prepend Should existing messages be prepended
   * @returns Resolves with an array of mapped messages
   */
  private async addEventsToConversation(events: EventRecord[], conversationEntity: Conversation, prepend = true) {
    const mappedEvents = await this.event_mapper.mapJsonEvents(events, conversationEntity);
    const updatedEvents = (await this.updateMessagesUserEntities(mappedEvents)) as ContentMessage[];
    const validatedMessages = (await this.ephemeralHandler.validateMessages(updatedEvents)) as ContentMessage[];
    if (prepend && conversationEntity.messages().length) {
      conversationEntity.prependMessages(validatedMessages);
    } else {
      conversationEntity.addMessages(validatedMessages);
    }
    return validatedMessages;
  }

  /**
   * Fetch all unread events and users of a conversation.
   *
   * @param conversationEntity Conversation fetch events and users for
   */
  private fetchUsersAndEvents(conversationEntity: Conversation) {
    if (!conversationEntity.is_loaded() && !conversationEntity.is_pending()) {
      this.updateParticipatingUserEntities(conversationEntity);
      this.getUnreadEvents(conversationEntity);
    }
  }

  /**
   * Forward the reaction event to the Notification repository for browser and audio notifications.
   *
   * @param conversationEntity Conversation that event was received in
   * @param messageEntity Message that has been reacted upon
   * @param eventJson JSON data of received reaction event
   * @returns Resolves when the notification was prepared
   */
  private async prepareReactionNotification(
    conversationEntity: Conversation,
    messageEntity: ContentMessage,
    eventJson: ReactionEvent,
  ) {
    const {data: event_data, from} = eventJson;

    const messageFromSelf = messageEntity.from === this.userState.self().id;
    if (messageFromSelf && event_data.reaction) {
      const userEntity = await this.userRepository.getUserById(from, messageEntity.fromDomain);
      const reactionMessageEntity = new Message(messageEntity.id, SuperType.REACTION);
      reactionMessageEntity.user(userEntity);
      reactionMessageEntity.reaction = event_data.reaction;
      return {conversationEntity, messageEntity: reactionMessageEntity};
    }

    return {conversationEntity};
  }

  private updateMessagesUserEntities(messageEntities: Message[]) {
    return Promise.all(messageEntities.map(messageEntity => this.updateMessageUserEntities(messageEntity)));
  }

  /**
   * Updates the user entities that are part of a message.
   *
   * @param messageEntity Message to be updated
   * @returns Resolves when users have been update
   */
  private async updateMessageUserEntities(messageEntity: Message) {
    const userEntity = await this.userRepository.getUserById(messageEntity.from, messageEntity.fromDomain);
    messageEntity.user(userEntity);
    const isMemberMessage = messageEntity.isMember();
    if (isMemberMessage || messageEntity.hasOwnProperty('userEntities')) {
      return this.userRepository.getUsersById((messageEntity as MemberMessage).userIds()).then(userEntities => {
        userEntities.sort(sortUsersByPriority);
        (messageEntity as MemberMessage).userEntities(userEntities);
        return messageEntity;
      });
    }
    if (messageEntity.isContent()) {
      const userIds = Object.keys(messageEntity.reactions());

      messageEntity.reactions_user_ets.removeAll();
      if (userIds.length) {
        // TODO(Federation): Make code federation-aware.
        return this.userRepository
          .getUsersById(userIds.map(userId => ({domain: null, id: userId})))
          .then(userEntities => {
            messageEntity.reactions_user_ets(userEntities);
            return messageEntity;
          });
      }
    }
    return messageEntity;
  }

  /**
   * Delete messages from UI and database.
   *
   * @param conversationEntity Conversation that contains the message
   * @param timestamp Timestamp as upper bound which messages to remove
   */
  private deleteMessages(conversationEntity: Conversation, timestamp: number) {
    conversationEntity.hasCreationMessage = false;

    const iso_date = timestamp ? new Date(timestamp).toISOString() : undefined;
    this.eventService.deleteEvents(conversationEntity.id, iso_date);
  }

  /**
   * Add delete message to conversation.
   *
   * @param conversationId ID of conversation
   * @param messageId ID of message
   * @param time ISO 8601 formatted time string
   * @param messageEntity Message to delete
   */
  public addDeleteMessage(conversation: Conversation, messageId: string, time: string, messageEntity: Message) {
    const deleteEvent = EventBuilder.buildDelete(conversation, messageId, time, messageEntity);
    this.eventRepository.injectEvent(deleteEvent);
  }

  //##############################################################################
  // Message updates
  //##############################################################################

  expectReadReceipt(conversationEntity: Conversation): boolean {
    if (conversationEntity.is1to1()) {
      return !!this.propertyRepository.receiptMode();
    }

    if (conversationEntity.team_id && conversationEntity.isGroup()) {
      return !!conversationEntity.receiptMode();
    }

    return false;
  }
}
