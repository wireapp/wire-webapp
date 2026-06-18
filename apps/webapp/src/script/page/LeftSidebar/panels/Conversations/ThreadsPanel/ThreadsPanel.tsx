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

import {useMemo, useState} from 'react';

import {CONVERSATION_ACCESS} from '@wireapp/api-client/lib/conversation';

import {Avatar, AVATAR_SIZE, ChannelAvatar, GroupAvatar} from 'Components/Avatar';
import {
  ThreadAuthorLabelData,
  ThreadIndexEntry,
  ThreadRowViewModel,
  getFilteredThreadRows,
  useThreadIndexStore,
} from 'Components/MessagesList/threading/threadIndexStore';
import type {Conversation} from 'Repositories/entity/Conversation';
import {formatTimestamp} from 'src/script/util/TimeUtil';

import {
  activeFiltersText,
  authorLabel,
  avatarPlaceholder,
  avatarWrapper,
  badge,
  badges,
  conversationLabel,
  content,
  emptyState,
  filterButton,
  filtersContainer,
  itemHeader,
  list,
  listItem,
  meta,
  openButton,
  panelContainer,
  preview,
  resetFiltersButton,
  summaryText,
  timestamp,
  title,
} from './ThreadsPanel.styles';

type ThreadFilterKey = 'allThreads' | 'myThreads' | 'contributed' | 'inactive';

const FILTER_LABELS: Record<ThreadFilterKey, string> = {
  allThreads: 'All threads',
  myThreads: 'My threads',
  contributed: 'Contributed',
  inactive: 'Inactive',
};
const DEFAULT_FILTERS = {
  allThreads: true,
  myThreads: false,
  contributed: false,
  inactive: false,
};

type ThreadsPanelProps = {
  onOpenThread?: (thread: ThreadIndexEntry) => void;
  conversationLabelsById?: Record<string, string>;
  authorLabelsById?: Record<string, ThreadAuthorLabelData | string>;
  conversationsById?: Record<string, Conversation>;
  rootMessageSearchValue?: string;
};

const ThreadConversationAvatar = ({conversation}: {conversation?: Conversation}) => {
  if (!conversation) {
    return <div css={avatarPlaceholder} aria-hidden="true" />;
  }

  if (conversation.isChannel()) {
    return (
      <ChannelAvatar
        conversationID={conversation.id}
        isLocked={!conversation.accessModes?.includes(CONVERSATION_ACCESS.LINK)}
        size="small"
      />
    );
  }

  if (conversation.isGroup()) {
    return <GroupAvatar conversationID={conversation.id} size="small" />;
  }

  const participants = conversation.participating_user_ets();
  if (participants.length > 0) {
    return <Avatar participant={participants[0]} avatarSize={AVATAR_SIZE.X_SMALL} hideAvailabilityStatus noBadge />;
  }

  return <div css={avatarPlaceholder} aria-hidden="true" />;
};

const getConversationAccentColor = (conversation?: Conversation) => {
  if (!conversation || conversation.isGroupOrChannel()) {
    return undefined;
  }

  return conversation.participating_user_ets()[0]?.accent_color();
};

export const ThreadsPanel = ({
  onOpenThread,
  conversationLabelsById = {},
  authorLabelsById = {},
  conversationsById = {},
  rootMessageSearchValue = '',
}: ThreadsPanelProps) => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const allThreads = useThreadIndexStore(state =>
    getFilteredThreadRows(state, filters, {
      conversationLabelsById,
      authorLabelsById,
    }),
  );
  const visibleThreads = useMemo(() => {
    const normalizedQuery = rootMessageSearchValue.trim().toLowerCase();
    if (!normalizedQuery) {
      return allThreads;
    }

    return allThreads.filter(thread => {
      const rootMessagePreview = thread.thread.rootMessagePreview?.toLowerCase();
      return !!rootMessagePreview && rootMessagePreview.includes(normalizedQuery);
    });
  }, [allThreads, rootMessageSearchValue]);

  const activeFilters = useMemo(
    () => (Object.keys(filters) as ThreadFilterKey[]).filter(filterKey => filters[filterKey]),
    [filters],
  );
  const isDefaultFilters =
    filters.allThreads === DEFAULT_FILTERS.allThreads &&
    filters.myThreads === DEFAULT_FILTERS.myThreads &&
    filters.contributed === DEFAULT_FILTERS.contributed &&
    filters.inactive === DEFAULT_FILTERS.inactive;

  const toggleFilter = (filterKey: ThreadFilterKey) => {
    setFilters(current => {
      if (filterKey === 'inactive') {
        return {
          ...current,
          inactive: !current.inactive,
        };
      }

      if (filterKey === 'allThreads') {
        return {
          ...current,
          allThreads: !current.allThreads,
        };
      }

      const next = {
        ...current,
        [filterKey]: !current[filterKey],
      };

      if (next[filterKey]) {
        next.allThreads = false;
      } else if (!next.myThreads && !next.contributed) {
        next.allThreads = true;
      }

      return next;
    });
  };

  return (
    <div css={panelContainer} data-uie-name="threads-panel">
      <div css={filtersContainer} data-uie-name="threads-filters">
        {(Object.keys(filters) as ThreadFilterKey[]).map(filterKey => (
          <button
            key={filterKey}
            type="button"
            css={filterButton(filters[filterKey])}
            data-uie-name={`threads-filter-${filterKey}`}
            aria-pressed={filters[filterKey]}
            onClick={() => toggleFilter(filterKey)}
          >
            {FILTER_LABELS[filterKey]}
          </button>
        ))}
        {!isDefaultFilters && (
          <button
            css={resetFiltersButton}
            type="button"
            data-uie-name="threads-filter-reset"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Reset filters
          </button>
        )}
      </div>
      <p css={summaryText} data-uie-name="threads-visible-count">
        {`${visibleThreads.length} ${visibleThreads.length === 1 ? 'thread' : 'threads'} shown`}
      </p>
      {!visibleThreads.length ? (
        <div className="left-list-no-conversations" css={emptyState} data-uie-name="threads-placeholder-panel">
          <h2>No threads found</h2>
          <p>No threads for the current filters.</p>
        </div>
      ) : (
        <ul css={list} data-uie-name="threads-list">
          {visibleThreads.map((thread: ThreadRowViewModel) => {
            const conversation = conversationsById[thread.conversationId];
            const conversationAccentColor = getConversationAccentColor(conversation);
            const isUnread = thread.badges.unreadCount > 0;

            return (
              <li
                css={listItem(isUnread, thread.authorAccentColor)}
                key={`${thread.conversationId}:${thread.threadId}`}
                data-uie-name="threads-list-item"
              >
                <button
                  css={openButton}
                  type="button"
                  data-uie-name="threads-list-open-button"
                  onClick={() => onOpenThread?.(thread.thread)}
                >
                  <div css={avatarWrapper} data-uie-name="threads-list-item-avatar">
                    <ThreadConversationAvatar conversation={conversation} />
                  </div>
                  <div css={content}>
                    <div css={itemHeader} data-uie-name="threads-list-item-header">
                      <span
                        css={conversationLabel(conversationAccentColor)}
                        data-uie-name="threads-list-item-conversation-label"
                      >
                        {thread.conversationLabel}
                      </span>
                      <time
                        css={timestamp}
                        data-uie-name="threads-list-item-last-activity"
                        dateTime={thread.lastActivityAt}
                        title={thread.lastActivityAt}
                      >
                        {formatTimestamp(thread.lastActivityAt, false)}
                      </time>
                    </div>
                    <span css={title(isUnread)} data-uie-name="threads-list-item-title">
                      {thread.title}
                    </span>
                  </div>
                </button>
                <div css={meta} data-uie-name="threads-list-item-meta">
                  <span css={authorLabel(thread.authorAccentColor)}>{`Last reply by ${thread.authorLabel}`}</span>
                  <div css={badges} data-uie-name="threads-list-item-badges">
                    <span css={badge('reply')} data-uie-name="threads-list-item-replies-badge">
                      {`${thread.thread.replyCount} ${thread.thread.replyCount === 1 ? 'reply' : 'replies'}`}
                    </span>
                    {thread.badges.unreadCount > 0 && (
                      <span
                        css={badge('unread', thread.authorAccentColor)}
                        data-uie-name="threads-list-item-unread-badge"
                      >
                        {`${thread.badges.unreadCount} unread`}
                      </span>
                    )}
                    {thread.badges.hasUnreadMentionForSelf && (
                      <span css={badge('mention')} data-uie-name="threads-list-item-mention-badge">
                        Mentioned
                      </span>
                    )}
                  </div>
                </div>
                <p css={preview} data-uie-name="threads-list-item-preview">
                  {thread.preview}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p css={activeFiltersText} data-uie-name="threads-active-filters">
        {activeFilters.map(filterKey => FILTER_LABELS[filterKey]).join(', ')}
      </p>
    </div>
  );
};
