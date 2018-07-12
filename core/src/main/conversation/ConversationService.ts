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
  ClientMismatch,
  Conversation,
  CONVERSATION_TYPE,
  NewConversation,
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/';
import {CONVERSATION_TYPING, ConversationMemberLeaveEvent} from '@wireapp/api-client/dist/commonjs/event/';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/index';
import {AxiosError} from 'axios';
import {Encoder} from 'bazinga64';
import {
  AssetService,
  ClientActionType,
  ConfirmationType,
  GenericMessageType,
  MessageTimer,
  PayloadBundleOutgoing,
  PayloadBundleOutgoingUnsent,
  PayloadBundleState,
} from '../conversation/root';

import {
  ClientActionContent,
  ConfirmationContent,
  ImageAssetContent,
  ImageContent,
  RemoteData,
  TextContent,
} from '../conversation/content/';

import * as AssetCryptography from '../cryptography/AssetCryptography.node';
import {CryptographyService, EncryptedAsset} from '../cryptography/root';

const UUID = require('pure-uuid');
import APIClient = require('@wireapp/api-client');

export default class ConversationService {
  private clientID: string = '';
  public readonly messageTimer: MessageTimer;

  constructor(
    private readonly apiClient: APIClient,
    private readonly protocolBuffers: any = {},
    private readonly cryptographyService: CryptographyService,
    private readonly assetService: AssetService
  ) {
    this.messageTimer = new MessageTimer();
  }

  private createEphemeral(originalGenericMessage: any, expireAfterMillis: number): any {
    const ephemeralMessage = this.protocolBuffers.Ephemeral.create({
      expireAfterMillis,
      [originalGenericMessage.content]: originalGenericMessage[originalGenericMessage.content],
    });

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      [GenericMessageType.EPHEMERAL]: ephemeralMessage,
      messageId: originalGenericMessage.messageId,
    });

    return genericMessage;
  }

  // TODO: The correct functionality of this function is heavily based on the case that it always runs into the catch
  // block
  private getPreKeyBundles(conversationId: string): Promise<ClientMismatch | UserPreKeyBundleMap> {
    return this.apiClient.conversation.api.postOTRMessage(this.clientID, conversationId).catch((error: AxiosError) => {
      if (error.response && error.response.status === 412) {
        const recipients: UserClients = error.response.data.missing;
        return this.apiClient.user.api.postMultiPreKeyBundles(recipients);
      }
      throw error;
    });
  }

  private getSelfConversation(): Promise<Conversation> {
    const {userId} = this.apiClient.context!;
    return this.apiClient.conversation.api.getConversation(userId);
  }

  private async sendConfirmation(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent
  ): Promise<PayloadBundleOutgoing> {
    const confirmationMessage = this.protocolBuffers.Confirmation.create({
      firstMessageId: (payloadBundle.content as ConfirmationContent).confirmMessageId,
      type: ConfirmationType.DELIVERED,
    });

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      [GenericMessageType.CONFIRMATION]: confirmationMessage,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage);

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
  ): Promise<ClientMismatch> {
    const {cipherText, keyBytes, sha256} = asset;
    const messageId = ConversationService.createId();

    const externalMessage = this.protocolBuffers.External.create({
      otrKey: new Uint8Array(keyBytes),
      sha256: new Uint8Array(sha256),
    });

    const base64CipherText = Encoder.toBase64(cipherText).asString;

    const customTextMessage = this.protocolBuffers.GenericMessage.create({
      external: externalMessage,
      messageId,
    });

    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(customTextMessage).finish();
    const recipients = await this.cryptographyService.encrypt(plainTextBuffer, preKeyBundles as UserPreKeyBundleMap);

    const message: NewOTRMessage = {
      data: base64CipherText,
      recipients,
      sender: sendingClientId,
    };

    return this.apiClient.conversation.api.postOTRMessage(sendingClientId, conversationId, message);
  }

  private async sendGenericMessage(
    sendingClientId: string,
    conversationId: string,
    genericMessage: any
  ): Promise<ClientMismatch> {
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(genericMessage).finish();
    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const recipients = await this.cryptographyService.encrypt(plainTextBuffer, preKeyBundles as UserPreKeyBundleMap);

    return this.sendOTRMessage(sendingClientId, conversationId, recipients);
  }

  private async sendImage(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent
  ): Promise<PayloadBundleOutgoing> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendImage provided!');
    }

    const encryptedAsset = payloadBundle.content as ImageAssetContent;

    const imageMetadata = this.protocolBuffers.Asset.ImageMetaData.create({
      height: encryptedAsset.image.height,
      width: encryptedAsset.image.width,
    });

    const original = this.protocolBuffers.Asset.Original.create({
      [GenericMessageType.IMAGE]: imageMetadata,
      mimeType: encryptedAsset.image.type,
      name: null,
      size: encryptedAsset.image.data.length,
    });

    const remoteData = this.protocolBuffers.Asset.RemoteData.create({
      assetId: encryptedAsset.asset.key,
      assetToken: encryptedAsset.asset.token,
      otrKey: encryptedAsset.asset.keyBytes,
      sha256: encryptedAsset.asset.sha256,
    });

    const assetMessage = this.protocolBuffers.Asset.create({
      original,
      uploaded: remoteData,
    });

    let genericMessage = this.protocolBuffers.GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(genericMessage).finish();
    const payload: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, preKeyBundles as UserPreKeyBundleMap);
    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private sendOTRMessage(
    sendingClientId: string,
    conversationId: string,
    recipients: OTRRecipients
  ): Promise<ClientMismatch> {
    const message: NewOTRMessage = {
      recipients,
      sender: sendingClientId,
    };
    return this.apiClient.conversation.api.postOTRMessage(sendingClientId, conversationId, message);
  }

  private async sendPing(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent
  ): Promise<PayloadBundleOutgoing> {
    let genericMessage = this.protocolBuffers.GenericMessage.create({
      [GenericMessageType.KNOCK]: this.protocolBuffers.Knock.create(),
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendSessionReset(
    conversationId: string,
    payloadBundle: PayloadBundleOutgoingUnsent
  ): Promise<PayloadBundleOutgoing> {
    const sessionReset = this.protocolBuffers.GenericMessage.create({
      [GenericMessageType.CLIENT_ACTION]: ClientActionType.RESET_SESSION,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(this.clientID, conversationId, sessionReset);

    return {
      ...payloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendText(
    conversationId: string,
    originalPayloadBundle: PayloadBundleOutgoingUnsent
  ): Promise<PayloadBundleOutgoing> {
    const payloadBundle: PayloadBundleOutgoing = {
      ...originalPayloadBundle,
      conversation: conversationId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
    };

    let genericMessage = this.protocolBuffers.GenericMessage.create({
      messageId: payloadBundle.id,
      [GenericMessageType.TEXT]: this.protocolBuffers.Text.create({
        content: (payloadBundle.content as TextContent).text,
      }),
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(conversationId);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(genericMessage).finish();

    if (this.shouldSendAsExternal(plainTextBuffer, preKeyBundles as UserPreKeyBundleMap)) {
      const encryptedAsset: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

      await this.sendExternalGenericMessage(
        this.clientID,
        conversationId,
        encryptedAsset,
        preKeyBundles as UserPreKeyBundleMap
      );
      return payloadBundle;
    }

    const payload: OTRRecipients = await this.cryptographyService.encrypt(
      plainTextBuffer,
      preKeyBundles as UserPreKeyBundleMap
    );

    await this.sendOTRMessage(this.clientID, conversationId, payload);
    return payloadBundle;
  }

  private shouldSendAsExternal(plainText: Buffer, preKeyBundles: UserPreKeyBundleMap): boolean {
    const EXTERNAL_MESSAGE_THRESHOLD_BYTES = 200 * 1024;

    let clientCount = 0;
    for (const user in preKeyBundles) {
      clientCount += Object.keys(preKeyBundles[user]).length;
    }

    const messageInBytes = new Uint8Array(plainText).length;
    const estimatedPayloadInBytes = clientCount * messageInBytes;

    return estimatedPayloadInBytes > EXTERNAL_MESSAGE_THRESHOLD_BYTES;
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
      type: GenericMessageType.ASSET,
    };
  }

  public createText(text: string, messageId: string = ConversationService.createId()): PayloadBundleOutgoingUnsent {
    const content: TextContent = {text};

    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: GenericMessageType.TEXT,
    };
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
      type: GenericMessageType.CONFIRMATION,
    };
  }

  public createPing(messageId: string = ConversationService.createId()): PayloadBundleOutgoingUnsent {
    return {
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: GenericMessageType.KNOCK,
    };
  }

  public createSessionReset(messageId: string = ConversationService.createId()): PayloadBundleOutgoingUnsent {
    const content: ClientActionContent = {
      clientAction: ClientActionType.RESET_SESSION,
    };
    return {
      content,
      from: this.apiClient.context!.userId,
      id: messageId,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: GenericMessageType.CLIENT_ACTION,
    };
  }

  public async deleteMessageLocal(conversationId: string, messageIdToHide: string): Promise<PayloadBundleOutgoing> {
    const messageId = new UUID(4).format();

    const messageHide = this.protocolBuffers.MessageHide.create({
      conversationId,
      messageId: messageIdToHide,
    });

    const genericMessage = this.protocolBuffers.GenericMessage.create({
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
      type: GenericMessageType.HIDDEN,
    };
  }

  public async deleteMessageEveryone(
    conversationId: string,
    messageIdToDelete: string
  ): Promise<PayloadBundleOutgoing> {
    const messageId = new UUID(4).format();

    const messageDelete = this.protocolBuffers.MessageDelete.create({
      messageId: messageIdToDelete,
    });

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      [GenericMessageType.DELETED]: messageDelete,
      messageId,
    });

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage);

    return {
      conversation: conversationId,
      from: this.apiClient.context!.userId,
      id: messageId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      state: PayloadBundleState.OUTGOING_SENT,
      timestamp: Date.now(),
      type: GenericMessageType.DELETED,
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

  public async getImage({assetId, otrKey, sha256, assetToken}: RemoteData): Promise<Buffer> {
    const encryptedBuffer = await this.apiClient.asset.api.getAsset(assetId, assetToken);
    return AssetCryptography.decryptAsset({
      cipherText: Buffer.from(encryptedBuffer),
      keyBytes: Buffer.from(otrKey.buffer),
      sha256: Buffer.from(sha256.buffer),
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
    payloadBundle: PayloadBundleOutgoingUnsent
  ): Promise<PayloadBundleOutgoing> {
    switch (payloadBundle.type) {
      case GenericMessageType.ASSET: {
        if (payloadBundle.content) {
          if ((payloadBundle.content as ImageAssetContent).image) {
            return this.sendImage(conversationId, payloadBundle);
          }
          throw new Error(`No send method implemented for sending other assets than images.`);
        }
        throw new Error(`No send method implemented for "${payloadBundle.type}" without content".`);
      }
      case GenericMessageType.CLIENT_ACTION: {
        if (payloadBundle.content === ClientActionType.RESET_SESSION) {
          return this.sendSessionReset(conversationId, payloadBundle);
        }
        throw new Error(
          `No send method implemented for "${payloadBundle.type}" and ClientAction "${payloadBundle.content}".`
        );
      }
      case GenericMessageType.CONFIRMATION:
        return this.sendConfirmation(conversationId, payloadBundle);
      case GenericMessageType.KNOCK:
        return this.sendPing(conversationId, payloadBundle);
      case GenericMessageType.TEXT:
        return this.sendText(conversationId, payloadBundle);
      default:
        throw new Error(`No send method implemented for "${payloadBundle.type}."`);
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

  public async updateText(conversationId: string, originalMessageId: string, newMessage: string): Promise<string> {
    const messageId = ConversationService.createId();

    const editedMessage = this.protocolBuffers.MessageEdit.create({
      replacingMessageId: originalMessageId,
      text: this.protocolBuffers.Text.create({content: newMessage}),
    });

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      edited: editedMessage,
      messageId,
    });

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(genericMessage).finish();
    const payload: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, preKeyBundles as UserPreKeyBundleMap);
    return messageId;
  }
}
