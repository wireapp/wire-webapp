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
  ensureThreadRootMetadata,
  getAllThreadsSorted,
  getThreadsForConversation,
  useThreadIndexStore,
  countScopedThreads,
  getScopedThreadRows,
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

  it('fills missing root metadata without overwriting existing values', () => {
    const store = useThreadIndexStore.getState();

    store.recordThreadReplyEvent({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      eventTime: '2026-01-02T00:00:00.000Z',
      messageId: 'reply-a',
      authorId: 'user-b',
      preview: 'First reply',
      isSelfReply: false,
      hasSelfMention: false,
    });

    ensureThreadRootMetadata('conversation-a', 'thread-a', {
      rootMessagePreview: 'Root message',
      rootMessageAuthorId: 'user-a',
      rootMessageTimestamp: '2026-01-01T00:00:00.000Z',
    });

    const thread = useThreadIndexStore.getState().threadsByKey['conversation-a:thread-a'];
    expect(thread.rootMessagePreview).toBe('Root message');
    expect(thread.rootMessageAuthorId).toBe('user-a');
    expect(thread.rootMessageTimestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(thread.replyCount).toBe(1);
  });
  it('returns scoped thread rows for selected conversation ids', () => {
    const store = useThreadIndexStore.getState();

    store.upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      rootMessagePreview: 'Favorite thread',
      lastReplyAt: '2026-01-03T00:00:00.000Z',
      replyCount: 2,
      unreadCount: 1,
    });
    store.upsertThread({
      conversationId: 'conversation-b',
      threadId: 'thread-b',
      rootMessagePreview: 'Other thread',
      lastReplyAt: '2026-01-04T00:00:00.000Z',
      replyCount: 1,
      unreadCount: 0,
    });

    const rows = getScopedThreadRows(useThreadIndexStore.getState(), ['conversation-a'], {
      conversationLabelsById: {'conversation-a': 'Favorites'},
      authorLabelsById: {'user-a': 'Ada'},
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        conversationId: 'conversation-a',
        threadId: 'thread-a',
        title: 'Favorite thread',
        conversationLabel: 'Favorites',
      }),
    );
    expect(countScopedThreads(useThreadIndexStore.getState(), ['conversation-a', 'conversation-b'])).toBe(2);
    expect(countScopedThreads(useThreadIndexStore.getState(), ['conversation-a'])).toBe(1);
  });

});
