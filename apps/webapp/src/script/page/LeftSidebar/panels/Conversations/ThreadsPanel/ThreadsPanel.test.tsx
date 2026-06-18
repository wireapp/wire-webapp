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

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {useThreadIndexStore} from 'Components/MessagesList/threading/threadIndexStore';

import {ThreadsPanel} from './ThreadsPanel';

describe('ThreadsPanel', () => {
  beforeEach(() => {
    useThreadIndexStore.getState().clearThreads();
    localStorage.removeItem('thread-index-store');
  });

  it('renders empty state when there are no indexed threads', () => {
    const {getByText} = render(withTheme(<ThreadsPanel conversationIds={['conversation-a']} />));

    expect(getByText('No threads found')).toBeTruthy();
    expect(getByText('No threads in this section yet.')).toBeTruthy();
  });

  it('renders indexed threads using the thread list row design', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      rootMessagePreview: 'Hi team, any news on the launch?',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 2,
      replyCount: 3,
    });

    const {getByText, queryByText} = render(withTheme(<ThreadsPanel conversationIds={['conversation-a']} />));

    expect(getByText('Hi team, any news on the launch?')).toBeTruthy();
    expect(getByText('conversation-a')).toBeTruthy();
    expect(getByText('3 replies')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(queryByText('Last reply by Unknown author')).toBeNull();
  });

  it('calls onOpenThread when clicking a thread row', () => {
    const onOpenThread = jest.fn();
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      rootMessagePreview: 'Planning notes',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 0,
      replyCount: 1,
    });

    const {getByRole} = render(
      withTheme(<ThreadsPanel conversationIds={['conversation-a']} onOpenThread={onOpenThread} />),
    );

    fireEvent.click(getByRole('button', {name: /Planning notes/}));

    expect(onOpenThread).toHaveBeenCalledTimes(1);
    expect(onOpenThread).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-a',
        threadId: 'thread-a',
      }),
    );
  });

  it('renders provided conversation labels', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      rootMessagePreview: 'Status update',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      unreadCount: 0,
      replyCount: 1,
    });

    const {getByText} = render(
      withTheme(
        <ThreadsPanel
          conversationIds={['conversation-a']}
          conversationLabelsById={{'conversation-a': 'Project Alpha'}}
        />,
      ),
    );

    expect(getByText('Status update')).toBeTruthy();
    expect(getByText('Project Alpha')).toBeTruthy();
  });

  it('filters threads by search value', () => {
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-a',
      threadId: 'thread-a',
      rootMessagePreview: 'Launch planning notes',
      lastReplyAt: '2026-01-02T00:00:00.000Z',
      replyCount: 1,
    });
    useThreadIndexStore.getState().upsertThread({
      conversationId: 'conversation-b',
      threadId: 'thread-b',
      rootMessagePreview: 'Sprint retrospective',
      lastReplyAt: '2026-01-03T00:00:00.000Z',
      replyCount: 1,
    });

    const {queryByText} = render(
      withTheme(
        <ThreadsPanel conversationIds={['conversation-a', 'conversation-b']} searchValue="launch" />,
      ),
    );

    expect(queryByText('Launch planning notes')).toBeTruthy();
    expect(queryByText('Sprint retrospective')).toBeNull();
  });
});
