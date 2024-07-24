/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {SidebarTabs} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {t} from 'Util/LocalizerUtil';

import {Conversation} from '../../../../entity/Conversation';

interface GetTabConversationsProps {
  currentTab: SidebarTabs;
  conversations: Conversation[];
  groupConversations: Conversation[];
  directConversations: Conversation[];
  favoriteConversations: Conversation[];
  archivedConversations: Conversation[];
  conversationsFilter: string;
}

export function getTabConversations({
  currentTab,
  conversations,
  groupConversations,
  directConversations,
  favoriteConversations,
  archivedConversations,
  conversationsFilter,
}: GetTabConversationsProps) {
  const conversationSearchFilter = (conversation: Conversation) =>
    conversation.display_name().toLowerCase().includes(conversationsFilter.toLowerCase());

  const conversationArchivedFilter = (conversation: Conversation) => !archivedConversations.includes(conversation);

  if ([SidebarTabs.FOLDER, SidebarTabs.RECENT].includes(currentTab)) {
    return {
      conversations: conversations.filter(conversationSearchFilter),
      searchInputPlaceholder: t('searchConversations'),
    };
  }

  if (currentTab === SidebarTabs.GROUPS) {
    return {
      conversations: groupConversations.filter(conversationArchivedFilter, conversationSearchFilter),
      searchInputPlaceholder: t('searchGroupConversations'),
    };
  }

  if (currentTab === SidebarTabs.DIRECTS) {
    return {
      conversations: directConversations.filter(conversationArchivedFilter, conversationSearchFilter),
      searchInputPlaceholder: t('searchDirectConversations'),
    };
  }

  if (currentTab === SidebarTabs.FAVORITES) {
    return {
      conversations: favoriteConversations.filter(conversationSearchFilter),
      searchInputPlaceholder: t('searchFavoriteConversations'),
    };
  }

  if (currentTab === SidebarTabs.ARCHIVES) {
    return {
      conversations: archivedConversations.filter(conversationSearchFilter),
      searchInputPlaceholder: t('searchArchivedConversations'),
    };
  }

  return {
    conversations: [],
    searchInputPlaceholder: '',
  };
}
