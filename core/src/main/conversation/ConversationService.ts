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
  CONVERSATION_TYPE,
  Conversation,
  NewConversation,
  NewOTRMessage,
  OTRRecipients,
} from '@wireapp/api-client/dist/commonjs/conversation/';
import {CONVERSATION_TYPING, ConversationMemberLeaveEvent} from '@wireapp/api-client/dist/commonjs/event/';
import {StatusCode} from '@wireapp/api-client/dist/commonjs/http/';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/';
import {AxiosError} from 'axios';
import {Encoder} from 'bazinga64';
import {
  AbortReason,
  AssetService,
  AssetTransferState,
  GenericMessageType,
  MessageTimer,
  PayloadBundleOutgoing,
  PayloadBundleOutgoingUnsent,
  PayloadBundleState,
  PayloadBundleType,
  ReactionType,
} from '../conversation/root';

import {
  Asset,
  Cleared,
  ClientAction,
  Confirmation,
  Ephemeral,
  GenericMessage,
  Knock,
  LinkPreview,
  Location,
  Mention,
  MessageDelete,
  MessageEdit,
  MessageHide,
  Reaction,
  Text,
  Tweet,
} from '@wireapp/protocol-messaging';

import {
  ClientActionContent,
  ConfirmationContent,
  EditedTextContent,
  FileAssetAbortContent,
  FileAssetContent,
  FileAssetMetaDataContent,
  FileContent,
  FileMetaDataContent,
  ImageAssetContent,
  ImageContent,
  LinkPreviewContent,
  LinkPreviewUploadedContent,
  LocationContent,
  ReactionContent,
  RemoteData,
  TextContent,
} from '../conversation/content/';

import {TextContentBuilder} from './TextContentBuilder';

import * as AssetCryptography from '../cryptography/AssetCryptography.node';
import {CryptographyService, EncryptedAsset} from '../cryptography/root';

import {APIClient} from '@wireapp/api-client';

const UUID = require('pure-uuid');

class ConversationService {
  private clientID: string = '';
  public readonly messageTimer: MessageTimer;

  constructor(
    private readonly apiClient: APIClient,
    private readonly cryptographyService: CryptographyService,
    private readonly assetService: AssetService
  ) {
    this.messageTimer = new MessageTimer();
  }

  private createEphemeral(originalGenericMessage: GenericMessage, expireAfterMillis: number): GenericMessage {
    const ephemeralMessage = Ephemeral.create({
      expireAfterMillis,
      [originalGenericMessage.content!]: originalGenericMessage[originalGenericMessage.content!],
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.EPHEMERAL]: ephemeralMessage,
      messageId: originalGenericMessage.messageId,
    });

    return genericMessage;
  }

  private async getPreKeyBundle(
    conversationId: string,
    userIds?: string[],
    skipOwnClients = false
  ): Promise<UserPreKeyBundleMap> {
    const conversation = await this.apiClient.conversation.api.getConversation(conversationId);
    const members = userIds && userIds.length ? userIds.map(id => ({id})) : conversation.members.others;
    const preKeys = await Promise.all(members.map(member => this.apiClient.user.api.getUserPreKeys(member.id)));

    if (!skipOwnClients) {
      const selfPreKey = await this.apiClient.user.api.getUserPreKeys(conversation.members.self.id);
      preKeys.push(selfPreKey);
    }

    return preKeys.reduce((bundleMap: UserPreKeyBundleMap, bundle) => {
      bundleMap[bundle.user] = {};
      for (const client of bundle.clients) {
        bundleMap[bundle.user][client.client] = client.prekey;
      }
      return bundleMap;
    }, {});
  }

  private getSelfConversation(): Promise<Conversation> {
    const {userId} = this.apiClient.context!;
    return this.apiClient.conversation.api.getConversation(userId);
  }

  private async sendConfirmation(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    const confirmationContent = payloadBundle.content as ConfirmationContent;

    const confirmationMessage = Confirmation.create({
      firstMessageId: confirmationContent.confirmMessageId,
      type: Confirmation.Type.DELIVERED,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.CONFIRMATION]: confirmationMessage,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage, userIds);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendExternalGenericMessage(
    sendingClientId: string,
    conversationId: string,
    asset: EncryptedAsset,
    preKeyBundles: UserPreKeyBundleMap
  ): Promise<void> {
    const {cipherText, keyBytes, sha256} = asset;
    const messageId = ConversationService.createId();

    const externalMessage = {
      otrKey: new Uint8Array(keyBytes),
      sha256: new Uint8Array(sha256),
    };

    const base64CipherText = Encoder.toBase64(cipherText).asString;

    const genericMessage = GenericMessage.create({
      external: externalMessage,
      messageId,
    });

    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const recipients = await this.cryptographyService.encrypt(plainTextArray, preKeyBundles);

    return this.sendOTRMessage(sendingClientId, conversationId, recipients, plainTextArray, base64CipherText);
  }

  private async sendGenericMessage(
    sendingClientId: string,
    conversationId: string,
    genericMessage: GenericMessage,
    userIds?: string[]
  ): Promise<void> {
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const preKeyBundles = await this.getPreKeyBundle(conversationId, userIds);
    const recipients = await this.cryptographyService.encrypt(plainTextArray, preKeyBundles);

    return this.sendOTRMessage(sendingClientId, conversationId, recipients, plainTextArray);
  }

  private async sendEditedText(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    const {originalMessageId, text, linkPreviews, mentions} = payloadBundle.content as EditedTextContent;

    const textMessage = Text.create({content: text});

    if (linkPreviews && linkPreviews.length) {
      textMessage.linkPreview = this.buildLinkPreviews(linkPreviews);
    }

    if (mentions && mentions.length) {
      textMessage.mentions = mentions.map(mention => Mention.create(mention));
    }

    const editedMessage = MessageEdit.create({
      replacingMessageId: originalMessageId,
      text: textMessage,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.EDITED]: editedMessage,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage, userIds);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendFileData(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendFileData provided.');
    }

    const encryptedAsset = payloadBundle.content as FileAssetContent;

    const remoteData = Asset.RemoteData.create({
      assetId: encryptedAsset.asset.key,
      assetToken: encryptedAsset.asset.token,
      otrKey: encryptedAsset.asset.keyBytes,
      sha256: encryptedAsset.asset.sha256,
    });

    const assetMessage = Asset.create({
      uploaded: remoteData,
    });

    assetMessage.status = AssetTransferState.UPLOADED;

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    const preKeyBundles = await this.getPreKeyBundle(conversationId, userIds);
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const payload = await AssetCryptography.encryptAsset(plainTextArray);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, preKeyBundles);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendFileMetaData(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendFileMetaData provided.');
    }

    const encryptedAsset = payloadBundle.content as FileAssetMetaDataContent;

    const original = Asset.Original.create({
      mimeType: encryptedAsset.metaData.type,
      name: encryptedAsset.metaData.name,
      size: encryptedAsset.metaData.length,
    });

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: Asset.create({original}),
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    const preKeyBundles = await this.getPreKeyBundle(conversationId, userIds);
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const payload = await AssetCryptography.encryptAsset(plainTextArray);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, preKeyBundles);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendFileAbort(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendFileAbort provided.');
    }

    const abortContent = payloadBundle.content as FileAssetAbortContent;

    const assetMessage = Asset.create({
      notUploaded: abortContent.reason,
    });

    assetMessage.status = AssetTransferState.NOT_UPLOADED;

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    const preKeyBundles = await this.getPreKeyBundle(conversationId, userIds);
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const payload = await AssetCryptography.encryptAsset(plainTextArray);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, preKeyBundles);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendImage(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendImage provided.');
    }

    const encryptedAsset = payloadBundle.content as ImageAssetContent;

    const imageMetadata = Asset.ImageMetaData.create({
      height: encryptedAsset.image.height,
      width: encryptedAsset.image.width,
    });

    const original = Asset.Original.create({
      [GenericMessageType.IMAGE]: imageMetadata,
      mimeType: encryptedAsset.image.type,
      name: null,
      size: encryptedAsset.image.data.length,
    });

    const remoteData = Asset.RemoteData.create({
      assetId: encryptedAsset.asset.key,
      assetToken: encryptedAsset.asset.token,
      otrKey: encryptedAsset.asset.keyBytes,
      sha256: encryptedAsset.asset.sha256,
    });

    const assetMessage = Asset.create({
      original,
      uploaded: remoteData,
    });

    assetMessage.status = AssetTransferState.UPLOADED;

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    const preKeyBundles = await this.getPreKeyBundle(conversationId, userIds);
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const payload = await AssetCryptography.encryptAsset(plainTextArray);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, preKeyBundles);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendLocation(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    const {latitude, longitude, name, zoom} = payloadBundle.content as LocationContent;

    const locationMessage = Location.create({
      latitude,
      longitude,
      name,
      zoom,
    });

    let genericMessage = GenericMessage.create({
      [GenericMessageType.LOCATION]: locationMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage, userIds);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendOTRMessage(
    sendingClientId: string,
    conversationId: string,
    recipients: OTRRecipients,
    plainTextArray: Uint8Array,
    data?: any
  ): Promise<void> {
    const message: NewOTRMessage = {
      data,
      recipients,
      sender: sendingClientId,
    };
    try {
      await this.apiClient.conversation.api.postOTRMessage(sendingClientId, conversationId, message);
    } catch (error) {
      const reEncryptedMessage = await this.onClientMismatch(error, message, plainTextArray);
      await this.apiClient.conversation.api.postOTRMessage(sendingClientId, conversationId, reEncryptedMessage);
    }
  }

  private async onClientMismatch(
    error: AxiosError,
    message: NewOTRMessage,
    plainTextArray: Uint8Array
  ): Promise<NewOTRMessage> {
    if (error.response && error.response.status === StatusCode.PRECONDITION_FAILED) {
      const {missing: missingClients, deleted: deletedClients} = error.response.data;

      if (Object.keys(deletedClients).length) {
        for (const recipientId in message.recipients) {
          for (const deletedClientId of deletedClients[recipientId]) {
            delete message.recipients[recipientId][deletedClientId];
          }
        }
      }

      if (Object.keys(missingClients).length) {
        const missingPreKeyBundles = await this.apiClient.user.api.postMultiPreKeyBundles(missingClients);
        const reEncryptedPayloads = await this.cryptographyService.encrypt(plainTextArray, missingPreKeyBundles);
        for (const recipientId in message.recipients) {
          for (const clientId in reEncryptedPayloads[recipientId]) {
            message.recipients[recipientId][clientId] = reEncryptedPayloads[recipientId][clientId];
          }
        }
      }

      return message;
    }
    throw error;
  }

  private async sendPing(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    let genericMessage = GenericMessage.create({
      [GenericMessageType.KNOCK]: Knock.create(),
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage, userIds);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendReaction(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    const reactionContent = payloadBundle.content as ReactionContent;

    const reaction = Reaction.create({
      emoji: reactionContent.type,
      messageId: reactionContent.originalMessageId,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.REACTION]: reaction,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage, userIds);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendSessionReset(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    const sessionReset = GenericMessage.create({
      [GenericMessageType.CLIENT_ACTION]: ClientAction.RESET_SESSION,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(this.clientID, conversationId, sessionReset, userIds);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private buildLinkPreviews(linkPreviews: LinkPreviewUploadedContent[]): LinkPreview[] {
    const builtLinkPreviews = [];

    for (const linkPreview of linkPreviews) {
      const linkPreviewMessage = LinkPreview.create({
        permanentUrl: linkPreview.permanentUrl,
        summary: linkPreview.summary,
        title: linkPreview.title,
        url: linkPreview.url,
        urlOffset: linkPreview.urlOffset,
      });

      if (linkPreview.tweet) {
        linkPreviewMessage.tweet = Tweet.create({
          author: linkPreview.tweet.author,
          username: linkPreview.tweet.username,
        });
      }

      if (linkPreview.imageUploaded) {
        const encryptedAsset = linkPreview.imageUploaded;

        const imageMetadata = Asset.ImageMetaData.create({
          height: encryptedAsset.image.height,
          width: encryptedAsset.image.width,
        });

        const original = Asset.Original.create({
          [GenericMessageType.IMAGE]: imageMetadata,
          mimeType: encryptedAsset.image.type,
          size: encryptedAsset.image.data.length,
        });

        const remoteData = Asset.RemoteData.create({
          assetId: encryptedAsset.asset.key,
          assetToken: encryptedAsset.asset.token,
          otrKey: encryptedAsset.asset.keyBytes,
          sha256: encryptedAsset.asset.sha256,
        });

        const assetMessage = Asset.create({
          original,
          uploaded: remoteData,
        });

        linkPreviewMessage.image = assetMessage;
      }

      builtLinkPreviews.push(linkPreviewMessage);
    }

    return builtLinkPreviews;
  }

  private async sendText(
    conversationId: string,
    originalPayloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    const payloadBundle: PayloadBundleOutgoing = {
      ...originalPayloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };

    const {text, linkPreviews, mentions} = payloadBundle.content as TextContent;

    const textMessage = Text.create({
      content: text,
    });

    if (linkPreviews && linkPreviews.length) {
      textMessage.linkPreview = this.buildLinkPreviews(linkPreviews);
    }

    if (mentions && mentions.length) {
      textMessage.mentions = mentions.map(mention => Mention.create(mention));
    }

    let genericMessage = GenericMessage.create({
      messageId: payloadBundle.id,
      [GenericMessageType.TEXT]: textMessage,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    const preKeyBundles = await this.getPreKeyBundle(conversationId, userIds);
    const plainTextArray = GenericMessage.encode(genericMessage).finish();

    if (this.shouldSendAsExternal(plainTextArray, preKeyBundles)) {
      const encryptedAsset = await AssetCryptography.encryptAsset(plainTextArray);

      await this.sendExternalGenericMessage(this.clientID, conversationId, encryptedAsset, preKeyBundles);
      return payloadBundle;
    }

    const encryptedPayload = await this.cryptographyService.encrypt(plainTextArray, preKeyBundles);

    await this.sendOTRMessage(this.clientID, conversationId, encryptedPayload, plainTextArray);
    return payloadBundle;
  }

  private shouldSendAsExternal(plainText: Uint8Array, preKeyBundles: UserPreKeyBundleMap): boolean {
    const EXTERNAL_MESSAGE_THRESHOLD_BYTES = 200 * 1024;

    let clientCount = 0;
    for (const user in preKeyBundles) {
      clientCount += Object.keys(preKeyBundles[user]).length;
    }

    const messageInBytes = new Uint8Array(plainText).length;
    const estimatedPayloadInBytes = clientCount * messageInBytes;

    return estimatedPayloadInBytes > EXTERNAL_MESSAGE_THRESHOLD_BYTES;
  }

  public async clearConversation(
    conversationId: string,
    timestamp: number | Date = new Date()
  ): Promise<PayloadBundleOutgoing> {
    const messageId = ConversationService.createId();

    if (timestamp instanceof Date) {
      timestamp = timestamp.getTime();
    }

    const clearedMessage = Cleared.create({
      clearedTimestamp: timestamp,
      conversationId,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.CLEARED]: clearedMessage,
      messageId,
    });

    const {id: selfConversationId} = await this.getSelfConversation();

    await this.sendGenericMessage(this.clientID, selfConversationId, genericMessage);

    return {
      conversation: conversationId,
      from: this.apiClient.context!.userId,
      id: messageId,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
      timestamp: Date.now(),
      type: PayloadBundleType.CLEARED,
    };
  }

  public createEditedText(
    newMessageText: string,
    originalMessageId: string,
    messageId: string = ConversationService.createId()
  ): TextContentBuilder {
    const content: EditedTextContent = {
      originalMessageId,
      text: newMessageText,
    };

    const payloadBundle: PayloadBundleOutgoingUnsent = {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.MESSAGE_EDIT,
    };

    return new TextContentBuilder(payloadBundle);
  }

  public async createFileData(file: FileContent, messageId: string): Promise<PayloadBundleOutgoingUnsent> {
    const imageAsset = await this.assetService.uploadFileAsset(file);

    const content: FileAssetContent = {
      asset: imageAsset,
      file,
    };

    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET,
    };
  }

  public createFileMetadata(
    metaData: FileMetaDataContent,
    messageId: string = ConversationService.createId()
  ): PayloadBundleOutgoingUnsent {
    const content: FileAssetMetaDataContent = {
      metaData,
    };

    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET_META,
    };
  }

  public async createFileAbort(reason: AbortReason, messageId: string): Promise<PayloadBundleOutgoingUnsent> {
    const content: FileAssetAbortContent = {
      reason,
    };

    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET_ABORT,
    };
  }

  public static createId(): string {
    return new UUID(4).format();
  }

  public async createImage(
    image: ImageContent,
    messageId: string = ConversationService.createId()
  ): Promise<PayloadBundleOutgoingUnsent> {
    const imageAsset = await this.assetService.uploadImageAsset(image);

    const content: ImageAssetContent = {
      asset: imageAsset,
      image,
    };

    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET_IMAGE,
    };
  }

  public async createLinkPreview(linkPreview: LinkPreviewContent): Promise<LinkPreviewUploadedContent> {
    const linkPreviewUploaded: LinkPreviewUploadedContent = {
      ...linkPreview,
    };

    const linkPreviewImage = linkPreview.image;

    if (linkPreviewImage) {
      const imageAsset = await this.assetService.uploadImageAsset(linkPreviewImage);

      delete linkPreviewUploaded.image;

      linkPreviewUploaded.imageUploaded = {
        asset: imageAsset,
        image: linkPreviewImage,
      };
    }

    return linkPreviewUploaded;
  }

  public createLocation(
    location: LocationContent,
    messageId: string = ConversationService.createId()
  ): PayloadBundleOutgoingUnsent {
    return {
      content: location,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.LOCATION,
    };
  }

  public createReaction(
    originalMessageId: string,
    type: ReactionType,
    messageId: string = ConversationService.createId()
  ): PayloadBundleOutgoingUnsent {
    const content: ReactionContent = {originalMessageId, type};

    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.REACTION,
    };
  }

  public createText(text: string, messageId: string = ConversationService.createId()): TextContentBuilder {
    const content: TextContent = {text};

    const payloadBundle: PayloadBundleOutgoingUnsent = {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.TEXT,
    };

    return new TextContentBuilder(payloadBundle);
  }

  public createConfirmation(
    confirmMessageId: string,
    messageId: string = ConversationService.createId()
  ): PayloadBundleOutgoingUnsent {
    const content: ConfirmationContent = {confirmMessageId};
    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.CONFIRMATION,
    };
  }

  public createPing(messageId: string = ConversationService.createId()): PayloadBundleOutgoingUnsent {
    return {
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.PING,
    };
  }

  public createSessionReset(messageId: string = ConversationService.createId()): PayloadBundleOutgoingUnsent {
    const content: ClientActionContent = {
      clientAction: ClientAction.RESET_SESSION,
    };
    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.CLIENT_ACTION,
    };
  }

  public async deleteMessageLocal(conversationId: string, messageIdToHide: string): Promise<PayloadBundleOutgoing> {
    const messageId = ConversationService.createId();

    const messageHide = MessageHide.create({
      conversationId,
      messageId: messageIdToHide,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.HIDDEN]: messageHide,
      messageId,
    });

    const {id: selfConversationId} = await this.getSelfConversation();

    await this.sendGenericMessage(this.clientID, selfConversationId, genericMessage);

    return {
      conversation: conversationId,
      from: this.apiClient.context!.userId,
      id: messageId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
      timestamp: Date.now(),
      type: PayloadBundleType.MESSAGE_HIDE,
    };
  }

  public async deleteMessageEveryone(
    conversationId: string,
    messageIdToDelete: string,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    const messageId = ConversationService.createId();

    const messageDelete = MessageDelete.create({
      messageId: messageIdToDelete,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.DELETED]: messageDelete,
      messageId,
    });

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage, userIds);

    return {
      conversation: conversationId,
      from: this.apiClient.context!.userId,
      id: messageId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
      timestamp: Date.now(),
      type: PayloadBundleType.MESSAGE_DELETE,
    };
  }

  public leaveConversation(conversationId: string): Promise<ConversationMemberLeaveEvent> {
    return this.apiClient.conversation.api.deleteMember(conversationId, this.apiClient.context!.userId);
  }

  public async leaveConversations(conversationIds?: string[]): Promise<ConversationMemberLeaveEvent[]> {
    if (!conversationIds) {
      const conversation = await this.getConversations();
      conversationIds = conversation
        .filter(conversation => conversation.type === CONVERSATION_TYPE.REGULAR)
        .map(conversation => conversation.id);
    }

    return Promise.all(conversationIds.map(conversationId => this.leaveConversation(conversationId)));
  }

  public createConversation(name: string, otherUserIds: string | string[] = []): Promise<Conversation> {
    const ids = typeof otherUserIds === 'string' ? [otherUserIds] : otherUserIds;

    const newConversation: NewConversation = {
      name,
      users: ids,
    };

    return this.apiClient.conversation.api.postConversation(newConversation);
  }

  public async getConversations(conversationId: string): Promise<Conversation>;
  public async getConversations(conversationId?: string[]): Promise<Conversation[]>;
  public async getConversations(conversationId?: string | string[]): Promise<Conversation[] | Conversation> {
    if (!conversationId || !conversationId.length) {
      return this.apiClient.conversation.api.getAllConversations();
    }
    if (typeof conversationId === 'string') {
      return this.apiClient.conversation.api.getConversation(conversationId);
    }
    return this.apiClient.conversation.api.getConversationsByIds(conversationId);
  }

  public async getAsset({assetId, assetToken, otrKey, sha256}: RemoteData): Promise<Buffer> {
    const encryptedBuffer = await this.apiClient.asset.api.getAsset(assetId, assetToken);

    return AssetCryptography.decryptAsset({
      cipherText: Buffer.from(encryptedBuffer),
      keyBytes: Buffer.from(otrKey),
      sha256: Buffer.from(sha256),
    });
  }

  public async addUser(conversationId: string, userId: string): Promise<string>;
  public async addUser(conversationId: string, userIds: string[]): Promise<string[]>;
  public async addUser(conversationId: string, userIds: string | string[]): Promise<string | string[]> {
    const ids = typeof userIds === 'string' ? [userIds] : userIds;
    await this.apiClient.conversation.api.postMembers(conversationId, ids);
    return userIds;
  }

  public async removeUser(conversationId: string, userId: string): Promise<string> {
    await this.apiClient.conversation.api.deleteMember(conversationId, userId);
    return userId;
  }

  public async send(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent,
    userIds?: string[]
  ): Promise<PayloadBundleOutgoing> {
    switch (payloadBundle.type) {
      case PayloadBundleType.ASSET:
        return this.sendFileData(conversationId, payloadBundle, userIds);
      case PayloadBundleType.ASSET_ABORT:
        return this.sendFileAbort(conversationId, payloadBundle, userIds);
      case PayloadBundleType.ASSET_META:
        return this.sendFileMetaData(conversationId, payloadBundle, userIds);
      case PayloadBundleType.ASSET_IMAGE:
        return this.sendImage(conversationId, payloadBundle, userIds);
      case PayloadBundleType.CLIENT_ACTION: {
        if (payloadBundle.content === ClientAction.RESET_SESSION) {
          return this.sendSessionReset(conversationId, payloadBundle, userIds);
        }
        throw new Error(
          `No send method implemented for "${payloadBundle.type}" and ClientAction "${payloadBundle.content}".`
        );
      }
      case PayloadBundleType.CONFIRMATION:
        return this.sendConfirmation(conversationId, payloadBundle, userIds);
      case PayloadBundleType.LOCATION:
        return this.sendLocation(conversationId, payloadBundle, userIds);
      case PayloadBundleType.MESSAGE_EDIT:
        return this.sendEditedText(conversationId, payloadBundle, userIds);
      case PayloadBundleType.PING:
        return this.sendPing(conversationId, payloadBundle, userIds);
      case PayloadBundleType.REACTION:
        return this.sendReaction(conversationId, payloadBundle, userIds);
      case PayloadBundleType.TEXT:
        return this.sendText(conversationId, payloadBundle, userIds);
      default:
        throw new Error(`No send method implemented for "${payloadBundle.type}".`);
    }
  }

  public sendTypingStart(conversationId: string): Promise<void> {
    return this.apiClient.conversation.api.postTyping(conversationId, {status: CONVERSATION_TYPING.STARTED});
  }

  public sendTypingStop(conversationId: string): Promise<void> {
    return this.apiClient.conversation.api.postTyping(conversationId, {status: CONVERSATION_TYPING.STOPPED});
  }

  public setClientID(clientID: string) {
    this.clientID = clientID;
  }

  public async toggleArchiveConversation(
    conversationId: string,
    newState: boolean,
    archiveTimestamp: number | Date = new Date()
  ): Promise<void> {
    const payload = {
      otr_archived: newState,
      otr_archived_ref: new Date(archiveTimestamp).toISOString(),
    };

    await this.apiClient.conversation.api.putMembershipProperties(conversationId, payload);
  }
}

export {ConversationService};
