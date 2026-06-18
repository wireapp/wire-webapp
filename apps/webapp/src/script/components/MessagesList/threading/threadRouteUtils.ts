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

import type {ThreadRowViewModel} from './threadIndexStore';
import type {Message} from 'Repositories/entity/message/Message';

export const getActiveThreadId = (message: Message | null): string | null => {
  if (!message) {
    return null;
  }

  return message.threadId ?? message.id;
};

export const isActiveThreadRow = (
  thread: Pick<ThreadRowViewModel, 'conversationId' | 'threadId'>,
  activeThreadRootMessage: Message | null,
): boolean => {
  const activeThreadId = getActiveThreadId(activeThreadRootMessage);
  if (!activeThreadId || !activeThreadRootMessage) {
    return false;
  }

  return (
    activeThreadRootMessage.conversation_id === thread.conversationId && activeThreadId === thread.threadId
  );
};
