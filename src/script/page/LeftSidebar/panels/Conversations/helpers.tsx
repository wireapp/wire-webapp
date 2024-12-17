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

import {t} from 'Util/LocalizerUtil';
import {replaceAccents} from 'Util/StringUtil';

import {SidebarTabs} from './useSidebarStore';

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
  const conversationSearchFilter = (conversation: Conversation) => {
    const filterWord = replaceAccents(conversationsFilter.toLowerCase());
    const conversationDisplayName = replaceAccents(conversation.display_name().toLowerCase());

    return conversationDisplayName.includes(filterWord);
  };

  const conversationArchivedFilter = (conversation: Conversation) => !archivedConversations.includes(conversation);

  if ([SidebarTabs.FOLDER, SidebarTabs.RECENT].includes(currentTab)) {
    return {
      conversations: conversations.filter(conversationSearchFilter),
      searchInputPlaceholder: t('searchConversations'),
    };
  }

  if (currentTab === SidebarTabs.GROUPS) {
    return {
      conversations: groupConversations.filter(conversationArchivedFilter).filter(conversationSearchFilter),
      searchInputPlaceholder: t('searchGroupConversations'),
    };
  }

  if (currentTab === SidebarTabs.DIRECTS) {
    return {
      conversations: directConversations.filter(conversationArchivedFilter).filter(conversationSearchFilter),
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

export const conversationSearchFilter = (filter: string) => (conversation: Conversation) => {
  const filterWord = replaceAccents(filter.toLowerCase());
  const conversationDisplayName = replaceAccents(conversation.display_name().toLowerCase());

  return conversationDisplayName.includes(filterWord);
};

export const scrollToConversation = (conversationId: string) => {
  const element = document.querySelector<HTMLElement>(`.conversation-list-cell[data-uie-uid="${conversationId}"]`);

  if (!element) {
    return;
  }

  const rect = element.getBoundingClientRect();

  const isVisible =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth);

  if (!isVisible) {
    element.scrollIntoView({behavior: 'instant', block: 'center', inline: 'nearest'});
  }
};
