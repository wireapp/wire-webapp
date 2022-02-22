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
} from '../conversation/';
import type {AssetContent, ClearedContent, DeletedContent, HiddenContent, RemoteData} from '../conversation/content/';
import type {CryptographyService} from '../cryptography/';
import {decryptAsset} from '../cryptography/AssetCryptography';
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
  ImageAssetMessageOutgoing,
  LocationMessage,
  OtrMessage,
  PingMessage,
  ReactionMessage,
  ResetSessionMessage,
  TextMessage,
} from './message/OtrMessage';

export enum MessageTargetMode {
  NONE,
  USERS,
  USERS_CLIENTS,
}

interface MessageSendingOptions {
  /**
   * The federated domain the server runs on. Should only be set for federation enabled envs
   */
  conversationDomain?: string;

  /**
   * can be either a QualifiedId[] or QualfiedUserClients or undefined. The type has some effect on the behavior of the method.
   *    When given undefined the method will fetch both the members of the conversations and their devices. No ClientMismatch can happen in that case
   *    When given a QualifiedId[] the method will fetch the freshest list of devices for those users (since they are not given by the consumer). As a consequence no ClientMismatch error will trigger and we will ignore missing clients when sending
   *    When given a QualifiedUserClients the method will only send to the clients listed in the userIds. This could lead to ClientMismatch (since the given list of devices might not be the freshest one and new clients could have been created)
   */
  userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients;

  /**
   * Will send the message as a protobuf payload
   */
  sendAsProtobuf?: boolean;
  nativePush?: boolean;

  /**
   * Will be called whenever there is a clientmismatch returned from the server. Needs to be combined with a userIds of type QualifiedUserClients
   */
  onClientMismatch?: MessageSendingCallbacks['onClientMismatch'];

  /**
   * Defines the behavior to use when a mismatch happens on backend side:
   *     - NONE -> Not a targetted message, we want to send to all the users/clients in the conversation. Will report all missing users and clients (default mode)
   *     - USERS -> A message targetted to all the clients of the given users (according to params.userIds). Will ignore missing users and only report missing clients for the given params.userIds
   *     - USERS_CLIENTS -> A message targetted at some specific clients of specific users (according to params.userIds). Will force sending the message even if users or clients are missing
   */
  targetMode?: MessageTargetMode;
}

export interface MessageSendingCallbacks {
  /**
   * Will be called before a message is actually sent. Returning 'false' will prevent the message from being sent
   * @param message The message being sent
   * @return true or undefined if the message should be sent, false if the message sending should be cancelled
   */
  onStart?: (message: GenericMessage) => void | boolean | Promise<boolean>;

  onSuccess?: (message: GenericMessage, sentTime?: string) => void;
  /**
   * Called whenever there is a clientmismatch returned from the server. Will also indicate the sending status of the message (if it was already sent or not)
   *
   * @param status The mismatch info
   * @param wasSent Indicate whether the message was already sent or if it can still be canceled
   * @return
   */
  onClientMismatch?: (
    status: ClientMismatch | MessageSendingStatus,
    wasSent: boolean,
  ) => void | boolean | Promise<boolean>;
}

export class ConversationService {
  public readonly messageTimer: MessageTimer;
  private readonly messageService: MessageService;
  private selfConversationId?: QualifiedId;

  constructor(
    private readonly apiClient: APIClient,
    cryptographyService: CryptographyService,
    private readonly config: {useQualifiedIds?: boolean},
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

  private async getConversationQualifiedMembers(conversationId: QualifiedId): Promise<QualifiedId[]> {
    const conversation = await this.apiClient.api.conversation.getConversation(conversationId);
    /*
     * If you are sending a message to a conversation, you have to include
     * yourself in the list of users if you want to sync a message also to your
     * other clients.
     */
    return (
      conversation.members.others
        .filter(member => !!member.qualified_id)
        .map(member => member.qualified_id!)
        // TODO(Federation): Use 'domain' from 'conversation.members.self' when backend has it implemented
        .concat({domain: this.apiClient.context!.domain!, id: conversation.members.self.id})
    );
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

  private generateImageGenericMessage(payloadBundle: ImageAssetMessageOutgoing): {
    content: AssetContent;
    genericMessage: GenericMessage;
  } {
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

    let genericMessage = GenericMessage.create({
      [GenericMessageType.ASSET]: assetMessage,
      messageId: payloadBundle.id,
    });

    const expireAfterMillis = this.messageTimer.getMessageTimer(payloadBundle.conversation);
    if (expireAfterMillis) {
      genericMessage = this.createEphemeral(genericMessage, expireAfterMillis);
    }
    return {content: assetMessage as AssetContent, genericMessage};
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
   * @param sendAsProtobuf?
   * @return Resolves when the message has been sent
   */
  public async sendLastRead(conversationId: string, lastReadTimestamp: number, sendAsProtobuf?: boolean) {
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
      sendAsProtobuf,
    });
  }

  /**
   * Syncs all self user's devices with the countly id
   *
   * @param countlyId The countly id of the current device
   * @param sendAsProtobuf?
   * @return Resolves when the message has been sent
   */
  public async sendCountlySync(countlyId: string, sendAsProtobuf?: boolean) {
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
      sendAsProtobuf,
    });
  }

  /**
   * Get a fresh list from backend of clients for all the participants of the conversation.
   * This is a hacky way of getting all the clients for a conversation.
   * The idea is to send an empty message to the backend to absolutely no users and let backend reply with a mismatch error.
   * We then get the missing members in the mismatch, that is our fresh list of participants' clients.
   *
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

  public leaveConversation(conversationId: string): Promise<ConversationMemberLeaveEvent> {
    return this.apiClient.api.conversation.deleteMember(conversationId, this.apiClient.context!.userId);
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

    return this.apiClient.api.conversation.postConversation(newConversation);
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

  public async addUser(
    conversationId: string,
    userIds: string | string[] | QualifiedId | QualifiedId[],
  ): Promise<QualifiedId[]> {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const qualifiedIds = isStringArray(ids) ? ids.map(id => ({id, domain: ''} as QualifiedId)) : (ids as QualifiedId[]);
    await this.apiClient.api.conversation.postMembers(conversationId, qualifiedIds);

    return qualifiedIds;
  }

  public async removeUser(conversationId: string, userId: string): Promise<string> {
    await this.apiClient.api.conversation.deleteMember(conversationId, userId);
    return userId;
  }

  /**
   * Sends a message to a conversation
   *
   * @param params.payloadBundle The message to send to the conversation
   * @param params.userIds? Can be either a QualifiedId[], string[], UserClients or QualfiedUserClients. The type has some effect on the behavior of the method.
   *    When given a QualifiedId[] or string[] the method will fetch the freshest list of devices for those users (since they are not given by the consumer). As a consequence no ClientMismatch error will trigger and we will ignore missing clients when sending
   *    When given a QualifiedUserClients or UserClients the method will only send to the clients listed in the userIds. This could lead to ClientMismatch (since the given list of devices might not be the freshest one and new clients could have been created)
   *    When given a QualifiedId[] or QualifiedUserClients the method will send the message through the federated API endpoint
   *    When given a string[] or UserClients the method will send the message through the old API endpoint
   * @return resolves with the sent message
   */
  public async send<T extends OtrMessage = OtrMessage>({
    payloadBundle,
    userIds,
    sendAsProtobuf,
    conversationDomain,
    nativePush,
    targetMode,
    callbacks,
  }: {
    payloadBundle: T;
    userIds?: string[] | QualifiedId[] | UserClients | QualifiedUserClients;
    callbacks?: MessageSendingCallbacks;
  } & MessageSendingOptions): Promise<T> {
    let genericMessage: GenericMessage;
    let processedContent: AssetContent | undefined = undefined;

    switch (payloadBundle.type) {
      case PayloadBundleType.ASSET:
        genericMessage = this.generateFileDataGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.ASSET_ABORT:
        genericMessage = this.generateFileAbortGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.ASSET_META:
        genericMessage = this.generateFileMetaDataGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.ASSET_IMAGE:
        const res = this.generateImageGenericMessage(payloadBundle as ImageAssetMessageOutgoing);
        genericMessage = res.genericMessage;
        processedContent = res.content;
        break;
      case PayloadBundleType.BUTTON_ACTION:
        genericMessage = this.generateButtonActionGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.BUTTON_ACTION_CONFIRMATION:
        genericMessage = this.generateButtonActionConfirmationGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.CALL:
        genericMessage = this.generateCallGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.CLIENT_ACTION: {
        if (payloadBundle.content.clientAction !== ClientAction.RESET_SESSION) {
          throw new Error(
            `No send method implemented for "${payloadBundle.type}" and ClientAction "${payloadBundle.content}".`,
          );
        }
        genericMessage = this.generateSessionResetGenericMessage(payloadBundle);
        break;
      }
      case PayloadBundleType.COMPOSITE:
        genericMessage = this.generateCompositeGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.CONFIRMATION:
        genericMessage = this.generateConfirmationGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.LOCATION:
        genericMessage = this.generateLocationGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.MESSAGE_EDIT:
        genericMessage = this.generateEditedTextGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.PING:
        genericMessage = this.generatePingGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.REACTION:
        genericMessage = this.generateReactionGenericMessage(payloadBundle);
        break;
      case PayloadBundleType.TEXT:
        genericMessage = this.generateTextGenericMessage(payloadBundle);
        break;
      default:
        throw new Error(`No send method implemented for "${payloadBundle['type']}".`);
    }

    if ((await callbacks?.onStart?.(genericMessage)) === false) {
      // If the onStart call returns false, it means the consumer wants to cancel the message sending
      return {...payloadBundle, state: PayloadBundleState.CANCELLED};
    }

    const response = await this.sendGenericMessage(
      this.apiClient.validatedClientId,
      payloadBundle.conversation,
      genericMessage,
      {
        userIds,
        sendAsProtobuf,
        conversationDomain,
        nativePush,
        targetMode,
        onClientMismatch: callbacks?.onClientMismatch,
      },
    );

    if (!response.errored) {
      if (!this.isClearFromMismatch(response)) {
        // We warn the consumer that there is a mismatch that did not prevent message sending
        await callbacks?.onClientMismatch?.(response, true);
      }
      callbacks?.onSuccess?.(genericMessage, response.time);
    }

    return {
      ...payloadBundle,
      content: processedContent || payloadBundle.content,
      messageTimer: genericMessage.ephemeral?.expireAfterMillis || 0,
      state: response.errored ? PayloadBundleState.CANCELLED : PayloadBundleState.OUTGOING_SENT,
    };
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
}
