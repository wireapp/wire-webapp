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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {v4 as uuidv4} from 'uuid';

import {
  IComposite,
  Asset,
  ButtonAction,
  ButtonActionConfirmation,
  Calling,
  ClientAction,
  Composite,
  Confirmation,
  DataTransfer,
  Ephemeral,
  GenericMessage,
  Knock,
  Location,
  MessageDelete,
  MessageEdit,
  MessageHide,
  Reaction,
  InCallEmoji,
  LastRead,
  Cleared,
  ICalling,
  InCallHandRaise,
} from '@wireapp/protocol-messaging';

import {
  ButtonActionConfirmationMessage,
  ButtonActionMessage,
  ConfirmationMessage,
  DeleteMessage,
  EditedTextMessage,
  FileAssetAbortMessage,
  FileAssetMessage,
  FileAssetMetaDataMessage,
  HideMessage,
  ImageAssetMessageOutgoing,
  InCallEmojiMessage,
  InCallHandRaiseMessage,
  LocationMessage,
  PingMessage,
  ReactionMessage,
  TextMessage,
} from './OtrMessage';

import {AssetTransferState} from '../AssetTransferState';
import {MultiPartContent, TextContent} from '../content';
import {GenericMessageType} from '../GenericMessageType';
import {MessageToProtoMapper} from '../message/MessageToProtoMapper';

export function createId() {
  return uuidv4();
}

export function buildButtonActionMessage(payloadBundle: ButtonActionMessage['content']): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.BUTTON_ACTION]: ButtonAction.create(payloadBundle),
    messageId: createId(),
  });
}

export function buildButtonActionConfirmationMessage(
  payloadBundle: ButtonActionConfirmationMessage['content'],
): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.BUTTON_ACTION_CONFIRMATION]: ButtonActionConfirmation.create(payloadBundle),
    messageId: createId(),
  });
}

export function buildCompositeMessage(payload: IComposite): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.COMPOSITE]: Composite.create(payload),
    messageId: createId(),
  });
}

export function buildConfirmationMessage(payloadBundle: ConfirmationMessage['content']): GenericMessage {
  const content = Confirmation.create(payloadBundle);

  return GenericMessage.create({
    [GenericMessageType.CONFIRMATION]: content,
    messageId: createId(),
  });
}

export function buildEditedTextMessage(
  payloadBundle: EditedTextMessage['content'],
  messageId: string = createId(),
): GenericMessage {
  const editedMessage = MessageEdit.create({
    replacingMessageId: payloadBundle.originalMessageId,
    text: MessageToProtoMapper.mapText(payloadBundle),
  });

  return GenericMessage.create({
    [GenericMessageType.EDITED]: editedMessage,
    messageId,
  });
}

export function buildFileDataMessage(
  payloadBundle: FileAssetMessage['content'],
  messageId: string = createId(),
): GenericMessage {
  const {asset, expectsReadConfirmation, legalHoldStatus, metaData} = payloadBundle;

  const remoteData = Asset.RemoteData.create({
    assetId: asset.key,
    assetToken: asset.token,
    otrKey: asset.keyBytes,
    sha256: asset.sha256,
    assetDomain: asset.domain,
  });

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
    uploaded: remoteData,
    original,
  });

  assetMessage.status = AssetTransferState.UPLOADED;

  const genericMessage = GenericMessage.create({
    [GenericMessageType.ASSET]: assetMessage,
    messageId,
  });

  return genericMessage;
}

export function buildFileMetaDataMessage(
  payloadBundle: FileAssetMetaDataMessage['content'],
  messageId: string = createId(),
): GenericMessage {
  const {expectsReadConfirmation, legalHoldStatus, metaData} = payloadBundle;

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
    messageId,
  });

  return genericMessage;
}

export function buildFileAbortMessage(
  payloadBundle: FileAssetAbortMessage['content'],
  messageId: string = createId(),
): GenericMessage {
  const {expectsReadConfirmation, legalHoldStatus, reason} = payloadBundle;

  const assetMessage = Asset.create({
    expectsReadConfirmation,
    legalHoldStatus,
    notUploaded: reason,
  });

  assetMessage.status = AssetTransferState.NOT_UPLOADED;

  const genericMessage = GenericMessage.create({
    [GenericMessageType.ASSET]: assetMessage,
    messageId,
  });

  return genericMessage;
}

export function buildLastReadMessage(conversationId: QualifiedId, lastReadTimestamp: number) {
  const lastRead = new LastRead({
    conversationId: conversationId.id,
    lastReadTimestamp,
    qualifiedConversationId: conversationId,
  });

  return GenericMessage.create({
    [GenericMessageType.LAST_READ]: lastRead,
    messageId: createId(),
  });
}

export function buildDataTransferMessage(identifier: string) {
  const dataTransfer = new DataTransfer({
    trackingIdentifier: {
      identifier,
    },
  });

  return new GenericMessage({
    [GenericMessageType.DATA_TRANSFER]: dataTransfer,
    messageId: createId(),
  });
}

export function buildClearedMessage(conversationId: QualifiedId, timestamp: number = Date.now()) {
  const clearedMessage = Cleared.create({
    clearedTimestamp: timestamp,
    conversationId: conversationId.id,
  });

  return GenericMessage.create({
    [GenericMessageType.CLEARED]: clearedMessage,
    messageId: createId(),
  });
}

export function buildImageMessage(
  payloadBundle: ImageAssetMessageOutgoing['content'],
  messageId: string = createId(),
): GenericMessage {
  const imageAsset = buildAsset(payloadBundle);

  const genericMessage = GenericMessage.create({
    [GenericMessageType.ASSET]: imageAsset,
    messageId,
  });

  return genericMessage;
}
export function buildLocationMessage(payloadBundle: LocationMessage['content']): GenericMessage {
  const {expectsReadConfirmation, latitude, legalHoldStatus, longitude, name, zoom} = payloadBundle;

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
    messageId: createId(),
  });

  return genericMessage;
}
export function buildPingMessage(payloadBundle: PingMessage['content']): GenericMessage {
  const content = Knock.create(payloadBundle);

  const genericMessage = GenericMessage.create({
    [GenericMessageType.KNOCK]: content,
    messageId: createId(),
  });

  return genericMessage;
}

export function buildReactionMessage(payloadBundle: ReactionMessage['content']): GenericMessage {
  const {legalHoldStatus, originalMessageId, type} = payloadBundle;

  const reaction = Reaction.create({
    emoji: type,
    legalHoldStatus,
    messageId: originalMessageId,
  });

  const genericMessage = GenericMessage.create({
    [GenericMessageType.REACTION]: reaction,
    messageId: createId(),
  });
  return genericMessage;
}

export function buildInCallEmojiMessage(payloadBundle: InCallEmojiMessage['content']): GenericMessage {
  const {emojis} = payloadBundle;

  const reaction = InCallEmoji.create({
    emojis,
  });

  return GenericMessage.create({
    [GenericMessageType.IN_CALL_EMOJI]: reaction,
    messageId: createId(),
    unknownStrategy: GenericMessage.UnknownStrategy.IGNORE,
  });
}

export function buildInCallHandRaiseMessage(payloadBundle: InCallHandRaiseMessage['content']): GenericMessage {
  const {isHandUp} = payloadBundle;

  const handRaise = InCallHandRaise.create({
    isHandUp,
  });

  return GenericMessage.create({
    [GenericMessageType.IN_CALL_HAND_RAISE]: handRaise,
    messageId: createId(),
    unknownStrategy: GenericMessage.UnknownStrategy.IGNORE,
  });
}

export function buildSessionResetMessage(): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.CLIENT_ACTION]: ClientAction.RESET_SESSION,
    messageId: createId(),
  });
}

export function buildCallMessage(payload: ICalling): GenericMessage {
  const callMessage = Calling.create(payload);

  return GenericMessage.create({
    [GenericMessageType.CALLING]: callMessage,
    messageId: createId(),
  });
}

export function buildDeleteMessage(payload: DeleteMessage['content']): GenericMessage {
  const content = MessageDelete.create(payload);

  return GenericMessage.create({
    [GenericMessageType.DELETED]: content,
    messageId: createId(),
  });
}

export function buildHideMessage(payload: HideMessage['content']): GenericMessage {
  const content = MessageHide.create(payload);

  return GenericMessage.create({
    [GenericMessageType.HIDDEN]: content,
    messageId: createId(),
  });
}

export function buildMultipartMessage(
  attachments: MultiPartContent['attachments'],
  textContent: TextContent,
  messageId: string = createId(),
): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.MULTIPART]: {
      attachments,
      text: MessageToProtoMapper.mapText(textContent),
    },
    messageId: messageId,
  });
}

export function buildEditedMultipartMessage(
  attachments: MultiPartContent['attachments'],
  textContent: TextContent,
  originalMessageId: string,
  messageId: string = createId(),
): GenericMessage {
  const editedMessage = MessageEdit.create({
    replacingMessageId: originalMessageId,
    multipart: {
      attachments,
      text: MessageToProtoMapper.mapText(textContent),
    },
  });

  return GenericMessage.create({
    [GenericMessageType.EDITED]: editedMessage,
    messageId: messageId,
  });
}

export function buildTextMessage(
  payloadBundle: TextMessage['content'],
  messageId: string = createId(),
): GenericMessage {
  const genericMessage = GenericMessage.create({
    messageId,
    [GenericMessageType.TEXT]: MessageToProtoMapper.mapText(payloadBundle),
  });

  return genericMessage;
}

function buildAsset(payloadBundle: ImageAssetMessageOutgoing['content']): Asset {
  const {asset, expectsReadConfirmation, image, legalHoldStatus} = payloadBundle;

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

export function wrapInEphemeral(originalGenericMessage: GenericMessage, expireAfterMillis: number): GenericMessage {
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
