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

import {Conversation} from 'Repositories/entity/Conversation';
import {t} from 'Util/LocalizerUtil';
import {replaceAccents} from 'Util/StringUtil';

import {ConversationFilter, SidebarTabs} from './useSidebarStore';

interface GetTabConversationsProps {
  currentTab: SidebarTabs;

  conversations: Conversation[];
  groupConversations: Conversation[];
  directConversations: Conversation[];
  favoriteConversations: Conversation[];
  archivedConversations: Conversation[];
  channelConversations: Conversation[];
  channelAndGroupConversations: Conversation[];
  conversationsFilter: string;
  isChannelsEnabled: boolean;
  conversationFilter: ConversationFilter;
  draftConversations: Conversation[];
}

type GetTabConversations = {
  conversations: Conversation[];
  searchInputPlaceholder: string;
};

const applyAdvancedFilter = (
  conversations: Conversation[],
  filter: ConversationFilter,
  draftConversations: Conversation[],
): Conversation[] => {
  if (filter === ConversationFilter.NONE) {
    return conversations;
  }

  return conversations.filter(conversation => {
    switch (filter) {
      case ConversationFilter.UNREAD:
        return conversation.hasUnread();
      case ConversationFilter.MENTIONS:
        return conversation.unreadState().selfMentions.length > 0;
      case ConversationFilter.REPLIES:
        return conversation.unreadState().selfReplies.length > 0;
      case ConversationFilter.DRAFTS:
        return draftConversations.some(draftConv => draftConv.id === conversation.id);
      case ConversationFilter.PINGS:
        return conversation.unreadState().pings.length > 0;
      default:
        return true;
    }
  });
};

export function getTabConversations({
  currentTab,
  conversations,
  groupConversations,
  directConversations,
  favoriteConversations,
  archivedConversations,
  conversationsFilter,
  channelConversations,
  isChannelsEnabled,
  channelAndGroupConversations,
  conversationFilter,
  draftConversations,
}: GetTabConversationsProps): GetTabConversations {
  const conversationSearchFilter = (conversation: Conversation) => {
    const filterWord = replaceAccents(conversationsFilter.toLowerCase());
    const conversationDisplayName = replaceAccents(conversation.display_name().toLowerCase());

    return conversationDisplayName.includes(filterWord);
  };

  const conversationArchivedFilter = (conversation: Conversation) => !archivedConversations.includes(conversation);

  if ([SidebarTabs.FOLDER, SidebarTabs.RECENT].includes(currentTab)) {
    if (!conversationsFilter) {
      return {
        conversations: applyAdvancedFilter(conversations, conversationFilter, draftConversations),
        searchInputPlaceholder: t('searchConversations'),
      };
    }

    const filterWord = replaceAccents(conversationsFilter.toLowerCase());
    const filteredGroupConversations = groupConversations.filter(group => {
      return group.participating_user_ets().some(user => {
        const conversationDisplayName = replaceAccents(user.name().toLowerCase());
        return conversationDisplayName.includes(filterWord);
      });
    });

    const filteredConversations = conversations.filter(conversationSearchFilter);
    const combinedConversations = [...filteredConversations, ...filteredGroupConversations];

    return {
      conversations: applyAdvancedFilter(combinedConversations, conversationFilter, draftConversations),
      searchInputPlaceholder: t('searchConversations'),
    };
  }

  if (currentTab === SidebarTabs.GROUPS) {
    const conversations = isChannelsEnabled ? groupConversations : channelAndGroupConversations;
    const filteredConversations = conversations.filter(conversationArchivedFilter).filter(conversationSearchFilter);

    return {
      conversations: applyAdvancedFilter(filteredConversations, conversationFilter, draftConversations),
      searchInputPlaceholder: t('searchGroupConversations'),
    };
  }

  if (currentTab === SidebarTabs.CHANNELS) {
    const filteredConversations = channelConversations
      .filter(conversationArchivedFilter)
      .filter(conversationSearchFilter);

    return {
      conversations: applyAdvancedFilter(filteredConversations, conversationFilter, draftConversations),
      searchInputPlaceholder: t('searchChannelConversations'),
    };
  }

  if (currentTab === SidebarTabs.DIRECTS) {
    const filteredConversations = directConversations
      .filter(conversationArchivedFilter)
      .filter(conversationSearchFilter);

    return {
      conversations: applyAdvancedFilter(filteredConversations, conversationFilter, draftConversations),
      searchInputPlaceholder: t('searchDirectConversations'),
    };
  }

  if (currentTab === SidebarTabs.FAVORITES) {
    const filteredConversations = favoriteConversations.filter(conversationSearchFilter);

    return {
      conversations: applyAdvancedFilter(filteredConversations, conversationFilter, draftConversations),
      searchInputPlaceholder: t('searchFavoriteConversations'),
    };
  }

  if (currentTab === SidebarTabs.ARCHIVES) {
    const filteredConversations = archivedConversations.filter(conversationSearchFilter);

    return {
      conversations: applyAdvancedFilter(filteredConversations, conversationFilter, draftConversations),
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

export const getConversationsWithHeadings = (
  currentConversations: Conversation[],
  conversationsFilter: string,
  currentTab: SidebarTabs,
) => {
  if (!conversationsFilter || currentTab !== SidebarTabs.RECENT) {
    return currentConversations;
  }

  const newConversationsWithHeadings = [];

  let peopleHeadingAdded = false;
  let groupHeadingAdded = false;

  for (const conversation of currentConversations) {
    if (!conversation.isGroup()) {
      if (!peopleHeadingAdded) {
        newConversationsWithHeadings.push({isHeader: true, heading: 'searchConversationNames'});
        peopleHeadingAdded = true;
      }
      newConversationsWithHeadings.push(conversation);
    }
  }

  for (const conversation of currentConversations) {
    if (conversation.isGroup()) {
      if (!groupHeadingAdded) {
        newConversationsWithHeadings.push({isHeader: true, heading: 'searchGroupParticipants'});
        groupHeadingAdded = true;
      }
      newConversationsWithHeadings.push(conversation);
    }
  }

  return newConversationsWithHeadings;
};
