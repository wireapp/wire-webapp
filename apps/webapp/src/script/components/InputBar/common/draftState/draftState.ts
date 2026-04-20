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

import {amplify} from 'amplify';

import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {StorageKey, StorageRepository} from 'Repositories/storage';

export const DRAFT_STATE_CHANGED_EVENT = 'conversation.draft-changed';

export interface DraftState {
  editorState: string | null;
  messageReply?: ContentMessage;
  editedMessage?: ContentMessage;
  plainMessage?: string;
}

export const generateConversationInputStorageKey = (conversationEntity: Conversation): string =>
  `${StorageKey.CONVERSATION.INPUT}|${conversationEntity.id}`;

type SaveDraftState = {
  storageRepository: StorageRepository;
  conversation: Conversation;
  editorState: string;
  plainMessage: string;
  replyId?: string;
  editedMessageId?: string;
};

export const saveDraftState = async ({
  storageRepository,
  conversation,
  editorState,
  plainMessage,
  replyId,
  editedMessageId,
}: SaveDraftState): Promise<void> => {
  // we only save state for newly written messages
  const storageKey = generateConversationInputStorageKey(conversation);

  await storageRepository.storageService.saveToSimpleStorage<
    Omit<SaveDraftState, 'storageRepository' | 'conversation'>
  >(storageKey, {
    editorState,
    plainMessage,
    replyId,
    editedMessageId,
  });

  // Emit event to notify listeners of draft change
  amplify.publish(DRAFT_STATE_CHANGED_EVENT, conversation.id);
};

export const loadDraftState = async (
  conversation: Conversation,
  storageRepository: StorageRepository,
  messageRepository: MessageRepository,
): Promise<DraftState> => {
  const storageKey = generateConversationInputStorageKey(conversation);
  const storageValue = await storageRepository.storageService.loadFromSimpleStorage<any>(storageKey);

  if (typeof storageValue === 'undefined') {
    return {editorState: null};
  }

  const replyMessageId = storageValue?.replyId;
  const editedMessageId = storageValue?.editedMessageId;

  let messageReply = null;

  const loadMessage = async (messageId: string) => {
    const message =
      (await messageRepository.getMessageInConversationById(conversation, messageId)) ||
      (await messageRepository.getMessageInConversationByReplacementId(conversation, messageId));
    return messageRepository.ensureMessageSender(message);
  };

  if (replyMessageId) {
    messageReply = await loadMessage(replyMessageId);
  }

  let editedMessage = null;
  if (editedMessageId) {
    editedMessage = await loadMessage(editedMessageId);
  }

  return {...storageValue, messageReply, editedMessage, plainMessage: storageValue?.plainMessage || ''};
};
