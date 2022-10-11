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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import cx from 'classnames';
import React, {useEffect} from 'react';
import {CSSTransition, SwitchTransition} from 'react-transition-group';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {ListViewModel, ListState} from '../../view_model/ListViewModel';
import {User} from '../../entity/User';
import Preferences from './panels/Preferences';
import Archive from './panels/Archive';
import Conversations from './panels/Conversations';
import TemporaryGuestConversations from './panels/TemporatyGuestConversations';
import StartUI from './panels/StartUI';

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

  const {state} = useKoSubscribableChildren(listViewModel, ['state']);

  const switchList = (list: ListState) => {
    // forceCloseRightPanel();
    listViewModel.switchList(list);
  };

  const goHome = () =>
    selfUser.isTemporaryGuest()
      ? listViewModel.switchList(ListViewModel.STATE.TEMPORARY_GUEST)
      : listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.SHORTCUT.START, () => {
      listViewModel.switchList(ListViewModel.STATE.START_UI);
    });
  }, []);

  return (
    <div id="left-column" className={cx('left-column', {'left-column--light-theme': !isActivatedAccount})}>
      <header>
        <h1 className="visually-hidden">{t('accessibility.headings.sidebar')}</h1>
      </header>

      <SwitchTransition>
        <Animated key={state}>
          <>
            {state === ListState.CONVERSATIONS && (
              <Conversations
                listViewModel={listViewModel}
                preferenceNotificationRepository={repositories.preferenceNotification}
                conversationRepository={conversationRepository}
                propertiesRepository={propertiesRepository}
                switchList={switchList}
                selfUser={selfUser}
              />
            )}

            {state === ListState.PREFERENCES && (
              <Preferences
                contentViewModel={listViewModel.contentViewModel}
                teamRepository={repositories.team}
                onClose={goHome}
              />
            )}

            {state === ListState.ARCHIVE && (
              <Archive
                answerCall={listViewModel.answerCall}
                conversationRepository={conversationRepository}
                listViewModel={listViewModel}
                onClose={goHome}
              />
            )}

            {state === ListState.TEMPORARY_GUEST && (
              <TemporaryGuestConversations
                callingViewModel={listViewModel.callingViewModel}
                listViewModel={listViewModel}
                selfUser={selfUser}
              />
            )}

            {state === ListState.START_UI && (
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
    </div>
  );
};

export default LeftSidebar;
