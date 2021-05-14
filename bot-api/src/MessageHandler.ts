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

import type {Conversation} from '@wireapp/api-client/src/conversation';
import {CONVERSATION_TYPING} from '@wireapp/api-client/src/conversation/data';
import type {ConversationEvent, TeamEvent, UserEvent} from '@wireapp/api-client/src/event';
import type {User} from '@wireapp/api-client/src/user/';
import type {Account} from '@wireapp/core';
import type {PayloadBundle, ReactionType, UserClientsMap} from '@wireapp/core/src/main/conversation/';
import type {
  ButtonActionConfirmationContent,
  CallingContent,
  FileContent,
  FileMetaDataContent,
  ImageContent,
  LinkPreviewContent,
  LocationContent,
  MentionContent,
} from '@wireapp/core/src/main/conversation/content/';
import type {QuotableMessage} from '@wireapp/core/src/main/conversation/message/OtrMessage';
import {Asset, Confirmation, Text} from '@wireapp/protocol-messaging';
import {promisify} from 'util';
import fs from 'fs';
import path from 'path';
import FileType = require('file-type');

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

      const buttonActionConfirmationMessage =
        this.account.service.conversation.messageBuilder.createButtonActionConfirmationMessage({
          conversationId,
          content: buttonActionConfirmationContent,
        });

      await this.account.service.conversation.send(buttonActionConfirmationMessage, [userId]);
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendCall(conversationId: string, content: CallingContent, userIds?: string[] | UserClientsMap): Promise<void> {
    if (this.account?.service) {
      const callPayload = this.account.service.conversation.messageBuilder.createCall({conversationId, content});
      await this.account.service.conversation.send(callPayload, userIds);
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendPoll(
    conversationId: string,
    text: string,
    buttons: string[],
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const message = this.account.service.conversation.messageBuilder
        .createComposite({conversationId})
        .addText(Text.create({content: text}));
      buttons.forEach(button => message.addButton(button));
      await this.account.service.conversation.send(message.build(), userIds);
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendConfirmation(
    conversationId: string,
    firstMessageId: string,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const confirmationPayload = this.account.service.conversation.messageBuilder.createConfirmation({
        conversationId,
        firstMessageId,
        type: Confirmation.Type.DELIVERED,
      });
      await this.account.service.conversation.send(confirmationPayload, userIds);
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

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendEditedText(
    conversationId: string,
    originalMessageId: string,
    newMessageText: string,
    newMentions?: MentionContent[],
    newLinkPreview?: LinkPreviewContent,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const editedPayload = this.account.service.conversation.messageBuilder
        .createEditedText({conversationId, newMessageText, originalMessageId})
        .withMentions(newMentions)
        .build();

      const editedMessage = await this.account.service.conversation.send(editedPayload, userIds);

      if (newLinkPreview) {
        const linkPreviewPayload = await this.account.service.conversation.messageBuilder.createLinkPreview(
          newLinkPreview,
        );
        const editedWithPreviewPayload = this.account.service.conversation.messageBuilder
          .createEditedText({conversationId, newMessageText, originalMessageId, messageId: editedMessage.id})
          .withLinkPreviews([linkPreviewPayload])
          .withMentions(newMentions)
          .build();

        await this.account.service.conversation.send(editedWithPreviewPayload, userIds);
      }
    }
  }

  async sendFileByPath(conversationId: string, filePath: string, userIds?: string[] | UserClientsMap): Promise<void> {
    const data = await promisify(fs.readFile)(filePath);
    const fileType = await FileType.fromBuffer(data);
    const metadata: FileMetaDataContent = {
      length: data.length,
      name: path.basename(filePath),
      type: fileType ? fileType.mime : 'text/plain',
    };
    return this.sendFile(
      conversationId,
      {
        data,
      },
      metadata,
      userIds,
    );
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendFile(
    conversationId: string,
    file: FileContent,
    metadata: FileMetaDataContent,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const metadataPayload = this.account.service.conversation.messageBuilder.createFileMetadata({
        conversationId,
        metaData: metadata,
      });
      await this.account.service.conversation.send(metadataPayload, userIds);

      try {
        const filePayload = await this.account.service.conversation.messageBuilder.createFileData({
          conversationId,
          file,
          originalMessageId: metadataPayload.id,
        });
        await this.account.service.conversation.send(filePayload, userIds);
      } catch (error) {
        const abortPayload = await this.account.service.conversation.messageBuilder.createFileAbort({
          conversationId,
          reason: Asset.NotUploaded.FAILED,
          originalMessageId: metadataPayload.id,
        });
        await this.account.service.conversation.send(abortPayload, userIds);
      }
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendImage(conversationId: string, image: ImageContent, userIds?: string[] | UserClientsMap): Promise<void> {
    if (this.account?.service) {
      const imagePayload = await this.account.service.conversation.messageBuilder.createImage({conversationId, image});
      await this.account.service.conversation.send(imagePayload, userIds);
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendLocation(
    conversationId: string,
    location: LocationContent,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const locationPayload = this.account.service.conversation.messageBuilder.createLocation({
        conversationId,
        location,
      });
      await this.account.service.conversation.send(locationPayload, userIds);
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendPing(conversationId: string, userIds?: string[] | UserClientsMap): Promise<void> {
    if (this.account?.service) {
      const pingPayload = this.account.service.conversation.messageBuilder.createPing({conversationId});
      await this.account.service.conversation.send(pingPayload, userIds);
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendReaction(
    conversationId: string,
    originalMessageId: string,
    type: ReactionType,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const reactionPayload = this.account.service.conversation.messageBuilder.createReaction({
        conversationId,
        reaction: {
          originalMessageId,
          type,
        },
      });
      await this.account.service.conversation.send(reactionPayload, userIds);
    }
  }

  async sendQuote(
    conversationId: string,
    quotedMessage: QuotableMessage,
    text: string,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const replyPayload = this.account.service.conversation.messageBuilder
        .createText({conversationId, text})
        .withQuote(quotedMessage)
        .build();
      await this.account.service.conversation.send(replyPayload, userIds);
    }
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  sendReply(
    conversationId: string,
    quotedMessage: QuotableMessage,
    text: string,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    return this.sendQuote(conversationId, quotedMessage, text, userIds);
  }

  /**
   * @param userIds Only send message to specified user IDs or to certain clients of specified user IDs
   */
  async sendText(
    conversationId: string,
    text: string,
    mentions?: MentionContent[],
    linkPreview?: LinkPreviewContent,
    userIds?: string[] | UserClientsMap,
  ): Promise<void> {
    if (this.account?.service) {
      const payload = this.account.service.conversation.messageBuilder
        .createText({conversationId, text})
        .withMentions(mentions)
        .build();
      const sentMessage = await this.account.service.conversation.send(payload, userIds);

      if (linkPreview) {
        const linkPreviewPayload = await this.account.service.conversation.messageBuilder.createLinkPreview(
          linkPreview,
        );
        const editedWithPreviewPayload = this.account.service.conversation.messageBuilder
          .createText({conversationId, text, messageId: sentMessage.id})
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
