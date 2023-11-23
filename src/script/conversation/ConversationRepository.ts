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
} from '@wireapp/api-client/lib/conversation/';
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
  ConversationMLSWelcomeEvent,
} from '@wireapp/api-client/lib/event';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import type {BackendError} from '@wireapp/api-client/lib/http/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {MLSCreateConversationResponse} from '@wireapp/core/lib/conversation';
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
import {supportsMLS} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {ACCESS_STATE} from './AccessState';
import {extractClientDiff} from './ClientMismatchUtil';
import {updateAccessRights} from './ConversationAccessPermission';
import {ConversationEphemeralHandler} from './ConversationEphemeralHandler';
import {ConversationFilter} from './ConversationFilter';
import {ConversationLabelRepository} from './ConversationLabelRepository';
import {ConversationDatabaseData, ConversationMapper} from './ConversationMapper';
import {ConversationRoleRepository} from './ConversationRoleRepository';
import {
  isMLSConversation,
  isProteus1to1ConversationWithUser,
  isProteusConversation,
  MLSConversation,
  ProteusConversation,
} from './ConversationSelectors';
import {ConversationService} from './ConversationService';
import {ConversationState} from './ConversationState';
import {ConversationStateHandler} from './ConversationStateHandler';
import {ConversationStatus} from './ConversationStatus';
import {ConversationVerificationState} from './ConversationVerificationState';
import {ProteusConversationVerificationStateHandler} from './ConversationVerificationStateHandler';
import {registerMLSConversationVerificationStateHandler} from './ConversationVerificationStateHandler/MLS';
import {OnConversationVerificationStateChange} from './ConversationVerificationStateHandler/shared';
import {EventMapper} from './EventMapper';
import {MessageRepository} from './MessageRepository';
import {NOTIFICATION_STATE} from './NotificationSetting';

import {AssetTransferState} from '../assets/AssetTransferState';
import {CallingRepository} from '../calling/CallingRepository';
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
import {SystemMessageType} from '../message/SystemMessageType';
import {addOtherSelfClientsToMLSConversation} from '../mls';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {SelfRepository} from '../self/SelfRepository';
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

export enum CONVERSATION_READONLY_STATE {
  READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS = 'READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS',
  READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS = 'READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS',
}

export class ConversationRepository {
  private isBlockingNotificationHandling: boolean;
  private readonly ephemeralHandler: ConversationEphemeralHandler;
  public readonly conversationLabelRepository: ConversationLabelRepository;
  public readonly conversationRoleRepository: ConversationRoleRepository;
  private readonly event_mapper: EventMapper;
  private readonly eventService: EventService;
  private readonly logger: Logger;
  public readonly stateHandler: ConversationStateHandler;
  public readonly proteusVerificationStateHandler: ProteusConversationVerificationStateHandler;

  static get CONFIG() {
    return {
      CONFIRMATION_THRESHOLD: TIME_IN_MILLIS.WEEK,
      EXTERNAL_MESSAGE_THRESHOLD: 200 * 1024,
      ESTABLISH_MLS_GROUP_AFTER_CONNECTION_IS_ACCEPTED_DELAY: 3000,
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
    private readonly selfRepository: SelfRepository,
    private readonly propertyRepository: PropertiesRepository,
    private readonly callingRepository: CallingRepository,
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
      const domain = userState.self()?.domain;

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
      const removedTeamUserIds = emptyUsers.filter(user => teamState.isInTeam(user)).map(user => user.qualifiedId);

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
          conversation?.verification_state(ConversationVerificationState.DEGRADED);
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

    // we register and store a handler, that we can manually trigger for incoming events from proteus and mixed conversations
    this.proteusVerificationStateHandler = new ProteusConversationVerificationStateHandler(
      this.onConversationVerificationStateChange,
      this.userState,
      this.conversationState,
    );

    if (supportsMLS()) {
      // we register a handler that will handle MLS conversations on its own
      registerMLSConversationVerificationStateHandler(
        this.onConversationVerificationStateChange,
        this.conversationState,
        this.core,
      );
    }

    this.isBlockingNotificationHandling = true;

    this.teamState.isTeam.subscribe(() => this.mapGuestStatusSelf());

    this.initSubscriptions();

    this.stateHandler = new ConversationStateHandler(this.conversationService);
    this.ephemeralHandler = new ConversationEphemeralHandler(this.eventService, {
      onMessageTimeout: this.handleMessageExpiration,
    });

    this.conversationLabelRepository = new ConversationLabelRepository(
      this.conversationState.conversations,
      this.conversationState.visibleConversations,
      propertyRepository.propertiesService,
    );

    this.conversationRoleRepository = new ConversationRoleRepository(this.teamRepository, this.conversationService);

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

    this.selfRepository.on('selfSupportedProtocolsUpdated', this.onSelfUserSupportedProtocolsUpdated);
    this.userRepository.on('supportedProtocolsUpdated', this.onUserSupportedProtocolsUpdated);
  }

  public initMLSConversationRecoveredListener() {
    return this.conversationService.addMLSConversationRecoveredListener(this.onMLSConversationRecovered);
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
      let response: MLSCreateConversationResponse;
      const isMLSConversation = payload.protocol === ConversationProtocol.MLS;
      if (isMLSConversation) {
        response = await this.core.service!.conversation.createMLSConversation(
          payload,
          this.userState.self().qualifiedId,
          this.core.clientId,
        );
      } else {
        const {conversation, failedToAdd} = await this.core.service!.conversation.createProteusConversation(payload);
        response = {conversation, events: [], failedToAdd};
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

      const {failedToAdd} = response;

      if (failedToAdd) {
        const failedToAddUsersEvent = EventBuilder.buildFailedToAddUsersEvent(
          failedToAdd,
          conversationEntity,
          this.userState.self().id,
        );
        await this.eventRepository.injectEvent(failedToAddUsersEvent);
      }

      return conversationEntity;
    } catch (error) {
      if (isBackendError(error)) {
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

      await this.saveConversation(conversationEntity);

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
        await this.addCreationMessage(conversationEntity, this.userState.self().isTemporaryGuest());
      }
    }

    return mappedMessageEntities;
  }

  private async addCreationMessage(
    conversationEntity: Conversation,
    isTemporaryGuest: boolean,
    timestamp?: number,
    eventSource?: EventSource,
  ): Promise<void> {
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

    await this.eventRepository.injectEvent(creationEvent, eventSource);
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
    const conversationEntity = await this.getInitialised1To1Conversation(user_et);
    if (conversationEntity) {
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

    this.callingRepository.leaveCall(conversationEntity.qualifiedId, LEAVE_CALL_REASON.USER_MANUALY_LEFT_CONVERSATION);

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
   * Get an initialised 1:1 conversation with a user.
   * If conversation does not exist, it will be created (assuming the user is in the current team or there's a connection with this user).
   * It will compare the lists of supported protocols of the current user and the requested user and choose the common protocol for the conversation.
   * If the common protocol is MLS, it will try to initialise the conversation with MLS and establish it.
   * If the common protocol is Proteus, it will try to initialise the conversation with Proteus.
   * If there's no common protocol, it will pick the protocol that is supported by the current user and mark conversation as read-only.
   * @param userEntity User entity for whom to get the conversation
   * @param isLiveUpdate Whether the conversation is being initialised because of a live update (e.g. some websocket event)
   * @returns Resolves with the initialised 1:1 conversation with requested user
   */
  async getInitialised1To1Conversation(userEntity: User, isLiveUpdate = false): Promise<Conversation | null> {
    const {qualifiedId: otherUserId} = userEntity;

    const {protocol, isMLSSupportedByTheOtherUser, isProteusSupportedByTheOtherUser} =
      await this.getProtocolFor1to1Conversation(otherUserId);

    const localMLSConversation = this.conversationState.findMLS1to1Conversation(otherUserId);

    if (protocol === ConversationProtocol.MLS || localMLSConversation) {
      /**
       * When mls 1:1 conversation initialisation is triggered by some live update (e.g other user updates their supported protocols), it's very likely that we will also receive a welcome message shortly.
       * We have to add a delay to make sure the welcome message is not wasted, in case the self client would establish mls group themselves before receiving the welcome.
       */
      const shouldDelayMLSGroupEstablishment = isLiveUpdate && isMLSSupportedByTheOtherUser;
      return this.initMLS1to1Conversation(otherUserId, isMLSSupportedByTheOtherUser, shouldDelayMLSGroupEstablishment);
    }

    const proteusConversation = await this.getOrCreateProteus1To1Conversation(userEntity);

    if (!proteusConversation) {
      return null;
    }

    return this.initProteus1to1Conversation(proteusConversation.qualifiedId, isProteusSupportedByTheOtherUser);
  }

  /**
   * Get or create a proteus 1:1 conversation with a user.
   * If a conversation does not exist, but user is in the current team, or there's a connection with this user, proteus 1:1 conversation will be created and saved.
   * @param userEntity User entity for whom to get the conversation
   * @returns Resolves with the conversation with requested user (if in the current team or there's a connection with this user), otherwise `null`
   */
  private async getOrCreateProteus1To1Conversation(userEntity: User): Promise<Conversation | null> {
    const selfUser = this.userState.self();
    const inCurrentTeam = selfUser && selfUser.teamId && userEntity.teamId === selfUser.teamId;

    if (inCurrentTeam) {
      return this.getOrCreateProteusTeam1to1Conversation(userEntity);
    }

    const conversationId = userEntity.connection().conversationId;
    try {
      const conversationEntity = await this.getConversationById(conversationId);
      conversationEntity.connection(userEntity.connection());
      await this.updateParticipatingUserEntities(conversationEntity);
      return conversationEntity;
    } catch (error) {
      const isConversationNotFound =
        error instanceof ConversationError && error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (!isConversationNotFound) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get or create a proteus team 1to1 conversation with a user. If a conversation does not exist, it will be created.
   * @param userEntity User entity for whom to get the conversation
   * @returns Resolves with the conversation with requested user
   */
  private async getOrCreateProteusTeam1to1Conversation(userEntity: User): Promise<Conversation> {
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

      return isProteus1to1ConversationWithUser(userEntity.qualifiedId)(conversationEntity);
    });

    if (matchingConversationEntity) {
      return matchingConversationEntity;
    }
    return this.createGroupConversation([userEntity]);
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

  private readonly updateConversationReadOnlyState = async (
    conversationEntity: Conversation,
    conversationReadOnlyState: CONVERSATION_READONLY_STATE | null,
  ) => {
    conversationEntity.readOnlyState(conversationReadOnlyState);
    await this.saveConversationStateInDb(conversationEntity);
  };

  private readonly getProtocolFor1to1Conversation = async (
    otherUserId: QualifiedId,
    shouldRefreshUser = false,
  ): Promise<{
    protocol: ConversationProtocol.PROTEUS | ConversationProtocol.MLS;
    isMLSSupportedByTheOtherUser: boolean;
    isProteusSupportedByTheOtherUser: boolean;
  }> => {
    const otherUserSupportedProtocols = await this.userRepository.getUserSupportedProtocols(
      otherUserId,
      shouldRefreshUser,
    );
    const selfUserSupportedProtocols = await this.selfRepository.getSelfSupportedProtocols();

    const isMLSSupportedByTheOtherUser = otherUserSupportedProtocols.includes(ConversationProtocol.MLS);
    const isProteusSupportedByTheOtherUser = otherUserSupportedProtocols.includes(ConversationProtocol.PROTEUS);

    const commonProtocols = otherUserSupportedProtocols.filter(protocol =>
      selfUserSupportedProtocols.includes(protocol),
    );

    if (commonProtocols.includes(ConversationProtocol.MLS)) {
      return {protocol: ConversationProtocol.MLS, isMLSSupportedByTheOtherUser, isProteusSupportedByTheOtherUser};
    }

    if (commonProtocols.includes(ConversationProtocol.PROTEUS)) {
      return {protocol: ConversationProtocol.PROTEUS, isMLSSupportedByTheOtherUser, isProteusSupportedByTheOtherUser};
    }

    //if common protocol can't be found, we use preferred protocol of the self user
    const preferredProtocol = selfUserSupportedProtocols.includes(ConversationProtocol.MLS)
      ? ConversationProtocol.MLS
      : ConversationProtocol.PROTEUS;

    return {protocol: preferredProtocol, isMLSSupportedByTheOtherUser, isProteusSupportedByTheOtherUser};
  };

  /**
   * Tries to find a MLS 1:1 conversation between self user and given userId in the local state,
   * otherwise it will try to fetch it from the backend and save it in both memory and database.
   *
   * @param otherUserId - id of the other user
   * @returns MLS conversation entity
   */
  private readonly getMLS1to1Conversation = async (otherUserId: QualifiedId): Promise<MLSConversation> => {
    const localMLSConversation = this.conversationState.findMLS1to1Conversation(otherUserId);

    if (localMLSConversation) {
      return localMLSConversation;
    }

    return this.fetchMLS1to1Conversation(otherUserId);
  };

  /**
   * Fetches a MLS 1:1 conversation between self user and given userId from backend and saves it in both local state and database.
   *
   * @param otherUserId - id of the other user
   * @returns MLS conversation entity
   */
  private readonly fetchMLS1to1Conversation = async (otherUserId: QualifiedId): Promise<MLSConversation> => {
    const remoteConversation = await this.conversationService.getMLS1to1Conversation(otherUserId);
    const [conversationEntity] = this.mapConversations([remoteConversation]);

    const conversation = await this.saveConversation(conversationEntity);

    if (!isMLSConversation(conversation)) {
      throw new Error('Conversation is not MLS');
    }

    return conversation;
  };

  /**
   * Will migrate proteus 1:1 conversation to mls 1:1 conversation.
   * All the events will be moved to the new conversation and proteus conversation will be deleted locally.
   * Proteus 1:1 conversation will be hidden in the UI and replaced with mls 1:1 conversation.
   *
   * @param proteusConversation - proteus 1:1 conversation
   * @param mlsConversation - mls 1:1 conversation
   * @returns {shouldOpenMLS1to1Conversation} - whether proteus 1:1 was active conversation and mls 1:1 conversation should be opened in the UI
   */
  private readonly replaceProteus1to1WithMLS = async (
    otherUserId: QualifiedId,
    mlsConversation: MLSConversation,
  ): Promise<{shouldOpenMLS1to1Conversation: boolean}> => {
    const proteusConversations = this.conversationState.findProteus1to1Conversations(otherUserId);

    if (!proteusConversations || proteusConversations.length < 1) {
      return {shouldOpenMLS1to1Conversation: false};
    }

    this.logger.info(`Replacing proteus 1:1 conversation(s) with mls 1:1 conversation ${mlsConversation.id}`);

    this.logger.info('Moving events from proteus 1:1 conversation to MLS 1:1 conversation');

    await Promise.allSettled(
      proteusConversations.map(proteusConversation =>
        this.eventService.moveEventsToConversation(proteusConversation.id, mlsConversation.id),
      ),
    );

    const mostRecentlyUsedProteusConversation = proteusConversations.sort(
      (a, b) => b.last_event_timestamp() - a.last_event_timestamp(),
    )[0];

    // Before we delete the proteus 1:1 conversation, we need to make sure all the local properties are also migrated
    const {
      archivedState,
      archivedTimestamp,
      cleared_timestamp,
      localMessageTimer,
      last_event_timestamp,
      last_read_timestamp,
      last_server_timestamp,
      legalHoldStatus,
      mutedState,
      mutedTimestamp,
      status,
      verification_state,
    } = mostRecentlyUsedProteusConversation;

    const updates: Partial<Record<keyof Conversation, any>> = {
      archivedState: archivedState(),
      archivedTimestamp: archivedTimestamp(),
      cleared_timestamp: cleared_timestamp(),
      localMessageTimer: localMessageTimer(),
      last_event_timestamp: last_event_timestamp(),
      last_read_timestamp: last_read_timestamp(),
      last_server_timestamp: last_server_timestamp(),
      legalHoldStatus: legalHoldStatus(),
      mutedState: mutedState(),
      mutedTimestamp: mutedTimestamp(),
      status: status(),
      verification_state: verification_state(),
    };

    ConversationMapper.updateProperties(mlsConversation, updates);

    await Promise.allSettled(
      proteusConversations.map(async proteusConversation => {
        this.logger.info(`Deleting proteus 1:1 conversation ${proteusConversation.id}`);
        await this.deleteConversationLocally(proteusConversation.qualifiedId, true);
        return this.blacklistConversation(proteusConversation.qualifiedId);
      }),
    );

    const wasProteus1to1ActiveConversation =
      !!proteusConversations &&
      proteusConversations.some(conversation => this.conversationState.isActiveConversation(conversation));

    const isMLS1to1ActiveConversation = this.conversationState.isActiveConversation(mlsConversation);

    const shouldOpenMLS1to1Conversation = wasProteus1to1ActiveConversation && !isMLS1to1ActiveConversation;

    return {shouldOpenMLS1to1Conversation};
  };

  private async blacklistConversation(conversationId: QualifiedId) {
    return this.conversationService.blacklistConversation(conversationId);
  }

  private async removeConversationFromBlacklist(conversationId: QualifiedId) {
    return this.conversationService.removeConversationFromBlacklist(conversationId);
  }

  /**
   * Will establish mls 1:1 conversation.
   * If proteus conversation is provided, it will be replaced with mls 1:1 conversation.
   *
   * @param mlsConversation - mls 1:1 conversation
   * @param otherUserId - id of the other user
   */
  private readonly establishMLS1to1Conversation = async (
    mlsConversation: MLSConversation,
    otherUserId: QualifiedId,
  ): Promise<MLSConversation> => {
    const selfUser = this.userState.self();

    if (!selfUser) {
      throw new Error('Self user is not available!');
    }

    const conversationService = this.core.service?.conversation;

    if (!conversationService) {
      throw new Error('Conversation service is not available!');
    }

    const isAlreadyEstablished = await this.conversationService.isMLSGroupEstablishedLocally(mlsConversation.groupId);

    if (isAlreadyEstablished) {
      this.logger.info(`MLS 1:1 conversation with user ${otherUserId.id} is already established.`);
      return mlsConversation;
    }

    const {members, epoch} = await conversationService.establishMLS1to1Conversation(
      mlsConversation.groupId,
      {client: this.core.clientId, user: selfUser.qualifiedId},
      otherUserId,
    );

    this.logger.info(`MLS 1:1 conversation with user ${otherUserId.id} was established.`);

    const otherMembers = members.others.map(other => ({domain: other.qualified_id?.domain || '', id: other.id}));

    ConversationMapper.updateProperties(mlsConversation, {participating_user_ids: otherMembers, epoch});
    await this.updateParticipatingUserEntities(mlsConversation);

    return mlsConversation;
  };

  /**
   * Will initialise mls 1:1 conversation.
   * If both users support MLS protocol, mls 1:1 conversation will be established (otherwise it will be marked as readonly).
   * If proteus conversation between the two users exists, it will be replaced with mls 1:1 conversation.
   *
   * @param otherUserId - id of the other user
   * @param isMLSSupportedByTheOtherUser - whether mls is supported by the other user
   * @param shouldDelayGroupEstablishment - whether mls group establishment should be delayed
   */
  private readonly initMLS1to1Conversation = async (
    otherUserId: QualifiedId,
    isMLSSupportedByTheOtherUser: boolean,
    shouldDelayGroupEstablishment = false,
  ): Promise<MLSConversation> => {
    // When receiving some live updates via websocket, e.g. after connection request is accepted, both sides (users) of connection will react to conversation status update event.
    // We want to reduce the possibility of two users trying to establish an MLS group at the same time.
    // A user that has previously sent a connection request will wait for a short period of time before establishing an MLS group.
    // It's very likely that this user will receive a welcome message after the user that has accepted a connection request, establishes an MLS group without any delay.
    if (shouldDelayGroupEstablishment) {
      this.logger.info(`Delaying MLS 1:1 conversation with user ${otherUserId.id}...`);
      await new Promise(resolve =>
        setTimeout(resolve, ConversationRepository.CONFIG.ESTABLISH_MLS_GROUP_AFTER_CONNECTION_IS_ACCEPTED_DELAY),
      );
    }

    this.logger.info(`Initialising MLS 1:1 conversation with user ${otherUserId.id}...`);
    const mlsConversation = await this.getMLS1to1Conversation(otherUserId);
    const otherUser = await this.userRepository.getUserById(otherUserId);
    mlsConversation.connection(otherUser.connection());

    // If proteus 1:1 conversation with the same user is known, we have to make sure it is replaced with mls 1:1 conversation.
    const {shouldOpenMLS1to1Conversation} = await this.replaceProteus1to1WithMLS(otherUserId, mlsConversation);

    if (mlsConversation.participating_user_ids.length === 0) {
      ConversationMapper.updateProperties(mlsConversation, {participating_user_ids: [otherUser.qualifiedId]});
      await this.updateParticipatingUserEntities(mlsConversation);
    }

    // If mls is not supported by the other user we do not establish the group yet.
    if (!isMLSSupportedByTheOtherUser) {
      const isMLSGroupEstablishedLocally = await this.conversationService.isMLSGroupEstablishedLocally(
        mlsConversation.groupId,
      );

      // If group was not yet established, we mark the mls conversation as readonly
      if (!isMLSGroupEstablishedLocally) {
        await this.updateConversationReadOnlyState(
          mlsConversation,
          CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS,
        );
        this.logger.info(
          `MLS 1:1 conversation with user ${otherUserId.id} is not supported by the other user, conversation will become readonly`,
        );
      } else {
        await this.updateConversationReadOnlyState(mlsConversation, null);
      }

      if (shouldOpenMLS1to1Conversation) {
        // If proteus conversation was previously active conversaiton, we want to make mls 1:1 conversation active.
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, mlsConversation, {});
      }

      return mlsConversation;
    }

    // If mls is supported by the other user, we can establish the group and remove readonly state from the conversation.
    await this.updateConversationReadOnlyState(mlsConversation, null);

    const establishedMLSConversation = await this.establishMLS1to1Conversation(mlsConversation, otherUserId);

    if (shouldOpenMLS1to1Conversation) {
      // If proteus conversation was previously active conversaiton, we want to make mls 1:1 conversation active.
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, mlsConversation, {});
    }

    return establishedMLSConversation;
  };

  /**
   * Will initialise proteus 1:1 conversation.
   * If both users support Proteus protocol, it will simply return the proteus conversation.
   * If proteus is not supported by the other user, proteus conversation will be marked as readonly.
   *
   * @param proteusConversationId - id of the proteus conversation
   * @param doesOtherUserSupportProteus - whether proteus is supported by the other user
   */
  private readonly initProteus1to1Conversation = async (
    proteusConversationId: QualifiedId,
    doesOtherUserSupportProteus: boolean,
  ): Promise<ProteusConversation> => {
    const localProteusConversation = this.conversationState.findConversation(proteusConversationId);
    const proteusConversation = localProteusConversation || (await this.fetchConversationById(proteusConversationId));

    if (!isProteusConversation(proteusConversation)) {
      throw new Error('initProteus1to1Conversation provided with conversation id of conversation that is not proteus');
    }

    // If proteus is not supported by the other user we have to mark conversation as readonly
    if (!doesOtherUserSupportProteus) {
      await this.blacklistConversation(proteusConversationId);
      await this.updateConversationReadOnlyState(
        proteusConversation,
        CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS,
      );
      return proteusConversation;
    }

    // If proteus is supported by the other user, we just return a proteus conversation and remove readonly state from it.
    await this.removeConversationFromBlacklist(proteusConversationId);
    await this.updateConversationReadOnlyState(proteusConversation, null);
    return proteusConversation;
  };

  private readonly getUserIdOf1to1Conversation = (conversation: Conversation): QualifiedId | null => {
    const is1to1Conversation = conversation.is1to1();

    if (!is1to1Conversation) {
      throw new Error(`Conversation ${conversation.id} is not of type 1:1`);
    }

    const connection = conversation.connection();
    const connectionUserId = connection && connection.userId;
    if (connectionUserId) {
      return connectionUserId;
    }

    const conversationMembersIds = conversation.participating_user_ids();
    const otherUserId = conversationMembersIds.length === 1 && conversationMembersIds[0];

    if (otherUserId) {
      return otherUserId;
    }

    return null;
  };

  /**
   * Will initialise 1:1 conversation (either team-owned or regular 1:1)
   * Will choose the protocol for 1:1 conversation based on the supported protocols of self and the other user.
   * When both users support mls, mls conversation will be established, content will be moved to mls and proteus conversation will be deleted locally.
   *
   * @param conversation - 1:1 conversation to be initialised
   * @param shouldRefreshUser - if true, user will be refreshed from backend before initialising the conversation
   */
  public readonly init1to1Conversation = async (
    conversation: Conversation,
    shouldRefreshUser = false,
  ): Promise<Conversation | null> => {
    if (!conversation.is1to1()) {
      throw new Error('Conversation is not 1:1');
    }

    const otherUserId = this.getUserIdOf1to1Conversation(conversation);

    if (!otherUserId) {
      this.logger.error(`Could not find other user id in 1:1 conversation ${conversation.id}`);
      return null;
    }

    this.logger.info(
      `Initialising 1:1 conversation ${conversation.id} of type ${conversation.type()} with user ${otherUserId.id}`,
    );

    const {protocol, isMLSSupportedByTheOtherUser, isProteusSupportedByTheOtherUser} =
      await this.getProtocolFor1to1Conversation(otherUserId, shouldRefreshUser);
    this.logger.info(
      `Protocol for 1:1 conversation ${conversation.id} with user ${otherUserId.id} is ${protocol}, ${JSON.stringify({
        isMLSSupportedByTheOtherUser,
        isProteusSupportedByTheOtherUser,
      })}`,
    );

    // When called with mls conversation, we just make sure it is initialised.
    if (isMLSConversation(conversation)) {
      return this.initMLS1to1Conversation(otherUserId, isMLSSupportedByTheOtherUser);
    }

    // If there's local mls conversation, we want to use it
    const localMLSConversation = this.conversationState.findMLS1to1Conversation(otherUserId);

    // If both users support mls or mls conversation is already known, we use it
    // we never go back to proteus conversation, even if one of the users do not support mls anymore
    // (e.g. due to the change of supported protocols in team configuration)
    if (protocol === ConversationProtocol.MLS || localMLSConversation) {
      return this.initMLS1to1Conversation(otherUserId, isMLSSupportedByTheOtherUser);
    }

    if (protocol === ConversationProtocol.PROTEUS && isProteusConversation(conversation)) {
      return this.initProteus1to1Conversation(conversation.qualifiedId, isProteusSupportedByTheOtherUser);
    }

    return null;
  };

  private readonly getConnectionConversation = async (connectionEntity: ConnectionEntity, source?: EventSource) => {
    // As of how backed works now (August 2023), proteus 1:1 conversations will always be created, even if both users support MLS conversation.
    // Proteus 1:1 conversation is created right after a connection request is sent.
    // Therefore, conversationId filed on connectionEntity will always indicate proteus 1:1 conversation.
    // We need to manually check if mls 1:1 conversation can be used instead.
    // If mls 1:1 conversation is used, proteus 1:1 conversation will be deleted locally.

    const {conversationId: proteusConversationId, userId: otherUserId} = connectionEntity;
    const localProteusConversation = this.conversationState.findConversation(proteusConversationId);

    // For connection request, we simply display proteus conversation of type 3 (connect) it will be displayed as a connection request
    if (connectionEntity.isOutgoingRequest()) {
      return localProteusConversation || this.fetchConversationById(proteusConversationId);
    }

    const isConnectionAccepted = connectionEntity.isConnected();

    // Check what protocol should be used for 1:1 conversation
    const {protocol, isMLSSupportedByTheOtherUser, isProteusSupportedByTheOtherUser} =
      await this.getProtocolFor1to1Conversation(otherUserId);

    const isWebSocketEvent = source === EventSource.WEBSOCKET;
    const shouldDelayMLSGroupEstablishment = isWebSocketEvent && isMLSSupportedByTheOtherUser;

    const localMLSConversation = this.conversationState.findMLS1to1Conversation(otherUserId);

    // If it's accepted, initialise conversation so it's ready to be used
    if (isConnectionAccepted) {
      if (protocol === ConversationProtocol.MLS || localMLSConversation) {
        return this.initMLS1to1Conversation(
          otherUserId,
          isMLSSupportedByTheOtherUser,
          shouldDelayMLSGroupEstablishment,
        );
      }

      if (protocol === ConversationProtocol.PROTEUS) {
        return this.initProteus1to1Conversation(proteusConversationId, isProteusSupportedByTheOtherUser);
      }
    }

    // It's not connection request and conversation is not accepted, we never fetch the conversation from backend
    // If we already know mls 1:1 conversation, we use it, even if proteus protocol was now choosen as common,
    // we do not support switching back to proteus after mls conversation was established,
    // only proteus -> mls migration is supported, never the other way around.
    if (localMLSConversation) {
      return this.initMLS1to1Conversation(otherUserId, isMLSSupportedByTheOtherUser, shouldDelayMLSGroupEstablishment);
    }

    return protocol === ConversationProtocol.PROTEUS ? localProteusConversation : undefined;
  };

  /**
   * Maps user connection to the corresponding conversation.
   *
   * @note If there is no conversation it will request it from the backend
   *
   * @param connectionEntity Connection entity
   * @param source Event source that has triggered the mapping
   * @returns Resolves when connection was mapped return value
   */
  private readonly mapConnection = async (
    connectionEntity: ConnectionEntity,
    source?: EventSource,
  ): Promise<Conversation | undefined> => {
    try {
      const conversation = await this.getConnectionConversation(connectionEntity, source);

      if (!conversation) {
        return undefined;
      }

      conversation.connection(connectionEntity);

      if (connectionEntity.isConnected()) {
        conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
      }

      const updatedConversation = await this.updateParticipatingUserEntities(conversation);

      this.conversationState.conversations.notifySubscribers();

      return updatedConversation;
    } catch (error) {
      const isConversationNotFound =
        error instanceof ConversationError && error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (!isConversationNotFound) {
        throw error;
      }

      return undefined;
    }
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

  private readonly onSelfUserSupportedProtocolsUpdated = async () => {
    const one2oneConversations = this.conversationState.conversations().filter(conversation => conversation.is1to1());
    await Promise.allSettled(one2oneConversations.map(conversation => this.init1to1Conversation(conversation)));
  };

  private readonly onUserSupportedProtocolsUpdated = async ({user}: {user: User}) => {
    // After user's supported protocols are updated, we want to make sure that 1:1 conversation is initialised.
    const localMLSConversation = this.conversationState.findMLS1to1Conversation(user.qualifiedId);
    const localProteusConversation = this.conversationState.findProteus1to1Conversations(user.qualifiedId);

    const does1to1ConversationExist = localMLSConversation || localProteusConversation;

    // If conversation does not exist, we don't want to create it.
    if (!does1to1ConversationExist) {
      return;
    }

    await this.getInitialised1To1Conversation(user, true);
  };

  /**
   * Maps user connections to the corresponding conversations.
   * @param connectionEntities Connections entities
   */
  mapConnections(connectionEntities: ConnectionEntity[]): Promise<Conversation | undefined>[] {
    this.logger.log(`Mapping '${connectionEntities.length}' user connection(s) to conversations`, connectionEntities);
    return connectionEntities.map(connectionEntity => this.mapConnection(connectionEntity));
  }

  public readonly init1To1Conversations = async (connections: ConnectionEntity[], conversations: Conversation[]) => {
    if (connections.length) {
      await Promise.allSettled(this.mapConnections(connections));
    }
    await this.initTeam1To1Conversations(conversations);
  };

  private readonly initTeam1To1Conversations = async (conversations: Conversation[]) => {
    const team1To1Conversations = conversations.filter(conversation => conversation.isTeam1to1());
    await Promise.allSettled(team1To1Conversations.map(conversation => this.init1to1Conversation(conversation)));
  };

  /**
   * Map conversation payload.
   *
   * @param payload Payload to map
   * @param initialTimestamp Initial server and event timestamp
   * @returns Mapped conversation/s
   */
  mapConversations(
    payload: BackendConversation[],
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
      this.userState.self()?.isTeamMember(true);
    }
  }

  private _mapGuestStatusSelf(conversationEntity: Conversation) {
    const conversationTeamId = conversationEntity.teamId;
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
   * Get all conversations from the local state.
   * @returns All conversations from the local state
   */
  public getAllLocalConversations() {
    return this.conversationState.conversations();
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

  private onConversationVerificationStateChange: OnConversationVerificationStateChange = async ({
    conversationEntity,
    conversationVerificationState,
    verificationMessageType,
    userIds = [],
  }) => {
    switch (conversationVerificationState) {
      case ConversationVerificationState.VERIFIED:
        const allVerifiedEvent = EventBuilder.buildAllVerified(conversationEntity);
        await this.eventRepository.injectEvent(allVerifiedEvent);
        break;
      case ConversationVerificationState.DEGRADED:
        if (verificationMessageType) {
          const event = EventBuilder.buildDegraded(conversationEntity, userIds, verificationMessageType);
          await this.eventRepository.injectEvent(event);
        } else {
          this.logger.error('onConversationVerificationStateChange: Missing verificationMessageType while degrading');
        }
        break;
      default:
        break;
    }
  };

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

    const {qualifiedId: conversationId} = conversation;

    try {
      if (isMLSConversation(conversation)) {
        const {events} = await this.core.service!.conversation.addUsersToMLSConversation({
          conversationId,
          groupId: conversation.groupId,
          qualifiedUsers,
        });
        if (!!events.length) {
          events.forEach(event => this.eventRepository.injectEvent(event));
        }
      } else {
        const {failedToAdd, event: memberJoinEvent} =
          await this.core.service!.conversation.addUsersToProteusConversation({
            conversationId,
            qualifiedUsers,
          });
        if (memberJoinEvent) {
          await this.eventRepository.injectEvent(memberJoinEvent, EventRepository.SOURCE.BACKEND_RESPONSE);
        }
        if (failedToAdd) {
          await this.eventRepository.injectEvent(
            EventBuilder.buildFailedToAddUsersEvent(failedToAdd, conversation, this.userState.self().id),
            EventRepository.SOURCE.INJECTED,
          );
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
   * Clear conversation.
   * It will update conversation's cleared timestamp on BE and clear all conversation content.
   *
   * @param conversation Conversation to clear content from
   * @param timestamp Timestamp of the event
   */
  public async clearConversation(conversation: Conversation) {
    await this.messageRepository.updateClearedTimestamp(conversation);
    return this.clearConversationContent(conversation, new Date().getTime());
  }

  /**
   * Clears conversation content.
   * It will clear all messages and events from the conversation and re-apply the conversation creation event.
   *
   * @param conversation Conversation to clear content from
   * @param timestamp Timestamp of the event
   */
  private async clearConversationContent(conversation: Conversation, timestamp: number) {
    await this.deleteMessages(conversation, timestamp);
    await this.addCreationMessage(conversation, !!this.userState.self()?.isTemporaryGuest(), timestamp);
    conversation.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.CLEARED);
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
  private async removeMembersFromMLSConversation(conversationEntity: MLSConversation, userIds: QualifiedId[]) {
    const {groupId, qualifiedId} = conversationEntity;
    const {events} = await this.core.service!.conversation.removeUsersFromMLSConversation({
      conversationId: qualifiedId,
      groupId,
      qualifiedUserIds: userIds,
    });

    return events;
  }

  /**
   * Remove a member from a Proteus conversation
   *
   * @param conversation Conversation to remove member from
   * @param userId ID of member to be removed from the conversation
   * @returns Resolves when member was removed from the conversation
   */
  private async removeMembersFromConversation(conversation: Conversation, userIds: QualifiedId[]) {
    return await Promise.all(
      userIds.map(async userId => {
        const event = await this.core.service!.conversation.removeUserFromConversation(
          conversation.qualifiedId,
          userId,
        );
        const roles = conversation.roles();
        delete roles[userId.id];
        conversation.roles(roles);
        return event;
      }),
    );
  }

  /**
   * Remove the current user from a conversation.
   *
   * @param conversation Conversation to remove the self user from
   * @returns Resolves when the self user was removed from the conversation
   */
  public async leaveConversation(conversation: Conversation) {
    const userQualifiedId = this.userState.self().qualifiedId;

    const events = await this.removeMembersFromConversation(conversation, [userQualifiedId]);
    await this.eventRepository.injectEvents(events, EventRepository.SOURCE.BACKEND_RESPONSE);
  }

  /**
   * Umbrella function to remove a member from a conversation (from backend and locally), no matter the protocol or type.
   *
   * @param conversationEntity Conversation to remove member from
   * @param userId ID of member to be removed from the conversation
   * @param clearContent Should we clear the conversation content from the database?
   * @returns Resolves when member was removed from the conversation
   */
  public async removeMembers(conversationEntity: Conversation, userIds: QualifiedId[]) {
    const events = isMLSConversation(conversationEntity)
      ? await this.removeMembersFromMLSConversation(conversationEntity, userIds)
      : await this.removeMembersFromConversation(conversationEntity, userIds);

    await this.eventRepository.injectEvents(events, EventRepository.SOURCE.BACKEND_RESPONSE);
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
        : EventBuilder.buildMemberLeave(conversationEntity, [user], this.userState.self().id, currentTimestamp);

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
   * Set the global message timer
   */
  async updateConversationMessageTimer(
    conversationEntity: Conversation,
    messageTimer: number | null,
  ): Promise<ConversationMessageTimerUpdateEvent> {
    messageTimer = ConversationEphemeralHandler.validateTimer(messageTimer);

    const response = await this.conversationService.updateConversationMessageTimer(
      conversationEntity.qualifiedId,
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
    const response = await this.conversationService.updateConversationReceiptMode(
      conversationEntity.qualifiedId,
      receiptMode,
    );
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
        const conversationInTeam = conversationEntity.teamId === teamId;
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
      await this.conversationService.updateMemberProperties(conversationEntity.qualifiedId, payload);
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

    const conversationId = conversationEntity.qualifiedId;

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
    const dataConversationId: string = (eventData as any)?.conversationId;
    // data.conversationId is always the conversationId that should be read first. If not found we can fallback to qualified_conversation or conversation
    const conversationId: QualifiedId = dataConversationId
      ? {domain: '', id: dataConversationId}
      : qualified_conversation || {domain: '', id: conversation};

    const inSelfConversation = this.conversationState.isSelfConversation(conversationId);
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
      : this.getConversationById(conversationId, true);

    return onEventPromise
      .then((conversationEntity: Conversation) => {
        if (conversationEntity) {
          const isBackendTimestamp = eventSource !== EventSource.INJECTED;

          const eventsToSkip: (CLIENT_CONVERSATION_EVENT | CONVERSATION_EVENT)[] = [
            CONVERSATION_EVENT.MEMBER_LEAVE,
            CONVERSATION_EVENT.MEMBER_JOIN,
            CONVERSATION_EVENT.DELETE,
          ];

          const shouldUpdateTimestampServer = !eventsToSkip.includes(type);

          if (shouldUpdateTimestampServer) {
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
      .then((entityObject = {} as EntityObject) =>
        this.handleConversationNotification(entityObject as EntityObject, eventSource, type),
      )
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
        switch (eventJson.type) {
          case CONVERSATION_EVENT.MEMBER_LEAVE:
          case CONVERSATION_EVENT.MEMBER_JOIN:
          case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE:
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
    } = eventJson as any;
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

      case CONVERSATION_EVENT.RENAME:
        return this.onRename(conversationEntity, eventJson, eventSource === EventRepository.SOURCE.WEB_SOCKET);

      case CONVERSATION_EVENT.MLS_WELCOME_MESSAGE:
        return this.onMLSWelcomeMessage(conversationEntity, eventJson);

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
      case ClientEvent.CONVERSATION.FEDERATION_STOP:
      case ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE:
      case ClientEvent.CONVERSATION.LOCATION:
      case ClientEvent.CONVERSATION.MISSED_MESSAGES:
      case ClientEvent.CONVERSATION.MLS_CONVERSATION_RECOVERED:
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
   * @returns Resolves when the conversation was updated
   */
  private async handleConversationNotification(
    entityObject: EntityObject,
    eventSource: EventSource,
    eventType: CLIENT_CONVERSATION_EVENT | CONVERSATION_EVENT,
  ) {
    const {conversationEntity, messageEntity} = entityObject;

    if (!conversationEntity) {
      return;
    }

    const eventsToSkip: (CLIENT_CONVERSATION_EVENT | CONVERSATION_EVENT)[] = [
      CONVERSATION_EVENT.MEMBER_JOIN,
      CONVERSATION_EVENT.MEMBER_LEAVE,
    ];

    if (!eventsToSkip.includes(eventType)) {
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
      }
    }

    if (conversationEntity.is_cleared()) {
      conversationEntity.cleared_timestamp(0);
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

  /**
   * Add "mls conversation recovered" system message to conversation.
   */
  private readonly onMLSConversationRecovered = (conversationId: QualifiedId): void => {
    const conversation = this.conversationState.findConversation(conversationId);

    if (!conversation) {
      return;
    }
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();

    const event = EventBuilder.buildMLSConversationRecovered(conversation, currentTimestamp);

    void this.eventRepository.injectEvent(event);
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
          await this.addCreationMessage(conversationEntity, false, initialTimestamp, eventSource);
        }
        await this.updateParticipatingUserEntities(conversationEntity);
        this.proteusVerificationStateHandler.onConversationCreate(conversationEntity);
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

    if (isMLSConversation(conversationEntity)) {
      const isSelfJoin = isFromSelf && selfUserJoins;
      await this.handleMLSConversationMemberJoin(conversationEntity, isSelfJoin);
    }

    return updateSequence
      .then(() => this.updateParticipatingUserEntities(conversationEntity, false, true))
      .then(() => this.addEventToConversation(conversationEntity, eventJson))
      .then(({messageEntity}) => {
        this.proteusVerificationStateHandler.onMemberJoined(conversationEntity, qualifiedUserIds);
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

    const doesMLSGroupExistLocally = await this.conversationService.mlsGroupExistsLocally(groupId);

    if (!doesMLSGroupExistLocally) {
      return;
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
    const {data: eventData} = eventJson;
    const removesSelfUser = eventData.user_ids.includes(this.userState.self().id);

    if (removesSelfUser) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
      this.callingRepository.leaveCall(
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
      /**
       * @note We have to call pushClients -> setClientsForConv avs api whenever
       * someone is removed from the conversation in order to make conference calling
       * encryption keys rotate on involuntary participant leave.
       */
      await this.callingRepository.pushClients();
      // Update conversation roles (in case the removed user had some special role and it's not the self user)
      await this.conversationRoleRepository.updateConversationRoles(conversationEntity);
    }

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

    this.proteusVerificationStateHandler.onMemberLeft(conversationEntity);

    return {conversationEntity, messageEntity};
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
      await this.clearConversationContent(conversationEntity, conversationEntity.cleared_timestamp());
    }

    if (isActiveConversation && conversationEntity.is_archived()) {
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
        await this.eventService.updateEventSequentially({primary_key: messageEntity.primary_key, ...changes});
      }
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
   * User has received a welcome message in a conversation.
   *
   * @param conversationEntity Conversation entity user has received a welcome message in
   * @param eventJson JSON data of 'conversation.mls-welcome' event
   * @returns Resolves when the event was handled
   */
  private async onMLSWelcomeMessage(conversationEntity: Conversation, eventJson: ConversationMLSWelcomeEvent) {
    // If we receive a welcome message in mls 1:1 conversation, we need to make sure proteus 1:1 is hidden (if it exists)

    if (conversationEntity.type() !== CONVERSATION_TYPE.ONE_TO_ONE || !isMLSConversation(conversationEntity)) {
      return;
    }

    const [otherUserId] = conversationEntity.participating_user_ids();

    if (!otherUserId) {
      return;
    }

    await this.initMLS1to1Conversation(otherUserId, true);
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
    conversationEntity.removeMessages();
    return this.eventService.deleteEvents(conversationEntity.id, iso_date);
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

    if (conversationEntity.teamId && conversationEntity.isGroup()) {
      return !!conversationEntity.receiptMode();
    }

    return false;
  }

  public async cleanupEphemeralMessages(): Promise<void> {
    this.conversationState.conversations().forEach(async conversationEntity => {
      const messages = (await this.eventService.loadEphemeralEvents(conversationEntity.id)) as EventRecord[];
      this.validateMessages(messages, conversationEntity);
    });
  }
}
