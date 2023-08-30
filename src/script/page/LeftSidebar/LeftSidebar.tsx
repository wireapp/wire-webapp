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

import React, {useEffect} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {CSSTransition, SwitchTransition} from 'react-transition-group';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Archive} from './panels/Archive';
import {Conversations} from './panels/Conversations';
import {Preferences} from './panels/Preferences';
import {StartUI} from './panels/StartUI';
import {TemporaryGuestConversations} from './panels/TemporatyGuestConversations';

import {User} from '../../entity/User';
import {ListViewModel} from '../../view_model/ListViewModel';
import {useAppState, ListState} from '../useAppState';

type LeftSidebarProps = {
  listViewModel: ListViewModel;
  selfUser: User;
  isActivatedAccount: boolean;
};
const Animated: React.FC<{children: React.ReactNode}> = ({children, ...rest}) => {
  return (
    <CSSTransition classNames="fade-in-out" timeout={{enter: 700, exit: 300}} {...rest}>
      {children}
    </CSSTransition>
  );
};

const LeftSidebar: React.FC<LeftSidebarProps> = ({listViewModel, selfUser, isActivatedAccount}) => {
  const {conversationRepository, propertiesRepository} = listViewModel;
  const repositories = listViewModel.contentViewModel.repositories;
  const listState = useAppState(state => state.listState);

  const switchList = (list: ListState) => listViewModel.switchList(list);

  const goHome = () =>
    selfUser.isTemporaryGuest()
      ? listViewModel.switchList(ListState.TEMPORARY_GUEST)
      : listViewModel.switchList(ListState.CONVERSATIONS);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.SHORTCUT.START, () => {
      listViewModel.switchList(ListState.START_UI);
    });
  }, []);

  return (
    <aside id="left-column" className={cx('left-column', {'left-column--light-theme': !isActivatedAccount})}>
      <SwitchTransition>
        <Animated key={listState}>
          <>
            {listState === ListState.CONVERSATIONS && (
              <Conversations
                listViewModel={listViewModel}
                preferenceNotificationRepository={repositories.preferenceNotification}
                conversationRepository={conversationRepository}
                propertiesRepository={propertiesRepository}
                switchList={switchList}
                selfUser={selfUser}
              />
            )}

            {listState === ListState.PREFERENCES && (
              <Preferences
                contentViewModel={listViewModel.contentViewModel}
                teamRepository={repositories.team}
                preferenceNotificationRepository={repositories.preferenceNotification}
                onClose={goHome}
              />
            )}

            {listState === ListState.ARCHIVE && (
              <Archive
                answerCall={listViewModel.answerCall}
                conversationRepository={conversationRepository}
                listViewModel={listViewModel}
                onClose={goHome}
              />
            )}

            {listState === ListState.TEMPORARY_GUEST && (
              <TemporaryGuestConversations
                callingViewModel={listViewModel.callingViewModel}
                listViewModel={listViewModel}
                selfUser={selfUser}
              />
            )}

            {listState === ListState.START_UI && (
              <StartUI
                onClose={goHome}
                conversationRepository={conversationRepository}
                searchRepository={repositories.search}
                teamRepository={repositories.team}
                integrationRepository={repositories.integration}
                mainViewModel={listViewModel.mainViewModel}
                userRepository={repositories.user}
                isFederated={listViewModel.isFederated}
              />
            )}
          </>
        </Animated>
      </SwitchTransition>
    </aside>
  );
};

export {LeftSidebar};
