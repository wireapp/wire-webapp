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

import {t} from 'Util/LocalizerUtil';

import {Archive} from './panels/Archive';
import {Conversations} from './panels/Conversations';
import {Preferences} from './panels/Preferences';
import {StartUI} from './panels/StartUI';
import {TemporaryGuestConversations} from './panels/TemporatyGuestConversations';

import {Conversation} from '../../entity/Conversation';
import {User} from '../../entity/User';
import {ActionsViewModel} from '../../view_model/ActionsViewModel';
import {CallingViewModel} from '../../view_model/CallingViewModel';
import {ViewModelRepositories} from '../../view_model/MainViewModel';
import {ShowConversationOptions} from '../AppMain';
import {useAppState, ListState, ContentState} from '../useAppState';

type LeftSidebarProps = {
  actionsView: ActionsViewModel;
  answerCall: (conversation: Conversation) => void;
  callView: CallingViewModel;
  selfUser: User;
  isActivatedAccount: boolean;
  openPreferencesAccount: () => void;
  showConversation: (
    conversation: Conversation | string,
    options?: ShowConversationOptions,
    domain?: string | null,
  ) => void;
  switchContent: (contentState: ContentState) => void;
  switchList: (listState: ListState) => void;
  repositories: ViewModelRepositories;
  openContextMenu: (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => void;
  isFederated: boolean;
};

const Animated: React.FC<{children: React.ReactNode}> = ({children, ...rest}) => {
  return (
    <CSSTransition classNames="fade-in-out" timeout={{enter: 700, exit: 300}} {...rest}>
      {children}
    </CSSTransition>
  );
};

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  actionsView,
  answerCall,
  openPreferencesAccount,
  callView,
  openContextMenu,
  selfUser,
  isActivatedAccount,
  showConversation,
  switchContent,
  switchList,
  repositories,
  isFederated,
}) => {
  const {listState} = useAppState();

  const {conversation: conversationRepository, properties: propertiesRepository} = repositories;

  const goHome = () =>
    selfUser.isTemporaryGuest() ? switchList(ListState.TEMPORARY_GUEST) : switchList(ListState.CONVERSATIONS);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.SHORTCUT.START, () => {
      switchList(ListState.START_UI);
    });
  }, []);

  return (
    <div id="left-column" className={cx('left-column', {'left-column--light-theme': !isActivatedAccount})}>
      <header>
        <h1 className="visually-hidden">{t('accessibility.headings.sidebar')}</h1>
      </header>

      <SwitchTransition>
        <Animated key={listState}>
          <>
            {listState === ListState.CONVERSATIONS && (
              <Conversations
                answerCall={answerCall}
                callView={callView}
                preferenceNotificationRepository={repositories.preferenceNotification}
                conversationRepository={conversationRepository}
                propertiesRepository={propertiesRepository}
                switchList={switchList}
                openContextMenu={openContextMenu}
                switchContent={switchContent}
                selfUser={selfUser}
                showConversation={showConversation}
              />
            )}

            {listState === ListState.PREFERENCES && (
              <Preferences teamRepository={repositories.team} onClose={goHome} switchContent={switchContent} />
            )}

            {listState === ListState.ARCHIVE && (
              <Archive
                answerCall={answerCall}
                openContextMenu={openContextMenu}
                conversationRepository={conversationRepository}
                onClose={goHome}
                showConversation={showConversation}
              />
            )}

            {listState === ListState.TEMPORARY_GUEST && (
              <TemporaryGuestConversations
                openPreferencesAccount={openPreferencesAccount}
                callingViewModel={callView}
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
                actionsView={actionsView}
                userRepository={repositories.user}
                isFederated={isFederated}
                showConversation={showConversation}
              />
            )}
          </>
        </Animated>
      </SwitchTransition>
    </div>
  );
};

export {LeftSidebar};
