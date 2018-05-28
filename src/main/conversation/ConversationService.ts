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

const UUID = require('pure-uuid');
import APIClient = require('@wireapp/api-client');
import {
  ClientMismatch,
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/index';
import {CONVERSATION_TYPING} from '@wireapp/api-client/dist/commonjs/event/index';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/index';
import {AxiosError} from 'axios';
import {Encoder} from 'bazinga64';
import {AssetService, ConfirmationType, Image, RemoteData} from '../conversation/root';
import * as AssetCryptography from '../cryptography/AssetCryptography.node';
import {CryptographyService, EncryptedAsset} from '../cryptography/root';

export default class ConversationService {
  private clientID: string = '';

  constructor(
    private readonly apiClient: APIClient,
    private readonly protocolBuffers: any = {},
    private readonly cryptographyService: CryptographyService,
    private readonly assetService: AssetService
  ) {}

  public async sendConfirmation(conversationId: string, confirmMessageId: string): Promise<string> {
    const messageId = new UUID(4).format();
    const confirmation = this.protocolBuffers.Confirmation.create({
      firstMessageId: confirmMessageId,
      type: ConfirmationType.DELIVERED,
    });

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      confirmation,
      messageId,
    });

    await this.sendGenericMessage(this.clientID, conversationId, genericMessage);
    return messageId;
  }

  public async getImage({assetId, otrKey, sha256, assetToken}: RemoteData): Promise<Buffer> {
    const encryptedBuffer = await this.apiClient.asset.api.getAsset(assetId, assetToken);
    return AssetCryptography.decryptAsset({
      cipherText: Buffer.from(encryptedBuffer),
      keyBytes: Buffer.from(otrKey.buffer),
      sha256: Buffer.from(sha256.buffer),
    });
  }

  public async sendTextMessage(conversationId: string, message: string): Promise<string> {
    const messageId = new UUID(4).format();
    const customTextMessage = this.protocolBuffers.GenericMessage.create({
      messageId,
      text: this.protocolBuffers.Text.create({content: message}),
    });

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(customTextMessage).finish();

    if (this.shouldSendAsExternal(plainTextBuffer, <UserPreKeyBundleMap>preKeyBundles)) {
      const payload: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

      await this.sendExternalGenericMessage(this.clientID, conversationId, payload, <UserPreKeyBundleMap>preKeyBundles);
      return messageId;
    }

    const payload: OTRRecipients = await this.cryptographyService.encrypt(plainTextBuffer, <UserPreKeyBundleMap>(
      preKeyBundles
    ));

    await this.sendMessage(this.clientID, conversationId, payload);
    return messageId;
  }

  public async sendImage(conversationId: string, image: Image): Promise<string> {
    const imageAsset = await this.assetService.uploadImageAsset(image);
    const messageId = new UUID(4).format();

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      asset: imageAsset,
      messageId,
    });

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(genericMessage).finish();
    const payload: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, <UserPreKeyBundleMap>preKeyBundles);
    return messageId;
  }

  public async sendPing(conversationId: string): Promise<string> {
    const messageId = new UUID(4).format();
    const knock = this.protocolBuffers.Knock.create();
    const ping = this.protocolBuffers.GenericMessage.create({
      knock,
      messageId,
    });

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(ping).finish();
    const payload: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, <UserPreKeyBundleMap>preKeyBundles);
    return messageId;
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

  public async updateTextMessage(
    conversationId: string,
    originalMessageId: string,
    newMessage: string
  ): Promise<string> {
    const messageId = new UUID(4).format();

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

    await this.sendExternalGenericMessage(this.clientID, conversationId, payload, <UserPreKeyBundleMap>preKeyBundles);
    return messageId;
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

  private sendMessage(
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

  private async sendExternalGenericMessage(
    sendingClientId: string,
    conversationId: string,
    asset: EncryptedAsset,
    preKeyBundles: UserPreKeyBundleMap
  ): Promise<ClientMismatch> {
    const {cipherText, keyBytes, sha256} = asset;
    const messageId = new UUID(4).format();

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
    const recipients = await this.cryptographyService.encrypt(plainTextBuffer, <UserPreKeyBundleMap>preKeyBundles);

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
    const recipients = await this.cryptographyService.encrypt(plainTextBuffer, <UserPreKeyBundleMap>preKeyBundles);

    return this.sendMessage(sendingClientId, conversationId, recipients);
  }

  // TODO: The correct functionality of this function is heavily based on the case that it always runs into the catch block
  private getPreKeyBundles(conversationId: string): Promise<ClientMismatch | UserPreKeyBundleMap> {
    return this.apiClient.conversation.api.postOTRMessage(this.clientID, conversationId).catch((error: AxiosError) => {
      if (error.response && error.response.status === 412) {
        const recipients: UserClients = error.response.data.missing;
        return this.apiClient.user.api.postMultiPreKeyBundles(recipients);
      }
      throw error;
    });
  }
}
