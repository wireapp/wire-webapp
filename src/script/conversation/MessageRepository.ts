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

import {amplify} from 'amplify';
import {
  Asset,
  Confirmation,
  External,
  GenericMessage,
  LastRead,
  LegalHoldStatus,
  DataTransfer,
} from '@wireapp/protocol-messaging';
import {
  ReactionType,
  MessageSendingCallbacks,
  MessageTargetMode,
  PayloadBundleState,
  PayloadBundleType,
} from '@wireapp/core/src/main/conversation';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {
  ClientMismatch,
  NewOTRMessage,
  QualifiedUserClients,
  MessageSendingStatus,
  UserClients,
} from '@wireapp/api-client/src/conversation';
import {QualifiedId, RequestCancellationError, User as APIClientUser} from '@wireapp/api-client/src/user';
import {WebAppEvents} from '@wireapp/webapp-events';
import {
  AudioMetaData,
  VideoMetaData,
  ImageMetaData,
  FileMetaDataContent,
  LinkPreviewUploadedContent,
  LinkPreviewContent,
} from '@wireapp/core/src/main/conversation/content';
import {TextContentBuilder} from '@wireapp/core/src/main/conversation/message/TextContentBuilder';
import {MessageBuilder} from '@wireapp/core/src/main/conversation/message/MessageBuilder';
import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {Declension, joinNames, replaceLink, t} from 'Util/LocalizerUtil';
import {getDifference} from 'Util/ArrayUtil';
import {arrayToBase64, createRandomUuid, loadUrlBlob} from 'Util/util';
import {areMentionsDifferent, isTextDifferent} from 'Util/messageComparator';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {roundLogarithmic} from 'Util/NumberUtil';

import {encryptAesAsset} from '../assets/AssetCrypto';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {EventTypeHandling} from '../event/EventTypeHandling';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {EventRepository} from '../event/EventRepository';
import {EventBuilder} from '../conversation/EventBuilder';
import {Conversation} from '../entity/Conversation';
import {Message} from '../entity/message/Message';
import * as trackingHelpers from '../tracking/Helpers';
import {EventInfoEntity} from './EventInfoEntity';
import {EventMapper} from './EventMapper';
import {ConversationVerificationState} from './ConversationVerificationState';
import {ClientMismatchHandler} from './ClientMismatchHandler';
import {buildMetadata, isVideo, isImage, isAudio, ImageMetadata} from '../assets/AssetMetaDataBuilder';
import {AssetTransferState} from '../assets/AssetTransferState';
import {ModalOptions, ModalsViewModel} from '../view_model/ModalsViewModel';
import {AudioType} from '../audio/AudioType';
import {EventName} from '../tracking/EventName';
import {StatusType} from '../message/StatusType';
import {BackendClientError} from '../error/BackendClientError';
import {showLegalHoldWarningModal} from '../legal-hold/LegalHoldWarning';
import {ConversationError} from '../error/ConversationError';
import {Segmentation} from '../tracking/Segmentation';
import {ConversationService} from './ConversationService';
import {AssetRepository} from '../assets/AssetRepository';
import {ClientRepository} from '../client/ClientRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {ConversationRepository} from './ConversationRepository';
import {getLinkPreviewFromString} from './linkPreviews';
import {UserRepository} from '../user/UserRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {MessageSender} from '../message/MessageSender';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {ContentMessage} from '../entity/message/ContentMessage';
import {EventService} from '../event/EventService';
import {QuoteEntity} from '../message/QuoteEntity';
import {CompositeMessage} from '../entity/message/CompositeMessage';
import {MentionEntity} from '../message/MentionEntity';
import {FileAsset} from '../entity/message/FileAsset';
import type {EventRecord} from '../storage';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';
import {ConversationState} from './ConversationState';
import {ClientState} from '../client/ClientState';
import {UserType} from '../tracking/attribute';
import {isBackendError, isQualifiedUserClientEntityMap} from 'Util/TypePredicateUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {BackendErrorLabel} from '@wireapp/api-client/src/http';
import {Config} from '../Config';
import {Core} from '../service/CoreSingleton';
import {OtrMessage} from '@wireapp/core/src/main/conversation/message/OtrMessage';
import {User} from '../entity/User';
import {isQualifiedUserClients, isUserClients} from '@wireapp/core/src/main/util';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';

export enum CONSENT_TYPE {
  INCOMING_CALL = 'incoming_call',
  MESSAGE = 'message',
  OUTGOING_CALL = 'outgoing_call',
}

type ConversationEvent = {conversation: string; id?: string};
export type ContributedSegmentations = Record<string, number | string | boolean | UserType>;

type ClientMismatchHandlerFn = (
  mismatch: Partial<ClientMismatch> | Partial<MessageSendingStatus>,
  conversationId?: QualifiedId,
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

/** A message that has already been stored in DB and has a primary key */
type StoredMessage = Message & {primary_key: string};
type StoredContentMessage = ContentMessage & {primary_key: string};

export class MessageRepository {
  private readonly logger: Logger;
  private readonly eventService: EventService;
  private readonly event_mapper: EventMapper;
  public readonly clientMismatchHandler: ClientMismatchHandler;
  private isBlockingNotificationHandling: boolean;
  private onClientMismatch?: ClientMismatchHandlerFn;

  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly conversationRepositoryProvider: () => ConversationRepository,
    private readonly cryptography_repository: CryptographyRepository,
    private readonly eventRepository: EventRepository,
    private readonly messageSender: MessageSender,
    private readonly propertyRepository: PropertiesRepository,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userRepository: UserRepository,
    private readonly conversation_service: ConversationService,
    private readonly assetRepository: AssetRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly clientState = container.resolve(ClientState),
    private readonly core = container.resolve(Core),
  ) {
    this.logger = getLogger('MessageRepository');

    this.eventService = eventRepository.eventService;
    this.event_mapper = new EventMapper();

    this.clientMismatchHandler = new ClientMismatchHandler(
      this.conversationRepositoryProvider,
      this.cryptography_repository,
      this.userRepository,
    );

    this.isBlockingNotificationHandling = true;

    this.initSubscriptions();
  }

  private get conversationService() {
    return this.core.service!.conversation;
  }

  private initSubscriptions(): void {
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setNotificationHandlingState);
  }

  /**
   * Will set a handler when sending message reports a client mismatch
   * @param onClientMismatch - The function to be called when there is a mismatch. If this function resolves to 'false' then the sending will be cancelled
   * @return void
   */
  public setClientMismatchHandler(onClientMismatch: ClientMismatchHandlerFn) {
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
    allClients: UserClients | QualifiedUserClients,
    consentType?: CONSENT_TYPE,
  ) {
    const missing = await this.findMissingClients(conversation, allClients);
    return this.onClientMismatch?.({missing} as ClientMismatch, conversation.qualifiedId, false, consentType);
  }

  /**
   * Will generate a UserClients that contains only the users and clients that we do no know of locally
   * @param conversation
   * @param remoteClients
   */
  private async findMissingClients(conversation: Conversation, remoteClients: UserClients | QualifiedUserClients) {
    const localClients = await this.generateRecipients(conversation);

    const filterKnownClients = (clients: UserClients, knownClients: UserClients) => {
      return Object.entries(clients).reduce<UserClients>((missing, [userId, clients]) => {
        const missingClients = getDifference(knownClients[userId] || [], clients);
        return missingClients.length ? {...missing, [userId]: missingClients} : missing;
      }, {});
    };

    const filterKnownQualifiedClients = (clients: QualifiedUserClients, knownClients: QualifiedUserClients) => {
      return Object.entries(clients).reduce<QualifiedUserClients>((missing, [domain, userClients]) => {
        const missingUserClients = filterKnownClients(userClients, knownClients[domain]);
        return Object.keys(missingUserClients).length ? {...missing, [domain]: missingUserClients} : missing;
      }, {});
    };

    return isQualifiedUserClients(remoteClients)
      ? filterKnownQualifiedClients(remoteClients, localClients as QualifiedUserClients)
      : filterKnownClients(remoteClients, localClients as UserClients);
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not allow sending messages when handling the notification stream
   * @param handlingState State of the notifications stream handling
   */
  private readonly setNotificationHandlingState = (handlingState: NOTIFICATION_HANDLING_STATE) => {
    const updatedHandlingState = handlingState !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.isBlockingNotificationHandling !== updatedHandlingState) {
      this.isBlockingNotificationHandling = updatedHandlingState;
      this.logger.info(
        `Block message sending: ${this.isBlockingNotificationHandling} (${this.messageSender.queuedMessages} items in queue)`,
      );
      this.messageSender.pauseQueue(this.isBlockingNotificationHandling);
    }
  };

  /**
   * Send ping in specified conversation.
   * @param conversationEntity Conversation to send knock in
   * @returns Resolves after sending the knock
   */
  public async sendPing(conversation: Conversation) {
    const ping = MessageBuilder.createPing({
      ...this.createCommonMessagePayload(conversation),
      ping: {
        expectsReadConfirmation: this.expectReadReceipt(conversation),
        hotKnock: false,
        legalHoldStatus: conversation.legalHoldStatus(),
      },
    });

    return this.sendAndInjectGenericCoreMessage(ping, conversation, {playPingAudio: true});
  }

  /**
   * @see https://wearezeta.atlassian.net/wiki/spaces/CORE/pages/300351887/Using+federation+environments
   * @see https://github.com/wireapp/wire-docs/tree/master/src/understand/federation
   * @see https://docs.wire.com/understand/federation/index.html
   */
  private async sendText({conversation, message, mentions = [], linkPreview, quote, messageId}: TextMessagePayload) {
    const baseMessage = MessageBuilder.createText({
      ...this.createCommonMessagePayload(conversation),
      messageId,
      text: message,
    });
    const textMessage = this.decorateTextMessage(conversation, baseMessage, {linkPreview, mentions, quote});

    return this.sendAndInjectGenericCoreMessage(textMessage, conversation);
  }

  private async sendEdit({
    conversation,
    message,
    messageId,
    originalMessageId,
    mentions = [],
    quote,
  }: EditMessagePayload) {
    const baseMessage = MessageBuilder.createEditedText({
      ...this.createCommonMessagePayload(conversation),
      messageId,
      newMessageText: message,
      originalMessageId: originalMessageId,
    });
    const editMessage = this.decorateTextMessage(conversation, baseMessage, {mentions, quote});

    return this.sendAndInjectGenericCoreMessage(editMessage, conversation, {syncTimestamp: false});
  }

  private decorateTextMessage(
    conversation: Conversation,
    textMessage: TextContentBuilder,
    {
      mentions = [],
      quote,
      linkPreview,
    }: {
      linkPreview?: LinkPreviewUploadedContent;
      mentions: MentionEntity[];
      quote?: OutgoingQuote;
    },
  ) {
    const quoteData = quote && {quotedMessageId: quote.messageId, quotedMessageSha256: new Uint8Array(quote.hash)};

    return textMessage
      .withMentions(
        mentions.map(mention => ({
          length: mention.length,
          qualifiedUserId: mention.userQualifiedId,
          start: mention.startIndex,
          userId: mention.userId,
        })),
      )
      .withQuote(quoteData)
      .withLinkPreviews(linkPreview ? [linkPreview] : [])
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
   * @param quoteEntity Quoted message
   * @returns Resolves after sending the message
   */
  public async sendTextWithLinkPreview(
    conversation: Conversation,
    textMessage: string,
    mentions: MentionEntity[],
    quoteEntity?: OutgoingQuote,
  ): Promise<void> {
    const textPayload = {
      conversation,
      mentions,
      message: textMessage,
      messageId: createRandomUuid(), // We set the id explicitely in order to be able to override the message if we generate a link preview
      quote: quoteEntity,
    };
    await this.sendText(textPayload);
    await this.handleLinkPreview(textPayload);
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

    const messagePayload = {
      conversation,
      mentions,
      message: textMessage,
      messageId: createRandomUuid(), // We set the id explicitely in order to be able to override the message if we generate a link preview
      originalMessageId: originalMessage.id,
    };
    await this.sendEdit(messagePayload);
    await this.handleLinkPreview(messagePayload);
  }

  private async handleLinkPreview(textPayload: TextMessagePayload & {messageId: string}) {
    // check if the user actually wants to send link previews
    if (!this.propertyRepository.getPreference(PROPERTIES_TYPE.PREVIEWS.SEND)) {
      return;
    }

    const linkPreview = await getLinkPreviewFromString(textPayload.message);
    if (linkPreview) {
      // If we detect a link preview, then we go on and send a new message (that will override the initial message) containing the link preview
      await this.sendText({
        ...textPayload,
        linkPreview: linkPreview.image
          ? await this.core.service!.linkPreview.uploadLinkPreviewImage(linkPreview as LinkPreviewContent)
          : linkPreview,
      });
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
  public async sendGif(
    conversationEntity: Conversation,
    url: string,
    tag: string | number | Record<string, string>,
    quoteEntity: OutgoingQuote,
  ): Promise<void> {
    if (!tag) {
      tag = t('extensionsGiphyRandom');
    }

    const blob = await loadUrlBlob(url);
    const textMessage = t('extensionsGiphyMessage', tag, {}, true);
    this.sendText({conversation: conversationEntity, message: textMessage, quote: quoteEntity});
    return this.uploadImages(conversationEntity, [blob]);
  }

  /**
   * Post images to a conversation.
   *
   * @param conversationEntity Conversation to post the images
   */
  public uploadImages(conversationEntity: Conversation, images: Blob[]) {
    this.uploadFiles(conversationEntity, images, true);
  }

  /**
   * Post files to a conversation.
   *
   * @param conversationEntity Conversation to post the files
   * @param files files
   * @param asImage whether or not the file should be treated as an image
   */
  public uploadFiles(conversationEntity: Conversation, files: Blob[], asImage?: boolean) {
    if (this.canUploadAssetsToConversation(conversationEntity)) {
      Array.from(files).forEach(file => this.uploadFile(conversationEntity, file, asImage));
    }
  }

  /**
   * Can user upload assets to conversation.
   * @param conversationEntity Conversation to check
   * @returns Can assets be uploaded
   */
  private canUploadAssetsToConversation(conversationEntity: Conversation) {
    return !!conversationEntity && !conversationEntity.isRequest() && !conversationEntity.removed_from_conversation();
  }

  /**
   * Post file to a conversation using v3
   *
   * @param conversation Conversation to post the file
   * @param file File object
   * @param asImage whether or not the file should be treated as an image
   * @returns Resolves when file was uploaded
   */
  private async uploadFile(
    conversation: Conversation,
    file: Blob,
    asImage: boolean = false,
  ): Promise<EventRecord | void> {
    const uploadStarted = Date.now();
    const injectedEvent = await this.sendAssetMetadata(conversation, file, asImage);
    if (injectedEvent.state === PayloadBundleState.CANCELLED) {
      throw new ConversationError(
        ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION,
        ConversationError.MESSAGE.DEGRADED_CONVERSATION_CANCELLATION,
      );
    }
    try {
      await this.sendAssetRemotedata(conversation, file, injectedEvent.id, asImage);
      const uploadDuration = (Date.now() - uploadStarted) / TIME_IN_MILLIS.SECOND;
      this.logger.info(`Finished to upload asset for conversation'${conversation.id} in ${uploadDuration}`);
    } catch (error) {
      if (this.isUserCancellationError(error)) {
        throw error;
      } else if (error instanceof RequestCancellationError) {
        return;
      }
      this.logger.error(
        `Failed to upload asset for conversation '${conversation.id}': ${(error as Error).message}`,
        error,
      );
      const messageEntity = await this.getMessageInConversationById(conversation, injectedEvent.id);
      this.sendAssetUploadFailed(conversation, messageEntity.id);
      return this.updateMessageAsUploadFailed(messageEntity);
    }
  }

  /**
   * Update asset in UI and DB as failed
   *
   * @param message_et Message to update
   * @param reason Failure reason
   * @returns Resolves when the message was updated
   */
  private async updateMessageAsUploadFailed(message_et: StoredMessage, reason = AssetTransferState.UPLOAD_FAILED) {
    if (!message_et.isContent()) {
      throw new Error(`Tried to update wrong message type as upload failed '${(message_et as any).super_type}'`);
    }

    const asset_et = message_et.getFirstAsset() as FileAsset;
    if (asset_et) {
      if (!asset_et.isDownloadable()) {
        throw new Error(`Tried to update message with wrong asset type as upload failed '${asset_et.type}'`);
      }

      asset_et.status(reason);
      asset_et.upload_failed_reason(Asset.NotUploaded.FAILED);
    }

    return this.eventService.updateEventAsUploadFailed(message_et.primary_key, reason);
  }

  private async sendAssetRemotedata(conversation: Conversation, file: Blob, messageId: string, asImage: boolean) {
    const retention = this.assetRepository.getAssetRetention(this.userState.self(), conversation);
    const options = {
      expectsReadConfirmation: this.expectReadReceipt(conversation),
      legalHoldStatus: conversation.legalHoldStatus(),
      public: true,
      retention,
    };
    const asset = await this.assetRepository.uploadFile(file, messageId, options, () =>
      this.cancelAssetUpload(conversation, messageId),
    );

    const commonPayload = {
      asset: asset,
      conversationId: conversation.id,
      from: this.userState.self().id,
      messageId,
    };
    const metadata = asImage ? ((await buildMetadata(file)) as ImageMetadata) : undefined;
    const assetMessage = metadata
      ? MessageBuilder.createImage({
          ...commonPayload,
          image: metadata,
        })
      : MessageBuilder.createFileData({
          ...commonPayload,
          file: {data: Buffer.from(await file.arrayBuffer())},
          originalMessageId: messageId,
        });
    return this.sendAndInjectGenericCoreMessage(assetMessage, conversation);
  }

  /**
   * Send asset metadata message to specified conversation.
   */
  private async sendAssetMetadata(conversation: Conversation, file: File | Blob, allowImageDetection?: boolean) {
    let metadata;
    try {
      metadata = await buildMetadata(file);
    } catch (error) {
      const logMessage = `Couldn't render asset preview from metadata. Asset might be corrupt: ${
        (error as Error).message
      }`;
      this.logger.warn(logMessage, error);
    }
    const meta = {length: file.size, name: (file as File).name, type: file.type} as Partial<FileMetaDataContent>;

    if (isAudio(file)) {
      meta.audio = metadata as AudioMetaData;
    } else if (isVideo(file)) {
      meta.video = metadata as VideoMetaData;
    } else if (allowImageDetection && isImage(file)) {
      meta.image = metadata as ImageMetaData;
    }
    const message = MessageBuilder.createFileMetadata({
      ...this.createCommonMessagePayload(conversation),
      metaData: meta as FileMetaDataContent,
    });
    return this.sendAndInjectGenericCoreMessage(message, conversation);
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
  ): Promise<ConversationEvent> {
    const payload = MessageBuilder.createFileAbort({
      conversationId: conversation.id,
      from: this.userState.self().id,
      originalMessageId: messageId,
      reason,
    });

    return this.sendAndInjectGenericCoreMessage(payload, conversation);
  }

  private isUserCancellationError(error: any): boolean {
    const errorTypes: string[] = [
      ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION,
      ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
    ];
    return errorTypes.includes(error.type);
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
      return showLegalHoldWarningModal(conversation, conversationDegraded)
        .then(() => true)
        .catch(() => false);
    }
    if (!conversationDegraded) {
      return true;
    }

    const users = conversation.getUsersWithUnverifiedClients();
    const userNames = joinNames(users, Declension.NOMINATIVE);
    const titleSubstitutions = capitalizeFirstChar(userNames);

    const [actionString, messageString] = {
      [CONSENT_TYPE.INCOMING_CALL]: [
        t('modalConversationNewDeviceIncomingCallAction'),
        t('modalConversationNewDeviceIncomingCallMessage'),
      ],
      [CONSENT_TYPE.OUTGOING_CALL]: [
        t('modalConversationNewDeviceOutgoingCallAction'),
        t('modalConversationNewDeviceOutgoingCallMessage'),
      ],
      [CONSENT_TYPE.MESSAGE]: [t('modalConversationNewDeviceAction'), t('modalConversationNewDeviceMessage')],
    }[consentType];

    const baseTitle =
      users.length > 1
        ? t('modalConversationNewDeviceHeadlineMany', titleSubstitutions)
        : t('modalConversationNewDeviceHeadlineOne', titleSubstitutions);
    const titleString = users[0].isMe ? t('modalConversationNewDeviceHeadlineYou', titleSubstitutions) : baseTitle;

    return new Promise(resolve => {
      const options: ModalOptions = {
        close: () => resolve(false),
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

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, options, `degraded-${conversation.id}`);
    });
  }

  /**
   * Will send a generic message using @wireapp/code
   *
   * @param payload - the OTR message payload to send
   * @param conversation - the conversation the message should be sent to
   * @param options
   * @param options.syncTimestamp should the message timestamp be synchronized with backend response timestamp
   * @param options.playPingAudio should the 'ping' audio be played when message is being sent
   * @param options.nativePush use nativePush for sending to mobile devices
   * @param options.recipients can be used to target specific users of the conversation. Will send to all the conversation participants if not defined
   * @param options.skipSelf do not forward this message to self user (will not encrypt and send to all self clients)
   * @param options.skipInjection do not inject message in the event repository (will skip all the event handling pipeline)
   */
  private async sendAndInjectGenericCoreMessage(
    payload: OtrMessage,
    conversation: Conversation,
    {
      syncTimestamp = true,
      playPingAudio = false,
      nativePush = true,
      targetMode,
      recipients,
      skipSelf,
      skipInjection,
      silentDegradationWarning,
    }: {
      nativePush?: boolean;
      playPingAudio?: boolean;
      recipients?: QualifiedId[] | QualifiedUserClients | UserClients;
      silentDegradationWarning?: boolean;
      skipInjection?: boolean;
      skipSelf?: boolean;
      syncTimestamp?: boolean;
      targetMode?: MessageTargetMode;
    } = {
      playPingAudio: false,
      syncTimestamp: true,
    },
  ) {
    const userIds = await this.generateRecipients(conversation, recipients, skipSelf);

    const injectOptimisticEvent: MessageSendingCallbacks['onStart'] = async genericMessage => {
      if (playPingAudio) {
        amplify.publish(WebAppEvents.AUDIO.PLAY, AudioType.OUTGOING_PING);
      }
      if (!skipInjection) {
        const senderId = this.clientState.currentClient().id;
        const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
        const optimisticEvent = EventBuilder.buildMessageAdd(conversation, currentTimestamp, senderId);
        this.trackContributed(conversation, genericMessage);
        const mappedEvent = await this.cryptography_repository.cryptographyMapper.mapGenericMessage(
          genericMessage,
          optimisticEvent as EventRecord,
        );
        await this.eventRepository.injectEvent(mappedEvent);
      }
      const isCallingMessage = payload.type === PayloadBundleType.CALL;
      const consentType = isCallingMessage ? CONSENT_TYPE.OUTGOING_CALL : CONSENT_TYPE.MESSAGE;

      return silentDegradationWarning ? true : this.requestUserSendingPermission(conversation, false, consentType);
    };

    const updateOptimisticEvent: MessageSendingCallbacks['onSuccess'] = (genericMessage, sentTime) => {
      this.updateMessageAsSent(conversation, genericMessage.messageId, syncTimestamp ? sentTime : undefined);
    };

    /**
     * Once a message has been sent, check the state of the members of this conversation.
     * If, in this conversation, there are still users that have 0 devices, that could mean they have been silently removed from the team
     * We need to ask backend if those users have been deleted and, if so, trigger the teamMemberLeave event
     */
    const checkMissingTeamMembers = async (): Promise<void> => {
      const membersWithoutClients = conversation
        .participating_user_ets()
        .filter(user => user.devices().length === 0)
        .map(user => user.qualifiedId);
      if (!membersWithoutClients.length) {
        return;
      }
      const usersWithoutClients = await this.userRepository.getUserListFromBackend(
        conversation.isFederated() ? membersWithoutClients : membersWithoutClients.map(({id}) => id),
      );
      return this.triggerTeamMemberLeaveChecks(usersWithoutClients);
    };

    const conversationService = this.conversationService;
    // Configure ephemeral messages
    conversationService.messageTimer.setConversationLevelTimer(conversation.id, conversation.messageTimer());

    return this.conversationService.send({
      callbacks: {
        onClientMismatch: mismatch =>
          this.onClientMismatch?.(mismatch, conversation.qualifiedId, silentDegradationWarning),
        onStart: injectOptimisticEvent,
        onSuccess: async (genericMessage, sentTime) => {
          if (this.teamState.isTeam()) {
            // If we are in a team, we can be in the particular case where we are in a Tier1 team (team with a lot of users)
            // In that case, backend will not warn us when a user is removed. We need to check this ourself manually
            await checkMissingTeamMembers();
          }
          updateOptimisticEvent(genericMessage, sentTime);
        },
      },
      conversationDomain: conversation.isFederated() ? conversation.domain : undefined,
      nativePush,
      payloadBundle: payload,
      targetMode,
      userIds,
    });
  }

  /**
   * Toggle like status of message.
   *
   * @param conversationEntity Conversation entity
   * @param message_et Message to react to
   */
  public toggleLike(conversationEntity: Conversation, message_et: ContentMessage): void {
    if (!conversationEntity.removed_from_conversation()) {
      const reaction = message_et.is_liked() ? ReactionType.NONE : ReactionType.LIKE;
      message_et.is_liked(!message_et.is_liked());

      window.setTimeout(() => this.sendReaction(conversationEntity, message_et, reaction), 100);
    }
  }

  async resetSession(userId: QualifiedId, client_id: string, conversation: Conversation): Promise<void> {
    this.logger.info(`Resetting session with client '${client_id}' of user '${userId.id}'.`);

    try {
      // We delete the stored session so that it can be recreated later on
      const session_id = await this.cryptography_repository.deleteSession(userId, client_id);
      if (session_id) {
        this.logger.info(`Deleted session with client '${client_id}' of user '${userId.id}'.`);
      } else {
        this.logger.warn('No local session found to delete.');
      }
      return await this.sendSessionReset(userId, client_id, conversation);
    } catch (error) {
      const logMessage = `Failed to reset session for client '${client_id}' of user '${userId.id}': ${error.message}`;
      this.logger.warn(logMessage, error);
      throw error;
    }
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
   * @param conversation The conversation to send the message in
   * @returns Resolves after sending the session reset
   */
  private async sendSessionReset(userId: QualifiedId, clientId: string, conversation: Conversation) {
    const sessionReset = MessageBuilder.createSessionReset(this.createCommonMessagePayload(conversation));

    const userClient = {[userId.id]: [clientId]};
    await this.conversationService.send({
      conversationDomain: conversation.isFederated() ? conversation.domain : undefined,
      payloadBundle: sessionReset,
      targetMode: MessageTargetMode.USERS_CLIENTS,
      userIds: conversation.isFederated() ? {[userId.domain]: userClient} : userClient, // we target this message to the specific client of the user (no need for mismatch handling here)
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
    const confirmationMessage = MessageBuilder.createConfirmation({
      ...this.createCommonMessagePayload(conversationEntity),
      firstMessageId: messageEntity.id,
      moreMessageIds,
      type,
    });

    const sendingOptions = {
      nativePush: false,
      recipients: [messageEntity.qualifiedFrom],
      // When not in a verified conversation (verified or degraded) we want the regular sending flow (send and reencrypt if there are mismatches)
      // When in a verified (or degraded) conversation we want to prevent encrypting for unverified devices, we will then silent the degradation modal and force sending to only the devices that are verified
      silentDegradationWarning: conversationEntity.verification_state() !== ConversationVerificationState.UNVERIFIED,

      targetMode: MessageTargetMode.USERS,
    };
    const res = await this.sendAndInjectGenericCoreMessage(confirmationMessage, conversationEntity, sendingOptions);
    if (res.state === PayloadBundleState.CANCELLED) {
      this.sendAndInjectGenericCoreMessage(confirmationMessage, conversationEntity, {
        ...sendingOptions,
        // If the message was auto cancelled because of a mismatch, we will force sending the message only to the clients we know of (ignoring unverified clients)
        targetMode: MessageTargetMode.USERS_CLIENTS,
      });
    }
  }

  /**
   * Send reaction to a content message in specified conversation.
   * @param conversation Conversation to send reaction in
   * @param messageEntity Message to react to
   * @param reactionType Reaction
   * @returns Resolves after sending the reaction
   */
  private async sendReaction(conversation: Conversation, messageEntity: Message, reactionType: ReactionType) {
    const reaction = MessageBuilder.createReaction({
      ...this.createCommonMessagePayload(conversation),
      reaction: {
        originalMessageId: messageEntity.id,
        type: reactionType,
      },
    });

    return this.sendAndInjectGenericCoreMessage(reaction, conversation);
  }

  private expectReadReceipt(conversationEntity: Conversation): boolean {
    if (conversationEntity.is1to1()) {
      return !!this.propertyRepository.receiptMode();
    }

    if (conversationEntity.team_id && conversationEntity.isGroup()) {
      return !!conversationEntity.receiptMode();
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
    targetedUsers?: QualifiedId[],
  ): Promise<void> {
    const conversationId = conversation.id;
    const messageId = message.id;

    try {
      if (!message.user().isMe && !message.ephemeral_expires()) {
        throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
      }
      const userIds = targetedUsers || conversation.allUserEntities.map(user => user.qualifiedId);
      await this.conversationService.deleteMessageEveryone(
        conversation.id,
        message.id,
        conversation.isFederated() ? userIds : userIds.map(({id}) => id),
        true,
        conversation.isFederated() ? conversation.domain : undefined,
      );

      await this.deleteMessageById(conversation, messageId);
    } catch (error) {
      const isConversationNotFound = error.code === HTTP_STATUS.NOT_FOUND;
      if (isConversationNotFound) {
        this.logger.warn(`Conversation '${conversationId}' not found. Deleting message for self user only.`);
        this.deleteMessage(conversation, message);
        return;
      }
      const logMessage = `Failed to delete message '${messageId}' in conversation '${conversationId}' for everyone`;
      this.logger.info(logMessage, error);
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
    try {
      await this.conversationService.deleteMessageLocal(
        conversation.id,
        message.id,
        true,
        conversation.isFederated() ? conversation.domain : undefined,
      );
      await this.deleteMessageById(conversation, message.id);
    } catch (error) {
      this.logger.info(
        `Failed to send delete message with id '${message.id}' for conversation '${conversation.id}'`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update cleared of conversation using timestamp.
   */
  public updateClearedTimestamp(conversation: Conversation): void {
    const timestamp = conversation.getLastKnownTimestamp(this.serverTimeHandler.toServerTimestamp());

    if (timestamp && conversation.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.CLEARED)) {
      this.conversationService.clearConversation(conversation.id, timestamp);
    }
  }

  sendButtonAction(conversation: Conversation, message: CompositeMessage, buttonId: string): void {
    if (conversation.removed_from_conversation()) {
      return;
    }
    const senderId = message.qualifiedFrom;
    const senderInConversation = conversation
      .participating_user_ets()
      .some(user => matchQualifiedIds(senderId, user.qualifiedId));

    if (!senderInConversation) {
      message.setButtonError(buttonId, t('buttonActionError'));
      message.waitingButtonId(undefined);
      return;
    }

    const buttonMessage = MessageBuilder.createButtonActionMessage({
      ...this.createCommonMessagePayload(conversation),
      content: {
        buttonId,
        referenceMessageId: message.id,
      },
    });
    try {
      this.sendAndInjectGenericCoreMessage(buttonMessage, conversation, {
        nativePush: false,
        recipients: [message.qualifiedFrom],
        skipInjection: true,
        targetMode: MessageTargetMode.USERS,
      });
    } catch (error) {
      message.waitingButtonId(undefined);
      return message.setButtonError(buttonId, t('buttonActionError'));
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
      conversationEntity.isShowingLastReceivedMessage() && conversationEntity.getLastMessage()?.id === messageId;

    const deleteCount = await this.eventService.deleteEvent(conversationEntity.id, messageId);

    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageId, conversationEntity.id);

    if (isLastDeleted && conversationEntity.getLastMessage()?.timestamp()) {
      conversationEntity.updateTimestamps(conversationEntity.getLastMessage(), true);
    }

    return deleteCount;
  }

  private sendGenericMessageToConversation(eventInfoEntity: EventInfoEntity): Promise<ClientMismatch> {
    return this.messageSender.queueMessage(async () => {
      const recipients = await this.createRecipients(eventInfoEntity.conversationId);
      eventInfoEntity.updateOptions({recipients});
      return this.sendGenericMessage(eventInfoEntity, true);
    });
  }

  /**
   * Cancel asset upload.
   * @param messageId Id of the message which upload has been cancelled
   */
  private readonly cancelAssetUpload = (conversation: Conversation, messageId: string) => {
    this.sendAssetUploadFailed(conversation, messageId, Asset.NotUploaded.CANCELLED);
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
  ): Promise<Pick<Partial<EventRecord>, 'status' | 'time'> | void> {
    try {
      const messageEntity = await this.getMessageInConversationById(conversationEntity, eventId);
      const updatedStatus = messageEntity.readReceipts().length ? StatusType.SEEN : StatusType.SENT;
      messageEntity.status(updatedStatus);
      const changes: Pick<Partial<EventRecord>, 'status' | 'time'> = {
        status: updatedStatus,
      };
      if (isoDate) {
        const timestamp = new Date(isoDate).getTime();
        if (!isNaN(timestamp)) {
          changes.time = isoDate;
          messageEntity.timestamp(timestamp);
          conversationEntity.updateTimestampServer(timestamp, true);
          conversationEntity.updateTimestamps(messageEntity);
        }
      }
      this.conversationRepositoryProvider().checkMessageTimer(messageEntity);
      if ((EventTypeHandling.STORE as string[]).includes(messageEntity.type) || messageEntity.hasAssetImage()) {
        return await this.eventService.updateEvent(messageEntity.primary_key, changes);
      }
    } catch (error) {
      if ((error as any).type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
  }

  private createQualifiedRecipients(users: User[]): QualifiedUserClients {
    return users.reduce((userClients, user) => {
      userClients[user.domain] ||= {};
      userClients[user.domain][user.id] = user.devices().map(client => client.id);
      return userClients;
    }, {} as QualifiedUserClients);
  }

  private async generateRecipients(
    conversation: Conversation,
    recipients?: QualifiedId[] | QualifiedUserClients | UserClients,
    skipSelf?: boolean,
  ): Promise<QualifiedUserClients | UserClients> {
    if (isQualifiedUserClients(recipients) || isUserClients(recipients)) {
      // If we get a userId>client pairs, we just return those, no need to create recipients
      return recipients;
    }
    const users = conversation.allUserEntities
      // if users are given by the caller, we filter to only keep those users
      .filter(user => !recipients || recipients.some(userId => matchQualifiedIds(user, userId)))
      // we filter the self user if skipSelf is true
      .filter(user => !skipSelf || !user.isMe);

    return conversation.isFederated()
      ? this.createQualifiedRecipients(users)
      : this.createRecipients(
          conversation.qualifiedId,
          false,
          users.map(user => user.id),
        );
  }

  async createRecipients(
    conversationId: QualifiedId,
    skip_own_clients = false,
    user_ids?: string[],
  ): Promise<UserClients> {
    const userEntities = await this.conversationRepositoryProvider().getAllUsersInConversation(conversationId);
    const recipients: UserClients = {};
    for (const userEntity of userEntities) {
      if (!(skip_own_clients && userEntity.isMe)) {
        if (user_ids && !user_ids.includes(userEntity.id)) {
          continue;
        }

        recipients[userEntity.id] = userEntity.devices().map(client_et => client_et.id);
      }
    }
    return recipients;
  }

  private async sendGenericMessage(eventInfoEntity: EventInfoEntity, checkLegalHold: boolean): Promise<ClientMismatch> {
    try {
      await this.grantOutgoingMessage(eventInfoEntity, undefined, checkLegalHold);
      const sendAsExternal = await this.shouldSendAsExternal(eventInfoEntity);
      if (sendAsExternal) {
        return await this.sendExternalGenericMessage(eventInfoEntity);
      }

      const {genericMessage, options} = eventInfoEntity;
      const payload = await this.cryptography_repository.encryptGenericMessage(
        options.recipients as UserClients,
        genericMessage,
      );
      payload.native_push = options.nativePush;
      return await this.sendEncryptedMessage(eventInfoEntity, payload);
    } catch (error) {
      const isRequestTooLarge = isBackendError(error) && error.code === HTTP_STATUS.REQUEST_TOO_LONG;

      if (isRequestTooLarge) {
        return this.sendExternalGenericMessage(eventInfoEntity);
      }

      throw error;
    }
  }

  /**
   * Get Message with given ID from the database.
   *
   * @param conversation Conversation message belongs to
   * @param messageId ID of message
   * @param skipConversationMessages Don't use message entity from conversation
   * @param ensureUser Make sure message entity has a valid user
   * @returns Resolves with the message
   */
  async getMessageInConversationById(
    conversation: Conversation,
    messageId: string,
    skipConversationMessages = false,
    ensureUser = false,
  ): Promise<StoredContentMessage> {
    const messageEntity = !skipConversationMessages && conversation.getMessage(messageId);
    const message =
      messageEntity ||
      (await this.eventService.loadEvent(conversation.id, messageId).then(event => {
        return event && this.event_mapper.mapJsonEvent(event, conversation);
      }));

    if (!message) {
      throw new ConversationError(
        ConversationError.TYPE.MESSAGE_NOT_FOUND,
        ConversationError.MESSAGE.MESSAGE_NOT_FOUND,
      );
    }

    if (ensureUser && message.from && !message.user().id) {
      const user = await this.userRepository.getUserById({domain: message.user().domain, id: message.from});
      message.user(user);
      return message as StoredContentMessage;
    }
    return message as StoredContentMessage;
  }

  static getOtherUsersWithoutClients(eventInfoEntity: EventInfoEntity, selfUserId: string): string[] {
    const allRecipientsBesideSelf = Object.keys(eventInfoEntity.options.recipients).filter(id => id !== selfUserId);
    const userIdsWithoutClients = [];
    for (const userId of allRecipientsBesideSelf) {
      const clientIdsOfUser = eventInfoEntity.options.recipients[userId];
      const noRemainingClients = clientIdsOfUser.length === 0;
      if (noRemainingClients) {
        userIdsWithoutClients.push(userId);
      }
    }
    return userIdsWithoutClients;
  }

  async triggerTeamMemberLeaveChecks(users: APIClientUser[]): Promise<void> {
    for (const user of users) {
      // Since this is a bare API client user we use `.deleted`
      const isDeleted = user.deleted === true;
      if (isDeleted) {
        await this.conversationRepositoryProvider().teamMemberLeave(this.teamState.team().id, {
          domain: this.userState.self().domain,
          id: user.id,
        });
      }
    }
  }

  private async shouldShowLegalHoldWarning(eventInfoEntity: EventInfoEntity): Promise<boolean> {
    const messageType = eventInfoEntity.getType();
    const isMessageEdit = messageType === GENERIC_MESSAGE_TYPE.EDITED;
    const conversationEntity = this.conversationState.findConversation(eventInfoEntity.conversationId);
    const localLegalHoldStatus = conversationEntity.legalHoldStatus();
    await this.updateAllClients(conversationEntity, !isMessageEdit);
    const updatedLocalLegalHoldStatus = conversationEntity.legalHoldStatus();

    const {genericMessage} = eventInfoEntity;
    (genericMessage as any)[messageType][PROTO_MESSAGE_TYPE.LEGAL_HOLD_STATUS] = updatedLocalLegalHoldStatus;

    const haveNewClientsChangeLegalHoldStatus = localLegalHoldStatus !== updatedLocalLegalHoldStatus;

    if (!isMessageEdit && haveNewClientsChangeLegalHoldStatus) {
      const {conversationId, timestamp: numericTimestamp} = eventInfoEntity;
      await this.conversationRepositoryProvider().injectLegalHoldMessage({
        beforeTimestamp: true,
        conversationId: conversationId,
        legalHoldStatus: updatedLocalLegalHoldStatus,
        timestamp: numericTimestamp,
        userId: this.userState.self().qualifiedId,
      });
    }

    return haveNewClientsChangeLegalHoldStatus && updatedLocalLegalHoldStatus === LegalHoldStatus.ENABLED;
  }

  private async grantOutgoingMessage(
    eventInfoEntity: EventInfoEntity,
    userIds: QualifiedId[],
    checkLegalHold: boolean,
  ): Promise<void> {
    const messageType = eventInfoEntity.getType();
    const allowedMessageTypes = ['cleared', 'clientAction', 'confirmation', 'deleted', 'lastRead'];

    if (allowedMessageTypes.includes(messageType)) {
      return;
    }

    if (this.teamState.isTeam()) {
      const userIdsWithoutClients = MessageRepository.getOtherUsersWithoutClients(
        eventInfoEntity,
        this.userState.self().id,
      );
      const usersWithoutClients = await this.userRepository.getUserListFromBackend(userIdsWithoutClients);
      this.triggerTeamMemberLeaveChecks(usersWithoutClients);
    }

    let shouldShowLegalHoldWarning: boolean = false;

    if (checkLegalHold) {
      shouldShowLegalHoldWarning = await this.shouldShowLegalHoldWarning(eventInfoEntity);
    }

    return this.grantMessage(eventInfoEntity, userIds, shouldShowLegalHoldWarning);
  }

  /**
   * @deprecated Will not work with federation. Please use `sendFederatedMessage`.
   */
  async grantMessage(
    eventInfoEntity: EventInfoEntity,
    userIds: QualifiedId[],
    shouldShowLegalHoldWarning: boolean,
  ): Promise<void> {
    const conversationEntity = await this.conversationRepositoryProvider().getConversationById(
      eventInfoEntity.conversationId,
    );
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
      await showLegalHoldWarningModal(conversationEntity, conversationDegraded);
      return;
    } else if (shouldShowLegalHoldWarning) {
      conversationEntity.needsLegalHoldApproval = !this.userState.self().isOnLegalHold() && isLegalHoldMessageType;
    }
    if (!conversationDegraded) {
      return;
    }
    return new Promise((resolve, reject) => {
      let sendAnyway = false;

      userIds = conversationEntity.getUsersWithUnverifiedClients().map(userEntity => userEntity.qualifiedId);

      return this.userRepository
        .getUsersById(userIds)
        .then(userEntities => {
          let titleString;

          const hasMultipleUsers = userEntities.length > 1;
          const userNames = joinNames(userEntities, Declension.NOMINATIVE);
          const titleSubstitutions = capitalizeFirstChar(userNames);

          if (hasMultipleUsers) {
            titleString = t('modalConversationNewDeviceHeadlineMany', titleSubstitutions);
          } else {
            const [firstUser] = userEntities;

            if (firstUser) {
              titleString = firstUser.isMe
                ? t('modalConversationNewDeviceHeadlineYou', titleSubstitutions)
                : t('modalConversationNewDeviceHeadlineOne', titleSubstitutions);
            } else {
              const conversationId = eventInfoEntity.conversationId;
              const type = eventInfoEntity.getType();

              const log = `Missing user IDs to grant '${type}' message in '${conversationId}'`;
              this.logger.error(log);

              const error = new Error('Failed to grant outgoing message');

              return reject(error);
            }
          }

          const actionString = t('modalConversationNewDeviceAction');
          const messageString = t('modalConversationNewDeviceMessage');

          const options: ModalOptions = {
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
                resolve();
              },
              text: actionString,
            },
            text: {
              message: messageString,
              title: titleString,
            },
          };

          amplify.publish(
            WebAppEvents.WARNING.MODAL,
            ModalsViewModel.TYPE.CONFIRM,
            options,
            `degraded-${eventInfoEntity.conversationId}`,
          );
        })
        .catch(reject);
    });
  }

  public async updateAllClients(conversationEntity: Conversation, blockSystemMessage: boolean): Promise<void> {
    if (blockSystemMessage) {
      conversationEntity.blockLegalHoldMessage = true;
    }
    const sender = this.clientState.currentClient().id;
    try {
      await this.conversation_service.postEncryptedMessage(conversationEntity, {recipients: {}, sender});
    } catch (axiosError) {
      const error = axiosError.response?.data || axiosError;
      if (error.missing) {
        const remoteUserClients = error.missing as UserClients;
        const localUserClients = await this.createRecipients(conversationEntity);
        const selfId = this.userState.self().id;

        const deletedUserClients = Object.entries(localUserClients).reduce<UserClients>(
          (deleted, [userId, clients]) => {
            if (userId === selfId) {
              return deleted;
            }
            const deletedClients = getDifference(remoteUserClients[userId], clients);
            if (deletedClients.length) {
              deleted[userId] = deletedClients;
            }
            return deleted;
          },
          {},
        );

        await Promise.all(
          Object.entries(deletedUserClients).map(([userId, clients]) =>
            Promise.all(
              clients.map(clientId => this.userRepository.removeClientFromUser({domain: '', id: userId}, clientId)),
            ),
          ),
        );

        const missingUserIds = Object.entries(remoteUserClients).reduce<string[]>((missing, [userId, clients]) => {
          if (userId !== selfId) {
            const missingClients = getDifference(localUserClients[userId] || ([] as string[]), clients);
            if (missingClients.length) {
              missing.push(userId);
            }
          }
          return missing;
        }, []);

        const missingUserEntities = missingUserIds.map(missingUserId =>
          this.userRepository.findUserById(missingUserId),
        );

        const usersMap = await this.userRepository.getClientsByUsers(missingUserEntities, false);
        if (isQualifiedUserClientEntityMap(usersMap)) {
          await Promise.all(
            Object.entries(usersMap).map(([domain, userClientsMap]) =>
              Object.entries(userClientsMap).map(([userId, clients]) =>
                Promise.all(
                  clients.map(client => this.userRepository.addClientToUser({domain, id: userId}, client, false)),
                ),
              ),
            ),
          );
        } else {
          await Promise.all(
            Object.entries(usersMap).map(([userId, clients]) =>
              Promise.all(
                clients.map(client => this.userRepository.addClientToUser({domain: '', id: userId}, client, false)),
              ),
            ),
          );
        }
      }
    }
    if (blockSystemMessage) {
      conversationEntity.blockLegalHoldMessage = false;
    }
  }

  /**
   * Sends a message to backend that the conversation has been fully read.
   * The message will allow all the self clients to synchronize conversation read state.
   *
   * @param conversationEntity Conversation to be marked as read
   */
  public async markAsRead(conversationEntity: Conversation) {
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

    const eventInfoEntity = new EventInfoEntity(
      genericMessage,
      this.conversationState.self_conversation()?.qualifiedId,
    );
    try {
      await this.sendGenericMessageToConversation(eventInfoEntity);
      amplify.publish(WebAppEvents.NOTIFICATION.REMOVE_READ);
      this.logger.info(`Marked conversation '${conversationId}' as read on '${new Date(timestamp).toISOString()}'`);
    } catch (error) {
      const errorMessage = 'Failed to update last read timestamp';
      this.logger.error(`${errorMessage}: ${error.message}`, error);
    }
  }

  /**
   * Sends a message to backend to sync countly id across other clients
   *
   * @param countlyId Countly new ID
   */
  public async sendCountlySync(countlyId: string) {
    const selfConversation = this.conversationState.self_conversation();
    if (selfConversation?.isFederated()) {
      // TODO(federation)
      this.logger.warn('syncly not implemented for federated env');
      return;
    }
    const protoDataTransfer = new DataTransfer({
      trackingIdentifier: {
        identifier: countlyId,
      },
    });
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.DATA_TRANSFER]: protoDataTransfer,
      messageId: createRandomUuid(),
    });

    const eventInfoEntity = new EventInfoEntity(genericMessage, selfConversation.qualifiedId);
    try {
      await this.sendGenericMessageToConversation(eventInfoEntity);
      this.logger.info(`Sent countly sync message with ID ${countlyId}`);
    } catch (error) {
      const errorMessage = `Failed to send countly sync message with ID ${countlyId}`;
      this.logger.error(`${errorMessage}: ${error.message}`, error);
    }
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
    payload: string,
    options: {nativePush?: boolean; recipients?: UserClients | QualifiedUserClients},
  ) {
    const message = MessageBuilder.createCall({
      ...this.createCommonMessagePayload(conversation),
      content: payload,
    });

    return this.sendAndInjectGenericCoreMessage(message, conversation, {
      ...options,
      // We want to show the degradation warning only when message should be sent to all participants
      silentDegradationWarning: !!options?.recipients,

      skipInjection: true,

      targetMode: options?.recipients ? MessageTargetMode.USERS_CLIENTS : MessageTargetMode.USERS,
    });
  }

  /**
   * Estimate whether message should be send as type external.
   *
   * @param eventInfoEntity Info about event
   * @returns Is payload likely to be too big so that we switch to type external?
   */
  private async shouldSendAsExternal(eventInfoEntity: EventInfoEntity) {
    const {conversationId, genericMessage} = eventInfoEntity;
    const conversationEntity = await this.conversationRepositoryProvider().getConversationById(conversationId);
    const messageInBytes = new Uint8Array(GenericMessage.encode(genericMessage).finish()).length;
    const estimatedPayloadInBytes = conversationEntity.getNumberOfClients() * messageInBytes;
    return estimatedPayloadInBytes > ConversationRepository.CONFIG.EXTERNAL_MESSAGE_THRESHOLD;
  }

  /**
   * Send encrypted external message
   *
   * @param eventInfoEntity Event to be send
   * @returns Resolves after sending the external message
   */
  private async sendExternalGenericMessage(eventInfoEntity: EventInfoEntity): Promise<ClientMismatch> {
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
        options.recipients as UserClients,
        genericMessageExternal,
      );
      payload.data = arrayToBase64(encryptedAsset.cipherText);
      payload.native_push = options.nativePush;
      return await this.sendEncryptedMessage(eventInfoEntity, payload);
    } catch (error) {
      this.logger.info('Failed sending external message', error);
      throw error;
    }
  }

  /**
   * Sends an OTR message to a conversation.
   *
   * @note Options for the precondition check on missing clients are:
   * - `false` - all clients
   * - `Array<string>` - only clients of listed users
   * - `true` - force sending
   *
   * @param eventInfoEntity Info about message to be sent
   * @param payload Payload
   * @deprecated Please use `sendFederatedMessage`
   * @returns Promise that resolves after sending the encrypted message
   */
  private async sendEncryptedMessage(
    eventInfoEntity: EventInfoEntity,
    payload: NewOTRMessage<string>,
  ): Promise<ClientMismatch | undefined> {
    const {conversationId, genericMessage, options} = eventInfoEntity;
    const messageId = genericMessage.messageId;
    let messageType = eventInfoEntity.getType();

    if (messageType === GENERIC_MESSAGE_TYPE.CONFIRMATION) {
      messageType += ` (type: "${eventInfoEntity.genericMessage.confirmation?.type}")`;
    }

    const numberOfUsers = Object.keys(payload.recipients).length;
    const numberOfClients = Object.values(payload.recipients)
      .map(clientId => Object.keys(clientId).length)
      .reduce((totalClients, clients) => totalClients + clients, 0);

    const logMessage = `Sending '${messageType}' message (${messageId}) to conversation '${JSON.stringify(
      conversationId,
    )}'`;
    this.logger.info(logMessage, payload);

    if (numberOfUsers > numberOfClients) {
      this.logger.warn(
        `Sending '${messageType}' message (${messageId}) to just '${numberOfClients}' clients but there are '${numberOfUsers}' users in conversation '${JSON.stringify(
          conversationId,
        )}'`,
      );
    }

    try {
      const response = await this.conversation_service.postEncryptedMessage(
        conversationId,
        payload,
        options.precondition,
      );
      await this.clientMismatchHandler.onClientMismatch(eventInfoEntity, response, payload);
      return response;
    } catch (axiosError) {
      const errorData = axiosError.response?.data as ClientMismatch & {label: BackendErrorLabel};

      const hasNoLegalholdConsent = errorData?.label === BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT;
      const ignoredMessageTypes = [GENERIC_MESSAGE_TYPE.CONFIRMATION];
      if (hasNoLegalholdConsent && !ignoredMessageTypes.includes(messageType as GENERIC_MESSAGE_TYPE)) {
        const replaceLinkLegalHold = replaceLink(
          Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK,
          '',
          'read-more-legal-hold',
        );
        await new Promise<void>(resolve => {
          amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
            primaryAction: {
              action: () => {
                resolve();
              },
            },
            text: {
              htmlMessage: t('legalHoldMessageSendingMissingConsentMessage', {}, replaceLinkLegalHold),
              title: t('legalHoldMessageSendingMissingConsentTitle'),
            },
          });
        });
        throw new ConversationError(
          ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
          ConversationError.MESSAGE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
        );
      }

      const isUnknownClient = errorData?.label === BackendClientError.LABEL.UNKNOWN_CLIENT;
      if (isUnknownClient) {
        this.clientRepository.removeLocalClient();
        return undefined;
      }

      if (!errorData?.missing) {
        throw errorData;
      }

      const payloadWithMissingClients = await this.clientMismatchHandler.onClientMismatch(
        eventInfoEntity,
        errorData,
        payload,
      );

      const missedUserIds = Object.keys(errorData.missing).map(userId => ({
        domain: '',
        id: userId,
      }));
      await this.grantOutgoingMessage(eventInfoEntity, missedUserIds, true);
      this.logger.info(
        `Updated '${messageType}' message (${messageId}) for conversation '${JSON.stringify(
          conversationId,
        )}'. Will ignore missing receivers.`,
        payloadWithMissingClients,
      );
      if (payloadWithMissingClients) {
        return this.conversation_service.postEncryptedMessage(conversationId, payloadWithMissingClients, true);
      }
      return this.conversation_service.postEncryptedMessage(conversationId, payload, true);
    }
  }

  private createCommonMessagePayload(conversation: Conversation) {
    return {
      conversationId: conversation.id,
      from: this.clientState.currentClient().id,
    };
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
  private trackContributed(conversationEntity: Conversation, genericMessage: GenericMessage) {
    const isEphemeral = genericMessage.content === GENERIC_MESSAGE_TYPE.EPHEMERAL;

    if (isEphemeral) {
      genericMessage = genericMessage.ephemeral as any;
    }

    const messageContentType = genericMessage.content;
    let actionType;
    switch (messageContentType) {
      case 'asset': {
        const protoAsset = genericMessage.asset;
        if (protoAsset?.original) {
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
        const length = protoText?.[PROTO_MESSAGE_TYPE.LINK_PREVIEWS]?.length;
        if (!length) {
          actionType = 'text';
        }
        break;
      }

      default:
        break;
    }
    if (actionType) {
      const selfUserTeamId = this.userState.self().teamId;
      const participants = conversationEntity.participating_user_ets();
      const guests = participants.filter(user => user.isGuest()).length;
      const guestsWireless = participants.filter(user => user.isTemporaryGuest()).length;
      // guests that are from a different team
      const guestsPro = participants.filter(user => !!user.teamId && user.teamId !== selfUserTeamId).length;
      const services = participants.filter(user => user.isService).length;

      let segmentations: ContributedSegmentations = {
        [Segmentation.CONVERSATION.GUESTS]: roundLogarithmic(guests, 6),
        [Segmentation.CONVERSATION.GUESTS_PRO]: roundLogarithmic(guestsPro, 6),
        [Segmentation.CONVERSATION.GUESTS_WIRELESS]: roundLogarithmic(guestsWireless, 6),
        [Segmentation.CONVERSATION.SIZE]: roundLogarithmic(participants.length, 6),
        [Segmentation.CONVERSATION.TYPE]: trackingHelpers.getConversationType(conversationEntity),
        [Segmentation.CONVERSATION.SERVICES]: roundLogarithmic(services, 6),
        [Segmentation.MESSAGE.ACTION]: actionType,
      };
      const isTeamConversation = !!conversationEntity.team_id;
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
