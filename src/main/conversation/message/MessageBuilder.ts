/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {APIClient} from '@wireapp/api-client';
import {Button, ClientAction, Composite, Confirmation, Text} from '@wireapp/protocol-messaging';
import {AbortReason, PayloadBundleSource, PayloadBundleState, PayloadBundleType} from '..';
import {AssetService} from '../AssetService';
import {
  ButtonActionContent,
  ButtonActionConfirmationContent,
  CallingContent,
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
  KnockContent,
  LegalHoldStatus,
  LinkPreviewContent,
  LinkPreviewUploadedContent,
  LocationContent,
  ReactionContent,
  TextContent,
  CompositeContent,
} from '../content';
import {
  ButtonActionMessage,
  ButtonActionConfirmationMessage,
  CallMessage,
  CompositeMessage,
  ConfirmationMessage,
  EditedTextMessage,
  FileAssetAbortMessage,
  FileAssetMessage,
  FileAssetMetaDataMessage,
  ImageAssetMessageOutgoing,
  LocationMessage,
  PingMessage,
  ReactionMessage,
  ResetSessionMessage,
  TextMessage,
} from './OtrMessage';
import {TextContentBuilder} from './TextContentBuilder';
import Item = Composite.Item;

const UUID = require('pure-uuid');

export class MessageBuilder {
  private readonly apiClient: APIClient;
  private readonly assetService: AssetService;

  constructor(apiClient: APIClient, assetService: AssetService) {
    this.apiClient = apiClient;
    this.assetService = assetService;
  }

  public createEditedText(
    conversationId: string,
    newMessageText: string,
    originalMessageId: string,
    messageId = MessageBuilder.createId(),
  ): TextContentBuilder {
    const content: EditedTextContent = {
      originalMessageId,
      text: newMessageText,
    };

    const payloadBundle: EditedTextMessage = {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.MESSAGE_EDIT,
    };

    return new TextContentBuilder(payloadBundle);
  }

  public async createFileData(
    conversationId: string,
    file: FileContent,
    originalMessageId: string,
    expectsReadConfirmation?: boolean,
    legalHoldStatus?: LegalHoldStatus,
  ): Promise<FileAssetMessage> {
    const imageAsset = await this.assetService.uploadFileAsset(file);

    const content: FileAssetContent = {
      asset: imageAsset,
      expectsReadConfirmation,
      file,
      legalHoldStatus,
    };

    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: originalMessageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET,
    };
  }

  public createFileMetadata(
    conversationId: string,
    metaData: FileMetaDataContent,
    messageId = MessageBuilder.createId(),
    expectsReadConfirmation?: boolean,
    legalHoldStatus?: LegalHoldStatus,
  ): FileAssetMetaDataMessage {
    const content: FileAssetMetaDataContent = {
      expectsReadConfirmation,
      legalHoldStatus,
      metaData,
    };

    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET_META,
    };
  }

  public async createFileAbort(
    conversationId: string,
    reason: AbortReason,
    originalMessageId: string,
    expectsReadConfirmation?: boolean,
    legalHoldStatus?: LegalHoldStatus,
  ): Promise<FileAssetAbortMessage> {
    const content: FileAssetAbortContent = {
      expectsReadConfirmation,
      legalHoldStatus,
      reason,
    };

    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: originalMessageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET_ABORT,
    };
  }

  public async createImage(
    conversationId: string,
    image: ImageContent,
    messageId = MessageBuilder.createId(),
    expectsReadConfirmation?: boolean,
    legalHoldStatus?: LegalHoldStatus,
  ): Promise<ImageAssetMessageOutgoing> {
    const imageAsset = await this.assetService.uploadImageAsset(image);

    const content: ImageAssetContent = {
      asset: imageAsset,
      expectsReadConfirmation,
      image,
      legalHoldStatus,
    };

    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.ASSET_IMAGE,
    };
  }

  public createLocation(
    conversationId: string,
    location: LocationContent,
    messageId = MessageBuilder.createId(),
  ): LocationMessage {
    return {
      content: location,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.LOCATION,
    };
  }

  public createCall(
    conversationId: string,
    content: CallingContent,
    messageId = MessageBuilder.createId(),
  ): CallMessage {
    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.CALL,
    };
  }

  public createReaction(
    conversationId: string,
    reaction: ReactionContent,
    messageId = MessageBuilder.createId(),
  ): ReactionMessage {
    return {
      content: reaction,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.REACTION,
    };
  }

  public createText(conversationId: string, text: string, messageId = MessageBuilder.createId()): TextContentBuilder {
    const content: TextContent = {text};

    const payloadBundle: TextMessage = {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.TEXT,
    };

    return new TextContentBuilder(payloadBundle);
  }

  public createConfirmation(
    conversationId: string,
    firstMessageId: string,
    type: Confirmation.Type,
    messageId = MessageBuilder.createId(),
    moreMessageIds?: string[],
  ): ConfirmationMessage {
    const content: ConfirmationContent = {firstMessageId, moreMessageIds, type};
    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.CONFIRMATION,
    };
  }

  createButtonActionMessage(
    conversationId: string,
    content: ButtonActionContent,
    messageId = MessageBuilder.createId(),
  ): ButtonActionMessage {
    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.BUTTON_ACTION,
    };
  }

  createButtonActionConfirmationMessage(
    conversationId: string,
    content: ButtonActionConfirmationContent,
    messageId = MessageBuilder.createId(),
  ): ButtonActionConfirmationMessage {
    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.BUTTON_ACTION_CONFIRMATION,
    };
  }

  createPollMessage(
    conversationId: string,
    text: Text,
    buttons: string[],
    messageId = MessageBuilder.createId(),
  ): CompositeMessage {
    const buttonProtos = [];
    for (let counter = 0; counter < buttons.length; counter++) {
      const buttonText = buttons[counter];
      buttonProtos.push(Button.create({id: counter.toString(10), text: buttonText}));
    }

    const content: CompositeContent = {
      items: [Item.create({text}), ...buttonProtos.map(button => Item.create({button}))],
    };

    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.COMPOSITE,
    };
  }

  public createPing(
    conversationId: string,
    ping: KnockContent = {
      hotKnock: false,
    },
    messageId = MessageBuilder.createId(),
  ): PingMessage {
    return {
      content: ping,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.PING,
    };
  }

  public createSessionReset(conversationId: string, messageId = MessageBuilder.createId()): ResetSessionMessage {
    const content: ClientActionContent = {
      clientAction: ClientAction.RESET_SESSION,
    };
    return {
      content,
      conversation: conversationId,
      from: this.getSelfUserId(),
      id: messageId,
      source: PayloadBundleSource.LOCAL,
      state: PayloadBundleState.OUTGOING_UNSENT,
      timestamp: Date.now(),
      type: PayloadBundleType.CLIENT_ACTION,
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

  public static createId(): string {
    return new UUID(4).format();
  }

  private getSelfUserId(): string {
    return this.apiClient.context!.userId;
  }
}
