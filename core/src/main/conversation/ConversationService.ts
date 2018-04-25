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
import {Encoder} from 'bazinga64';
import {AxiosError} from 'axios';
import {
  ClientMismatch,
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/index';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/index';
import {CryptographyService, EncryptedAsset} from '../cryptography/root';
import {AssetService, ConfirmationType, Image, RemoteData} from '../conversation/root';
import * as AssetCryptography from '../cryptography/AssetCryptography.node';

export default class ConversationService {
  private clientID: string = '';

  constructor(
    private apiClient: APIClient,
    private protocolBuffers: any = {},
    private cryptographyService: CryptographyService,
    private assetService: AssetService
  ) {}

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

  public async sendConfirmation(conversationId: string, messageId: string): Promise<ClientMismatch> {
    const confirmation = this.protocolBuffers.Confirmation.create({
      type: ConfirmationType.DELIVERED,
      firstMessageId: messageId,
    });

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      confirmation,
      messageId: new UUID(4).format(),
    });

    return this.sendGenericMessage(this.clientID, conversationId, genericMessage);
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

  private async sendExternalGenericMessage(
    sendingClientId: string,
    conversationId: string,
    asset: EncryptedAsset,
    preKeyBundles: UserPreKeyBundleMap
  ): Promise<ClientMismatch> {
    const {cipherText, keyBytes, sha256} = asset;

    const externalMessage = this.protocolBuffers.External.create({
      otrKey: new Uint8Array(keyBytes),
      sha256: new Uint8Array(sha256),
    });

    const base64CipherText = Encoder.toBase64(cipherText).asString;

    const customTextMessage = this.protocolBuffers.GenericMessage.create({
      external: externalMessage,
      messageId: new UUID(4).format(),
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

  public async getImage({assetId, otrKey, sha256, assetToken}: RemoteData): Promise<Buffer> {
    const encryptedBuffer = await this.apiClient.asset.api.getAsset(assetId, assetToken);
    return AssetCryptography.decryptAsset({
      cipherText: new Buffer(encryptedBuffer),
      keyBytes: new Buffer(otrKey),
      sha256: new Buffer(sha256),
    });
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

  public async sendTextMessage(conversationId: string, message: string): Promise<ClientMismatch> {
    const customTextMessage = this.protocolBuffers.GenericMessage.create({
      messageId: new UUID(4).format(),
      text: this.protocolBuffers.Text.create({content: message}),
    });

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(customTextMessage).finish();

    if (this.shouldSendAsExternal(plainTextBuffer, <UserPreKeyBundleMap>preKeyBundles)) {
      const payload: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

      return this.sendExternalGenericMessage(
        this.clientID,
        conversationId,
        payload,
        <UserPreKeyBundleMap>preKeyBundles
      );
    }

    const payload: OTRRecipients = await this.cryptographyService.encrypt(
      plainTextBuffer,
      <UserPreKeyBundleMap>preKeyBundles
    );

    return this.sendMessage(this.clientID, conversationId, payload);
  }

  public async sendImage(conversationId: string, image: Image): Promise<ClientMismatch> {
    const imageAsset = await this.assetService.uploadImageAsset(image);

    const genericMessage = this.protocolBuffers.GenericMessage.create({
      messageId: new UUID(4).format(),
      asset: imageAsset,
    });

    const preKeyBundles = await this.getPreKeyBundles(conversationId);
    const plainTextBuffer: Buffer = this.protocolBuffers.GenericMessage.encode(genericMessage).finish();
    const payload: EncryptedAsset = await AssetCryptography.encryptAsset(plainTextBuffer);

    return this.sendExternalGenericMessage(this.clientID, conversationId, payload, <UserPreKeyBundleMap>preKeyBundles);
  }

  public setClientID(clientID: string) {
    this.clientID = clientID;
  }

  private shouldSendAsExternal(plainText: Buffer, preKeyBundles: UserPreKeyBundleMap): boolean {
    const EXTERNAL_MESSAGE_THRESHOLD_BYTES = 200 * 1024;

    let clientCount = 0;
    for (const user in preKeyBundles) {
      for (const device in preKeyBundles[user]) {
        clientCount++;
      }
    }

    const messageInBytes = new Uint8Array(plainText).length;
    const estimatedPayloadInBytes = clientCount * messageInBytes;

    return estimatedPayloadInBytes > EXTERNAL_MESSAGE_THRESHOLD_BYTES;
  }
}
