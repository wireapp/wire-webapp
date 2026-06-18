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

import {t} from 'Util/localizerUtil';

import {ConversationListContentFilter} from '../useConversationListContentFilterStore';

import {tabBadge, tabButton, tabsContainer} from './ConversationListFilterTabs.styles';

type ConversationListFilterTabsProps = {
  activeFilter: ConversationListContentFilter;
  allCount: number;
  conversationCount: number;
  threadCount: number;
  onChange: (filter: ConversationListContentFilter) => void;
};

export const ConversationListFilterTabs = ({
  activeFilter,
  allCount,
  conversationCount,
  threadCount,
  onChange,
}: ConversationListFilterTabsProps) => {
  return (
    <div css={tabsContainer} data-uie-name="conversation-list-content-filters">
      <button
        type="button"
        css={tabButton(activeFilter === ConversationListContentFilter.ALL)}
        onClick={() => onChange(ConversationListContentFilter.ALL)}
        data-uie-name="conversation-list-filter-all"
        aria-pressed={activeFilter === ConversationListContentFilter.ALL}
      >
        {t('conversationViewTooltip')}
        <span css={tabBadge(activeFilter === ConversationListContentFilter.ALL)}>{allCount}</span>
      </button>
      <button
        type="button"
        css={tabButton(activeFilter === ConversationListContentFilter.CONVERSATIONS)}
        onClick={() => onChange(ConversationListContentFilter.CONVERSATIONS)}
        data-uie-name="conversation-list-filter-conversations"
        aria-pressed={activeFilter === ConversationListContentFilter.CONVERSATIONS}
      >
        Conversations
        <span css={tabBadge(activeFilter === ConversationListContentFilter.CONVERSATIONS)}>{conversationCount}</span>
      </button>
      <button
        type="button"
        css={tabButton(activeFilter === ConversationListContentFilter.THREADS)}
        onClick={() => onChange(ConversationListContentFilter.THREADS)}
        data-uie-name="conversation-list-filter-threads"
        aria-pressed={activeFilter === ConversationListContentFilter.THREADS}
      >
        Threads
        <span css={tabBadge(activeFilter === ConversationListContentFilter.THREADS)}>{threadCount}</span>
      </button>
    </div>
  );
};
