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

import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/lib/event/';

import {LogFactory} from '@wireapp/commons';

import {GenericMessageType, MessageSendingState, PayloadBundle, PayloadBundleType} from '../conversation';
import {
  AssetContent,
  ClearedContent,
  ConfirmationContent,
  DeletedContent,
  EditedTextContent,
  HiddenContent,
  KnockContent,
  LocationContent,
  MultiPartContent,
  ReactionContent,
  TextContent,
} from '../conversation/content';
import {NotificationSource} from '../notification';

export class GenericMessageMapper {
  private static readonly logger = LogFactory.getLogger('@wireapp/core/GenericMessageMapper');

  // TODO: Turn "any" into a specific type (or collection of types) and make the return type more specific based on the
  // "genericMessage" input parameter.
  public static mapGenericMessage(
    genericMessage: any,
    event: ConversationOtrMessageAddEvent,
    source: NotificationSource,
  ): PayloadBundle {
    const baseMessage: Omit<PayloadBundle, 'content' | 'type'> = {
      conversation: event.conversation,
      qualifiedConversation: event.qualified_conversation,
      qualifiedFrom: event.qualified_from,
      fromClientId: event.data.sender,
      from: event.from,
      state: MessageSendingState.INCOMING,
      timestamp: new Date(event.time).getTime(),
      id: genericMessage.messageId,
      messageTimer: 0,
      source,
    };
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
          ...baseMessage,
          content,
          type: PayloadBundleType.TEXT,
        };
      }
      case GenericMessageType.BUTTON_ACTION: {
        return {
          ...baseMessage,
          content: genericMessage.buttonAction!,
          type: PayloadBundleType.BUTTON_ACTION,
        };
      }
      case GenericMessageType.CALLING: {
        return {
          ...baseMessage,
          content: genericMessage.calling.content,
          type: PayloadBundleType.CALL,
        };
      }
      case GenericMessageType.CONFIRMATION: {
        const {firstMessageId, moreMessageIds, type} = genericMessage[GenericMessageType.CONFIRMATION];

        const content: ConfirmationContent = {firstMessageId, moreMessageIds, type};

        return {
          ...baseMessage,
          content,
          type: PayloadBundleType.CONFIRMATION,
        };
      }
      case GenericMessageType.CLEARED: {
        const content: ClearedContent = genericMessage[GenericMessageType.CLEARED];

        return {
          ...baseMessage,
          content,
          type: PayloadBundleType.CONVERSATION_CLEAR,
        };
      }
      case GenericMessageType.DELETED: {
        const originalMessageId = genericMessage[GenericMessageType.DELETED].messageId;

        const content: DeletedContent = {messageId: originalMessageId};

        return {
          ...baseMessage,
          content,
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
          ...baseMessage,
          content,
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
          ...baseMessage,
          content,
          type: PayloadBundleType.MESSAGE_HIDE,
        };
      }
      case GenericMessageType.KNOCK: {
        const {expectsReadConfirmation, legalHoldStatus} = genericMessage[GenericMessageType.KNOCK];
        const content: KnockContent = {expectsReadConfirmation, hotKnock: false, legalHoldStatus};

        return {
          ...baseMessage,
          content,
          type: PayloadBundleType.PING,
        };
      }
      case GenericMessageType.LOCATION: {
        const {expectsReadConfirmation, latitude, legalHoldStatus, longitude, name, zoom} =
          genericMessage[GenericMessageType.LOCATION];

        const content: LocationContent = {
          expectsReadConfirmation,
          latitude,
          legalHoldStatus,
          longitude,
          name,
          zoom,
        };

        return {
          ...baseMessage,
          content,
          type: PayloadBundleType.LOCATION,
        };
      }
      case GenericMessageType.ASSET: {
        const {expectsReadConfirmation, legalHoldStatus, notUploaded, original, preview, status, uploaded} =
          genericMessage[GenericMessageType.ASSET];
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
          ...baseMessage,
          content,
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
          ...baseMessage,
          content,
          type: PayloadBundleType.REACTION,
        };
      }
      case GenericMessageType.MULTIPART: {
        const {text, attachments, legalHoldStatus} = genericMessage[GenericMessageType.MULTIPART];

        const content: MultiPartContent = {attachments, legalHoldStatus, text};

        return {
          ...baseMessage,
          content,
          type: PayloadBundleType.MULTIPART,
        };
      }
      default: {
        this.logger.warn(`Unhandled event type "${genericMessage.content}": ${genericMessage}`);
        return {
          ...baseMessage,
          content: genericMessage.content,
          type: PayloadBundleType.UNKNOWN,
        };
      }
    }
  }
}
