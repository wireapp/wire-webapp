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

export type ThreadIndexEntry = {
  conversationId: string;
  threadId: string;
  rootMessagePreview?: string;
  rootMessageAuthorId?: string;
  rootMessageTimestamp?: string;
  participantUserIds?: string[];
  lastReplyAt: string;
  lastReplyMessageId?: string;
  lastReplyAuthorId?: string;
  lastReplyPreview?: string;
  replyCount: number;
  unreadCount: number;
  hasUnreadMentionForSelf: boolean;
  hasReplyBySelf: boolean;
  isRootMessageBySelf: boolean;
  // POC dedupe strategy; we may replace this with a bounded/indexed approach later.
  seenMessageIds: string[];
};

type ThreadIndexStore = {
  threadsByKey: Record<string, ThreadIndexEntry>;
  upsertThread: (entry: Partial<ThreadIndexEntry> & Pick<ThreadIndexEntry, 'conversationId' | 'threadId'>) => void;
  recordThreadReplyEvent: (event: {
    conversationId: string;
    threadId: string;
    eventTime?: string;
    messageId?: string;
    authorId?: string;
    preview?: string;
    isSelfReply: boolean;
    hasSelfMention: boolean;
  }) => void;
  markThreadRootMessageBySelf: (conversationId: string, threadId: string) => void;
  markThreadRead: (conversationId: string, threadId: string) => void;
  reconcileHydratedThread: (entry: {
    conversationId: string;
    threadId: string;
    rootMessagePreview?: string;
    rootMessageAuthorId?: string;
    rootMessageTimestamp?: string;
    participantUserIds?: string[];
    lastReplyAt: string;
    lastReplyMessageId?: string;
    lastReplyAuthorId?: string;
    lastReplyPreview?: string;
    replyCount: number;
    hasReplyBySelf: boolean;
    isRootMessageBySelf: boolean;
  }) => void;
  pruneToMostRecent: (maxEntries: number) => void;
  pruneToConversationIds: (conversationIds: string[]) => void;
  removeThread: (conversationId: string, threadId: string) => void;
  clearThreads: () => void;
};

export const getThreadIndexKey = (conversationId: string, threadId: string) => `${conversationId}:${threadId}`;

const getDefaultThreadEntry = (conversationId: string, threadId: string): ThreadIndexEntry => ({
  conversationId,
  threadId,
  lastReplyAt: new Date(0).toISOString(),
  replyCount: 0,
  unreadCount: 0,
  hasUnreadMentionForSelf: false,
  hasReplyBySelf: false,
  isRootMessageBySelf: false,
  seenMessageIds: [],
});

const normalizePreview = (preview?: string) => {
  if (typeof preview !== 'string') {
    return undefined;
  }

  const normalized = preview.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const MAX_PARTICIPANT_USER_IDS = 3;

const mergeParticipantUserIds = (current: string[] | undefined, authorId?: string): string[] => {
  if (!authorId) {
    return current ?? [];
  }

  const merged = [...new Set([...(current ?? []), authorId])];
  return merged.slice(0, MAX_PARTICIPANT_USER_IDS);
};

const useThreadIndexStore = create<ThreadIndexStore>()(
  persist(
    set => ({
      threadsByKey: {},
      upsertThread: ({conversationId, threadId, ...entry}) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                ...entry,
                rootMessagePreview:
                  entry.rootMessagePreview === undefined
                    ? current.rootMessagePreview
                    : normalizePreview(entry.rootMessagePreview),
                lastReplyPreview:
                  entry.lastReplyPreview === undefined ? current.lastReplyPreview : normalizePreview(entry.lastReplyPreview),
                conversationId,
                threadId,
              },
            },
          };
        }),
      recordThreadReplyEvent: ({
        conversationId,
        threadId,
        eventTime,
        messageId,
        authorId,
        preview,
        isSelfReply,
        hasSelfMention,
      }) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);
          if (messageId && current.seenMessageIds.includes(messageId)) {
            return state;
          }

          const effectiveTime = eventTime ?? new Date().toISOString();
          const currentTime = new Date(current.lastReplyAt).getTime();
          const nextTime = new Date(effectiveTime).getTime();
          const shouldUpdateLatestMetadata = nextTime >= currentTime;
          const normalizedPreview = normalizePreview(preview);

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                lastReplyAt: shouldUpdateLatestMetadata ? effectiveTime : current.lastReplyAt,
                lastReplyMessageId:
                  shouldUpdateLatestMetadata && messageId ? messageId : current.lastReplyMessageId,
                lastReplyAuthorId:
                  shouldUpdateLatestMetadata && authorId ? authorId : current.lastReplyAuthorId,
                lastReplyPreview:
                  shouldUpdateLatestMetadata && normalizedPreview ? normalizedPreview : current.lastReplyPreview,
                replyCount: current.replyCount + 1,
                unreadCount: isSelfReply ? current.unreadCount : current.unreadCount + 1,
                hasUnreadMentionForSelf: current.hasUnreadMentionForSelf || hasSelfMention,
                hasReplyBySelf: current.hasReplyBySelf || isSelfReply,
                participantUserIds: mergeParticipantUserIds(current.participantUserIds, authorId),
                seenMessageIds: messageId ? [...current.seenMessageIds, messageId] : current.seenMessageIds,
              },
            },
          };
        }),
      markThreadRootMessageBySelf: (conversationId, threadId) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                isRootMessageBySelf: true,
              },
            },
          };
        }),
      markThreadRead: (conversationId, threadId) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key];

          if (!current) {
            return state;
          }

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                unreadCount: 0,
                hasUnreadMentionForSelf: false,
              },
            },
          };
        }),
      reconcileHydratedThread: ({
        conversationId,
        threadId,
        rootMessagePreview,
        rootMessageAuthorId,
        rootMessageTimestamp,
        participantUserIds,
        lastReplyAt,
        lastReplyMessageId,
        lastReplyAuthorId,
        lastReplyPreview,
        replyCount,
        hasReplyBySelf,
        isRootMessageBySelf,
      }) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const current = state.threadsByKey[key] ?? getDefaultThreadEntry(conversationId, threadId);
          const currentTime = new Date(current.lastReplyAt).getTime();
          const hydratedTime = new Date(lastReplyAt).getTime();
          const shouldUpdateLatestMetadata = hydratedTime >= currentTime;
          const normalizedPreview = normalizePreview(lastReplyPreview);

          return {
            threadsByKey: {
              ...state.threadsByKey,
              [key]: {
                ...current,
                rootMessagePreview:
                  rootMessagePreview === undefined ? current.rootMessagePreview : normalizePreview(rootMessagePreview),
                rootMessageAuthorId: rootMessageAuthorId ?? current.rootMessageAuthorId,
                rootMessageTimestamp: rootMessageTimestamp ?? current.rootMessageTimestamp,
                participantUserIds:
                  participantUserIds === undefined
                    ? current.participantUserIds
                    : participantUserIds.slice(0, MAX_PARTICIPANT_USER_IDS),
                lastReplyAt: shouldUpdateLatestMetadata ? lastReplyAt : current.lastReplyAt,
                lastReplyMessageId:
                  shouldUpdateLatestMetadata && lastReplyMessageId ? lastReplyMessageId : current.lastReplyMessageId,
                lastReplyAuthorId:
                  shouldUpdateLatestMetadata && lastReplyAuthorId ? lastReplyAuthorId : current.lastReplyAuthorId,
                lastReplyPreview:
                  shouldUpdateLatestMetadata && normalizedPreview ? normalizedPreview : current.lastReplyPreview,
                replyCount: Math.max(current.replyCount, replyCount),
                hasReplyBySelf: current.hasReplyBySelf || hasReplyBySelf,
                isRootMessageBySelf: current.isRootMessageBySelf || isRootMessageBySelf,
              },
            },
          };
        }),
      pruneToMostRecent: maxEntries =>
        set(state => {
          if (maxEntries < 1) {
            return {threadsByKey: {}};
          }

          const sorted = getAllThreadsSorted(state);
          if (sorted.length <= maxEntries) {
            return state;
          }

          const pruned = sorted.slice(0, maxEntries).reduce<Record<string, ThreadIndexEntry>>((accumulator, thread) => {
            accumulator[getThreadIndexKey(thread.conversationId, thread.threadId)] = thread;
            return accumulator;
          }, {});

          return {threadsByKey: pruned};
        }),
      pruneToConversationIds: conversationIds =>
        set(state => {
          if (!conversationIds.length) {
            return {threadsByKey: {}};
          }

          const validConversationIds = new Set(conversationIds);
          const pruned = Object.values(state.threadsByKey).reduce<Record<string, ThreadIndexEntry>>(
            (accumulator, thread) => {
              if (!validConversationIds.has(thread.conversationId)) {
                return accumulator;
              }

              accumulator[getThreadIndexKey(thread.conversationId, thread.threadId)] = thread;
              return accumulator;
            },
            {},
          );

          if (Object.keys(pruned).length === Object.keys(state.threadsByKey).length) {
            return state;
          }

          return {threadsByKey: pruned};
        }),
      removeThread: (conversationId, threadId) =>
        set(state => {
          const key = getThreadIndexKey(conversationId, threadId);
          const {[key]: removed, ...rest} = state.threadsByKey;

          if (!removed) {
            return state;
          }

          return {threadsByKey: rest};
        }),
      clearThreads: () => set({threadsByKey: {}}),
    }),
    {
      name: 'thread-index-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({threadsByKey: state.threadsByKey}),
    },
  ),
);

export const getAllThreadsSorted = (state: ThreadIndexStore): ThreadIndexEntry[] => {
  return Object.values(state.threadsByKey).sort((a, b) => {
    const timeDelta = new Date(b.lastReplyAt).getTime() - new Date(a.lastReplyAt).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return getThreadIndexKey(a.conversationId, a.threadId).localeCompare(getThreadIndexKey(b.conversationId, b.threadId));
  });
};

const DAYS_30_IN_MS = 30 * 24 * 60 * 60 * 1000;

export const isThreadInactive = (thread: ThreadIndexEntry, now = Date.now()) =>
  now - new Date(thread.lastReplyAt).getTime() > DAYS_30_IN_MS;

export type ThreadListFilters = {
  allThreads: boolean;
  myThreads: boolean;
  contributed: boolean;
  inactive: boolean;
};

export type ThreadRowViewModel = {
  conversationId: string;
  threadId: string;
  title: string;
  conversationLabel: string;
  authorLabel: string;
  authorAccentColor?: string;
  preview: string;
  lastActivityAt: string;
  badges: {
    unreadCount: number;
    hasUnreadMentionForSelf: boolean;
    isMyThread: boolean;
    isContributed: boolean;
    isInactive: boolean;
  };
  thread: ThreadIndexEntry;
};

export type ConversationThreadRowViewModel = {
  thread: ThreadIndexEntry;
  rootAuthorLabel: string;
  rootAuthorAccentColor?: string;
  rootMessageTimestamp: string;
  preview: string;
  replyCount: number;
  unreadCount: number;
  lastReplyAt: string;
  participantUserIds: string[];
  isActive: boolean;
};

export type ThreadAuthorLabelData = {
  displayName?: string;
  handle?: string;
  accentColor?: string;
};

const FALLBACK_TITLE_PREFIX = 'Thread in';
const FALLBACK_AUTHOR_LABEL = 'Unknown author';
const FALLBACK_PREVIEW = 'No preview available.';
const FALLBACK_TITLE_SUFFIX = 'this conversation';

const getThreadPreview = (preview?: string) => {
  const normalizedPreview = preview?.trim();
  return normalizedPreview ? normalizedPreview : FALLBACK_PREVIEW;
};

const getThreadTitle = (thread: ThreadIndexEntry, conversationLabel: string) => {
  const rootPreview = normalizePreview(thread.rootMessagePreview);
  if (rootPreview) {
    return rootPreview;
  }

  const safeConversationLabel = getNormalizedLabel(conversationLabel) ?? FALLBACK_TITLE_SUFFIX;
  return `${FALLBACK_TITLE_PREFIX} ${safeConversationLabel}`;
};

const getNormalizedLabel = (value?: string) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const getThreadAuthorLabel = (
  thread: ThreadIndexEntry,
  authorLabelsById: Record<string, ThreadAuthorLabelData | string>,
) => {
  if (!thread.lastReplyAuthorId) {
    return FALLBACK_AUTHOR_LABEL;
  }

  const authorLabelData = authorLabelsById[thread.lastReplyAuthorId];
  if (!authorLabelData) {
    return thread.lastReplyAuthorId;
  }

  if (typeof authorLabelData === 'string') {
    return getNormalizedLabel(authorLabelData) ?? thread.lastReplyAuthorId;
  }

  return (
    getNormalizedLabel(authorLabelData.displayName) ??
    getNormalizedLabel(authorLabelData.handle) ??
    thread.lastReplyAuthorId
  );
};

const getThreadAuthorAccentColor = (
  thread: ThreadIndexEntry,
  authorLabelsById: Record<string, ThreadAuthorLabelData | string>,
) => {
  if (!thread.lastReplyAuthorId) {
    return undefined;
  }

  const authorLabelData = authorLabelsById[thread.lastReplyAuthorId];
  if (!authorLabelData || typeof authorLabelData === 'string') {
    return undefined;
  }

  return getNormalizedLabel(authorLabelData.accentColor);
};

const getRootAuthorLabel = (
  thread: ThreadIndexEntry,
  authorLabelsById: Record<string, ThreadAuthorLabelData | string>,
) => {
  if (!thread.rootMessageAuthorId) {
    return FALLBACK_AUTHOR_LABEL;
  }

  const authorLabelData = authorLabelsById[thread.rootMessageAuthorId];
  if (!authorLabelData) {
    return thread.rootMessageAuthorId;
  }

  if (typeof authorLabelData === 'string') {
    return getNormalizedLabel(authorLabelData) ?? thread.rootMessageAuthorId;
  }

  return (
    getNormalizedLabel(authorLabelData.displayName) ??
    getNormalizedLabel(authorLabelData.handle) ??
    thread.rootMessageAuthorId
  );
};

const getRootAuthorAccentColor = (
  thread: ThreadIndexEntry,
  authorLabelsById: Record<string, ThreadAuthorLabelData | string>,
) => {
  if (!thread.rootMessageAuthorId) {
    return undefined;
  }

  const authorLabelData = authorLabelsById[thread.rootMessageAuthorId];
  if (!authorLabelData || typeof authorLabelData === 'string') {
    return undefined;
  }

  return getNormalizedLabel(authorLabelData.accentColor);
};

export const getThreadsForConversation = (state: ThreadIndexStore, conversationId: string): ThreadIndexEntry[] => {
  return Object.values(state.threadsByKey)
    .filter(thread => thread.conversationId === conversationId)
    .sort((firstThread, secondThread) => {
      const timeDelta =
        new Date(secondThread.lastReplyAt).getTime() - new Date(firstThread.lastReplyAt).getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }

      return getThreadIndexKey(firstThread.conversationId, firstThread.threadId).localeCompare(
        getThreadIndexKey(secondThread.conversationId, secondThread.threadId),
      );
    });
};

export const buildConversationThreadRowViewModel = (
  thread: ThreadIndexEntry,
  authorLabelsById: Record<string, ThreadAuthorLabelData | string>,
  activeThreadId?: string | null,
): ConversationThreadRowViewModel => ({
  thread,
  rootAuthorLabel: getRootAuthorLabel(thread, authorLabelsById),
  rootAuthorAccentColor: getRootAuthorAccentColor(thread, authorLabelsById),
  rootMessageTimestamp: thread.rootMessageTimestamp ?? thread.lastReplyAt,
  preview: getThreadPreview(thread.rootMessagePreview),
  replyCount: thread.replyCount,
  unreadCount: thread.unreadCount,
  lastReplyAt: thread.lastReplyAt,
  participantUserIds: thread.participantUserIds ?? [],
  isActive: activeThreadId != null && activeThreadId === thread.threadId,
});

export const getFilteredThreadsSorted = (
  state: ThreadIndexStore,
  filters: ThreadListFilters,
  now = Date.now(),
): ThreadIndexEntry[] => {
  return getAllThreadsSorted(state).filter(thread => {
    if (!filters.inactive && isThreadInactive(thread, now)) {
      return false;
    }

    if (filters.allThreads) {
      return true;
    }

    return (filters.myThreads && thread.isRootMessageBySelf) || (filters.contributed && thread.hasReplyBySelf);
  });
};

export const getFilteredThreadRows = (
  state: ThreadIndexStore,
  filters: ThreadListFilters,
  {
    conversationLabelsById = {},
    authorLabelsById = {},
    now = Date.now(),
  }: {
    conversationLabelsById?: Record<string, string>;
    authorLabelsById?: Record<string, ThreadAuthorLabelData | string>;
    now?: number;
  } = {},
): ThreadRowViewModel[] => {
  return getFilteredThreadsSorted(state, filters, now).map(thread => {
    const conversationLabel = conversationLabelsById[thread.conversationId] ?? thread.conversationId;

    return {
      conversationId: thread.conversationId,
      threadId: thread.threadId,
      title: getThreadTitle(thread, conversationLabel),
      conversationLabel,
      authorLabel: getThreadAuthorLabel(thread, authorLabelsById),
      authorAccentColor: getThreadAuthorAccentColor(thread, authorLabelsById),
      preview: getThreadPreview(thread.lastReplyPreview),
      lastActivityAt: thread.lastReplyAt,
      badges: {
        unreadCount: thread.unreadCount,
        hasUnreadMentionForSelf: thread.hasUnreadMentionForSelf,
        isMyThread: thread.isRootMessageBySelf,
        isContributed: thread.hasReplyBySelf,
        isInactive: isThreadInactive(thread, now),
      },
      thread,
    };
  });
};

export {useThreadIndexStore};
