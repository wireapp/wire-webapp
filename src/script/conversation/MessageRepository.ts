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

import {ConversationProtocol, MessageSendingStatus, QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, RequestCancellationError, User as APIClientUser} from '@wireapp/api-client/lib/user';
import {
  MessageSendingState,
  MessageTargetMode,
  ReactionType,
  GenericMessageType,
  SendResult,
} from '@wireapp/core/lib/conversation';
import {
  AudioMetaData,
  EditedTextContent,
  FileMetaDataContent,
  ImageMetaData,
  LinkPreviewContent,
  LinkPreviewUploadedContent,
  TextContent,
  VideoMetaData,
} from '@wireapp/core/lib/conversation/content';
import * as MessageBuilder from '@wireapp/core/lib/conversation/message/MessageBuilder';
import {OtrMessage} from '@wireapp/core/lib/conversation/message/OtrMessage';
import {TextContentBuilder} from '@wireapp/core/lib/conversation/message/TextContentBuilder';
import {isQualifiedUserClients} from '@wireapp/core/lib/util';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {container} from 'tsyringe';
import {partition} from 'underscore';

import {Asset, Availability, Confirmation, GenericMessage} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Declension, joinNames, t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {areMentionsDifferent, isTextDifferent} from 'Util/messageComparator';
import {roundLogarithmic} from 'Util/NumberUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createRandomUuid, loadUrlBlob, supportsMLS} from 'Util/util';

import {findDeletedClients} from './ClientMismatchUtil';
import {ConversationRepository} from './ConversationRepository';
import {ConversationState} from './ConversationState';
import {ConversationVerificationState} from './ConversationVerificationState';
import {EventMapper} from './EventMapper';
import {getLinkPreviewFromString} from './linkPreviews';

import {buildMetadata, ImageMetadata, isAudio, isImage, isVideo} from '../assets/AssetMetaDataBuilder';
import {AssetRepository} from '../assets/AssetRepository';
import {AssetTransferState} from '../assets/AssetTransferState';
import {AudioType} from '../audio/AudioType';
import {ClientState} from '../client/ClientState';
import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {EventBuilder} from '../conversation/EventBuilder';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {PROTO_MESSAGE_TYPE} from '../cryptography/ProtoMessageType';
import {Conversation} from '../entity/Conversation';
import {CompositeMessage} from '../entity/message/CompositeMessage';
import {ContentMessage} from '../entity/message/ContentMessage';
import {FileAsset} from '../entity/message/FileAsset';
import {Message} from '../entity/message/Message';
import {User} from '../entity/User';
import {ConversationError} from '../error/ConversationError';
import {EventRepository} from '../event/EventRepository';
import {EventService} from '../event/EventService';
import {EventTypeHandling} from '../event/EventTypeHandling';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {showLegalHoldWarningModal} from '../legal-hold/LegalHoldWarning';
import {MentionEntity} from '../message/MentionEntity';
import {QuoteEntity} from '../message/QuoteEntity';
import {StatusType} from '../message/StatusType';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';
import {Core} from '../service/CoreSingleton';
import type {EventRecord} from '../storage';
import {TeamState} from '../team/TeamState';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {UserType} from '../tracking/attribute';
import {EventName} from '../tracking/EventName';
import * as trackingHelpers from '../tracking/Helpers';
import {Segmentation} from '../tracking/Segmentation';
import {protoFromType} from '../user/AvailabilityMapper';
import {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

export interface MessageSendingOptions {
  /** Send native push notification for message. Default is `true`. */
  nativePush?: boolean;
  recipients?: QualifiedId[] | QualifiedUserClients;
}

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

/** A message that has already been stored in DB and has a primary key */
type StoredMessage = Message & {primary_key: string};
type StoredContentMessage = ContentMessage & {primary_key: string};

export class MessageRepository {
  private readonly logger: Logger;
  private readonly eventService: EventService;
  private readonly event_mapper: EventMapper;
  private isBlockingNotificationHandling: boolean;
  private onClientMismatch?: ClientMismatchHandlerFn;

  constructor(
    private readonly conversationRepositoryProvider: () => ConversationRepository,
    private readonly cryptography_repository: CryptographyRepository,
    private readonly eventRepository: EventRepository,
    private readonly propertyRepository: PropertiesRepository,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userRepository: UserRepository,
    private readonly assetRepository: AssetRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly clientState = container.resolve(ClientState),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly core = container.resolve(Core),
  ) {
    this.logger = getLogger('MessageRepository');

    this.eventService = eventRepository.eventService;
    this.event_mapper = new EventMapper();

    this.isBlockingNotificationHandling = true;

    this.initSubscriptions();
  }

  private get conversationService() {
    return this.core.service!.conversation;
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
    allClients: QualifiedUserClients,
    consentType?: CONSENT_TYPE,
  ) {
    const mismatch = {missing: allClients} as MessageSendingStatus;
    return this.onClientMismatch?.(mismatch, conversation, false, consentType);
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
    }
  };

  /**
   * Send ping in specified conversation.
   * @param conversationEntity Conversation to send knock in
   * @returns Resolves after sending the knock
   */
  public async sendPing(conversation: Conversation) {
    const ping = MessageBuilder.buildPingMessage({
      expectsReadConfirmation: this.expectReadReceipt(conversation),
      hotKnock: false,
      legalHoldStatus: conversation.legalHoldStatus(),
    });

    amplify.publish(WebAppEvents.AUDIO.PLAY, AudioType.OUTGOING_PING);
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
  ) {
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

    return this.sendAndInjectMessage(textMessage, conversation, {...options, enableEphemeral: true});
  }

  private async sendEdit({
    conversation,
    message,
    messageId,
    originalMessageId,
    mentions = [],
    quote,
  }: EditMessagePayload) {
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
    const quoteData = quote && {quotedMessageId: quote.messageId, quotedMessageSha256: new Uint8Array(quote.hash)};
    if (quote) {
    }

    return new TextContentBuilder(baseMessage)
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
    messageId?: string,
  ): Promise<void> {
    const textPayload = {
      conversation,
      mentions,
      message: textMessage,
      quote: quoteEntity,
      // We set the id explicitely in order to be able to override the message if we generate a link preview
      // Similarly, we provide that same id when we retry to send a failed message in order to override the original
      messageId: messageId ?? createRandomUuid(),
    };
    const {state} = await this.sendText(textPayload);
    if (state !== MessageSendingState.CANCELED) {
      await this.handleLinkPreview(textPayload);
    }
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
    const {state} = await this.sendEdit(messagePayload);
    if (state !== MessageSendingState.CANCELED) {
      await this.handleLinkPreview(messagePayload);
    }
  }

  private async handleLinkPreview(textPayload: TextMessagePayload & {messageId: string}) {
    // check if the user actually wants to send link previews
    if (!this.propertyRepository.getPreference(PROPERTIES_TYPE.PREVIEWS.SEND)) {
      return;
    }

    const linkPreview = await getLinkPreviewFromString(textPayload.message);
    if (linkPreview) {
      // If we detect a link preview, then we go on and send a new message (that will override the initial message) containing the link preview
      await this.sendText(
        {
          ...textPayload,
          linkPreview: linkPreview.image
            ? await this.core.service!.linkPreview.uploadLinkPreviewImage(linkPreview as LinkPreviewContent)
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
   * @param quoteEntity Quote as part of the message
   * @returns Resolves when the gif was posted
   */
  public async sendGif(
    conversationEntity: Conversation,
    url: string,
    tag: string | number | Record<string, string>,
    quoteEntity?: OutgoingQuote,
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
    const {id, state} = await this.sendAssetMetadata(conversation, file, asImage);
    if (state === MessageSendingState.CANCELED) {
      throw new ConversationError(
        ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION,
        ConversationError.MESSAGE.DEGRADED_CONVERSATION_CANCELLATION,
      );
    }
    try {
      await this.sendAssetRemotedata(conversation, file, id, asImage);
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
      const messageEntity = await this.getMessageInConversationById(conversation, id);
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

    const metadata = asImage ? ((await buildMetadata(file)) as ImageMetadata) : undefined;
    const assetMessage = metadata
      ? MessageBuilder.buildImageMessage({asset: asset, image: metadata}, messageId)
      : MessageBuilder.buildFileDataMessage(
          {asset: asset, file: {data: Buffer.from(await file.arrayBuffer())}},
          messageId,
        );
    return this.sendAndInjectMessage(assetMessage, conversation, {enableEphemeral: true, syncTimestamp: false});
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
    const message = MessageBuilder.buildFileMetaDataMessage({
      metaData: meta as FileMetaDataContent,
    });
    return this.sendAndInjectMessage(message, conversation, {enableEphemeral: true});
  }

  /**
   * Send asset upload failed message to specified conversation.
   *
   * @param conversation Conversation that should receive the file
   * @param messageId ID of the metadata message
   * @param reason Cause for the failed upload (optional)
   * @returns Resolves when the asset failure was sent
   */
  private sendAssetUploadFailed(conversation: Conversation, messageId: string, reason = Asset.NotUploaded.FAILED) {
    const payload = MessageBuilder.buildFileAbortMessage({reason}, messageId);

    return this.sendAndInjectMessage(payload, conversation);
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
      const options = {
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

      PrimaryModal.show(PrimaryModal.type.CONFIRM, options, `degraded-${conversation.id}`);
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
  ) {
    const {groupId} = conversation;

    const messageTimer = conversation.messageTimer();
    const payload = enableEphemeral && messageTimer ? MessageBuilder.wrapInEphemeral(message, messageTimer) : message;

    const injectOptimisticEvent = async () => {
      if (!skipInjection) {
        const senderId = this.clientState.currentClient().id;
        const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
        const optimisticEvent = EventBuilder.buildMessageAdd(conversation, currentTimestamp, senderId);
        this.trackContributed(conversation, payload);
        const mappedEvent = await this.cryptography_repository.cryptographyMapper.mapGenericMessage(
          payload,
          optimisticEvent,
        );
        await this.eventRepository.injectEvent(mappedEvent);
      }
      return silentDegradationWarning ? true : this.requestUserSendingPermission(conversation, false, consentType);
    };

    const handleSuccess = async ({sentAt, failedToSend}: SendResult) => {
      const injectDelta = 10; // we want to make sure the message is injected slightly before it was received by the backend
      const sentTimestamp = new Date(sentAt).getTime() - injectDelta;
      const preMessageTimestamp = new Date(sentTimestamp).toISOString();
      // Trigger an empty mismatch to check for users that have no devices and that could have been removed from the team
      await this.onClientMismatch?.({time: preMessageTimestamp}, conversation, silentDegradationWarning);
      if (!skipInjection) {
        await this.updateMessageAsSent(
          conversation,
          payload.messageId,
          syncTimestamp ? sentAt : undefined,
          failedToSend,
        );
      }
    };

    const conversationService = this.conversationService;
    // Configure ephemeral messages
    conversationService.messageTimer.setConversationLevelTimer(conversation.id, conversation.messageTimer());

    const sendOptions: Parameters<typeof conversationService.send>[0] = groupId
      ? {
          groupId,
          payload,
          protocol: ConversationProtocol.MLS,
        }
      : {
          conversationId: conversation.qualifiedId,
          nativePush,
          onClientMismatch: mismatch => this.onClientMismatch?.(mismatch, conversation, silentDegradationWarning),
          payload,
          protocol: ConversationProtocol.PROTEUS,
          targetMode,
          userIds: await this.generateRecipients(conversation, recipients, skipSelf),
        };

    const shouldProceedSending = await injectOptimisticEvent();
    if (shouldProceedSending === false) {
      return {id: payload.messageId, state: MessageSendingState.CANCELED};
    }

    try {
      const result = await this.conversationService.send(sendOptions);

      if (result.state === MessageSendingState.OUTGOING_SENT) {
        await handleSuccess(result);
      }
      return result;
    } catch (error) {
      await this.updateMessageAsFailed(conversation, payload.messageId);
      throw error;
    }
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

  async resetSession(userId: QualifiedId, clientId: string, conversation: Conversation): Promise<void> {
    this.logger.info(`Resetting session with client '${clientId}' of user '${userId.id}'.`);

    try {
      // We delete the stored session so that it can be recreated later on
      await this.cryptography_repository.deleteSession(userId, clientId);
      return await this.sendSessionReset(userId, clientId, conversation);
    } catch (error) {
      const message = error instanceof Error ? error.message : error;
      const logMessage = `Failed to reset session for client '${clientId}' of user '${userId.id}': ${message}`;
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
    const sessionReset = MessageBuilder.buildSessionResetMessage();

    const userClient = {[userId.domain]: {[userId.id]: [clientId]}};
    await this.conversationService.send({
      conversationId: conversation.qualifiedId,
      payload: sessionReset,
      protocol: ConversationProtocol.PROTEUS,
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

  /**
   * Send reaction to a content message in specified conversation.
   * @param conversation Conversation to send reaction in
   * @param messageEntity Message to react to
   * @param reactionType Reaction
   * @returns Resolves after sending the reaction
   */
  private async sendReaction(conversation: Conversation, messageEntity: Message, reactionType: ReactionType) {
    const reaction = MessageBuilder.buildReactionMessage({originalMessageId: messageEntity.id, type: reactionType});

    return this.sendAndInjectMessage(reaction, conversation);
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
    options: {
      targetedUsers?: QualifiedId[];
      /** will not wait for backend confirmation before actually deleting the message locally */
      optimisticRemoval?: boolean;
    } = {},
  ): Promise<void> {
    const conversationId = conversation.id;
    const messageId = message.id;

    try {
      if (!message.user().isMe && !message.ephemeral_expires()) {
        throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
      }
      const userIds = options.targetedUsers || conversation.allUserEntities().map(user => user!.qualifiedId);
      const payload = MessageBuilder.buildDeleteMessage({
        messageId: message.id,
      });
      await this.sendAndInjectMessage(payload, conversation, {
        recipients: userIds,
        // if we want optimistic removal, we can rely on the injection system that will handle the event and remove the message even before the message is sent
        skipInjection: !options.optimisticRemoval,
        // If there are recipients to the message, we only want to target those users (case of ephemeral messages that should be deleted in the sender's client and the user's own clients)
        targetMode: userIds ? MessageTargetMode.USERS : undefined,
      });
      if (!options.optimisticRemoval) {
        this.deleteMessageById(conversation, message.id);
      }
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
      const payload = MessageBuilder.buildHideMessage({
        conversationId: conversation.id,
        messageId: message.id,
        qualifiedConversationId: conversation.qualifiedId,
      });

      await this.sendToSelfConversations(payload);
      await this.deleteMessageById(conversation, message.id);
    } catch (error) {
      this.logger.info(
        `Failed to send delete message with id '${message.id}' for conversation '${conversation.id}'`,
        error,
      );
      throw error;
    }
  }

  private async sendToSelfConversations(payload: GenericMessage) {
    const selfConversations = this.conversationState.getSelfConversations(supportsMLS());
    await Promise.all(
      selfConversations.map(selfConversation =>
        this.sendAndInjectMessage(payload, selfConversation, {
          skipInjection: true,
        }),
      ),
    );
  }

  /**
   * Update cleared of conversation using timestamp.
   */
  public async updateClearedTimestamp(conversation: Conversation): Promise<void> {
    const timestamp = conversation.getLastKnownTimestamp(this.serverTimeHandler.toServerTimestamp());
    if (timestamp && conversation.setTimestamp(timestamp, Conversation.TIMESTAMP_TYPE.CLEARED)) {
      const payload = MessageBuilder.buildClearedMessage(conversation.qualifiedId);
      await this.sendToSelfConversations(payload);
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

    const buttonMessage = MessageBuilder.buildButtonActionMessage({
      buttonId,
      referenceMessageId: message.id,
    });
    try {
      this.sendAndInjectMessage(buttonMessage, conversation, {
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
      conversationEntity.isShowingLastReceivedMessage() && conversationEntity.getNewestMessage()?.id === messageId;

    const deleteCount = await this.eventService.deleteEvent(conversationEntity.id, messageId);
    const previousMessage = conversationEntity.getNewestMessage();

    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageId, conversationEntity.id);

    if (isLastDeleted && previousMessage?.timestamp()) {
      conversationEntity.updateTimestamps(previousMessage, true);
    }

    return deleteCount;
  }

  private readonly sendAvailabilityStatus = async (availability: Availability.Type) => {
    const protoAvailability = new Availability({type: protoFromType(availability)});
    const genericMessage = new GenericMessage({
      [GenericMessageType.AVAILABILITY]: protoAvailability,
      messageId: createRandomUuid(),
    });

    const sortedUsers = this.userState
      .directlyConnectedUsers()
      // For the moment, we do not want to send status in federated env
      // we can remove the filter when we actually want this feature in federated env (and we will need to implement federation for the core broadcastService)
      .filter(user => !user.isFederated)
      .sort(({id: idA}, {id: idB}) => idA.localeCompare(idB, undefined, {sensitivity: 'base'}));
    const [members, other] = partition(sortedUsers, user => user.isTeamMember());
    const users = [this.userState.self(), ...members, ...other].slice(
      0,
      UserRepository.CONFIG.MAXIMUM_TEAM_SIZE_BROADCAST,
    );

    await this.core.service!.broadcast.broadcastGenericMessage(
      genericMessage,
      this.createRecipients(users),
      this.onClientMismatch,
    );
  };

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
    failedToSend?: SendResult['failedToSend'],
  ) {
    try {
      const messageEntity = await this.getMessageInConversationById(conversationEntity, eventId);
      const updatedStatus = messageEntity.readReceipts().length ? StatusType.SEEN : StatusType.SENT;
      messageEntity.status(updatedStatus);
      const changes: Pick<Partial<EventRecord>, 'status' | 'time' | 'failedToSend'> = {
        status: updatedStatus,
        failedToSend,
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
    return undefined;
  }

  private async updateMessageAsFailed(conversationEntity: Conversation, eventId: string) {
    try {
      const messageEntity = await this.getMessageInConversationById(conversationEntity, eventId);
      messageEntity.status(StatusType.FAILED);
      return await this.eventService.updateEvent(messageEntity.primary_key, {status: StatusType.FAILED});
    } catch (error) {
      if ((error as any).type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }
    }
    return undefined;
  }

  private createRecipients(users: User[]): QualifiedUserClients {
    return users.reduce((userClients, user) => {
      userClients[user.domain] ||= {};
      userClients[user.domain][user.id] = user.devices().map(client => client.id);
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
      .flatMap(user => (user ? [user] : []))
      // if users are given by the caller, we filter to only keep those users
      .filter(user => !recipients || recipients.some(userId => matchQualifiedIds(user, userId)))
      // we filter the self user if skipSelf is true
      .filter(user => !skipSelf || !user.isMe);

    // Check if we have users without assigned clients and assign them from local database if possible
    if (filteredUsers.some(user => user?.devices().length === 0)) {
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
    if (!message) {
      throw new ConversationError(
        ConversationError.TYPE.MESSAGE_NOT_FOUND,
        ConversationError.MESSAGE.MESSAGE_NOT_FOUND,
      );
    }

    return message as StoredContentMessage;
  }

  async ensureMessageSender(message: Message) {
    if (message.from && !message.user().id) {
      const user = await this.userRepository.getUserById({domain: message.user().domain, id: message.from});
      message.user(user);
      return message as StoredContentMessage;
    }
    return message as StoredContentMessage;
  }

  async triggerTeamMemberLeaveChecks(users: APIClientUser[]): Promise<void> {
    for (const user of users) {
      // Since this is a bare API client user we use `.deleted`
      const isDeleted = user.deleted === true;
      if (isDeleted) {
        await this.conversationRepositoryProvider().teamMemberLeave(this.teamState.team().id ?? '', {
          domain: this.userState.self().domain,
          id: user.id,
        });
      }
    }
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
  public async markAsRead(conversation: Conversation) {
    const timestamp = conversation.last_read_timestamp();
    const payload = MessageBuilder.buildLastReadMessage(conversation.qualifiedId, timestamp);
    await this.sendToSelfConversations(payload);
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
  public async sendCountlySync(countlyId: string) {
    const payload = MessageBuilder.buildDataTransferMessage(countlyId);
    await this.sendToSelfConversations(payload);
    this.logger.info(`Sent countly sync message with ID ${countlyId}`);
  }

  /**
   * Sends a call message only to self conversation (eg. REJECT message that warn the user's other clients that the call has been picked up)
   * @param payload
   * @returns
   */
  public sendSelfCallingMessage(payload: string, targetConversation: QualifiedId) {
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
  ) {
    const objectPayload = typeof payload === 'string' ? {content: payload} : payload;
    const message = MessageBuilder.buildCallMessage(objectPayload);

    return this.sendAndInjectMessage(message, conversation, {
      ...options,
      consentType: CONSENT_TYPE.OUTGOING_CALL,
      // We want to show the degradation warning only when message should be sent to all participants
      silentDegradationWarning: !!options?.recipients,

      skipInjection: true,

      targetMode: options?.recipients ? MessageTargetMode.USERS_CLIENTS : MessageTargetMode.USERS,
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
  private trackContributed(conversationEntity: Conversation, genericMessage: GenericMessage) {
    const isEphemeral = genericMessage.content === GenericMessageType.EPHEMERAL;

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
