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

/**
 * Wraps a callback that advances the read state (read marker, read receipts) so it becomes a no-op
 * while auto-read is suppressed for the conversation (e.g. after "Mark as unread from here").
 * The check happens when the wrapped callback runs, not when it is created.
 */
export const withAutoReadGuard = <Args extends unknown[]>(
  conversation: Pick<Conversation, 'isAutoReadSuppressed'>,
  callback: (...args: Args) => void,
): ((...args: Args) => void) => {
  return (...args: Args) => {
    if (conversation.isAutoReadSuppressed()) {
      return;
    }
    callback(...args);
  };
};
