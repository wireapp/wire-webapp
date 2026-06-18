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

import {
  buildConversationThreadRowViewModel,
  getAllThreadsSorted,
  getFilteredThreadRows,
  getFilteredThreadsSorted,
  getThreadsForConversation,
  isThreadInactive,
  useThreadIndexStore,
} from './threadIndexStore';

describe('threadIndexStore', () => {
  beforeEach(() => {
    useThreadIndexStore.getState().clearThreads();
    localStorage.removeItem('thread-index-store');
  });

  it('sorts thread entries by last reply timestamp (desc)', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-01T00:00:00.000Z',
      replyCount: 1,
      unreadCount: 0,
    });

    store.upsertThread({
      conversationId: 'conversation-b',
      threadId: 'thread-b',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      replyCount: 1,
      unreadCount: 1,
    });

    const sorted = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(sorted.map(entry => entry.threadId)).toEqual(['thread-b', 'thread-a']);
  });

  it('merges updates for existing thread entry', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-01T00:00:00.000Z',
      replyCount: 1,
      unreadCount: 0,
      hasUnreadMentionForSelf: false,
    });

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      unreadCount: 2,
      hasUnreadMentionForSelf: true,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(thread.replyCount).toBe(1);
    expect(thread.unreadCount).toBe(2);
    expect(thread.hasUnreadMentionForSelf).toBe(true);
  });

  it('records thread reply events and updates unread counters for non-self replies', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      messageId: 'message-a',
      authorId: 'other-user',
      isSelfReply: false,
      hasSelfMention: true,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(thread.lastReplyAt).toBe('2026-01-02T00:00:00.000Z');
    expect(thread.lastReplyMessageId).toBe('message-a');
    expect(thread.lastReplyAuthorId).toBe('other-user');
    expect(thread.replyCount).toBe(1);
    expect(thread.unreadCount).toBe(1);
    expect(thread.hasUnreadMentionForSelf).toBe(true);
  });

  it('records self replies without increasing unread counter', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      authorId: 'self-user',
      isSelfReply: true,
      hasSelfMention: false,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());

    expect(thread.replyCount).toBe(1);
    expect(thread.unreadCount).toBe(0);
    expect(thread.hasReplyBySelf).toBe(true);
  });

  it('ignores duplicate reply events for the same message id', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      messageId: 'message-a',
      authorId: 'other-user',
      isSelfReply: false,
      hasSelfMention: false,
    });

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:01.000Z',
      messageId: 'message-a',
      authorId: 'other-user',
      isSelfReply: false,
      hasSelfMention: false,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.replyCount).toBe(1);
    expect(thread.unreadCount).toBe(1);
  });

  it('keeps latest reply metadata stable for out-of-order events', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-03T00:00:00.000Z',
      messageId: 'message-new',
      authorId: 'new-user',
      preview: 'new',
      isSelfReply: false,
      hasSelfMention: false,
    });

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      messageId: 'message-old',
      authorId: 'old-user',
      preview: 'old',
      isSelfReply: false,
      hasSelfMention: false,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.lastReplyAt).toBe('2026-01-03T00:00:00.000Z');
    expect(thread.lastReplyMessageId).toBe('message-new');
    expect(thread.lastReplyAuthorId).toBe('new-user');
    expect(thread.lastReplyPreview).toBe('new');
  });

  it('normalizes preview text from thread reply events and ignores blank updates', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-03T00:00:00.000Z',
      messageId: 'message-new',
      authorId: 'new-user',
      preview: '  normalized preview  ',
      isSelfReply: false,
      hasSelfMention: false,
    });

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-04T00:00:00.000Z',
      messageId: 'message-empty',
      authorId: 'new-user',
      preview: '   ',
      isSelfReply: false,
      hasSelfMention: false,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.lastReplyPreview).toBe('normalized preview');
  });

  it('marks thread as read in thread index', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      unreadCount: 4,
      hasUnreadMentionForSelf: true,
    });

    store.markThreadRead('conversation-a', 'thread-a');

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.unreadCount).toBe(0);
    expect(thread.hasUnreadMentionForSelf).toBe(false);
  });

  it('marks thread root ownership for self', () => {
    const store = useThreadIndexStore.getState();

    store.markThreadRootMessageBySelf('conversation-a', 'thread-a');

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.isRootMessageBySelf).toBe(true);
  });

  it('detects inactive threads with a 30 day window', () => {
    const now = new Date('2026-02-24T00:00:00.000Z').getTime();

    expect(
      isThreadInactive(
        {
          conversationId: 'conversation-a',
          threadId: 'thread-a',
          lastReplyAt: '2026-01-20T00:00:00.000Z',
          replyCount: 1,
          unreadCount: 0,
          hasUnreadMentionForSelf: false,
          hasReplyBySelf: false,
          isRootMessageBySelf: false,
          seenMessageIds: [],
        },
        now,
      ),
    ).toBe(true);
  });

  it('filters to active threads by default when inactive filter is off', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-active',
      lastReplyAt: '2026-02-20T00:00:00.000Z',
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-inactive',
      lastReplyAt: '2026-01-10T00:00:00.000Z',
    });

    const threads = getFilteredThreadsSorted(
      useThreadIndexStore.getState(),
      {
        allThreads: true,
        myThreads: false,
        contributed: false,
        inactive: false,
      },
      new Date('2026-02-24T00:00:00.000Z').getTime(),
    );

    expect(threads.map(thread => thread.threadId)).toEqual(['thread-active']);
  });

  it('applies ownership filters when all threads filter is disabled', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-mine',
      lastReplyAt: '2026-02-20T00:00:00.000Z',
      isRootMessageBySelf: true,
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-contributed',
      lastReplyAt: '2026-02-20T00:00:00.000Z',
      hasReplyBySelf: true,
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-other',
      lastReplyAt: '2026-02-20T00:00:00.000Z',
    });

    const threads = getFilteredThreadsSorted(
      useThreadIndexStore.getState(),
      {
        allThreads: false,
        myThreads: true,
        contributed: true,
        inactive: true,
      },
      new Date('2026-02-24T00:00:00.000Z').getTime(),
    );

    expect(threads.map(thread => thread.threadId)).toEqual(['thread-contributed', 'thread-mine']);
  });

  it('reconciles hydrated threads without lowering existing reply count', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-24T00:00:00.000Z',
      replyCount: 10,
      unreadCount: 3,
      hasUnreadMentionForSelf: true,
    });

    store.reconcileHydratedThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-20T00:00:00.000Z',
      replyCount: 4,
      hasReplyBySelf: true,
      isRootMessageBySelf: false,
      lastReplyMessageId: 'message-old',
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.replyCount).toBe(10);
    expect(thread.unreadCount).toBe(3);
    expect(thread.hasUnreadMentionForSelf).toBe(true);
    expect(thread.hasReplyBySelf).toBe(true);
    expect(thread.lastReplyMessageId).not.toBe('message-old');
  });

  it('reconciles hydrated threads and updates metadata when hydration has newer timestamp', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-20T00:00:00.000Z',
      replyCount: 2,
      unreadCount: 0,
    });

    store.reconcileHydratedThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-24T00:00:00.000Z',
      replyCount: 4,
      hasReplyBySelf: false,
      isRootMessageBySelf: true,
      lastReplyMessageId: 'message-new',
      lastReplyAuthorId: 'user-new',
      lastReplyPreview: 'preview-new',
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.replyCount).toBe(4);
    expect(thread.lastReplyAt).toBe('2026-02-24T00:00:00.000Z');
    expect(thread.lastReplyMessageId).toBe('message-new');
    expect(thread.lastReplyAuthorId).toBe('user-new');
    expect(thread.lastReplyPreview).toBe('preview-new');
    expect(thread.isRootMessageBySelf).toBe(true);
  });

  it('normalizes hydrated preview text and keeps previous preview when hydrated preview is blank', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-20T00:00:00.000Z',
      lastReplyPreview: 'Existing preview',
    });

    store.reconcileHydratedThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-24T00:00:00.000Z',
      replyCount: 1,
      hasReplyBySelf: false,
      isRootMessageBySelf: false,
      lastReplyPreview: '   ',
    });

    let [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.lastReplyPreview).toBe('Existing preview');

    store.reconcileHydratedThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-25T00:00:00.000Z',
      replyCount: 1,
      hasReplyBySelf: false,
      isRootMessageBySelf: false,
      lastReplyPreview: '  Hydrated preview  ',
    });

    [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.lastReplyPreview).toBe('Hydrated preview');
  });

  it('prunes thread index to most recent entries', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-old',
      lastReplyAt: '2026-02-01T00:00:00.000Z',
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-new',
      lastReplyAt: '2026-02-03T00:00:00.000Z',
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-mid',
      lastReplyAt: '2026-02-02T00:00:00.000Z',
    });

    store.pruneToMostRecent(2);

    const threads = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(threads.map(thread => thread.threadId)).toEqual(['thread-new', 'thread-mid']);
  });

  it('prunes thread index to allowed conversation ids', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-03T00:00:00.000Z',
    });
    store.upsertThread({
      conversationId: 'conversation-b',
      threadId: 'thread-b',
      lastReplyAt: '2026-02-02T00:00:00.000Z',
    });

    store.pruneToConversationIds(['conversation-a']);

    const threads = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(threads.map(thread => `${thread.conversationId}:${thread.threadId}`)).toEqual(['conversation-a:thread-a']);
  });

  it('builds thread row view model with deterministic fallbacks', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-02-03T00:00:00.000Z',
      unreadCount: 2,
      hasUnreadMentionForSelf: true,
      isRootMessageBySelf: true,
      hasReplyBySelf: true,
    });

    const [row] = getFilteredThreadRows(
      useThreadIndexStore.getState(),
      {
        allThreads: true,
        myThreads: false,
        contributed: false,
        inactive: true,
      },
      {
        conversationLabelsById: {'conversation-a': 'Project Alpha'},
        now: new Date('2026-02-24T00:00:00.000Z').getTime(),
      },
    );

    expect(row).toEqual(
      expect.objectContaining({
        conversationId: 'conversation-a',
        threadId: 'thread-a',
        title: 'Thread in Project Alpha',
        conversationLabel: 'Project Alpha',
        authorLabel: 'Unknown author',
        preview: 'No preview available.',
        lastActivityAt: '2026-02-03T00:00:00.000Z',
        badges: expect.objectContaining({
          unreadCount: 2,
          hasUnreadMentionForSelf: true,
          isMyThread: true,
          isContributed: true,
          isInactive: false,
        }),
      }),
    );
  });

  it('builds thread row view model with label fallbacks and trimmed preview', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-01T00:00:00.000Z',
      lastReplyAuthorId: 'user-a',
      lastReplyPreview: '  hello world  ',
    });

    const [row] = getFilteredThreadRows(
      useThreadIndexStore.getState(),
      {
        allThreads: true,
        myThreads: false,
        contributed: false,
        inactive: true,
      },
      {
        authorLabelsById: {'user-a': 'Ada Lovelace'},
        now: new Date('2026-02-24T00:00:00.000Z').getTime(),
      },
    );

    expect(row.title).toBe('Thread in conversation-a');
    expect(row.conversationLabel).toBe('conversation-a');
    expect(row.authorLabel).toBe('Ada Lovelace');
    expect(row.preview).toBe('hello world');
    expect(row.badges.isInactive).toBe(true);
  });

  it('uses root message preview as thread row title when available', () => {
    const store = useThreadIndexStore.getState();

    store.reconcileHydratedThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      rootMessagePreview: '  Root message text  ',
      lastReplyAt: '2026-01-03T00:00:00.000Z',
      replyCount: 1,
      hasReplyBySelf: false,
      isRootMessageBySelf: false,
    });

    const [row] = getFilteredThreadRows(
      useThreadIndexStore.getState(),
      {
        allThreads: true,
        myThreads: false,
        contributed: false,
        inactive: true,
      },
      {
        conversationLabelsById: {'conversation-a': 'Project Alpha'},
      },
    );

    expect(row.title).toBe('Root message text');
    expect(row.preview).toBe('No preview available.');
  });

  it('resolves author label with displayName -> handle -> id fallback chain', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-display-name',
      lastReplyAt: '2026-01-03T00:00:00.000Z',
      lastReplyAuthorId: 'user-display',
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-handle',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      lastReplyAuthorId: 'user-handle',
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-id',
      lastReplyAt: '2026-01-01T00:00:00.000Z',
      lastReplyAuthorId: 'user-id',
    });

    const rows = getFilteredThreadRows(
      useThreadIndexStore.getState(),
      {
        allThreads: true,
        myThreads: false,
        contributed: false,
        inactive: true,
      },
      {
        authorLabelsById: {
          'user-display': {displayName: 'Ada Lovelace', handle: '@ada'},
          'user-handle': {displayName: '   ', handle: '@hopper'},
          'user-id': {displayName: ' ', handle: ' '},
        },
      },
    );

    expect(rows.map(row => row.authorLabel)).toEqual(['Ada Lovelace', '@hopper', 'user-id']);
  });

  it('tracks participant user ids with dedupe and max of three', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-01T00:00:00.000Z',
      authorId: 'user-a',
      isSelfReply: false,
      hasSelfMention: false,
    });
    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      authorId: 'user-b',
      isSelfReply: false,
      hasSelfMention: false,
    });
    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-03T00:00:00.000Z',
      authorId: 'user-a',
      isSelfReply: false,
      hasSelfMention: false,
    });
    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-04T00:00:00.000Z',
      authorId: 'user-c',
      isSelfReply: false,
      hasSelfMention: false,
    });
    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-05T00:00:00.000Z',
      authorId: 'user-d',
      isSelfReply: false,
      hasSelfMention: false,
    });

    const [thread] = getAllThreadsSorted(useThreadIndexStore.getState());
    expect(thread.participantUserIds).toEqual(['user-a', 'user-b', 'user-c']);
  });

  it('returns threads for a conversation sorted by last reply timestamp', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      lastReplyAt: '2026-01-01T00:00:00.000Z',
    });
    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-b',
      lastReplyAt: '2026-01-03T00:00:00.000Z',
    });
    store.upsertThread({
      conversationId: 'conversation-b',
      threadId: 'thread-c',
      lastReplyAt: '2026-01-04T00:00:00.000Z',
    });

    const threads = getThreadsForConversation(useThreadIndexStore.getState(), 'conversation-a');
    expect(threads.map(thread => thread.threadId)).toEqual(['thread-b', 'thread-a']);
  });

  it('builds conversation thread row view model with root metadata and active state', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      rootMessagePreview: 'Root preview',
      rootMessageAuthorId: 'user-a',
      rootMessageTimestamp: '2026-01-01T00:00:00.000Z',
      lastReplyAt: '2026-01-03T00:00:00.000Z',
      replyCount: 4,
      unreadCount: 2,
      participantUserIds: ['user-a', 'user-b'],
    });

    const [thread] = getThreadsForConversation(useThreadIndexStore.getState(), 'conversation-a');
    const row = buildConversationThreadRowViewModel(thread, {'user-a': 'Ada Lovelace'}, 'thread-a');

    expect(row).toEqual(
      expect.objectContaining({
        rootAuthorLabel: 'Ada Lovelace',
        rootMessageTimestamp: '2026-01-01T00:00:00.000Z',
        preview: 'Root preview',
        replyCount: 4,
        unreadCount: 2,
        participantUserIds: ['user-a', 'user-b'],
        isActive: true,
      }),
    );
  });
});
