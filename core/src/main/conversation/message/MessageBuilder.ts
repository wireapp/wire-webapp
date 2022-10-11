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

import UUID from 'uuidjs';

import {
  ButtonActionConfirmationMessage,
  ButtonActionMessage,
  CallMessage,
  ConfirmationMessage,
  DeleteMessage,
  EditedTextMessage,
  FileAssetAbortMessage,
  FileAssetMessage,
  FileAssetMetaDataMessage,
  HideMessage,
  ImageAssetMessageOutgoing,
  LocationMessage,
  PingMessage,
  ReactionMessage,
  TextMessage,
} from './OtrMessage';

import {
  IComposite,
  Asset,
  ButtonAction,
  ButtonActionConfirmation,
  Calling,
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
import {MessageToProtoMapper} from '../message/MessageToProtoMapper';
import {GenericMessageType} from '../GenericMessageType';
import {AssetTransferState} from '../AssetTransferState';

export function createId() {
  return UUID.genV4().toString();
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
  const {asset, expectsReadConfirmation, legalHoldStatus} = payloadBundle;

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
    messageId,
  });

  return genericMessage;
}

export function buildFileMetaDataMessage(payloadBundle: FileAssetMetaDataMessage['content']): GenericMessage {
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
    messageId: createId(),
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

export function buildSessionResetMessage(): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.CLIENT_ACTION]: ClientAction.RESET_SESSION,
    messageId: createId(),
  });
}

export function buildCallMessage(payloadBundle: CallMessage['content']): GenericMessage {
  const callMessage = Calling.create({
    content: payloadBundle,
  });

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
