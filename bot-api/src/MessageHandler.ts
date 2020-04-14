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

import {Conversation} from '@wireapp/api-client/dist/conversation';
import {CONVERSATION_TYPING} from '@wireapp/api-client/dist/conversation/data';
import {ConversationEvent, TeamEvent, UserEvent} from '@wireapp/api-client/dist/event';
import {User} from '@wireapp/api-client/dist/user/';
import {Account} from '@wireapp/core';
import {PayloadBundle, ReactionType} from '@wireapp/core/dist/conversation/';
import {
  ButtonActionConfirmationContent,
  CallingContent,
  FileContent,
  FileMetaDataContent,
  ImageContent,
  LinkPreviewContent,
  LocationContent,
  MentionContent,
} from '@wireapp/core/dist/conversation/content/';
import {QuotableMessage} from '@wireapp/core/dist/conversation/message/OtrMessage';
import {Asset, Confirmation, Text} from '@wireapp/protocol-messaging';

export abstract class MessageHandler {
  account: Account | undefined = undefined;

  abstract handleEvent(payload: PayloadBundle | ConversationEvent | UserEvent | TeamEvent): void;

  async addUser(conversationId: string, userId: string): Promise<void> {
    if (this.account?.service) {
      await this.account.service.conversation.addUser(conversationId, userId);
    }
  }

  async clearConversation(conversationId: string): Promise<void> {
    if (this.account?.service) {
      await this.account.service.conversation.clearConversation(conversationId);
    }
  }

  getConversation(conversationId: string): Promise<Conversation> {
    return this.account!.service!.conversation.getConversations(conversationId);
  }

  getConversations(conversationIds?: string[]): Promise<Conversation[]> {
    return this.account!.service!.conversation.getConversations(conversationIds);
  }

  async getUser(userId: string): Promise<User> {
    return this.account!.service!.user.getUser(userId);
  }

  async getUsers(userIds: string[]): Promise<User[]> {
    return this.account!.service!.user.getUsers(userIds);
  }

  async removeUser(conversationId: string, userId: string): Promise<void> {
    if (this.account?.service) {
      await this.account.service.conversation.removeUser(conversationId, userId);
    }
  }

  async sendButtonActionConfirmation(
    conversationId: string,
    userId: string,
    referenceMessageId: string,
    buttonId: string,
  ) {
    if (this.account?.service) {
      const buttonActionConfirmationContent: ButtonActionConfirmationContent = {
        buttonId,
        referenceMessageId,
      };

      const buttonActionConfirmationMessage = this.account.service.conversation.messageBuilder.createButtonActionConfirmationMessage(
        conversationId,
        buttonActionConfirmationContent,
      );

      await this.account.service.conversation.send(buttonActionConfirmationMessage, [userId]);
    }
  }

  async sendCall(conversationId: string, content: CallingContent): Promise<void> {
    if (this.account?.service) {
      const callPayload = this.account.service.conversation.messageBuilder.createCall(conversationId, content);
      await this.account.service.conversation.send(callPayload);
    }
  }

  async sendPoll(conversationId: string, text: string, buttons: string[]): Promise<void> {
    if (this.account?.service) {
      const message = this.account.service.conversation.messageBuilder
        .createComposite(conversationId)
        .addText(Text.create({content: text}));
      buttons.forEach(button => message.addButton(button));
      await this.account.service.conversation.send(message.build());
    }
  }

  async sendConfirmation(conversationId: string, firstMessageId: string): Promise<void> {
    if (this.account?.service) {
      const confirmationPayload = this.account.service.conversation.messageBuilder.createConfirmation(
        conversationId,
        firstMessageId,
        Confirmation.Type.DELIVERED,
      );
      await this.account.service.conversation.send(confirmationPayload);
    }
  }

  async sendConnectionRequest(userId: string): Promise<void> {
    if (this.account?.service) {
      await this.account.service.connection.createConnection(userId);
    }
  }

  async sendConnectionResponse(userId: string, accept: boolean): Promise<void> {
    if (this.account?.service) {
      if (accept) {
        await this.account.service.connection.acceptConnection(userId);
      } else {
        await this.account.service.connection.ignoreConnection(userId);
      }
    }
  }

  async sendEditedText(
    conversationId: string,
    originalMessageId: string,
    newMessageText: string,
    newMentions?: MentionContent[],
    newLinkPreview?: LinkPreviewContent,
    userIds?: string[],
  ): Promise<void> {
    if (this.account?.service) {
      const editedPayload = this.account.service.conversation.messageBuilder
        .createEditedText(conversationId, newMessageText, originalMessageId)
        .withMentions(newMentions)
        .build();

      const editedMessage = await this.account.service.conversation.send(editedPayload, userIds);

      if (newLinkPreview) {
        const linkPreviewPayload = await this.account.service.conversation.messageBuilder.createLinkPreview(
          newLinkPreview,
        );
        const editedWithPreviewPayload = this.account.service.conversation.messageBuilder
          .createEditedText(conversationId, newMessageText, originalMessageId, editedMessage.id)
          .withLinkPreviews([linkPreviewPayload])
          .withMentions(newMentions)
          .build();

        await this.account.service.conversation.send(editedWithPreviewPayload, userIds);
      }
    }
  }

  async sendFile(conversationId: string, file: FileContent, metadata: FileMetaDataContent): Promise<void> {
    if (this.account?.service) {
      const metadataPayload = this.account.service.conversation.messageBuilder.createFileMetadata(
        conversationId,
        metadata,
      );
      await this.account.service.conversation.send(metadataPayload);

      try {
        const filePayload = await this.account.service.conversation.messageBuilder.createFileData(
          conversationId,
          file,
          metadataPayload.id,
        );
        await this.account.service.conversation.send(filePayload);
      } catch (error) {
        const abortPayload = await this.account.service.conversation.messageBuilder.createFileAbort(
          conversationId,
          Asset.NotUploaded.FAILED,
          metadataPayload.id,
        );
        await this.account.service.conversation.send(abortPayload);
      }
    }
  }

  async sendImage(conversationId: string, image: ImageContent): Promise<void> {
    if (this.account?.service) {
      const imagePayload = await this.account.service.conversation.messageBuilder.createImage(conversationId, image);
      await this.account.service.conversation.send(imagePayload);
    }
  }

  async sendLocation(conversationId: string, location: LocationContent): Promise<void> {
    if (this.account?.service) {
      const locationPayload = this.account.service.conversation.messageBuilder.createLocation(conversationId, location);
      await this.account.service.conversation.send(locationPayload);
    }
  }

  async sendPing(conversationId: string): Promise<void> {
    if (this.account?.service) {
      const pingPayload = this.account.service.conversation.messageBuilder.createPing(conversationId);
      await this.account.service.conversation.send(pingPayload);
    }
  }

  async sendReaction(conversationId: string, originalMessageId: string, type: ReactionType): Promise<void> {
    if (this.account?.service) {
      const reactionPayload = this.account.service.conversation.messageBuilder.createReaction(conversationId, {
        originalMessageId,
        type,
      });
      await this.account.service.conversation.send(reactionPayload);
    }
  }

  async sendQuote(conversationId: string, quotedMessage: QuotableMessage, text: string): Promise<void> {
    if (this.account?.service) {
      const replyPayload = this.account.service.conversation.messageBuilder
        .createText(conversationId, text)
        .withQuote(quotedMessage)
        .build();
      await this.account.service.conversation.send(replyPayload);
    }
  }

  sendReply(conversationId: string, quotedMessage: QuotableMessage, text: string): Promise<void> {
    return this.sendQuote(conversationId, quotedMessage, text);
  }

  async sendText(
    conversationId: string,
    text: string,
    mentions?: MentionContent[],
    linkPreview?: LinkPreviewContent,
    userIds?: string[],
  ): Promise<void> {
    if (this.account?.service) {
      const payload = this.account.service.conversation.messageBuilder
        .createText(conversationId, text)
        .withMentions(mentions)
        .build();
      const sentMessage = await this.account.service.conversation.send(payload, userIds);

      if (linkPreview) {
        const linkPreviewPayload = await this.account.service.conversation.messageBuilder.createLinkPreview(
          linkPreview,
        );
        const editedWithPreviewPayload = this.account.service.conversation.messageBuilder
          .createText(conversationId, text, sentMessage.id)
          .withLinkPreviews([linkPreviewPayload])
          .withMentions(mentions)
          .build();

        await this.account.service.conversation.send(editedWithPreviewPayload, userIds);
      }
    }
  }

  async sendTyping(conversationId: string, status: CONVERSATION_TYPING): Promise<void> {
    if (this.account?.service) {
      if (status === CONVERSATION_TYPING.STARTED) {
        await this.account.service.conversation.sendTypingStart(conversationId);
      } else {
        await this.account.service.conversation.sendTypingStop(conversationId);
      }
    }
  }
}
