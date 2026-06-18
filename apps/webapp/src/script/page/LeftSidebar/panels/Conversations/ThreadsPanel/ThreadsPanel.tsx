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

import {useMemo} from 'react';

import {
  ThreadAuthorLabelData,
  ThreadIndexEntry,
  getScopedThreadRows,
  useThreadIndexStore,
} from 'Components/MessagesList/threading/threadIndexStore';
import {isActiveThreadRow} from 'Components/MessagesList/threading/threadRouteUtils';
import type {Conversation} from 'Repositories/entity/Conversation';
import {useAppMainState} from 'src/script/page/state';

import {ThreadListItem} from '../ThreadListItem';

import {emptyState, list, panelContainer} from './ThreadsPanel.styles';

type ThreadsPanelProps = {
  conversationIds: string[];
  onOpenThread?: (thread: ThreadIndexEntry) => void;
  conversationLabelsById?: Record<string, string>;
  authorLabelsById?: Record<string, ThreadAuthorLabelData | string>;
  conversationsById?: Record<string, Conversation>;
  searchValue?: string;
};

export const ThreadsPanel = ({
  conversationIds,
  onOpenThread,
  conversationLabelsById = {},
  authorLabelsById = {},
  conversationsById = {},
  searchValue = '',
}: ThreadsPanelProps) => {
  const threadsByKey = useThreadIndexStore(state => state.threadsByKey);
  const activeThreadRootMessage = useAppMainState(state => state.conversationThread.rootMessage);
  const scopedThreads = useMemo(
    () =>
      getScopedThreadRows(useThreadIndexStore.getState(), conversationIds, {
        conversationLabelsById,
        authorLabelsById,
      }),
    [authorLabelsById, conversationIds, conversationLabelsById, threadsByKey],
  );

  const visibleThreads = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    if (!normalizedQuery) {
      return scopedThreads;
    }

    return scopedThreads.filter(thread => {
      const searchableText = [
        thread.title,
        thread.preview,
        thread.conversationLabel,
        thread.thread.rootMessagePreview,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [scopedThreads, searchValue]);

  return (
    <div css={panelContainer} data-uie-name="threads-panel">
      {!visibleThreads.length ? (
        <div className="left-list-no-conversations" css={emptyState} data-uie-name="threads-placeholder-panel">
          <h2>No threads found</h2>
          <p>{searchValue ? 'No threads match your search.' : 'No threads in this section yet.'}</p>
        </div>
      ) : (
        <ul css={list} data-uie-name="threads-list">
          {visibleThreads.map(thread => (
            <ThreadListItem
              key={`${thread.conversationId}:${thread.threadId}`}
              thread={thread}
              conversation={conversationsById[thread.conversationId]}
              isActive={isActiveThreadRow(thread, activeThreadRootMessage)}
              onClick={onOpenThread}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
