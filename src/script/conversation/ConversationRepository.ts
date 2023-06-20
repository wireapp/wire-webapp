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

import {
  Conversation as BackendConversation,
  ConversationProtocol,
  CONVERSATION_TYPE,
  DefaultConversationRoleName as DefaultRole,
  NewConversation,
  MessageSendingStatus,
  RemoteConversations,
} from '@wireapp/api-client/lib/conversation';
import {ConversationReceiptModeUpdateData} from '@wireapp/api-client/lib/conversation/data/';
import {CONVERSATION_TYPING} from '@wireapp/api-client/lib/conversation/data/ConversationTypingData';
import {
  ConversationCreateEvent,
  ConversationEvent,
  ConversationMemberJoinEvent,
  ConversationMemberLeaveEvent,
  ConversationMemberUpdateEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationReceiptModeUpdateEvent,
  ConversationRenameEvent,
  ConversationTypingEvent,
  CONVERSATION_EVENT,
  ConversationProtocolUpdateEvent,
} from '@wireapp/api-client/lib/event';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import type {BackendError} from '@wireapp/api-client/lib/http/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {MLSReturnType} from '@wireapp/core/lib/conversation';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {container} from 'tsyringe';
import {flatten} from 'underscore';

import {Asset as ProtobufAsset, Confirmation, LegalHoldStatus} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {TYPING_TIMEOUT, useTypingIndicatorState} from 'Components/InputBar/components/TypingIndicator';
import {getNextItem} from 'Util/ArrayUtil';
import {allowsAllFiles, getFileExtensionOrName, isAllowedFile} from 'Util/FileTypeUtil';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {removeClientFromUserClientMap} from 'Util/removeClientFromUserClientMap';
import {
  compareTransliteration,
  fixWebsocketString,
  sortByPriority,
  sortUsersByPriority,
  startsWith,
} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {isBackendError} from 'Util/TypePredicateUtil';
import {noop} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {ACCESS_STATE} from './AccessState';
import {extractClientDiff} from './ClientMismatchUtil';
import {updateAccessRights} from './ConversationAccessPermission';
import {ConversationEphemeralHandler} from './ConversationEphemeralHandler';
import {ConversationFilter} from './ConversationFilter';
import {ConversationLabelRepository} from './ConversationLabelRepository';
import {ConversationDatabaseData, ConversationMapper} from './ConversationMapper';
import {ConversationRoleRepository} from './ConversationRoleRepository';
import {isMLSConversation} from './ConversationSelectors';
import {ConversationService} from './ConversationService';
import {ConversationState} from './ConversationState';
import {ConversationStateHandler} from './ConversationStateHandler';
import {ConversationStatus} from './ConversationStatus';
import {ConversationVerificationState} from './ConversationVerificationState';
import {ConversationVerificationStateHandler} from './ConversationVerificationStateHandler';
import {EventMapper} from './EventMapper';
import {MessageRepository} from './MessageRepository';
import {NOTIFICATION_STATE} from './NotificationSetting';

import {AssetTransferState} from '../assets/AssetTransferState';
import {LEAVE_CALL_REASON} from '../calling/enum/LeaveCallReason';
import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {Config} from '../Config';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {
  AssetAddEvent,
  ButtonActionConfirmationEvent,
  ClientConversationEvent,
  DeleteEvent,
  EventBuilder,
  GroupCreationEvent,
  MemberLeaveEvent,
  MessageHiddenEvent,
  OneToOneCreationEvent,
  ReactionEvent,
  TeamMemberLeaveEvent,
} from '../conversation/EventBuilder';
import {Conversation} from '../entity/Conversation';
import {ContentMessage} from '../entity/message/ContentMessage';
import {DeleteConversationMessage} from '../entity/message/DeleteConversationMessage';
import {FileAsset} from '../entity/message/FileAsset';
import {MemberMessage} from '../entity/message/MemberMessage';
import {Message} from '../entity/message/Message';
import {User} from '../entity/User';
import {BaseError, BASE_ERROR_TYPE} from '../error/BaseError';
import {ConversationError} from '../error/ConversationError';
import {ClientEvent, CONVERSATION as CLIENT_CONVERSATION_EVENT} from '../event/Client';
import {EventRepository} from '../event/EventRepository';
import {EventService} from '../event/EventService';
import {EventSource} from '../event/EventSource';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {isMemberMessage} from '../guards/Message';
import * as LegalHoldEvaluator from '../legal-hold/LegalHoldEvaluator';
import {MessageCategory} from '../message/MessageCategory';
import {SuperType} from '../message/SuperType';
import {SystemMessageType} from '../message/SystemMessageType';
import {addOtherSelfClientsToMLSConversation, useMLSConversationState} from '../mls';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {Core} from '../service/CoreSingleton';
import type {EventRecord} from '../storage';
import {ConversationRecord} from '../storage/record/ConversationRecord';
import {TeamRepository} from '../team/TeamRepository';
import {TeamState} from '../team/TeamState';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {UserFilter} from '../user/UserFilter';
import {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

type ConversationDBChange = {obj: EventRecord; oldObj: EventRecord};
type FetchPromise = {rejectFn: (error: ConversationError) => void; resolveFn: (conversation: Conversation) => void};
type EntityObject = {conversationEntity: Conversation; messageEntity: Message};
type IncomingEvent = ConversationEvent | ClientConversationEvent;

export class ConversationRepository {
  private isBlockingNotificationHandling: boolean;
  private readonly conversationsWithNewEvents: Map<any, any>;
  private readonly ephemeralHandler: ConversationEphemeralHandler;
  public readonly conversationLabelRepository: ConversationLabelRepository;
  public readonly conversationRoleRepository: ConversationRoleRepository;
  private readonly event_mapper: EventMapper;
  private readonly eventService: EventService;
  public leaveCall: (conversationId: QualifiedId, reason: LEAVE_CALL_REASON) => void;
  private readonly logger: Logger;
  public readonly stateHandler: ConversationStateHandler;
  public readonly verificationStateHandler: ConversationVerificationStateHandler;
  static readonly eventFromStreamMessage = 'event from notification stream';

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

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageRepository: MessageRepository,
    private readonly connectionRepository: ConnectionRepository,
    private readonly eventRepository: EventRepository,
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly propertyRepository: PropertiesRepository,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly core = container.resolve(Core),
  ) {
    this.eventService = eventRepository.eventService;
    // we register a client mismatch handler agains the message repository so that we can react to missing members
    // FIXME this should be temporary. In the near future we want the core to handle clients/mismatch/verification. So the webapp won't need this logic at all
    this.messageRepository.setClientMismatchHandler(async (mismatch, conversation, silent, consentType) => {
      //we filter out self client id to omit it in mismatch check
      const {userId, clientId} = this.core;
      const domain = userState.self().domain;

      const selfClient = {domain, userId, clientId};
      const filteredMissing = mismatch.missing && removeClientFromUserClientMap(mismatch.missing, selfClient);
      const filteredMismatch = {...mismatch, missing: filteredMissing} as MessageSendingStatus;

      const {missingClients, deletedClients, emptyUsers, missingUserIds} = extractClientDiff(
        filteredMismatch,
        conversation?.allUserEntities(),
        domain,
      );

      if (conversation && missingUserIds.length) {
        // add/remove users from the conversation (if any)
        await this.addMissingMember(conversation, missingUserIds, new Date(mismatch.time).getTime() - 1);
      }

      // Remove clients that are not needed anymore
      await Promise.all(
        deletedClients.map(({userId, clients}) =>
          Promise.all(clients.map(client => this.userRepository.removeClientFromUser(userId, client))),
        ),
      );
      const removedTeamUserIds = emptyUsers.filter(user => user.inTeam()).map(user => user.qualifiedId);

      if (removedTeamUserIds.length) {
        // If we have found some users that were removed from the conversation, we need to check if those users were also completely removed from the team
        const {found: usersWithoutClients} = await this.userRepository.getUserListFromBackend(removedTeamUserIds);
        await Promise.all(
          usersWithoutClients
            .filter(user => user.deleted)
            .map(user =>
              this.teamMemberLeave(
                this.teamState.team().id,
                {
                  domain: this.teamState.teamDomain(),
                  id: user.id,
                },
                new Date(mismatch.time).getTime() - 1,
              ),
            ),
        );
      }

      let shouldWarnLegalHold = false;
      if (missingClients.length) {
        const wasVerified = conversation?.is_verified();
        const legalHoldStatus = conversation?.legalHoldStatus();
        const newDevices = await this.userRepository.updateMissingUsersClients(
          missingClients.map(({userId}) => userId),
        );
        if (wasVerified && newDevices.length) {
          // if the conversation is verified but some clients were missing, it means the conversation will degrade.
          // We need to warn the user of the degradation and ask his permission to actually send the message
          conversation.verification_state(ConversationVerificationState.DEGRADED);
        }
        if (conversation) {
          const hasChangedLegalHoldStatus = conversation.legalHoldStatus() !== legalHoldStatus;
          shouldWarnLegalHold = hasChangedLegalHoldStatus && newDevices.some(device => device.isLegalHold());
        }
      }
      if (!conversation) {
        // in case of a broadcast message, we want to keep sending the message even if there are some conversation degradation
        return true;
      }
      return silent
        ? false
        : this.messageRepository.requestUserSendingPermission(conversation, shouldWarnLegalHold, consentType);
    });

    this.logger = getLogger('ConversationRepository');

    this.event_mapper = new EventMapper();
    this.verificationStateHandler = new ConversationVerificationStateHandler(
      this.eventRepository,
      this.userState,
      this.conversationState,
    );
    this.isBlockingNotificationHandling = true;
    this.conversationsWithNewEvents = new Map();

    this.teamState.isTeam.subscribe(() => this.mapGuestStatusSelf());

    this.initSubscriptions();

    this.stateHandler = new ConversationStateHandler(this.conversationService);
    this.ephemeralHandler = new ConversationEphemeralHandler(this.eventService, {
      onMessageTimeout: this.handleMessageExpiration,
    });

    this.userState.directlyConnectedUsers = this.conversationState.connectedUsers;

    this.conversationLabelRepository = new ConversationLabelRepository(
      this.conversationState.conversations,
      this.conversationState.visibleConversations,
      propertyRepository.propertiesService,
    );

    this.conversationRoleRepository = new ConversationRoleRepository(this.teamRepository, this.conversationService);
    this.leaveCall = noop;

    if (this.core.backendFeatures.isFederated) {
      this.scheduleMissingUsersAndConversationsMetadataRefresh();
    }
  }

  checkMessageTimer(messageEntity: ContentMessage): void {
    this.ephemeralHandler.checkMessageTimer(messageEntity, this.serverTimeHandler.getTimeOffset());
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
    const qualifiedId = updatedEvent.qualified_conversation || {domain: '', id: updatedEvent.conversation};
    const conversationEntity = this.conversationState.findConversation(qualifiedId);
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
    const qualifiedId = deletedEvent.qualified_conversation || {domain: '', id: deletedEvent.conversation};
    const conversationEntity = this.conversationState.findConversation(qualifiedId);
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
        this.conversationService.deleteConversationFromDb(conversationEntity.id);
        this.deleteConversationFromRepository(conversationEntity);
      }
    });

    this.cleanupEphemeralMessages();
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
    accessState?: ACCESS_STATE,
    options: Partial<NewConversation> = {},
  ): Promise<Conversation> {
    const userIds = userEntities.map(user => user.qualifiedId);
    const usersPayload = {
      qualified_users: userIds,
      users: [] as string[],
    };

    let payload: NewConversation & {conversation_role: string} = {
      conversation_role: DefaultRole.WIRE_MEMBER,
      name: groupName,
      receipt_mode: null,
      ...usersPayload,
      ...options,
    };

    if (this.teamState.team().id) {
      payload.team = {
        managed: false,
        teamid: this.teamState.team().id!,
      };

      if (accessState) {
        const {accessModes: access, accessRole} = updateAccessRights(accessState);

        const accessRoleField = this.core.backendFeatures.version >= 3 ? 'access_role' : 'access_role_v2';

        payload = {
          ...payload,
          access,
          [accessRoleField]: accessRole,
        };
      }
    }

    try {
      /**
       * ToDo: Fetch all MLS Events from backend before doing anything else
       * Needs to be done to receive the latest epoch and avoid epoch mismatch errors
       */
      let response: MLSReturnType;
      const isMLSConversation = payload.protocol === ConversationProtocol.MLS;
      if (isMLSConversation) {
        response = await this.core.service!.conversation.createMLSConversation(
          payload,
          this.userState.self().qualifiedId,
          this.core.clientId,
        );
      } else {
        response = {conversation: await this.core.service!.conversation.createProteusConversation(payload), events: []};
      }

      const {conversationEntity} = await this.onCreate({
        conversation: response.conversation.qualified_id.id,
        data: {
          last_event: '0.0',
          last_event_time: '1970-01-01T00:00:00.000Z',
          receipt_mode: undefined,
          ...response.conversation,
        },
        from: this.userState.self().id,
        qualified_conversation: response.conversation.qualified_id,
        time: new Date().toISOString(),
        type: CONVERSATION_EVENT.CREATE,
      });
      if (isMLSConversation && conversationEntity.groupId) {
        // since we are the creator of the conversation, we can safely mark it as established
        useMLSConversationState.getState().markAsEstablished(conversationEntity.groupId);
      }

      const {failed_to_add: failedToAddUsers} = response.conversation;

      if (failedToAddUsers && failedToAddUsers.length > 0) {
        const failedToAddUsersEvent = EventBuilder.buildFailedToAddUsersEvent(
          failedToAddUsers,
          conversationEntity,
          this.userState.self().id,
        );
        await this.eventRepository.injectEvent(failedToAddUsersEvent);
      }

      return conversationEntity;
    } catch (error) {
      if (!isBackendError(error)) {
        this.logger.error(error);
        throw error;
      }

      switch (error.label) {
        case BackendErrorLabel.CLIENT_ERROR:
          this.handleTooManyMembersError();
          break;
        case BackendErrorLabel.NOT_CONNECTED:
          await this.handleUsersNotConnected(userEntities.map(user => user.qualifiedId));
          break;
        case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT:
          this.showLegalHoldConsentError();
          break;
        default:
          this.logger.error(error);
      }
      throw error;
    }
  }

  public async refreshUnavailableParticipants(conversation: Conversation): Promise<void> {
    const unavailableUsers = conversation.allUserEntities().filter(user => !user.isAvailable());
    if (!unavailableUsers.length) {
      return;
    }
    await this.userRepository.refreshUsers(unavailableUsers.map(user => user.qualifiedId));
  }

  private async refreshAllConversationsUnavailableParticipants(): Promise<void> {
    const allUnavailableUsers = this.conversationState
      .conversations()
      .flatMap(conversation => conversation.allUserEntities().filter(user => !user.isAvailable()));

    if (!allUnavailableUsers.length) {
      return;
    }
    await this.userRepository.refreshUsers(allUnavailableUsers.map(user => user.qualifiedId));
  }

  /**
   * Refresh missing conversations and unavailable users metadata every 3 hours
   * @Note Federation only
   */
  private readonly scheduleMissingUsersAndConversationsMetadataRefresh = () => {
    window.setInterval(async () => {
      try {
        await this.loadMissingConversations();
        await this.refreshAllConversationsUnavailableParticipants();
      } catch (error) {
        this.logger.warn(`failed to refresh missing users & conversations metat data`, error);
      }
    }, TIME_IN_MILLIS.HOUR * 3);
  };

  /**
   * Create a guest room.
   */
  public createGuestRoom(): Promise<Conversation | undefined> {
    const groupName = t('guestRoomConversationName');
    return this.createGroupConversation([], groupName, ACCESS_STATE.TEAM.GUESTS_SERVICES);
  }

  /**
   * Get a conversation from the backend.
   */
  private async fetchConversationById({id: conversationId, domain}: QualifiedId): Promise<Conversation> {
    const qualifiedId = {domain, id: conversationId};
    const fetching_conversations: Record<string, FetchPromise[]> = {};
    if (fetching_conversations.hasOwnProperty(conversationId)) {
      return new Promise((resolve, reject) => {
        fetching_conversations[conversationId].push({rejectFn: reject, resolveFn: resolve});
      });
    }

    fetching_conversations[conversationId] = [];
    try {
      const response = await this.conversationService.getConversationById(qualifiedId);
      const [conversationEntity] = this.mapConversations([response]);

      this.saveConversation(conversationEntity);

      fetching_conversations[conversationId].forEach(({resolveFn}) => resolveFn(conversationEntity));
      delete fetching_conversations[conversationId];

      return conversationEntity;
    } catch (originalError) {
      if (originalError.code === HTTP_STATUS.NOT_FOUND) {
        this.deleteConversationLocally(qualifiedId, false);
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

  /**
   * Will load all the conversations in memory
   * @returns all the conversations from backend merged with the locally stored conversations and loaded into memory
   */
  public async loadConversations(): Promise<Conversation[]> {
    const remoteConversations = await this.conversationService.getAllConversations().catch(error => {
      this.logger.error(`Failed to get all conversations from backend: ${error.message}`);
      return {found: []} as RemoteConversations;
    });
    return this.loadRemoteConversations(remoteConversations);
  }

  /**
   * Will try to fetch and load all the missing conversations in memory
   * @returns all the missing conversations freshly fetched from backend appended to the locally stored conversations
   */
  public async loadMissingConversations(): Promise<Conversation[]> {
    const missingConversations = this.conversationState.missingConversations;
    if (!missingConversations.length) {
      return this.conversationState.conversations();
    }
    const remoteConversations = await this.conversationService
      .getConversationByIds(missingConversations)
      .catch(error => {
        this.logger.error(`Failed to get all conversations from backend: ${error.message}`);
        return {found: [], failed: missingConversations} as RemoteConversations;
      });
    return this.loadRemoteConversations(remoteConversations);
  }

  /**
   * Will append the new conversations from backend to the locally stored conversations in memory
   * @param remoteConversations new conversations fetched from backend
   * @returns the new conversations from backend merged with the locally stored conversations
   */
  private async loadRemoteConversations(remoteConversations: RemoteConversations): Promise<Conversation[]> {
    const localConversations = await this.conversationService.loadConversationStatesFromDb<ConversationDatabaseData>();
    let conversationsData: any[];

    if (!remoteConversations.found?.length) {
      conversationsData = localConversations;
    } else {
      const data = ConversationMapper.mergeConversations(localConversations, remoteConversations);
      conversationsData = (await this.conversationService.saveConversationsInDb(data)) as any[];
    }

    const allConversationEntities = this.mapConversations(conversationsData);
    const newConversationEntities = allConversationEntities.filter(
      allConversations =>
        !this.conversationState
          .conversations()
          .some(storedConversations => storedConversations.id === allConversations.id),
    );
    if (newConversationEntities.length) {
      this.saveConversations(newConversationEntities);
    }

    this.conversationState.missingConversations = [...new Set(remoteConversations.failed)];

    return this.conversationState.conversations();
  }

  public async updateConversationStates(conversationsDataArray: ConversationRecord[]) {
    const handledConversationEntities: Conversation[] = [];
    const unknownConversations: ConversationRecord[] = [];

    conversationsDataArray.forEach(conversationData => {
      const localEntity = this.conversationState
        .conversations()
        .find(conversation => matchQualifiedIds(conversation, conversationData));

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
    this.conversationService.saveConversationsInDb(handledConversationData);
    return conversationEntities;
  }

  /**
   * Get preceding messages starting with the given message.
   * @param conversationEntity Respective conversation
   * @returns Resolves with the messages
   */
  public async getPrecedingMessages(conversationEntity: Conversation): Promise<ContentMessage[]> {
    conversationEntity.is_pending(true);

    const firstMessageEntity = conversationEntity.getOldestMessage();
    const upperBound =
      firstMessageEntity && firstMessageEntity.timestamp()
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
      const firstMessage = conversationEntity.getOldestMessage();
      const checkCreationMessage = isMemberMessage(firstMessage) && firstMessage?.isCreation();
      if (checkCreationMessage) {
        const groupCreationMessageIn1to1 = conversationEntity.is1to1() && firstMessage?.isGroupCreation();
        const one2oneConnectionMessageInGroup = conversationEntity.isGroup() && firstMessage?.isConnection();
        const wrongMessageTypeForConversation = groupCreationMessageIn1to1 || one2oneConnectionMessageInGroup;

        if (wrongMessageTypeForConversation) {
          this.messageRepository.deleteMessage(conversationEntity, firstMessage);
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
                !!conversationEntity.participating_user_ids().find(user => matchQualifiedIds(user, teamMember)),
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
    const mappedMessageEntities = await this.addEventsToConversation(events, conversationEntity, {prepend: false});
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
  ): Promise<{messageEntities: Message[]; query: string}> {
    if (!conversationEntity || !query.length) {
      return {messageEntities: [], query};
    }

    const events = await this.conversationService.searchInConversation(conversationEntity.id, query);
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
    const first_message = conversationEntity.getOldestMessage();
    // The lower bound should be right after the last read timestamp in order not to load the last read message again (thus the +1)
    const lower_bound = new Date(conversationEntity.last_read_timestamp() + 1);
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
          // To prevent firing a ton of potential backend calls for missing users, we use an optimistic approach and do an offline update of those events
          // In case a user is missing in the local state, then they will be considered an `unavailable` user
          await this.addEventsToConversation(events, conversationEntity, {offline: true});
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
    await this.updateConversations(this.conversationState.filteredConversations());
  }

  /**
   * Update users and events for archived conversations currently visible.
   */
  public updateArchivedConversations() {
    return this.updateConversations(this.conversationState.archivedConversations());
  }

  private async updateConversationFromBackend(conversationEntity: Conversation) {
    const conversationData = await this.conversationService.getConversationById(conversationEntity);
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
    await Promise.all(conversationEntities.map(conversationEntity => this.fetchUsersAndEvents(conversationEntity)));
  }

  //##############################################################################
  // Repository interactions
  //##############################################################################

  /**
   * Deletes a conversation from the repository.
   */
  private deleteConversationFromRepository(conversationId: QualifiedId) {
    this.conversationState.conversations.remove(conversation => {
      return matchQualifiedIds(conversation, conversationId);
    });
  }

  public deleteConversation(conversationEntity: Conversation) {
    this.conversationService
      .deleteConversation(this.teamState.team().id, conversationEntity.id)
      .then(() => {
        this.deleteConversationLocally(conversationEntity, true);
      })
      .catch(() => {
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            message: t('modalConversationDeleteErrorMessage', conversationEntity.name()),
            title: t('modalConversationDeleteErrorHeadline'),
          },
        });
      });
  }

  private readonly deleteConversationLocally = async (conversationId: QualifiedId, skipNotification: boolean) => {
    const conversationEntity = this.conversationState.findConversation(conversationId);
    if (!conversationEntity) {
      return;
    }

    this.leaveCall(conversationEntity.qualifiedId, LEAVE_CALL_REASON.USER_MANUALY_LEFT_CONVERSATION);

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
    this.deleteConversationFromRepository(conversationId);
    await this.conversationService.deleteConversationFromDb(conversationId.id);
    if (isMLSConversation(conversationEntity)) {
      await this.conversationService.wipeMLSConversation(conversationEntity);
    }
  };

  public async getAllUsersInConversation(conversationId: QualifiedId): Promise<User[]> {
    const conversationEntity = await this.getConversationById(conversationId);
    const users = [this.userState.self()].concat(conversationEntity.participating_user_ets());
    return users;
  }

  /**
   * Check for conversation locally and fetch it from the server otherwise.
   * TODO(Federation): Remove "optional" from "domain"
   */
  async getConversationById(conversation_id: QualifiedId, searchInLocalDB = false): Promise<Conversation> {
    if (typeof conversation_id.id !== 'string') {
      throw new ConversationError(
        ConversationError.TYPE.NO_CONVERSATION_ID,
        ConversationError.MESSAGE.NO_CONVERSATION_ID,
      );
    }
    const localStateConversation = this.conversationState.findConversation(conversation_id);
    if (localStateConversation) {
      return localStateConversation;
    }

    if (searchInLocalDB) {
      const localDBConversation = await this.conversationService.loadConversation<BackendConversation>(
        conversation_id.id,
      );
      if (localDBConversation) {
        return this.mapConversations([localDBConversation])[0];
      }
    }

    try {
      return await this.fetchConversationById(conversation_id);
    } catch (error) {
      const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (isConversationNotFound) {
        this.logger.warn(`Failed to get conversation '${conversation_id.id}': ${error.message}`, error);
      }

      throw error;
    }
  }

  /**
   * Get all the conversations from memory.
   */
  public getLocalConversations(): Conversation[] {
    return this.conversationState.conversations();
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
      .filteredConversations()
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
    const mostRecentConversation = this.conversationState.getMostRecentConversation(true);
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
    return getNextItem(this.conversationState.visibleConversations(), conversationEntity);
  }

  /**
   * @deprecated import the `ConversationState` wherever you need it and call `getMostRecentConversation` directly from there
   */
  public getMostRecentConversation() {
    return this.conversationState.getMostRecentConversation();
  }

  /**
   * Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
   * @returns Resolve with the most active conversations
   */
  getMostActiveConversations() {
    return this.conversationService.getActiveConversationsFromDb().then(conversation_ids => {
      return conversation_ids
        .map(conversation_id => this.conversationState.findConversation(conversation_id))
        .filter((conversationEntity): conversationEntity is Conversation => !!conversationEntity);
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
  async isMessageRead(conversation_id: QualifiedId, message_id: string): Promise<boolean> {
    if (!conversation_id || !message_id) {
      return false;
    }

    try {
      const conversationEntity = await this.getConversationById(conversation_id);
      const messageEntity = await this.messageRepository.getMessageInConversationById(conversationEntity, message_id);
      return conversationEntity.last_read_timestamp() >= messageEntity.timestamp();
    } catch (error) {
      const messageNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
      if (messageNotFound) {
        return true;
      }

      throw error;
    }
  }

  /**
   * Starts the join public conversation flow.
   * Opens conversation directly when it is already known.
   *
   * @param event Custom event containing join key/code
   */
  private readonly onConversationJoin = async (event: {detail: {code: string; key: string; domain?: string}}) => {
    const {key, code, domain} = event.detail;

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
      const {id: conversationId, name: conversationName} = await this.conversationService.getConversationJoin(
        key,
        code,
      );
      const knownConversation = this.conversationState.findConversation({domain: null, id: conversationId});
      if (knownConversation?.status() === ConversationStatus.CURRENT_MEMBER) {
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, knownConversation, {});
        return;
      }
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: async () => {
            try {
              const response = await this.conversationService.postConversationJoin(key, code);
              const conversationEntity = await this.getConversationById({
                domain: domain ?? this.userState.self().domain,
                id: conversationId,
              });
              if (response) {
                await this.onMemberJoin(conversationEntity, response);
              }
              amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {});
            } catch (error) {
              switch (error.label) {
                case BackendErrorLabel.ACCESS_DENIED:
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
    const qualifiedId: QualifiedId = connectionEntity.conversationId;
    return Promise.resolve(this.conversationState.findConversation(qualifiedId))
      .then(conversationEntity => {
        if (!conversationEntity) {
          if (connectionEntity.isConnected() || connectionEntity.isOutgoingRequest()) {
            return this.fetchConversationById(qualifiedId);
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
          await this.conversationService.getConversationById(conversation);
        } catch ({code}) {
          if (code === HTTP_STATUS.NOT_FOUND) {
            this.deleteConversationLocally(conversation, true);
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
    this.logger.log(`Mapping '${connectionEntities.length}' user connection(s) to conversations`, connectionEntities);

    return connectionEntities.map(connectionEntity => this.mapConnection(connectionEntity));
  }

  /**
   * Map conversation payload.
   *
   * @param payload Payload to map
   * @param initialTimestamp Initial server and event timestamp
   * @returns Mapped conversation/s
   */
  mapConversations(
    payload: (BackendConversation | ConversationDatabaseData)[],
    initialTimestamp = this.getLatestEventTimestamp(true),
  ): Conversation[] {
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
      .filteredConversations()
      .forEach(conversationEntity => this._mapGuestStatusSelf(conversationEntity));

    if (this.teamState.isTeam()) {
      this.userState.self().inTeam(true);
      this.userState.self().isTeamMember(true);
    }
  }

  private _mapGuestStatusSelf(conversationEntity: Conversation) {
    const conversationTeamId = conversationEntity.team_id;
    const selfTeamId = this.teamState.team()?.id;
    const isConversationGuest = !!(conversationTeamId && (!selfTeamId || selfTeamId !== conversationTeamId));
    conversationEntity.isGuest(isConversationGuest);
  }

  /**
   * Save a conversation in the repository and in the database.
   * Will resolve with local conversation entity and do nothing if conversation already exists in state
   *
   * @param conversationEntity Conversation to be saved in the repository
   * @returns Resolves when conversation was saved
   */
  saveConversation(conversationEntity: Conversation) {
    const localEntity = this.conversationState.findConversation(conversationEntity);
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
    return this.conversationService.saveConversationStateInDb(conversationEntity);
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
    const userEntities = await this.userRepository.getUsersById(conversationEntity.participating_user_ids(), {
      localOnly: offline,
    });
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
  async addUsers(conversation: Conversation, userEntities: User[]) {
    /**
     * ToDo: Fetch all MLS Events from backend before doing anything else
     * Needs to be done to receive the latest epoch and avoid epoch mismatch errors
     */

    const qualifiedUsers = userEntities.map(userEntity => userEntity.qualifiedId);

    const {qualifiedId: conversationId, groupId} = conversation;

    try {
      if (conversation.isUsingMLSProtocol && groupId) {
        const {events} = await this.core.service!.conversation.addUsersToMLSConversation({
          conversationId,
          groupId,
          qualifiedUsers,
        });
        if (!!events.length) {
          events.forEach(event => this.eventRepository.injectEvent(event));
        }
      } else {
        const conversationMemberJoinEvent = await this.core.service!.conversation.addUsersToProteusConversation({
          conversationId,
          qualifiedUsers,
        });
        if (conversationMemberJoinEvent) {
          this.eventRepository.injectEvent(conversationMemberJoinEvent, EventRepository.SOURCE.BACKEND_RESPONSE);
        }
      }
    } catch (error) {
      if (isBackendError(error)) {
        this.handleAddToConversationError(error, conversation, qualifiedUsers);
      }
    }
  }

  addMissingMember(conversationEntity: Conversation, users: QualifiedId[], timestamp: number) {
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
    return this.conversationService
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
      .catch(error => this.handleAddToConversationError(error, conversationEntity, [{domain: '', id: serviceId}]));
  }

  private handleAddToConversationError(error: BackendError, conversationEntity: Conversation, userIds: QualifiedId[]) {
    switch (error.label) {
      case BackendErrorLabel.NOT_CONNECTED: {
        this.handleUsersNotConnected(userIds);
        break;
      }

      case BackendErrorLabel.BAD_GATEWAY:
      case BackendErrorLabel.SERVER_ERROR:
      case BackendErrorLabel.SERVICE_DISABLED:
      case BackendErrorLabel.TOO_MANY_SERVICES: {
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
  public async clearConversation(conversationEntity: Conversation, leaveConversation = false) {
    const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);
    const nextConversationEntity = this.getNextConversation(conversationEntity);

    if (leaveConversation) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
      this.leaveCall(conversationEntity.qualifiedId, LEAVE_CALL_REASON.USER_MANUALY_LEFT_CONVERSATION);
    }

    await this.messageRepository.updateClearedTimestamp(conversationEntity);
    await this._clearConversation(conversationEntity);

    if (leaveConversation) {
      await this.removeMember(conversationEntity, this.userState.self().qualifiedId);
    }

    if (isActiveConversation) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextConversationEntity, {});
    }
  }

  async leaveGuestRoom(): Promise<void> {
    if (this.userState.self().isTemporaryGuest()) {
      const conversation = this.conversationState.getMostRecentConversation(true);
      if (conversation) {
        await this.conversationService.deleteMembers(conversation.qualifiedId, this.userState.self().qualifiedId);
      }
    }
  }

  /**
   * Remove a member from a MLS conversation
   *
   * @param conversationEntity Conversation to remove member from
   * @param userId ID of member to be removed from the conversation
   * @returns Resolves when member was removed from the conversation
   */
  private async removeMemberFromMLSConversation(conversationEntity: Conversation, userId: QualifiedId) {
    const {groupId, qualifiedId} = conversationEntity;
    const {events} = await this.core.service!.conversation.removeUsersFromMLSConversation({
      conversationId: qualifiedId,
      groupId,
      qualifiedUserIds: [userId],
    });

    if (!!events.length) {
      events.forEach(event => this.eventRepository.injectEvent(event));
    }
  }

  /**
   * Remove a member from a Proteus conversation
   *
   * @param conversationEntity Conversation to remove member from
   * @param userId ID of member to be removed from the conversation
   * @returns Resolves when member was removed from the conversation
   */
  private async removeMemberFromConversation(conversationEntity: Conversation, userId: QualifiedId) {
    const response = await this.core.service!.conversation.removeUserFromConversation(
      conversationEntity.qualifiedId,
      userId,
    );
    const roles = conversationEntity.roles();
    delete roles[userId.id];
    conversationEntity.roles(roles);
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const event = response || EventBuilder.buildMemberLeave(conversationEntity, userId, true, currentTimestamp);
    await this.eventRepository.injectEvent(event, EventRepository.SOURCE.BACKEND_RESPONSE);
    return event;
  }

  /**
   * Remove the current user from a conversation.
   *
   * @param conversationEntity Conversation to remove user from
   * @param clearContent Should we clear the conversation content from the database?
   * @returns Resolves when user was removed from the conversation
   */
  private async leaveConversation(conversationEntity: Conversation, clearContent: boolean) {
    const userQualifiedId = this.userState.self().qualifiedId;

    return clearContent
      ? this.clearConversation(conversationEntity, true)
      : this.removeMemberFromConversation(conversationEntity, userQualifiedId);
  }

  /**
   * Umbrella function to remove a member from a conversation, no matter the protocol or type.
   *
   * @param conversationEntity Conversation to remove member from
   * @param userId ID of member to be removed from the conversation
   * @param clearContent Should we clear the conversation content from the database?
   * @returns Resolves when member was removed from the conversation
   */
  public async removeMember(conversationEntity: Conversation, userId: QualifiedId, clearContent: boolean = false) {
    const isUserLeaving = this.userState.self().qualifiedId.id === userId.id;
    const isMLSConversation = conversationEntity.isUsingMLSProtocol;

    if (isUserLeaving) {
      return this.leaveConversation(conversationEntity, clearContent);
    }

    return isMLSConversation
      ? this.removeMemberFromMLSConversation(conversationEntity, userId)
      : this.removeMemberFromConversation(conversationEntity, userId);
  }

  /**
   * Remove service from conversation.
   *
   * @param conversationEntity Conversation to remove service from
   * @param user ID of service user to be removed from the conversation
   * @returns Resolves when service was removed from the conversation
   */
  public removeService(conversationEntity: Conversation, user: QualifiedId) {
    return this.conversationService.deleteBots(conversationEntity.id, user.id).then((response: any) => {
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
    const response = await this.conversationService.updateConversationName(conversationEntity.id, name);
    if (response) {
      this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
      return response;
    }
    return undefined;
  }

  /**
   * Update conversation protocol
   * This will update the protocol of the conversation and refetch the conversation to get all new fields (groupId, ciphersuite, epoch and new protocol)
   * If protocol was updated successfully, conversation protocol update system message will be injected
   *
   * @param conversationId id of the conversation
   * @param protocol new conversation protocol
   * @returns Resolves with updated conversation entity
   */
  public async updateConversationProtocol(
    conversation: Conversation,
    protocol: ConversationProtocol.MIXED | ConversationProtocol.MLS,
  ): Promise<Conversation> {
    const protocolUpdateEventResponse = await this.conversationService.updateConversationProtocol(
      conversation.qualifiedId,
      protocol,
    );
    if (protocolUpdateEventResponse) {
      await this.eventRepository.injectEvent(protocolUpdateEventResponse, EventRepository.SOURCE.BACKEND_RESPONSE);
    }

    //even if protocol was already updated (no response), we need to refetch the conversation
    return this.refreshConversationProtocolProperties(conversation);
  }

  /**
   * Refresh conversation protocol properties
   * Will refetch the conversation to get all new protocol-related fields (groupId, ciphersuite, epoch and new protocol)
   * Will update the conversation entity in memory and in the local database
   *
   * @param conversationId id of the conversation
   * @returns Resolves with updated conversation entity
   */
  private async refreshConversationProtocolProperties(conversation: Conversation) {
    //refetch the conversation to get all new fields (groupId, ciphersuite, epoch and new protocol)
    const remoteConversationData = await this.conversationService.getConversationById(conversation.qualifiedId);

    //update fields that came after protocol update
    const {cipher_suite: cipherSuite, epoch, group_id: newGroupId, protocol: newProtocol} = remoteConversationData;
    const updatedConversation = ConversationMapper.updateProperties(conversation, {
      cipherSuite,
      epoch,
      groupId: newGroupId,
      protocol: newProtocol,
    });

    await this.saveConversationStateInDb(updatedConversation);
    return updatedConversation;
  }

  /**
   * Set the global message timer
   */
  async updateConversationMessageTimer(
    conversationEntity: Conversation,
    messageTimer: number | null,
  ): Promise<ConversationMessageTimerUpdateEvent> {
    messageTimer = ConversationEphemeralHandler.validateTimer(messageTimer);

    const response = await this.conversationService.updateConversationMessageTimer(conversationEntity.id, messageTimer);
    if (response) {
      this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
    }
    return response;
  }

  public async updateConversationReceiptMode(
    conversationEntity: Conversation,
    receiptMode: ConversationReceiptModeUpdateData,
  ) {
    const response = await this.conversationService.updateConversationReceiptMode(conversationEntity.id, receiptMode);
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
    userId: QualifiedId,
    isoDate = this.serverTimeHandler.toServerTimestamp(),
  ) => {
    const userEntity = await this.userRepository.getUserById(userId);
    const eventInjections = this.conversationState
      .conversations()
      .filter(conversationEntity => {
        const conversationInTeam = conversationEntity.team_id === teamId;
        const userIsParticipant = UserFilter.isParticipant(conversationEntity, userId);
        return conversationInTeam && userIsParticipant && !conversationEntity.removed_from_conversation();
      })
      .map(conversationEntity => {
        const leaveEvent = EventBuilder.buildTeamMemberLeave(conversationEntity, userEntity, isoDate);
        return this.eventRepository.injectEvent(leaveEvent);
      });
    userEntity.isDeleted = true;
    return Promise.all(eventInjections);
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
      await this.conversationService.updateMemberProperties(conversationEntity.id, payload);
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

  public async sendTypingStart(conversationEntity: Conversation) {
    this.core.service!.conversation.sendTypingStart(conversationEntity.qualifiedId);
  }

  public async sendTypingStop(conversationEntity: Conversation) {
    this.core.service!.conversation.sendTypingStop(conversationEntity.qualifiedId);
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
      : this.conversationService.updateMemberProperties(conversationId, payload).catch(error => {
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
        this.unarchiveConversation(conversationEntity, false, ConversationRepository.eventFromStreamMessage);
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
  private async _clearConversation(conversationEntity: Conversation, timestamp?: number) {
    this.deleteMessages(conversationEntity, timestamp);

    if (conversationEntity.removed_from_conversation()) {
      await this.conversationService.deleteConversationFromDb(conversationEntity.id);
      this.deleteConversationFromRepository(conversationEntity);
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

  private async handleUsersNotConnected(userIds: QualifiedId[] = []): Promise<void> {
    const titleText = t('modalConversationNotConnectedHeadline');

    if (userIds.length > 1) {
      this.showModal(t('modalConversationNotConnectedMessageMany'), titleText);
    } else {
      // TODO(Federation): Update code once connections are implemented on the backend
      const userEntity = await this.userRepository.getUserById(userIds[0]);
      this.showModal(t('modalConversationNotConnectedMessageOne', userEntity.name()), titleText);
    }
  }

  private showModal(messageText: string, titleText: string) {
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
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

    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
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
    conversationId: QualifiedId;
    legalHoldStatus: LegalHoldStatus;
    timestamp?: number;
    userId: QualifiedId;
  }) => {
    if (typeof legalHoldStatus === 'undefined') {
      return;
    }
    if (!timestamp) {
      const conversation = conversationEntity || this.conversationState.findConversation(conversationId);
      timestamp = conversation.getNextTimestamp();
    }
    const legalHoldUpdateMessage = EventBuilder.buildLegalHoldMessage(
      conversationId || conversationEntity?.qualifiedId,
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
    id = createUuid(),
  ) {
    const fileRestrictionMessage = EventBuilder.buildFileTypeRestricted(conversation, user, isIncoming, fileExt, id);
    await this.eventRepository.injectEvent(fileRestrictionMessage);
  }

  //##############################################################################
  // Event callbacks
  //##############################################################################

  private logConversationEvent(event: IncomingEvent, source: EventSource) {
    if (event.type === CONVERSATION_EVENT.TYPING) {
      // Prevent logging typing events
      return;
    }
    const {time, from, qualified_conversation, type} = event;
    const extra: Record<string, unknown> = {};
    extra.messageId = 'id' in event && event.id;
    const logMessage = `Conversation Event: '${type}' (Source: ${source})`;
    switch (event.type) {
      case ClientEvent.CONVERSATION.ASSET_ADD:
        extra.contentType = event.data.content_type;
        extra.size = event.data.content_length;
        extra.status = event.data.status;

      case ClientEvent.CONVERSATION.MESSAGE_ADD:
        extra.sender = event.from_client_id;
        break;

      case ClientEvent.CONVERSATION.MESSAGE_DELETE:
        extra.deletedMessage = event.data.message_id;
    }
    this.logger.info(logMessage, {time, from, type, qualified_conversation, ...extra});
  }

  /**
   * Listener for incoming events.
   *
   * @param event JSON data for event
   * @param source Source of event
   * @returns Resolves when event was handled
   */
  private readonly onConversationEvent = (event: IncomingEvent, source = EventRepository.SOURCE.STREAM) => {
    this.logConversationEvent(event, source);
    return this.handleConversationEvent(event, source);
  };

  private handleConversationEvent(
    eventJson: IncomingEvent,
    eventSource: EventSource = EventSource.NOTIFICATION_STREAM,
  ) {
    if (!eventJson) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const ignoredEvents: (CONVERSATION_EVENT | CLIENT_CONVERSATION_EVENT)[] = [CONVERSATION_EVENT.MLS_MESSAGE_ADD];
    if (ignoredEvents.includes(eventJson?.type)) {
      return Promise.resolve();
    }

    const {conversation, qualified_conversation, data: eventData, type} = eventJson;
    // data.conversationId is always the conversationId that should be read first. If not found we can fallback to qualified_conversation or conversation
    const conversationId: QualifiedId = eventData?.conversationId
      ? {domain: '', id: eventData.conversationId}
      : qualified_conversation || {domain: '', id: conversation};

    const inSelfConversation = this.conversationState.isSelfConversation(conversationId);
    if (inSelfConversation) {
      const typesInSelfConversation = [
        CONVERSATION_EVENT.MEMBER_UPDATE,
        ClientEvent.CONVERSATION.MESSAGE_HIDDEN,
        /**
         * As of today (07/07/2022) the backend sends `WELCOME` message to the user's own
         * conversation (not the actual conversation that the welcome should be part of)
         */
        CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
      ];

      if (type === CONVERSATION_EVENT.MLS_WELCOME_MESSAGE) {
        useMLSConversationState.getState().markAsEstablished(eventData);
      }

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
      : this.getConversationById(conversationId, true);
    let previouslyArchived = false;

    return onEventPromise
      .then((conversationEntity: Conversation) => {
        if (conversationEntity) {
          // Check if conversation was archived
          previouslyArchived = conversationEntity.is_archived();
          const isPastMemberStatus = conversationEntity.status() === ConversationStatus.PAST_MEMBER;
          const isMemberJoinType = type === CONVERSATION_EVENT.MEMBER_JOIN;

          if (previouslyArchived && isPastMemberStatus && isMemberJoinType) {
            this.unarchiveConversation(conversationEntity, false, ConversationRepository.eventFromStreamMessage);
          }
          const isBackendTimestamp = eventSource !== EventSource.INJECTED;
          if (type !== CONVERSATION_EVENT.MEMBER_JOIN && type !== CONVERSATION_EVENT.MEMBER_LEAVE) {
            conversationEntity.updateTimestampServer(eventJson.server_time || eventJson.time, isBackendTimestamp);
          }
        }
        return conversationEntity;
      })
      .then(conversationEntity => this.checkLegalHoldStatus(conversationEntity, eventJson))
      .then(conversationEntity => this.checkConversationParticipants(conversationEntity, eventJson, eventSource))
      .then(conversationEntity => this.triggerFeatureEventHandlers(conversationEntity, eventJson))
      .then(
        conversationEntity =>
          this.reactToConversationEvent(conversationEntity, eventJson, eventSource) as Promise<EntityObject>,
      )
      .then((entityObject = {} as EntityObject) => {
        if (type !== CONVERSATION_EVENT.MEMBER_JOIN && type !== CONVERSATION_EVENT.MEMBER_LEAVE) {
          this.handleConversationNotification(entityObject as EntityObject, eventSource, previouslyArchived);
        }
      })
      .catch((error: BaseError) => {
        const ignoredErrorTypes: string[] = [
          ConversationError.TYPE.MESSAGE_NOT_FOUND,
          ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ];

        const isRemovedFromConversation = (error as unknown as BackendError).label === BackendErrorLabel.ACCESS_DENIED;
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
      const allParticipants = conversationEntity.participating_user_ids().concat(this.userState.self().qualifiedId);
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
        this.logger.warn(message);

        const qualifiedSender: QualifiedId = {domain: '', id: senderId};

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
      conversation: conversationId,
      qualified_conversation,
      qualified_from,
      data: {legal_hold_status: messageLegalHoldStatus},
      from: userId,
      time: isoTimestamp,
    } = eventJson;
    const timestamp = new Date(isoTimestamp).getTime();
    const qualifiedConversation = qualified_conversation || {domain: '', id: conversationId};
    const qualifiedUser = qualified_from || {domain: '', id: userId};

    await this.injectLegalHoldMessage({
      beforeTimestamp: true,
      conversationId: qualifiedConversation,
      legalHoldStatus: messageLegalHoldStatus,
      timestamp,
      userId: qualifiedUser,
    });

    await this.messageRepository.updateAllClients(conversationEntity, true);

    if (messageLegalHoldStatus === conversationEntity.legalHoldStatus()) {
      return conversationEntity;
    }

    await this.injectLegalHoldMessage({
      conversationId: qualifiedConversation,
      legalHoldStatus: conversationEntity.legalHoldStatus(),
      timestamp,
      userId: qualifiedUser,
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
  private async reactToConversationEvent(
    conversationEntity: Conversation,
    eventJson: IncomingEvent,
    eventSource: EventSource,
  ) {
    switch (eventJson.type) {
      case CONVERSATION_EVENT.CREATE:
        return this.onCreate(eventJson, eventSource);

      case CONVERSATION_EVENT.DELETE:
        return this.deleteConversationLocally({domain: conversationEntity.domain, id: eventJson.conversation}, false);

      case CONVERSATION_EVENT.MEMBER_JOIN:
        return this.onMemberJoin(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MEMBER_LEAVE:
      case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE:
        return this.onMemberLeave(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MEMBER_UPDATE:
        return this.onMemberUpdate(conversationEntity, eventJson);

      case CONVERSATION_EVENT.TYPING:
        return this.onTyping(conversationEntity, eventJson);

      case CONVERSATION_EVENT.PROTOCOL_UPDATE:
        return this.onProtocolUpdate(conversationEntity, eventJson);

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
      case ClientEvent.CONVERSATION.FAILED_TO_ADD_USERS:
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
          this.messageRepository.sendConfirmationStatus(conversationEntity, messageEntity, Confirmation.Type.DELIVERED);
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
   * Add "missed events" system message to conversation.
   */
  private readonly onMissedEvents = (): void => {
    this.conversationState
      .filteredConversations()
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
        const isOutgoingRequest = userEntity?.isOutgoingRequest();
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
    const {conversation, data: eventData, qualified_conversation, time} = eventJson;
    const eventTimestamp = new Date(time).getTime();
    const initialTimestamp = isNaN(eventTimestamp) ? this.getLatestEventTimestamp(true) : eventTimestamp;
    const conversationId = qualified_conversation ?? {
      domain: eventJson.qualified_conversation?.domain ?? '',
      id: conversation,
    };
    try {
      const existingConversationEntity = this.conversationState.findConversation(conversationId);
      if (existingConversationEntity) {
        throw new ConversationError(ConversationError.TYPE.NO_CHANGES, ConversationError.MESSAGE.NO_CHANGES);
      }

      const conversationData = !eventSource
        ? // If there is no source, it means its a conversation created locally, no need to fetch it again
          eventData
        : await this.conversationService.getConversationById(conversationId);

      const [conversationEntity] = this.mapConversations([conversationData], initialTimestamp);
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
      .find(userId => matchQualifiedIds(userId, {domain: creatorDomain, id: creatorId}));
    const createdBySelfUser = conversationEntity.isCreatedBySelf();

    const creatorIsParticipant = createdByParticipant || createdBySelfUser;

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
    const connectionEntity = this.connectionRepository.getConnectionByConversationId(conversationEntity.qualifiedId);
    const isPendingConnection = connectionEntity?.isIncomingRequest();
    if (isPendingConnection) {
      return Promise.resolve();
    }

    const eventData = eventJson.data;

    if (eventData.users) {
      eventData.users.forEach(otherMember => {
        const otherId = otherMember.qualified_id || {domain: '', id: otherMember.id};
        const isSelfUser = matchQualifiedIds(otherId, this.userState.self());
        const isParticipatingUser = !!conversationEntity
          .participating_user_ids()
          .find(participatingUser =>
            matchQualifiedIds(participatingUser, otherMember.qualified_id || {domain: '', id: otherMember.id}),
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
          conversationEntity.participating_user_ids.push({domain: '', id: userId});
        }
      });
    }

    // Self user is a creator of the event
    const isFromSelf = eventJson.from === this.userState.self().id;

    const containsSelfId = eventData.user_ids.includes(this.userState.self().id);
    const containsSelfQualifiedId = !!eventData.users?.some(
      ({qualified_id: qualifiedId}) => qualifiedId && matchQualifiedIds(qualifiedId, this.userState.self().qualifiedId),
    );

    const selfUserJoins = containsSelfId || containsSelfQualifiedId;

    if (selfUserJoins) {
      conversationEntity.status(ConversationStatus.CURRENT_MEMBER);
      await this.conversationRoleRepository.updateConversationRoles(conversationEntity);
    }

    const updateSequence =
      selfUserJoins || connectionEntity?.isConnected()
        ? this.updateConversationFromBackend(conversationEntity)
        : Promise.resolve();

    const qualifiedUserIds =
      eventData.users?.map(user => user.qualified_id) || eventData.user_ids.map(userId => ({domain: '', id: userId}));

    if (conversationEntity.isUsingMLSProtocol) {
      const isSelfJoin = isFromSelf && selfUserJoins;
      await this.handleMLSConversationMemberJoin(conversationEntity, isSelfJoin);
    }

    return updateSequence
      .then(() => this.updateParticipatingUserEntities(conversationEntity, false, true))
      .then(() => this.addEventToConversation(conversationEntity, eventJson))
      .then(({messageEntity}) => {
        this.verificationStateHandler.onMemberJoined(conversationEntity, qualifiedUserIds);
        return {conversationEntity, messageEntity};
      });
  }

  /**
   * Handles member join event on mls group - updating mls conversation state and adding other self clients if user has joined by itself.
   *
   * @param conversation Conversation member joined to
   * @param isSelfJoin whether user has joined by itself, if so we need to add other self clients to mls group
   */
  private async handleMLSConversationMemberJoin(conversation: Conversation, isSelfJoin: boolean) {
    const {groupId} = conversation;

    if (!groupId) {
      throw new Error(`groupId not found for MLS conversation ${conversation.id}`);
    }

    const isMLSConversationEstablished = await this.core.service!.conversation.isMLSConversationEstablished(groupId);

    if (!isMLSConversationEstablished) {
      return;
    }

    const mlsConversationState = useMLSConversationState.getState();

    const isMLSConversationMarkedAsEstablished = mlsConversationState.isEstablished(groupId);

    if (!isMLSConversationMarkedAsEstablished) {
      // If the conversation was not previously marked as established and the core if aware of this conversation, we can mark is as established
      mlsConversationState.markAsEstablished(groupId);
    }

    if (isSelfJoin) {
      // if user has joined and was also event creator (eg. joined via guest link) we need to add its other clients to mls group
      try {
        await addOtherSelfClientsToMLSConversation(
          conversation,
          this.userState.self().qualifiedId,
          this.core.clientId,
          this.core,
        );
      } catch (error) {
        this.logger.warn(`Failed to add other self clients to MLS conversation: ${conversation.id}`, error);
      }
    }
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
    eventJson: ConversationMemberLeaveEvent | TeamMemberLeaveEvent | MemberLeaveEvent,
  ): Promise<{conversationEntity: Conversation; messageEntity: Message} | undefined> {
    const {data: eventData, from} = eventJson;
    const isFromSelf = from === this.userState.self().id;
    const removesSelfUser = eventData.user_ids.includes(this.userState.self().id);
    const selfLeavingClearedConversation = isFromSelf && removesSelfUser && conversationEntity.is_cleared();

    if (removesSelfUser) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
      this.leaveCall(
        conversationEntity.qualifiedId,
        LEAVE_CALL_REASON.USER_IS_REMOVED_BY_AN_ADMIN_OR_LEFT_ON_ANOTHER_CLIENT,
      );

      if (this.userState.self().isTemporaryGuest()) {
        eventJson.from = this.userState.self().id;
      }

      if (isMLSConversation(conversationEntity)) {
        await this.conversationService.wipeMLSConversation(conversationEntity);
      }
    } else {
      // Update conversation roles (in case the removed user had some special role and it's not the self user)
      await this.conversationRoleRepository.updateConversationRoles(conversationEntity);
    }

    if (!selfLeavingClearedConversation) {
      const {messageEntity} = await this.addEventToConversation(conversationEntity, eventJson);
      (messageEntity as MemberMessage)
        .userEntities()
        .filter(userEntity => !userEntity.isMe)
        .forEach(userEntity => {
          conversationEntity.participating_user_ids.remove(userId => matchQualifiedIds(userId, userEntity));

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
  private async onMemberUpdate(
    conversationEntity: Conversation,
    eventJson: Pick<ConversationMemberUpdateEvent, 'data' | 'from'> & {conversation?: string},
  ) {
    const {conversation, data: eventData, from} = eventJson;
    const conversationId = {domain: '', id: conversation || '' /* TODO(federation) add domain on the sender side */};

    const isConversationRoleUpdate = !!eventData.conversation_role;
    if (isConversationRoleUpdate) {
      const {target, qualified_target, conversation_role} = eventData;
      const userId = qualified_target || {domain: '', id: target};
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
    const inSelfConversation = this.conversationState.isSelfConversation(conversationId);
    if (!inSelfConversation && conversation && !isBackendEvent) {
      this.logger.warn(
        `A conversation update message was not sent in the selfConversation. Skipping conversation update`,
      );
      return;
    }

    const isFromSelf = !this.userState.self() || from === this.userState.self().id;
    if (!isFromSelf) {
      this.logger.warn(`A conversation update message was not sent by the self user. Skipping conversation update`);
      return;
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
      await this._clearConversation(conversationEntity, conversationEntity.cleared_timestamp());
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
      return conversationEntity.updateTimestamps(conversationEntity.getNewestMessage(), true);
    }

    if (!allowsAllFiles()) {
      const fileName = event.data.info.name;
      const contentType = event.data.content_type;
      if (!isAllowedFile(fileName, contentType)) {
        // TODO(Federation): Update code once sending assets is implemented on the backend
        const user = await this.userRepository.getUserById({domain: '', id: event.from});
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

    return this.messageRepository
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
        return this.messageRepository.deleteMessageById(conversationEntity, eventData.message_id);
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
    const {conversation, qualified_conversation, data: eventData, from} = eventJson;

    const conversationId = qualified_conversation || {id: conversation, domain: ''};
    try {
      const inSelfConversation = this.conversationState.isSelfConversation(conversationId);
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
      const conversationEntity = await this.getConversationById({domain: '', id: eventData.conversation_id});
      return await this.messageRepository.deleteMessageById(conversationEntity, eventData.message_id);
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
      const messageEntity = await this.messageRepository.getMessageInConversationById(conversationEntity, messageId);
      if (!messageEntity || !messageEntity.isContent()) {
        const type = messageEntity ? messageEntity.type : 'unknown';

        this.logger.error(`Cannot react to '${type}' message '${messageId}' in conversation '${conversationId}'`);
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
        this.logger.error(logMessage, error);
        throw error;
      }
    }
    return undefined;
  }

  private async onButtonActionConfirmation(conversationEntity: Conversation, eventJson: ButtonActionConfirmationEvent) {
    const {messageId, buttonId} = eventJson.data;
    try {
      const messageEntity = await this.messageRepository.getMessageInConversationById(conversationEntity, messageId);
      if (!messageEntity || !messageEntity.isComposite()) {
        const type = messageEntity ? messageEntity.type : 'unknown';

        this.logger.error(
          `Cannot react to '${type}' message '${messageId}' in conversation '${conversationEntity.id}'`,
        );
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
        this.logger.error(log, error);
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
   * Conversation protocol was updated.
   *
   * @param conversation Conversation that has updated protocol
   * @param eventJson JSON data of 'conversation.protocol-update' event
   * @returns Resolves when the event was handled
   */
  private async onProtocolUpdate(conversation: Conversation, eventJson: ConversationProtocolUpdateEvent) {
    const updatedConversation = await this.refreshConversationProtocolProperties(conversation);
    return this.addEventToConversation(updatedConversation, eventJson);
  }

  /**
   * A user started or stopped typing in a conversation.
   *
   * @param conversationEntity Conversation entity that will the user will be added to its active typing users
   * @param eventJson JSON data of 'conversation.typing' event
   * @returns Resolves when the event was handled
   */
  private async onTyping(conversationEntity: Conversation, eventJson: ConversationTypingEvent) {
    const qualifiedUserId = eventJson.qualified_from || {domain: '', id: eventJson.from};
    const qualifiedUser = conversationEntity
      .participating_user_ets()
      .find(user => matchQualifiedIds(user, qualifiedUserId));

    if (!qualifiedUser) {
      this.logger.warn(`No sender user found for event of type ${eventJson.type}`);
      return {conversationEntity};
    }

    const conversationId = conversationEntity.id;
    const {addTypingUser, getTypingUser, removeTypingUser} = useTypingIndicatorState.getState();

    const oldUser = getTypingUser(qualifiedUser, conversationId);
    if (oldUser) {
      window.clearTimeout(oldUser.timerId);
    }

    if (eventJson.data.status === CONVERSATION_TYPING.STARTED) {
      const timerId = window.setTimeout(() => {
        removeTypingUser(qualifiedUser, conversationId);
      }, TYPING_TIMEOUT * 6); // 10000 * 6 => 1 minute

      const typingUser = {conversationId, user: qualifiedUser, timerId};

      addTypingUser(typingUser);
    }

    if (eventJson.data.status === CONVERSATION_TYPING.STOPPED) {
      removeTypingUser(qualifiedUser, conversationId);
    }

    return {conversationEntity};
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
      // TODO(federation) map domain
      this.getConversationById({domain: '', id: messageEntity.conversation_id}).then(conversationEntity => {
        const isPingFromSelf = messageEntity.user().isMe && messageEntity.isPing();
        const deleteForSelf = isPingFromSelf || conversationEntity.removed_from_conversation();
        if (deleteForSelf) {
          return this.messageRepository.deleteMessage(conversationEntity, messageEntity);
        }

        const userIds = conversationEntity.isGroup()
          ? [this.userState.self().qualifiedId, {domain: messageEntity.fromDomain ?? '', id: messageEntity.from}]
          : undefined;
        return this.messageRepository.deleteMessageForEveryone(conversationEntity, messageEntity, {
          optimisticRemoval: true,
          targetedUsers: userIds,
        });
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
   * Convert multiple JSON events into entities and validate them
   *
   * @param events Event data
   * @param conversationEntity Conversation entity the events will be added to
   * @returns Resolves with an array of mapped messages
   */
  private async validateMessages(
    events: EventRecord[],
    conversationEntity: Conversation,
    {offline}: {offline?: boolean} = {},
  ) {
    const mappedEvents = await this.event_mapper.mapJsonEvents(events, conversationEntity);
    const updatedEvents = (await this.updateMessagesUserEntities(mappedEvents, {
      localOnly: offline,
    })) as ContentMessage[];
    const validatedMessages = (await this.ephemeralHandler.validateMessages(updatedEvents)) as ContentMessage[];
    return validatedMessages;
  }

  /**
   * Convert multiple JSON events into entities, validate and add them to a given conversation.
   *
   * @param events Event data
   * @param conversationEntity Conversation entity the events will be added to
   * @param prepend Should existing messages be prepended
   * @returns Resolves with an array of mapped messages
   */
  private async addEventsToConversation(
    events: EventRecord[],
    conversationEntity: Conversation,
    {prepend = true, offline}: {prepend?: boolean; offline?: boolean} = {},
  ) {
    const validatedMessages = await this.validateMessages(events, conversationEntity, {offline});
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
  private async fetchUsersAndEvents(conversationEntity: Conversation) {
    if (!conversationEntity.is_loaded() && !conversationEntity.is_pending()) {
      await this.updateParticipatingUserEntities(conversationEntity);
      await this.getUnreadEvents(conversationEntity);
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
      const userEntity = await this.userRepository.getUserById({domain: messageEntity.fromDomain, id: from});
      const reactionMessageEntity = new Message(messageEntity.id, SuperType.REACTION);
      reactionMessageEntity.user(userEntity);
      reactionMessageEntity.reaction = event_data.reaction;
      return {conversationEntity, messageEntity: reactionMessageEntity};
    }

    return {conversationEntity};
  }

  private updateMessagesUserEntities(messageEntities: Message[], options: {localOnly?: boolean} = {}) {
    return Promise.all(messageEntities.map(messageEntity => this.updateMessageUserEntities(messageEntity, options)));
  }

  /**
   * Updates the user entities that are part of a message.
   *
   * @param messageEntity Message to be updated
   * @returns Resolves when users have been update
   */
  private async updateMessageUserEntities(messageEntity: Message, options: {localOnly?: boolean} = {}) {
    const userEntity = await this.userRepository.getUserById(
      {
        domain: messageEntity.fromDomain,
        id: messageEntity.from,
      },
      options,
    );
    messageEntity.user(userEntity);
    if (isMemberMessage(messageEntity) || messageEntity.hasOwnProperty('userEntities')) {
      return this.userRepository
        .getUsersById((messageEntity as MemberMessage).userIds(), options)
        .then(userEntities => {
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
          .getUsersById(userIds.map(userId => ({domain: '', id: userId})))
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
  private deleteMessages(conversationEntity: Conversation, timestamp?: number) {
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

  findConversationByGroupId(groupId: string): Conversation | undefined {
    return this.conversationState.findConversationByGroupId(groupId);
  }

  public async cleanupEphemeralMessages(): Promise<void> {
    this.conversationState.conversations().forEach(async conversationEntity => {
      const messages = (await this.eventService.loadEphemeralEvents(conversationEntity.id)) as EventRecord[];
      this.validateMessages(messages, conversationEntity);
    });
  }
}
