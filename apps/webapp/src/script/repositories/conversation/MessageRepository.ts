/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {
  isFunction,
  isNonEmptyArray,
  isNonEmptyString,
  isNull,
  isNullOrUndefined,
  isNumber,
  isObject,
  isTruthy,
  isUndefined,
} from '@sindresorhus/is';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {arrayIncludes} from 'ts-extras';
import {match, P} from 'ts-pattern';
import {container} from 'tsyringe';
import {partition} from 'underscore';

import {Asset, Availability, Confirmation, GenericMessage, Mention} from '@wireapp/protocol-messaging';

import {findDeletedClients} from './ClientMismatchUtil';
import {ConversationRepository} from './ConversationRepository';
import {isMLSConversation, supportsReadReceipts} from './ConversationSelectors';
import {ConversationState} from './ConversationState';
import {ConversationVerificationState} from './ConversationVerificationState';
import {EventBuilder, type ClientConversationEvent} from './EventBuilder';
import {EventMapper} from './EventMapper';
import {getLinkPreviewFromString} from './linkPreviews';
import {classifySendError, type SendErrorClass} from './outbox/classifySendError';
import type {FailedReason} from './outbox/FailedReason';
import {
  changeCorrelationKeysOf,
  laneOfChanges,
  laneOfMessages,
  laneOfConversationReceipts,
  laneOfReceipts,
  messageCorrelationKey,
  parseMessageChangePayload,
  parseMessagePayload,
  parsePingPayload,
  parseReceiptPayload,
  receiptCorrelationKey,
  type AssetMessagePayload,
  type EditMessagePayload as OutboxEditPayload,
  type MessageChangePayload,
  type MessagePayload,
  type PingPayload,
  type ReceiptPayload as OutboxReceiptPayload,
  type StoredEvent,
  type StoredMention,
  type TextMessagePayload as OutboxTextPayload,
} from './outbox/messageOutboxTypes';
import type {OutboxState} from './outbox/OutboxState';

import {AssetAuditData} from '../../apiClient/asset/assetApi';
import {MessageSendingStatus} from '../../apiClient/conversation/messageSendingStatus';
import {QualifiedUserClients} from '../../apiClient/conversation/qualifiedUserClients';
import {BackendErrorLabel} from '../../apiClient/http/backendErrorLabel';
import type {RequestRetryOptions} from '../../apiClient/http/failFastRequestConfig';
import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {QualifiedId} from '../../apiClient/user/qualifiedId';
import {RequestCancellationError} from '../../apiClient/user/userError';
import {PrimaryModal} from '../../components/Modals/PrimaryModal';
import {Config} from '../../Config';
import {
  GenericMessageType,
  InCallEmojiType,
  MessageSendingState,
  MessageTargetMode,
  ReactionType,
  SendResult,
  type ConversationService,
} from '../../core/conversation';
import {
  EditedTextContent,
  FileMetaDataContent,
  LinkPreviewContent,
  LinkPreviewUploadedContent,
  MultiPartContent,
  TextContent,
} from '../../core/conversation/content';
import * as MessageBuilder from '../../core/conversation/message/messageBuilder';
import {OtrMessage} from '../../core/conversation/message/otrMessage';
import {TextContentBuilder} from '../../core/conversation/message/textContentBuilder';
import type {EncryptedAssetUploaded} from '../../core/cryptography/assetCryptography/encryptedAsset';
import {isQualifiedUserClients} from '../../core/util';
import {ConversationError} from '../../error/conversationError';
import {showLegalHoldWarningModal} from '../../legal-hold/LegalHoldWarning';
import {hashEvent} from '../../message/hashEvent';
import {MentionEntity} from '../../message/mentionEntity';
import {QuoteEntity} from '../../message/quoteEntity';
import {StatusType} from '../../message/statusType';
import type {EnqueueOutcome, KindHandle, OperationView, Outbox, AttemptOutcome, RegisterOutcome} from '../../outbox';
import {Core} from '../../service/coreSingleton';
import {ServerTimeHandler} from '../../time/serverTimeHandler';
import {
  cancelSendingLinkPreview,
  clearLinkPreviewSendingState,
  shouldSendLinkPreviewForMessage,
} from '../../util/linkPreviewSender';
import {type Translate, Declension, joinNames} from '../../util/localizerUtil';
import {getLogger, Logger} from '../../util/logger';
import {isMarkdownText} from '../../util/markdownUtil';
import {areMentionsDifferent, isTextDifferent} from '../../util/messageComparator';
import {roundLogarithmic} from '../../util/numberUtil';
import {matchQualifiedIds} from '../../util/qualifiedId';
import {capitalizeFirstChar} from '../../util/stringUtil';
import {TIME_IN_MILLIS} from '../../util/timeUtil';
import {isBackendError, isErrorWithCode} from '../../util/typePredicateUtil';
import {arrayToBase64, loadUrlBlob, supportsMLS} from '../../util/util';
import {createUuid} from '../../util/uuid';
import {WebAppEvents} from '../../webAppEvents';
import {buildMetadata, ImageMetadata, isAudio, isImage, isVideo} from '../assets/assetMetaDataBuilder';
import {AssetRepository} from '../assets/assetRepository';
import {AssetTransferState} from '../assets/assetTransferState';
import {AudioRepository} from '../audio/audioRepository';
import {AudioType} from '../audio/audioType';
import {ClientState} from '../client/ClientState';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {Conversation} from '../entity/Conversation';
import {CompositeMessage} from '../entity/message/compositeMessage';
import {ContentMessage} from '../entity/message/contentMessage';
import {FileAsset} from '../entity/message/fileAsset';
import {Message} from '../entity/message/message';
import {User} from '../entity/User';
import {EventRepository} from '../event/EventRepository';
import {EventService, type IdentifiedUpdatePayload} from '../event/EventService';
import {EventTypeHandling} from '../event/EventTypeHandling';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {PropertiesRepository} from '../properties/propertiesRepository';
import {PROPERTIES_TYPE} from '../properties/propertiesType';
import {StorageKey, type AssetRecord, type EventRecord, type ReactionMap} from '../storage';
import {TeamState} from '../team/TeamState';
import {UserType} from '../tracking/attribute';
import {EventName} from '../tracking/eventName';
import * as trackingHelpers from '../tracking/helpers';
import {Segmentation} from '../tracking/segmentation';
import {protoFromType} from '../user/availabilityMapper';
import {UserRepository} from '../user/userRepository';
import {UserState} from '../user/userState';

type OptimisticMessageEvent = Parameters<EventRepository['injectEvent']>[0];

const conversationStatisticsRoundingFactor = 6;

type OutgoingText = {
  conversation: Conversation;
  textMessage: string;
  mentions: MentionEntity[];
  QuoteEntity?: OutgoingQuote;
  attachments?: MultiPartContent['attachments'];
};
type TextMessageRetry = OutgoingText & {messageId: string};

export interface MessageSendingOptions {
  /** Send native push notification for message. Default is `true`. */
  nativePush?: boolean;
  recipients?: QualifiedId[] | QualifiedUserClients;
}

type AddedMessageWaiter = {
  readonly messagePromise: Promise<Message>;
  readonly dispose: () => void;
};

export enum CONSENT_TYPE {
  INCOMING_CALL = 'incoming_call',
  MESSAGE = 'message',
  OUTGOING_CALL = 'outgoing_call',
}

export type ContributedSegmentations = Record<string, number | string | boolean | UserType>;

type ClientMismatchHandlerFn = (
  mismatch: Partial<MessageSendingStatus>,
  conversation?: Conversation,
  silent?: boolean,
  consentType?: CONSENT_TYPE,
) => Promise<boolean>;

/** A Quote that is meant to be sent in a message (and thus needs to have a valid hash) */
export type OutgoingQuote = QuoteEntity & {hash: Uint8Array};

type TextMessagePayload = {
  conversation: Conversation;
  linkPreview?: LinkPreviewUploadedContent;
  mentions?: MentionEntity[];
  message: string;
  messageId?: string;
  quote?: OutgoingQuote;
};
type EditMessagePayload = TextMessagePayload & {originalMessageId: string};

type MultipartMessagePayload = TextMessagePayload & {
  attachments: MultiPartContent['attachments'];
};

type EditMultiPartMessagePayload = MultipartMessagePayload & {originalMessageId: string};

const enum SendAndInjectSendingState {
  FAILED = 'FAILED',
  QUEUED = 'QUEUED',
}

/** What a change keeps in its payload to be taken back when it is deleted unsent */
type PreviousState = {type: 'reactions'; reactions: string} | {type: 'event'; event: StoredEvent};

type SendAndInjectResult = Omit<SendResult, 'state'> & {state: MessageSendingState | SendAndInjectSendingState};

type BackendSendOptions = MessageSendingOptions & {
  /** One HTTP attempt without network retries, because the outbox retries the send itself */
  failFast?: boolean;
  silentDegradationWarning?: boolean;
  skipInjection?: boolean;
  skipSelf?: boolean;
  syncTimestamp?: boolean;
  targetMode?: MessageTargetMode;
};

type CoreSendOptions = Parameters<ConversationService['send']>[0];

/** A message that has already been stored in DB and has a primary key */
type StoredMessage = Message & {primary_key: string};
type StoredContentMessage = ContentMessage & {primary_key: string};

type AssetMetadataMessage = {message: GenericMessage; metaData: FileMetaDataContent};
type RecordedUpload = Pick<AssetRecord, 'otr_key' | 'sha256' | 'domain' | 'token'> & {key: string};

function readRecordedUpload(record: EventRecord): RecordedUpload | undefined {
  const data = (record as {data?: Partial<AssetRecord>}).data;
  if (!isNonEmptyString(data?.key) || isUndefined(data.otr_key) || isUndefined(data.sha256)) {
    return undefined;
  }
  return {domain: data.domain, key: data.key, otr_key: data.otr_key, sha256: data.sha256, token: data.token};
}

type OutboxHandles = {
  message: KindHandle<MessagePayload>;
  messageChange: KindHandle<MessageChangePayload>;
  ping: KindHandle<PingPayload>;
  receipt: KindHandle<OutboxReceiptPayload>;
};

function handleOf<Payload>(registerResult: RegisterOutcome<Payload>): KindHandle<Payload> {
  if (registerResult.outcome !== 'kind-registered') {
    throw new Error(`Can't register an outbox kind: ${registerResult.outcome}`);
  }
  return registerResult.handle;
}

/** The payloads whose operation has an optimistic message of its own */
type ShownPayload = OutboxTextPayload | AssetMessagePayload | OutboxEditPayload | PingPayload;

type PermissionHold = {
  reason: 'sending-permission';
  waitingOnConversations: QualifiedId[];
  whenDeclined: 'mark-declined' | 'delete';
};

type Hold = PermissionHold | {reason: 'editing'; conversationId: string};

/** The message each conversation's input bar edits, by conversation id, for the holds that outlive a session */
type EditedMessages = Record<string, string>;

/** The message a reply quotes or a reaction is to */
function referencedMessageId(payload: MessagePayload): string | undefined {
  switch (payload.type) {
    case 'reaction':
      return payload.targetMessageId;
    case 'text':
      return payload.quote?.messageId;
    default:
      return undefined;
  }
}

/** An enqueue with the key of a running attempt answers how that attempt ended, whichever way it ended. */
function endsRunningAttempt(enqueueResult: EnqueueOutcome<unknown>): boolean {
  return enqueueResult.outcome === 'operation-succeeded' || enqueueResult.outcome === 'operation-deleted';
}

export class MessageRepository {
  private readonly logger: Logger;
  private readonly eventService: EventService;
  private readonly event_mapper: EventMapper;
  private isBlockingNotificationHandling: boolean;
  private onClientMismatch?: ClientMismatchHandlerFn;
  private readonly outboxHandles?: OutboxHandles;
  /** By message id */
  private readonly showing = new Map<string, Promise<void>>();
  /** By correlation key */
  private readonly holds = new Map<string, Hold>();
  /** Conversation ids */
  private readonly openPrompts = new Set<string>();
  /** The ids of the text and file operations that still have to go out */
  private readonly waitingMessages = new Set<string>();
  /** The unfinished replies and reactions in the lane of messages, by operation id, in the order they were first seen */
  private readonly referrers = new Map<string, OperationView<MessagePayload>>();
  private readonly changeUndoneListeners = new Set<(change: 'edit' | 'delete') => void>();

  private get coreServices(): NonNullable<Core['service']> {
    const coreServices = this.core.service;
    if (isUndefined(coreServices)) {
      throw new Error('Core services are not initialized');
    }

    return coreServices;
  }

  constructor(
    private readonly conversationRepositoryProvider: () => ConversationRepository,
    private readonly cryptography_repository: CryptographyRepository,
    private readonly eventRepository: EventRepository,
    private readonly propertyRepository: PropertiesRepository,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userRepository: UserRepository,
    private readonly assetRepository: AssetRepository,
    private readonly audioRepository: AudioRepository,
    private readonly translate: Translate,
    private readonly outbox: Outbox | undefined,
    /** Required with an outbox */
    private readonly fireAndForgetInvoker: FireAndForgetInvoker | undefined,
    private readonly userState = container.resolve(UserState),
    private readonly clientState = container.resolve(ClientState),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly teamState = container.resolve(TeamState),
    private readonly core = container.resolve(Core),
  ) {
    this.logger = getLogger('MessageRepository');

    this.eventService = eventRepository.eventService;
    this.event_mapper = new EventMapper(undefined, this.translate);

    this.isBlockingNotificationHandling = true;

    this.initSubscriptions();

    if (this.outbox !== undefined) {
      this.outboxHandles = this.registerOutboxKinds();
    }
  }

  private get conversationService(): ConversationService {
    return this.coreServices.conversation;
  }

  private initSubscriptions(): void {
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setNotificationHandlingState);
    amplify.subscribe(WebAppEvents.USER.SET_AVAILABILITY, this.sendAvailabilityStatus);
  }

  /**
   * Will set a handler when sending message reports a client mismatch
   * @param onClientMismatch - The function to be called when there is a mismatch. If this function resolves to 'false' then the sending will be cancelled
   * @return void
   */
  public setClientMismatchHandler(onClientMismatch: ClientMismatchHandlerFn): void {
    this.onClientMismatch = onClientMismatch;
  }

  /**
   * Triggers the handler for mismatch. Can be used if a mismatch is triggered from outside the MessageRepository
   *
   * @param conversation
   * @param mismatch
   */
  public async updateMissingClients(
    conversation: Conversation,
    allClients: QualifiedUserClients,
    consentType?: CONSENT_TYPE,
  ): Promise<boolean | undefined> {
    const mismatch = {missing: allClients} as MessageSendingStatus;
    return this.onClientMismatch?.(mismatch, conversation, false, consentType);
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not allow sending messages when handling the notification stream
   * @param handlingState State of the notifications stream handling
   */
  private readonly setNotificationHandlingState = (handlingState: NOTIFICATION_HANDLING_STATE): void => {
    const updatedHandlingState = handlingState !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.isBlockingNotificationHandling !== updatedHandlingState) {
      this.isBlockingNotificationHandling = updatedHandlingState;
    }

    if (handlingState === NOTIFICATION_HANDLING_STATE.WEB_SOCKET) {
      this.outbox?.resume();
    } else {
      this.outbox?.pause();
    }
  };

  /**
   * Send ping in specified conversation.
   * @param conversationEntity Conversation to send knock in
   * @returns Resolves after sending the knock
   */
  public async sendPing(conversation: Conversation): Promise<SendAndInjectResult> {
    if (this.outbox !== undefined) {
      return this.enqueuePing(conversation);
    }
    const ping = MessageBuilder.buildPingMessage({
      expectsReadConfirmation: this.expectReadReceipt(conversation),
      hotKnock: false,
      legalHoldStatus: conversation.legalHoldStatus(),
    });

    void this.audioRepository.play(AudioType.OUTGOING_PING);
    return this.sendAndInjectMessage(ping, conversation, {enableEphemeral: true});
  }

  /**
   * @see https://wearezeta.atlassian.net/wiki/spaces/CORE/pages/300351887/Using+federation+environments
   * @see https://github.com/wireapp/wire-docs/tree/master/src/understand/federation
   * @see https://docs.wire.com/understand/federation/index.html
   */
  private async sendText(
    {conversation, message, mentions = [], linkPreview, quote, messageId}: TextMessagePayload,
    options?: {syncTimestamp?: boolean},
    isNewTextMessage = false,
  ): Promise<SendAndInjectResult> {
    const textMessage = MessageBuilder.buildTextMessage(
      this.decorateTextMessage(
        {
          text: message,
        },
        conversation,
        {linkPreview, mentions, quote},
      ),
      messageId,
    );

    if (!isNewTextMessage || !isNonEmptyString(this.clientState.currentClient?.id)) {
      return this.sendAndInjectMessage(textMessage, conversation, {...options, enableEphemeral: true});
    }

    return this.sendTextWithReliableInMemoryStatus(textMessage, conversation, {
      ...options,
      enableEphemeral: true,
    });
  }

  private createAddedMessageWaiter(conversation: Conversation, messageId: string): AddedMessageWaiter {
    let resolveMessage: ((messageEntity: Message) => void) | undefined;
    let isDisposed = false;

    const messagePromise = new Promise<Message>((resolve): void => {
      resolveMessage = resolve;
    });

    function dispose(): void {
      if (!isDisposed) {
        isDisposed = true;
        amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, onMessageAdded);
      }
    }

    function onMessageAdded(messageEntity: Message): void {
      const isMatchingMessage = messageEntity.id === messageId && messageEntity.conversation_id === conversation.id;

      if (isMatchingMessage && !isUndefined(resolveMessage)) {
        dispose();
        resolveMessage(messageEntity);
      }
    }

    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, onMessageAdded);

    return {dispose, messagePromise};
  }

  private async sendTextWithReliableInMemoryStatus(
    textMessage: GenericMessage,
    conversation: Conversation,
    options: MessageSendingOptions & {enableEphemeral: true; syncTimestamp?: boolean},
  ): Promise<SendAndInjectResult> {
    const addedMessageWaiter = this.createAddedMessageWaiter(conversation, textMessage.messageId);

    try {
      const sendResult = await this.sendAndInjectMessage(textMessage, conversation, options);

      if (sendResult.state === MessageSendingState.OUTGOING_SENT) {
        const messageEntity = await addedMessageWaiter.messagePromise;
        if (messageEntity.status() === StatusType.SENDING) {
          const updatedStatus = messageEntity.readReceipts().length > 0 ? StatusType.SEEN : StatusType.SENT;
          messageEntity.status(updatedStatus);

          const shouldSynchronizeTimestamp = isUndefined(options.syncTimestamp) || options.syncTimestamp;
          if (shouldSynchronizeTimestamp) {
            const timestamp = new Date(sendResult.sentAt).getTime();
            if (!isNaN(timestamp)) {
              messageEntity.timestamp(timestamp);
              conversation.updateTimestampServer(timestamp, true);
              conversation.updateTimestamps(messageEntity);
            }
          }

          this.conversationRepositoryProvider().checkMessageTimer(messageEntity as ContentMessage);
        }
      }

      return sendResult;
    } finally {
      addedMessageWaiter.dispose();
    }
  }

  /**
   * @see https://wearezeta.atlassian.net/wiki/spaces/CORE/pages/300351887/Using+federation+environments
   * @see https://github.com/wireapp/wire-docs/tree/master/src/understand/federation
   * @see https://docs.wire.com/understand/federation/index.html
   */
  private async sendMultipartText(
    {conversation, message, messageId, attachments, linkPreview, mentions = [], quote}: MultipartMessagePayload,
    options?: {syncTimestamp?: boolean},
  ): Promise<SendAndInjectResult> {
    const text = this.decorateTextMessage(
      {
        text: message,
      },
      conversation,
      {linkPreview, mentions, quote},
    );
    const textMessage = MessageBuilder.buildMultipartMessage(attachments, text, messageId);

    return this.sendAndInjectMessage(textMessage, conversation, {...options, enableEphemeral: true});
  }

  private async sendEdit({
    conversation,
    message,
    messageId,
    originalMessageId,
    mentions = [],
    quote,
  }: EditMessagePayload): Promise<SendAndInjectResult> {
    const editMessage = MessageBuilder.buildEditedTextMessage(
      this.decorateTextMessage(
        {
          originalMessageId: originalMessageId,
          text: message,
        },
        conversation,
        {mentions, quote},
      ),
      messageId,
    );

    return this.sendAndInjectMessage(editMessage, conversation, {syncTimestamp: false});
  }

  private async sendEditMultiPart({
    attachments,
    conversation,
    message,
    messageId,
    originalMessageId,
    mentions = [],
    quote,
  }: EditMultiPartMessagePayload): Promise<SendAndInjectResult> {
    const editedMessage = MessageBuilder.buildEditedMultipartMessage(
      attachments,
      this.decorateTextMessage(
        {
          originalMessageId: originalMessageId,
          text: message,
        },
        conversation,
        {mentions, quote},
      ),
      originalMessageId,
      messageId,
    );
    return this.sendAndInjectMessage(editedMessage, conversation, {syncTimestamp: false});
  }

  private decorateTextMessage<T extends TextContent | EditedTextContent>(
    baseMessage: T,
    conversation: Conversation,
    {
      mentions = [],
      quote,
      linkPreview,
    }: {
      linkPreview?: LinkPreviewUploadedContent;
      mentions: MentionEntity[];
      quote?: OutgoingQuote;
    },
  ): T {
    const quoteData = isUndefined(quote)
      ? undefined
      : {quotedMessageId: quote.messageId, quotedMessageSha256: new Uint8Array(quote.hash)};

    return new TextContentBuilder(baseMessage)
      .withMentions(
        mentions.map(mention => {
          return {
            length: mention.length,
            qualifiedUserId: mention.userQualifiedId,
            start: mention.startIndex,
            userId: mention.userId,
          };
        }),
      )
      .withQuote(quoteData)
      .withLinkPreviews(!isUndefined(linkPreview) ? [linkPreview] : [])
      .withReadConfirmation(this.expectReadReceipt(conversation))
      .withLegalHoldStatus(conversation.legalHoldStatus())
      .build();
  }

  /**
   * Send text message with link preview in specified conversation.
   *
   * @param conversation Conversation that should receive the message
   * @param textMessage Plain text message
   * @param mentions Mentions part of the message
   * @param QuoteEntity Quoted message
   * @returns Resolves after sending the message
   */
  public async sendTextWithLinkPreview({
    conversation,
    textMessage,
    mentions,
    QuoteEntity,
    messageId,
    attachments,
  }: OutgoingText & {messageId?: string}): Promise<void> {
    if (this.outbox !== undefined) {
      return this.enqueueText({conversation, textMessage, mentions, QuoteEntity, attachments});
    }
    const textPayload = {
      conversation,
      mentions,
      message: textMessage,
      quote: QuoteEntity,
      // We set the id explicitely in order to be able to override the message if we generate a link preview
      // Similarly, we provide that same id when we retry to send a failed message in order to override the original
      messageId: messageId ?? createUuid(),
    };

    let state;
    if (isNonEmptyArray(attachments)) {
      state = (await this.sendMultipartText({...textPayload, attachments})).state;
    } else {
      state = (await this.sendText(textPayload, undefined, isUndefined(messageId))).state;
    }

    if (state !== MessageSendingState.CANCELED) {
      await this.handleLinkPreview(textPayload, conversation.qualifiedId);
    }
  }

  /** The message keeps its id and its place in the conversation. */
  public async retryTextMessage(retry: TextMessageRetry): Promise<void> {
    if (this.outbox !== undefined) {
      return this.enqueueTextAgain(retry);
    }
    return this.sendTextWithLinkPreview(retry);
  }

  /**
   * Send edited message in specified conversation.
   *
   * @param conversation Conversation entity
   * @param textMessage Edited plain text message
   * @param originalMessage Original message entity
   * @param mentions Mentions as part of the message
   * @returns Resolves after sending the message
   */
  public async sendMessageEdit(
    conversation: Conversation,
    textMessage: string,
    originalMessage: ContentMessage,
    mentions: MentionEntity[],
  ): Promise<OtrMessage | void> {
    const hasDifferentText = isTextDifferent(originalMessage, textMessage);
    const hasDifferentMentions = areMentionsDifferent(originalMessage, mentions);
    const wasEdited = hasDifferentText || hasDifferentMentions;

    if (!wasEdited) {
      throw new ConversationError(
        ConversationError.TYPE.NO_MESSAGE_CHANGES,
        ConversationError.MESSAGE.NO_MESSAGE_CHANGES,
      );
    }

    if (this.outbox !== undefined) {
      return this.enqueueEdit(conversation, textMessage, originalMessage, mentions);
    }

    const originalMessageId = originalMessage.id;
    const messagePayload = {
      attachments: originalMessage
        .getMultipartAssets()
        .map(multipart => {
          return multipart.attachments?.() ?? [];
        })
        .flat()
        .filter(Boolean),
      conversation,
      mentions,
      message: textMessage,
      messageId: createUuid(), // We set the id explicitely in order to be able to override the message if we generate a link preview
      originalMessageId,
    };

    // We cancel the sending of the link preview if the user has edited the message
    // It prevents from sending a link preview for a message that has been replaced by another one
    cancelSendingLinkPreview(originalMessageId);
    try {
      const {state} = originalMessage.hasMultipartAsset()
        ? await this.sendEditMultiPart(messagePayload)
        : await this.sendEdit(messagePayload);
      if (state !== MessageSendingState.CANCELED) {
        await this.handleLinkPreview(messagePayload, conversation.qualifiedId);
      }
    } finally {
      clearLinkPreviewSendingState(originalMessageId);
    }
  }

  private async handleLinkPreview(
    textPayload: TextMessagePayload & {messageId: string},
    conversationId: QualifiedId,
  ): Promise<void> {
    // check if the user actually wants to send link previews
    if (
      !isTruthy(this.propertyRepository.getPreference(PROPERTIES_TYPE.PREVIEWS.SEND)) ||
      !Config.getConfig().FEATURE.ALLOW_LINK_PREVIEWS
    ) {
      return;
    }

    const shouldSendLinkPreview = shouldSendLinkPreviewForMessage(textPayload.messageId);

    if (!shouldSendLinkPreview) {
      return;
    }

    const linkPreview = await getLinkPreviewFromString(textPayload.message);
    if (!isUndefined(linkPreview)) {
      const isAuditLogEnabled = this.teamState.isAuditLogEnabled();

      // If we detect a link preview, then we go on and send a new message (that will override the initial message) containing the link preview
      await this.sendText(
        {
          ...textPayload,
          linkPreview: !isUndefined(linkPreview.image)
            ? await this.coreServices.linkPreview.uploadLinkPreviewImage(
                linkPreview as LinkPreviewContent,
                conversationId,
                isAuditLogEnabled,
              )
            : linkPreview,
        },
        {syncTimestamp: false},
      );
    }
  }

  /**
   * Send a specific GIF to a conversation.
   *
   * @param conversationEntity Conversation to send message in
   * @param url URL of giphy image
   * @param tag tag tag used for gif search
   * @param QuoteEntity Quote as part of the message
   * @returns Resolves when the gif was posted
   */
  public async sendGif(
    conversationEntity: Conversation,
    url: string,
    tag: string | number | Record<string, string>,
    QuoteEntity?: OutgoingQuote,
  ): Promise<void> {
    if (!isTruthy(tag)) {
      tag = this.translate('extensionsGiphyRandom');
    }

    const blob = await loadUrlBlob(url);
    const textMessage = this.translate('extensionsGiphyMessage', {tag: tag as string | number}, {}, true);
    this.sendText({conversation: conversationEntity, message: textMessage, quote: QuoteEntity});
    return this.uploadImages(conversationEntity, [blob]);
  }

  /**
   * Post images to a conversation.
   *
   * @param conversationEntity Conversation to post the images
   */
  public uploadImages(conversationEntity: Conversation, images: Blob[]): void {
    this.uploadFiles(conversationEntity, images, true);
  }

  /**
   * Post files to a conversation.
   *
   * @param conversationEntity Conversation to post the files
   * @param files files
   * @param asImage whether or not the file should be treated as an image
   */
  public uploadFiles(conversationEntity: Conversation, files: Blob[], asImage?: boolean): void {
    if (this.canUploadAssetsToConversation(conversationEntity)) {
      Array.from(files).forEach(file => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Uploads are intentionally started without awaiting this batch.
        this.uploadFile(conversationEntity, file, asImage);
      });
    }
  }

  /**
   * Can user upload assets to conversation.
   * @param conversationEntity Conversation to check
   * @returns Can assets be uploaded
   */
  private canUploadAssetsToConversation(conversationEntity: Conversation): boolean {
    return (
      !isNullOrUndefined(conversationEntity) &&
      !conversationEntity.isRequest() &&
      !conversationEntity.isSelfUserRemoved()
    );
  }

  /**
   * Post file to a conversation using v3
   *
   * @param conversation Conversation to post the file
   * @param file File object
   * @param asImage whether or not the file should be treated as an image
   * @param originalId Id of the messsage currently in db, necessary to replace the original message
   * @returns Resolves when file was uploaded
   */
  private async uploadFile(
    conversation: Conversation,
    file: Blob,
    asImage: boolean = false,
    originalId?: string,
  ): Promise<EventRecord | void> {
    if (this.outbox !== undefined) {
      return this.enqueueAsset(conversation, file, asImage);
    }

    const uploadStarted = Date.now();
    const beforeUnload = (event: Event): void => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', beforeUnload);
    const assetMetadata = await this.createAssetMetadata(conversation, file, asImage, originalId);

    if (isNull(assetMetadata)) {
      window.removeEventListener('beforeunload', beforeUnload);
      return;
    }

    const {message, metaData} = assetMetadata;
    const {messageId} = message;

    try {
      const {state} = await this.sendAssetRemotedata(conversation, file, messageId, asImage, metaData);

      if (state === SendAndInjectSendingState.FAILED) {
        await this.storeFileInDb(conversation, messageId, file);
        return;
      }

      if (state === MessageSendingState.CANCELED) {
        // The user has canceled the upload, no need to do anything else
        return;
      }

      const uploadDuration = (Date.now() - uploadStarted) / TIME_IN_MILLIS.SECOND;
      this.logger.info(`Finished to upload asset for conversation'${conversation.id} in ${uploadDuration}`);
    } catch (error: unknown) {
      if (error instanceof RequestCancellationError) {
        return;
      }
      this.logger.error(`Failed to upload asset for conversation '${conversation.id}': ${(error as Error).message}`, {
        error,
      });
      const messageEntity = await this.getMessageInConversationById(conversation, messageId);
      await this.sendAssetUploadFailed(conversation, messageEntity.id);
      return this.updateMessageAsUploadFailed(messageEntity);
    } finally {
      window.removeEventListener('beforeunload', beforeUnload);
    }
  }

  /**
   * Retry sending a file to a conversation when the original message failed to be sent
   *
   * @param conversation Conversation to post the file
   * @param file File object
   * @param asImage whether or not the file should be treated as an image
   * @param originalId Id of the messsage currently in db, necessary to replace the original message
   * @returns Resolves when file was uploaded
   */
  public async retryUploadFile(
    conversation: Conversation,
    file: Blob,
    asImage: boolean = false,
    originalId: string,
  ): Promise<EventRecord | void> {
    if (this.outbox !== undefined) {
      return this.enqueueAssetAgain(conversation, file, asImage, originalId);
    }
    await this.uploadFile(conversation, file, asImage, originalId);
  }

  /**
   * Store a file in offline db to be able to send it later
   *
   * @param conversation Conversation to post the file
   * @param file File object to be stored in db
   * @param messageId Id of the messsage in db to update
   * @returns Resolves when database was updated
   */
  private async storeFileInDb(
    conversation: Conversation,
    messageId: string,
    file: Blob,
  ): Promise<IdentifiedUpdatePayload | undefined> {
    try {
      const messageEntity = await this.getMessageInConversationById(conversation, messageId);
      messageEntity.fileData(file);
      return this.eventService.updateEvent(messageEntity.primary_key, {
        fileData: file,
      });
    } catch (error: unknown) {
      if ((error as any).type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
    return undefined;
  }

  /**
   * Update asset in UI and DB as failed
   *
   * @param message_et Message to update
   * @param reason Failure reason
   * @returns Resolves when the message was updated
   */
  private async updateMessageAsUploadFailed(
    message_et: StoredMessage,
    reason = AssetTransferState.UPLOAD_FAILED,
  ): Promise<EventRecord | undefined> {
    if (!message_et.isContent()) {
      throw new Error(`Tried to update wrong message type as upload failed '${(message_et as any).super_type}'`);
    }

    const asset_et = message_et.getFirstAsset() as FileAsset;
    if (!isNullOrUndefined(asset_et)) {
      if (!asset_et.isDownloadable()) {
        throw new Error(`Tried to update message with wrong asset type as upload failed '${asset_et.type}'`);
      }
      asset_et.status(reason);
      asset_et.upload_failed_reason(Asset.NotUploaded.FAILED);
    }

    return this.eventService.updateEventAsUploadFailed(message_et.primary_key, reason);
  }

  /**
   * Get Cells assets' attachments ids from a message.
   *
   * @param messageEntity Message to get attachments from
   * @returns Array of attachment ids
   */
  public getCellsAssetAttachmentIds(messageEntity: Message): string[] {
    if (!isFunction(messageEntity.hasMultipartAsset) || !messageEntity.isContent()) {
      return [];
    }

    const multipartAsset = messageEntity.getFirstAsset();
    if (isUndefined(multipartAsset) || !multipartAsset.isMultipart()) {
      return [];
    }

    const attachments = multipartAsset.attachments?.() ?? [];
    const cellsAttachmentsIds = attachments.flatMap(attachment => {
      return isNonEmptyString(attachment.cellAsset?.uuid) ? [attachment.cellAsset.uuid] : [];
    });

    return cellsAttachmentsIds;
  }

  /**
   * Create asset metadata message to specified conversation.
   */
  private async createAssetMetadata(
    conversation: Conversation,
    file: File | Blob,
    allowImageDetection?: boolean,
    originalId?: string,
  ): Promise<AssetMetadataMessage | null> {
    try {
      const meta = await this.buildFileMetaData(file, allowImageDetection);

      const message = MessageBuilder.buildFileMetaDataMessage({metaData: meta}, originalId);
      this.assetRepository.addToProcessQueue(message, conversation.id);
      return {message, metaData: meta};
    } catch (error: unknown) {
      this.logger.error('Error while building metadata for asset', {error});
      const logMessage = `Couldn't render asset preview from metadata. Asset might be corrupt: ${
        (error as Error).message
      }`;
      this.logger.warn(logMessage, {error});
      return null;
    }
  }

  private async buildFileMetaData(file: Blob, allowImageDetection?: boolean): Promise<FileMetaDataContent> {
    const metadata = await buildMetadata(file);
    return {
      audio: isAudio(file) && !isUndefined(metadata) ? metadata : null,
      video: isVideo(file) && !isUndefined(metadata) ? metadata : null,
      image: allowImageDetection === true && isImage(file) && !isUndefined(metadata) ? metadata : null,
      length: file.size,
      name: (file as File).name,
      type: file.type,
    } as FileMetaDataContent;
  }

  private async uploadToAssetService(
    conversation: Conversation,
    file: Blob,
    messageId: string,
    meta: Pick<FileMetaDataContent, 'name' | 'type'>,
    retryOptions?: RequestRetryOptions,
  ): Promise<EncryptedAssetUploaded & {preview?: Asset.IPreview}> {
    const isAuditLogEnabled = this.teamState.isAuditLogEnabled();

    const auditData: AssetAuditData | undefined = isAuditLogEnabled
      ? {
          conversationId: conversation.qualifiedId,
          filename: meta.name,
          filetype: meta.type,
        }
      : undefined;

    const selfUser = this.userState.self();
    if (selfUser === undefined) {
      throw new Error('Self user is not available');
    }

    const retention = this.assetRepository.getAssetRetention(selfUser, conversation);
    const options = {
      legalHoldStatus: conversation.legalHoldStatus(),
      public: true,
      retention,
      ...(isAuditLogEnabled && {auditData}),
    };

    return this.assetRepository.uploadFile(file, messageId, options, isAuditLogEnabled, undefined, retryOptions);
  }

  private async buildUploadedAssetMessage(
    conversation: Conversation,
    file: Blob,
    messageId: string,
    asImage: boolean,
    meta: FileMetaDataContent,
    asset: EncryptedAssetUploaded & {preview?: Asset.IPreview},
  ): Promise<GenericMessage> {
    const metadata = asImage ? ((await buildMetadata(file)) as ImageMetadata) : undefined;
    const commonMessageData = {
      asset: asset,
      expectsReadConfirmation: this.expectReadReceipt(conversation),
    };

    return !isUndefined(metadata)
      ? MessageBuilder.buildImageMessage(
          {
            ...commonMessageData,
            image: metadata,
          },
          messageId,
        )
      : MessageBuilder.buildFileDataMessage(
          {
            metaData: meta,
            preview: asset.preview,
            ...commonMessageData,
            file: {data: Buffer.from(await file.arrayBuffer())},
          },
          messageId,
        );
  }

  private async sendAssetRemotedata(
    conversation: Conversation,
    file: Blob,
    messageId: string,
    asImage: boolean,
    meta: FileMetaDataContent,
  ): Promise<SendAndInjectResult> {
    const asset = await this.uploadToAssetService(conversation, file, messageId, meta);
    const assetMessage = await this.buildUploadedAssetMessage(conversation, file, messageId, asImage, meta, asset);

    return this.sendAndInjectMessage(assetMessage, conversation, {enableEphemeral: true});
  }

  /**
   * Send asset upload failed message to specified conversation.
   *
   * @param conversation Conversation that should receive the file
   * @param messageId ID of the metadata message
   * @param reason Cause for the failed upload (optional)
   * @returns Resolves when the asset failure was sent
   */
  private sendAssetUploadFailed(
    conversation: Conversation,
    messageId: string,
    reason = Asset.NotUploaded.FAILED,
  ): Promise<SendAndInjectResult> {
    const payload = MessageBuilder.buildFileAbortMessage({reason}, messageId);

    return this.sendAndInjectMessage(payload, conversation);
  }

  /**
   * Will request user permission before sending a message in case the conversation is in a degraded state
   *
   * @param conversation The conversation to send the message in
   * @returns Resolves to true if the message can be sent, false if the user didn't give their permission
   */
  async requestUserSendingPermission(
    conversation: Conversation,
    showLegalHoldWarning: boolean,
    consentType: CONSENT_TYPE = CONSENT_TYPE.MESSAGE,
  ): Promise<boolean> {
    const conversationDegraded = conversation.verification_state() === ConversationVerificationState.DEGRADED;
    if (showLegalHoldWarning) {
      return showLegalHoldWarningModal(conversation, conversationDegraded, this.translate)
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
    }
    if (!conversationDegraded) {
      return true;
    }

    const users = conversation.getUsersWithUnverifiedClients();
    const userNames = joinNames(users, this.translate, Declension.NOMINATIVE);
    const titleSubstitutions = capitalizeFirstChar(userNames);

    const [actionString, messageString] = {
      [CONSENT_TYPE.INCOMING_CALL]: [
        this.translate('modalConversationNewDeviceIncomingCallAction'),
        this.translate('modalConversationNewDeviceIncomingCallMessage'),
      ],
      [CONSENT_TYPE.OUTGOING_CALL]: [
        this.translate('modalConversationNewDeviceOutgoingCallAction'),
        this.translate('modalConversationNewDeviceOutgoingCallMessage'),
      ],
      [CONSENT_TYPE.MESSAGE]: [
        this.translate('modalConversationNewDeviceAction'),
        this.translate('modalConversationNewDeviceMessage'),
      ],
    }[consentType];

    const baseTitle =
      users.length > 1
        ? this.translate('modalConversationNewDeviceHeadlineMany', {users: titleSubstitutions})
        : this.translate('modalConversationNewDeviceHeadlineOne', {user: titleSubstitutions});
    const titleString = users[0].isMe
      ? this.translate('modalConversationNewDeviceHeadlineYou', {user: titleSubstitutions})
      : baseTitle;

    return new Promise(resolve => {
      const options = {
        close: () => {
          return resolve(false);
        },
        primaryAction: {
          action: () => {
            conversation.verification_state(ConversationVerificationState.UNVERIFIED);
            resolve(true);
          },
          text: actionString,
        },
        text: {
          message: messageString,
          title: titleString,
        },
      };

      PrimaryModal.show(PrimaryModal.type.CONFIRM, options, `degraded-${conversation.id}`, this.translate);
    });
  }

  /**
   * Will send a generic message using @wireapp/code
   *
   * @param payload - the OTR message payload to send
   * @param conversation - the conversation the message should be sent to
   * @param options
   * @param options.syncTimestamp should the message timestamp be synchronized with backend response timestamp
   * @param options.nativePush use nativePush for sending to mobile devices
   * @param options.recipients can be used to target specific users of the conversation. Will send to all the conversation participants if not defined
   * @param options.skipSelf do not forward this message to self user (will not encrypt and send to all self clients)
   * @param options.skipInjection do not inject message in the event repository (will skip all the event handling pipeline)
   */
  private async sendAndInjectMessage(
    message: GenericMessage,
    conversation: Conversation,
    {
      syncTimestamp = true,
      nativePush = true,
      enableEphemeral = false,
      targetMode,
      recipients,
      skipSelf,
      skipInjection,
      silentDegradationWarning,
      consentType = CONSENT_TYPE.MESSAGE,
    }: MessageSendingOptions & {
      enableEphemeral?: boolean;
      silentDegradationWarning?: boolean;
      skipInjection?: boolean;
      skipSelf?: boolean;
      syncTimestamp?: boolean;
      targetMode?: MessageTargetMode;
      consentType?: CONSENT_TYPE;
    } = {
      syncTimestamp: true,
    },
  ): Promise<SendAndInjectResult> {
    const payload = enableEphemeral ? this.wrapInEphemeralWhenTimed(message, conversation) : message;

    const backendOptions: BackendSendOptions = {
      syncTimestamp,
      nativePush,
      targetMode,
      recipients,
      skipSelf,
      skipInjection,
      silentDegradationWarning,
    };
    const sendOptions = await this.prepareSend(payload, conversation, backendOptions);

    // Without a client id nothing is injected, and the prompt is skipped as well
    const injected = skipInjection === true ? true : await this.injectOptimisticMessage(payload, conversation);
    const shouldProceedSending =
      !injected || silentDegradationWarning === true
        ? true
        : await this.requestUserSendingPermission(conversation, false, consentType);
    if (!shouldProceedSending) {
      this.logger.info('User has canceled sending a message to a degraded conversation.');
      return {id: payload.messageId, sentAt: new Date().toISOString(), state: MessageSendingState.CANCELED};
    }

    try {
      return await this.sendMessageToBackend(payload, conversation, backendOptions, sendOptions);
    } catch (error: unknown) {
      await this.updateMessageAsFailed(conversation, payload.messageId, error);
      return {id: payload.messageId, sentAt: new Date().toISOString(), state: SendAndInjectSendingState.FAILED};
    }
  }

  private wrapInEphemeralWhenTimed(message: GenericMessage, conversation: Conversation): GenericMessage {
    const messageTimer = conversation.messageTimer();
    return isNumber(messageTimer) && messageTimer !== 0
      ? MessageBuilder.wrapInEphemeral(message, messageTimer)
      : message;
  }

  /**
   * Must run once per message: injecting the same message id twice throws in the event storage.
   * Resolves to `false` when nothing was injected because there is no current client id.
   */
  private async injectOptimisticMessage(payload: GenericMessage, conversation: Conversation): Promise<boolean> {
    const clientId = this.clientState.currentClient?.id;

    if (!isNonEmptyString(clientId)) {
      this.logger.error('No current client id found, cannot send message optimistically');
      return false;
    }

    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const selfUser = this.userState.self();
    if (isUndefined(selfUser)) {
      throw new Error('No self user found, cannot send message optimistically');
    }
    const optimisticEvent = EventBuilder.buildMessageAdd({
      conversationEntity: conversation,
      currentTimestamp,
      senderId: selfUser.id,
      clientId,
    });
    this.trackContributed(conversation, payload);
    const mappedEvent = (await this.cryptography_repository.cryptographyMapper.mapGenericMessage(
      payload,
      optimisticEvent,
    )) as OptimisticMessageEvent;
    await this.eventRepository.injectEvent(mappedEvent);
    return true;
  }

  /** Also sets the conversation's message timer in the core. */
  private async prepareSend(
    payload: GenericMessage,
    conversation: Conversation,
    {nativePush = true, targetMode, recipients, skipSelf, silentDegradationWarning, failFast}: BackendSendOptions = {},
  ): Promise<CoreSendOptions> {
    // Configure ephemeral messages
    this.conversationService.messageTimer.setConversationLevelTimer(conversation.id, conversation.messageTimer());

    return isMLSConversation(conversation)
      ? {
          groupId: conversation.groupId,
          payload,
          protocol: CONVERSATION_PROTOCOL.MLS,
          conversationId: conversation.qualifiedId,
          failFast,
        }
      : {
          conversationId: conversation.qualifiedId,
          failFast,
          nativePush,
          onClientMismatch: mismatch => {
            return this.onClientMismatch?.(mismatch, conversation, silentDegradationWarning);
          },
          payload,
          protocol: CONVERSATION_PROTOCOL.PROTEUS,
          targetMode,
          userIds: await this.generateRecipients(conversation, recipients, skipSelf),
        };
  }

  /**
   * Marks the message as sent when the backend accepted it. Throws whatever the send throws; it neither injects the
   * message nor asks the degradation prompt, nor marks it as failed.
   * Pass `preparedSendOptions` (from `prepareSend`) when they were resolved earlier; otherwise they are resolved here.
   */
  private async sendMessageToBackend(
    payload: GenericMessage,
    conversation: Conversation,
    options: BackendSendOptions = {},
    preparedSendOptions?: CoreSendOptions,
  ): Promise<SendResult> {
    const {syncTimestamp = true, skipInjection, silentDegradationWarning} = options;
    const handleSuccess = async ({sentAt, failedToSend}: SendResult): Promise<void> => {
      const injectDelta = 10; // we want to make sure the message is injected slightly before it was received by the backend
      const sentTimestamp = new Date(sentAt).getTime() - injectDelta;
      const preMessageTimestamp = new Date(sentTimestamp).toISOString();
      // Trigger an empty mismatch to check for users that have no devices and that could have been removed from the team
      await this.onClientMismatch?.({time: preMessageTimestamp}, conversation, silentDegradationWarning);
      if (skipInjection !== true) {
        await this.updateMessageAsSent(
          conversation,
          payload.messageId,
          syncTimestamp ? sentAt : undefined,
          failedToSend,
        );
      }
    };

    const sendOptions = preparedSendOptions ?? (await this.prepareSend(payload, conversation, options));

    if (isMLSConversation(conversation)) {
      this.logger.info('Sending message to a MLS conversation, ensuring conversation exists');
      await this.conversationRepositoryProvider().ensureConversationExists({
        conversationId: conversation.qualifiedId,
        groupId: conversation.groupId,
      });
    }
    const result = await this.conversationService.send(sendOptions);

    if (result.state === MessageSendingState.OUTGOING_SENT) {
      await handleSuccess(result);
    }
    return result;
  }

  public updateUserReactions(reactions: ReactionMap, userId: QualifiedId, reaction: ReactionType): string {
    const userReactions = reactions
      .filter(([, users]) => {
        return users.some(user => {
          return matchQualifiedIds(user, userId);
        });
      })
      .map(([reaction]) => {
        return reaction;
      });
    const updatedReactions = userReactions.includes(reaction)
      ? userReactions.filter(existingReaction => {
          return existingReaction !== reaction;
        })
      : [...userReactions, reaction];
    return updatedReactions.join(',');
  }

  public toggleReaction(
    conversationEntity: Conversation,
    message_et: ContentMessage,
    reaction: string,
    userId: QualifiedId,
  ): Promise<SendAndInjectResult> | null {
    if (conversationEntity.isSelfUserRemoved()) {
      return null;
    }
    const updatedReactions = this.updateUserReactions(message_et.reactions(), userId, reaction);
    return this.sendReactions(conversationEntity, message_et, updatedReactions);
  }

  async resetSession(userId: QualifiedId, clientId: string, conversation: Conversation): Promise<void> {
    this.logger.info(`Resetting session with client '${clientId}' of user '${userId.id}'.`);

    try {
      const fingerprint = await this.cryptography_repository.getRemoteFingerprint(userId, clientId);
      // We delete the stored session so that it can be recreated later on
      await this.cryptography_repository.deleteSession(userId, clientId);
      // Generating the fingerprint will regenerate the session
      const newFingerPrint = await this.cryptography_repository.getRemoteFingerprint(userId, clientId);
      if (fingerprint !== newFingerPrint) {
        // unverify the client entity in case the fingerprint has changed during the session reset
        this.logger.warn('identity of device has changed');
        const device = this.userRepository
          .findUserById(userId)
          ?.devices()
          .find(device => {
            return device.id === clientId;
          });

        device?.meta.isVerified(false);
        // Will trigger the conversation verification handler
        amplify.publish(WebAppEvents.USER.CLIENTS_UPDATED, userId);
      }
      return await this.sendSessionReset(userId, clientId, conversation);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : error;
      const logMessage = `Failed to reset session for client '${clientId}' of user '${userId.id}': ${message}`;
      this.logger.warn(logMessage, {error});
      throw error;
    }
  }

  /**
   * Sending a message to the remote end of a session reset.
   *
   * @note When we reset a session then we must inform the remote client about this action. It sends a ProtocolBuffer message
   *  to the remote client, which renders a session-reset system message. This message only needs to be sent to the affected
   *  remote client, therefore we force the message sending.
   *
   * @param userId User ID
   * @param clientId Client ID
   * @param conversation The conversation to send the message in
   * @returns Resolves after sending the session reset
   */
  private async sendSessionReset(userId: QualifiedId, clientId: string, conversation: Conversation): Promise<void> {
    const sessionReset = MessageBuilder.buildSessionResetMessage();

    const userClient = {[userId.domain]: {[userId.id]: [clientId]}};
    await this.conversationService.send({
      conversationId: conversation.qualifiedId,
      payload: sessionReset,
      protocol: CONVERSATION_PROTOCOL.PROTEUS,
      targetMode: MessageTargetMode.USERS_CLIENTS,
      userIds: userClient, // we target this message to the specific client of the user (no need for mismatch handling here)
    });
  }

  /**
   * Send a read receipt for the last message in a conversation.
   */
  sendReadReceipt(conversationEntity: Conversation, messageEntity: Message, moreMessageEntities: Message[] = []): void {
    this.sendConfirmationStatus(conversationEntity, messageEntity, Confirmation.Type.READ, moreMessageEntities);
  }

  /**
   * Send confirmation for a content message in specified conversation.
   *
   * @param conversationEntity Conversation that content message was received in
   * @param messageEntity Message for which to acknowledge receipt
   * @param type The type of confirmation to send
   * @param moreMessageEntities More messages to send a read receipt for
   */
  async sendConfirmationStatus(
    conversationEntity: Conversation,
    messageEntity: Message,
    type: Confirmation.Type,
    moreMessageEntities: Message[] = [],
  ): Promise<void> {
    if (this.outbox !== undefined) {
      return this.enqueueConfirmation(conversationEntity, messageEntity, type, moreMessageEntities);
    }
    if (!this.shouldConfirm(conversationEntity, messageEntity, type)) {
      return;
    }

    const moreMessageIds = isNonEmptyArray(moreMessageEntities)
      ? moreMessageEntities.map(entity => {
          return entity.id;
        })
      : undefined;
    const confirmationMessage = MessageBuilder.buildConfirmationMessage({
      firstMessageId: messageEntity.id,
      moreMessageIds,
      type,
    });

    const sendingOptions = {
      nativePush: false,
      recipients: [messageEntity.qualifiedFrom],
      silentDegradationWarning: true, // We do not show the degradation popup in case of a confirmation
      targetMode: MessageTargetMode.USERS,
    };
    const {state} = await this.sendAndInjectMessage(confirmationMessage, conversationEntity, sendingOptions);
    if (state === MessageSendingState.CANCELED) {
      this.sendAndInjectMessage(confirmationMessage, conversationEntity, {
        ...sendingOptions,
        // If the message was auto cancelled because of a mismatch, we will force sending the message only to the clients we know of (ignoring unverified clients)
        targetMode: MessageTargetMode.USERS_CLIENTS,
      });
    }
  }

  private shouldConfirm(conversation: Conversation, message: Message, type: Confirmation.Type): boolean {
    if (type === Confirmation.Type.READ && !supportsReadReceipts(conversation)) {
      return false;
    }
    if (message.user().isMe || !arrayIncludes(EventTypeHandling.CONFIRM, message.type)) {
      return false;
    }
    if (type !== Confirmation.Type.DELIVERED) {
      return true;
    }
    const withinThreshold = message.timestamp() >= Date.now() - ConversationRepository.CONFIG.CONFIRMATION_THRESHOLD;
    return conversation.is1to1() && withinThreshold;
  }

  /**
   * Send reaction to a content message in specified conversation.
   * @param conversation Conversation to send reaction in
   * @param messageEntity Message to react to
   * @param reactionType Reaction
   * @returns Resolves after sending the reaction
   */

  private async sendReactions(
    conversation: Conversation,
    messageEntity: Message,
    reactions: ReactionType,
  ): Promise<SendAndInjectResult> {
    if (this.outbox !== undefined) {
      return this.enqueueReaction(conversation, messageEntity, reactions);
    }
    const reaction = MessageBuilder.buildReactionMessage({originalMessageId: messageEntity.id, type: reactions});

    return this.sendAndInjectMessage(reaction, conversation);
  }

  public async sendInCallEmoji(conversation: Conversation, emojis: InCallEmojiType): Promise<SendAndInjectResult> {
    const emojisMessage = MessageBuilder.buildInCallEmojiMessage({emojis});

    return this.sendAndInjectMessage(emojisMessage, conversation);
  }

  public async sendInCallHandRaised(conversation: Conversation, isHandUp: boolean): Promise<SendAndInjectResult> {
    const handRaiseMessage = MessageBuilder.buildInCallHandRaiseMessage({isHandUp: isHandUp});

    return this.sendAndInjectMessage(handRaiseMessage, conversation);
  }

  private expectReadReceipt(conversationEntity: Conversation): boolean {
    if (!supportsReadReceipts(conversationEntity)) {
      return false;
    }

    if (conversationEntity.is1to1()) {
      const receiptMode = this.propertyRepository.receiptMode();

      return isNumber(receiptMode) && receiptMode !== 0;
    }

    if (isNonEmptyString(conversationEntity.teamId) && conversationEntity.isGroupOrChannel()) {
      const receiptMode = conversationEntity.receiptMode();

      return isNumber(receiptMode) && receiptMode !== 0;
    }

    return false;
  }

  /**
   * Delete message for everyone.
   *
   * @param conversation Conversation to delete message from
   * @param message Message to delete
   * @param targetedUsers target only a few users in the conversation. Will target all the participants if undefined
   * @returns Resolves when message was deleted
   */
  public async deleteMessageForEveryone(
    conversation: Conversation,
    message: Message,
    options: {
      targetedUsers?: QualifiedId[];
      /** will not wait for backend confirmation before actually deleting the message locally */
      optimisticRemoval?: boolean;
    } = {},
  ): Promise<void> {
    if (this.outbox !== undefined) {
      return this.enqueueDelete(conversation, message, options.targetedUsers);
    }
    const conversationId = conversation.id;
    const messageId = message.id;

    // directly delete message from local database when status is sending
    if (message.status() === StatusType.SENDING) {
      await this.deleteMessageById(conversation, message.id);
    }

    try {
      if (!message.user().isMe && !isTruthy(message.ephemeral_expires())) {
        throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
      }
      const userIds =
        options.targetedUsers ??
        conversation.allUserEntities().map(user => {
          if (isUndefined(user)) {
            throw new Error('Conversation member list contains an empty user');
          }

          return user.qualifiedId;
        });
      const payload = MessageBuilder.buildDeleteMessage({
        messageId: message.id,
      });
      await this.sendAndInjectMessage(payload, conversation, {
        recipients: userIds,
        // if we want optimistic removal, we can rely on the injection system that will handle the event and remove the message even before the message is sent
        skipInjection: options.optimisticRemoval !== true,
        // If there are recipients to the message, we only want to target those users (case of ephemeral messages that should be deleted in the sender's client and the user's own clients)
        targetMode: !isNullOrUndefined(userIds) ? MessageTargetMode.USERS : undefined,
      });
      if (options.optimisticRemoval !== true) {
        this.deleteMessageById(conversation, message.id);
      }
    } catch (error: unknown) {
      const isConversationNotFound = isErrorWithCode(error) && error.code === HTTP_STATUS.NOT_FOUND;
      if (isConversationNotFound) {
        this.logger.warn(`Conversation '${conversationId}' not found. Deleting message for self user only.`);
        this.deleteMessage(conversation, message);
        return;
      }
      const logMessage = `Failed to delete message '${messageId}' in conversation '${conversationId}' for everyone`;
      this.logger.warn(logMessage, {error});
      throw error;
    }
  }

  /**
   * Delete message on your own clients.
   *
   * @param conversation Conversation to delete message from
   * @param message Message to delete
   * @returns Resolves when message was deleted
   */
  public async deleteMessage(conversation: Conversation, message: Message): Promise<void> {
    if (this.outbox !== undefined) {
      return this.removeThroughOutbox(conversation, message, {
        type: 'hide',
        conversationId: conversation.qualifiedId,
        targetMessageId: message.id,
      });
    }
    try {
      const payload = MessageBuilder.buildHideMessage({
        conversationId: conversation.id,
        messageId: message.id,
        qualifiedConversationId: conversation.qualifiedId,
      });

      await this.sendToSelfConversations(payload);
      await this.deleteMessageById(conversation, message.id);
    } catch (error: unknown) {
      this.logger.warn(`Failed to send delete message with id '${message.id}' for conversation '${conversation.id}'`, {
        error,
      });
      throw error;
    }
  }

  private async sendToSelfConversations(payload: GenericMessage): Promise<void> {
    const selfConversations = this.conversationState.getSelfConversations(
      supportsMLS() && this.teamState.isMLSEnabled(),
    );
    await Promise.all(
      selfConversations.map(selfConversation => {
        return this.sendAndInjectMessage(payload, selfConversation, {
          skipInjection: true,
        });
      }),
    );
  }

  /**
   * Update cleared of conversation using timestamp.
   */
  public async updateClearedTimestamp(conversation: Conversation): Promise<void> {
    if (this.outbox !== undefined) {
      return this.enqueueCleared(conversation);
    }
    if (this.setClearedTimestamp(conversation) !== undefined) {
      const payload = MessageBuilder.buildClearedMessage(conversation.qualifiedId);
      await this.sendToSelfConversations(payload);
    }
  }

  /** `undefined` when the cleared timestamp didn't move */
  private setClearedTimestamp(conversation: Conversation): number | undefined {
    const timestamp = conversation.getLastKnownTimestamp(this.serverTimeHandler.toServerTimestamp());
    if (!isNumber(timestamp) || timestamp === 0) {
      return undefined;
    }
    const cleared = conversation.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.CLEARED);
    return isNumber(cleared) && cleared !== 0 ? cleared : undefined;
  }

  /**
   * Sends a buttonAction confirmation, a button was clicked without targeted messages.
   * @param conversation conversation where this button was clicked
   * @param message the composite message
   * @param buttonId the button selected id
   * @returns
   */
  async sendButtonAction(conversation: Conversation, message: CompositeMessage, buttonId: string): Promise<void> {
    if (conversation.isSelfUserRemoved()) {
      return;
    }

    const changes = message.getSelectionChange(buttonId);
    if (!isObject(changes)) {
      return;
    }

    const senderId = message.qualifiedFrom;
    const senderInConversation = conversation.participating_user_ets().some(user => {
      return matchQualifiedIds(senderId, user.qualifiedId);
    });

    if (!senderInConversation) {
      message.setButtonError(buttonId, this.translate('buttonActionError'));
      message.waitingButtonId(undefined);
      return;
    }

    const buttonMessage = MessageBuilder.buildButtonActionMessage({
      buttonId,
      referenceMessageId: message.id,
    });
    try {
      this.sendAndInjectMessage(buttonMessage, conversation, {
        nativePush: false,
        skipInjection: true,
      });
      const messageEntity = await this.getMessageInConversationById(conversation, message.id);
      await this.eventService.updateEventSequentially({primary_key: messageEntity.primary_key, ...changes});
    } catch {
      message.waitingButtonId(undefined);
      return message.setButtonError(buttonId, this.translate('buttonActionError'));
    }
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @param conversationEntity Conversation that contains the message
   * @param messageId ID of message to delete
   * @returns Resolves when message was deleted
   */
  public async deleteMessageById(conversationEntity: Conversation, messageId: string): Promise<number> {
    const isLastDeleted =
      conversationEntity.hasLastReceivedMessageLoaded() && conversationEntity.getNewestMessage()?.id === messageId;

    const deleteCount = await this.eventService.deleteEvent(conversationEntity.id, messageId);
    const previousMessage = conversationEntity.getNewestMessage();

    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageId, conversationEntity.id);

    const previousMessageTimestampMilliseconds = isLastDeleted ? previousMessage?.timestamp() : undefined;
    if (isNumber(previousMessageTimestampMilliseconds) && previousMessageTimestampMilliseconds !== 0) {
      conversationEntity.updateTimestamps(previousMessage, true);
    }

    return deleteCount;
  }

  private readonly sendAvailabilityStatus = async (availability: Availability.Type): Promise<void> => {
    const protoAvailability = new Availability({type: protoFromType(availability)});
    const genericMessage = new GenericMessage({
      [GenericMessageType.AVAILABILITY]: protoAvailability,
      messageId: createUuid(),
    });

    const sortedUsers = this.conversationState
      .connectedUsers()
      // For the moment, we do not want to send status in federated env
      // we can remove the filter when we actually want this feature in federated env (and we will need to implement federation for the core broadcastService)
      .filter(user => {
        return !user.isFederated;
      })
      .toSorted(({id: idA}, {id: idB}) => {
        return idA.localeCompare(idB, undefined, {sensitivity: 'base'});
      });
    const [members, other] = partition(sortedUsers, user => {
      return this.teamState.isInTeam(user);
    });
    const selfUser = this.userState.self();
    if (selfUser === undefined) {
      throw new Error('Self user is not available');
    }

    const users = [selfUser, ...members, ...other].slice(0, UserRepository.CONFIG.MAXIMUM_TEAM_SIZE_BROADCAST);

    const coreService = this.core.service;
    if (coreService === undefined) {
      throw new Error('Core service is not available');
    }

    await coreService.broadcast.broadcastGenericMessage(
      genericMessage,
      this.createRecipients(users),
      this.onClientMismatch,
    );
  };

  /**
   * Update message as sent in db and view.
   *
   * @param conversationEntity Conversation entity
   * @param eventJson Event object
   * @param isoDate If defined it will update event timestamp
   * @returns Resolves when sent status was updated
   */
  private async updateMessageAsSent(
    conversationEntity: Conversation,
    eventId: string,
    isoDate?: string,
    failedToSend?: SendResult['failedToSend'],
  ): Promise<IdentifiedUpdatePayload | undefined> {
    try {
      const messageEntity = await this.getMessageInConversationById(conversationEntity, eventId);
      const updatedStatus = isNonEmptyArray(messageEntity.readReceipts()) ? StatusType.SEEN : StatusType.SENT;
      messageEntity.status(updatedStatus);
      const changes: Pick<Partial<EventRecord>, 'status' | 'time' | 'failedToSend' | 'fileData' | 'written_time'> = {
        status: updatedStatus,
        failedToSend,
        fileData: undefined,
      };
      if (isNonEmptyString(isoDate)) {
        const timestamp = new Date(isoDate).getTime();
        if (!isNaN(timestamp)) {
          const writtenTime = this.keepWrittenTime(messageEntity);
          if (writtenTime !== undefined) {
            changes.written_time = writtenTime;
          }
          changes.time = isoDate;
          messageEntity.timestamp(timestamp);
          conversationEntity.updateTimestampServer(timestamp, true);
          conversationEntity.updateTimestamps(messageEntity);
          // A message that is not loaded is mapped from its record, without its sender: updateTimestamps can't tell it is ours
          conversationEntity.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.LAST_READ);
        }
      }
      this.conversationRepositoryProvider().checkMessageTimer(messageEntity);
      if (arrayIncludes(EventTypeHandling.STORE, messageEntity.type) || messageEntity.hasAssetImage()) {
        return await this.eventService.updateEvent(messageEntity.primary_key, changes);
      }
    } catch (error: unknown) {
      if ((error as any).type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
    return undefined;
  }

  /** The time the message was written at survives the send, which replaces its time with the server's */
  private keepWrittenTime(messageEntity: Message): string | undefined {
    if (this.outbox === undefined) {
      return undefined;
    }
    const writtenTime = messageEntity.written_time();
    if (writtenTime !== undefined) {
      return writtenTime;
    }
    const writtenTimestamp = messageEntity.timestamp();
    if (!Number.isFinite(writtenTimestamp)) {
      return undefined;
    }
    const fromTimestamp = new Date(writtenTimestamp).toISOString();
    messageEntity.written_time(fromTimestamp);
    return fromTimestamp;
  }

  private async updateMessageAsFailed(
    conversationEntity: Conversation,
    eventId: string,
    error: unknown,
  ): Promise<IdentifiedUpdatePayload | undefined> {
    try {
      const messageEntity = await this.getMessageInConversationById(conversationEntity, eventId);
      const errorStatus =
        isBackendError(error) && error.label === BackendErrorLabel.FEDERATION_REMOTE_ERROR
          ? StatusType.FEDERATION_ERROR
          : StatusType.FAILED;
      messageEntity.status(errorStatus);
      return this.eventService.updateEvent(messageEntity.primary_key, {status: errorStatus});
    } catch (error: unknown) {
      if ((error as any).type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
    return undefined;
  }

  // The outbox

  private registerOutboxKinds(): OutboxHandles {
    if (this.outbox === undefined) {
      throw new Error('The outbox is not enabled');
    }
    return {
      // A message that can't go out stays as failed, with Retry, and the changes behind it in its lane fail with it.
      message: handleOf(
        this.outbox.register({
          name: 'message',
          parsePayload: parseMessagePayload,
          expiresAfterMilliseconds: TIME_IN_MILLIS.WEEK,
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- The duration reads best written out.
          attemptTimeoutMilliseconds: 2 * TIME_IN_MILLIS.MINUTE,
          // Only an expiry or a rejection ends a message, never the number of attempts.
          maxAttempts: 1_000,
          whenExhausted: 'dead-letter',
          laneWhenDeadLettered: 'follows',
          laneWhenDeleted: 'continues',
          attempt: this.attemptMessageOperation,
          onChanged: this.onMessageOperationChanged,
        }),
      ),
      // A ping that is late is pointless, so it is forgotten and leaves the screen.
      ping: handleOf(
        this.outbox.register({
          name: 'ping',
          parsePayload: parsePingPayload,
          expiresAfterMilliseconds: TIME_IN_MILLIS.MINUTE,
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- The duration reads best written out.
          attemptTimeoutMilliseconds: 10 * TIME_IN_MILLIS.SECOND,
          maxAttempts: 3,
          whenExhausted: 'delete',
          laneWhenDeadLettered: 'continues',
          laneWhenDeleted: 'continues',
          attempt: this.attemptPingOperation,
          onChanged: this.onPingOperationChanged,
        }),
      ),
      // Nothing of a receipt is shown, and a receipt that can't go out is forgotten.
      receipt: handleOf(
        this.outbox.register({
          name: 'receipt',
          parsePayload: parseReceiptPayload,
          expiresAfterMilliseconds: TIME_IN_MILLIS.WEEK,
          attemptTimeoutMilliseconds: TIME_IN_MILLIS.MINUTE,
          maxAttempts: 100,
          whenExhausted: 'delete',
          laneWhenDeadLettered: 'continues',
          laneWhenDeleted: 'continues',
          attempt: this.attemptReceiptOperation,
        }),
      ),
      // A change to a message that was sent is forgotten when it can't go out, and the local change stays. Nothing
      // shows whether it went through, so one made during a connectivity drop isn't worth sending much later.
      messageChange: handleOf(
        this.outbox.register({
          name: 'message-change',
          parsePayload: parseMessageChangePayload,
          expiresAfterMilliseconds: TIME_IN_MILLIS.MINUTE,
          // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- The duration reads best written out.
          attemptTimeoutMilliseconds: 2 * TIME_IN_MILLIS.MINUTE,
          maxAttempts: 1_000,
          whenExhausted: 'delete',
          laneWhenDeadLettered: 'continues',
          laneWhenDeleted: 'continues',
          attempt: this.attemptChangeOperation,
          onChanged: this.onChangeOperationChanged,
        }),
      ),
    };
  }

  private get outboxKinds(): OutboxHandles {
    if (this.outboxHandles === undefined) {
      throw new Error('The outbox is not enabled');
    }
    return this.outboxHandles;
  }

  private get activeOutbox(): Outbox {
    if (this.outbox === undefined) {
      throw new Error('The outbox is not enabled');
    }
    return this.outbox;
  }

  private get activeFireAndForgetInvoker(): FireAndForgetInvoker {
    if (this.fireAndForgetInvoker === undefined) {
      throw new Error('The outbox is not enabled');
    }
    return this.fireAndForgetInvoker;
  }

  // The message kind: text

  private async enqueueText({
    conversation,
    textMessage,
    mentions,
    QuoteEntity,
    attachments,
  }: OutgoingText): Promise<void> {
    const payload: OutboxTextPayload = {
      type: 'text',
      conversationId: conversation.qualifiedId,
      messageId: createUuid(),
      text: textMessage,
      mentions: this.toStoredMentions(mentions),
      quote: QuoteEntity === undefined ? undefined : {messageId: QuoteEntity.messageId, userId: QuoteEntity.userId},
      attachments: isNonEmptyArray(attachments) ? attachments : undefined,
    };
    const outcome = await this.outboxKinds.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfMessages(payload.conversationId),
    });
    if (!this.isAccepted(outcome)) {
      await this.showAsRefused(conversation, payload);
    }
  }

  /** A message the outbox refused is shown as failed, so that it can be sent again. It is never sent around the outbox. */
  private async showAsRefused(conversation: Conversation, payload: ShownPayload): Promise<void> {
    await this.ensureShown(conversation, payload);
    await this.markMessage(conversation, payload.messageId, StatusType.FAILED, 'rejected');
  }

  private async enqueueTextAgain({
    conversation,
    textMessage,
    mentions,
    messageId,
    QuoteEntity,
    attachments,
  }: TextMessageRetry): Promise<void> {
    await this.markMessage(conversation, messageId, StatusType.SENDING);

    const payload = match(this.outboxKinds.message.find(messageId))
      .with(
        {outcome: 'operation-found', operation: {state: 'dead-lettered', payload: {type: 'text'}}},
        ({operation}) => {
          return this.isUnconfirmed(operation)
            ? {...operation.payload, mayBeDelivered: true as const}
            : operation.payload;
        },
      )
      .otherwise((): OutboxTextPayload => {
        return {
          type: 'text',
          conversationId: conversation.qualifiedId,
          messageId,
          text: textMessage,
          mentions: this.toStoredMentions(mentions),
          quote: QuoteEntity === undefined ? undefined : {messageId: QuoteEntity.messageId, userId: QuoteEntity.userId},
          attachments: isNonEmptyArray(attachments) ? attachments : undefined,
        };
      });
    const outcome = await this.outboxKinds.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfMessages(payload.conversationId),
    });
    if (!this.isAccepted(outcome)) {
      await this.markMessage(conversation, messageId, StatusType.FAILED, 'rejected');
      return;
    }
    await this.enqueueDependentsAgain(messageId);
  }

  /** The outbox has the message as failed. A message that was sent, or never was in the outbox, has not failed in it. */
  private hasFailedInOutbox(messageId: string): boolean {
    return this.findPendingMessage(messageId)?.state === 'dead-lettered';
  }

  /** The outbox also reports the operations it loads at startup as changed, so the referrers cover them too. */
  private trackReferrer(operation: OperationView<MessagePayload>): void {
    const isFinished = operation.state === 'succeeded' || operation.state === 'deleted';
    if (isFinished || referencedMessageId(operation.payload) === undefined) {
      this.referrers.delete(operation.id);
    } else {
      this.referrers.set(operation.id, operation);
    }
  }

  /**
   * The replies and reactions that failed with the message go out again behind it, in the order they were queued, so
   * that the first one doesn't go out alone and ahead of the others. A reply counts only when it failed with the
   * generic reason, which is the one of a reply that waited for its target or went with a message in front of it. A
   * reply that was rejected or declined on its own stays failed.
   */
  private async enqueueDependentsAgain(messageId: string): Promise<void> {
    const inQueueOrder = [...this.referrers.values()].toSorted((earlier, later) => {
      return earlier.queuedAt - later.queuedAt;
    });
    for (const {payload, state} of inQueueOrder) {
      if (state !== 'dead-lettered' || referencedMessageId(payload) !== messageId) {
        continue;
      }
      if (payload.type === 'text' && !(await this.hasFailedWithGenericReason(payload))) {
        continue;
      }
      const enqueueResult = await this.outboxKinds.message.enqueue({
        payload,
        correlationKey: messageCorrelationKey(payload),
        laneKey: laneOfMessages(payload.conversationId),
      });
      this.logger.info('The outbox answered sending again an operation that failed with its target', {
        outcome: enqueueResult.outcome,
      });
    }
  }

  private async hasFailedWithGenericReason({conversationId, messageId}: OutboxTextPayload): Promise<boolean> {
    const conversation = this.conversationState.findConversation(conversationId);
    const record =
      conversation === undefined ? undefined : await this.eventService.loadEvent(conversation.id, messageId);
    return record?.failed_reason === 'generic';
  }

  private readonly attemptMessageOperation = async (
    {payload}: OperationView<MessagePayload>,
    signal: AbortSignal,
  ): Promise<AttemptOutcome> => {
    switch (payload.type) {
      case 'text':
        return this.attemptText(payload);
      case 'asset':
        return this.attemptAsset(payload, signal);
      case 'reaction':
        // A reaction has no Retry of its own, so it fails with its target and goes out again with the target's Retry.
        if (this.hasFailedInOutbox(payload.targetMessageId)) {
          return {outcome: 'attempt-dead-lettered'};
        }
        return this.attemptChangeOperation({payload});
      case 'edit':
      case 'delete':
        return this.attemptChangeOperation({payload});
    }
  };

  private async attemptText(payload: OutboxTextPayload): Promise<AttemptOutcome> {
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return this.deleteForUnknownConversation();
    }
    await this.ensureShown(conversation, payload);
    // The receiver would see a quote of a message it never got, so the reply fails and goes out after its target.
    if (payload.quote !== undefined && this.hasFailedInOutbox(payload.quote.messageId)) {
      await this.markMessage(conversation, payload.messageId, StatusType.FAILED, 'generic');
      return {outcome: 'attempt-dead-lettered'};
    }
    if (this.isDegraded(conversation)) {
      return this.holdForPermission(payload.messageId, [conversation], 'mark-declined');
    }

    const message = await this.buildOutboxText(conversation, payload);
    await this.matchLocalTimerToSent(conversation, message);
    const sendResult = await this.sendShownMessage(conversation, payload.messageId, message);
    if (sendResult.outcome === 'attempt-succeeded') {
      this.activeFireAndForgetInvoker.fireAndForget(() => {
        return this.sendLinkPreviewOf(conversation, payload);
      });
    }
    return sendResult;
  }

  private async sendShownMessage(
    conversation: Conversation,
    messageId: string,
    message: GenericMessage,
  ): Promise<AttemptOutcome> {
    try {
      const result = await this.sendMessageToBackend(message, conversation, {failFast: true, syncTimestamp: true});
      if (result.state === MessageSendingState.OUTGOING_SENT) {
        return {outcome: 'attempt-succeeded'};
      }
    } catch (error: unknown) {
      return this.failShownMessage(conversation, messageId, classifySendError(error));
    }
    // The client mismatch handler declined to send to the unverified devices.
    await this.markMessage(conversation, messageId, StatusType.FAILED, 'declined');
    return {outcome: 'attempt-dead-lettered'};
  }

  private async failShownMessage(
    conversation: Conversation,
    messageId: string,
    error: SendErrorClass,
  ): Promise<AttemptOutcome> {
    switch (error.type) {
      case 'retry':
        return {outcome: 'attempt-failed'};
      case 'gone':
        // A conversation that was deleted is gone locally before the outbox sends, so this one is still known. The
        // backend answers 404 to a user who was removed from it, and the message stays as failed, with Retry.
        this.logger.info('A message was sent to a conversation the backend does not show', {outcome: error.type});
        await this.markMessage(conversation, messageId, StatusType.FAILED, 'removed');
        return {outcome: 'attempt-dead-lettered'};
      case 'cancelled':
        this.logger.info('Deletinga message that can no longer be sent', {outcome: error.type});
        return {outcome: 'attempt-deleted'};
      case 'rejected':
        this.logger.info('A message was rejected', {outcome: error.reason});
        await this.markMessage(
          conversation,
          messageId,
          error.federation ? StatusType.FEDERATION_ERROR : StatusType.FAILED,
          error.reason,
        );
        return {outcome: 'attempt-dead-lettered'};
    }
  }

  /** The same as `sendTextWithLinkPreview` does after a send: a message with the preview replaces the sent one */
  private async sendLinkPreviewOf(
    conversation: Conversation,
    {messageId, text, mentions, quote}: Pick<OutboxTextPayload, 'messageId' | 'text' | 'mentions' | 'quote'>,
  ): Promise<void> {
    await this.handleLinkPreview(
      {
        conversation,
        message: text,
        messageId,
        mentions: this.toMentionEntities(mentions),
        quote: await this.resolveOutgoingQuote(conversation, quote),
      },
      conversation.qualifiedId,
    );
  }

  private readonly onMessageOperationChanged = (operation: OperationView<MessagePayload>): void => {
    this.trackWaitingMessage(operation);
    this.trackReferrer(operation);
    const {payload, state, queuedAt} = operation;
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined || payload.type === 'reaction' || payload.type === 'delete') {
      return;
    }
    if (payload.type === 'edit') {
      this.onChangeOperationChanged({payload, state});
      return;
    }
    this.activeFireAndForgetInvoker.fireAndForget(async () => {
      switch (state) {
        case 'queued':
        case 'on-hold':
        case 'in-progress':
          await this.ensureShown(conversation, payload);
          return this.showAsSending(conversation, payload.messageId);
        case 'dead-lettered':
          return this.showAsFailedUnlessItIs(conversation, payload.messageId, queuedAt);
        case 'deleted':
          await this.deleteMessageById(conversation, payload.messageId);

        case 'succeeded':
      }
    });
  };

  private async showAsSending(conversation: Conversation, messageId: string): Promise<void> {
    const record = await this.eventService.loadEvent(conversation.id, messageId);
    if (record !== undefined && this.isFailedRecord(record)) {
      await this.markMessage(conversation, messageId, StatusType.SENDING);
    }
  }

  /**
   * A message that was given up without a reason of its own either expired, or waited behind a message that failed
   * and went with it. Its age tells them apart, and only the first one says that it expired.
   */
  private async showAsFailedUnlessItIs(conversation: Conversation, messageId: string, queuedAt: number): Promise<void> {
    const record = await this.eventService.loadEvent(conversation.id, messageId);
    if (record === undefined || this.isFailedRecord(record)) {
      return;
    }
    const hasExpired = this.serverTimeHandler.toServerTimestamp() - queuedAt >= TIME_IN_MILLIS.WEEK;
    await this.markMessage(conversation, messageId, StatusType.FAILED, hasExpired ? 'expired' : 'generic');
  }

  private isFailedRecord(record: EventRecord): boolean {
    return record.status === StatusType.FAILED || record.status === StatusType.FEDERATION_ERROR;
  }

  /**
   * Shows the optimistic message of an operation unless it is shown already, also after a reload. A call while the
   * message is being shown waits for that showing, so a message is never shown twice. It never rejects.
   */
  private ensureShown(conversation: Conversation, payload: ShownPayload): Promise<void> {
    return (
      this.showing.get(payload.messageId) ??
      this.trackShowing(payload.messageId, this.showIfMissing(conversation, payload))
    );
  }

  private trackShowing(messageId: string, showing: Promise<void>): Promise<void> {
    const tracked = showing
      .catch((error: unknown) => {
        this.logger.warn('Failed to show a message of the outbox', {
          errorName: error instanceof Error ? error.name : typeof error,
        });
      })
      .finally(() => {
        this.showing.delete(messageId);
      });
    this.showing.set(messageId, tracked);
    return tracked;
  }

  private async showIfMissing(conversation: Conversation, payload: ShownPayload): Promise<void> {
    if ((await this.eventService.loadEvent(conversation.id, payload.messageId)) !== undefined) {
      return;
    }
    const message = await this.buildShownMessage(conversation, payload);
    if (message !== undefined) {
      await this.injectOptimisticMessage(message, conversation);
    }
  }

  private async buildShownMessage(
    conversation: Conversation,
    payload: ShownPayload,
  ): Promise<GenericMessage | undefined> {
    if (!('type' in payload)) {
      return this.buildOutboxPing(conversation, payload.messageId);
    }
    switch (payload.type) {
      case 'text':
        return this.buildOutboxText(conversation, payload);
      case 'edit':
        return this.buildOutboxEdit(conversation, payload);
      case 'asset':
        // The bytes of an asset are not in its payload, so only the queue side can show it.
        return undefined;
    }
  }

  // The message kind: assets

  /**
   * The operation holds ids only, so the queue side keeps the bytes on the record, where every attempt reads them.
   * The asset is shown right after the enqueue. A crash in between leaves an operation without bytes, which its
   * first attempt deletes.
   */
  private async enqueueAsset(conversation: Conversation, file: Blob, asImage: boolean): Promise<void> {
    let metaData: FileMetaDataContent;
    try {
      metaData = await this.buildFileMetaData(file, asImage);
    } catch (error: unknown) {
      this.logger.error('Error while building metadata for asset', {error});
      return;
    }
    const message = MessageBuilder.buildFileMetaDataMessage({metaData});
    const payload: AssetMessagePayload = {
      type: 'asset',
      conversationId: conversation.qualifiedId,
      messageId: message.messageId,
      asImage,
    };
    const enqueued = this.enqueueAssetOperation(payload);
    // Tracked before the enqueue settles, so that the first attempt waits until the asset is shown with its bytes.
    await this.trackShowing(payload.messageId, this.showNewAsset(conversation, message, file, enqueued));
  }

  private enqueueAssetOperation(payload: AssetMessagePayload): Promise<EnqueueOutcome<MessagePayload>> {
    return this.outboxKinds.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfMessages(payload.conversationId),
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- The duration reads best written out.
      attemptTimeoutMilliseconds: 10 * TIME_IN_MILLIS.MINUTE,
    });
  }

  private async showNewAsset(
    conversation: Conversation,
    message: GenericMessage,
    file: Blob,
    enqueued: Promise<EnqueueOutcome<MessagePayload>>,
  ): Promise<void> {
    const isAccepted = this.isAccepted(await enqueued);
    await this.injectOptimisticMessage(message, conversation);
    const isKept = await this.keepFileOnMessage(conversation, message.messageId, file);
    if (!isAccepted || !isKept) {
      await this.markMessage(conversation, message.messageId, StatusType.FAILED, 'rejected');
    }
  }

  private async enqueueAssetAgain(
    conversation: Conversation,
    file: Blob,
    asImage: boolean,
    messageId: string,
  ): Promise<void> {
    await this.markMessage(conversation, messageId, StatusType.SENDING);

    const record = await this.eventService.loadEvent(conversation.id, messageId);
    if (record?.fileData === undefined && !(await this.keepFileOnMessage(conversation, messageId, file))) {
      await this.markMessage(conversation, messageId, StatusType.FAILED, 'rejected');
      return;
    }
    const payload = match(this.outboxKinds.message.find(messageId))
      .with(
        {outcome: 'operation-found', operation: {state: 'dead-lettered', payload: {type: 'asset'}}},
        ({operation}) => {
          return this.isUnconfirmed(operation)
            ? {...operation.payload, mayBeDelivered: true as const}
            : operation.payload;
        },
      )
      .otherwise((): AssetMessagePayload => {
        return {type: 'asset', conversationId: conversation.qualifiedId, messageId, asImage};
      });
    if (!this.isAccepted(await this.enqueueAssetOperation(payload))) {
      await this.markMessage(conversation, messageId, StatusType.FAILED, 'rejected');
      return;
    }
    await this.enqueueDependentsAgain(messageId);
  }

  /** `false` when the record could not take the bytes, e.g. the storage quota is exceeded; the shown message keeps them */
  private async keepFileOnMessage(conversation: Conversation, messageId: string, file: Blob): Promise<boolean> {
    try {
      await this.storeFileInDb(conversation, messageId, file);
      return true;
    } catch (error: unknown) {
      this.logger.warn('Could not keep the bytes of an asset on its message', {error});
      return false;
    }
  }

  private async attemptAsset(payload: AssetMessagePayload, signal: AbortSignal): Promise<AttemptOutcome> {
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return this.deleteForUnknownConversation();
    }
    await this.ensureShown(conversation, payload);
    const record = await this.eventService.loadEvent(conversation.id, payload.messageId);
    if (record === undefined) {
      // The bytes were on the record, so there is nothing to upload and nothing to show as failed.
      this.logger.info('Deletingan asset without a record', {outcome: 'record-missing'});
      return {outcome: 'attempt-deleted'};
    }
    if (this.isDegraded(conversation)) {
      return this.holdForPermission(payload.messageId, [conversation], 'mark-declined');
    }
    if (readRecordedUpload(record) !== undefined) {
      return this.sendUploadedAsset(conversation, payload);
    }
    if (record.fileData === undefined) {
      return this.failShownMessage(conversation, payload.messageId, {
        type: 'rejected',
        reason: 'rejected',
        federation: false,
      });
    }

    try {
      await this.uploadOutboxAsset(conversation, payload, record.fileData, signal);
    } catch (error: unknown) {
      // The timeout or the outbox aborted the attempt, which is not an upload the user cancelled.
      if (signal.aborted) {
        return {outcome: 'attempt-failed'};
      }
      return this.failShownMessage(conversation, payload.messageId, classifySendError(error));
    }
    return this.sendUploadedAsset(conversation, payload);
  }

  private async sendUploadedAsset(conversation: Conversation, payload: AssetMessagePayload): Promise<AttemptOutcome> {
    const message = await this.buildOutboxAsset(conversation, payload);
    if (message === undefined) {
      return this.failShownMessage(conversation, payload.messageId, {
        type: 'rejected',
        reason: 'rejected',
        federation: false,
      });
    }
    await this.matchLocalTimerToSent(conversation, message);
    // The first injection of an asset message turns the shown placeholder into the uploaded asset.
    await this.injectOptimisticMessage(message, conversation);
    return this.sendShownMessage(conversation, payload.messageId, message);
  }

  // The ping kind

  private async enqueuePing(conversation: Conversation): Promise<SendAndInjectResult> {
    const payload: PingPayload = {conversationId: conversation.qualifiedId, messageId: createUuid()};
    const enqueued = this.outboxKinds.ping.enqueue({
      payload,
      correlationKey: payload.messageId,
      laneKey: laneOfMessages(payload.conversationId),
    });
    void this.audioRepository.play(AudioType.OUTGOING_PING);
    if (this.isAccepted(await enqueued)) {
      return {id: payload.messageId, sentAt: new Date().toISOString(), state: SendAndInjectSendingState.QUEUED};
    }
    await this.showAsRefused(conversation, payload);
    return {id: payload.messageId, sentAt: new Date().toISOString(), state: SendAndInjectSendingState.FAILED};
  }

  private readonly attemptPingOperation = async ({payload}: OperationView<PingPayload>): Promise<AttemptOutcome> => {
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return this.deleteForUnknownConversation();
    }
    await this.ensureShown(conversation, payload);
    if (this.isDegraded(conversation)) {
      // A declined ping is deleted like any ping that can't go out, and leaves the screen with it.
      return this.holdForPermission(payload.messageId, [conversation], 'delete');
    }
    const ping = this.buildOutboxPing(conversation, payload.messageId);
    return this.sendSilently(ping, conversation, {failFast: true, syncTimestamp: true});
  };

  private readonly onPingOperationChanged = ({payload, state}: OperationView<PingPayload>): void => {
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return;
    }
    this.activeFireAndForgetInvoker.fireAndForget(async () => {
      if (state === 'deleted') {
        await this.deleteMessageById(conversation, payload.messageId);
        return;
      }
      if (state === 'queued' || state === 'on-hold' || state === 'in-progress') {
        await this.ensureShown(conversation, payload);
      }
    });
  };

  // The receipt kind

  private async enqueueConfirmation(
    conversation: Conversation,
    message: Message,
    type: Confirmation.Type,
    moreMessages: Message[],
  ): Promise<void> {
    if (!this.shouldConfirm(conversation, message, type)) {
      return;
    }
    await this.enqueueReceipt({
      type: 'confirmation',
      conversationId: conversation.qualifiedId,
      confirmationType: type,
      messageIds: [
        message.id,
        ...moreMessages.map(entity => {
          return entity.id;
        }),
      ],
      recipient: message.qualifiedFrom,
    });
  }

  private async enqueueCleared(conversation: Conversation): Promise<void> {
    const timestamp = this.setClearedTimestamp(conversation);
    if (timestamp !== undefined) {
      await this.enqueueReceipt({type: 'cleared', conversationId: conversation.qualifiedId, timestamp});
    }
  }

  /** Nothing of a receipt is shown, so a receipt the outbox refuses is lost. */
  private async enqueueReceipt(payload: OutboxReceiptPayload): Promise<void> {
    const outcome = await this.outboxKinds.receipt.enqueue({
      payload,
      correlationKey: receiptCorrelationKey(payload),
      laneKey: laneOfReceipts(payload),
    });
    this.isAccepted(outcome);
  }

  private readonly attemptReceiptOperation = async ({
    payload,
  }: OperationView<OutboxReceiptPayload>): Promise<AttemptOutcome> => {
    const correlationKey = receiptCorrelationKey(payload);
    switch (payload.type) {
      case 'confirmation':
        return this.attemptConfirmation(payload);
      case 'last-read':
        return this.attemptSelfSend(
          correlationKey,
          MessageBuilder.buildLastReadMessage(payload.conversationId, payload.timestamp),
        );
      case 'cleared':
        return this.attemptSelfSend(
          correlationKey,
          MessageBuilder.buildClearedMessage(payload.conversationId, payload.timestamp),
        );
      case 'data-transfer':
        return this.attemptSelfSend(correlationKey, MessageBuilder.buildDataTransferMessage(payload.countlyId));
    }
  };

  private async attemptConfirmation(
    payload: Extract<OutboxReceiptPayload, {type: 'confirmation'}>,
  ): Promise<AttemptOutcome> {
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return this.deleteForUnknownConversation();
    }
    // The user may have turned read receipts off since the receipt was queued.
    if (payload.confirmationType === Confirmation.Type.READ && !supportsReadReceipts(conversation)) {
      this.logger.info('Deletinga read receipt', {outcome: 'read-receipts-off'});
      return {outcome: 'attempt-deleted'};
    }

    const [firstMessageId, ...moreMessageIds] = payload.messageIds;
    const confirmation = MessageBuilder.buildConfirmationMessage({
      firstMessageId,
      moreMessageIds: moreMessageIds.length > 0 ? moreMessageIds : undefined,
      type: payload.confirmationType,
    });
    const options: BackendSendOptions = {
      failFast: true,
      nativePush: false,
      recipients: [payload.recipient],
      silentDegradationWarning: true,
      skipInjection: true,
      targetMode: MessageTargetMode.USERS,
    };
    try {
      const result = await this.sendMessageToBackend(confirmation, conversation, options);
      if (result.state === MessageSendingState.OUTGOING_SENT) {
        return {outcome: 'attempt-succeeded'};
      }
    } catch (error: unknown) {
      return this.deleteUnlessRetry(classifySendError(error));
    }
    // The send was refused over unverified devices, so it goes to the devices we know of only.
    return this.sendSilently(confirmation, conversation, {...options, targetMode: MessageTargetMode.USERS_CLIENTS});
  }

  private async attemptSelfSend(correlationKey: string, message: GenericMessage): Promise<AttemptOutcome> {
    const selfConversations = this.conversationState.getSelfConversations(
      supportsMLS() && this.teamState.isMLSEnabled(),
    );
    const [degraded, others] = partition(selfConversations, conversation => {
      return this.isDegraded(conversation);
    });
    if (degraded.length === 0) {
      return this.sendToSelf(others, message);
    }
    const sendResult = others.length > 0 ? await this.sendToSelf(others, message) : undefined;
    if (sendResult?.outcome === 'attempt-failed') {
      return sendResult;
    }
    return this.holdForPermission(correlationKey, degraded, 'delete');
  }

  /** One self conversation that needs a retry has the whole operation retried, which is harmless. */
  private async sendToSelf(selfConversations: Conversation[], message: GenericMessage): Promise<AttemptOutcome> {
    if (selfConversations.length === 0) {
      return {outcome: 'attempt-failed'};
    }
    const sendResults = await Promise.all(
      selfConversations.map(selfConversation => {
        return this.sendSilently(message, selfConversation, {failFast: true, skipInjection: true});
      }),
    );
    return (
      sendResults.find(sendResult => {
        return sendResult.outcome === 'attempt-failed';
      }) ??
      sendResults.find(sendResult => {
        return sendResult.outcome !== 'attempt-succeeded';
      }) ?? {outcome: 'attempt-succeeded'}
    );
  }

  // The message-change kind

  private async enqueueReaction(
    conversation: Conversation,
    message: Message,
    reactions: ReactionType,
  ): Promise<SendAndInjectResult> {
    const reaction = MessageBuilder.buildReactionMessage({originalMessageId: message.id, type: reactions});
    const reactionsBefore = this.reactionsOfSelf(message);
    const outcome = await this.enqueueChange(
      {type: 'reaction', conversationId: conversation.qualifiedId, targetMessageId: message.id, reactions},
      reactionsBefore === undefined ? undefined : {type: 'reactions', reactions: reactionsBefore},
    );
    if (!this.isAccepted(outcome)) {
      return {id: reaction.messageId, sentAt: new Date().toISOString(), state: SendAndInjectSendingState.FAILED};
    }
    // A reaction changes a message that is shown already. It has no message of its own for the kind to show.
    await this.injectOptimisticMessage(reaction, conversation);
    return {id: reaction.messageId, sentAt: new Date().toISOString(), state: SendAndInjectSendingState.QUEUED};
  }

  /**
   * Save an edit. A message the outbox never attempted is edited where it is: the edit replaces its text, and
   * no one else ever sees the original. Otherwise the edit is a message of its own, behind the message if the
   * outbox still has it. A message that failed only changes locally, so that Retry sends the new text.
   */
  private async enqueueEdit(
    conversation: Conversation,
    textMessage: string,
    originalMessage: ContentMessage,
    mentions: MentionEntity[],
  ): Promise<void> {
    const originalMessageId = originalMessage.id;
    // The edit takes over the hold for editing before anything else runs, so stopping to edit doesn't release it.
    // The hold ends with this edit, as a version of the message or by the release below.
    if (this.holds.get(originalMessageId)?.reason === 'editing') {
      this.holds.delete(originalMessageId);
      await this.forgetEditedMessage(conversation.id, originalMessageId);
    }
    cancelSendingLinkPreview(originalMessageId);
    try {
      const pending = this.findPendingMessage(originalMessageId);
      const hasFailed =
        pending?.state === 'dead-lettered' ||
        arrayIncludes([StatusType.FAILED, StatusType.FEDERATION_ERROR], originalMessage.status());
      if (hasFailed) {
        await this.updateMessageTextLocally(conversation, originalMessage, textMessage, mentions);
      } else if (
        pending?.payload.type === 'text' &&
        (pending.state === 'queued' || pending.state === 'on-hold') &&
        !this.isUnconfirmed(pending) &&
        !originalMessage.hasMultipartAsset()
      ) {
        const {payload} = pending;
        const editPendingMessage = (): Promise<EnqueueOutcome<unknown>> => {
          return this.editPendingMessage(conversation, textMessage, originalMessage, mentions, payload);
        };
        // An attempt started meanwhile. One that was deleted never sent the message, so the new version still takes
        // its place. One that went through sent the message.
        await this.enqueueAgainIfAttemptEnded(editPendingMessage, ({outcome}) => {
          return outcome === 'operation-deleted'
            ? editPendingMessage()
            : this.enqueueEditAfterMessage(conversation, textMessage, originalMessage, mentions);
        });
      } else {
        await this.enqueueEditAfterMessage(conversation, textMessage, originalMessage, mentions);
        // The message was held while its text could still be replaced. Now it goes, and the edit goes behind it.
        if (pending?.state === 'on-hold') {
          const releaseResult = await this.activeOutbox.release(originalMessageId);
          this.logger.info('The outbox answered releasing an edited message', {outcome: releaseResult.outcome});
        }
      }
    } finally {
      clearLinkPreviewSendingState(originalMessageId);
    }
  }

  /** A version of the message: with the new text it keeps its id, its place and its lack of an edited mark. */
  private async editPendingMessage(
    conversation: Conversation,
    textMessage: string,
    originalMessage: ContentMessage,
    mentions: MentionEntity[],
    payload: OutboxTextPayload,
  ): Promise<EnqueueOutcome<unknown>> {
    const enqueueResult = await this.outboxKinds.message.enqueue({
      payload: {...payload, text: textMessage, mentions: this.toStoredMentions(mentions)},
      correlationKey: originalMessage.id,
      laneKey: laneOfMessages(payload.conversationId),
    });
    if (this.isAccepted(enqueueResult)) {
      await this.updateMessageTextLocally(conversation, originalMessage, textMessage, mentions);
    } else if (!endsRunningAttempt(enqueueResult)) {
      // The message is still held for the edit that the outbox refused.
      await this.activeOutbox.release(originalMessage.id);
    }
    return enqueueResult;
  }

  private async enqueueEditAfterMessage(
    conversation: Conversation,
    textMessage: string,
    originalMessage: ContentMessage,
    mentions: MentionEntity[],
  ): Promise<EnqueueOutcome<unknown>> {
    const attachments = originalMessage
      .getMultipartAssets()
      .map(multipart => {
        return multipart.attachments?.() ?? [];
      })
      .flat()
      .filter(Boolean);
    const shownEvent = await this.eventService.loadEvent(conversation.id, originalMessage.id);
    const outcome = await this.enqueueChange(
      {
        type: 'edit',
        conversationId: conversation.qualifiedId,
        originalMessageId: originalMessage.id,
        messageId: createUuid(),
        text: textMessage,
        mentions: this.toStoredMentions(mentions),
        attachments: isNonEmptyArray(attachments) ? attachments : undefined,
      },
      shownEvent === undefined ? undefined : {type: 'event', event: shownEvent},
    );
    this.isAccepted(outcome);
    return outcome;
  }

  /** Nothing is sent, and the message gets no edited mark. */
  private async updateMessageTextLocally(
    conversation: Conversation,
    message: ContentMessage,
    text: string,
    mentions: MentionEntity[],
  ): Promise<void> {
    const textMessage = MessageBuilder.buildTextMessage(
      this.decorateTextMessage({text}, conversation, {mentions}),
      message.id,
    );
    const record = await this.eventService.loadEvent(conversation.id, message.id);
    if (record === undefined) {
      return;
    }
    const data = {
      ...(record as {data?: object}).data,
      content: text,
      mentions: (textMessage.text?.mentions ?? []).map(mention => {
        return arrayToBase64(Mention.encode(mention).finish());
      }),
    };
    await this.eventService.updateEvent(record.primary_key, {data} as Partial<EventRecord>);
    // The shown text is made from the stored one, as it is when the message is loaded
    const updated = this.event_mapper.mapJsonEvent({...record, data} as EventRecord, conversation);
    if (updated instanceof ContentMessage) {
      message.assets(updated.assets());
    }
  }

  /**
   * Delete for everyone. A message that never went out is deleted with its changes and nothing is sent.
   * A message that may have been delivered is deleted unless it is in flight, and the deletion follows it.
   */
  private async enqueueDelete(
    conversation: Conversation,
    message: Message,
    targetedUsers?: QualifiedId[],
  ): Promise<void> {
    if (!message.user().isMe && !isTruthy(message.ephemeral_expires())) {
      throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
    }
    await this.removeThroughOutbox(conversation, message, {
      type: 'delete',
      conversationId: conversation.qualifiedId,
      targetMessageId: message.id,
      recipients: targetedUsers,
    });
  }

  /** Whatever is sent to remove the message, the message goes at once. */
  private async removeThroughOutbox(
    conversation: Conversation,
    message: Message,
    removal: Extract<MessageChangePayload, {type: 'delete' | 'hide'}>,
  ): Promise<void> {
    const pending = this.findPendingMessage(message.id);
    // The changes go first, so that none is sent for a message that no longer exists.
    const correlationKeys = [...changeCorrelationKeysOf(message.id), message.id];
    // An attempt in flight isn't deleted. The removal waits for it and follows the message.
    const isDeletable = pending !== undefined && pending.state !== 'in-progress';
    if (isDeletable) {
      for (const correlationKey of correlationKeys) {
        const deleteResult = await this.activeOutbox.delete(correlationKey);
        this.logger.info('The outbox answered deleting an operation of a deleted message', {
          outcome: deleteResult.outcome,
        });
        if (this.isOutboxUnavailable(deleteResult)) {
          this.logger.warn('The message stays, because the outbox could not save its deletion');
          return;
        }
      }
    }
    if (pending === undefined || !isDeletable || this.isUnconfirmed(pending)) {
      const shownEvent = await this.eventService.loadEvent(conversation.id, message.id);
      const previous = shownEvent === undefined ? undefined : ({type: 'event', event: shownEvent} as const);
      const removalResult = await this.enqueueChange(removal, previous);
      this.isAccepted(removalResult);
      if (this.isOutboxUnavailable(removalResult)) {
        this.logger.warn('The message stays, because the outbox could not save its removal');
        return;
      }
    }
    await this.deleteMessageById(conversation, message.id);
  }

  /**
   * The payload with what it takes to take the change back when it is deleted unsent. A change that replaces one
   * still unsent keeps what the first one would take back to.
   */
  private withPreviousState(
    payload: MessageChangePayload,
    correlationKey: string,
    previous: PreviousState | undefined,
  ): MessageChangePayload {
    if (previous === undefined) {
      return payload;
    }
    switch (payload.type) {
      case 'reaction':
        return previous.type === 'reactions'
          ? {...payload, previousReactions: this.unsentReactionBase(correlationKey) ?? previous.reactions}
          : payload;
      case 'edit':
        return previous.type === 'event'
          ? {...payload, previousEvent: this.unsentEditBase(payload, previous.event) ?? previous.event}
          : payload;
      case 'delete':
      case 'hide':
        return previous.type === 'event' ? {...payload, removedEvent: previous.event} : payload;
    }
  }

  /**
   * What the message was before the edits that still wait to be sent: the first of them has it. A later edit is of
   * the message the earlier one made, or of the same message when the first one was replaced.
   */
  private unsentEditBase(payload: OutboxEditPayload, shownEvent: StoredEvent): StoredEvent | undefined {
    const replacedMessageId = (shownEvent as {data?: {replacing_message_id?: string}}).data?.replacing_message_id;
    const candidates = [
      this.outboxKinds.messageChange.find(messageCorrelationKey(payload)),
      replacedMessageId === undefined
        ? undefined
        : this.outboxKinds.messageChange.find(
            messageCorrelationKey({...payload, originalMessageId: replacedMessageId}),
          ),
    ];
    for (const findResult of candidates) {
      if (
        findResult?.outcome === 'operation-found' &&
        findResult.operation.payload.type === 'edit' &&
        this.isUnsent(findResult.operation) &&
        (findResult.operation.payload.messageId === payload.originalMessageId ||
          findResult.operation.payload.originalMessageId === payload.originalMessageId)
      ) {
        return findResult.operation.payload.previousEvent;
      }
    }
    return undefined;
  }

  /** What the self user's reactions to the message were before the reaction that still waits to be sent */
  private unsentReactionBase(correlationKey: string): string | undefined {
    const findResult = this.outboxKinds.messageChange.find(correlationKey);
    if (findResult.outcome !== 'operation-found' || findResult.operation.payload.type !== 'reaction') {
      return undefined;
    }
    return this.isUnsent(findResult.operation) ? findResult.operation.payload.previousReactions : undefined;
  }

  /** An attempt in flight may never have reached the receiver, so its change isn't confirmed either. */
  private isUnsent({state}: OperationView<unknown>): boolean {
    return state === 'queued' || state === 'on-hold' || state === 'in-progress';
  }

  private reactionsOfSelf(message: Message): string | undefined {
    const selfUser = this.userState.self();
    if (selfUser === undefined || !(message instanceof ContentMessage)) {
      return undefined;
    }
    return message
      .reactions()
      .filter(([, users]) => {
        return users.some(user => {
          return matchQualifiedIds(user, selfUser.qualifiedId);
        });
      })
      .map(([reaction]) => {
        return reaction;
      })
      .join(',');
  }

  /**
   * The message of a change is never shown as failed. A change that can't go out, or that the user declines to send,
   * is deleted, and the optimistic change stays local.
   */
  private readonly attemptChangeOperation = async ({
    payload,
  }: Pick<OperationView<MessageChangePayload>, 'payload'>): Promise<AttemptOutcome> => {
    const correlationKey = messageCorrelationKey(payload);
    if (payload.type === 'hide') {
      const hide = MessageBuilder.buildHideMessage({
        conversationId: payload.conversationId.id,
        messageId: payload.targetMessageId,
        qualifiedConversationId: payload.conversationId,
      });
      return this.attemptSelfSend(correlationKey, hide);
    }
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return this.deleteForUnknownConversation();
    }
    if (payload.type === 'edit') {
      await this.ensureShown(conversation, payload);
    }
    if (this.isDegraded(conversation)) {
      return this.holdForPermission(correlationKey, [conversation], 'delete');
    }

    switch (payload.type) {
      case 'reaction': {
        const reaction = MessageBuilder.buildReactionMessage({
          originalMessageId: payload.targetMessageId,
          type: payload.reactions,
        });
        return this.sendSilently(reaction, conversation, {failFast: true, skipInjection: true});
      }
      case 'edit': {
        const edit = this.buildOutboxEdit(conversation, payload);
        const sendResult = await this.sendSilently(edit, conversation, {failFast: true, syncTimestamp: false});
        if (sendResult.outcome === 'attempt-succeeded') {
          this.activeFireAndForgetInvoker.fireAndForget(() => {
            return this.sendLinkPreviewOf(conversation, {...payload, quote: undefined});
          });
        }
        return sendResult;
      }
      case 'delete': {
        const deletion = MessageBuilder.buildDeleteMessage({messageId: payload.targetMessageId});
        return this.sendSilently(deletion, conversation, {
          failFast: true,
          recipients: payload.recipients ?? this.membersOf(conversation),
          skipInjection: true,
          targetMode: MessageTargetMode.USERS,
        });
      }
    }
  };

  private membersOf(conversation: Conversation): QualifiedId[] {
    return conversation.allUserEntities().map(user => {
      if (isUndefined(user)) {
        throw new Error('Conversation member list contains an empty user');
      }
      return user.qualifiedId;
    });
  }

  private readonly onChangeOperationChanged = ({
    payload,
    state,
  }: Pick<OperationView<MessageChangePayload>, 'payload' | 'state'>): void => {
    const conversation = this.conversationState.findConversation(payload.conversationId);
    if (conversation === undefined) {
      return;
    }
    if (state === 'deleted') {
      this.activeFireAndForgetInvoker.fireAndForget(() => {
        return this.takeBackUnsentChange(conversation, payload);
      });
      return;
    }
    if (payload.type === 'edit' && state === 'queued') {
      this.activeFireAndForgetInvoker.fireAndForget(() => {
        return this.ensureShown(conversation, payload);
      });
    }
  };

  /**
   * A change deleted unsent is taken back, so that the sender doesn't keep a change nobody received. The sender is
   * told about edits and removals. A change stored without what it takes to take it back stays.
   */
  private async takeBackUnsentChange(conversation: Conversation, payload: MessageChangePayload): Promise<void> {
    switch (payload.type) {
      case 'reaction':
        if (payload.previousReactions !== undefined) {
          const previous = MessageBuilder.buildReactionMessage({
            originalMessageId: payload.targetMessageId,
            type: payload.previousReactions,
          });
          await this.injectOptimisticMessage(previous, conversation);
        }
        return;
      case 'edit':
        if (payload.previousEvent !== undefined && (await this.restoreEditedMessage(conversation, payload))) {
          this.notifyChangeUndone('edit');
        }
        return;
      case 'delete':
      case 'hide':
        if (
          payload.removedEvent !== undefined &&
          (await this.restoreRemovedMessage(conversation, payload.removedEvent))
        ) {
          this.notifyChangeUndone('delete');
        }
    }
  }

  /**
   * The stored record gets the version from before the edit back, with nothing left over from the edit. `false` when
   * the edit is no longer what is shown, e.g. because a later edit replaced it.
   */
  private async restoreEditedMessage(
    conversation: Conversation,
    {messageId, previousEvent}: OutboxEditPayload,
  ): Promise<boolean> {
    const current = await this.eventService.loadEvent(conversation.id, messageId);
    if (current === undefined || current.id !== messageId || previousEvent === undefined) {
      return false;
    }
    const leftOver = Object.fromEntries(
      Object.keys(current)
        .filter(key => {
          return !(key in previousEvent);
        })
        .map(key => {
          return [key, undefined];
        }),
    );
    // The shown message is replaced by the update of the record.
    await this.eventService.replaceEvent({...leftOver, ...previousEvent, primary_key: current.primary_key});
    return true;
  }

  /** `false` when the message is there already */
  private async restoreRemovedMessage(conversation: Conversation, removed: StoredEvent): Promise<boolean> {
    if (
      typeof removed.id !== 'string' ||
      (await this.eventService.loadEvent(conversation.id, removed.id)) !== undefined
    ) {
      return false;
    }
    const {primary_key: _primaryKey, ...event} = removed;
    await this.eventRepository.injectEvent(event as ClientConversationEvent);
    return true;
  }

  /** Called when an edit or a removal was taken back because it could not be sent. Returns how to stop listening. */
  public onChangeUndone(listener: (change: 'edit' | 'delete') => void): () => void {
    this.changeUndoneListeners.add(listener);
    return () => {
      this.changeUndoneListeners.delete(listener);
    };
  }

  private notifyChangeUndone(change: 'edit' | 'delete'): void {
    for (const listener of this.changeUndoneListeners) {
      listener(change);
    }
  }

  // Holds
  //
  // `holds` is the only record of why this session holds an operation, and the public methods below are the only
  // ways out of a hold. A record whose operation is gone is harmless: its release or delete answers that the operation
  // was not found, and the record goes then.

  /**
   * Call this right after the outbox started. The holds restored from an earlier session lost their prompt or their
   * editor: a text message that was still being edited is held for editing again, and everything else is released,
   * so that its next attempt asks again if it needs to.
   */
  public reviewRestoredHolds(): void {
    if (this.outbox === undefined) {
      return;
    }
    // The restored holds are listed before anything awaits, so that no hold this session makes is taken for one.
    const lanesResult = this.outbox.lanes();
    if (lanesResult.outcome !== 'lanes-listed') {
      return;
    }
    // A held operation blocks its lane, so it is always the first of its lane.
    const restoredKeys = lanesResult.lanes.flatMap(({operations: [{state, correlation}]}) => {
      return state === 'on-hold' && correlation.state === 'correlated' && !this.holds.has(correlation.correlationKey)
        ? [correlation.correlationKey]
        : [];
    });
    this.activeFireAndForgetInvoker.fireAndForget(() => {
      return this.reviewRestoredHoldsOf(restoredKeys);
    });
  }

  /** Lets the operations that wait for the user's permission to send to this conversation go */
  public async allowSending(conversation: Conversation): Promise<void> {
    if (this.outbox === undefined) {
      return;
    }
    for (const [correlationKey, hold] of this.holdsWaitingOn(conversation)) {
      const waitingOnConversations = hold.waitingOnConversations.filter(conversationId => {
        return !matchQualifiedIds(conversationId, conversation.qualifiedId);
      });
      if (waitingOnConversations.length > 0) {
        this.holds.set(correlationKey, {...hold, waitingOnConversations});
        continue;
      }
      this.holds.delete(correlationKey);
      const releaseResult = await this.outbox.release(correlationKey);
      this.logger.info('The outbox answered releasing an operation the user allowed', {
        outcome: releaseResult.outcome,
      });
    }
  }

  /**
   * The first message of the conversation is dead-lettered, which dead-letters the messages behind it and the changes
   * waiting on them, so that all of them show Retry. Every other operation in the lanes of this conversation is
   * deleted: pings, changes to sent messages and receipts are not worth sending later.
   * The outbox queues its commands in call order, so they are all issued before any of them is awaited. Otherwise the
   * lane moves on between two of them and what is behind it asks the user again.
   */
  public async declineSending(conversation: Conversation): Promise<void> {
    if (this.outbox === undefined) {
      return;
    }
    const heldKeys: Record<PermissionHold['whenDeclined'], string[]> = {'mark-declined': [], delete: []};
    for (const [correlationKey, hold] of this.holdsWaitingOn(conversation)) {
      this.holds.delete(correlationKey);
      heldKeys[hold.whenDeclined].push(correlationKey);
    }
    for (const correlationKey of heldKeys['mark-declined']) {
      // The correlation key of a message is its id.
      await this.markMessage(conversation, correlationKey, StatusType.FAILED, 'declined');
    }

    const {firstMessageKey, keysToDelete} = this.operationsToEndFor(conversation);
    // A held operation may belong to the lanes of another conversation, like a change to a message.
    const commands = [
      ...(firstMessageKey === undefined ? [] : [this.activeOutbox.deadLetter(firstMessageKey)]),
      ...[...new Set([...heldKeys.delete, ...keysToDelete])].map(correlationKey => {
        return this.activeOutbox.delete(correlationKey);
      }),
    ];
    for (const result of await Promise.all(commands)) {
      this.logger.info('The outbox answered ending an operation the user declined', {outcome: result.outcome});
    }
  }

  /** What the lanes of the conversation hold right now: the key of its first message, and the keys to delete */
  private operationsToEndFor(conversation: Conversation): {firstMessageKey?: string; keysToDelete: string[]} {
    const operationsOf = (laneKey: string): OperationView[] => {
      const laneResult = this.activeOutbox.lane(laneKey);
      return laneResult.outcome === 'lane-found' ? laneResult.lane.operations : [];
    };
    const keyOf = ({correlation}: OperationView): string[] => {
      return correlation.state === 'correlated' ? [correlation.correlationKey] : [];
    };
    const messageLane = operationsOf(laneOfMessages(conversation.qualifiedId));
    const firstMessage = messageLane.find(({kind}) => {
      return kind === 'message';
    });
    return {
      firstMessageKey: firstMessage === undefined ? undefined : keyOf(firstMessage)[0],
      keysToDelete: [
        ...messageLane
          .filter(({kind}) => {
            return kind !== 'message';
          })
          .flatMap(keyOf),
        ...operationsOf(laneOfChanges(conversation.qualifiedId)).flatMap(keyOf),
        ...operationsOf(laneOfConversationReceipts(conversation.qualifiedId)).flatMap(keyOf),
      ],
    };
  }

  /** Holds a message the user starts to edit while the outbox still has it, so that the edit can replace its text */
  public async startEditing(message: ContentMessage): Promise<void> {
    if (this.outbox === undefined || this.holds.get(message.id)?.reason === 'editing') {
      return;
    }
    await this.stopEditing();
    const pending = this.findPendingMessage(message.id);
    if (pending === undefined) {
      return;
    }
    const conversationId = pending.payload.conversationId.id;
    if (pending.state === 'on-hold') {
      // A hold this session didn't make was restored for the message being edited.
      if (!this.holds.has(message.id)) {
        this.holds.set(message.id, {reason: 'editing', conversationId});
        await this.rememberEditedMessage(conversationId, message.id);
      }
      return;
    }
    this.holds.set(message.id, {reason: 'editing', conversationId});
    const holdResult = await this.outbox.hold(message.id);
    this.logger.info('The outbox answered holding a message for editing', {outcome: holdResult.outcome});
    if (holdResult.outcome !== 'operation-held') {
      this.holds.delete(message.id);
      return;
    }
    await this.rememberEditedMessage(conversationId, message.id);
  }

  public async stopEditing(): Promise<void> {
    if (this.outbox === undefined) {
      return;
    }
    for (const [correlationKey, hold] of [...this.holds]) {
      if (hold.reason !== 'editing') {
        continue;
      }
      this.holds.delete(correlationKey);
      await this.forgetEditedMessage(hold.conversationId, correlationKey);
      const releaseResult = await this.outbox.release(correlationKey);
      this.logger.info('The outbox answered releasing a message that was held for editing', {
        outcome: releaseResult.outcome,
      });
    }
  }

  private holdsWaitingOn(conversation: Conversation): [string, PermissionHold][] {
    return [...this.holds].filter((entry): entry is [string, PermissionHold] => {
      const [, hold] = entry;
      return (
        hold.reason === 'sending-permission' &&
        hold.waitingOnConversations.some(conversationId => {
          return matchQualifiedIds(conversationId, conversation.qualifiedId);
        })
      );
    });
  }

  /**
   * The user answers after the attempt that asked has ended, so the attempt returns the hold this gives.
   * One prompt serves every operation that waits on the same conversation.
   */
  private holdForPermission(
    correlationKey: string,
    waitingOnConversations: Conversation[],
    whenDeclined: PermissionHold['whenDeclined'],
  ): AttemptOutcome {
    this.holds.set(correlationKey, {
      reason: 'sending-permission',
      waitingOnConversations: waitingOnConversations.map(conversation => {
        return conversation.qualifiedId;
      }),
      whenDeclined,
    });
    for (const conversation of waitingOnConversations) {
      this.activeFireAndForgetInvoker.fireAndForget(() => {
        return this.askForPermission(conversation);
      });
    }
    return {outcome: 'attempt-held'};
  }

  private async askForPermission(conversation: Conversation): Promise<void> {
    if (this.openPrompts.has(conversation.id)) {
      return;
    }
    this.openPrompts.add(conversation.id);
    const isAllowed = await this.requestUserSendingPermission(conversation, false, CONSENT_TYPE.MESSAGE).catch(() => {
      return false;
    });
    this.openPrompts.delete(conversation.id);
    await (isAllowed ? this.allowSending(conversation) : this.declineSending(conversation));
  }

  private async reviewRestoredHoldsOf(restoredKeys: string[]): Promise<void> {
    const editedMessages = await this.readEditedMessages();
    for (const correlationKey of restoredKeys) {
      const payload = this.findPendingMessage(correlationKey)?.payload;
      if (payload?.type === 'text' && editedMessages[payload.conversationId.id] === payload.messageId) {
        this.holds.set(correlationKey, {reason: 'editing', conversationId: payload.conversationId.id});
        continue;
      }
      // The user may have started to edit the message meanwhile.
      if (this.holds.has(correlationKey)) {
        continue;
      }
      const releaseResult = await this.activeOutbox.release(correlationKey);
      this.logger.info('The outbox answered releasing a restored hold', {outcome: releaseResult.outcome});
    }
    for (const [conversationId, messageId] of Object.entries(editedMessages)) {
      if (this.holds.get(messageId)?.reason !== 'editing') {
        await this.forgetEditedMessage(conversationId, messageId);
      }
    }
  }

  private async readEditedMessages(): Promise<EditedMessages> {
    const editedMessages = await this.eventService.storageService.loadFromSimpleStorage<EditedMessages>(
      StorageKey.OUTBOX.EDITED_MESSAGES,
    );
    return editedMessages ?? {};
  }

  private async writeEditedMessages(editedMessages: EditedMessages): Promise<void> {
    await this.eventService.storageService.saveToSimpleStorage(StorageKey.OUTBOX.EDITED_MESSAGES, editedMessages);
  }

  private async rememberEditedMessage(conversationId: string, messageId: string): Promise<void> {
    await this.writeEditedMessages({...(await this.readEditedMessages()), [conversationId]: messageId});
  }

  /** Leaves the entry alone when the conversation edits another message by then. */
  private async forgetEditedMessage(conversationId: string, messageId: string): Promise<void> {
    const editedMessages = await this.readEditedMessages();
    if (editedMessages[conversationId] !== messageId) {
      return;
    }
    await this.writeEditedMessages(
      Object.fromEntries(
        Object.entries(editedMessages).filter(([editedIn]) => {
          return editedIn !== conversationId;
        }),
      ),
    );
  }

  // Change routing

  /**
   * A change goes behind its target in the lane of messages while the outbox still has the target, or an earlier
   * change to it, so that the change fails with its target. Every other change goes to the lane of changes, which
   * pending messages never block. A hide always goes there, because it is sent to the self conversations. Only a
   * change in the lane of changes keeps what it takes to take it back, because only that lane gives changes up.
   */
  private async enqueueChange(
    payload: MessageChangePayload,
    previous?: PreviousState,
  ): Promise<EnqueueOutcome<unknown>> {
    const correlationKey = messageCorrelationKey(payload);
    const targetMessageId = payload.type === 'edit' ? payload.originalMessageId : payload.targetMessageId;
    const followsTarget =
      this.findPendingMessage(targetMessageId) !== undefined || this.findPendingMessage(correlationKey) !== undefined;
    const enqueueInLaneOfChanges = (): Promise<EnqueueOutcome<unknown>> => {
      const request = {
        payload: this.withPreviousState(payload, correlationKey, previous),
        correlationKey,
        laneKey: laneOfChanges(payload.conversationId),
      };
      const enqueueRequest = (): Promise<EnqueueOutcome<unknown>> => {
        return this.outboxKinds.messageChange.enqueue(request);
      };
      // A running attempt of the change sent an older payload.
      return this.enqueueAgainIfAttemptEnded(enqueueRequest, enqueueRequest);
    };
    if (payload.type === 'hide' || !followsTarget) {
      return enqueueInLaneOfChanges();
    }
    return this.enqueueAgainIfAttemptEnded(
      () => {
        return this.outboxKinds.message.enqueue({
          payload,
          correlationKey,
          laneKey: laneOfMessages(payload.conversationId),
        });
      },
      // The earlier version ended meanwhile, so this is a change to a message that was sent or is gone.
      enqueueInLaneOfChanges,
    );
  }

  /**
   * An enqueue with the key of a running attempt answers how that attempt ended and doesn't queue the payload, so
   * `enqueueAgain` queues it instead, told how the attempt ended. The kernel should queue the payload itself.
   */
  private async enqueueAgainIfAttemptEnded(
    enqueue: () => Promise<EnqueueOutcome<unknown>>,
    enqueueAgain: (attemptEnding: EnqueueOutcome<unknown>) => Promise<EnqueueOutcome<unknown>>,
  ): Promise<EnqueueOutcome<unknown>> {
    const enqueueResult = await enqueue();
    return endsRunningAttempt(enqueueResult) ? enqueueAgain(enqueueResult) : enqueueResult;
  }

  /** `undefined` once the message went through, or when it never was in the outbox */
  private findPendingMessage(messageId: string): OperationView<MessagePayload> | undefined {
    const findResult = this.outboxKinds.message.find(messageId);
    return findResult.outcome === 'operation-found' ? findResult.operation : undefined;
  }

  /** A send was started and got no answer, so the message may have been delivered. */
  private isUnconfirmed({attempts, payload}: OperationView<MessagePayload>): boolean {
    return attempts > 0 || ((payload.type === 'text' || payload.type === 'asset') && payload.mayBeDelivered === true);
  }

  // Outbox state of a message

  /** `undefined` when there is no outbox, or the outbox doesn't have the message */
  public getOutboxState(messageId: string): OutboxState | undefined {
    if (this.outbox === undefined) {
      return undefined;
    }
    return match(this.findPendingMessage(messageId)?.state)
      .with('queued', 'on-hold', () => {
        return 'pending' as const;
      })
      .with('in-progress', () => {
        return 'sending' as const;
      })
      .otherwise(() => {
        return undefined;
      });
  }

  /** A message that waits and was never attempted reached nobody, so it can't be deleted for everyone. */
  public isPendingAndNeverAttempted(messageId: string): boolean {
    if (this.getOutboxState(messageId) !== 'pending') {
      return false;
    }
    const pending = this.findPendingMessage(messageId);
    return pending !== undefined && !this.isUnconfirmed(pending);
  }

  /**
   * Counts the text and file messages that still have to go out, for the warning at logout. Failed messages,
   * changes and pings don't count.
   */
  public countPendingMessages(): number {
    return this.waitingMessages.size;
  }

  /** The outbox also reports the operations it loads at startup as changed, so the count covers them too. */
  private trackWaitingMessage({id, payload, state}: OperationView<MessagePayload>): void {
    const isMessage = payload.type === 'text' || payload.type === 'asset';
    const isWaiting = state === 'queued' || state === 'on-hold' || state === 'in-progress';
    if (isMessage && isWaiting) {
      this.waitingMessages.add(id);
    } else {
      this.waitingMessages.delete(id);
    }
  }

  // Shared by the kinds

  /** For what the user doesn't see as a message: whatever isn't a success or a reason to retry is forgotten */
  private async sendSilently(
    message: GenericMessage,
    conversation: Conversation,
    options: BackendSendOptions,
  ): Promise<AttemptOutcome> {
    try {
      const result = await this.sendMessageToBackend(message, conversation, options);
      if (result.state === MessageSendingState.OUTGOING_SENT) {
        return {outcome: 'attempt-succeeded'};
      }
    } catch (error: unknown) {
      return this.deleteUnlessRetry(classifySendError(error));
    }
    this.logger.info('Deletingan operation the client mismatch handler declined to send', {outcome: 'declined'});
    return {outcome: 'attempt-deleted'};
  }

  private deleteUnlessRetry(error: SendErrorClass): AttemptOutcome {
    if (error.type === 'retry') {
      return {outcome: 'attempt-failed'};
    }
    this.logger.info('Deletingan operation that could not be sent', {outcome: error.type});
    return {outcome: 'attempt-deleted'};
  }

  private deleteForUnknownConversation(): AttemptOutcome {
    this.logger.info('Deletingan operation of an unknown conversation', {outcome: 'conversation-unknown'});
    return {outcome: 'attempt-deleted'};
  }

  private isDegraded(conversation: Conversation): boolean {
    return conversation.verification_state() === ConversationVerificationState.DEGRADED;
  }

  /** The operation of a message may still be in storage, so the message must stay or it would load and send later. */
  private isOutboxUnavailable({outcome}: {outcome: string}): boolean {
    return outcome === 'outbox-not-started' || outcome === 'storage-full' || outcome === 'storage-failed';
  }

  /** Also logs what the outbox answered, without content */
  private isAccepted(enqueueResult: EnqueueOutcome<unknown>): boolean {
    return match(enqueueResult)
      .with({outcome: P.union('operation-queued', 'operation-versioned')}, ({outcome}) => {
        this.logger.info('The outbox took an operation', {outcome});
        return true;
      })
      .with({outcome: P.union('operation-succeeded', 'operation-deleted')}, ({outcome}) => {
        // The operation ended while the call waited for its running attempt.
        this.logger.info('The outbox had finished the operation already', {outcome});
        return false;
      })
      .with(
        {
          outcome: P.union(
            'transition-refused',
            'correlation-key-empty',
            'lane-key-empty',
            'payload-invalid',
            'key-taken-by-other-kind',
            'outbox-full',
            'outbox-not-started',
            'storage-full',
            'storage-failed',
          ),
        },
        ({outcome}) => {
          this.logger.warn('The outbox refused an operation', {outcome});
          return false;
        },
      )
      .exhaustive();
  }

  private toStoredMentions(mentions: MentionEntity[]): StoredMention[] {
    return mentions.map(({startIndex, length, userId, userQualifiedId}) => {
      return {startIndex, length, userId, userQualifiedId};
    });
  }

  private async resolveOutgoingQuote(
    conversation: Conversation,
    quote: OutboxTextPayload['quote'],
  ): Promise<OutgoingQuote | undefined> {
    if (quote === undefined) {
      return undefined;
    }
    // The hash includes the time of the quoted message, so it is made when sending. A quote of a message that
    // is gone keeps its ids and has no hash: the receiver shows it as not found.
    const quotedEvent = await this.eventService.loadEvent(conversation.id, quote.messageId);
    const hash = quotedEvent === undefined ? new Uint8Array().buffer : await hashEvent(quotedEvent);
    return new QuoteEntity({hash, messageId: quote.messageId, userId: quote.userId}) as OutgoingQuote;
  }

  private toMentionEntities(mentions: StoredMention[]): MentionEntity[] {
    return mentions.map(({startIndex, length, userId, userQualifiedId}) => {
      return new MentionEntity(startIndex, length, userId, userQualifiedId.domain);
    });
  }

  /** `quote` is the one the sender already has, with its hash; without it the hash is made from the quoted message */
  private async buildOutboxText(
    conversation: Conversation,
    payload: OutboxTextPayload,
    quote?: OutgoingQuote,
  ): Promise<GenericMessage> {
    const text = this.decorateTextMessage({text: payload.text}, conversation, {
      mentions: this.toMentionEntities(payload.mentions),
      quote: quote ?? (await this.resolveOutgoingQuote(conversation, payload.quote)),
    });
    const message = isNonEmptyArray(payload.attachments)
      ? MessageBuilder.buildMultipartMessage(payload.attachments, text, payload.messageId)
      : MessageBuilder.buildTextMessage(text, payload.messageId);
    return this.wrapInEphemeralWhenTimed(message, conversation);
  }

  private buildOutboxEdit(conversation: Conversation, payload: OutboxEditPayload): GenericMessage {
    const text = this.decorateTextMessage(
      {originalMessageId: payload.originalMessageId, text: payload.text},
      conversation,
      {
        mentions: this.toMentionEntities(payload.mentions),
      },
    );
    return isNonEmptyArray(payload.attachments)
      ? MessageBuilder.buildEditedMultipartMessage(
          payload.attachments,
          text,
          payload.originalMessageId,
          payload.messageId,
        )
      : MessageBuilder.buildEditedTextMessage(text, payload.messageId);
  }

  private buildOutboxPing(conversation: Conversation, messageId: string): GenericMessage {
    const ping = MessageBuilder.buildPingMessage({
      expectsReadConfirmation: this.expectReadReceipt(conversation),
      hotKnock: false,
      legalHoldStatus: conversation.legalHoldStatus(),
    });
    ping.messageId = messageId;
    return this.wrapInEphemeralWhenTimed(ping, conversation);
  }

  private async uploadOutboxAsset(
    conversation: Conversation,
    payload: AssetMessagePayload,
    file: Blob,
    signal: AbortSignal,
  ): Promise<void> {
    const cancelUpload = (): void => {
      this.assetRepository.cancelUpload(payload.messageId);
    };
    const keepPageOpen = (event: Event): void => {
      event.preventDefault();
    };
    signal.addEventListener('abort', cancelUpload, {once: true});
    // Only an upload in progress is worth a warning on leaving: a queued message is kept and sent later
    window.addEventListener('beforeunload', keepPageOpen);
    try {
      const asset = await this.uploadToAssetService(
        conversation,
        file,
        payload.messageId,
        {name: (file as File).name, type: file.type},
        {failFast: true},
      );
      const record = await this.eventService.loadEvent(conversation.id, payload.messageId);
      if (record !== undefined) {
        await this.eventService.updateEvent(record.primary_key, {
          data: {
            ...(record as {data?: object}).data,
            domain: asset.domain,
            key: asset.key,
            otr_key: asset.keyBytes,
            sha256: asset.sha256,
            token: asset.token,
          },
        } as Partial<EventRecord>);
      }
    } finally {
      window.removeEventListener('beforeunload', keepPageOpen);
      signal.removeEventListener('abort', cancelUpload);
    }
  }

  private async buildOutboxAsset(
    conversation: Conversation,
    payload: AssetMessagePayload,
  ): Promise<GenericMessage | undefined> {
    const record = await this.eventService.loadEvent(conversation.id, payload.messageId);
    const upload = record === undefined ? undefined : readRecordedUpload(record);
    const file = record?.fileData;
    if (upload === undefined || file === undefined) {
      return undefined;
    }
    const meta = await this.buildFileMetaData(file, payload.asImage);
    // Describing an uploaded asset needs no cipher text
    const asset: EncryptedAssetUploaded = {
      cipherText: new Uint8Array(),
      domain: upload.domain ?? '',
      key: upload.key,
      keyBytes: upload.otr_key,
      sha256: upload.sha256,
      token: upload.token,
    };
    const message = await this.buildUploadedAssetMessage(
      conversation,
      file,
      payload.messageId,
      payload.asImage,
      meta,
      asset,
    );
    return this.wrapInEphemeralWhenTimed(message, conversation);
  }

  /**
   * The message is sent with the timer the conversation has at send time, which may differ from the one it was
   * shown with. The shown copy takes the sent one, so that it expires when the receivers' copies do.
   * A copy that was sent already keeps its timer.
   */
  private async matchLocalTimerToSent(conversation: Conversation, message: GenericMessage): Promise<void> {
    try {
      const shown = await this.getMessageInConversationById(conversation, message.messageId);
      if (shown.status() > StatusType.SENDING) {
        return;
      }
      const sentTimer = message.ephemeral?.expireAfterMillis;
      const timer = isNullOrUndefined(sentTimer) || Number(sentTimer) === 0 ? false : Number(sentTimer);
      if (shown.ephemeral_expires() === timer) {
        return;
      }
      shown.ephemeral_expires(timer);
      await this.eventService.updateEvent(shown.primary_key, {ephemeral_expires: timer === false ? undefined : timer});
    } catch (error: unknown) {
      if ((error as any).type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
  }

  /** A message that is gone is left alone. */
  private async markMessage(
    conversation: Conversation,
    messageId: string,
    status: StatusType,
    failedReason?: FailedReason,
  ): Promise<void> {
    try {
      const messageEntity = await this.getMessageInConversationById(conversation, messageId);
      messageEntity.status(status);
      messageEntity.failed_reason(failedReason);
      await this.eventService.updateEvent(messageEntity.primary_key, {status, failed_reason: failedReason});
    } catch (error: unknown) {
      if ((error as any).type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
  }

  private createRecipients(users: User[]): QualifiedUserClients {
    return users.reduce((userClients, user) => {
      userClients[user.domain] ||= {};
      userClients[user.domain][user.id] = user.devices().map(client => {
        return client.id;
      });
      return userClients;
    }, {} as QualifiedUserClients);
  }

  private async generateRecipients(
    conversation: Conversation,
    recipients?: QualifiedId[] | QualifiedUserClients,
    skipSelf?: boolean,
  ): Promise<QualifiedUserClients> {
    if (isQualifiedUserClients(recipients)) {
      // If we get a userId>client pairs, we just return those, no need to create recipients
      return recipients;
    }
    const filteredUsers = conversation
      .allUserEntities()
      // filter possible undefined values
      .flatMap(user => {
        return !isNullOrUndefined(user) ? [user] : [];
      })
      // if users are given by the caller, we filter to only keep those users
      .filter(user => {
        return (
          isUndefined(recipients) ||
          recipients.some(userId => {
            return matchQualifiedIds(user, userId);
          })
        );
      })
      // we filter the self user if skipSelf is true
      .filter(user => {
        return skipSelf !== true || !user.isMe;
      });

    // Check if we have users without assigned clients and assign them from local database if possible
    if (
      filteredUsers.some(user => {
        return user?.devices().length === 0;
      })
    ) {
      await this.userRepository.assignAllClients();
    }

    return this.createRecipients(filteredUsers);
  }

  /**
   * Get Message with given ID from the database.
   *
   * @param conversation Conversation message belongs to
   * @param messageId ID of message
   * @returns Resolves with the message
   */
  async getMessageInConversationById(conversation: Conversation, messageId: string): Promise<StoredContentMessage> {
    const messageEntity = conversation.getMessage(messageId);
    const message =
      messageEntity ??
      (await this.eventService.loadEvent(conversation.id, messageId).then(event => {
        if (isUndefined(event)) {
          return undefined;
        }

        return this.event_mapper.mapJsonEvent(event, conversation);
      }));

    if (isUndefined(message)) {
      throw new ConversationError(
        ConversationError.TYPE.MESSAGE_NOT_FOUND,
        ConversationError.MESSAGE.MESSAGE_NOT_FOUND,
      );
    }

    return message as StoredContentMessage;
  }

  /**
   * Get Message with given ID or a replacementId from the database.
   *
   * @param conversation Conversation message belongs to
   * @param messageId ID of message
   * @returns Resolves with the message
   */
  async getMessageInConversationByReplacementId(
    conversation: Conversation,
    messageId: string,
  ): Promise<StoredContentMessage> {
    const message = conversation.getMessageByReplacementId(messageId);
    if (isUndefined(message)) {
      throw new ConversationError(
        ConversationError.TYPE.MESSAGE_NOT_FOUND,
        ConversationError.MESSAGE.MESSAGE_NOT_FOUND,
      );
    }

    return message as StoredContentMessage;
  }

  async ensureMessageSender(message: Message): Promise<StoredContentMessage> {
    if (isNonEmptyString(message.from) && !isNonEmptyString(message.user().id)) {
      const user = await this.userRepository.getUserById({domain: message.user().domain, id: message.from});
      message.user(user);
      return message as StoredContentMessage;
    }
    return message as StoredContentMessage;
  }

  public async updateAllClients(conversation: Conversation, blockSystemMessage: boolean): Promise<void> {
    if (blockSystemMessage) {
      conversation.blockLegalHoldMessage = true;
    }
    const missing = await this.conversationService.fetchAllParticipantsClients(conversation.qualifiedId);

    const deleted = findDeletedClients(missing, await this.generateRecipients(conversation));
    await this.onClientMismatch?.({deleted, missing} as MessageSendingStatus, conversation, true);
    if (blockSystemMessage) {
      conversation.blockLegalHoldMessage = false;
    }
  }

  /**
   * Sends a message to backend that the conversation has been fully read.
   * The message will allow all the self clients to synchronize conversation read state.
   *
   * @param conversation Conversation to be marked as read
   */
  public async markAsRead(conversation: Conversation): Promise<void> {
    const timestamp = conversation.last_read_timestamp();
    if (this.outbox !== undefined) {
      await this.enqueueReceipt({type: 'last-read', conversationId: conversation.qualifiedId, timestamp});
    } else {
      const payload = MessageBuilder.buildLastReadMessage(conversation.qualifiedId, timestamp);
      await this.sendToSelfConversations(payload);
    }
    /*
     * FIXME notification removal can be improved.
     * We can add the conversation ID in the payload of the event and only check unread messages for this particular conversation
     */
    amplify.publish(WebAppEvents.NOTIFICATION.REMOVE_READ);
    this.logger.info(`Marked conversation '${conversation.id}' as read on '${new Date(timestamp).toISOString()}'`);
  }

  /**
   * Sends a message to backend to sync countly id across other clients
   *
   * @param countlyId Countly new ID
   */
  public async sendCountlySync(countlyId: string): Promise<void> {
    if (this.outbox !== undefined) {
      await this.enqueueReceipt({type: 'data-transfer', countlyId});
    } else {
      const payload = MessageBuilder.buildDataTransferMessage(countlyId);
      await this.sendToSelfConversations(payload);
    }
    this.logger.info(`Sent countly sync message with ID ${countlyId}`);
  }

  /**
   * Sends a call message only to self MLS conversation (eg. REJECT message that warn the user's other clients that the call has been picked up)
   * @param payload
   * @returns
   */
  public sendCallingMessageToSelfMLSConversation(
    payload: string,
    targetConversation: QualifiedId,
  ): Promise<SendAndInjectResult> {
    return this.sendCallingMessage(this.conversationState.getSelfMLSConversation(), {
      content: payload,
      qualifiedConversationId: targetConversation,
    });
  }
  /**
   * Send call message in specified conversation.
   *
   * @param eventInfoEntity Event info to be send
   * @param conversationId id of the conversation to send call message to
   * @returns Resolves when the confirmation was sent
   */
  public sendCallingMessage(
    conversation: Conversation,
    payload: string | {content: string; qualifiedConversationId: QualifiedId},
    options: MessageSendingOptions = {},
  ): Promise<SendAndInjectResult> {
    const objectPayload = typeof payload === 'string' ? {content: payload} : payload;
    const message = MessageBuilder.buildCallMessage(objectPayload);

    return this.sendAndInjectMessage(message, conversation, {
      ...options,
      consentType: CONSENT_TYPE.OUTGOING_CALL,
      // We want to show the degradation warning only when message should be sent to all participants
      silentDegradationWarning: !isUndefined(options?.recipients),

      skipInjection: true,

      targetMode: !isUndefined(options?.recipients) ? MessageTargetMode.USERS_CLIENTS : MessageTargetMode.USERS,
    });
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
  private trackContributed(conversationEntity: Conversation, genericMessage: GenericMessage): void {
    const isEphemeral = genericMessage.content === GenericMessageType.EPHEMERAL;

    if (isEphemeral) {
      genericMessage = genericMessage.ephemeral as any;
    }

    const messageContentType = genericMessage.content;

    let actionType;
    let isRichText: boolean | undefined = undefined;

    switch (messageContentType) {
      case 'asset': {
        const protoAsset = genericMessage.asset;
        if (!isNullOrUndefined(protoAsset?.original)) {
          if (!isNullOrUndefined(protoAsset.original.image)) {
            actionType = 'photo';
          } else if (!isNullOrUndefined(protoAsset.original.audio)) {
            actionType = 'audio';
          } else if (!isNullOrUndefined(protoAsset.original.video)) {
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
        const linkPreviews = protoText?.[PROTO_MESSAGE_TYPE.LINK_PREVIEWS];
        if (!isNonEmptyArray(linkPreviews)) {
          actionType = 'text';
        }
        if (!isNullOrUndefined(protoText)) {
          isRichText = isMarkdownText(protoText.content);
        }
        break;
      }

      default:
        break;
    }
    if (actionType !== undefined) {
      const selfUserTeamId = this.userState.self()?.teamId;
      const participants = conversationEntity.participating_user_ets();
      const guests = participants.filter(user => {
        return user.isGuest();
      }).length;
      const guestsWireless = participants.filter(user => {
        return user.isTemporaryGuest();
      }).length;
      // guests that are from a different team
      const guestsPro = participants.filter(user => {
        return user.teamId !== undefined && user.teamId !== '' && user.teamId !== selfUserTeamId;
      }).length;
      const services = participants.filter(user => {
        return user.isService;
      }).length;

      let segmentations: ContributedSegmentations = {
        [Segmentation.CONVERSATION.GUESTS]: roundLogarithmic(guests, conversationStatisticsRoundingFactor),
        [Segmentation.CONVERSATION.GUESTS_PRO]: roundLogarithmic(guestsPro, conversationStatisticsRoundingFactor),
        [Segmentation.CONVERSATION.GUESTS_WIRELESS]: roundLogarithmic(
          guestsWireless,
          conversationStatisticsRoundingFactor,
        ),
        [Segmentation.CONVERSATION.SIZE]: roundLogarithmic(participants.length, conversationStatisticsRoundingFactor),
        [Segmentation.CONVERSATION.TYPE]: trackingHelpers.getConversationType(conversationEntity),
        [Segmentation.CONVERSATION.SERVICES]: roundLogarithmic(services, conversationStatisticsRoundingFactor),
        [Segmentation.MESSAGE.ACTION]: actionType,
        ...(isRichText !== undefined && {
          [Segmentation.IS_RICH_TEXT]: isRichText,
        }),
      };

      const isTeamConversation = isNonEmptyString(conversationEntity.teamId);
      if (isTeamConversation) {
        segmentations = {
          ...segmentations,
          ...trackingHelpers.getGuestAttributes(conversationEntity),
        };
      }

      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CONTRIBUTED, segmentations);
    }
  }
}
