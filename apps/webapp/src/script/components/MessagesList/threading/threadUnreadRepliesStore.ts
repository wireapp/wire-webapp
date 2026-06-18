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

import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

type ThreadState = {
  unreadCount: number;
  hasReplyFromSelf: boolean;
  isRootAuthoredBySelf: boolean;
  hasUnreadMentionForSelf: boolean;
};

type ThreadUnreadRepliesState = {
  threadStateByKey: Record<string, ThreadState>;
  incrementUnreadForThread: (conversationId: string, threadId: string, hasMentionForSelf?: boolean) => void;
  markThreadAsRead: (conversationId: string, threadId: string) => void;
  markThreadRepliedBySelf: (conversationId: string, threadId: string) => void;
  markThreadRootAuthoredBySelf: (conversationId: string, threadId: string) => void;
  markThreadUnreadMentionForSelf: (conversationId: string, threadId: string) => void;
};

const getThreadStateKey = (conversationId: string, threadId: string) => `${conversationId}:${threadId}`;

const getDefaultThreadState = (): ThreadState => ({
  unreadCount: 0,
  hasReplyFromSelf: false,
  isRootAuthoredBySelf: false,
  hasUnreadMentionForSelf: false,
});

const useThreadUnreadRepliesStore = create<ThreadUnreadRepliesState>()(
  persist(
    set => ({
      threadStateByKey: {},
      incrementUnreadForThread: (conversationId, threadId, hasMentionForSelf = false) =>
        set(state => {
          const key = getThreadStateKey(conversationId, threadId);
          const current = state.threadStateByKey[key] ?? getDefaultThreadState();

          return {
            threadStateByKey: {
              ...state.threadStateByKey,
              [key]: {
                ...current,
                unreadCount: current.unreadCount + 1,
                hasUnreadMentionForSelf: current.hasUnreadMentionForSelf || hasMentionForSelf,
              },
            },
          };
        }),
      markThreadAsRead: (conversationId, threadId) =>
        set(state => {
          const key = getThreadStateKey(conversationId, threadId);
          const current = state.threadStateByKey[key];

          if (!current || current.unreadCount === 0) {
            return state;
          }

          return {
            threadStateByKey: {
              ...state.threadStateByKey,
              [key]: {...current, unreadCount: 0, hasUnreadMentionForSelf: false},
            },
          };
        }),
      markThreadRepliedBySelf: (conversationId, threadId) =>
        set(state => {
          const key = getThreadStateKey(conversationId, threadId);
          const current = state.threadStateByKey[key] ?? getDefaultThreadState();

          if (current.hasReplyFromSelf) {
            return state;
          }

          return {
            threadStateByKey: {
              ...state.threadStateByKey,
              [key]: {...current, hasReplyFromSelf: true},
            },
          };
        }),
      markThreadRootAuthoredBySelf: (conversationId, threadId) =>
        set(state => {
          const key = getThreadStateKey(conversationId, threadId);
          const current = state.threadStateByKey[key] ?? getDefaultThreadState();

          if (current.isRootAuthoredBySelf) {
            return state;
          }

          return {
            threadStateByKey: {
              ...state.threadStateByKey,
              [key]: {...current, isRootAuthoredBySelf: true},
            },
          };
        }),
      markThreadUnreadMentionForSelf: (conversationId, threadId) =>
        set(state => {
          const key = getThreadStateKey(conversationId, threadId);
          const current = state.threadStateByKey[key] ?? getDefaultThreadState();

          if (current.hasUnreadMentionForSelf) {
            return state;
          }

          return {
            threadStateByKey: {
              ...state.threadStateByKey,
              [key]: {...current, hasUnreadMentionForSelf: true},
            },
          };
        }),
    }),
    {
      name: 'thread-unread-replies-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({threadStateByKey: state.threadStateByKey}),
    },
  ),
);

export const isThreadTrackedForSelf = (conversationId: string, threadId: string, state: ThreadUnreadRepliesState) => {
  const entry = state.threadStateByKey[getThreadStateKey(conversationId, threadId)];
  return !!entry?.isRootAuthoredBySelf || !!entry?.hasReplyFromSelf;
};

export const getThreadUnreadRepliesCount = (
  conversationId: string,
  threadId: string,
  state: ThreadUnreadRepliesState,
) => {
  return state.threadStateByKey[getThreadStateKey(conversationId, threadId)]?.unreadCount ?? 0;
};

export const getThreadHasUnreadMentionForSelf = (
  conversationId: string,
  threadId: string,
  state: ThreadUnreadRepliesState,
) => {
  return state.threadStateByKey[getThreadStateKey(conversationId, threadId)]?.hasUnreadMentionForSelf ?? false;
};

export const getConversationUnreadThreadRepliesCount = (conversationId: string, state: ThreadUnreadRepliesState) => {
  const prefix = `${conversationId}:`;
  return Object.entries(state.threadStateByKey).reduce((total, [key, threadState]) => {
    if (!key.startsWith(prefix)) {
      return total;
    }

    return total + (threadState.unreadCount ?? 0);
  }, 0);
};

export const getConversationHasUnreadThreadMentions = (conversationId: string, state: ThreadUnreadRepliesState) => {
  const prefix = `${conversationId}:`;
  return Object.entries(state.threadStateByKey).some(([key, threadState]) => {
    if (!key.startsWith(prefix)) {
      return false;
    }

    return threadState.unreadCount > 0 && !!threadState.hasUnreadMentionForSelf;
  });
};

export {useThreadUnreadRepliesStore};
