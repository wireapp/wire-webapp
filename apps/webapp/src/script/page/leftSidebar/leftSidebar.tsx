/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useEffect} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';

import {useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {User} from 'Repositories/entity/User';
import {conversationListCollapseFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {Conversations} from './panels/conversations';
import {ConversationListStatus, isConversationListTab, useSidebarStore} from './panels/conversations/useSidebarStore';
import {TemporaryGuestConversations} from './panels/temporatyGuestConversations';

import {ListViewModel} from '../../view_model/ListViewModel';
import {useAppState, ListState} from '../useAppState';

type LeftSidebarProps = {
  listViewModel: ListViewModel;
  selfUser: User;
  isActivatedAccount: boolean;
};

export const LeftSidebar = ({listViewModel, selfUser, isActivatedAccount}: LeftSidebarProps) => {
  const {conversationRepository, propertiesRepository} = listViewModel;
  const repositories = listViewModel.contentViewModel.repositories;

  const listState = useAppState(state => state.listState);
  const isScreenLessThanMdBreakpoint = useMatchMedia('(max-width: 1000px)');
  const {isFeatureToggleEnabled} = useApplicationContext();
  const isConversationListCollapseEnabled = isFeatureToggleEnabled(conversationListCollapseFeatureToggleName);
  const {currentTab, conversationListStatus} = useSidebarStore();
  const isConversationListCollapsed =
    isConversationListCollapseEnabled &&
    conversationListStatus === ConversationListStatus.CLOSED &&
    isConversationListTab(currentTab) &&
    !isScreenLessThanMdBreakpoint;

  useEffect(() => {
    function openCreateGroupModal() {
      amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details');
    }

    amplify.subscribe(WebAppEvents.SHORTCUT.START, openCreateGroupModal);

    return () => {
      amplify.unsubscribe(WebAppEvents.SHORTCUT.START, openCreateGroupModal);
    };
  }, []);

  return (
    <aside
      id="left-column"
      className={cx('left-column', {
        'left-column--light-theme': !isActivatedAccount,
        'left-column--shrinked': [ListState.CELLS, ListState.MEETINGS].includes(listState),
        'left-column--conversation-list-collapsed': isConversationListCollapsed,
      })}
    >
      {[
        ListState.CONVERSATIONS,
        ListState.START_UI,
        ListState.PREFERENCES,
        ListState.ARCHIVE,
        ListState.CELLS,
        ListState.MEETINGS,
      ].includes(listState) && (
        <Conversations
          isConversationListCollapseEnabled={isConversationListCollapseEnabled}
          selfUser={selfUser}
          listViewModel={listViewModel}
          searchRepository={repositories.search}
          teamRepository={repositories.team}
          integrationRepository={repositories.integration}
          userRepository={repositories.user}
          propertiesRepository={propertiesRepository}
          conversationRepository={conversationRepository}
          preferenceNotificationRepository={repositories.preferenceNotification}
        />
      )}

      {listState === ListState.TEMPORARY_GUEST && (
        <TemporaryGuestConversations
          callingViewModel={listViewModel.callingViewModel}
          listViewModel={listViewModel}
          selfUser={selfUser}
        />
      )}
    </aside>
  );
};
