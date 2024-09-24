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

import {ConversationListCell, ConversationListCellProps} from 'Components/list/ConversationListCell';
import {t} from 'Util/LocalizerUtil';

import {ConversationLabel} from '../../../../../conversation/ConversationLabelRepository';
import {ConversationRepository} from '../../../../../conversation/ConversationRepository';
import {Conversation} from '../../../../../entity/Conversation';
import {SearchRepository} from '../../../../../search/SearchRepository';
import {conversationsList, headingTitle} from '../ConversationsList.styles';
import {SidebarTabs, useSidebarStore} from '../useSidebarStore';

interface FilteredGroupConversationsProps {
  archivedConversations: Conversation[];
  conversationsFilter?: string;
  conversations: Conversation[];
  conversationRepository: ConversationRepository;
  currentFolder?: ConversationLabel;
  favoriteConversations: Conversation[];
  getCommonConversationCellProps: (conversation: Conversation, index: number) => ConversationListCellProps;
  searchRepository: SearchRepository;
}

export const FilteredGroupConversations = ({
  archivedConversations,
  conversationRepository,
  conversations,
  conversationsFilter = '',
  currentFolder,
  favoriteConversations,
  getCommonConversationCellProps,
  searchRepository,
}: FilteredGroupConversationsProps) => {
  const {currentTab} = useSidebarStore();

  const isFolderView = currentTab === SidebarTabs.FOLDER;
  const isFavoritesView = currentTab === SidebarTabs.FAVORITES;
  const isArchivesView = currentTab === SidebarTabs.ARCHIVES;

  const getFilteredGroupConversations = () => {
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

  const filteredGroupConversations = getFilteredGroupConversations();

  if (!filteredGroupConversations.length) {
    return null;
  }

  return (
    <>
      <h3 css={headingTitle}>{t('searchGroups')}</h3>

      <ul css={conversationsList} data-uie-name="filtered-conversation-view" className="filtered-conversations">
        {filteredGroupConversations.map((conversation, index) => (
          <ConversationListCell key={conversation.id} {...getCommonConversationCellProps(conversation, index)} />
        ))}
      </ul>
    </>
  );
};
