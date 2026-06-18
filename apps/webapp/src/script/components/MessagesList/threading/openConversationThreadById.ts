/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {Conversation} from 'Repositories/entity/Conversation';
import type {Message} from 'Repositories/entity/message/Message';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';

import {useThreadIndexStore} from './threadIndexStore';
import {useThreadUnreadRepliesStore} from './threadUnreadRepliesStore';

type OpenConversationThreadByIdParams = {
  conversation: Conversation;
  threadId: string;
  messageRepository: MessageRepository;
  openConversationThread: (message: Message) => void;
};

export const openConversationThreadById = async ({
  conversation,
  threadId,
  messageRepository,
  openConversationThread,
}: OpenConversationThreadByIdParams): Promise<boolean> => {
  let threadRootMessage: Message | undefined = conversation.getMessage(threadId);

  if (!threadRootMessage) {
    try {
      threadRootMessage = await messageRepository.getMessageInConversationById(conversation, threadId);
    } catch {
      useThreadIndexStore.getState().removeThread(conversation.id, threadId);
      return false;
    }
  }

  if (!threadRootMessage) {
    useThreadIndexStore.getState().removeThread(conversation.id, threadId);
    return false;
  }

  try {
    threadRootMessage = await messageRepository.ensureMessageSender(threadRootMessage);
  } catch {
    // Keep opening the thread even if sender hydration fails.
  }

  if (threadRootMessage.user().isMe) {
    useThreadUnreadRepliesStore.getState().markThreadRootAuthoredBySelf(conversation.id, threadId);
    useThreadIndexStore.getState().markThreadRootMessageBySelf(conversation.id, threadId);
  }

  openConversationThread(threadRootMessage);
  return true;
};
