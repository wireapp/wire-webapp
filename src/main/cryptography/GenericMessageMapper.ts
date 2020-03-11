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

import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/dist/event/';
import {GenericMessage} from '@wireapp/protocol-messaging';
import logdown from 'logdown';
import {
  GenericMessageType,
  PayloadBundle,
  PayloadBundleSource,
  PayloadBundleState,
  PayloadBundleType,
} from '../conversation';
import {
  AssetContent,
  ClearedContent,
  ConfirmationContent,
  DeletedContent,
  EditedTextContent,
  HiddenContent,
  KnockContent,
  LocationContent,
  ReactionContent,
  TextContent,
} from '../conversation/content';
import {ButtonActionMessage} from '../conversation/message/OtrMessage';

export class GenericMessageMapper {
  private static readonly logger = logdown('@wireapp/core/cryptography/GenericMessageMapper', {
    logger: console,
    markdown: false,
  });

  private static mapButtonActionMessage(
    genericMessage: GenericMessage,
    event: ConversationOtrMessageAddEvent,
    source: PayloadBundleSource,
  ): ButtonActionMessage {
    const {buttonAction, messageId} = genericMessage;
    return {
      content: buttonAction!,
      conversation: event.conversation,
      from: event.from,
      fromClientId: event.data.sender,
      id: messageId,
      messageTimer: 0,
      source,
      state: PayloadBundleState.INCOMING,
      timestamp: new Date(event.time).getTime(),
      type: PayloadBundleType.BUTTON_ACTION,
    };
  }

  // TODO: Turn "any" into a specific type (or collection of types) and make the return type more specific based on the
  // "genericMessage" input parameter.
  public static mapGenericMessage(
    genericMessage: any,
    event: ConversationOtrMessageAddEvent,
    source: PayloadBundleSource,
  ): PayloadBundle {
    switch (genericMessage.content) {
      case GenericMessageType.TEXT: {
        const {
          content: text,
          expectsReadConfirmation,
          legalHoldStatus,
          linkPreview: linkPreviews,
          mentions,
          quote,
        } = genericMessage[GenericMessageType.TEXT];

        const content: TextContent = {expectsReadConfirmation, legalHoldStatus, text};

        if (linkPreviews?.length) {
          content.linkPreviews = linkPreviews;
        }

        if (mentions?.length) {
          content.mentions = mentions;
        }

        if (quote) {
          content.quote = quote;
        }

        if (typeof legalHoldStatus !== 'undefined') {
          content.legalHoldStatus = legalHoldStatus;
        }

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.TEXT,
        };
      }
      case GenericMessageType.BUTTON_ACTION: {
        return GenericMessageMapper.mapButtonActionMessage(genericMessage, event, source);
      }
      case GenericMessageType.CALLING: {
        return {
          content: genericMessage.calling.content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.CALL,
        };
      }
      case GenericMessageType.CONFIRMATION: {
        const {firstMessageId, moreMessageIds, type} = genericMessage[GenericMessageType.CONFIRMATION];

        const content: ConfirmationContent = {firstMessageId, moreMessageIds, type};

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.CONFIRMATION,
        };
      }
      case GenericMessageType.CLEARED: {
        const content: ClearedContent = genericMessage[GenericMessageType.CLEARED];

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.CONVERSATION_CLEAR,
        };
      }
      case GenericMessageType.DELETED: {
        const originalMessageId = genericMessage[GenericMessageType.DELETED].messageId;

        const content: DeletedContent = {messageId: originalMessageId};

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.MESSAGE_DELETE,
        };
      }
      case GenericMessageType.EDITED: {
        const {
          expectsReadConfirmation,
          text: {
            content: editedText,
            legalHoldStatus,
            linkPreview: editedLinkPreviews,
            mentions: editedMentions,
            quote: editedQuote,
          },
          replacingMessageId,
        } = genericMessage[GenericMessageType.EDITED];

        const content: EditedTextContent = {
          expectsReadConfirmation,
          legalHoldStatus,
          originalMessageId: replacingMessageId,
          text: editedText,
        };

        if (editedLinkPreviews?.length) {
          content.linkPreviews = editedLinkPreviews;
        }

        if (editedMentions?.length) {
          content.mentions = editedMentions;
        }

        if (editedQuote) {
          content.quote = editedQuote;
        }

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.MESSAGE_EDIT,
        };
      }
      case GenericMessageType.HIDDEN: {
        const {conversationId, messageId} = genericMessage[GenericMessageType.HIDDEN];

        const content: HiddenContent = {
          conversationId,
          messageId,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.MESSAGE_HIDE,
        };
      }
      case GenericMessageType.KNOCK: {
        const {expectsReadConfirmation, legalHoldStatus} = genericMessage[GenericMessageType.KNOCK];
        const content: KnockContent = {expectsReadConfirmation, hotKnock: false, legalHoldStatus};

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.PING,
        };
      }
      case GenericMessageType.LOCATION: {
        const {expectsReadConfirmation, latitude, legalHoldStatus, longitude, name, zoom} = genericMessage[
          GenericMessageType.LOCATION
        ];

        const content: LocationContent = {
          expectsReadConfirmation,
          latitude,
          legalHoldStatus,
          longitude,
          name,
          zoom,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.LOCATION,
        };
      }
      case GenericMessageType.ASSET: {
        const {
          expectsReadConfirmation,
          legalHoldStatus,
          notUploaded,
          original,
          preview,
          status,
          uploaded,
        } = genericMessage[GenericMessageType.ASSET];
        const isImage = !!uploaded?.assetId && !!original?.image;

        const content: AssetContent = {
          abortReason: notUploaded,
          expectsReadConfirmation,
          legalHoldStatus,
          original,
          preview,
          status,
          uploaded,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: isImage ? PayloadBundleType.ASSET_IMAGE : PayloadBundleType.ASSET,
        };
      }
      case GenericMessageType.REACTION: {
        const {emoji, legalHoldStatus, messageId} = genericMessage[GenericMessageType.REACTION];

        const content: ReactionContent = {
          legalHoldStatus,
          originalMessageId: messageId,
          type: emoji,
        };

        return {
          content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.REACTION,
        };
      }
      default: {
        this.logger.warn(`Unhandled event type "${genericMessage.content}": ${JSON.stringify(genericMessage)}`);
        return {
          content: genericMessage.content,
          conversation: event.conversation,
          from: event.from,
          fromClientId: event.data.sender,
          id: genericMessage.messageId,
          messageTimer: 0,
          source,
          state: PayloadBundleState.INCOMING,
          timestamp: new Date(event.time).getTime(),
          type: PayloadBundleType.UNKNOWN,
        };
      }
    }
  }
}
