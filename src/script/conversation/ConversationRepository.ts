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
import {
  Asset,
  ButtonAction,
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
  Asset as ProtobufAsset,
  LinkPreview,
} from '@wireapp/protocol-messaging';
import {flatten} from 'underscore';
import {ConnectionStatus} from '@wireapp/api-client/dist/connection';
import {RequestCancellationError} from '@wireapp/api-client/dist/user';
import {ReactionType} from '@wireapp/core/dist/conversation';
import {WebAppEvents} from '@wireapp/webapp-events';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {
  CONVERSATION_EVENT,
  ConversationMessageTimerUpdateEvent,
  ConversationRenameEvent,
} from '@wireapp/api-client/dist/event';
import {
  DefaultConversationRoleName as DefaultRole,
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_ACCESS,
  CONVERSATION_TYPE,
  NewConversation,
  NewOTRMessage,
  Conversation as BackendConversation,
  ClientMismatch,
} from '@wireapp/api-client/dist/conversation';
import {ConversationCreateData, ConversationReceiptModeUpdateData} from '@wireapp/api-client/dist/conversation/data';

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {PromiseQueue} from 'Util/PromiseQueue';
import {Declension, joinNames, t} from 'Util/LocalizerUtil';
import {getDifference, getNextItem} from 'Util/ArrayUtil';
import {arrayToBase64, createRandomUuid, loadUrlBlob, sortGroupsByLastEvent, noop} from 'Util/util';
import {allowsAllFiles, getFileExtensionOrName, isAllowedFile} from 'Util/FileTypeUtil';
import {areMentionsDifferent, isTextDifferent} from 'Util/messageComparator';
import {
  capitalizeFirstChar,
  compareTransliteration,
  sortByPriority,
  startsWith,
  sortUsersByPriority,
} from 'Util/StringUtil';

import {encryptAesAsset} from '../assets/AssetCrypto';

import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';

import {ClientEvent} from '../event/Client';
import {EventTypeHandling} from '../event/EventTypeHandling';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {EventRepository} from '../event/EventRepository';
import {EventBuilder} from '../conversation/EventBuilder';

import {Conversation, SerializedConversation} from '../entity/Conversation';
import {Message} from '../entity/message/Message';

import * as trackingHelpers from '../tracking/Helpers';

import {ConversationMapper, ConversationDatabaseData} from './ConversationMapper';
import {ConversationStateHandler} from './ConversationStateHandler';
import {EventInfoEntity} from './EventInfoEntity';
import {EventMapper} from './EventMapper';
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
import {EventName} from '../tracking/EventName';

import {SystemMessageType} from '../message/SystemMessageType';
import {StatusType} from '../message/StatusType';
import {SuperType} from '../message/SuperType';
import {MessageCategory} from '../message/MessageCategory';
import {Config} from '../Config';

import {BaseError, BASE_ERROR_TYPE} from '../error/BaseError';
import {BackendClientError} from '../error/BackendClientError';
import {showLegalHoldWarning} from '../legal-hold/LegalHoldWarning';
import * as LegalHoldEvaluator from '../legal-hold/LegalHoldEvaluator';
import {DeleteConversationMessage} from '../entity/message/DeleteConversationMessage';
import {ConversationRoleRepository} from './ConversationRoleRepository';
import {ConversationError} from '../error/ConversationError';
import {Segmentation} from '../tracking/Segmentation';
import {ConversationService} from './ConversationService';
import {AssetRepository} from '../assets/AssetRepository';
import {ClientRepository} from '../client/ClientRepository';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {CryptographyRepository, Recipients} from '../cryptography/CryptographyRepository';
import {LinkPreviewRepository} from '../links/LinkPreviewRepository';
import {TeamRepository} from '../team/TeamRepository';
import {UserRepository} from '../user/UserRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {MessageSender} from '../message/MessageSender';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {ContentMessage} from '../entity/message/ContentMessage';
import {TeamEntity} from '../team/TeamEntity';
import {User} from '../entity/User';
import {EventService} from '../event/EventService';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {QuoteEntity} from '../message/QuoteEntity';
import {CompositeMessage} from '../entity/message/CompositeMessage';
import {EventSource} from '../event/EventSource';
import {MemberMessage} from '../entity/message/MemberMessage';
import {MentionEntity} from '../message/MentionEntity';
import {AudioMetaData, VideoMetaData, ImageMetaData} from '@wireapp/core/dist/conversation/content';
import {FileAsset} from '../entity/message/FileAsset';
import {Text as TextAsset} from '../entity/message/Text';
import {roundLogarithmic} from 'Util/NumberUtil';
import type {EventRecord} from '../storage';

type ConversationEvent = {conversation: string; id: string};
type ConversationDBChange = {obj: EventRecord; oldObj: EventRecord};
type FetchPromise = {reject_fn: (error: ConversationError) => void; resolve_fn: (conversation: Conversation) => void};
type EventJson = any;
type EntityObject = {conversationEntity: Conversation; messageEntity: ContentMessage};

export class ConversationRepository {
  private init_handled: number;
  private init_promise?: {reject_fn: (reason?: any) => void; resolve_fn: (value?: unknown) => void};
  private init_total: number;
  private readonly block_event_handling: ko.Observable<boolean>;
  private readonly conversationMapper: ConversationMapper;
  private readonly conversations_cleared: ko.ObservableArray<Conversation>;
  private readonly conversationsWithNewEvents: Map<any, any>;
  private readonly ephemeralHandler: ConversationEphemeralHandler;
  private readonly event_mapper: EventMapper;
  private readonly eventService: EventService;
  private readonly fetching_conversations: Record<string, FetchPromise[]>;
  public leaveCall: (conversationId: string) => void;
  private readonly logger: Logger;
  private readonly receiving_queue: PromiseQueue;
  private readonly sorted_conversations: ko.PureComputed<Conversation[]>;
  private readonly teamMembers: ko.PureComputed<User[]>;
  public readonly active_conversation: ko.Observable<Conversation>;
  public readonly clientMismatchHandler: ClientMismatchHandler;
  public readonly connectedUsers: ko.PureComputed<User[]>;
  public readonly conversationLabelRepository: ConversationLabelRepository;
  public readonly conversationRoleRepository: ConversationRoleRepository;
  public readonly conversations_archived: ko.ObservableArray<Conversation>;
  public readonly conversations_unarchived: ko.ObservableArray<Conversation>;
  public readonly conversations: ko.ObservableArray<Conversation>;
  public readonly filtered_conversations: ko.PureComputed<Conversation[]>;
  public readonly isTeam: ko.PureComputed<boolean>;
  public readonly self_conversation: ko.PureComputed<Conversation>;
  public readonly selfUser: ko.Observable<User>;
  public readonly stateHandler: ConversationStateHandler;
  public readonly team: ko.Observable<TeamEntity>;
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
    public readonly conversation_service: ConversationService,
    private readonly assetRepository: AssetRepository,
    private readonly clientRepository: ClientRepository,
    private readonly connectionRepository: ConnectionRepository,
    private readonly cryptography_repository: CryptographyRepository,
    private readonly eventRepository: EventRepository,
    private readonly link_repository: LinkPreviewRepository,
    public readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly propertyRepository: PropertiesRepository,
    private readonly messageSender: MessageSender,
    private readonly serverTimeHandler: ServerTimeHandler,
  ) {
    this.eventService = eventRepository.eventService;

    this.logger = getLogger('ConversationRepository');

    this.conversationMapper = new ConversationMapper();
    this.event_mapper = new EventMapper();
    this.verificationStateHandler = new ConversationVerificationStateHandler(
      this,
      this.eventRepository,
      this.serverTimeHandler,
    );
    this.clientMismatchHandler = new ClientMismatchHandler(this, this.cryptography_repository, this.userRepository);

    this.active_conversation = ko.observable();
    this.conversations = ko.observableArray([]);

    this.isTeam = this.teamRepository.isTeam;
    this.isTeam.subscribe(() => this.map_guest_status_self());
    this.team = this.teamRepository.team;
    this.teamMembers = this.teamRepository.teamMembers;

    this.selfUser = this.userRepository.self;

    this.block_event_handling = ko.observable(true);
    this.fetching_conversations = {};
    this.conversationsWithNewEvents = new Map();
    this.block_event_handling.subscribe(eventHandlingState => {
      if (!eventHandlingState) {
        this._checkChangedConversations();
      }
    });

    this.self_conversation = ko.pureComputed(() => this.find_conversation_by_id(this.selfUser()?.id));

    this.filtered_conversations = ko.pureComputed(() => {
      return this.conversations().filter(conversationEntity => {
        const states_to_filter = [ConnectionStatus.BLOCKED, ConnectionStatus.CANCELLED, ConnectionStatus.PENDING];

        if (conversationEntity.isSelf() || states_to_filter.includes(conversationEntity.connection().status())) {
          return false;
        }

        return !(conversationEntity.is_cleared() && conversationEntity.removed_from_conversation());
      });
    });

    this.sorted_conversations = ko.pureComputed(() => this.filtered_conversations().sort(sortGroupsByLastEvent));

    this.receiving_queue = new PromiseQueue({name: 'ConversationRepository.Receiving'});
    this.messageSender = messageSender;

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
      const inviter = inviterId ? this.userRepository.users().find(({id}) => id === inviterId) : null;
      const connectedUsers = inviter ? [inviter] : [];
      const selfTeamId = this.selfUser().teamId;
      for (const conversation of this.conversations()) {
        for (const user of conversation.participating_user_ets()) {
          const isNotService = !user.isService;
          const isNotIncluded = !connectedUsers.includes(user);
          if (isNotService && isNotIncluded && (user.teamId === selfTeamId || user.isConnected())) {
            connectedUsers.push(user);
          }
        }
      }
      return connectedUsers;
    });

    this.userRepository.directlyConnectedUsers = this.connectedUsers;

    this.conversationLabelRepository = new ConversationLabelRepository(
      this.conversations,
      this.conversations_unarchived,
      propertyRepository.propertiesService,
    );

    this.conversationRoleRepository = new ConversationRoleRepository(this);
    this.leaveCall = noop;
  }

  checkMessageTimer(messageEntity: ContentMessage): void {
    this.ephemeralHandler.checkMessageTimer(messageEntity, this.serverTimeHandler.getTimeOffset());
  }

  private _initStateUpdates(): void {
    ko.computed(() => {
      const conversationsArchived: Conversation[] = [];
      const conversationsCleared: Conversation[] = [];
      const conversationsUnarchived: Conversation[] = [];

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

  private _init_subscriptions(): void {
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

  private async _updateLocalMessageEntity({obj: updatedEvent, oldObj: oldEvent}: ConversationDBChange): Promise<void> {
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

  private _deleteLocalMessageEntity({oldObj: deletedEvent}: ConversationDBChange): void {
    const conversationEntity = this.find_conversation_by_id(deletedEvent.conversation);
    if (conversationEntity) {
      conversationEntity.remove_message_by_id(deletedEvent.id);
    }
  }

  /**
   * Remove obsolete conversations locally.
   */
  cleanup_conversations(): void {
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
   * @param userEntities Users (excluding the creator) to be part of the conversation
   * @param groupName Name for the conversation
   * @param accessState State for conversation access
   * @param options Additional conversation creation options (like "receipt_mode")
   * @returns Resolves when the conversation was created
   */
  async createGroupConversation(
    userEntities: User[],
    groupName?: string,
    accessState?: string,
    options = {},
  ): Promise<Conversation | undefined> {
    const userIds = userEntities.map(userEntity => userEntity.id);
    let payload: NewConversation & {conversation_role: string} = {
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
      const {conversationEntity} = await this._onCreate({
        conversation: response.id,
        data: response as ConversationCreateData,
      });
      return conversationEntity as Conversation;
    } catch (error) {
      this._handleConversationCreateError(error, userIds);
      return undefined;
    }
  }

  /**
   * Create a guest room.
   */
  createGuestRoom(): Promise<Conversation | undefined> {
    const groupName = t('guestRoomConversationName');
    return this.createGroupConversation([], groupName, ACCESS_STATE.TEAM.GUEST_ROOM);
  }

  /**
   * Get a conversation from the backend.
   */
  async fetch_conversation_by_id(conversationId: string): Promise<Conversation> {
    if (this.fetching_conversations.hasOwnProperty(conversationId)) {
      return new Promise((resolve, reject) => {
        this.fetching_conversations[conversationId].push({reject_fn: reject, resolve_fn: resolve});
      });
    }

    this.fetching_conversations[conversationId] = [];
    try {
      const response = await this.conversation_service.get_conversation_by_id(conversationId);
      const conversationEntity = this.mapConversations(response) as Conversation;

      this.logger.info(`Fetched conversation '${conversationId}' from backend`);
      this.save_conversation(conversationEntity);

      this.fetching_conversations[conversationId].forEach(({resolve_fn}) => resolve_fn(conversationEntity));
      delete this.fetching_conversations[conversationId];

      return conversationEntity;
    } catch (originalError) {
      if (originalError.code === HTTP_STATUS.NOT_FOUND) {
        this.deleteConversationLocally(conversationId);
      }
      const error = new ConversationError(
        ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
        originalError,
      );
      this.fetching_conversations[conversationId].forEach(({reject_fn}) => reject_fn(error));
      delete this.fetching_conversations[conversationId];

      throw error;
    }
  }

  async getConversations() {
    const remoteConversationsPromise = this.conversation_service.getAllConversations().catch(error => {
      this.logger.error(`Failed to get all conversations from backend: ${error.message}`);
      return [];
    });

    const [localConversations, remoteConversations] = await Promise.all([
      this.conversation_service.load_conversation_states_from_db<ConversationDatabaseData>(),
      remoteConversationsPromise,
    ]);
    let conversationsData: any[];
    if (!remoteConversations.length) {
      conversationsData = localConversations;
    } else {
      const data = this.conversationMapper.mergeConversation(localConversations, remoteConversations);
      conversationsData = (await this.conversation_service.save_conversations_in_db(data)) as any[];
    }
    const conversationEntities = this.mapConversations(conversationsData) as Conversation[];
    this.save_conversations(conversationEntities);
    return this.conversations();
  }

  async updateConversationStates(conversationsDatas: SerializedConversation[]) {
    const handledConversationEntities: Conversation[] = [];

    const unknownConversations: SerializedConversation[] = [];
    conversationsDatas.forEach(conversationData => {
      const localEntity = this.conversations().find(({id}) => id === conversationData.id);

      if (localEntity) {
        const entity = this.conversationMapper.updateSelfStatus(localEntity, conversationData as any, true);
        return handledConversationEntities.push(entity);
      }

      unknownConversations.push(conversationData);
      return undefined;
    });
    let conversationEntities = unknownConversations.length
      ? (this.mapConversations(unknownConversations as any[]) as Conversation[])
      : [];
    if (conversationEntities.length) {
      this.save_conversations(conversationEntities);
    }
    conversationEntities = conversationEntities.concat(handledConversationEntities);
    const handledConversationData = conversationEntities.map(conversationEntity => conversationEntity.serialize());
    this.conversation_service.save_conversations_in_db(handledConversationData);
    return conversationEntities;
  }

  /**
   * Get Message with given ID from the database.
   *
   * @param conversationEntity Conversation message belongs to
   * @param messageId ID of message
   * @param skipConversationMessages Don't use message entity from conversation
   * @param ensureUser Make sure message entity has a valid user
   * @returns Resolves with the message
   */
  getMessageInConversationById(
    conversationEntity: Conversation,
    messageId: string,
    skipConversationMessages = false,
    ensureUser = false,
  ): Promise<ContentMessage> {
    const messageEntity = !skipConversationMessages && conversationEntity.getMessage(messageId);
    const messagePromise = messageEntity
      ? Promise.resolve(messageEntity)
      : this.eventService.loadEvent(conversationEntity.id, messageId).then(event => {
          if (event) {
            return this.event_mapper.mapJsonEvent(event, conversationEntity);
          }
          throw new ConversationError(
            ConversationError.TYPE.MESSAGE_NOT_FOUND,
            ConversationError.MESSAGE.MESSAGE_NOT_FOUND,
          );
        });

    if (ensureUser) {
      return messagePromise.then(message => {
        if (message.from && !message.user().id) {
          return this.userRepository.getUserById(message.from).then(userEntity => {
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
   * @param conversationEntity Respective conversation
   * @returns Resolves with the messages
   */
  async getPrecedingMessages(conversationEntity: Conversation) {
    conversationEntity.is_pending(true);

    const firstMessageEntity = conversationEntity.getFirstMessage();
    const upperBound = firstMessageEntity
      ? new Date(firstMessageEntity.timestamp())
      : new Date(conversationEntity.get_latest_timestamp(this.serverTimeHandler.toServerTimestamp()) + 1);

    const events = (await this.eventService.loadPrecedingEvents(
      conversationEntity.id,
      new Date(0),
      upperBound,
      Config.getConfig().MESSAGES_FETCH_LIMIT,
    )) as EventRecord[];
    const mappedMessageEntities = await this._addPrecedingEventsToConversation(events, conversationEntity);
    conversationEntity.is_pending(false);
    return mappedMessageEntities;
  }

  private _addPrecedingEventsToConversation(events: EventRecord[], conversationEntity: Conversation) {
    const hasAdditionalMessages = events.length === Config.getConfig().MESSAGES_FETCH_LIMIT;

    return this._addEventsToConversation(events, conversationEntity).then(mappedMessageEntities => {
      conversationEntity.hasAdditionalMessages(hasAdditionalMessages);

      if (!hasAdditionalMessages) {
        const firstMessage = conversationEntity.getFirstMessage() as MemberMessage;
        const checkCreationMessage = firstMessage?.isMember() && firstMessage.isCreation();
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

  private _addCreationMessage(
    conversationEntity: Conversation,
    isTemporaryGuest: boolean,
    timestamp?: number,
    eventSource?: EventSource,
  ) {
    conversationEntity.hasCreationMessage = true;

    if (conversationEntity.inTeam()) {
      const allTeamMembersParticipate = this.teamMembers().length
        ? this.teamMembers().every(teamMember => conversationEntity.participating_user_ids().includes(teamMember.id))
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
   * @param padding=30 Number of messages to load around the targeted message
   * @returns Resolves with the messages
   */
  async getMessagesWithOffset(
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
    const mappedMessageEntities = await this._addEventsToConversation(messages, conversationEntity);
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
    const mappedMessageEntities = await this._addEventsToConversation(events, conversationEntity, false);
    conversationEntity.is_pending(false);
    return mappedMessageEntities;
  }

  /**
   * Get messages for given category. Category param acts as lower bound.
   */
  async get_events_for_category(conversationEntity: Conversation, category = MessageCategory.NONE): Promise<Message[]> {
    const events = (await this.eventService.loadEventsWithCategory(conversationEntity.id, category)) as EventRecord[];
    const messageEntities = (await this.event_mapper.mapJsonEvents(events, conversationEntity)) as Message[];
    return this._updateMessagesUserEntities(messageEntities);
  }

  /**
   * Search for given text in conversation.
   */
  searchInConversation(
    conversationEntity: Conversation,
    query: string,
  ): Promise<{messageEntities: Message[]; query: string} | {}> {
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
   * @param conversationEntity Conversation to start from
   */
  private async _get_unread_events(conversationEntity: Conversation): Promise<void> {
    const first_message = conversationEntity.getFirstMessage();
    const lower_bound = new Date(conversationEntity.last_read_timestamp());
    const upper_bound = first_message
      ? new Date(first_message.timestamp())
      : new Date(conversationEntity.get_latest_timestamp(this.serverTimeHandler.toServerTimestamp()) + 1);

    if (lower_bound < upper_bound) {
      conversationEntity.is_pending(true);

      try {
        const events = (await this.eventService.loadPrecedingEvents(
          conversationEntity.id,
          lower_bound,
          upper_bound,
        )) as EventRecord[];
        if (events.length) {
          this._addEventsToConversation(events, conversationEntity);
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
  async unblocked_user(user_et: User): Promise<void> {
    const conversationEntity = await this.get1To1Conversation(user_et);
    if (conversationEntity) {
      conversationEntity.status(ConversationStatus.CURRENT_MEMBER);
    }
  }

  /**
   * Update all conversations on app init.
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
   */
  updateArchivedConversations() {
    this.updateConversations(this.conversations_archived());
  }

  /**
   * Update users and events for all unarchived conversations.
   */
  updateUnarchivedConversations() {
    return this.updateConversations(this.conversations_unarchived());
  }

  updateConversationFromBackend(conversationEntity: Conversation) {
    return this.conversation_service.get_conversation_by_id(conversationEntity.id).then(conversationData => {
      const {name, message_timer} = conversationData;
      this.conversationMapper.updateProperties(conversationEntity, {name} as any);
      this.conversationMapper.updateSelfStatus(conversationEntity, {message_timer});
    });
  }

  /**
   * Get users and events for conversations.
   *
   * @note To reduce the number of backend calls we merge the user IDs of all conversations first.
   * @param conversationEntities Array of conversation entities to be updated
   */
  async updateConversations(conversationEntities: Conversation[]) {
    const mapOfUserIds = conversationEntities.map(conversationEntity => conversationEntity.participating_user_ids());
    const userIds = flatten(mapOfUserIds);

    await this.userRepository.getUsersById(userIds);
    conversationEntities.forEach(conversationEntity => this._fetch_users_and_events(conversationEntity));
  }

  //##############################################################################
  // Repository interactions
  //##############################################################################

  /**
   * Deletes a conversation from the repository.
   * @param conversation_id ID of conversation to be deleted from the repository
   */
  deleteConversationFromRepository(conversation_id: string) {
    this.conversations.remove(conversationEntity => conversationEntity.id === conversation_id);
  }

  deleteConversation(conversationEntity: Conversation) {
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

  deleteConversationLocally(conversationId: string, skipNotification = false) {
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
   * @param conversation_id ID of conversation to get
   * @returns Conversation is locally available
   */
  find_conversation_by_id(conversation_id: string) {
    // we prevent access to local conversation if the team is deleted
    return this.teamRepository.isTeamDeleted()
      ? undefined
      : this.conversations().find(conversation => conversation.id === conversation_id);
  }

  get_all_users_in_conversation(conversation_id: string) {
    return this.get_conversation_by_id(conversation_id).then(conversationEntity =>
      [this.selfUser()].concat(conversationEntity.participating_user_ets()),
    );
  }

  /**
   * Check for conversation locally and fetch it from the server otherwise.
   */
  get_conversation_by_id(conversation_id: string): Promise<Conversation> {
    if (typeof conversation_id !== 'string') {
      return Promise.reject(
        new ConversationError(ConversationError.TYPE.NO_CONVERSATION_ID, ConversationError.MESSAGE.NO_CONVERSATION_ID),
      );
    }
    const conversationEntity = this.find_conversation_by_id(conversation_id);
    if (conversationEntity) {
      return Promise.resolve(conversationEntity);
    }
    return this.fetch_conversation_by_id(conversation_id).catch(error => {
      const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (isConversationNotFound) {
        this.logger.warn(`Failed to get conversation '${conversation_id}': ${error.message}`, error);
      }

      throw error;
    });
  }

  /**
   * Get group conversations by name.
   *
   * @param query Query to be searched in group conversation names
   * @param isHandle Query string is handle
   * @returns Matching group conversations
   */
  getGroupsByName(query: string, isHandle: boolean) {
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
   * @param increment=false Increment by one for unique timestamp
   * @returns Timestamp value
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
   * @param conversationEntity Conversation to start from
   * @returns Next conversation
   */
  get_next_conversation(conversationEntity: Conversation) {
    return getNextItem(this.conversations_unarchived(), conversationEntity);
  }

  /**
   * Get unarchived conversation with the most recent event.
   * @param allConversations=false Search all conversations
   * @returns Most recent conversation
   */
  getMostRecentConversation(allConversations = false) {
    const [conversationEntity] = allConversations ? this.sorted_conversations() : this.conversations_unarchived();
    return conversationEntity;
  }

  /**
   * Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
   * @returns Resolve with the most active conversations
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
   * @param userEntity User entity for whom to get the conversation
   * @returns Resolves with the conversation with requested user
   */
  get1To1Conversation(userEntity: User): Promise<Conversation | undefined> {
    const inCurrentTeam = userEntity.inTeam() && userEntity.teamId === this.selfUser().teamId;

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
          // Disregard conversations that self is no longer part of
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
        const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
        return undefined;
      });
  }

  /**
   * Check whether conversation is currently displayed.
   */
  is_active_conversation(conversationEntity: Conversation): boolean {
    const activeConversation = this.active_conversation();
    return !!activeConversation && !!conversationEntity && activeConversation.id === conversationEntity.id;
  }

  /**
   * Check whether message has been read.
   *
   * @param conversation_id Conversation ID
   * @param message_id Message ID
   * @returns Resolves with `true` if message is marked as read
   */
  isMessageRead(conversation_id: string, message_id: string) {
    if (!conversation_id || !message_id) {
      return Promise.resolve(false);
    }

    return this.get_conversation_by_id(conversation_id)
      .then(conversationEntity => {
        return this.getMessageInConversationById(conversationEntity, message_id).then(
          message_et => conversationEntity.last_read_timestamp() >= message_et.timestamp(),
        );
      })
      .catch(error => {
        const messageNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
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
    return undefined;
  }

  async joinConversationWithCode(key: string, code: string) {
    const response = await this.conversation_service.postConversationJoin(key, code);
    if (response) {
      return this._onCreate(response as any);
    }
    return undefined;
  }

  /**
   * Maps user connection to the corresponding conversation.
   *
   * @note If there is no conversation it will request it from the backend
   * @param connectionEntity Connections
   * @param show_conversation=false Open the new conversation
   * @returns Resolves when connection was mapped return value
   */
  map_connection(connectionEntity: ConnectionEntity, show_conversation = false) {
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
          return undefined;
        }
        conversationEntity.connection(connectionEntity);

        if (connectionEntity.isConnected()) {
          conversationEntity.type(CONVERSATION_TYPE.ONE_TO_ONE);
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
        const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
      });
  }

  /**
   * @returns resolves when deleted conversations are locally deleted, too.
   */
  checkForDeletedConversations() {
    return Promise.all(
      this.conversations().map(async conversation => {
        try {
          await this.conversation_service.get_conversation_by_id(conversation.id);
        } catch ({code}) {
          if (code === HTTP_STATUS.NOT_FOUND) {
            this.deleteConversationLocally(conversation.id, true);
          }
        }
      }),
    );
  }

  /**
   * Maps user connections to the corresponding conversations.
   * @param connectionEntities Connections entities
   */
  map_connections(connectionEntities: ConnectionEntity[]) {
    this.logger.info(`Mapping '${connectionEntities.length}' user connection(s) to conversations`, connectionEntities);
    connectionEntities.map(connectionEntity => this.map_connection(connectionEntity));
  }

  /**
   * Map conversation payload.
   *
   * @param payload Payload to map
   * @param initialTimestamp=this.getLatestEventTimestamp() Initial server and event timestamp
   * @returns Mapped conversation/s
   */
  mapConversations(
    payload: BackendConversation[] | BackendConversation,
    initialTimestamp = this.getLatestEventTimestamp(),
  ) {
    const conversationsData: BackendConversation[] = Array.isArray(payload) ? payload : [payload];
    const entities = this.conversationMapper.mapConversations(
      conversationsData as ConversationDatabaseData[],
      initialTimestamp,
    );
    entities.forEach(conversationEntity => {
      this._mapGuestStatusSelf(conversationEntity);
      conversationEntity.selfUser(this.selfUser());
      conversationEntity.setStateChangePersistence(true);
    });

    return Array.isArray(payload) ? entities : entities[0];
  }

  map_guest_status_self() {
    this.filtered_conversations().forEach(conversationEntity => this._mapGuestStatusSelf(conversationEntity));

    if (this.isTeam()) {
      this.selfUser().inTeam(true);
      this.selfUser().isTeamMember(true);
    }
  }

  private _mapGuestStatusSelf(conversationEntity: Conversation) {
    const conversationTeamId = conversationEntity.team_id;
    const selfTeamId = this.team() && this.team().id;
    const isConversationGuest = !!(conversationTeamId && (!selfTeamId || selfTeamId !== conversationTeamId));
    conversationEntity.isGuest(isConversationGuest);
  }

  /**
   * Sends a message to backend that the conversation has been fully read.
   * The message will allow all the self clients to synchronize conversation read state.
   *
   * @param conversationEntity Conversation to be marked as read
   */
  markAsRead(conversationEntity: Conversation) {
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
      });
  }

  /**
   * Save a conversation in the repository.
   * @param conversationEntity Conversation to be saved in the repository
   * @returns Resolves when conversation was saved
   */
  save_conversation(conversationEntity: Conversation) {
    const localEntity = this.find_conversation_by_id(conversationEntity.id);
    if (!localEntity) {
      this.conversations.push(conversationEntity);
      return this.save_conversation_state_in_db(conversationEntity);
    }
    return Promise.resolve(localEntity);
  }

  /**
   * Persists a conversation state in the database.
   * @param conversationEntity Conversation of which the state should be persisted
   * @returns Resolves when conversation was saved
   */
  save_conversation_state_in_db(conversationEntity: Conversation) {
    return this.conversation_service.save_conversation_state_in_db(conversationEntity);
  }

  /**
   * Save conversations in the repository.
   * @param conversationEntities Conversations to be saved in the repository
   */
  save_conversations(conversationEntities: Conversation[]) {
    this.conversations.push(...conversationEntities);
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not unarchive conversations when handling the notification stream
   * @param handling_state State of the notifications stream handling
   */
  set_notification_handling_state(handling_state: NOTIFICATION_HANDLING_STATE) {
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
   * @param conversationEntity Conversation to be updated
   * @param offline=false Should we only look for cached contacts
   * @param updateGuests=false Update conversation guests
   * @returns Resolves when users have been updated
   */
  async updateParticipatingUserEntities(conversationEntity?: Conversation, offline = false, updateGuests = false) {
    if (conversationEntity) {
      const userEntities = await this.userRepository.getUsersById(conversationEntity.participating_user_ids(), offline);
      userEntities.sort(sortUsersByPriority);
      conversationEntity.participating_user_ets(userEntities);

      if (updateGuests) {
        conversationEntity.updateGuests();
      }
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
  addMembers(conversationEntity: Conversation, userEntities: User[]) {
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

  addMissingMember(conversationEntity: Conversation, userIds: string[], timestamp: number) {
    const [sender] = userIds;
    const event = EventBuilder.buildMemberJoin(conversationEntity, sender, userIds, timestamp);
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
      .catch(error => this._handleAddToConversationError(error, conversationEntity, [serviceId]));
  }

  private _handleAddToConversationError(
    error: BackendClientError,
    conversationEntity: Conversation,
    userIds: string[],
  ) {
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
   * @param conversationEntity Conversation to clear
   * @param leaveConversation=false Should we leave the conversation before clearing the content?
   */
  clear_conversation(conversationEntity: Conversation, leaveConversation = false) {
    const isActiveConversation = this.is_active_conversation(conversationEntity);
    const nextConversationEntity = this.get_next_conversation(conversationEntity);

    if (leaveConversation) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
      this.leaveCall(conversationEntity.id);
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
   */
  private _updateClearedTimestamp(conversationEntity: Conversation) {
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

  async leaveGuestRoom(): Promise<void> {
    if (this.selfUser().isTemporaryGuest()) {
      const conversationEntity = this.getMostRecentConversation(true);
      await this.conversation_service.deleteMembers(conversationEntity.id, this.selfUser().id);
    }
  }

  /**
   * Remove member from conversation.
   *
   * @param conversationEntity Conversation to remove member from
   * @param userId ID of member to be removed from the conversation
   * @returns Resolves when member was removed from the conversation
   */
  removeMember(conversationEntity: Conversation, userId: string) {
    return this.conversation_service.deleteMembers(conversationEntity.id, userId).then(response => {
      const roles = conversationEntity.roles();
      delete roles[userId];
      conversationEntity.roles(roles);
      const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
      const event = response || EventBuilder.buildMemberLeave(conversationEntity, userId, true, currentTimestamp);

      this.eventRepository.injectEvent(event, EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Remove service from conversation.
   *
   * @param conversationEntity Conversation to remove service from
   * @param userId ID of service user to be removed from the conversation
   * @returns Resolves when service was removed from the conversation
   */
  removeService(conversationEntity: Conversation, userId: string) {
    return this.conversation_service.deleteBots(conversationEntity.id, userId).then((response: any) => {
      // TODO: Can this even have a response? in the API Client it look like it always returns `void`
      const hasResponse = response?.event;
      const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
      const event = hasResponse
        ? response.event
        : EventBuilder.buildMemberLeave(conversationEntity, userId, true, currentTimestamp);

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
  async renameConversation(conversationEntity: Conversation, name: string): Promise<ConversationRenameEvent> {
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

  async updateConversationReceiptMode(
    conversationEntity: Conversation,
    receiptMode: ConversationReceiptModeUpdateData,
  ) {
    const response = await this.conversation_service.updateConversationReceiptMode(conversationEntity.id, receiptMode);
    if (response) {
      this.eventRepository.injectEvent(response, EventRepository.SOURCE.BACKEND_RESPONSE);
    }
    return response;
  }

  async reset_session(user_id: string, client_id: string, conversation_id: string): Promise<ClientMismatch> {
    this.logger.info(`Resetting session with client '${client_id}' of user '${user_id}'.`);

    try {
      const session_id = await this.cryptography_repository.deleteSession(user_id, client_id);
      if (session_id) {
        this.logger.info(`Deleted session with client '${client_id}' of user '${user_id}'.`);
      } else {
        this.logger.warn('No local session found to delete.');
      }
      return this.sendSessionReset(user_id, client_id, conversation_id);
    } catch (error) {
      const logMessage = `Failed to reset session for client '${client_id}' of user '${user_id}': ${error.message}`;
      this.logger.warn(logMessage, error);
      throw error;
    }
  }

  /**
   * Send a specific GIF to a conversation.
   *
   * @param conversationEntity Conversation to send message in
   * @param url URL of giphy image
   * @param tag tag tag used for gif search
   * @param quoteEntity Quote as part of the message
   * @returns Resolves when the gif was posted
   */
  sendGif(
    conversationEntity: Conversation,
    url: string,
    tag: string | number | Record<string, string>,
    quoteEntity: QuoteEntity,
  ) {
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
   * @param teamId ID of team that member was removed from
   * @param userId ID of leaving user
   * @param isoDate Date of member removal
   */
  async teamMemberLeave(teamId: string, userId: string, isoDate = this.serverTimeHandler.toServerTimestamp()) {
    const userEntity = await this.userRepository.getUserById(userId);
    this.conversations()
      .filter(conversationEntity => {
        const conversationInTeam = conversationEntity.team_id === teamId;
        const userIsParticipant = conversationEntity.participating_user_ids().includes(userId);
        return conversationInTeam && userIsParticipant && !conversationEntity.removed_from_conversation();
      })
      .forEach(conversationEntity => {
        const leaveEvent = EventBuilder.buildTeamMemberLeave(conversationEntity, userEntity, isoDate);
        this.eventRepository.injectEvent(leaveEvent);
      });
    userEntity.isDeleted = true;
  }

  /**
   * Set the notification state of a conversation.
   *
   * @param conversationEntity Conversation to change notification state off
   * @param notificationState New notification state
   * @returns Resolves when the notification stated was change
   */
  setNotificationState(conversationEntity: Conversation, notificationState: number) {
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
   * @param conversationEntity Conversation to rename
   * @returns Resolves when the conversation was archived
   */
  archiveConversation(conversationEntity: Conversation) {
    return this._toggleArchiveConversation(conversationEntity, true).then(() => {
      this.logger.info(`Conversation '${conversationEntity.id}' archived`);
    });
  }

  /**
   * Un-archive a conversation.
   *
   * @param conversationEntity Conversation to unarchive
   * @param forceChange=false Force state change without new message
   * @param trigger Trigger for unarchive
   * @returns Resolves when the conversation was unarchived
   */
  unarchiveConversation(conversationEntity: Conversation, forceChange = false, trigger = 'unknown') {
    return this._toggleArchiveConversation(conversationEntity, false, forceChange).then(() => {
      this.logger.info(`Conversation '${conversationEntity.id}' unarchived by trigger '${trigger}'`);
    });
  }

  private _toggleArchiveConversation(
    conversationEntity: Conversation,
    newState: boolean,
    forceChange: boolean = false,
  ) {
    if (!conversationEntity) {
      const error = new ConversationError(
        ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
      );
      return Promise.reject(error);
    }

    const stateChange = conversationEntity.is_archived() !== newState;

    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const archiveTimestamp = conversationEntity.get_last_known_timestamp(currentTimestamp);
    const sameTimestamp = conversationEntity.archivedTimestamp() === archiveTimestamp;
    const skipChange = sameTimestamp && !forceChange;

    if (!stateChange && skipChange) {
      return Promise.reject(
        new ConversationError(ConversationError.TYPE.NO_CHANGES, ConversationError.MESSAGE.NO_CHANGES),
      );
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

          const isNotFound = error.code === HTTP_STATUS.NOT_FOUND;
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

  private _checkChangedConversations() {
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
  private _clear_conversation(conversationEntity: Conversation, timestamp?: number) {
    this._deleteMessages(conversationEntity, timestamp);

    if (conversationEntity.removed_from_conversation()) {
      this.conversation_service.delete_conversation_from_db(conversationEntity.id);
      this.deleteConversationFromRepository(conversationEntity.id);
    }
  }

  private _handleConversationCreateError(error: BackendClientError, userIds: string[]): void {
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

  private _handleTooManyMembersError(participants = ConversationRepository.CONFIG.GROUP.MAX_SIZE) {
    const openSpots = ConversationRepository.CONFIG.GROUP.MAX_SIZE - participants;
    const substitutions = {
      number1: ConversationRepository.CONFIG.GROUP.MAX_SIZE.toString(10),
      number2: Math.max(0, openSpots).toString(10),
    };

    const messageText = t('modalConversationTooManyMembersMessage', substitutions);
    const titleText = t('modalConversationTooManyMembersHeadline');
    this._showModal(messageText, titleText);
  }

  private _handleUsersNotConnected(userIds: string[] = []) {
    const [userID] = userIds;
    const userPromise = userIds.length === 1 ? this.userRepository.getUserById(userID) : Promise.resolve(null);

    userPromise.then((userEntity: User) => {
      const username = userEntity?.name();
      const messageText = username
        ? t('modalConversationNotConnectedMessageOne', username)
        : t('modalConversationNotConnectedMessageMany');
      const titleText = t('modalConversationNotConnectedHeadline');
      this._showModal(messageText, titleText);
    });
  }

  private _showModal(messageText: string, titleText: string) {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: messageText,
        title: titleText,
      },
    });
  }

  private _isUserCancellationError(error: ConversationError): boolean {
    const errorTypes: string[] = [
      ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION,
      ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
    ];
    return errorTypes.includes(error.type);
  }

  /**
   * Send a read receipt for the last message in a conversation.
   */
  sendReadReceipt(conversationEntity: Conversation, messageEntity: Message, moreMessageEntities: Message[] = []): void {
    this._sendConfirmationStatus(conversationEntity, messageEntity, Confirmation.Type.READ, moreMessageEntities);
  }

  sendButtonAction(conversationEntity: Conversation, messageEntity: CompositeMessage, buttonId: string) {
    if (conversationEntity.removed_from_conversation()) {
      return;
    }

    const senderId = messageEntity.from;
    const conversationHasUser = conversationEntity.participating_user_ids().includes(senderId);

    if (!conversationHasUser) {
      messageEntity.setButtonError(buttonId, t('buttonActionError'));
      messageEntity.waitingButtonId(undefined);
      return;
    }

    const protoButtonAction = new ButtonAction({
      buttonId,
      referenceMessageId: messageEntity.id,
    });
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.BUTTON_ACTION]: protoButtonAction,
      messageId: createRandomUuid(),
    });
    this.messageSender.queueMessage(async () => {
      try {
        const recipients = await this.create_recipients(conversationEntity.id, true, [messageEntity.from]);
        const options = {nativePush: false, precondition: [messageEntity.from], recipients};
        const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id, options);
        await this._sendGenericMessage(eventInfoEntity, true);
      } catch (error) {
        messageEntity.waitingButtonId(undefined);
        return messageEntity.setButtonError(buttonId, t('buttonActionError'));
      }
    });
  }

  //##############################################################################
  // Send encrypted events
  //##############################################################################

  send_asset_remotedata(conversationEntity: Conversation, file: Blob, messageId: string, asImage: boolean) {
    let genericMessage: GenericMessage;

    return this.getMessageInConversationById(conversationEntity, messageId)
      .then(() => {
        const retention = this.assetRepository.getAssetRetention(this.selfUser(), conversationEntity);
        const options = {
          expectsReadConfirmation: this.expectReadReceipt(conversationEntity),
          legalHoldStatus: conversationEntity.legalHoldStatus(),
          public: true,
          retention,
        };

        return this.assetRepository.uploadFile(messageId, file, options, asImage);
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
        const assetAddEvent = EventBuilder.buildAssetAdd(conversationEntity, data, currentTimestamp);

        assetAddEvent.id = messageId;
        assetAddEvent.time = payload.time;

        return this._on_asset_upload_complete(conversationEntity, assetAddEvent);
      });
  }

  /**
   * Send asset metadata message to specified conversation.
   */
  async send_asset_metadata(
    conversationEntity: Conversation,
    file: File | Blob,
    allowImageDetection?: boolean,
  ): Promise<ConversationEvent> {
    try {
      let metadata;
      try {
        metadata = await buildMetadata(file);
      } catch (error) {
        const logMessage = `Couldn't render asset preview from metadata. Asset might be corrupt: ${error.message}`;
        this.logger.warn(logMessage, error);
      }
      const assetOriginal = new Asset.Original({mimeType: file.type, name: (file as File).name, size: file.size});

      if (isAudio(file)) {
        assetOriginal.audio = metadata as AudioMetaData;
      } else if (isVideo(file)) {
        assetOriginal.video = metadata as VideoMetaData;
      } else if (allowImageDetection && isImage(file)) {
        assetOriginal.image = metadata as ImageMetaData;
      }

      const protoAsset = new Asset({
        [PROTO_MESSAGE_TYPE.ASSET_ORIGINAL]: assetOriginal,
        [PROTO_MESSAGE_TYPE.EXPECTS_READ_CONFIRMATION]: this.expectReadReceipt(conversationEntity),
        [PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS]: conversationEntity.legalHoldStatus(),
      });
      const asset = protoAsset;
      let genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.ASSET]: asset,
        messageId: createRandomUuid(),
      });

      if (conversationEntity.messageTimer()) {
        genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.messageTimer());
      }
      return this._send_and_inject_generic_message(conversationEntity, genericMessage);
    } catch (error) {
      const log = `Failed to upload metadata for asset in conversation '${conversationEntity.id}': ${error.message}`;
      this.logger.warn(log, error);

      if (this._isUserCancellationError(error)) {
        throw error;
      }
    }
    return undefined;
  }

  /**
   * Send asset upload failed message to specified conversation.
   *
   * @param conversationEntity Conversation that should receive the file
   * @param messageId ID of the metadata message
   * @param reason=ProtobufAsset.NotUploaded.FAILED Cause for the failed upload (optional)
   * @returns Resolves when the asset failure was sent
   */
  send_asset_upload_failed(
    conversationEntity: Conversation,
    messageId: string,
    reason = ProtobufAsset.NotUploaded.FAILED,
  ) {
    const wasCancelled = reason === ProtobufAsset.NotUploaded.CANCELLED;
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
   * @param conversationEntity Conversation that content message was received in
   * @param messageEntity Message for which to acknowledge receipt
   * @param type The type of confirmation to send
   * @param moreMessageEntities More messages to send a read receipt for
   */
  private _sendConfirmationStatus(
    conversationEntity: Conversation,
    messageEntity: Message,
    type: Confirmation.Type,
    moreMessageEntities: Message[] = [],
  ) {
    const typeToConfirm = (EventTypeHandling.CONFIRM as string[]).includes(messageEntity.type);

    if (messageEntity.user().isMe || !typeToConfirm) {
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
   * @param eventInfoEntity Event info to be send
   * @param conversationId id of the conversation to send call message to
   * @returns Resolves when the confirmation was sent
   */
  sendCallingMessage(eventInfoEntity: EventInfoEntity, conversationId: string) {
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
   * @param conversationEntity Conversation to send knock in
   * @returns Resolves after sending the knock
   */
  sendKnock(conversationEntity: Conversation) {
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
   * @param conversationEntity Conversation that should receive the message
   * @param textMessage Plain text message that possibly contains link
   * @param genericMessage GenericMessage of containing text or edited message
   * @param mentionEntities Mentions as part of message
   * @param quoteEntity Link to a quoted message
   * @returns Resolves after sending the message
   */
  async sendLinkPreview(
    conversationEntity: Conversation,
    textMessage: string,
    genericMessage: GenericMessage,
    mentionEntities: MentionEntity[],
    quoteEntity?: QuoteEntity,
  ) {
    const conversationId = conversationEntity.id;
    const messageId = genericMessage.messageId;
    let messageEntity: ContentMessage;
    try {
      const linkPreview = await this.link_repository.getLinkPreviewFromString(textMessage);
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
        if (genericMessage[GENERIC_MESSAGE_TYPE.EPHEMERAL]) {
          genericMessage[GENERIC_MESSAGE_TYPE.EPHEMERAL][GENERIC_MESSAGE_TYPE.TEXT] = protoText;
        } else {
          genericMessage[GENERIC_MESSAGE_TYPE.TEXT] = protoText;
        }

        messageEntity = (await this.getMessageInConversationById(conversationEntity, messageId)) as ContentMessage;
      }

      this.logger.debug(`No link preview for message '${messageId}' in conversation '${conversationId}' created`);
      if (messageEntity) {
        const assetEntity = messageEntity.get_first_asset() as TextAsset;
        const messageContentUnchanged = assetEntity.text === textMessage;

        if (messageContentUnchanged) {
          this.logger.debug(`Sending link preview for message '${messageId}' in conversation '${conversationId}'`);
          return this._send_and_inject_generic_message(conversationEntity, genericMessage, false);
        }

        this.logger.debug(`Skipped sending link preview as message '${messageId}' in '${conversationId}' changed`);
      }
    } catch (error) {
      if (error.type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        this.logger.warn(`Failed sending link preview for message '${messageId}' in '${conversationId}'`);
        throw error;
      }

      this.logger.warn(`Skipped link preview for unknown message '${messageId}' in '${conversationId}'`);
    }
    return undefined;
  }

  /**
   * Send location message in specified conversation.
   *
   * @param conversationEntity Conversation that should receive the message
   * @param longitude Longitude of the location
   * @param latitude Latitude of the location
   * @param name Name of the location
   * @param zoom Zoom factor for the map (Google Maps)
   * @returns Resolves after sending the location
   */
  sendLocation(conversationEntity: Conversation, longitude: number, latitude: number, name: string, zoom: number) {
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
   * @param conversationEntity Conversation entity
   * @param textMessage Edited plain text message
   * @param originalMessageEntity Original message entity
   * @param mentionEntities Mentions as part of the message
   * @returns Resolves after sending the message
   */
  sendMessageEdit(
    conversationEntity: Conversation,
    textMessage: string,
    originalMessageEntity: ContentMessage,
    mentionEntities: MentionEntity[],
  ) {
    const hasDifferentText = isTextDifferent(originalMessageEntity, textMessage);
    const hasDifferentMentions = areMentionsDifferent(originalMessageEntity, mentionEntities);
    const wasEdited = hasDifferentText || hasDifferentMentions;

    if (!wasEdited) {
      return Promise.reject(
        new ConversationError(ConversationError.TYPE.NO_MESSAGE_CHANGES, ConversationError.MESSAGE.NO_MESSAGE_CHANGES),
      );
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
   * @param conversationEntity Conversation entity
   * @param message_et Message to react to
   */
  toggle_like(conversationEntity: Conversation, message_et: ContentMessage) {
    if (!conversationEntity.removed_from_conversation()) {
      const reaction = message_et.is_liked() ? ReactionType.NONE : ReactionType.LIKE;
      message_et.is_liked(!message_et.is_liked());

      window.setTimeout(() => this.sendReaction(conversationEntity, message_et, reaction), 100);
    }
  }

  /**
   * Send reaction to a content message in specified conversation.
   * @param conversationEntity Conversation to send reaction in
   * @param messageEntity Message to react to
   * @param reaction Reaction
   * @returns Resolves after sending the reaction
   */
  sendReaction(conversationEntity: Conversation, messageEntity: Message, reaction: ReactionType) {
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
   * @param userId User ID
   * @param clientId Client ID
   * @param conversationId Conversation ID
   * @returns Resolves after sending the session reset
   */
  async sendSessionReset(userId: string, clientId: string, conversationId: string): Promise<ClientMismatch> {
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.CLIENT_ACTION]: ClientAction.RESET_SESSION,
      messageId: createRandomUuid(),
    });

    const options = {
      precondition: true,
      recipients: {[userId]: [clientId]},
    };
    const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId, options);

    try {
      const response = await this._sendGenericMessage(eventInfoEntity);
      this.logger.info(`Sent info about session reset to client '${clientId}' of user '${userId}'`);
      return response;
    } catch (error) {
      this.logger.error(`Sending conversation reset failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send text message in specified conversation.
   *
   * @param conversationEntity Conversation that should receive the message
   * @param textMessage Plain text message
   * @param mentionEntities Mentions as part of the message
   * @param quoteEntity Quote as part of the message
   * @returns Resolves after sending the message
   */
  sendText(
    conversationEntity: Conversation,
    textMessage: string,
    mentionEntities: MentionEntity[],
    quoteEntity: QuoteEntity,
  ) {
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
   * @param conversationEntity Conversation that should receive the message
   * @param textMessage Plain text message
   * @param mentionEntities Mentions part of the message
   * @param quoteEntity Quoted message
   * @returns Resolves after sending the message
   */
  sendTextWithLinkPreview(
    conversationEntity: Conversation,
    textMessage: string,
    mentionEntities: MentionEntity[],
    quoteEntity: QuoteEntity,
  ) {
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

  private _createTextProto(
    messageId: string,
    textMessage: string,
    mentionEntities: MentionEntity[],
    quoteEntity: QuoteEntity,
    linkPreviews: LinkPreview[],
    expectsReadConfirmation: boolean,
    legalHoldStatus: LegalHoldStatus,
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
            }
          }
          return false;
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
   * @param genericMessage Message to be wrapped
   * @param millis Expire time in milliseconds
   * @returns New proto message
   */
  private _wrap_in_ephemeral_message(genericMessage: GenericMessage, millis: number) {
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
   * @param conversation_id Conversation ID
   * @param skip_own_clients=false True, if other own clients should be skipped (to not sync messages on own clients)
   * @param user_ids Optionally the intended recipient users
   * @returns Resolves with a user client map
   */
  create_recipients(conversation_id: string, skip_own_clients = false, user_ids: string[] = null) {
    return this.get_all_users_in_conversation(conversation_id).then(user_ets => {
      const recipients: Recipients = {};

      for (const user_et of user_ets) {
        if (!(skip_own_clients && user_et.isMe)) {
          if (user_ids && !user_ids.includes(user_et.id)) {
            continue;
          }

          recipients[user_et.id] = user_et.devices().map(client_et => client_et.id);
        }
      }

      return recipients;
    });
  }

  sendGenericMessageToConversation(eventInfoEntity: EventInfoEntity) {
    return this.messageSender.queueMessage(async () => {
      const recipients = await this.create_recipients(eventInfoEntity.conversationId);
      eventInfoEntity.updateOptions({recipients});
      return this._sendGenericMessage(eventInfoEntity);
    });
  }

  private async _send_and_inject_generic_message(
    conversationEntity: Conversation,
    genericMessage: GenericMessage,
    syncTimestamp = true,
  ): Promise<ConversationEvent> {
    if (conversationEntity.removed_from_conversation()) {
      throw new Error('Cannot send message to conversation you are not part of');
    }

    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const optimisticEvent = EventBuilder.buildMessageAdd(conversationEntity, currentTimestamp);
    const mappedEvent = await this.cryptography_repository.cryptographyMapper.mapGenericMessage(
      genericMessage,
      optimisticEvent,
    );
    const {KNOCK: TYPE_KNOCK, EPHEMERAL: TYPE_EPHEMERAL} = GENERIC_MESSAGE_TYPE;
    const isPing = (message: GenericMessage) => message.content === TYPE_KNOCK;
    const isEphemeralPing = (message: GenericMessage) =>
      message.content === TYPE_EPHEMERAL && isPing((message.ephemeral as unknown) as GenericMessage);
    const shouldPlayPingAudio = isPing(genericMessage) || isEphemeralPing(genericMessage);
    if (shouldPlayPingAudio) {
      amplify.publish(WebAppEvents.AUDIO.PLAY, AudioType.OUTGOING_PING);
    }

    const injectedEvent = ((await this.eventRepository.injectEvent(mappedEvent)) as unknown) as ConversationEvent;
    const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
    eventInfoEntity.setTimestamp((injectedEvent as any).time as string);
    const sentPayload = await this.sendGenericMessageToConversation(eventInfoEntity);
    this._trackContributed(conversationEntity, genericMessage);
    const backendIsoDate = syncTimestamp ? sentPayload.time : '';
    await this._updateMessageAsSent(conversationEntity, injectedEvent, backendIsoDate);
    return injectedEvent;
  }

  /**
   * Update message as sent in db and view.
   *
   * @param conversationEntity Conversation entity
   * @param eventJson Event object
   * @param isoDate If defined it will update event timestamp
   * @returns Resolves when sent status was updated
   */
  private async _updateMessageAsSent(
    conversationEntity: Conversation,
    eventJson: ConversationEvent,
    isoDate: string | number | Date,
  ) {
    try {
      const messageEntity = await this.getMessageInConversationById(conversationEntity, eventJson.id);
      messageEntity.status(StatusType.SENT);
      const changes: {status: StatusType; time?: string | number | Date} = {status: StatusType.SENT};
      if (isoDate) {
        const timestamp = new Date(isoDate).getTime();
        if (!isNaN(timestamp)) {
          changes.time = isoDate;
          messageEntity.timestamp(timestamp);
          conversationEntity.update_timestamp_server(timestamp, true);
          conversationEntity.updateTimestamps(messageEntity);
        }
      }
      this.checkMessageTimer(messageEntity);
      if ((EventTypeHandling.STORE as string[]).includes(messageEntity.type) || messageEntity.has_asset_image()) {
        return this.eventService.updateEvent(messageEntity.primary_key, changes);
      }
    } catch (error) {
      if (error.type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
  }

  /**
   * Send encrypted external message
   *
   * @param eventInfoEntity Event to be send
   * @returns Resolves after sending the external message
   */
  private async _sendExternalGenericMessage(eventInfoEntity: EventInfoEntity): Promise<ClientMismatch> {
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
   * @param eventInfoEntity Info about event
   * @param skipLegalHold Skip the legal hold detection
   * @returns Resolves when the message was sent
   */
  private async _sendGenericMessage(eventInfoEntity: EventInfoEntity, skipLegalHold = false): Promise<ClientMismatch> {
    try {
      await this._grantOutgoingMessage(eventInfoEntity, undefined, skipLegalHold);
      const sendAsExternal = await this._shouldSendAsExternal(eventInfoEntity);
      if (sendAsExternal) {
        return this._sendExternalGenericMessage(eventInfoEntity);
      }

      const {genericMessage, options} = eventInfoEntity;
      const payload = await this.cryptography_repository.encryptGenericMessage(options.recipients, genericMessage);
      payload.native_push = options.nativePush;
      return this._sendEncryptedMessage(eventInfoEntity, payload);
    } catch (error) {
      const isRequestTooLarge = error?.code === HTTP_STATUS.REQUEST_TOO_LONG;
      if (isRequestTooLarge) {
        return this._sendExternalGenericMessage(eventInfoEntity);
      }

      throw error;
    }
  }

  /**
   * Sends otr message to a conversation.
   *
   * @note Options for the precondition check on missing clients are:
   *   'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending
   *
   * @param eventInfoEntity Info about message to be sent
   * @param payload Payload
   * @returns Promise that resolves after sending the encrypted message
   */
  private async _sendEncryptedMessage(
    eventInfoEntity: EventInfoEntity,
    payload: NewOTRMessage,
  ): Promise<ClientMismatch> {
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

    try {
      const response = await this.conversation_service.post_encrypted_message(
        conversationId,
        payload,
        options.precondition,
      );
      this.clientMismatchHandler.onClientMismatch(eventInfoEntity, response, payload);
      return response;
    } catch (axiosError) {
      const error = axiosError.response?.data;
      const isUnknownClient = error?.label === BackendClientError.LABEL.UNKNOWN_CLIENT;
      if (isUnknownClient) {
        this.clientRepository.removeLocalClient();
        return undefined;
      }

      if (!error?.missing) {
        throw error;
      }

      let updatedPayload: NewOTRMessage;

      const payloadWithMissingClients = await this.clientMismatchHandler.onClientMismatch(
        eventInfoEntity,
        error,
        payload,
      );

      // eslint-disable-next-line prefer-const
      updatedPayload = payloadWithMissingClients;

      const userIds = Object.keys(error.missing);
      await this._grantOutgoingMessage(eventInfoEntity, userIds);
      this.logger.info(
        `Updated '${messageType}' message (${messageId}) for conversation '${conversationId}'. Will ignore missing receivers.`,
        updatedPayload,
      );
      return this.conversation_service.post_encrypted_message(conversationId, updatedPayload, true);
    }
  }

  async updateAllClients(conversationEntity: Conversation, blockSystemMessage = true) {
    if (blockSystemMessage) {
      conversationEntity.blockLegalHoldMessage = true;
    }
    const sender = this.clientRepository.currentClient().id;
    try {
      await this.conversation_service.post_encrypted_message(conversationEntity.id, {recipients: {}, sender});
    } catch (axiosError) {
      const error = axiosError.response?.data || axiosError;
      if (error.missing) {
        const remoteUserClients = error.missing as Recipients;
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
        }, {} as Recipients);

        await Promise.all(
          Object.entries(deletedUserClients).map(([userId, clients]) =>
            Promise.all(clients.map((clientId: string) => this.userRepository.removeClientFromUser(userId, clientId))),
          ),
        );

        const missingUserIds = Object.entries(remoteUserClients).reduce((missing, [userId, clients]) => {
          if (userId === selfId) {
            return missing;
          }
          const missingClients = getDifference(localUserClients[userId] || ([] as string[]), clients);
          if (missingClients.length) {
            missing.push(userId);
          }
          return missing;
        }, []);

        await Promise.all(
          missingUserIds.map(async userId => {
            const clients = await this.userRepository.getClientsByUserId(userId, false);
            await Promise.all(clients.map(client => this.userRepository.addClientToUser(userId, client)));
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
  }: {
    beforeTimestamp?: boolean;
    conversationEntity?: Conversation;
    conversationId: string;
    legalHoldStatus: LegalHoldStatus;
    timestamp: number;
    userId: string;
  }) {
    if (typeof legalHoldStatus === 'undefined') {
      return;
    }
    if (!timestamp) {
      const conversation = conversationEntity || this.find_conversation_by_id(conversationId);
      const servertime = this.serverTimeHandler.toServerTimestamp();
      timestamp = conversation.get_latest_timestamp(servertime);
    }
    const legalHoldUpdateMessage = EventBuilder.buildLegalHoldMessage(
      conversationId || conversationEntity.id,
      userId,
      timestamp,
      legalHoldStatus,
      beforeTimestamp,
    );
    await this.eventRepository.injectEvent(legalHoldUpdateMessage);
  }

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

  private async _grantOutgoingMessage(
    eventInfoEntity: EventInfoEntity,
    userIds: string[],
    skipLegalHold = false,
  ): Promise<boolean> {
    const messageType = eventInfoEntity.getType();
    const allowedMessageTypes = ['cleared', 'clientAction', 'confirmation', 'deleted', 'lastRead'];
    if (allowedMessageTypes.includes(messageType)) {
      return false;
    }

    if (this.isTeam()) {
      const allRecipientsBesideSelf = Object.keys(eventInfoEntity.options.recipients).filter(
        id => id !== this.selfUser().id,
      );
      const userIdsWithoutClients = [];
      for (const recipientId of allRecipientsBesideSelf) {
        const clientIdsOfUser = eventInfoEntity.options.recipients[recipientId];
        const noRemainingClients = clientIdsOfUser.length === 0;

        if (noRemainingClients) {
          userIdsWithoutClients.push(recipientId);
        }
      }
      const bareUserList = await this.userRepository.getUserListFromBackend(userIdsWithoutClients);
      for (const user of bareUserList) {
        // Since this is a bare API client user we use `.deleted`
        const isDeleted = user?.deleted === true;

        if (isDeleted) {
          await this.teamMemberLeave(this.team().id, user.id);
        }
      }
    }

    const isMessageEdit = messageType === GENERIC_MESSAGE_TYPE.EDITED;

    const isCallingMessage = messageType === GENERIC_MESSAGE_TYPE.CALLING;
    const consentType = isCallingMessage
      ? ConversationRepository.CONSENT_TYPE.OUTGOING_CALL
      : ConversationRepository.CONSENT_TYPE.MESSAGE;

    // Legal Hold
    if (!skipLegalHold) {
      const conversationEntity = this.find_conversation_by_id(eventInfoEntity.conversationId);
      const localLegalHoldStatus = conversationEntity.legalHoldStatus();
      await this.updateAllClients(conversationEntity, !isMessageEdit);
      const updatedLocalLegalHoldStatus = conversationEntity.legalHoldStatus();

      const {genericMessage} = eventInfoEntity;
      (genericMessage as any)[messageType][PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS] = updatedLocalLegalHoldStatus;

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

      return this.grantMessage(eventInfoEntity, consentType, userIds, shouldShowLegalHoldWarning);
    }
    return this.grantMessage(eventInfoEntity, consentType, userIds);
  }

  async grantMessage(
    eventInfoEntity: EventInfoEntity,
    consentType: string,
    userIds: string[] = null,
    shouldShowLegalHoldWarning = false,
  ): Promise<boolean> {
    const conversationEntity = await this.get_conversation_by_id(eventInfoEntity.conversationId);
    const legalHoldMessageTypes: string[] = [
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

      userIds ||= conversationEntity.getUsersWithUnverifiedClients().map(userEntity => userEntity.id);

      return this.userRepository
        .getUsersById(userIds)
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
            const [userEntity_1] = userEntities;

            if (userEntity_1) {
              titleString = userEntity_1.isMe
                ? t('modalConversationNewDeviceHeadlineYou', titleSubstitutions)
                : t('modalConversationNewDeviceHeadlineOne', titleSubstitutions);
            } else {
              const conversationId = eventInfoEntity.conversationId;
              const type = eventInfoEntity.getType();

              const log = `Missing user IDs to grant '${type}' message in '${conversationId}' (${consentType})`;
              this.logger.error(log);

              const error = new Error('Failed to grant outgoing message');

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
                reject(
                  new ConversationError(
                    ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION,
                    ConversationError.MESSAGE.DEGRADED_CONVERSATION_CANCELLATION,
                  ),
                );
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
  }

  /**
   * Estimate whether message should be send as type external.
   *
   * @param eventInfoEntity Info about event
   * @returns Is payload likely to be too big so that we switch to type external?
   */
  private _shouldSendAsExternal(eventInfoEntity: EventInfoEntity) {
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
   * @param conversationEntity Conversation to post the images
   */
  upload_images(conversationEntity: Conversation, images: File[] | Blob[]) {
    this.upload_files(conversationEntity, images, true);
  }

  /**
   * Post files to a conversation.
   *
   * @param conversationEntity Conversation to post the files
   * @param files files
   * @param asImage=false whether or not the file should be treated as an image
   */
  upload_files(conversationEntity: Conversation, files: File[] | Blob[], asImage?: boolean) {
    if (this._can_upload_assets_to_conversation(conversationEntity)) {
      Array.from(files).forEach(file => this.upload_file(conversationEntity, file, asImage));
    }
  }

  /**
   * Post file to a conversation using v3
   *
   * @param conversationEntity Conversation to post the file
   * @param file File object
   * @param asImage=false whether or not the file should be treated as an image
   * @returns Resolves when file was uploaded
   */

  async upload_file(conversationEntity: Conversation, file: File | Blob, asImage?: boolean) {
    let messageId;
    try {
      const uploadStarted = Date.now();
      const injectedEvent = await this.send_asset_metadata(conversationEntity, file, asImage);
      messageId = injectedEvent.id;
      await this.send_asset_remotedata(conversationEntity, file, messageId, asImage);
      const uploadDuration = (Date.now() - uploadStarted) / TIME_IN_MILLIS.SECOND;
      this.logger.info(`Finished to upload asset for conversation'${conversationEntity.id} in ${uploadDuration}`);
    } catch (error) {
      if (this._isUserCancellationError(error)) {
        throw error;
      } else if (error instanceof RequestCancellationError) {
        return;
      }
      this.logger.error(`Failed to upload asset for conversation '${conversationEntity.id}': ${error.message}`, error);
      const messageEntity = await this.getMessageInConversationById(conversationEntity, messageId);
      this.send_asset_upload_failed(conversationEntity, messageEntity.id);
      return this.update_message_as_upload_failed(messageEntity);
    }
  }

  /**
   * Delete message for everyone.
   *
   * @param conversationEntity Conversation to delete message from
   * @param messageEntity Message to delete
   * @param precondition Optional level that backend checks for missing clients
   * @returns Resolves when message was deleted
   */
  deleteMessageForEveryone(
    conversationEntity: Conversation,
    messageEntity: Message,
    precondition?: string[] | boolean,
  ) {
    const conversationId = conversationEntity.id;
    const messageId = messageEntity.id;

    return Promise.resolve()
      .then(() => {
        if (!messageEntity.user().isMe && !messageEntity.ephemeral_expires()) {
          throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
        }

        const protoMessageDelete = new MessageDelete({messageId});
        const genericMessage = new GenericMessage({
          [GENERIC_MESSAGE_TYPE.DELETED]: protoMessageDelete,
          messageId: createRandomUuid(),
        });
        this._trackContributed(conversationEntity, genericMessage);
        return this.messageSender.queueMessage(() => {
          const userIds = Array.isArray(precondition) ? precondition : undefined;
          return this.create_recipients(conversationId, false, userIds).then(recipients => {
            const options = {precondition, recipients};
            const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId, options);
            this._sendGenericMessage(eventInfoEntity);
          });
        });
      })
      .then(() => {
        return this._delete_message_by_id(conversationEntity, messageId);
      })
      .catch(error => {
        const isConversationNotFound = error.code === HTTP_STATUS.NOT_FOUND;
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
   * @param conversationEntity Conversation to delete message from
   * @param messageEntity Message to delete
   * @returns Resolves when message was deleted
   */
  deleteMessage(conversationEntity: Conversation, messageEntity: Message) {
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
        this._trackContributed(conversationEntity, eventInfoEntity.genericMessage);
        return this.sendGenericMessageToConversation(eventInfoEntity);
      })
      .then(() => {
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
   * @param conversationEntity Conversation to check
   * @returns Can assets be uploaded
   */
  private _can_upload_assets_to_conversation(conversationEntity: Conversation) {
    return !!conversationEntity && !conversationEntity.isRequest() && !conversationEntity.removed_from_conversation();
  }

  //##############################################################################
  // Event callbacks
  //##############################################################################

  /**
   * Listener for incoming events.
   *
   * @param eventJson JSON data for event
   * @param eventSource=EventRepository.SOURCE.STREAM Source of event
   * @returns Resolves when event was handled
   */
  onConversationEvent(eventJson: EventJson, eventSource = EventRepository.SOURCE.STREAM) {
    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    const logMessage = `Conversation Event: '${eventJson.type}' (Source: ${eventSource})`;
    this.logger.info(logMessage, logObject);

    return this._pushToReceivingQueue(eventJson, eventSource);
  }

  private _handleConversationEvent(eventJson: EventJson, eventSource = EventRepository.SOURCE.STREAM) {
    if (!eventJson) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const {conversation, data: eventData, type} = eventJson;
    const conversationId = eventData?.conversationId || conversation;
    this.logger.info(`Handling event '${type}' in conversation '${conversationId}' (Source: ${eventSource})`);

    const inSelfConversation = conversationId === this.self_conversation() && this.self_conversation().id;
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
    const onEventPromise = isConversationCreate ? Promise.resolve(null) : this.get_conversation_by_id(conversationId);
    let previouslyArchived = false;

    return onEventPromise
      .then((conversationEntity: Conversation) => {
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
      .then(conversationEntity => this._triggerFeatureEventHandlers(conversationEntity, eventJson))
      .then(
        conversationEntity =>
          this._reactToConversationEvent(conversationEntity, eventJson, eventSource) as EntityObject,
      )
      .then((entityObject = {} as EntityObject) =>
        this._handleConversationNotification(entityObject as EntityObject, eventSource, previouslyArchived),
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

          this._showModal(messageText, titleText);
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
  private _checkConversationParticipants(
    conversationEntity: Conversation,
    eventJson: EventJson,
    eventSource: EventSource,
  ) {
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
          CONVERSATION_EVENT.MEMBER_LEAVE,
          CONVERSATION_EVENT.MEMBER_JOIN,
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
        return this.addMissingMember(conversationEntity, [sender], timestamp).then(() => conversationEntity);
      }
    }

    return conversationEntity;
  }

  private async _checkLegalHoldStatus(conversationEntity: Conversation, eventJson: LegalHoldEvaluator.MappedEvent) {
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
   * @param conversationEntity Conversation targeted by the event
   * @param eventJson JSON data of the event
   * @param eventSource Source of event
   * @returns Resolves when the event has been treated
   */
  private _reactToConversationEvent(conversationEntity: Conversation, eventJson: EventJson, eventSource: EventSource) {
    switch (eventJson.type) {
      case CONVERSATION_EVENT.CREATE:
        return this._onCreate(eventJson, eventSource);

      case CONVERSATION_EVENT.DELETE:
        return this.deleteConversationLocally(eventJson.conversation);

      case CONVERSATION_EVENT.MEMBER_JOIN:
        return this._onMemberJoin(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MEMBER_LEAVE:
      case ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE:
        return this._onMemberLeave(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MEMBER_UPDATE:
        return this._onMemberUpdate(conversationEntity, eventJson);

      case CONVERSATION_EVENT.RENAME:
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

      case CONVERSATION_EVENT.RECEIPT_MODE_UPDATE:
        return this._onReceiptModeChanged(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.BUTTON_ACTION_CONFIRMATION:
        return this._onButtonActionConfirmation(conversationEntity, eventJson);

      case ClientEvent.CONVERSATION.MESSAGE_ADD:
        const isMessageEdit = !!eventJson.edited_time;
        if (isMessageEdit) {
          // in case of an edition, the DB listener will take care of updating the local entity
          return {conversationEntity};
        }
        return this._addEventToConversation(conversationEntity, eventJson);

      case CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE:
      case ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD:
      case ClientEvent.CONVERSATION.DELETE_EVERYWHERE:
      case ClientEvent.CONVERSATION.FILE_TYPE_RESTRICTED:
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
   * @param conversationEntity Conversation targeted by the event
   * @param eventJson JSON data of the event
   * @param eventSource Source of event
   * @returns Resolves when all the handlers have done their job
   */
  private _triggerFeatureEventHandlers(conversationEntity: Conversation, eventJson: EventJson) {
    const conversationEventHandlers = [this.ephemeralHandler, this.stateHandler];
    const handlePromises = conversationEventHandlers.map(handler =>
      handler.handleConversationEvent(conversationEntity, eventJson),
    );
    return Promise.all(handlePromises).then(() => conversationEntity);
  }

  /**
   * Handles conversation update and notification message.
   *
   * @param entityObject Object containing the conversation and the message that are targeted by the event
   * @param eventSource Source of event
   * @param previouslyArchived `true` if the previous state of the conversation was archived
   * @returns Resolves when the conversation was updated
   */
  private async _handleConversationNotification(
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
   * @param eventJson JSON data for event
   * @param source Source of event
   */
  private _pushToReceivingQueue(eventJson: EventJson, source: EventSource) {
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
   */
  on_missed_events() {
    this.filtered_conversations()
      .filter(conversationEntity => !conversationEntity.removed_from_conversation())
      .forEach(conversationEntity => {
        const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
        const missed_event = EventBuilder.buildMissed(conversationEntity, currentTimestamp);
        this.eventRepository.injectEvent(missed_event);
      });
  }

  private _on1to1Creation(conversationEntity: Conversation, eventJson: Object) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity)
      .then(messageEntity => this._updateMessageUserEntities(messageEntity))
      .then((messageEntity: MemberMessage) => {
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
   * @param conversationEntity Conversation to add the event to
   * @param event_json JSON data of 'conversation.asset-upload-complete' event
   * @returns Resolves when the event was handled
   */
  private _on_asset_upload_complete(
    conversationEntity: Conversation,
    event_json: import('./EventBuilder').AssetAddEvent,
  ) {
    return this.getMessageInConversationById(conversationEntity, event_json.id)
      .then(message_et => this.update_message_as_upload_complete(conversationEntity, message_et, event_json))
      .catch(error => {
        if (error.type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }

        this.logger.error(`Upload complete: Could not find message with id '${event_json.id}'`, event_json);
      });
  }

  /**
   * A conversation was created.
   *
   * @param eventJson JSON data of 'conversation.create' event
   * @param eventSource Source of event
   * @returns Resolves when the event was handled
   */
  private async _onCreate(
    eventJson: EventJson,
    eventSource?: EventSource,
  ): Promise<{conversationEntity: Conversation} | undefined> {
    const {conversation: conversationId, data: eventData, time} = eventJson;
    const eventTimestamp = new Date(time).getTime();
    const initialTimestamp = isNaN(eventTimestamp) ? this.getLatestEventTimestamp(true) : eventTimestamp;
    try {
      const existingConversationEntity = this.find_conversation_by_id(conversationId);
      if (existingConversationEntity) {
        throw new ConversationError(ConversationError.TYPE.NO_CHANGES, ConversationError.MESSAGE.NO_CHANGES);
      }

      const conversationEntity = this.mapConversations(eventData, initialTimestamp) as Conversation;
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
      const isNoChanges = error.type === ConversationError.TYPE.NO_CHANGES;
      if (!isNoChanges) {
        throw error;
      }
    }
    return undefined;
  }

  private async _onGroupCreation(conversationEntity: Conversation, eventJson: Object) {
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
    }, {} as Record<string, string>);
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
   * @param conversationEntity Conversation to add users to
   * @param eventJson JSON data of 'conversation.member-join' event
   * @returns Resolves when the event was handled
   */
  private async _onMemberJoin(conversationEntity: Conversation, eventJson: EventJson) {
    // Ignore if we join a 1to1 conversation (accept a connection request)
    const connectionEntity = this.connectionRepository.getConnectionByConversationId(conversationEntity.id);
    const isPendingConnection = connectionEntity && connectionEntity.isIncomingRequest();
    if (isPendingConnection) {
      return Promise.resolve();
    }

    const eventData = eventJson.data;

    eventData.user_ids.forEach((userId: string) => {
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
   * @param conversationEntity Conversation to remove users from
   * @param eventJson JSON data of 'conversation.member-leave' event
   * @returns Resolves when the event was handled
   */
  private async _onMemberLeave(
    conversationEntity: Conversation,
    eventJson: EventJson,
  ): Promise<{conversationEntity: Conversation; messageEntity: Message} | undefined> {
    const {data: eventData, from} = eventJson;
    const isFromSelf = from === this.selfUser().id;
    const removesSelfUser = eventData.user_ids.includes(this.selfUser().id);
    const selfLeavingClearedConversation = isFromSelf && removesSelfUser && conversationEntity.is_cleared();

    if (removesSelfUser) {
      conversationEntity.status(ConversationStatus.PAST_MEMBER);
      this.leaveCall(conversationEntity.id);
      if (this.selfUser().isTemporaryGuest()) {
        eventJson.from = this.selfUser().id;
      }
    }

    if (!selfLeavingClearedConversation) {
      const {messageEntity} = await this._addEventToConversation(conversationEntity, eventJson);
      (messageEntity as MemberMessage)
        .userEntities()
        .filter((userEntity: User) => !userEntity.isMe)
        .forEach((userEntity: User) => {
          conversationEntity.participating_user_ids.remove(userEntity.id);

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
  private _onMemberUpdate(conversationEntity: Conversation, eventJson: EventJson) {
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
      throw new ConversationError(
        ConversationError.TYPE.WRONG_CONVERSATION,
        ConversationError.MESSAGE.WRONG_CONVERSATION,
      );
    }

    const isFromSelf = !this.selfUser() || from === this.selfUser().id;
    if (!isFromSelf) {
      throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
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
   * @param conversationEntity Conversation to add the event to
   * @param event JSON data of 'conversation.asset-add'
   * @returns Resolves when the event was handled
   */
  private async _onAssetAdd(conversationEntity: Conversation, event: EventJson) {
    const fromSelf = event.from === this.selfUser().id;

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
        const user = await this.userRepository.getUserById(event.from);
        return this.injectFileTypeRestrictedMessage(
          conversationEntity,
          user,
          true,
          getFileExtensionOrName(fileName),
          event.id,
        );
      }
    }
    const {messageEntity} = await this._addEventToConversation(conversationEntity, event);
    const firstAsset = (messageEntity as ContentMessage).get_first_asset();
    if (firstAsset.is_image() || (firstAsset as FileAsset).status() === AssetTransferState.UPLOADED) {
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
  private _onMessageDeleted(conversationEntity: Conversation, eventJson: EventJson) {
    const {data: eventData, from, id: eventId, time} = eventJson;

    return this.getMessageInConversationById(conversationEntity, eventData.message_id)
      .then(deletedMessageEntity => {
        if (deletedMessageEntity.ephemeral_expires()) {
          return;
        }

        const isSameSender = from === deletedMessageEntity.from;
        if (!isSameSender) {
          throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
        }

        const isFromSelf = from === this.selfUser().id;
        if (!isFromSelf) {
          return this._addDeleteMessage(conversationEntity.id, eventId, time, deletedMessageEntity);
        }
      })
      .then(() => {
        return this._delete_message_by_id(conversationEntity, eventData.message_id);
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
  private _onMessageHidden(eventJson: EventJson) {
    const {conversation: conversationId, data: eventData, from} = eventJson;

    return Promise.resolve()
      .then(() => {
        const inSelfConversation = !this.self_conversation() || conversationId === this.self_conversation().id;
        if (!inSelfConversation) {
          throw new ConversationError(
            ConversationError.TYPE.WRONG_CONVERSATION,
            ConversationError.MESSAGE.WRONG_CONVERSATION,
          );
        }

        const isFromSelf = !this.selfUser() || from === this.selfUser().id;
        if (!isFromSelf) {
          throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
        }

        return this.get_conversation_by_id(eventData.conversation_id);
      })
      .then(conversationEntity => {
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
   * @param conversationEntity Conversation entity that a message was reacted upon in
   * @param eventJson JSON data of 'conversation.reaction' event
   * @returns Resolves when the event was handled
   */
  private _onReaction(conversationEntity: Conversation, eventJson: EventJson) {
    const conversationId = conversationEntity.id;
    const eventData = eventJson.data;
    const messageId = eventData.message_id;

    return this.getMessageInConversationById(conversationEntity, messageId)
      .then(messageEntity => {
        if (!messageEntity || !messageEntity.is_content()) {
          const type = messageEntity ? messageEntity.type : 'unknown';

          const log = `Cannot react to '${type}' message '${messageId}' in conversation '${conversationId}'`;
          this.logger.error(log, messageEntity);
          throw new ConversationError(ConversationError.TYPE.WRONG_TYPE, ConversationError.MESSAGE.WRONG_TYPE);
        }

        const changes = messageEntity.getUpdatedReactions(eventJson);
        if (changes) {
          const log = `Updating reactions of message '${messageId}' in conversation '${conversationId}'`;
          this.logger.debug(log, {changes, event: eventJson});

          this.eventService.updateEventSequentially(messageEntity.primary_key, changes);
          return this._prepareReactionNotification(conversationEntity, messageEntity, eventJson);
        }
        return undefined;
      })
      .catch(error => {
        const isNotFound = error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (!isNotFound) {
          const log = `Failed to handle reaction to message '${messageId}' in conversation '${conversationId}'`;
          this.logger.error(log, {error, event: eventJson});
          throw error;
        }
      });
  }

  private async _onButtonActionConfirmation(conversationEntity: Conversation, eventJson: EventJson) {
    const {messageId, buttonId} = eventJson.data;
    try {
      const messageEntity = await this.getMessageInConversationById(conversationEntity, messageId);
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
  private _onRename(conversationEntity: Conversation, eventJson: EventJson) {
    return this._addEventToConversation(conversationEntity, eventJson).then(({messageEntity}) => {
      this.conversationMapper.updateProperties(conversationEntity, eventJson.data);
      return {conversationEntity, messageEntity};
    });
  }

  /**
   * A conversation receipt mode was changed
   *
   * @param conversationEntity Conversation entity that will be renamed
   * @param eventJson JSON data of 'conversation.receipt-mode-update' event
   * @returns>} Resolves when the event was handled
   */
  private _onReceiptModeChanged(conversationEntity: Conversation, eventJson: EventJson) {
    return this._addEventToConversation(conversationEntity, eventJson).then(({messageEntity}) => {
      this.conversationMapper.updateSelfStatus(conversationEntity, {receipt_mode: eventJson.data.receipt_mode});
      return {conversationEntity, messageEntity};
    });
  }

  handleMessageExpiration(messageEntity: ContentMessage) {
    amplify.publish(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, messageEntity);
    const shouldDeleteMessage = !messageEntity.user().isMe || messageEntity.is_ping();
    if (shouldDeleteMessage) {
      this.get_conversation_by_id(messageEntity.conversation_id).then(conversationEntity => {
        const isPingFromSelf = messageEntity.user().isMe && messageEntity.is_ping();
        const deleteForSelf = isPingFromSelf || conversationEntity.removed_from_conversation();
        if (deleteForSelf) {
          return this.deleteMessage(conversationEntity, messageEntity);
        }

        const userIds = conversationEntity.isGroup() ? [this.selfUser().id, messageEntity.from] : undefined;
        return this.deleteMessageForEveryone(conversationEntity, messageEntity, userIds);
      });
    }
  }

  private async _initMessageEntity(conversationEntity: Conversation, eventJson: Object): Promise<Message> {
    const messageEntity = await this.event_mapper.mapJsonEvent(eventJson, conversationEntity);
    // eslint-disable-next-line no-return-await
    return this._updateMessageUserEntities(messageEntity);
  }

  private async _replaceMessageInConversation(conversationEntity: Conversation, eventId: string, newData: EventRecord) {
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
   * @param conversationEntity Conversation entity the event will be added to
   * @param eventJson Event data
   * @returns Promise that resolves with the message entity for the event
   */
  private async _addEventToConversation(
    conversationEntity: Conversation,
    eventJson: EventJson,
  ): Promise<{conversationEntity: Conversation; messageEntity: Message}> {
    const messageEntity = (await this._initMessageEntity(conversationEntity, eventJson)) as Message;
    if (conversationEntity && messageEntity) {
      const wasAdded = conversationEntity.add_message(messageEntity);
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
   * @param prepend=true Should existing messages be prepended
   * @returns Resolves with an array of mapped messages
   */
  private async _addEventsToConversation(events: EventRecord[], conversationEntity: Conversation, prepend = true) {
    const mappedEvents = await this.event_mapper.mapJsonEvents(events, conversationEntity);
    const updatedEvents = (await this._updateMessagesUserEntities(mappedEvents)) as ContentMessage[];
    const validatedMessages = (await this.ephemeralHandler.validateMessages(updatedEvents)) as ContentMessage[];
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
   * @param conversationEntity Conversation fetch events and users for
   */
  private _fetch_users_and_events(conversationEntity: Conversation) {
    if (!conversationEntity.is_loaded() && !conversationEntity.is_pending()) {
      this.updateParticipatingUserEntities(conversationEntity);
      this._get_unread_events(conversationEntity);
    }
  }

  /**
   * Forward the reaction event to the Notification repository for browser and audio notifications.
   *
   * @param conversationEntity Conversation that event was received in
   * @param messageEntity Message that has been reacted upon
   * @param eventJson -] JSON data of received reaction event
   * @returns Resolves when the notification was prepared
   */
  private _prepareReactionNotification(
    conversationEntity: Conversation,
    messageEntity: ContentMessage,
    eventJson: EventJson,
  ) {
    const {data: event_data, from} = eventJson;

    const messageFromSelf = messageEntity.from === this.selfUser().id;
    if (messageFromSelf && event_data.reaction) {
      return this.userRepository.getUserById(from).then(userEntity => {
        const reactionMessageEntity = new Message(messageEntity.id, SuperType.REACTION);
        reactionMessageEntity.user(userEntity);
        reactionMessageEntity.reaction = event_data.reaction;
        return {conversationEntity, messageEntity: reactionMessageEntity};
      });
    }

    return Promise.resolve({conversationEntity});
  }

  private _updateMessagesUserEntities(messageEntities: Message[]) {
    return Promise.all(messageEntities.map(messageEntity => this._updateMessageUserEntities(messageEntity)));
  }

  /**
   * Updates the user entities that are part of a message.
   *
   * @param messageEntity Message to be updated
   * @returns Resolves when users have been update
   */
  private _updateMessageUserEntities(messageEntity: Message) {
    return this.userRepository.getUserById(messageEntity.from).then(userEntity => {
      messageEntity.user(userEntity);
      const isMemberMessage = messageEntity.isMember();
      if (isMemberMessage || messageEntity.hasOwnProperty('userEntities')) {
        return this.userRepository.getUsersById((messageEntity as MemberMessage).userIds()).then(userEntities => {
          userEntities.sort(sortUsersByPriority);
          (messageEntity as MemberMessage).userEntities(userEntities);
          return messageEntity;
        });
      }
      if (messageEntity.is_content()) {
        const userIds = Object.keys(messageEntity.reactions());

        messageEntity.reactions_user_ets.removeAll();
        if (userIds.length) {
          return this.userRepository.getUsersById(userIds).then(userEntities => {
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
   * @param messageId Id of the message which upload has been cancelled
   */
  cancel_asset_upload(messageId: string) {
    this.send_asset_upload_failed(this.active_conversation(), messageId, ProtobufAsset.NotUploaded.CANCELLED);
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @param conversationEntity Conversation that contains the message
   * @param messageId ID of message to delete
   * @returns Resolves when message was deleted
   */
  private async _delete_message_by_id(conversationEntity: Conversation, messageId: string) {
    const isLastDeleted =
      conversationEntity.isShowingLastReceivedMessage() && conversationEntity.getLastMessage()?.id === messageId;

    const deleteCount = await this.eventService.deleteEvent(conversationEntity.id, messageId);

    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageId, conversationEntity.id);

    if (isLastDeleted && conversationEntity.getLastMessage()?.timestamp()) {
      conversationEntity.updateTimestamps(conversationEntity.getLastMessage(), true);
    }

    return deleteCount;
  }

  /**
   * Delete messages from UI and database.
   *
   * @param conversationEntity Conversation that contains the message
   * @param timestamp Timestamp as upper bound which messages to remove
   */
  private _deleteMessages(conversationEntity: Conversation, timestamp: number) {
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
  private _addDeleteMessage(conversationId: string, messageId: string, time: number, messageEntity: Message) {
    const deleteEvent = EventBuilder.buildDelete(conversationId, messageId, time, messageEntity);
    this.eventRepository.injectEvent(deleteEvent);
  }

  //##############################################################################
  // Message updates
  //##############################################################################

  /**
   * Update asset in UI and DB as failed
   *
   * @param message_et Message to update
   * @param reason=AssetTransferState.UPLOAD_FAILED Failure reason
   * @returns Resolve when message was updated
   */
  async update_message_as_upload_failed(message_et: ContentMessage, reason = AssetTransferState.UPLOAD_FAILED) {
    if (message_et) {
      if (!message_et.is_content()) {
        throw new Error(`Tried to update wrong message type as upload failed '${(message_et as any).super_type}'`);
      }

      const asset_et = message_et.get_first_asset() as FileAsset;
      if (asset_et) {
        if (!asset_et.is_downloadable()) {
          throw new Error(`Tried to update message with wrong asset type as upload failed '${asset_et.type}'`);
        }

        asset_et.status(reason);
        asset_et.upload_failed_reason(ProtobufAsset.NotUploaded.FAILED);
      }

      return this.eventService.updateEventAsUploadFailed(message_et.primary_key, reason);
    }
  }

  expectReadReceipt(conversationEntity: Conversation): boolean {
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
   * @param conversationEntity Conversation that contains the message
   * @param message_et Message to update
   * @param event_json Uploaded asset event information
   * @returns Resolve when message was updated
   */
  update_message_as_upload_complete(
    conversationEntity: Conversation,
    message_et: ContentMessage,
    event_json: EventJson,
  ) {
    const {id, key, otr_key, sha256, token} = event_json.data;
    const asset_et = message_et.get_first_asset() as FileAsset;

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
   * @param conversationEntity Conversation entity
   * @param genericMessage Protobuf message
   * @param callMessageEntity Optional call message
   */
  private _trackContributed(conversationEntity: Conversation, genericMessage: GenericMessage) {
    const isEphemeral = genericMessage.content === GENERIC_MESSAGE_TYPE.EPHEMERAL;

    if (isEphemeral) {
      genericMessage = genericMessage.ephemeral as any;
    }

    const messageContentType = genericMessage.content;
    let actionType;
    let numberOfMentions;
    switch (messageContentType) {
      case 'asset': {
        const protoAsset = genericMessage.asset;
        if (protoAsset.original) {
          if (!!protoAsset.original.image) {
            actionType = 'photo';
          } else if (!!protoAsset.original.audio) {
            actionType = 'audio';
          } else if (!!protoAsset.original.video) {
            actionType = 'video';
          } else {
            actionType = 'file';
          }
        }
        break;
      }

      case 'image': {
        actionType = 'image';
        break;
      }

      case 'knock': {
        actionType = 'ping';
        break;
      }

      case 'reaction': {
        actionType = 'like';
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

      case 'deleted': {
        actionType = 'delete';
      }

      default:
        break;
    }
    if (actionType) {
      const selfUserTeamId = this.selfUser().teamId;
      const participants = conversationEntity.participating_user_ets();
      const guests = participants.filter(user => user.isGuest()).length;
      const guestsWireless = participants.filter(user => user.isTemporaryGuest()).length;
      // guests that are from a different team
      const guestsPro = participants.filter(user => !!user.teamId && user.teamId !== selfUserTeamId).length;
      const services = participants.filter(user => user.isService).length;

      let segmentations = {
        [Segmentation.CONVERSATION.GUESTS]: roundLogarithmic(guests, 6),
        [Segmentation.CONVERSATION.GUESTS_PRO]: roundLogarithmic(guestsPro, 6),
        [Segmentation.CONVERSATION.GUESTS_WIRELESS]: roundLogarithmic(guestsWireless, 6),
        [Segmentation.CONVERSATION.SIZE]: roundLogarithmic(participants.length, 6),
        [Segmentation.CONVERSATION.TYPE]: trackingHelpers.getConversationType(conversationEntity),
        [Segmentation.CONVERSATION.SERVICES]: roundLogarithmic(services, 6),
        [Segmentation.MESSAGE.ACTION]: actionType,
        [Segmentation.MESSAGE.IS_REPLY]: !!genericMessage.text?.quote,
        [Segmentation.MESSAGE.MENTION]: numberOfMentions,
      };
      const isTeamConversation = !!conversationEntity.team_id;
      if (isTeamConversation) {
        segmentations = {...segmentations, ...trackingHelpers.getGuestAttributes(conversationEntity)};
      }

      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CONTRIBUTED, segmentations);
    }
  }
}
