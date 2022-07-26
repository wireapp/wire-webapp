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

import {Conversation} from '../entity/Conversation';
import {generateConversationInputStorageKey} from 'Util/util';
import {ContentMessage} from '../entity/message/ContentMessage';
import {MentionEntity} from '../message/MentionEntity';
import {StorageRepository} from '../storage';
import {MessageRepository} from '../conversation/MessageRepository';

interface DraftMessage {
  mentions: MentionEntity[];
  reply: ContentMessage | null;
  replyEntityPromise?: Promise<ContentMessage>;
  text: string;
}

interface Draft {
  mentions: MentionEntity[];
  reply: {messageId?: string};
  text: string;
}

export const saveDraftState = async (
  storageRepository: StorageRepository,
  conversationEntity: Conversation,
  draftMessage: DraftMessage,
): Promise<void> => {
  // we only save state for newly written messages
  const storeReply = draftMessage.reply?.id ? {messageId: draftMessage.reply.id} : {};
  const storageKey = generateConversationInputStorageKey(conversationEntity);

  await storageRepository.storageService.saveToSimpleStorage<Draft>(storageKey, {
    mentions: draftMessage.mentions,
    reply: storeReply,
    text: draftMessage.text,
  });
};

export const loadDraftState = async (
  conversationEntity: Conversation,
  storageRepository: StorageRepository,
  messageRepository: MessageRepository,
): Promise<DraftMessage> => {
  const storageKey = generateConversationInputStorageKey(conversationEntity);
  const storageValue = await storageRepository.storageService.loadFromSimpleStorage<Draft>(storageKey);

  if (typeof storageValue === 'undefined') {
    return {mentions: [], reply: {} as ContentMessage, text: ''};
  }

  if (typeof storageValue === 'string') {
    return {mentions: [], reply: {} as ContentMessage, text: storageValue};
  }

  const draftMessage: DraftMessage = {...(storageValue as DraftMessage)};

  draftMessage.mentions = draftMessage.mentions.map(mention => {
    return new MentionEntity(mention.startIndex, mention.length, mention.userId, mention.domain);
  });

  const replyMessageId = draftMessage.reply
    ? (draftMessage.reply as unknown as {messageId: string}).messageId
    : undefined;

  if (replyMessageId) {
    draftMessage.replyEntityPromise = messageRepository.getMessageInConversationById(
      conversationEntity,
      replyMessageId,
      false,
      true,
    );
  }

  return draftMessage;
};
