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

import {fireEvent, render} from '@testing-library/react';

import type {ThreadRowViewModel} from 'Components/MessagesList/threading/threadIndexStore';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {ThreadListItem} from './ThreadListItem';

const createThreadRow = (overrides: Partial<ThreadRowViewModel> = {}): ThreadRowViewModel => ({
  conversationId: 'conversation-a',
  threadId: 'thread-a',
  title: 'Hi team, any news on the launch?',
  conversationLabel: 'Product sync',
  authorLabel: 'Ada Lovelace',
  preview: 'Latest update',
  lastActivityAt: '2026-01-02T00:00:00.000Z',
  badges: {
    unreadCount: 0,
    hasUnreadMentionForSelf: false,
  },
  thread: {
    conversationId: 'conversation-a',
    threadId: 'thread-a',
    lastReplyAt: '2026-01-02T00:00:00.000Z',
    replyCount: 16,
    unreadCount: 0,
    hasUnreadMentionForSelf: false,
    hasReplyBySelf: false,
    isRootMessageBySelf: false,
    seenMessageIds: [],
  },
  ...overrides,
});

describe('ThreadListItem', () => {
  it('renders root message preview, conversation label, and reply count', () => {
    const {getByText} = render(withTheme(<ThreadListItem thread={createThreadRow()} />));

    expect(getByText('Hi team, any news on the launch?')).toBeTruthy();
    expect(getByText('Product sync')).toBeTruthy();
    expect(getByText('16 replies')).toBeTruthy();
  });

  it('renders unread badge when thread has unread replies', () => {
    const {getByText, queryByText} = render(
      withTheme(
        <ThreadListItem
          thread={createThreadRow({
            badges: {
              unreadCount: 3,
              hasUnreadMentionForSelf: false,
            },
            thread: {
              conversationId: 'conversation-a',
              threadId: 'thread-a',
              lastReplyAt: '2026-01-02T00:00:00.000Z',
              replyCount: 16,
              unreadCount: 3,
              hasUnreadMentionForSelf: false,
              hasReplyBySelf: false,
              isRootMessageBySelf: false,
              seenMessageIds: [],
            },
          })}
        />,
      ),
    );

    expect(getByText('3')).toBeTruthy();
    expect(queryByText('3 unread')).toBeNull();
  });

  it('calls onClick with thread entry when row is clicked', () => {
    const onClick = jest.fn();
    const thread = createThreadRow();

    const {getByRole} = render(withTheme(<ThreadListItem thread={thread} onClick={onClick} />));

    fireEvent.click(getByRole('button', {name: /Hi team, any news on the launch\?/}));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(thread.thread);
  });

  it('renders thread icon slot', () => {
    const {container} = render(withTheme(<ThreadListItem thread={createThreadRow()} />));

    expect(container.querySelector('[data-uie-name="threads-list-item-thread-icon"]')).toBeTruthy();
  });
});
