/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ExternalProposalType} from '@wireapp/core-crypto';
import type {APIClient} from '@wireapp/api-client';
import {
  MessageSendingStatus,
  Conversation,
  DefaultConversationRoleName,
  MutedStatus,
  NewConversation,
  QualifiedUserClients,
  UserClients,
  ClientMismatch,
  ConversationProtocol,
} from '@wireapp/api-client/src/conversation';
import {CONVERSATION_TYPING, ConversationMemberUpdateData} from '@wireapp/api-client/src/conversation/data';
import type {ConversationMemberLeaveEvent} from '@wireapp/api-client/src/event';
import type {QualifiedId, QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/src/user';
import {
  Asset,
  ButtonAction,
  ButtonActionConfirmation,
  Calling,
  Cleared,
  ClientAction,
  Composite,
  Confirmation,
  DataTransfer,
  Ephemeral,
  GenericMessage,
  Knock,
  LastRead,
  Location,
  MessageDelete,
  MessageEdit,
  MessageHide,
  Reaction,
} from '@wireapp/protocol-messaging';

import {
  AssetTransferState,
  GenericMessageType,
  MessageTimer,
  PayloadBundleSource,
  PayloadBundleState,
  PayloadBundleType,
  RemoveUsersParams,
} from '../../conversation/';
import type {ClearedContent, DeletedContent, HiddenContent, RemoteData} from '../content';
import type {CryptographyService} from '../../cryptography/';
import type {MLSService} from '../../mls';
import type {NotificationService} from '../../notification';
import {decryptAsset} from '../../cryptography/AssetCryptography';
import {isStringArray, isQualifiedIdArray, isQualifiedUserClients, isUserClients} from '../../util/TypePredicateUtil';
import {MessageBuilder} from '../message/MessageBuilder';
import {MessageService} from '../message/MessageService';
import {MessageToProtoMapper} from '../message/MessageToProtoMapper';
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
  ImageAssetMessageOutgoing,
  LocationMessage,
  OtrMessage,
  PingMessage,
  ReactionMessage,
  ResetSessionMessage,
  TextMessage,
} from '../message/OtrMessage';
import {XOR} from '@wireapp/commons/src/main/util/TypeUtil';
import {
  AddUsersParams,
  MessageSendingCallbacks,
  MessageSendingOptions,
  MessageTargetMode,
  MLSReturnType,
  SendMlsMessageParams,
  SendProteusMessageParams,
} from './ConversationService.types';
import {Decoder} from 'bazinga64';
import {mapQualifiedUserClientIdsToFullyQualifiedClientIds} from '../../util/mapQualifiedUserClientIdsToFullyQualifiedClientIds';
import {optionalToUint8Array} from '../../mls';
import {sendMessage} from '../message/messageSender';

export class ConversationService {
  public readonly messageTimer: MessageTimer;
  private readonly messageService: MessageService;
  private selfConversationId?: QualifiedId;

  constructor(
    private readonly apiClient: APIClient,
    cryptographyService: CryptographyService,
    private readonly config: {useQualifiedIds?: boolean},
    private readonly notificationService: NotificationService,
    private readonly mlsService: MLSService,
  ) {
    this.messageTimer = new MessageTimer();
    this.messageService = new MessageService(this.apiClient, cryptographyService);
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

  private async getConversationQualifiedMembers(conversationId: string | QualifiedId): Promise<QualifiedId[]> {
    const conversation = await this.apiClient.api.conversation.getConversation(conversationId);
    /*
     * If you are sending a message to a conversation, you have to include
     * yourself in the list of users if you want to sync a message also to your
     * other clients.
     */
    return conversation.members.others
      .filter(member => !!member.qualified_id)
      .map(member => member.qualified_id!)
      .concat(conversation.members.self.qualified_id!);
  }

  /**
   * Will generate a prekey bundle for specific users.
   * If a QualifiedId array is given the bundle will contain all the clients from those users fetched from the server.
   * If a QualifiedUserClients is provided then only the clients in the payload will be targeted (which could generate a ClientMismatch when sending messages)
   *
   * @param {QualifiedId[]|QualifiedUserClients} userIds - Targeted users.
   * @returns {Promise<QualifiedUserPreKeyBundleMap}
   */
  private async getQualifiedPreKeyBundle(
    userIds: QualifiedId[] | QualifiedUserClients,
  ): Promise<QualifiedUserPreKeyBundleMap> {
    type Target = {id: QualifiedId; clients?: string[]};
    let targets: Target[] = [];

    if (userIds) {
      if (isQualifiedIdArray(userIds)) {
        targets = userIds.map(id => ({id}));
      } else {
        targets = Object.entries(userIds).reduce<Target[]>((accumulator, [domain, userClients]) => {
          for (const userId in userClients) {
            accumulator.push({id: {id: userId, domain}, clients: userClients[userId]});
          }
          return accumulator;
        }, []);
      }
    }

    const preKeys = await Promise.all(
      targets.map(async ({id: userId, clients}) => {
        const prekeyBundle = await this.apiClient.api.user.getUserPreKeys(userId);
        // We filter the clients that should not receive the message (if a QualifiedUserClients was given as parameter)
        const userClients = clients
          ? prekeyBundle.clients.filter(client => clients.includes(client.client))
          : prekeyBundle.clients;
        return {user: userId, clients: userClients};
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
      const conversation = await this.apiClient.api.conversation.getConversation(conversationId);
      /*
       * If you are sending a message to a conversation, you have to include
       * yourself in the list of users if you want to sync a message also to your
       * other clients.
       */
      members = conversation.members.others.map(member => member.id).concat(conversation.members.self.id);
    }

    const preKeys = await Promise.all(members.map(member => this.apiClient.api.user.getUserPreKeys(member)));

    return preKeys.reduce((bundleMap: UserPreKeyBundleMap, bundle) => {
      const userId = bundle.user;
      bundleMap[userId] ||= {};
      for (const client of bundle.clients) {
        bundleMap[userId][client.client] = client.prekey;
      }
      return bundleMap;
    }, {});
  }

  private async getSelfConversationId(): Promise<QualifiedId> {
    if (!this.selfConversationId) {
      const {userId} = this.apiClient.context!;
      const {qualified_id, id} = await this.apiClient.api.conversation.getConversation(userId);
      const domain = this.config.useQualifiedIds ? qualified_id.domain : '';
      this.selfConversationId = {id, domain};
    }
    return this.selfConversationId;
  }

  private async getQualifiedRecipientsForConversation(
    conversationId: QualifiedId,
    userIds?: QualifiedId[] | QualifiedUserClients,
  ): Promise<QualifiedUserClients | QualifiedUserPreKeyBundleMap> {
    if (isQualifiedUserClients(userIds)) {
      return userIds;
    }
    const recipientIds = userIds || (await this.getConversationQualifiedMembers(conversationId));
    return this.getQualifiedPreKeyBundle(recipientIds);
  }

  private async getRecipientsForConversation(
    conversationId: string,
    userIds?: string[] | UserClients,
  ): Promise<UserClients | UserPreKeyBundleMap> {
    if (isUserClients(userIds)) {
      return userIds;
    }
    return this.getPreKeyBundleMap(conversationId, userIds);
  }

  /**
   * Sends a message to a conversation
   *
   * @param sendingClientId The clientId from which the message is sent
   * @param conversationId The conversation in which to send the message
   * @param genericMessage The payload of the message to send
   * @return Resolves with the message sending status from backend
   */
  private async sendGenericMessage(
    sendingClientId: string,
    conversationId: string,
    genericMessage: GenericMessage,
    {
      conversationDomain,
      userIds,
      nativePush,
      sendAsProtobuf,
      onClientMismatch,
      targetMode = MessageTargetMode.NONE,
    }: MessageSendingOptions = {},
  ) {
    const plainText = GenericMessage.encode(genericMessage).finish();
    if (targetMode !== MessageTargetMode.NONE && !userIds) {
      throw new Error('Cannot send targetted message when no userIds are given');
    }
    if (conversationDomain && this.config.useQualifiedIds) {
      if (isStringArray(userIds) || isUserClients(userIds)) {
        throw new Error('Invalid userIds option for sending to federated backend');
      }
      const recipients = await this.getQualifiedRecipientsForConversation(
        {id: conversationId, domain: conversationDomain},
        userIds,
      );
      let reportMissing;
      if (targetMode === MessageTargetMode.NONE) {
        reportMissing = isQualifiedUserClients(userIds); // we want to check mismatch in case the consumer gave an exact list of users/devices
      } else if (targetMode === MessageTargetMode.USERS) {
        reportMissing = this.extractQualifiedUserIds(userIds);
      } else {
        // in case the message is fully targetted at user/client pairs, we do not want to report the missing clients or users at all
        reportMissing = false;
      }
      return this.messageService.sendFederatedMessage(sendingClientId, recipients, plainText, {
        conversationId: {id: conversationId, domain: conversationDomain},
        nativePush,
        reportMissing,
        onClientMismatch: mismatch => onClientMismatch?.(mismatch, false),
      });
    }

    if (isQualifiedIdArray(userIds) || isQualifiedUserClients(userIds)) {
      throw new Error('Invalid userIds option for sending');
    }
    const recipients = await this.getRecipientsForConversation(conversationId, userIds);
    let reportMissing;
    if (targetMode === MessageTargetMode.NONE) {
      reportMissing = isUserClients(userIds); // we want to check mismatch in case the consumer gave an exact list of users/devices
    } else if (targetMode === MessageTargetMode.USERS) {
      reportMissing = this.extractUserIds(userIds);
    } else {
      // in case the message is fully targetted at user/client pairs, we do not want to report the missing clients or users at all
      reportMissing = false;
    }
    return this.messageService.sendMessage(sendingClientId, recipients, plainText, {
      conversationId,
      sendAsProtobuf,
      nativePush,
      reportMissing,
      onClientMismatch: mistmatch => onClientMismatch?.(mistmatch, false),
    });
  }

  private extractUserIds(userIds?: string[] | UserClients): string[] | undefined {
    if (isUserClients(userIds)) {
      return Object.keys(userIds);
    }
    return userIds;
  }

  private extractQualifiedUserIds(userIds?: QualifiedId[] | QualifiedUserClients): QualifiedId[] | undefined {
    if (isQualifiedUserClients(userIds)) {
      return Object.entries(userIds).reduce<QualifiedId[]>((ids, [domain, userClients]) => {
        return ids.concat(Object.keys(userClients).map(userId => ({domain, id: userId})));
      }, []);
    }
    return userIds;
  }

  private generateButtonActionGenericMessage(payloadBundle: ButtonActionMessage): GenericMessage {
    return GenericMessage.create({
      [GenericMessageType.BUTTON_ACTION]: ButtonAction.create(payloadBundle.content),
      messageId: payloadBundle.id,
    });
  }

  private generateButtonActionConfirmationGenericMessage(
    payloadBundle: ButtonActionConfirmationMessage,
  ): GenericMessage {
    return GenericMessage.create({
      [GenericMessageType.BUTTON_ACTION_CONFIRMATION]: ButtonActionConfirmation.create(payloadBundle.content),
      messageId: payloadBundle.id,
    });
  }

  private generateCompositeGenericMessage(payloadBundle: CompositeMessage): GenericMessage {
    return GenericMessage.create({
      [GenericMessageType.COMPOSITE]: Composite.create(payloadBundle.content),
      messageId: payloadBundle.id,
    });
  }

  private generateConfirmationGenericMessage(payloadBundle: ConfirmationMessage): GenericMessage {
    const content = Confirmation.create(payloadBundle.content);

    return GenericMessage.create({
      [GenericMessageType.CONFIRMATION]: content,
      messageId: payloadBundle.id,
    });
  }

  private generateEditedTextGenericMessage(payloadBundle: EditedTextMessage): GenericMessage {
    const editedMessage = MessageEdit.create({
      replacingMessageId: payloadBundle.content.originalMessageId,
      text: MessageToProtoMapper.mapText(payloadBundle),
    });

    return GenericMessage.create({
      [GenericMessageType.EDITED]: editedMessage,
      messageId: payloadBundle.id,
    });
  }

  private generateFileDataGenericMessage(payloadBundle: FileAssetMessage): GenericMessage {
    if (!payloadBundle.content) {
      throw new Error('No content for sendFileData provided.');
    }

    const {asset, expectsReadConfirmation, legalHoldStatus} = payloadBundle.content;

    const remoteData = Asset.RemoteData.create({
      assetId: asset.key,
      assetToken: asset.token,
      otrKey: asset.keyBytes,
      sha256: asset.sha256,
      assetDomain: asset.domain,
    });

    const assetMessage = Asset.create({
      expectsReadConfirmation,
      legalHoldStatus,
      uploaded: remoteData,
    });

    assetMessage.status = AssetTransferState.UPLOADED;

    const genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    return expireAfterMillis > 0 ? this.createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
  }

  private generateFileMetaDataGenericMessage(payloadBundle: FileAssetMetaDataMessage): GenericMessage {
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
      image: metaData.image,
    });

    const assetMessage = Asset.create({
      expectsReadConfirmation,
      legalHoldStatus,
      original,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    return expireAfterMillis > 0 ? this.createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
  }

  private generateFileAbortGenericMessage(payloadBundle: FileAssetAbortMessage): GenericMessage {
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

    const genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    return expireAfterMillis > 0 ? this.createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
  }

  private generateAsset(payloadBundle: ImageAssetMessageOutgoing): Asset {
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
      assetDomain: asset.domain,
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

    return assetMessage;
  }

  private generateImageGenericMessage(payloadBundle: ImageAssetMessageOutgoing): {
    content: Asset;
    genericMessage: GenericMessage;
  } {
    const imageAsset = this.generateAsset(payloadBundle);

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: imageAsset,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }

    return {genericMessage, content: imageAsset};
  }

  private generateLocationGenericMessage(payloadBundle: LocationMessage): GenericMessage {
    const {expectsReadConfirmation, latitude, legalHoldStatus, longitude, name, zoom} = payloadBundle.content;

    const locationMessage = Location.create({
      expectsReadConfirmation,
      latitude,
      legalHoldStatus,
      longitude,
      name,
      zoom,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.LOCATION]: locationMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    return expireAfterMillis > 0 ? this.createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
  }

  private generatePingGenericMessage(payloadBundle: PingMessage): GenericMessage {
    const content = Knock.create(payloadBundle.content);

    const genericMessage = GenericMessage.create({
      [GenericMessageType.KNOCK]: content,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    return expireAfterMillis > 0 ? this.createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
  }

  private generateReactionGenericMessage(payloadBundle: ReactionMessage): GenericMessage {
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
    return genericMessage;
  }

  private generateSessionResetGenericMessage(payloadBundle: ResetSessionMessage): GenericMessage {
    return GenericMessage.create({
      [GenericMessageType.CLIENT_ACTION]: ClientAction.RESET_SESSION,
      messageId: payloadBundle.id,
    });
  }

  private generateCallGenericMessage(payloadBundle: CallMessage): GenericMessage {
    const callMessage = Calling.create({
      content: payloadBundle.content,
    });

    return GenericMessage.create({
      [GenericMessageType.CALLING]: callMessage,
      messageId: payloadBundle.id,
    });
  }

  private generateTextGenericMessage(payloadBundle: TextMessage): GenericMessage {
    const genericMessage = GenericMessage.create({
      messageId: payloadBundle.id,
      [GenericMessageType.TEXT]: MessageToProtoMapper.mapText(payloadBundle),
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    return expireAfterMillis > 0 ? this.createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
  }

  public async clearConversation(
    conversationId: string,
    timestamp: number | Date = new Date(),
    messageId: string = MessageBuilder.createId(),
    sendAsProtobuf?: boolean,
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

    const {id: selfConversationId, domain} = await this.getSelfConversationId();

    await this.sendGenericMessage(this.apiClient.validatedClientId, selfConversationId, genericMessage, {
      conversationDomain: domain,
      sendAsProtobuf,
    });

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

  /**
   * Sends a LastRead message to the current user's self conversation.
   * This will allow all the user's devices to compute which messages are unread
   *
   * @param conversationId The conversation which has been read
   * @param lastReadTimestamp The timestamp at which the conversation was read
   * @param sendingOptions?
   * @return Resolves when the message has been sent
   */
  public async sendLastRead(conversationId: string, lastReadTimestamp: number, sendingOptions?: MessageSendingOptions) {
    const lastRead = new LastRead({
      conversationId,
      lastReadTimestamp,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.LAST_READ]: lastRead,
      messageId: MessageBuilder.createId(),
    });

    const {id: selfConversationId, domain: selfConversationDomain} = await this.getSelfConversationId();

    return this.sendGenericMessage(this.apiClient.validatedClientId, selfConversationId, genericMessage, {
      conversationDomain: selfConversationDomain,
      ...sendingOptions,
    });
  }

  /**
   * Syncs all self user's devices with the countly id
   *
   * @param countlyId The countly id of the current device
   * @param sendingOptions?
   * @return Resolves when the message has been sent
   */
  public async sendCountlySync(countlyId: string, sendingOptions: MessageSendingOptions) {
    const {id: selfConversationId, domain: selfConversationDomain} = await this.getSelfConversationId();

    const dataTransfer = new DataTransfer({
      trackingIdentifier: {
        identifier: countlyId,
      },
    });
    const genericMessage = new GenericMessage({
      [GenericMessageType.DATA_TRANSFER]: dataTransfer,
      messageId: MessageBuilder.createId(),
    });

    return this.sendGenericMessage(this.apiClient.validatedClientId, selfConversationId, genericMessage, {
      conversationDomain: selfConversationDomain,
      ...sendingOptions,
    });
  }

  /**
   * Get a fresh list from backend of clients for all the participants of the conversation.
   * This is a hacky way of getting all the clients for a conversation.
   * The idea is to send an empty message to the backend to absolutely no users and let backend reply with a mismatch error.
   * We then get the missing members in the mismatch, that is our fresh list of participants' clients.
   *
   * @deprecated
   * @param {string} conversationId
   * @param {string} conversationDomain? - If given will send the message to the new qualified endpoint
   */
  public getAllParticipantsClients(
    conversationId: string,
    conversationDomain?: string,
  ): Promise<UserClients | QualifiedUserClients> {
    const sendingClientId = this.apiClient.validatedClientId;
    const recipients = {};
    const text = new Uint8Array();
    return new Promise(async resolve => {
      const onClientMismatch = (mismatch: ClientMismatch | MessageSendingStatus) => {
        resolve(mismatch.missing);
        // When the mismatch happens, we ask the messageService to cancel the sending
        return false;
      };

      if (conversationDomain && this.config.useQualifiedIds) {
        await this.messageService.sendFederatedMessage(sendingClientId, recipients, text, {
          conversationId: {id: conversationId, domain: conversationDomain},
          onClientMismatch,
          reportMissing: true,
        });
      } else {
        await this.messageService.sendMessage(sendingClientId, recipients, text, {
          conversationId,
          onClientMismatch,
        });
      }
    });
  }

  /**
   * Get a fresh list from backend of clients for all the participants of the conversation.
   * @fixme there are some case where this method is not enough to detect removed devices
   * @param {string} conversationId
   * @param {string} conversationDomain? - If given will send the message to the new qualified endpoint
   */
  public async fetchAllParticipantsClients(
    conversationId: string,
    conversationDomain?: string,
  ): Promise<UserClients | QualifiedUserClients> {
    const qualifiedMembers = await this.getConversationQualifiedMembers(
      conversationDomain ? {id: conversationId, domain: conversationDomain} : conversationId,
    );
    const allClients = await this.apiClient.api.user.postListClients({qualified_users: qualifiedMembers});
    const qualifiedUserClients: QualifiedUserClients = {};

    Object.entries(allClients.qualified_user_map).map(([domain, userClientMap]) =>
      Object.entries(userClientMap).map(async ([userId, clients]) => {
        qualifiedUserClients[domain] ||= {};
        qualifiedUserClients[domain][userId] = clients.map(client => client.id);
      }),
    );

    return qualifiedUserClients;
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

    const {id: selfConversationId} = await this.getSelfConversationId();

    await this.sendGenericMessage(this.apiClient.validatedClientId, selfConversationId, genericMessage, {
      sendAsProtobuf,
      conversationDomain,
    });

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
    callbacks?: MessageSendingCallbacks,
  ): Promise<DeleteMessage> {
    const messageId = MessageBuilder.createId();

    const content: DeletedContent = MessageDelete.create({
      messageId: messageIdToDelete,
    });

    const genericMessage = GenericMessage.create({
      [GenericMessageType.DELETED]: content,
      messageId,
    });
    callbacks?.onStart?.(genericMessage);

    const response = await this.sendGenericMessage(this.apiClient.validatedClientId, conversationId, genericMessage, {
      userIds,
      sendAsProtobuf,
      conversationDomain,
    });
    callbacks?.onSuccess?.(genericMessage, response?.time);

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

  /**
   * Create a group conversation.
   * @param  {string} name
   * @param  {string|string[]} otherUserIds
   * @deprecated
   * @returns Promise
   */
  public createProteusConversation(name: string, otherUserIds: string | string[]): Promise<Conversation>;
  /**
   * Create a group conversation.
   *
   * @note Do not include yourself as the requestor
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation
   *
   * @param conversationData Payload object for group creation
   * @returns Resolves when the conversation was created
   */
  public createProteusConversation(conversationData: NewConversation): Promise<Conversation>;
  public createProteusConversation(
    conversationData: NewConversation | string,
    otherUserIds?: string | string[],
  ): Promise<Conversation> {
    let payload: NewConversation;
    if (typeof conversationData === 'string') {
      const ids = typeof otherUserIds === 'string' ? [otherUserIds] : otherUserIds;

      payload = {
        name: conversationData,
        receipt_mode: null,
        users: ids ?? [],
      };
    } else {
      payload = conversationData;
    }

    return this.apiClient.api.conversation.postConversation(payload);
  }

  public async getConversations(conversationId: string): Promise<Conversation>;
  public async getConversations(conversationIds?: string[]): Promise<Conversation[]>;
  public async getConversations(conversationIds?: string | string[]): Promise<Conversation[] | Conversation> {
    if (!conversationIds || !conversationIds.length) {
      return this.apiClient.api.conversation.getAllConversations();
    }
    if (typeof conversationIds === 'string') {
      return this.apiClient.api.conversation.getConversation(conversationIds);
    }
    return this.apiClient.api.conversation.getConversationsByIds(conversationIds);
  }

  public async getAsset({assetId, assetToken, otrKey, sha256}: RemoteData): Promise<Uint8Array> {
    const request = this.apiClient.api.asset.getAssetV3(assetId, assetToken);
    const encryptedBuffer = (await request.response).buffer;

    return decryptAsset({
      cipherText: new Uint8Array(encryptedBuffer),
      keyBytes: otrKey,
      sha256: sha256,
    });
  }

  public async getUnencryptedAsset(assetId: string, assetToken?: string): Promise<ArrayBuffer> {
    const request = await this.apiClient.api.asset.getAssetV3(assetId, assetToken);
    return (await request.response).buffer;
  }

  public async addUsersToProteusConversation({conversationId, qualifiedUserIds}: Omit<AddUsersParams, 'groupId'>) {
    return this.apiClient.api.conversation.postMembers(conversationId, qualifiedUserIds);
  }

  public async removeUserFromConversation(
    conversationId: QualifiedId,
    userId: QualifiedId,
  ): Promise<ConversationMemberLeaveEvent> {
    return this.apiClient.api.conversation.deleteMember(conversationId, userId);
  }

  private async sendProteusMessage<T extends OtrMessage>(
    params: SendProteusMessageParams<T>,
    genericMessage: GenericMessage,
    content: T['content'],
  ): Promise<T> {
    const {userIds, sendAsProtobuf, conversationDomain, nativePush, targetMode, payload, onClientMismatch, onSuccess} =
      params;
    const response = await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payload.conversation,
      genericMessage,
      {
        userIds,
        sendAsProtobuf,
        conversationDomain,
        nativePush,
        targetMode,
        onClientMismatch,
      },
    );

    if (!response.errored) {
      if (!this.isClearFromMismatch(response)) {
        // We warn the consumer that there is a mismatch that did not prevent message sending
        await onClientMismatch?.(response, true);
      }
      onSuccess?.(genericMessage, response.time);
    }

    return {
      ...payload,
      content,
      messageTimer: genericMessage.ephemeral?.expireAfterMillis || 0,
      state: response.errored ? PayloadBundleState.CANCELLED : PayloadBundleState.OUTGOING_SENT,
    };
  }

  /**
   * Sends a message to a conversation
   * @return resolves with the sent message
   */
  public async send<T extends OtrMessage>(params: XOR<SendMlsMessageParams<T>, SendProteusMessageParams<T>>) {
    function isMLS<T>(
      params: SendProteusMessageParams<T> | SendMlsMessageParams<T>,
    ): params is SendMlsMessageParams<T> {
      return params.protocol === ConversationProtocol.MLS;
    }

    const {payload, onStart} = params;
    const {genericMessage, content} = this.generateGenericMessage(payload);
    if ((await onStart?.(genericMessage)) === false) {
      // If the onStart call returns false, it means the consumer wants to cancel the message sending
      return {...payload, state: PayloadBundleState.CANCELLED};
    }

    return sendMessage(() =>
      isMLS(params)
        ? this.sendMLSMessage(params, genericMessage, content)
        : this.sendProteusMessage(params, genericMessage, content),
    );
  }

  public sendTypingStart(conversationId: string): Promise<void> {
    return this.apiClient.api.conversation.postTyping(conversationId, {status: CONVERSATION_TYPING.STARTED});
  }

  public sendTypingStop(conversationId: string): Promise<void> {
    return this.apiClient.api.conversation.postTyping(conversationId, {status: CONVERSATION_TYPING.STOPPED});
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

    return this.apiClient.api.conversation.putMembershipProperties(conversationId, payload);
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

    return this.apiClient.api.conversation.putMembershipProperties(conversationId, payload);
  }

  public setMemberConversationRole(
    conversationId: string,
    userId: string,
    conversationRole: DefaultConversationRoleName | string,
  ): Promise<void> {
    return this.apiClient.api.conversation.putOtherMember(userId, conversationId, {
      conversation_role: conversationRole,
    });
  }

  private isClearFromMismatch(mismatch: ClientMismatch | MessageSendingStatus): boolean {
    const hasMissing = Object.keys(mismatch.missing || {}).length > 0;
    const hasDeleted = Object.keys(mismatch.deleted || {}).length > 0;
    const hasRedundant = Object.keys(mismatch.redundant || {}).length > 0;
    const hasFailed = Object.keys((mismatch as MessageSendingStatus).failed_to_send || {}).length > 0;
    return !hasMissing && !hasDeleted && !hasRedundant && !hasFailed;
  }

  private generateGenericMessage<T extends OtrMessage>(
    payload: T,
  ): {
    content: T['content'];
    genericMessage: GenericMessage;
  } {
    let genericMessage: GenericMessage;
    const content = payload.content;
    switch (payload.type) {
      case PayloadBundleType.ASSET:
        genericMessage = this.generateFileDataGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.ASSET_ABORT:
        genericMessage = this.generateFileAbortGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.ASSET_META:
        genericMessage = this.generateFileMetaDataGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.ASSET_IMAGE:
        return this.generateImageGenericMessage(payload as ImageAssetMessageOutgoing);
      case PayloadBundleType.BUTTON_ACTION:
        genericMessage = this.generateButtonActionGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.BUTTON_ACTION_CONFIRMATION:
        genericMessage = this.generateButtonActionConfirmationGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.CALL:
        genericMessage = this.generateCallGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.CLIENT_ACTION: {
        if (payload.content.clientAction !== ClientAction.RESET_SESSION) {
          throw new Error(`No send method implemented for "${payload.type}" and ClientAction "${payload.content}".`);
        }
        genericMessage = this.generateSessionResetGenericMessage(payload);
        return {genericMessage, content};
      }
      case PayloadBundleType.COMPOSITE:
        genericMessage = this.generateCompositeGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.CONFIRMATION:
        genericMessage = this.generateConfirmationGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.LOCATION:
        genericMessage = this.generateLocationGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.MESSAGE_EDIT:
        genericMessage = this.generateEditedTextGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.PING:
        genericMessage = this.generatePingGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.REACTION:
        genericMessage = this.generateReactionGenericMessage(payload);
        return {genericMessage, content};
      case PayloadBundleType.TEXT:
        genericMessage = this.generateTextGenericMessage(payload);
        return {genericMessage, content};
      /**
       * ToDo: Create Generic implementation for everything else
       */
      default:
        throw new Error(`No send method implemented for "${payload['type']}".`);
    }
  }

  /**
   *   ###############################################
   *   ################ MLS Functions ################
   *   ###############################################
   */

  public async createMLSConversation(conversationData: NewConversation): Promise<MLSReturnType> {
    /**
     * @note For creating MLS conversations the users & qualified_users
     * field must be empty as backend is not aware which users
     * are in a MLS conversation because of the MLS architecture.
     */
    const newConversation = await this.apiClient.api.conversation.postConversation({
      ...conversationData,
      users: undefined,
      qualified_users: undefined,
    });
    const {group_id: groupId, qualified_id: qualifiedId} = newConversation;
    if (!groupId) {
      throw new Error('No group_id found in response which is required for creating MLS conversations.');
    }

    const groupIdDecodedFromBase64 = Decoder.fromBase64(groupId).asBytes;
    const {qualified_users: qualifiedUsers = [], selfUserId} = conversationData;
    if (!selfUserId) {
      throw new Error('You need to pass self user qualified id in order to create an MLS conversation');
    }

    await this.mlsService.createConversation(groupIdDecodedFromBase64);
    const coreCryptoKeyPackagesPayload = await this.mlsService.getKeyPackagesPayload([
      {
        id: selfUserId.id,
        domain: selfUserId.domain,
        /**
         * we should skip fetching key packages for current self client,
         * it's already added by the backend on the group creation time
         */
        skipOwn: conversationData.creator_client,
      },
      ...qualifiedUsers,
    ]);

    const response = await this.mlsService.addUsersToExistingConversation(
      groupIdDecodedFromBase64,
      coreCryptoKeyPackagesPayload,
    );

    await this.notificationService.saveConversationGroupId(newConversation);

    //We store the info when conversation (along with key material) was created, so we will know when to renew it
    const groupCreationTimeStamp = new Date().getTime();
    await this.notificationService.storeLastKeyMaterialUpdateDate({
      previousUpdateDate: groupCreationTimeStamp,
      groupId,
    });

    // We fetch the fresh version of the conversation created on backend with the newly added users
    const conversation = await this.getConversations(qualifiedId.id);

    return {
      events: response?.events || [],
      conversation,
    };
  }

  private async sendMLSMessage<T extends OtrMessage>(
    params: SendMlsMessageParams<T>,
    genericMessage: GenericMessage,
    content: T['content'],
  ): Promise<T> {
    const {groupId, onSuccess, payload} = params;
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    // immediately execute pending commits before sending the message
    await this.notificationService.commitPendingProposals({groupId});

    const encrypted = await this.mlsService.encryptMessage(
      groupIdBytes,
      GenericMessage.encode(genericMessage).finish(),
    );

    try {
      const {time = ''} = await this.apiClient.api.conversation.postMlsMessage(encrypted);
      onSuccess?.(genericMessage, time?.length > 0 ? time : new Date().toISOString());
      return {
        ...payload,
        content,
        messageTimer: genericMessage.ephemeral?.expireAfterMillis || 0,
        state: PayloadBundleState.OUTGOING_SENT,
      };
    } catch {
      return {
        ...payload,
        content,
        messageTimer: genericMessage.ephemeral?.expireAfterMillis || 0,
        state: PayloadBundleState.CANCELLED,
      };
    }
  }

  public async addUsersToMLSConversation({
    qualifiedUserIds,
    groupId,
    conversationId,
  }: Required<AddUsersParams>): Promise<MLSReturnType> {
    const groupIdDecodedFromBase64 = Decoder.fromBase64(groupId!).asBytes;
    const coreCryptoKeyPackagesPayload = await this.mlsService.getKeyPackagesPayload([...qualifiedUserIds]);
    const response = await this.mlsService.addUsersToExistingConversation(
      groupIdDecodedFromBase64,
      coreCryptoKeyPackagesPayload,
    );
    const conversation = await this.getConversations(conversationId.id);

    return {
      events: response?.events || [],
      conversation,
    };
  }

  private async storeLastKeyMaterialUpdateDateWithCurrentTime(groupId: string) {
    const currentTime = new Date().getTime();
    await this.notificationService.storeLastKeyMaterialUpdateDate({groupId, previousUpdateDate: currentTime});
  }

  public async removeUsersFromMLSConversation({
    groupId,
    conversationId,
    qualifiedUserIds,
  }: RemoveUsersParams): Promise<MLSReturnType> {
    const groupIdDecodedFromBase64 = Decoder.fromBase64(groupId).asBytes;

    const clientsToRemove = await this.apiClient.api.user.postListClients({qualified_users: qualifiedUserIds});

    const fullyQualifiedClientIds = mapQualifiedUserClientIdsToFullyQualifiedClientIds(
      clientsToRemove.qualified_user_map,
    );

    const messageResponse = await this.mlsService.removeClientsFromConversation(
      groupIdDecodedFromBase64,
      fullyQualifiedClientIds,
    );

    //key material gets updated after removing a user from the group, so we can reset last key update time value in the store
    await this.storeLastKeyMaterialUpdateDateWithCurrentTime(groupId);

    const conversation = await this.getConversations(conversationId.id);

    return {
      events: messageResponse?.events || [],
      conversation,
    };
  }

  /**
   * Will send an external proposal for the current device to join a specific conversation.
   * In order for the external proposal to be sent correctly, the underlying mls conversation needs to be in a non-established state
   * @param conversationGroupId The conversation to join
   * @param epoch The current epoch of the local conversation
   */
  public async sendExternalJoinProposal(conversationGroupId: string, epoch: number) {
    return sendMessage(async () => {
      const groupIdDecodedFromBase64 = Decoder.fromBase64(conversationGroupId!).asBytes;
      const externalProposal = await this.mlsService.newExternalProposal(ExternalProposalType.Add, {
        epoch,
        conversationId: groupIdDecodedFromBase64,
      });
      await this.apiClient.api.conversation.postMlsMessage(
        //@todo: it's temporary - we wait for core-crypto fix to return the actual Uint8Array instead of regular array
        optionalToUint8Array(externalProposal),
      );

      //We store the info when user was added (and key material was created), so we will know when to renew it
      await this.storeLastKeyMaterialUpdateDateWithCurrentTime(conversationGroupId);
    });
  }

  public async isMLSConversationEstablished(conversationGroupId: string) {
    const groupIdDecodedFromBase64 = Decoder.fromBase64(conversationGroupId!).asBytes;
    return this.mlsService.conversationExists(groupIdDecodedFromBase64);
  }

  public async wipeMLSConversation(conversationId: Uint8Array): Promise<void> {
    return this.mlsService.wipeConversation(conversationId);
  }
}
