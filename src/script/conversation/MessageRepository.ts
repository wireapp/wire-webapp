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
  MessageDelete,
  MessageEdit,
  MessageHide,
  Reaction,
  Text,
  Asset as ProtobufAsset,
  LinkPreview,
  DataTransfer,
} from '@wireapp/protocol-messaging';
import {RequestCancellationError} from '@wireapp/api-client/src/user';
import {ReactionType} from '@wireapp/core/src/main/conversation';
import {WebAppEvents} from '@wireapp/webapp-events';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {NewOTRMessage, ClientMismatch} from '@wireapp/api-client/src/conversation';
import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {Declension, joinNames, t} from 'Util/LocalizerUtil';
import {getDifference} from 'Util/ArrayUtil';
import {arrayToBase64, createRandomUuid, loadUrlBlob} from 'Util/util';
import {areMentionsDifferent, isTextDifferent} from 'Util/messageComparator';
import {capitalizeFirstChar} from 'Util/StringUtil';
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
import {ConversationEphemeralHandler} from './ConversationEphemeralHandler';
import {ClientMismatchHandler} from './ClientMismatchHandler';
import {buildMetadata, isVideo, isImage, isAudio} from '../assets/AssetMetaDataBuilder';
import {AssetTransferState} from '../assets/AssetTransferState';
import {AssetRemoteData} from '../assets/AssetRemoteData';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {AudioType} from '../audio/AudioType';
import {EventName} from '../tracking/EventName';
import {StatusType} from '../message/StatusType';
import {BackendClientError} from '../error/BackendClientError';
import {showLegalHoldWarning} from '../legal-hold/LegalHoldWarning';
import {ConversationError} from '../error/ConversationError';
import {Segmentation} from '../tracking/Segmentation';
import {ConversationService} from './ConversationService';
import {AssetRepository} from '../assets/AssetRepository';
import {ClientRepository} from '../client/ClientRepository';
import {CryptographyRepository, Recipients} from '../cryptography/CryptographyRepository';
import {ConversationRepository} from './ConversationRepository';
import {LinkPreviewRepository} from '../links/LinkPreviewRepository';
import {UserRepository} from '../user/UserRepository';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {MessageSender} from '../message/MessageSender';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {ContentMessage} from '../entity/message/ContentMessage';
import {EventService} from '../event/EventService';
import {QuoteEntity} from '../message/QuoteEntity';
import {CompositeMessage} from '../entity/message/CompositeMessage';
import {MentionEntity} from '../message/MentionEntity';
import {AudioMetaData, VideoMetaData, ImageMetaData} from '@wireapp/core/src/main/conversation/content';
import {FileAsset} from '../entity/message/FileAsset';
import {Text as TextAsset} from '../entity/message/Text';
import {roundLogarithmic} from 'Util/NumberUtil';
import type {EventRecord} from '../storage';
import {container} from 'tsyringe';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';
import {ConversationState} from './ConversationState';

type ConversationEvent = {conversation: string; id: string};
type EventJson = any;

export class MessageRepository {
  private readonly logger: Logger;
  private readonly eventService: EventService;
  private readonly event_mapper: EventMapper;
  public readonly clientMismatchHandler: ClientMismatchHandler;
  private isBlockingNotificationHandling: boolean;

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
    private readonly link_repository: LinkPreviewRepository,
    private readonly assetRepository: AssetRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
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

  private initSubscriptions(): void {
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setNotificationHandlingState.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.ASSET.CANCEL, this.cancel_asset_upload.bind(this));
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not allow sending messages when handling the notification stream
   * @param handlingState State of the notifications stream handling
   */
  private setNotificationHandlingState(handlingState: NOTIFICATION_HANDLING_STATE) {
    const updatedHandlingState = handlingState !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.isBlockingNotificationHandling !== updatedHandlingState) {
      this.isBlockingNotificationHandling = updatedHandlingState;
      this.logger.info(
        `Block message sending: ${this.isBlockingNotificationHandling} (${this.messageSender.queuedMessages} items in queue)`,
      );
      this.messageSender.pauseQueue(this.isBlockingNotificationHandling);
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
  public async sendText(
    conversationEntity: Conversation,
    textMessage: string,
    mentionEntities: MentionEntity[],
    quoteEntity: QuoteEntity,
  ) {
    const messageId = createRandomUuid();

    const protoText = this.createTextProto(
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
      genericMessage = this.wrapInEphemeralMessage(genericMessage, conversationEntity.messageTimer());
    }

    await this._send_and_inject_generic_message(conversationEntity, genericMessage);
    return genericMessage;
  }

  /**
   * Send knock in specified conversation.
   * @param conversationEntity Conversation to send knock in
   * @returns Resolves after sending the knock
   */
  public async sendKnock(conversationEntity: Conversation) {
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
      genericMessage = this.wrapInEphemeralMessage(genericMessage, conversationEntity.messageTimer());
    }

    try {
      return this._send_and_inject_generic_message(conversationEntity, genericMessage);
    } catch (error) {
      if (!this.isUserCancellationError(error)) {
        this.logger.error(`Error while sending knock: ${error.message}`, error);
        throw error;
      }
    }
    return undefined;
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
  public async sendTextWithLinkPreview(
    conversationEntity: Conversation,
    textMessage: string,
    mentionEntities: MentionEntity[],
    quoteEntity: QuoteEntity,
  ) {
    try {
      const genericMessage = await this.sendText(conversationEntity, textMessage, mentionEntities, quoteEntity);
      return this.sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities, quoteEntity);
    } catch (error) {
      if (!this.isUserCancellationError(error)) {
        this.logger.error(`Error while sending text message: ${error.message}`, error);
        throw error;
      }
    }
    return undefined;
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
  public async sendMessageEdit(
    conversationEntity: Conversation,
    textMessage: string,
    originalMessageEntity: ContentMessage,
    mentionEntities: MentionEntity[],
  ) {
    const hasDifferentText = isTextDifferent(originalMessageEntity, textMessage);
    const hasDifferentMentions = areMentionsDifferent(originalMessageEntity, mentionEntities);
    const wasEdited = hasDifferentText || hasDifferentMentions;

    if (!wasEdited) {
      throw new ConversationError(
        ConversationError.TYPE.NO_MESSAGE_CHANGES,
        ConversationError.MESSAGE.NO_MESSAGE_CHANGES,
      );
    }

    const messageId = createRandomUuid();

    const protoText = this.createTextProto(
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

    try {
      await this._send_and_inject_generic_message(conversationEntity, genericMessage, false);
      return this.sendLinkPreview(conversationEntity, textMessage, genericMessage, mentionEntities);
    } catch (error) {
      if (!this.isUserCancellationError(error)) {
        this.logger.error(`Error while editing message: ${error.message}`, error);
        throw error;
      }
    }
    return undefined;
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
    quoteEntity: QuoteEntity,
  ) {
    if (!tag) {
      tag = t('extensionsGiphyRandom');
    }

    const blob = await loadUrlBlob(url);
    const textMessage = t('extensionsGiphyMessage', tag, {}, true);
    this.sendText(conversationEntity, textMessage, null, quoteEntity);
    return this.upload_images(conversationEntity, [blob]);
  }

  /**
   * Post images to a conversation.
   *
   * @param conversationEntity Conversation to post the images
   */
  public upload_images(conversationEntity: Conversation, images: File[] | Blob[]) {
    this.upload_files(conversationEntity, images, true);
  }

  /**
   * Post files to a conversation.
   *
   * @param conversationEntity Conversation to post the files
   * @param files files
   * @param asImage whether or not the file should be treated as an image
   */
  public upload_files(conversationEntity: Conversation, files: File[] | Blob[], asImage?: boolean) {
    if (this.canUploadAssetsToConversation(conversationEntity)) {
      Array.from(files).forEach(file => this.upload_file(conversationEntity, file, asImage));
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
   * @param conversationEntity Conversation to post the file
   * @param file File object
   * @param asImage whether or not the file should be treated as an image
   * @returns Resolves when file was uploaded
   */

  private async upload_file(conversationEntity: Conversation, file: File | Blob, asImage?: boolean) {
    let messageId;
    try {
      const uploadStarted = Date.now();
      const injectedEvent = await this.sendAssetMetadata(conversationEntity, file, asImage);
      messageId = injectedEvent.id;
      await this.sendAssetRemotedata(conversationEntity, file, messageId, asImage);
      const uploadDuration = (Date.now() - uploadStarted) / TIME_IN_MILLIS.SECOND;
      this.logger.info(`Finished to upload asset for conversation'${conversationEntity.id} in ${uploadDuration}`);
    } catch (error) {
      if (this.isUserCancellationError(error)) {
        throw error;
      } else if (error instanceof RequestCancellationError) {
        return;
      }
      this.logger.error(`Failed to upload asset for conversation '${conversationEntity.id}': ${error.message}`, error);
      const messageEntity = await this.getMessageInConversationById(conversationEntity, messageId);
      this.sendAssetUploadFailed(conversationEntity, messageEntity.id);
      return this.update_message_as_upload_failed(messageEntity);
    }
  }

  /**
   * Update asset in UI and DB as failed
   *
   * @param message_et Message to update
   * @param reason Failure reason
   * @returns Resolves when the message was updated
   */
  private async update_message_as_upload_failed(message_et: ContentMessage, reason = AssetTransferState.UPLOAD_FAILED) {
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

  private async sendAssetRemotedata(conversationEntity: Conversation, file: Blob, messageId: string, asImage: boolean) {
    let genericMessage: GenericMessage;

    await this.getMessageInConversationById(conversationEntity, messageId);
    const retention = this.assetRepository.getAssetRetention(this.userState.self(), conversationEntity);
    const options = {
      expectsReadConfirmation: this.expectReadReceipt(conversationEntity),
      legalHoldStatus: conversationEntity.legalHoldStatus(),
      public: true,
      retention,
    };
    const asset = await this.assetRepository.uploadFile(messageId, file, options, asImage);
    genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.ASSET]: asset,
      messageId,
    });
    if (conversationEntity.messageTimer()) {
      genericMessage = this.wrapInEphemeralMessage(genericMessage, conversationEntity.messageTimer());
    }
    const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id);
    const payload = await this.sendGenericMessageToConversation(eventInfoEntity);
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
    return this.onAssetUploadComplete(conversationEntity, assetAddEvent);
  }

  /**
   * An asset was uploaded.
   *
   * @param conversationEntity Conversation to add the event to
   * @param event_json JSON data of 'conversation.asset-upload-complete' event
   * @returns Resolves when the event was handled
   */
  private async onAssetUploadComplete(
    conversationEntity: Conversation,
    event_json: import('./EventBuilder').AssetAddEvent,
  ) {
    try {
      const message_et = await this.getMessageInConversationById(conversationEntity, event_json.id);
      return await this.update_message_as_upload_complete(conversationEntity, message_et, event_json);
    } catch (error) {
      if (error.type !== ConversationError.TYPE.MESSAGE_NOT_FOUND) {
        throw error;
      }

      this.logger.error(`Upload complete: Could not find message with id '${event_json.id}'`, event_json);
    }
  }

  /**
   * Send asset metadata message to specified conversation.
   */
  private async sendAssetMetadata(
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
        genericMessage = this.wrapInEphemeralMessage(genericMessage, conversationEntity.messageTimer());
      }
      return this._send_and_inject_generic_message(conversationEntity, genericMessage);
    } catch (error) {
      const log = `Failed to upload metadata for asset in conversation '${conversationEntity.id}': ${error.message}`;
      this.logger.warn(log, error);

      if (this.isUserCancellationError(error)) {
        throw error;
      }
    }
    return undefined;
  }

  /**
   * Wraps generic message in ephemeral message.
   *
   * @param genericMessage Message to be wrapped
   * @param millis Expire time in milliseconds
   * @returns New proto message
   */
  private wrapInEphemeralMessage(genericMessage: GenericMessage, millis: number) {
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

  /**
   * Update asset in UI and DB as completed.
   *
   * @param conversationEntity Conversation that contains the message
   * @param message_et Message to update
   * @param event_json Uploaded asset event information
   * @returns Resolve when message was updated
   */
  private update_message_as_upload_complete(
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

  /**
   * Send asset upload failed message to specified conversation.
   *
   * @param conversationEntity Conversation that should receive the file
   * @param messageId ID of the metadata message
   * @param reason Cause for the failed upload (optional)
   * @returns Resolves when the asset failure was sent
   */
  private sendAssetUploadFailed(
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
   * Send link preview in specified conversation.
   *
   * @param conversationEntity Conversation that should receive the message
   * @param textMessage Plain text message that possibly contains link
   * @param genericMessage GenericMessage of containing text or edited message
   * @param mentionEntities Mentions as part of message
   * @param quoteEntity Link to a quoted message
   * @returns Resolves after sending the message
   */
  private async sendLinkPreview(
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
        const protoText = this.createTextProto(
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

  private isUserCancellationError(error: ConversationError): boolean {
    const errorTypes: string[] = [
      ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION,
      ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
    ];
    return errorTypes.includes(error.type);
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
      optimisticEvent as EventRecord,
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
    this.trackContributed(conversationEntity, genericMessage);
    const backendIsoDate = syncTimestamp ? sentPayload.time : '';
    await this.updateMessageAsSent(conversationEntity, injectedEvent, backendIsoDate);
    return injectedEvent;
  }

  /**
   * Toggle like status of message.
   *
   * @param conversationEntity Conversation entity
   * @param message_et Message to react to
   */
  public toggle_like(conversationEntity: Conversation, message_et: ContentMessage) {
    if (!conversationEntity.removed_from_conversation()) {
      const reaction = message_et.is_liked() ? ReactionType.NONE : ReactionType.LIKE;
      message_et.is_liked(!message_et.is_liked());

      window.setTimeout(() => this.sendReaction(conversationEntity, message_et, reaction), 100);
    }
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
  private async sendSessionReset(userId: string, clientId: string, conversationId: string): Promise<ClientMismatch> {
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
      const response = await this.sendGenericMessage(eventInfoEntity);
      this.logger.info(`Sent info about session reset to client '${clientId}' of user '${userId}'`);
      return response;
    } catch (error) {
      this.logger.error(`Sending conversation reset failed: ${error.message}`, error);
      throw error;
    }
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
  sendConfirmationStatus(
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

        return this.sendGenericMessage(eventInfoEntity);
      });
    });
  }

  /**
   * Send reaction to a content message in specified conversation.
   * @param conversationEntity Conversation to send reaction in
   * @param messageEntity Message to react to
   * @param reaction Reaction
   * @returns Resolves after sending the reaction
   */
  private sendReaction(conversationEntity: Conversation, messageEntity: Message, reaction: ReactionType) {
    const protoReaction = new Reaction({emoji: reaction, messageId: messageEntity.id});
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.REACTION]: protoReaction,
      messageId: createRandomUuid(),
    });

    return this._send_and_inject_generic_message(conversationEntity, genericMessage);
  }

  private createTextProto(
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
   * Delete message for everyone.
   *
   * @param conversationEntity Conversation to delete message from
   * @param messageEntity Message to delete
   * @param precondition Optional level that backend checks for missing clients
   * @returns Resolves when message was deleted
   */
  public async deleteMessageForEveryone(
    conversationEntity: Conversation,
    messageEntity: Message,
    precondition?: string[] | boolean,
  ) {
    const conversationId = conversationEntity.id;
    const messageId = messageEntity.id;

    try {
      if (!messageEntity.user().isMe && !messageEntity.ephemeral_expires()) {
        throw new ConversationError(ConversationError.TYPE.WRONG_USER, ConversationError.MESSAGE.WRONG_USER);
      }

      const protoMessageDelete = new MessageDelete({messageId});
      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.DELETED]: protoMessageDelete,
        messageId: createRandomUuid(),
      });
      await this.messageSender.queueMessage(() => {
        const userIds = Array.isArray(precondition) ? precondition : undefined;
        return this.create_recipients(conversationId, false, userIds).then(recipients => {
          const options = {precondition, recipients};
          const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId, options);
          this.sendGenericMessage(eventInfoEntity);
        });
      });
      return this._delete_message_by_id(conversationEntity, messageId);
    } catch (error) {
      const isConversationNotFound = error.code === HTTP_STATUS.NOT_FOUND;
      if (isConversationNotFound) {
        this.logger.warn(`Conversation '${conversationId}' not found. Deleting message for self user only.`);
        return this.deleteMessage(conversationEntity, messageEntity);
      }
      const message = `Failed to delete message '${messageId}' in conversation '${conversationId}' for everyone`;
      this.logger.info(message, error);
      throw error;
    }
  }

  /**
   * Delete message on your own clients.
   *
   * @param conversationEntity Conversation to delete message from
   * @param messageEntity Message to delete
   * @returns Resolves when message was deleted
   */
  public async deleteMessage(conversationEntity: Conversation, messageEntity: Message) {
    try {
      const protoMessageHide = new MessageHide({
        conversationId: conversationEntity.id,
        messageId: messageEntity.id,
      });
      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.HIDDEN]: protoMessageHide,
        messageId: createRandomUuid(),
      });

      const eventInfoEntity = new EventInfoEntity(genericMessage, this.conversationState.self_conversation().id);
      await this.sendGenericMessageToConversation(eventInfoEntity);
      return this._delete_message_by_id(conversationEntity, messageEntity.id);
    } catch (error) {
      this.logger.info(
        `Failed to send delete message with id '${messageEntity.id}' for conversation '${conversationEntity.id}'`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update cleared of conversation using timestamp.
   */
  public updateClearedTimestamp(conversationEntity: Conversation) {
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

      const eventInfoEntity = new EventInfoEntity(genericMessage, this.conversationState.self_conversation().id);
      this.sendGenericMessageToConversation(eventInfoEntity).then(() => {
        this.logger.info(`Cleared conversation '${conversationEntity.id}' on '${new Date(timestamp).toISOString()}'`);
      });
    }
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
        await this.sendGenericMessage(eventInfoEntity, true);
      } catch (error) {
        messageEntity.waitingButtonId(undefined);
        return messageEntity.setButtonError(buttonId, t('buttonActionError'));
      }
    });
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @param conversationEntity Conversation that contains the message
   * @param messageId ID of message to delete
   * @returns Resolves when message was deleted
   */
  public async _delete_message_by_id(conversationEntity: Conversation, messageId: string) {
    const isLastDeleted =
      conversationEntity.isShowingLastReceivedMessage() && conversationEntity.getLastMessage()?.id === messageId;

    const deleteCount = await this.eventService.deleteEvent(conversationEntity.id, messageId);

    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, messageId, conversationEntity.id);

    if (isLastDeleted && conversationEntity.getLastMessage()?.timestamp()) {
      conversationEntity.updateTimestamps(conversationEntity.getLastMessage(), true);
    }

    return deleteCount;
  }

  private sendGenericMessageToConversation(eventInfoEntity: EventInfoEntity) {
    return this.messageSender.queueMessage(async () => {
      const recipients = await this.create_recipients(eventInfoEntity.conversationId);
      eventInfoEntity.updateOptions({recipients});
      return this.sendGenericMessage(eventInfoEntity);
    });
  }

  /**
   * Cancel asset upload.
   * @param messageId Id of the message which upload has been cancelled
   */
  private cancel_asset_upload(messageId: string) {
    this.sendAssetUploadFailed(
      this.conversationState.activeConversation(),
      messageId,
      ProtobufAsset.NotUploaded.CANCELLED,
    );
  }

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
      this.conversationRepositoryProvider().checkMessageTimer(messageEntity);
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
   * Create a user client map for a given conversation.
   *
   * @param conversation_id Conversation ID
   * @param skip_own_clients `true`, if other own clients should be skipped (to not sync messages on own clients)
   * @param user_ids Optionally the intended recipient users
   * @returns Resolves with a user client map
   */
  async create_recipients(conversation_id: string, skip_own_clients = false, user_ids: string[] = null) {
    const userEntities = await this.conversationRepositoryProvider().getAllUsersInConversation(conversation_id);
    const recipients: Recipients = {};
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

  /**
   * Sends a generic message to a conversation.
   *
   * @param eventInfoEntity Info about event
   * @param skipLegalHold Skip the legal hold detection
   * @returns Resolves when the message was sent
   */
  private async sendGenericMessage(eventInfoEntity: EventInfoEntity, skipLegalHold = false): Promise<ClientMismatch> {
    try {
      await this.grantOutgoingMessage(eventInfoEntity, undefined, skipLegalHold);
      const sendAsExternal = await this.shouldSendAsExternal(eventInfoEntity);
      if (sendAsExternal) {
        return this.sendExternalGenericMessage(eventInfoEntity);
      }

      const {genericMessage, options} = eventInfoEntity;
      const payload = await this.cryptography_repository.encryptGenericMessage(options.recipients, genericMessage);
      payload.native_push = options.nativePush;
      return this.sendEncryptedMessage(eventInfoEntity, payload);
    } catch (error) {
      const isRequestTooLarge = error?.code === HTTP_STATUS.REQUEST_TOO_LONG;
      if (isRequestTooLarge) {
        return this.sendExternalGenericMessage(eventInfoEntity);
      }

      throw error;
    }
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
            return message as ContentMessage;
          });
        }
        return message as ContentMessage;
      });
    }
    return messagePromise as Promise<ContentMessage>;
  }

  private async grantOutgoingMessage(
    eventInfoEntity: EventInfoEntity,
    userIds: string[],
    skipLegalHold = false,
  ): Promise<boolean> {
    const messageType = eventInfoEntity.getType();
    const allowedMessageTypes = ['cleared', 'clientAction', 'confirmation', 'deleted', 'lastRead'];
    if (allowedMessageTypes.includes(messageType)) {
      return false;
    }

    if (this.teamState.isTeam()) {
      const allRecipientsBesideSelf = Object.keys(eventInfoEntity.options.recipients).filter(
        id => id !== this.userState.self().id,
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
          await this.conversationRepositoryProvider().teamMemberLeave(this.teamState.team().id, user.id);
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
          conversationId,
          legalHoldStatus: updatedLocalLegalHoldStatus,
          timestamp: numericTimestamp,
          userId: this.userState.self().id,
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
    const conversationEntity = await this.conversationRepositoryProvider().get_conversation_by_id(
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
      return showLegalHoldWarning(conversationEntity, conversationDegraded);
    } else if (shouldShowLegalHoldWarning) {
      conversationEntity.needsLegalHoldApproval = !this.userState.self().isOnLegalHold() && isLegalHoldMessageType;
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

          amplify.publish(
            WebAppEvents.WARNING.MODAL,
            ModalsViewModel.TYPE.CONFIRM,
            {
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
            },
            `degraded-${eventInfoEntity.conversationId}`,
          );
        })
        .catch(reject);
    });
  }

  public async updateAllClients(conversationEntity: Conversation, blockSystemMessage = true) {
    if (blockSystemMessage) {
      conversationEntity.blockLegalHoldMessage = true;
    }
    const sender = this.clientRepository['clientState'].currentClient().id;
    try {
      await this.conversation_service.post_encrypted_message(conversationEntity.id, {recipients: {}, sender});
    } catch (axiosError) {
      const error = axiosError.response?.data || axiosError;
      if (error.missing) {
        const remoteUserClients = error.missing as Recipients;
        const localUserClients = await this.create_recipients(conversationEntity.id);
        const selfId = this.userState.self().id;

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

    const eventInfoEntity = new EventInfoEntity(genericMessage, this.conversationState.self_conversation().id);
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
    const protoDataTransfer = new DataTransfer({
      trackingIdentifier: {
        identifier: countlyId,
      },
    });
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.DATA_TRANSFER]: protoDataTransfer,
      messageId: createRandomUuid(),
    });

    const eventInfoEntity = new EventInfoEntity(genericMessage, this.conversationState.self_conversation().id);
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
  public sendCallingMessage(eventInfoEntity: EventInfoEntity, conversationId: string) {
    return this.messageSender.queueMessage(() => {
      const options = eventInfoEntity.options;
      const recipientsPromise = options.recipients
        ? Promise.resolve(eventInfoEntity)
        : this.create_recipients(conversationId, false).then(recipients => {
            eventInfoEntity.updateOptions({recipients});
            return eventInfoEntity;
          });
      return recipientsPromise.then(infoEntity => this.sendGenericMessage(infoEntity));
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

    const conversationEntity = await this.conversationRepositoryProvider().get_conversation_by_id(conversationId);
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
        options.recipients,
        genericMessageExternal,
      );
      payload.data = await arrayToBase64(encryptedAsset.cipherText);
      payload.native_push = options.nativePush;
      return this.sendEncryptedMessage(eventInfoEntity, payload);
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
   * @returns Promise that resolves after sending the encrypted message
   */
  private async sendEncryptedMessage(
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

      const payloadWithMissingClients = await this.clientMismatchHandler.onClientMismatch(
        eventInfoEntity,
        error,
        payload,
      );

      const userIds = Object.keys(error.missing);
      await this.grantOutgoingMessage(eventInfoEntity, userIds);
      this.logger.info(
        `Updated '${messageType}' message (${messageId}) for conversation '${conversationId}'. Will ignore missing receivers.`,
        payloadWithMissingClients,
      );
      return this.conversation_service.post_encrypted_message(conversationId, payloadWithMissingClients, true);
    }
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

      let segmentations: Record<string, any> = {
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
