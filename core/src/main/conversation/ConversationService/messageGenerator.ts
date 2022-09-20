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

import {
  ButtonActionConfirmationMessage,
  ButtonActionMessage,
  CallMessage,
  CompositeMessage,
  ConfirmationMessage,
  DeleteMessage,
  EditedTextMessage,
  FileAssetAbortMessage,
  FileAssetMessage,
  FileAssetMetaDataMessage,
  ImageAssetMessageOutgoing,
  LocationMessage,
  OtrMessage,
  PingMessage,
  ReactionMessage,
  ResetSessionMessage,
  TextMessage,
} from '../message/OtrMessage';
import {
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
  Reaction,
} from '@wireapp/protocol-messaging';
import {PayloadBundleType} from '../message/PayloadBundle';
import {MessageToProtoMapper} from '../message/MessageToProtoMapper';
import {GenericMessageType} from '../GenericMessageType';
import {AssetTransferState} from '../AssetTransferState';
import {MessageTimer} from '../MessageTimer';

interface GeneratedMessage<T extends OtrMessage> {
  genericMessage: GenericMessage;
  content: T['content'];
}

export function generateGenericMessage<T extends OtrMessage>(
  payload: T,
  messageTimer: MessageTimer,
): GeneratedMessage<T> {
  const content = payload.content;
  switch (payload.type) {
    case PayloadBundleType.ASSET:
      return {genericMessage: generateFileDataGenericMessage(payload, messageTimer), content};
    case PayloadBundleType.ASSET_ABORT:
      return {genericMessage: generateFileAbortGenericMessage(payload, messageTimer), content};
    case PayloadBundleType.ASSET_META:
      return {genericMessage: generateFileMetaDataGenericMessage(payload, messageTimer), content};
    case PayloadBundleType.ASSET_IMAGE:
      return generateImageGenericMessage(payload as ImageAssetMessageOutgoing, messageTimer);
    case PayloadBundleType.BUTTON_ACTION:
      return {genericMessage: generateButtonActionGenericMessage(payload), content};
    case PayloadBundleType.BUTTON_ACTION_CONFIRMATION:
      return {genericMessage: generateButtonActionConfirmationGenericMessage(payload), content};
    case PayloadBundleType.CALL:
      return {genericMessage: generateCallGenericMessage(payload), content};
    case PayloadBundleType.CLIENT_ACTION:
      return {genericMessage: generateSessionResetGenericMessage(payload), content};
    case PayloadBundleType.COMPOSITE:
      return {genericMessage: generateCompositeGenericMessage(payload), content};
    case PayloadBundleType.CONFIRMATION:
      return {genericMessage: generateConfirmationGenericMessage(payload), content};
    case PayloadBundleType.LOCATION:
      return {genericMessage: generateLocationGenericMessage(payload, messageTimer), content};
    case PayloadBundleType.MESSAGE_EDIT:
      return {genericMessage: generateEditedTextGenericMessage(payload), content};
    case PayloadBundleType.PING:
      return {genericMessage: generatePingGenericMessage(payload, messageTimer), content};
    case PayloadBundleType.REACTION:
      return {genericMessage: generateReactionGenericMessage(payload), content};
    case PayloadBundleType.TEXT:
      return {genericMessage: generateTextGenericMessage(payload, messageTimer), content};

    case PayloadBundleType.MESSAGE_DELETE:
      return {genericMessage: generateDeleteMessage(payload), content};

    /**
     * ToDo: Create Generic implementation for everything else
     */
    default:
      throw new Error(`No send method implemented for "${payload['type']}".`);
  }
}

function generateButtonActionGenericMessage(payloadBundle: ButtonActionMessage): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.BUTTON_ACTION]: ButtonAction.create(payloadBundle.content),
    messageId: payloadBundle.id,
  });
}

function generateButtonActionConfirmationGenericMessage(
  payloadBundle: ButtonActionConfirmationMessage,
): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.BUTTON_ACTION_CONFIRMATION]: ButtonActionConfirmation.create(payloadBundle.content),
    messageId: payloadBundle.id,
  });
}

function generateCompositeGenericMessage(payloadBundle: CompositeMessage): GenericMessage {
  return GenericMessage.create({
    [GenericMessageType.COMPOSITE]: Composite.create(payloadBundle.content),
    messageId: payloadBundle.id,
  });
}

function generateConfirmationGenericMessage(payloadBundle: ConfirmationMessage): GenericMessage {
  const content = Confirmation.create(payloadBundle.content);

  return GenericMessage.create({
    [GenericMessageType.CONFIRMATION]: content,
    messageId: payloadBundle.id,
  });
}

function generateEditedTextGenericMessage(payloadBundle: EditedTextMessage): GenericMessage {
  const editedMessage = MessageEdit.create({
    replacingMessageId: payloadBundle.content.originalMessageId,
    text: MessageToProtoMapper.mapText(payloadBundle),
  });

  return GenericMessage.create({
    [GenericMessageType.EDITED]: editedMessage,
    messageId: payloadBundle.id,
  });
}

function generateFileDataGenericMessage(payloadBundle: FileAssetMessage, messageTimer: MessageTimer): GenericMessage {
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

  const expireAfterMillis = messageTimer.getMessageTimer(payloadBundle.conversation);
  return expireAfterMillis > 0 ? createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
}

function generateFileMetaDataGenericMessage(
  payloadBundle: FileAssetMetaDataMessage,
  messageTimer: MessageTimer,
): GenericMessage {
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

  const expireAfterMillis = messageTimer.getMessageTimer(payloadBundle.conversation);
  return expireAfterMillis > 0 ? createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
}

function generateFileAbortGenericMessage(
  payloadBundle: FileAssetAbortMessage,
  messageTimer: MessageTimer,
): GenericMessage {
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

  const expireAfterMillis = messageTimer.getMessageTimer(payloadBundle.conversation);
  return expireAfterMillis > 0 ? createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
}

function generateImageGenericMessage(
  payloadBundle: ImageAssetMessageOutgoing,
  messageTimer: MessageTimer,
): {
  content: Asset;
  genericMessage: GenericMessage;
} {
  const imageAsset = generateAsset(payloadBundle);

  let genericMessage = GenericMessage.create({
    [GenericMessageType.ASSET]: imageAsset,
    messageId: payloadBundle.id,
  });

  const expireAfterMillis = messageTimer.getMessageTimer(payloadBundle.conversation);
  if (expireAfterMillis) {
    genericMessage = createEphemeral(genericMessage, expireAfterMillis);
  }

  return {genericMessage, content: imageAsset};
}
function generateLocationGenericMessage(payloadBundle: LocationMessage, messageTimer: MessageTimer): GenericMessage {
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

  const expireAfterMillis = messageTimer.getMessageTimer(payloadBundle.conversation);
  return expireAfterMillis > 0 ? createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
}
function generatePingGenericMessage(payloadBundle: PingMessage, messageTimer: MessageTimer): GenericMessage {
  const content = Knock.create(payloadBundle.content);

  const genericMessage = GenericMessage.create({
    [GenericMessageType.KNOCK]: content,
    messageId: payloadBundle.id,
  });

  const expireAfterMillis = messageTimer.getMessageTimer(payloadBundle.conversation);
  return expireAfterMillis > 0 ? createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
}
function generateReactionGenericMessage(payloadBundle: ReactionMessage): GenericMessage {
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
function generateSessionResetGenericMessage(payload: ResetSessionMessage): GenericMessage {
  if (payload.content.clientAction !== ClientAction.RESET_SESSION) {
    throw new Error(`No send method implemented for "${payload.type}" and ClientAction "${payload.content}".`);
  }
  return GenericMessage.create({
    [GenericMessageType.CLIENT_ACTION]: ClientAction.RESET_SESSION,
    messageId: payload.id,
  });
}
function generateCallGenericMessage(payloadBundle: CallMessage): GenericMessage {
  const callMessage = Calling.create({
    content: payloadBundle.content,
  });

  return GenericMessage.create({
    [GenericMessageType.CALLING]: callMessage,
    messageId: payloadBundle.id,
  });
}

function generateDeleteMessage(payload: DeleteMessage): GenericMessage {
  const content = MessageDelete.create({
    messageId: payload.content.messageId,
  });

  return GenericMessage.create({
    [GenericMessageType.DELETED]: content,
    messageId: payload.id,
  });
}

function generateTextGenericMessage(payloadBundle: TextMessage, messageTimer: MessageTimer): GenericMessage {
  const genericMessage = GenericMessage.create({
    messageId: payloadBundle.id,
    [GenericMessageType.TEXT]: MessageToProtoMapper.mapText(payloadBundle),
  });

  const expireAfterMillis = messageTimer.getMessageTimer(payloadBundle.conversation);
  return expireAfterMillis > 0 ? createEphemeral(genericMessage, expireAfterMillis) : genericMessage;
}

function generateAsset(payloadBundle: ImageAssetMessageOutgoing): Asset {
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

function createEphemeral(originalGenericMessage: GenericMessage, expireAfterMillis: number): GenericMessage {
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
