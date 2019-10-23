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

import {CONVERSATION_TYPING} from '@wireapp/api-client/dist/commonjs/conversation/data';
import {User} from '@wireapp/api-client/dist/commonjs/user/';
import {Account} from '@wireapp/core';
import {PayloadBundle, ReactionType} from '@wireapp/core/dist/conversation/';
import {
  CallingContent,
  FileContent,
  FileMetaDataContent,
  ImageContent,
  LinkPreviewContent,
  LocationContent,
  MentionContent,
} from '@wireapp/core/dist/conversation/content/';
import {Asset, Confirmation} from '@wireapp/protocol-messaging';

export abstract class MessageHandler {
  public account: Account | undefined = undefined;

  abstract handleEvent(payload: PayloadBundle): void;

  public async addUser(conversationId: string, userId: string): Promise<void> {
    if (this.account && this.account.service) {
      await this.account.service.conversation.addUser(conversationId, userId);
    }
  }

  public async getUser(userId: string): Promise<User> {
    return this.account!.service!.user.getUsers(userId);
  }

  async clearConversation(conversationId: string): Promise<void> {
    if (this.account && this.account.service) {
      await this.account.service.conversation.clearConversation(conversationId);
    }
  }

  public async removeUser(conversationId: string, userId: string): Promise<void> {
    if (this.account && this.account.service) {
      await this.account.service.conversation.removeUser(conversationId, userId);
    }
  }

  public async sendConfirmation(conversationId: string, firstMessageId: string): Promise<void> {
    if (this.account && this.account.service) {
      const confirmationPayload = this.account.service.conversation.messageBuilder.createConfirmation(
        conversationId,
        firstMessageId,
        Confirmation.Type.DELIVERED,
      );
      await this.account.service.conversation.send(confirmationPayload);
    }
  }

  public async sendConnectionRequest(userId: string): Promise<void> {
    if (this.account && this.account.service) {
      await this.account.service.connection.createConnection(userId);
    }
  }

  public async sendConnectionResponse(userId: string, accept: boolean): Promise<void> {
    if (this.account && this.account.service) {
      if (accept) {
        await this.account.service.connection.acceptConnection(userId);
      } else {
        await this.account.service.connection.ignoreConnection(userId);
      }
    }
  }

  public async sendEditedText(
    conversationId: string,
    originalMessageId: string,
    newMessageText: string,
    newMentions?: MentionContent[],
    newLinkPreview?: LinkPreviewContent,
    userIds?: string[],
  ): Promise<void> {
    if (this.account && this.account.service) {
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

  public async sendFile(conversationId: string, file: FileContent, metadata: FileMetaDataContent): Promise<void> {
    if (this.account && this.account.service) {
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

  public async sendImage(conversationId: string, image: ImageContent): Promise<void> {
    if (this.account && this.account.service) {
      const imagePayload = await this.account.service.conversation.messageBuilder.createImage(conversationId, image);
      await this.account.service.conversation.send(imagePayload);
    }
  }

  public async sendLocation(conversationId: string, location: LocationContent): Promise<void> {
    if (this.account && this.account.service) {
      const locationPayload = this.account.service.conversation.messageBuilder.createLocation(conversationId, location);
      await this.account.service.conversation.send(locationPayload);
    }
  }

  public async sendPing(conversationId: string): Promise<void> {
    if (this.account && this.account.service) {
      const pingPayload = this.account.service.conversation.messageBuilder.createPing(conversationId);
      await this.account.service.conversation.send(pingPayload);
    }
  }

  public async sendReaction(conversationId: string, originalMessageId: string, type: ReactionType): Promise<void> {
    if (this.account && this.account.service) {
      const reactionPayload = this.account.service.conversation.messageBuilder.createReaction(conversationId, {
        originalMessageId,
        type,
      });
      await this.account.service.conversation.send(reactionPayload);
    }
  }

  public async sendCall(conversationId: string, content: CallingContent): Promise<void> {
    if (this.account && this.account.service) {
      const callPayload = this.account.service.conversation.messageBuilder.createCall(conversationId, content);
      await this.account.service.conversation.send(callPayload);
    }
  }

  public async sendText(
    conversationId: string,
    text: string,
    mentions?: MentionContent[],
    linkPreview?: LinkPreviewContent,
    userIds?: string[],
  ): Promise<void> {
    if (this.account && this.account.service) {
      const payload = await this.account.service.conversation.messageBuilder
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

  public async sendTyping(conversationId: string, status: CONVERSATION_TYPING): Promise<void> {
    if (this.account && this.account.service) {
      if (status === CONVERSATION_TYPING.STARTED) {
        await this.account.service.conversation.sendTypingStart(conversationId);
      } else {
        await this.account.service.conversation.sendTypingStop(conversationId);
      }
    }
  }
}
