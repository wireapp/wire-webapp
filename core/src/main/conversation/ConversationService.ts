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

import type {APIClient} from '@wireapp/api-client';
import {
  MessageSendingStatus,
  Conversation,
  CONVERSATION_TYPE,
  DefaultConversationRoleName,
  MutedStatus,
  NewConversation,
  QualifiedUserClients,
  UserClients,
  ClientMismatch,
} from '@wireapp/api-client/src/conversation/';
import {CONVERSATION_TYPING, ConversationMemberUpdateData} from '@wireapp/api-client/src/conversation/data/';
import type {ConversationMemberLeaveEvent} from '@wireapp/api-client/src/event/';
import type {QualifiedId, QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/src/user/';
import {
  Asset,
  ButtonAction,
  ButtonActionConfirmation,
  Calling,
  Cleared,
  ClientAction,
  Composite,
  Confirmation,
  Ephemeral,
  GenericMessage,
  Knock,
  Location,
  MessageDelete,
  MessageEdit,
  MessageHide,
  Reaction,
} from '@wireapp/protocol-messaging';
import {Encoder} from 'bazinga64';

import {
  AssetService,
  AssetTransferState,
  GenericMessageType,
  MessageTimer,
  PayloadBundleSource,
  PayloadBundleState,
  PayloadBundleType,
} from '../conversation/';
import type {AssetContent, ClearedContent, DeletedContent, HiddenContent, RemoteData} from '../conversation/content/';
import type {CryptographyService, EncryptedAsset} from '../cryptography/';
import * as AssetCryptography from '../cryptography/AssetCryptography.node';
import {isStringArray, isQualifiedIdArray, isQualifiedUserClients, isUserClients} from '../util/TypePredicateUtil';
import {MessageBuilder} from './message/MessageBuilder';
import {MessageService} from './message/MessageService';
import {MessageToProtoMapper} from './message/MessageToProtoMapper';
import type {
  ButtonActionConfirmationMessage,
  ButtonActionMessage,
  CallMessage,
  ClearConversationMessage,
  CompositeMessage,
  ConfirmationMessage,
  DeleteMessage,
  EditedTextMessage,
  FileAssetAbortMessage,
  FileAssetMessage,
  FileAssetMetaDataMessage,
  HideMessage,
  ImageAssetMessage,
  ImageAssetMessageOutgoing,
  LocationMessage,
  OtrMessage,
  PingMessage,
  ReactionMessage,
  ResetSessionMessage,
  TextMessage,
} from './message/OtrMessage';

export interface MessageSendingCallbacks {
  onStart?: (message: GenericMessage) => void;
  onSuccess?: (message: GenericMessage, sentTime?: string) => void;
}

export class ConversationService {
  public readonly messageTimer: MessageTimer;
  public readonly messageBuilder: MessageBuilder;
  private readonly messageService: MessageService;

  constructor(
    private readonly apiClient: APIClient,
    private readonly cryptographyService: CryptographyService,
    private readonly assetService: AssetService,
  ) {
    this.messageTimer = new MessageTimer();
    this.messageBuilder = new MessageBuilder(this.apiClient, this.assetService);
    this.messageService = new MessageService(this.apiClient, this.cryptographyService);
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

  private async getQualifiedPreKeyBundle(
    conversationId: string,
    conversationDomain: string,
    userIds?: QualifiedId[] | QualifiedUserClients,
  ): Promise<QualifiedUserPreKeyBundleMap> {
    let members: QualifiedId[] = [];

    if (userIds) {
      if (isQualifiedIdArray(userIds)) {
        members = userIds;
      } else {
        members = Object.entries(userIds).reduce<QualifiedId[]>((accumulator, [domain, userClients]) => {
          accumulator.push(...Object.keys(userClients).map(userId => ({domain, id: userId})));
          return accumulator;
        }, []);
      }
    }

    if (!members.length) {
      const conversation = await this.apiClient.conversation.api.getConversation(conversationId, conversationDomain);
      /*
       * If you are sending a message to a conversation, you have to include
       * yourself in the list of users if you want to sync a message also to your
       * other clients.
       */
      members = conversation.members.others
        .filter(member => !!member.qualified_id)
        .map(member => member.qualified_id!)
        // TODO(Federation): Use 'domain' from 'conversation.members.self' when backend has it implemented
        .concat({domain: this.apiClient.context!.domain!, id: conversation.members.self.id});
    }

    const preKeys = await Promise.all(
      members.map(async qualifiedUserId => {
        const prekeyBundle = await this.apiClient.user.api.getUserPreKeys(qualifiedUserId);
        return {user: qualifiedUserId, clients: prekeyBundle.clients};
      }),
    );

    return preKeys.reduce<QualifiedUserPreKeyBundleMap>((bundleMap, qualifiedPrekey) => {
      bundleMap[qualifiedPrekey.user.domain] ||= {};
      for (const client of qualifiedPrekey.clients) {
        bundleMap[qualifiedPrekey.user.domain][qualifiedPrekey.user.id] ||= {};
        bundleMap[qualifiedPrekey.user.domain][qualifiedPrekey.user.id][client.client] = client.prekey;
      }
      return bundleMap;
    }, {});
  }

  async getPreKeyBundleMap(conversationId: string, userIds?: string[] | UserClients): Promise<UserPreKeyBundleMap> {
    let members: string[] = [];

    if (userIds) {
      if (isStringArray(userIds)) {
        members = userIds;
      } else if (isUserClients(userIds)) {
        members = Object.keys(userIds);
      }
    }

    if (!members.length) {
      const conversation = await this.apiClient.conversation.api.getConversation(conversationId);
      /*
       * If you are sending a message to a conversation, you have to include
       * yourself in the list of users if you want to sync a message also to your
       * other clients.
       */
      members = conversation.members.others.map(member => member.id).concat(conversation.members.self.id);
    }

    const preKeys = await Promise.all(members.map(member => this.apiClient.user.api.getUserPreKeys(member)));

    return preKeys.reduce((bundleMap: UserPreKeyBundleMap, bundle) => {
      const userId = bundle.user;
      bundleMap[userId] ||= {};
      for (const client of bundle.clients) {
        bundleMap[userId][client.client] = client.prekey;
      }
      return bundleMap;
    }, {});
  }

  private getSelfConversation(): Promise<Conversation> {
    const {userId} = this.apiClient.context!;
    return this.apiClient.conversation.api.getConversation(userId);
  }

  private async sendExternalGenericMessage(
    sendingClientId: string,
    conversationId: string,
    asset: EncryptedAsset,
    preKeyBundles: UserPreKeyBundleMap,
    sendAsProtobuf?: boolean,
  ): Promise<ClientMismatch | undefined> {
    if (preKeyBundles.none) {
      const {cipherText, keyBytes, sha256} = asset;
      const messageId = MessageBuilder.createId();

      const externalMessage = {
        otrKey: new Uint8Array(keyBytes),
        sha256: new Uint8Array(sha256),
      };

      const base64CipherText = Encoder.toBase64(cipherText).asString;

      const genericMessage = GenericMessage.create({
        [GenericMessageType.EXTERNAL]: externalMessage,
        messageId,
      });

      const plainTextArray = GenericMessage.encode(genericMessage).finish();

      const recipients = await this.cryptographyService.encrypt(plainTextArray, preKeyBundles);

      if (sendAsProtobuf) {
        return this.messageService.sendOTRProtobufMessage(
          sendingClientId,
          recipients,
          conversationId,
          plainTextArray,
          cipherText,
        );
      }
      return this.messageService.sendOTRMessage(
        sendingClientId,
        recipients,
        conversationId,
        plainTextArray,
        base64CipherText,
      );

      // todo: add federated sending here
    }
    return undefined;
  }

  private async sendFederatedGenericMessage(
    sendingClientId: string,
    conversationId: string,
    conversationDomain: string,
    genericMessage: GenericMessage,
    userIds?: QualifiedId[] | QualifiedUserClients,
  ): Promise<MessageSendingStatus> {
    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const preKeyBundles = await this.getQualifiedPreKeyBundle(conversationId, conversationDomain, userIds);

    const recipients = await this.cryptographyService.encryptQualified(plainTextArray, preKeyBundles);

    return this.messageService.sendFederatedOTRMessage(
      sendingClientId,
      conversationId,
      conversationDomain,
      recipients,
      plainTextArray,
    );
  }

  private async sendGenericMessage(
    sendingClientId: string,
    conversationId: string,
    genericMessage: GenericMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ClientMismatch | MessageSendingStatus | undefined> {
    if (conversationDomain) {
      if (isStringArray(userIds) || isUserClients(userIds)) {
        throw new Error('Invalid userIds option for sending');
      }

      return this.sendFederatedGenericMessage(
        this.apiClient.validatedClientId,
        conversationId,
        conversationDomain,
        genericMessage,
        userIds,
      );
    }

    if (isQualifiedIdArray(userIds) || isQualifiedUserClients(userIds)) {
      throw new Error('Invalid userIds option for sending');
    }

    const plainTextArray = GenericMessage.encode(genericMessage).finish();
    const preKeyBundles = await this.getPreKeyBundleMap(conversationId, userIds);

    if (this.shouldSendAsExternal(plainTextArray, preKeyBundles)) {
      const encryptedAsset = await AssetCryptography.encryptAsset({plainText: plainTextArray});
      return this.sendExternalGenericMessage(
        this.apiClient.validatedClientId,
        conversationId,
        encryptedAsset,
        preKeyBundles,
        sendAsProtobuf,
      );
    }

    const recipients = await this.cryptographyService.encrypt(plainTextArray, preKeyBundles);

    return sendAsProtobuf
      ? this.messageService.sendOTRProtobufMessage(sendingClientId, recipients, conversationId, plainTextArray)
      : this.messageService.sendOTRMessage(sendingClientId, recipients, conversationId, plainTextArray);
  }

  private async sendButtonAction(
    payloadBundle: ButtonActionMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ButtonActionMessage> {
    const genericMessage = GenericMessage.create({
      [GenericMessageType.BUTTON_ACTION]: ButtonAction.create(payloadBundle.content),
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendButtonActionConfirmation(
    payloadBundle: ButtonActionConfirmationMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ButtonActionConfirmationMessage> {
    const genericMessage = GenericMessage.create({
      [GenericMessageType.BUTTON_ACTION_CONFIRMATION]: ButtonActionConfirmation.create(payloadBundle.content),
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendComposite(
    payloadBundle: CompositeMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<CompositeMessage> {
    const genericMessage = GenericMessage.create({
      [GenericMessageType.COMPOSITE]: Composite.create(payloadBundle.content),
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendConfirmation(
    payloadBundle: ConfirmationMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ConfirmationMessage> {
    const content = Confirmation.create(payloadBundle.content);

    const genericMessage = GenericMessage.create({
      [GenericMessageType.CONFIRMATION]: content,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendEditedText(
    payloadBundle: EditedTextMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<EditedTextMessage> {
    const editedMessage = MessageEdit.create({
      replacingMessageId: payloadBundle.content.originalMessageId,
      text: MessageToProtoMapper.mapText(payloadBundle),
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.EDITED]: editedMessage,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendFileData(
    payloadBundle: FileAssetMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<FileAssetMessage> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendFileData provided.');
    }

    const {asset, expectsReadConfirmation, legalHoldStatus} = payloadBundle.content;

    const remoteData = Asset.RemoteData.create({
      assetId: asset.key,
      assetToken: asset.token,
      otrKey: asset.keyBytes,
      sha256: asset.sha256,
    });

    const assetMessage = Asset.create({
      expectsReadConfirmation,
      legalHoldStatus,
      uploaded: remoteData,
    });

    assetMessage.status = AssetTransferState.UPLOADED;

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendFileMetaData(
    payloadBundle: FileAssetMetaDataMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<FileAssetMetaDataMessage> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendFileMetaData provided.');
    }

    const {expectsReadConfirmation, legalHoldStatus, metaData} = payloadBundle.content;

    const original = Asset.Original.create({
      audio: metaData.audio,
      mimeType: metaData.type,
      name: metaData.name,
      size: metaData.length,
      video: metaData.video,
    });

    const assetMessage = Asset.create({
      expectsReadConfirmation,
      legalHoldStatus,
      original,
    });

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendFileAbort(
    payloadBundle: FileAssetAbortMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<FileAssetAbortMessage> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendFileAbort provided.');
    }

    const {expectsReadConfirmation, legalHoldStatus, reason} = payloadBundle.content;

    const assetMessage = Asset.create({
      expectsReadConfirmation,
      legalHoldStatus,
      notUploaded: reason,
    });

    assetMessage.status = AssetTransferState.NOT_UPLOADED;

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendImage(
    payloadBundle: ImageAssetMessageOutgoing,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ImageAssetMessage> {
    if (!payloadBundle.content) {
      throw new Error('No content for sendImage provided.');
    }

    const {asset, expectsReadConfirmation, image, legalHoldStatus} = payloadBundle.content;

    const imageMetadata = Asset.ImageMetaData.create({
      height: image.height,
      width: image.width,
    });

    const original = Asset.Original.create({
      [GenericMessageType.IMAGE]: imageMetadata,
      mimeType: image.type,
      name: null,
      size: image.data.length,
    });

    const remoteData = Asset.RemoteData.create({
      assetId: asset.key,
      assetToken: asset.token,
      otrKey: asset.keyBytes,
      sha256: asset.sha256,
    });

    const assetMessage = Asset.create({
      expectsReadConfirmation,
      legalHoldStatus,
      original,
      uploaded: remoteData,
    });

    assetMessage.status = AssetTransferState.UPLOADED;

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      content: assetMessage as AssetContent,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendLocation(
    payloadBundle: LocationMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<LocationMessage> {
    const {expectsReadConfirmation, latitude, legalHoldStatus, longitude, name, zoom} = payloadBundle.content;

    const locationMessage = Location.create({
      expectsReadConfirmation,
      latitude,
      legalHoldStatus,
      longitude,
      name,
      zoom,
    });

    let genericMessage = GenericMessage.create({
      [GenericMessageType.LOCATION]: locationMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendKnock(
    payloadBundle: PingMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<PingMessage> {
    const content = Knock.create(payloadBundle.content);

    let genericMessage = GenericMessage.create({
      [GenericMessageType.KNOCK]: content,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      conversation: payloadBundle.conversation,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendReaction(
    payloadBundle: ReactionMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ReactionMessage> {
    const {legalHoldStatus, originalMessageId, type} = payloadBundle.content;

    const reaction = Reaction.create({
      emoji: type,
      legalHoldStatus,
      messageId: originalMessageId,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.REACTION]: reaction,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendSessionReset(
    payloadBundle: ResetSessionMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ResetSessionMessage> {
    const genericMessage = GenericMessage.create({
      [GenericMessageType.CLIENT_ACTION]: ClientAction.RESET_SESSION,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendCall(
    payloadBundle: CallMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<CallMessage> {
    const callMessage = Calling.create({
      content: payloadBundle.content,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.CALLING]: callMessage,
      messageId: payloadBundle.id,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      ...payloadBundle,
      messageTimer: 0,
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  private async sendText(
    payloadBundle: TextMessage,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
    callbacks?: MessageSendingCallbacks,
  ): Promise<TextMessage> {
    let genericMessage = GenericMessage.create({
      messageId: payloadBundle.id,
      [GenericMessageType.TEXT]: MessageToProtoMapper.mapText(payloadBundle),
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis > 0) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }
    callbacks?.onStart?.(genericMessage);

    const response = await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );
    callbacks?.onSuccess?.(genericMessage, response?.time);

    return {
      ...payloadBundle,
      messageTimer: this.messageTimer.getMessageTimer(payloadBundle.conversation),
      state: PayloadBundleState.OUTGOING_SENT,
    };
  }

  public async clearConversation(
    conversationId: string,
    timestamp: number | Date = new Date(),
    messageId: string = MessageBuilder.createId(),
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<ClearConversationMessage> {
    if (timestamp instanceof Date) {
      timestamp = timestamp.getTime();
    }

    const content: ClearedContent = {
      clearedTimestamp: timestamp,
      conversationId,
    };

    const clearedMessage = Cleared.create(content);

    const genericMessage = GenericMessage.create({
      [GenericMessageType.CLEARED]: clearedMessage,
      messageId,
    });

    const {id: selfConversationId} = await this.getSelfConversation();

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      selfConversationId,
      genericMessage,
      undefined,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      content,
      conversation: conversationId,
      from: this.apiClient.context!.userId,
      id: messageId,
      messageTimer: 0,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_SENT,
      timestamp: Date.now(),
      type: PayloadBundleType.CONVERSATION_CLEAR,
    };
  }

  public async deleteMessageLocal(
    conversationId: string,
    messageIdToHide: string,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<HideMessage> {
    const messageId = MessageBuilder.createId();

    const content: HiddenContent = MessageHide.create({
      conversationId,
      messageId: messageIdToHide,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.HIDDEN]: content,
      messageId,
    });

    const {id: selfConversationId} = await this.getSelfConversation();

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      selfConversationId,
      genericMessage,
      undefined,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      content,
      conversation: conversationId,
      from: this.apiClient.context!.userId,
      id: messageId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_SENT,
      timestamp: Date.now(),
      type: PayloadBundleType.MESSAGE_HIDE,
    };
  }

  public async deleteMessageEveryone(
    conversationId: string,
    messageIdToDelete: string,
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients,
    sendAsProtobuf?: boolean,
    conversationDomain?: string,
  ): Promise<DeleteMessage> {
    const messageId = MessageBuilder.createId();

    const content: DeletedContent = MessageDelete.create({
      messageId: messageIdToDelete,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.DELETED]: content,
      messageId,
    });

    await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      conversationId,
      genericMessage,
      userIds,
      sendAsProtobuf,
      conversationDomain,
    );

    return {
      content,
      conversation: conversationId,
      from: this.apiClient.context!.userId,
      id: messageId,
      messageTimer: this.messageTimer.getMessageTimer(conversationId),
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_SENT,
      timestamp: Date.now(),
      type: PayloadBundleType.MESSAGE_DELETE,
    };
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
      receipt_mode: null,
      users: ids,
    };

    return this.apiClient.conversation.api.postConversation(newConversation);
  }

  public async getConversations(conversationId: string): Promise<Conversation>;
  public async getConversations(conversationIds?: string[]): Promise<Conversation[]>;
  public async getConversations(conversationIds?: string | string[]): Promise<Conversation[] | Conversation> {
    if (!conversationIds || !conversationIds.length) {
      return this.apiClient.conversation.api.getAllConversations();
    }
    if (typeof conversationIds === 'string') {
      return this.apiClient.conversation.api.getConversation(conversationIds);
    }
    return this.apiClient.conversation.api.getConversationsByIds(conversationIds);
  }

  public async getAsset({assetId, assetToken, otrKey, sha256}: RemoteData): Promise<Buffer> {
    const request = await this.apiClient.asset.api.getAssetV3(assetId, assetToken);
    const encryptedBuffer = (await request.response).buffer;

    return AssetCryptography.decryptAsset({
      cipherText: Buffer.from(encryptedBuffer),
      keyBytes: Buffer.from(otrKey),
      sha256: Buffer.from(sha256),
    });
  }

  public async getUnencryptedAsset(assetId: string, assetToken?: string): Promise<ArrayBuffer> {
    const request = await this.apiClient.asset.api.getAssetV3(assetId, assetToken);
    return (await request.response).buffer;
  }

  public async addUser<T extends string | string[] | QualifiedId | QualifiedId[]>(
    conversationId: string,
    userIds: T,
  ): Promise<T> {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (isStringArray(ids)) {
      await this.apiClient.conversation.api.postMembers(conversationId, ids);
    } else if (isQualifiedIdArray(ids)) {
      await this.apiClient.conversation.api.postMembersV2(conversationId, ids);
    }

    return userIds;
  }

  public async removeUser(conversationId: string, userId: string): Promise<string> {
    await this.apiClient.conversation.api.deleteMember(conversationId, userId);
    return userId;
  }

  /**
   * @param payloadBundle Outgoing message
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   * @param [callbacks] Optional callbacks that will be called when the message starts being sent and when it has been succesfully sent. Currently only used for `sendText`.
   * @returns Sent message
   */
  public async send({
    payloadBundle,
    userIds,
    sendAsProtobuf,
    conversationDomain,
    callbacks,
  }: {
    payloadBundle: OtrMessage;
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients;
    sendAsProtobuf?: boolean;
    conversationDomain?: string;
    callbacks?: MessageSendingCallbacks;
  }) {
    switch (payloadBundle.type) {
      case PayloadBundleType.ASSET:
        return this.sendFileData(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.ASSET_ABORT:
        return this.sendFileAbort(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.ASSET_META:
        return this.sendFileMetaData(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.ASSET_IMAGE:
        return this.sendImage(payloadBundle as ImageAssetMessageOutgoing, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.BUTTON_ACTION:
        return this.sendButtonAction(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.BUTTON_ACTION_CONFIRMATION:
        return this.sendButtonActionConfirmation(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.CALL:
        return this.sendCall(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.CLIENT_ACTION: {
        if (payloadBundle.content.clientAction === ClientAction.RESET_SESSION) {
          return this.sendSessionReset(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
        }
        throw new Error(
          `No send method implemented for "${payloadBundle.type}" and ClientAction "${payloadBundle.content}".`,
        );
      }
      case PayloadBundleType.COMPOSITE:
        return this.sendComposite(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.CONFIRMATION:
        return this.sendConfirmation(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.LOCATION:
        return this.sendLocation(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.MESSAGE_EDIT:
        return this.sendEditedText(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.PING:
        return this.sendKnock(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.REACTION:
        return this.sendReaction(payloadBundle, userIds, sendAsProtobuf, conversationDomain);
      case PayloadBundleType.TEXT:
        return this.sendText(payloadBundle, userIds, sendAsProtobuf, conversationDomain, callbacks);
      default:
        throw new Error(`No send method implemented for "${payloadBundle['type']}".`);
    }
  }

  public sendTypingStart(conversationId: string): Promise<void> {
    return this.apiClient.conversation.api.postTyping(conversationId, {status: CONVERSATION_TYPING.STARTED});
  }

  public sendTypingStop(conversationId: string): Promise<void> {
    return this.apiClient.conversation.api.postTyping(conversationId, {status: CONVERSATION_TYPING.STOPPED});
  }

  public setConversationMutedStatus(
    conversationId: string,
    status: MutedStatus,
    muteTimestamp: number | Date,
  ): Promise<void> {
    if (typeof muteTimestamp === 'number') {
      muteTimestamp = new Date(muteTimestamp);
    }

    const payload: ConversationMemberUpdateData = {
      otr_muted_ref: muteTimestamp.toISOString(),
      otr_muted_status: status,
    };

    return this.apiClient.conversation.api.putMembershipProperties(conversationId, payload);
  }

  public toggleArchiveConversation(
    conversationId: string,
    archived: boolean,
    archiveTimestamp: number | Date = new Date(),
  ): Promise<void> {
    if (typeof archiveTimestamp === 'number') {
      archiveTimestamp = new Date(archiveTimestamp);
    }

    const payload: ConversationMemberUpdateData = {
      otr_archived: archived,
      otr_archived_ref: archiveTimestamp.toISOString(),
    };

    return this.apiClient.conversation.api.putMembershipProperties(conversationId, payload);
  }

  public setMemberConversationRole(
    conversationId: string,
    userId: string,
    conversationRole: DefaultConversationRoleName | string,
  ): Promise<void> {
    return this.apiClient.conversation.api.putOtherMember(userId, conversationId, {
      conversation_role: conversationRole,
    });
  }
}
