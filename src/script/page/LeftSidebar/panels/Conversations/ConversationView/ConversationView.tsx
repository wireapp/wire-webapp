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

import {ConversationLabel} from '../../../../../conversation/ConversationLabelRepository';
import {Conversation} from '../../../../../entity/Conversation';
import {conversationSearchFilter} from '../helpers';
import {SidebarTabs, useSidebarStore} from '../useSidebarStore';

interface ConversationViewProps {
  conversations: Conversation[];
  conversationsFilter?: string;
  currentFolder?: ConversationLabel;
  getCommonConversationCellProps: (conversation: Conversation, index: number) => ConversationListCellProps;
}

export const ConversationView = ({
  conversations,
  conversationsFilter = '',
  currentFolder,
  getCommonConversationCellProps,
}: ConversationViewProps) => {
  const {currentTab} = useSidebarStore();
  const isFolderView = currentTab === SidebarTabs.FOLDER;

  if (isFolderView && currentFolder) {
    return currentFolder
      ?.conversations()
      .filter(conversationSearchFilter(conversationsFilter))
      .map((conversation, index) => (
        <ConversationListCell key={conversation.id} {...getCommonConversationCellProps(conversation, index)} />
      ));
  }

  return conversations.map((conversation, index) => (
    <ConversationListCell key={conversation.id} {...getCommonConversationCellProps(conversation, index)} />
  ));
};
