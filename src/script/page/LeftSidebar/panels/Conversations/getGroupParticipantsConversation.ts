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

import {ConversationLabel} from 'Repositories/conversation/ConversationLabelRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {SearchRepository} from 'Repositories/search/SearchRepository';

import {SidebarTabs} from './useSidebarStore';

type GetGroupParticipantsConversationsParams = {
  currentTab: SidebarTabs;
  conversationRepository: ConversationRepository;
  searchRepository: SearchRepository;
  conversationsFilter: string;
  favoriteConversations: Conversation[];
  conversations: Conversation[];
  currentFolder?: ConversationLabel | undefined;
  archivedConversations: Conversation[];
};

export const getGroupParticipantsConversations = ({
  currentTab,
  conversationRepository,
  searchRepository,
  conversationsFilter,
  favoriteConversations,
  conversations,
  currentFolder,
  archivedConversations,
}: GetGroupParticipantsConversationsParams) => {
  const isFavoritesView = currentTab === SidebarTabs.FAVORITES;
  const isArchivesView = currentTab === SidebarTabs.ARCHIVES;
  const isFolderView = currentTab === SidebarTabs.FOLDER;

  const {query, isHandleQuery} = searchRepository.normalizeQuery(conversationsFilter);
  let filteredGroup = conversationRepository.getGroupsByName(query, isHandleQuery);

  // Convert arrays to Sets for faster lookups
  const favoriteSet = new Set(favoriteConversations);
  const archivedSet = new Set(archivedConversations);
  const conversationsSet = new Set(conversations);
  const currentFolderConversations =
    isFolderView && currentFolder?.conversations() ? new Set(currentFolder.conversations()) : null;

  if (isFavoritesView) {
    filteredGroup = filteredGroup.filter(item => favoriteSet.has(item));
  }

  if (isArchivesView) {
    filteredGroup = filteredGroup.filter(item => archivedSet.has(item));
  }

  if (isFolderView && currentFolderConversations) {
    filteredGroup = filteredGroup.filter(item => currentFolderConversations.has(item));
  }

  if (!isArchivesView) {
    filteredGroup = filteredGroup.filter(item => !archivedSet.has(item));
  }

  // Exclude existing conversations
  return filteredGroup.filter(item => !conversationsSet.has(item));
};
