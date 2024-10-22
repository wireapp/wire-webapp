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

import {ConversationLabel} from 'src/script/conversation/ConversationLabelRepository';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {SearchRepository} from 'src/script/search/SearchRepository';

import {SidebarTabs} from './useSidebarStore';

type GetFilteredGroupConversationsParams = {
  currentTab: SidebarTabs;
  conversationRepository: ConversationRepository;
  searchRepository: SearchRepository;
  conversationsFilter: string;
  favoriteConversations: Conversation[];
  conversations: Conversation[];
  currentFolder?: ConversationLabel | undefined;
  archivedConversations: Conversation[];
};

export const getFilteredGroupConversations = ({
  currentTab,
  conversationRepository,
  searchRepository,
  conversationsFilter,
  favoriteConversations,
  conversations,
  currentFolder,
  archivedConversations,
}: GetFilteredGroupConversationsParams) => {
  const isFavoritesView = currentTab === SidebarTabs.FAVORITES;
  const isArchivesView = currentTab === SidebarTabs.ARCHIVES;
  const isFolderView = currentTab === SidebarTabs.FOLDER;

  const {query, isHandleQuery} = searchRepository.normalizeQuery(conversationsFilter);
  let filteredGroup = conversationRepository.getGroupsByName(query, isHandleQuery);

  if (isFavoritesView) {
    filteredGroup = favoriteConversations.filter(item => filteredGroup.includes(item));
  }

  if (isArchivesView) {
    filteredGroup = archivedConversations.filter(item => filteredGroup.includes(item));
  }

  if (isFolderView && currentFolder) {
    filteredGroup = currentFolder?.conversations()?.filter(item => filteredGroup.includes(item)) || [];
  }

  if (!isArchivesView) {
    filteredGroup = filteredGroup.filter(item => !archivedConversations.includes(item));
  }

  return filteredGroup.filter(item => !conversations.includes(item));
};
