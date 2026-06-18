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

import {ThreadRowViewModel} from 'Components/MessagesList/threading/threadIndexStore';
import {ConversationLabel} from 'Repositories/conversation/ConversationLabelRepository';
import {Conversation} from 'Repositories/entity/Conversation';

import {conversationSearchFilter} from './helpers';
import {SidebarTabs} from './useSidebarStore';

export type AllListItem =
  | {kind: 'conversation'; conversation: Conversation; activityAt: number}
  | {kind: 'thread'; thread: ThreadRowViewModel; activityAt: number};

export const filterThreadRowBySearch = (thread: ThreadRowViewModel, searchValue: string): boolean => {
  const normalizedQuery = searchValue.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [thread.title, thread.preview, thread.conversationLabel, thread.thread.rootMessagePreview]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
};

export const getThreadActivityTimestamp = (thread: ThreadRowViewModel): number =>
  Date.parse(thread.lastActivityAt) || 0;

export const buildMergedAllListItems = (
  conversations: Conversation[],
  threadRows: ThreadRowViewModel[],
  searchValue = '',
): AllListItem[] => {
  const normalizedSearch = searchValue.trim();
  const filteredConversations = normalizedSearch
    ? conversations.filter(conversationSearchFilter(normalizedSearch))
    : conversations;
  const filteredThreads = normalizedSearch
    ? threadRows.filter(thread => filterThreadRowBySearch(thread, normalizedSearch))
    : threadRows;

  const items: AllListItem[] = [
    ...filteredConversations.map(conversation => ({
      kind: 'conversation' as const,
      conversation,
      activityAt: conversation.last_event_timestamp(),
    })),
    ...filteredThreads.map(thread => ({
      kind: 'thread' as const,
      thread,
      activityAt: getThreadActivityTimestamp(thread),
    })),
  ];

  return items.sort((left, right) => right.activityAt - left.activityAt);
};

type GetScopedConversationsForTabParams = {
  currentTab: SidebarTabs;
  conversations: Conversation[];
  groupConversations: Conversation[];
  directConversations: Conversation[];
  favoriteConversations: Conversation[];
  archivedConversations: Conversation[];
  channelConversations: Conversation[];
  channelAndGroupConversations: Conversation[];
  isChannelsEnabled: boolean;
  currentFolder?: ConversationLabel;
};

const excludeArchived =
  (archivedConversations: Conversation[]) =>
  (conversation: Conversation): boolean =>
    !archivedConversations.includes(conversation);

export const getScopedConversationsForTab = ({
  currentTab,
  conversations,
  groupConversations,
  directConversations,
  favoriteConversations,
  archivedConversations,
  channelConversations,
  channelAndGroupConversations,
  isChannelsEnabled,
  currentFolder,
}: GetScopedConversationsForTabParams): Conversation[] => {
  const notArchived = excludeArchived(archivedConversations);

  switch (currentTab) {
    case SidebarTabs.RECENT:
      return conversations;
    case SidebarTabs.FAVORITES:
      return favoriteConversations;
    case SidebarTabs.GROUPS:
      return (isChannelsEnabled ? groupConversations : channelAndGroupConversations).filter(notArchived);
    case SidebarTabs.CHANNELS:
      return channelConversations.filter(notArchived);
    case SidebarTabs.DIRECTS:
      return directConversations.filter(notArchived);
    case SidebarTabs.FOLDER:
      return currentFolder?.conversations() ?? [];
    default:
      return [];
  }
};

export const getScopedConversationIds = (scopedConversations: Conversation[]): string[] =>
  scopedConversations.map(conversation => conversation.id);
