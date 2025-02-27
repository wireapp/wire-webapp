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

import {ChevronIcon, IconButton} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {ConversationState} from 'src/script/conversation/ConversationState';
import {Conversation} from 'src/script/entity/Conversation';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';

import {
  conversationsSidebarHandleStyles,
  conversationsSidebarStyles,
  conversationsSidebarHandleIconStyles,
} from './ConversationSidebar.styles';

import {User} from '../../../../../entity/User';
import {ContentState} from '../../../../useAppState';
import {UserDetails} from '../../../UserDetails';
import {ConversationTabs} from '../ConversationTabs';
import {SidebarTabs} from '../useSidebarStore';

type ConversationSidebarProps = {
  isOpen: boolean;
  toggleOpen: () => void;
  isScreenLessThanMdBreakpoint: boolean;
  selfUser: User;
  conversationState: ConversationState;
  isTeam: boolean;
  changeTab: (nextTab: SidebarTabs, folderId?: string) => void;
  currentTab: SidebarTabs;
  groupConversations: Conversation[];
  directConversations: Conversation[];
  unreadConversations: Conversation[];
  favoriteConversations: Conversation[];
  archivedConversations: Conversation[];
  conversationRepository: ConversationRepository;
  onClickPreferences: (contentState: ContentState) => void;
  showNotificationsBadge: boolean;
  teamRepository: TeamRepository;
  userRepository: UserRepository;
};

export const ConversationSidebar = ({
  isOpen,
  toggleOpen,
  isScreenLessThanMdBreakpoint,
  selfUser,
  conversationState,
  isTeam,
  changeTab,
  currentTab,
  groupConversations,
  directConversations,
  unreadConversations,
  favoriteConversations,
  archivedConversations,
  conversationRepository,
  onClickPreferences,
  showNotificationsBadge,
  teamRepository,
  userRepository,
}: ConversationSidebarProps) => {
  return (
    <nav className="conversations-sidebar" css={conversationsSidebarStyles(isScreenLessThanMdBreakpoint)}>
      <FadingScrollbar className="conversations-sidebar-items" data-is-collapsed={!isOpen}>
        <UserDetails
          user={selfUser}
          groupId={conversationState.selfMLSConversation()?.groupId}
          isTeam={isTeam}
          isSideBarOpen={isOpen}
        />

        <ConversationTabs
          onChangeTab={changeTab}
          currentTab={currentTab}
          groupConversations={groupConversations}
          directConversations={directConversations}
          unreadConversations={unreadConversations}
          favoriteConversations={favoriteConversations}
          archivedConversations={archivedConversations}
          conversationRepository={conversationRepository}
          onClickPreferences={onClickPreferences}
          showNotificationsBadge={showNotificationsBadge}
          selfUser={selfUser}
          userRepository={userRepository}
          teamRepository={teamRepository}
        />
      </FadingScrollbar>

      <IconButton
        css={conversationsSidebarHandleStyles(isOpen)}
        className="conversations-sidebar-handle"
        onClick={toggleOpen}
      >
        <ChevronIcon css={conversationsSidebarHandleIconStyles} />
      </IconButton>
    </nav>
  );
};
