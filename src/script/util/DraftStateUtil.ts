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

import {generateConversationInputStorageKey} from 'Util/util';

import {MessageRepository} from '../conversation/MessageRepository';
import {Conversation} from '../entity/Conversation';
import {ContentMessage} from '../entity/message/ContentMessage';
import {StorageRepository} from '../storage';

export interface DraftState {
  editorState: string | null;
  messageReply?: Promise<ContentMessage>;
}

export const saveDraftState = async (
  storageRepository: StorageRepository,
  conversationEntity: Conversation,
  editorState: string,
  replyMessageId?: string,
): Promise<void> => {
  // we only save state for newly written messages
  const storeReply = replyMessageId;
  const storageKey = generateConversationInputStorageKey(conversationEntity);

  await storageRepository.storageService.saveToSimpleStorage<any>(storageKey, {
    editorState,
    replyId: storeReply,
  });
};

export const loadDraftState = async (
  conversationEntity: Conversation,
  storageRepository: StorageRepository,
  messageRepository: MessageRepository,
): Promise<DraftState> => {
  const storageKey = generateConversationInputStorageKey(conversationEntity);
  const storageValue = await storageRepository.storageService.loadFromSimpleStorage<any>(storageKey);

  if (typeof storageValue === 'undefined') {
    return {editorState: null};
  }

  const replyMessageId = storageValue?.replyId;

  let messageReply = null;

  if (replyMessageId) {
    const message =
      (await messageRepository.getMessageInConversationById(conversationEntity, replyMessageId)) ||
      (await messageRepository.getMessageInConversationByReplacementId(conversationEntity, replyMessageId));

    messageReply = messageRepository.ensureMessageSender(message) as Promise<ContentMessage>;
  }

  return {...storageValue, messageReply};
};
