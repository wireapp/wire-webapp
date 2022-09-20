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

import {ClientAction, Confirmation} from '@wireapp/protocol-messaging';
import UUID from 'uuidjs';

import {AbortReason, PayloadBundleSource, PayloadBundleState, PayloadBundleType} from '..';
import {EncryptedAssetUploaded} from '../../cryptography';
import {
  ButtonActionConfirmationContent,
  ButtonActionContent,
  CallingContent,
  FileContent,
  FileMetaDataContent,
  ImageContent,
  KnockContent,
  LegalHoldStatus,
  LocationContent,
  ReactionContent,
} from '../content';
import {CompositeContentBuilder} from './CompositeContentBuilder';
import {
  ButtonActionConfirmationMessage,
  ButtonActionMessage,
  CallMessage,
  ConfirmationMessage,
  DeleteMessage,
  FileAssetAbortMessage,
  FileAssetMessage,
  FileAssetMetaDataMessage,
  ImageAssetMessageOutgoing,
  LocationMessage,
  PingMessage,
  ReactionMessage,
  ResetSessionMessage,
} from './OtrMessage';
import {TextContentBuilder} from './TextContentBuilder';

interface BaseOptions {
  conversationId: string;
  from: string;
  messageId?: string;
}

interface CreateDeleteOption extends BaseOptions {
  messageIdToDelete: string;
}

interface CreateImageOptions extends BaseOptions {
  expectsReadConfirmation?: boolean;
  asset: EncryptedAssetUploaded;
  image: ImageContent;
  legalHoldStatus?: LegalHoldStatus;
}

interface CreateFileOptions extends BaseOptions {
  expectsReadConfirmation?: boolean;
  asset: EncryptedAssetUploaded;
  file: FileContent;
  legalHoldStatus?: LegalHoldStatus;
  originalMessageId: string;
}

interface CreateEditedTextOptions extends BaseOptions {
  newMessageText: string;
  originalMessageId: string;
}

interface CreateFileMetadataOptions extends BaseOptions {
  expectsReadConfirmation?: boolean;
  legalHoldStatus?: LegalHoldStatus;
  metaData: FileMetaDataContent;
}

interface CreateFileAbortOptions {
  conversationId: string;
  expectsReadConfirmation?: boolean;
  from: string;
  legalHoldStatus?: LegalHoldStatus;
  originalMessageId: string;
  reason: AbortReason;
}

interface CreateLocationOptions extends BaseOptions {
  location: LocationContent;
}

interface CreateCallOptions extends BaseOptions {
  content: CallingContent;
}

interface CreateReactionOptions extends BaseOptions {
  reaction: ReactionContent;
}

interface CreateTextOptions extends BaseOptions {
  text: string;
}

interface CreateConfirmationOptions extends BaseOptions {
  firstMessageId: string;
  moreMessageIds?: string[];
  type: Confirmation.Type;
}

interface CreatePingOptions extends BaseOptions {
  ping?: KnockContent;
}

interface CreateButtonActionConfirmationOptions extends BaseOptions {
  content: ButtonActionConfirmationContent;
}

interface CreateActionMessageOptions extends BaseOptions {
  content: ButtonActionContent;
}

function createCommonProperties<T extends BaseOptions>(
  options: T,
): {
  id: string;
  conversation: string;
  from: string;
  source: PayloadBundleSource;
  state: PayloadBundleState;
  timestamp: number;
} {
  return {
    id: options.messageId || MessageBuilder.createId(),
    conversation: options.conversationId,
    from: options.from,
    source: PayloadBundleSource.LOCAL,
    state: PayloadBundleState.OUTGOING_UNSENT,
    timestamp: Date.now(),
  };
}

export class MessageBuilder {
  public static createEditedText(payload: CreateEditedTextOptions): TextContentBuilder {
    return new TextContentBuilder({
      ...createCommonProperties(payload),
      content: {
        originalMessageId: payload.originalMessageId,
        text: payload.newMessageText,
      },
      type: PayloadBundleType.MESSAGE_EDIT,
    });
  }

  public static createFileData(payload: CreateFileOptions): FileAssetMessage {
    const {asset, expectsReadConfirmation, file, legalHoldStatus, originalMessageId} = payload;

    return {
      ...createCommonProperties(payload),
      content: {
        asset,
        expectsReadConfirmation,
        file,
        legalHoldStatus,
      },
      id: originalMessageId,
      type: PayloadBundleType.ASSET,
    };
  }

  public static createDelete(payload: CreateDeleteOption): DeleteMessage {
    return {
      ...createCommonProperties(payload),
      content: {messageId: payload.messageIdToDelete},
      type: PayloadBundleType.MESSAGE_DELETE,
    };
  }

  public static createFileMetadata(payload: CreateFileMetadataOptions): FileAssetMetaDataMessage {
    const {expectsReadConfirmation, legalHoldStatus, metaData} = payload;

    return {
      ...createCommonProperties(payload),
      content: {
        expectsReadConfirmation,
        legalHoldStatus,
        metaData,
      },
      type: PayloadBundleType.ASSET_META,
    };
  }

  public static createFileAbort(payload: CreateFileAbortOptions): FileAssetAbortMessage {
    const {expectsReadConfirmation, legalHoldStatus, reason} = payload;

    return {
      ...createCommonProperties(payload),
      content: {
        expectsReadConfirmation,
        legalHoldStatus,
        reason,
      },
      id: payload.originalMessageId,
      type: PayloadBundleType.ASSET_ABORT,
    };
  }

  public static createImage(payload: CreateImageOptions): ImageAssetMessageOutgoing {
    const {expectsReadConfirmation, image, asset, legalHoldStatus} = payload;
    return {
      ...createCommonProperties(payload),
      content: {
        expectsReadConfirmation,
        image,
        asset,
        legalHoldStatus,
      },
      type: PayloadBundleType.ASSET_IMAGE,
    };
  }

  public static createLocation(payload: CreateLocationOptions): LocationMessage {
    return {
      ...createCommonProperties(payload),
      content: payload.location,
      type: PayloadBundleType.LOCATION,
    };
  }

  public static createCall(payload: CreateCallOptions): CallMessage {
    return {
      ...createCommonProperties(payload),
      content: payload.content,
      type: PayloadBundleType.CALL,
    };
  }

  public static createReaction(payload: CreateReactionOptions): ReactionMessage {
    return {
      ...createCommonProperties(payload),
      content: payload.reaction,
      type: PayloadBundleType.REACTION,
    };
  }

  public static createText(payload: CreateTextOptions): TextContentBuilder {
    return new TextContentBuilder({
      ...createCommonProperties(payload),
      content: {text: payload.text},
      type: PayloadBundleType.TEXT,
    });
  }

  public static createConfirmation(payload: CreateConfirmationOptions): ConfirmationMessage {
    const {firstMessageId, moreMessageIds, type} = payload;
    return {
      ...createCommonProperties(payload),
      content: {firstMessageId, moreMessageIds, type},
      type: PayloadBundleType.CONFIRMATION,
    };
  }

  public static createButtonActionMessage(payload: CreateActionMessageOptions): ButtonActionMessage {
    return {
      ...createCommonProperties(payload),
      content: payload.content,
      type: PayloadBundleType.BUTTON_ACTION,
    };
  }

  public static createButtonActionConfirmationMessage(
    payload: CreateButtonActionConfirmationOptions,
  ): ButtonActionConfirmationMessage {
    return {
      ...createCommonProperties(payload),
      content: payload.content,
      type: PayloadBundleType.BUTTON_ACTION_CONFIRMATION,
    };
  }

  public static createComposite(payload: BaseOptions): CompositeContentBuilder {
    return new CompositeContentBuilder({
      ...createCommonProperties(payload),
      content: {},
      type: PayloadBundleType.COMPOSITE,
    });
  }

  public static createPing(payload: CreatePingOptions): PingMessage {
    return {
      ...createCommonProperties(payload),
      content: payload.ping || {hotKnock: false},
      type: PayloadBundleType.PING,
    };
  }

  public static createSessionReset(payload: BaseOptions): ResetSessionMessage {
    return {
      ...createCommonProperties(payload),
      content: {
        clientAction: ClientAction.RESET_SESSION,
      },
      type: PayloadBundleType.CLIENT_ACTION,
    };
  }

  public static createId(): string {
    return UUID.genV4().toString();
  }
}
