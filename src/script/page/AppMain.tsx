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

import {FC, useEffect, useLayoutEffect} from 'react';

import {StyledApp, THEME_ID, useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {CallingContainer} from 'Components/calling/CallingOverlayContainer';
import {GroupCreationModal} from 'Components/Modals/GroupCreation/GroupCreationModal';
import {LegalHoldModal} from 'Components/Modals/LegalHoldModal/LegalHoldModal';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {PrimaryModalComponent} from 'Components/Modals/PrimaryModal/PrimaryModal';
import {showUserModal, UserModal} from 'Components/Modals/UserModal';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {AppLock} from './AppLock';
import {LeftSidebar} from './LeftSidebar';
import {MainContent} from './MainContent';
import {PanelEntity, PanelState, RightSidebar} from './RightSidebar';
import {RootProvider} from './RootProvider';
import {useAppMainState, ViewType} from './state';
import {useAppState, ContentState} from './useAppState';
import {useWindowTitle} from './useWindowTitle';

import {User} from '../entity/User';
import {App} from '../main/app';
import {
  ClientNotificationData,
  Notification,
  PreferenceNotificationRepository,
} from '../notification/PreferenceNotificationRepository';
import {Router} from '../router/Router';
import {initializeRouter} from '../router/routerBindings';
import {TeamState} from '../team/TeamState';
import {showInitialModal} from '../user/AvailabilityModal';
import {UserState} from '../user/UserState';
import {MainViewModel} from '../view_model/MainViewModel';
import {WarningsContainer} from '../view_model/WarningsContainer/WarningsContainer';

export type RightSidebarParams = {
  entity: PanelEntity | null;
  showLikes?: boolean;
  highlighted?: User[];
};

interface AppMainProps {
  app: App;
  selfUser: User;
  mainView: MainViewModel;
}

const AppMain: FC<AppMainProps> = ({app, mainView, selfUser}) => {
  const apiContext = app.getAPIContext();

  if (!apiContext) {
    throw new Error('API Context has not been set');
  }

  const {contentState} = useAppState();

  const {repository: repositories} = app;

  const {accent_id, availability: userAvailability} = useKoSubscribableChildren(selfUser, [
    'accent_id',
    'availability',
  ]);

  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);

  useWindowTitle();
  const {isActivatedAccount} = useKoSubscribableChildren(userState, ['isActivatedAccount']);

  const {history, entity: currentEntity, clearHistory, goTo} = useAppMainState(state => state.rightSidebar);
  const currentState = history.at(-1);

  const toggleRightSidebar = (panelState: PanelState, params: RightSidebarParams, compareEntityId = false) => {
    const isDifferentState = currentState !== panelState;
    const isDifferentId = compareEntityId && currentEntity?.id !== params?.entity?.id;

    if (isDifferentId || isDifferentState) {
      goTo(panelState, params);

      return;
    }

    clearHistory();
  };

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia('max-width: 620px');

  const {currentView} = useAppMainState(state => state.responsiveView);
  const isLeftSidebarVisible = currentView == ViewType.LEFT_SIDEBAR;

  const initializeApp = () => {
    repositories.notification.setContentViewModelStates(contentState, mainView.multitasking);

    const conversationEntity = repositories.conversation.getMostRecentConversation();

    if (repositories.user['userState'].isTemporaryGuest()) {
      mainView.list.showTemporaryGuest();
    } else if (conversationEntity) {
      mainView.content.showConversation(conversationEntity, {});
    } else if (repositories.user['userState'].connectRequests().length) {
      amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.CONNECTION_REQUESTS);
    }

    const redirect = localStorage.getItem(App.LOCAL_STORAGE_LOGIN_REDIRECT_KEY);

    if (redirect) {
      localStorage.removeItem(App.LOCAL_STORAGE_LOGIN_REDIRECT_KEY);
      window.location.replace(redirect);
    }

    const conversationRedirect = localStorage.getItem(App.LOCAL_STORAGE_LOGIN_CONVERSATION_KEY);

    if (conversationRedirect) {
      const {conversation, domain} = JSON.parse(conversationRedirect)?.data;
      localStorage.removeItem(App.LOCAL_STORAGE_LOGIN_CONVERSATION_KEY);
      window.location.replace(`#/conversation/${conversation}${domain ? `/${domain}` : ''}`);
    }

    const router = new Router({
      '/conversation/:conversationId(/:domain)': (conversationId: string, domain: string = apiContext.domain ?? '') =>
        mainView.content.showConversation(conversationId, {}, domain),
      '/preferences/about': () => mainView.list.openPreferencesAbout(),
      '/preferences/account': () => mainView.list.openPreferencesAccount(),
      '/preferences/av': () => mainView.list.openPreferencesAudioVideo(),
      '/preferences/devices': () => mainView.list.openPreferencesDevices(),
      '/preferences/options': () => mainView.list.openPreferencesOptions(),
      '/user/:userId(/:domain)': (userId: string, domain: string = apiContext.domain ?? '') => {
        showUserModal({domain, id: userId}, () => router.navigate('/'));
      },
    });

    initializeRouter(router);
    container.registerInstance(Router, router);

    repositories.properties.checkPrivacyPermission().then(() => {
      window.setTimeout(() => repositories.notification.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);
    });
  };

  const popNotification = () => {
    const showNotification = (type: string, aggregatedNotifications: Notification[]) => {
      switch (type) {
        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
          PrimaryModal.show(
            PrimaryModal.type.ACCOUNT_NEW_DEVICES,
            {
              data: aggregatedNotifications.map(notification => notification.data) as ClientNotificationData[],
              preventClose: true,
              secondaryAction: {
                action: () => {
                  amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.PREFERENCES_DEVICES);
                },
              },
            },
            undefined,
          );
          break;
        }

        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED: {
          PrimaryModal.show(
            PrimaryModal.type.ACCOUNT_READ_RECEIPTS_CHANGED,
            {
              data: aggregatedNotifications.pop()?.data as boolean,
              preventClose: true,
            },
            undefined,
          );
          break;
        }
      }
    };

    repositories.preferenceNotification
      .getNotifications()
      .forEach(({type, notification}) => showNotification(type, notification));
  };

  useEffect(() => {
    PrimaryModal.init();
    showInitialModal(userAvailability);
    // userAvailability not needed for dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (contentState === ContentState.PREFERENCES_ACCOUNT) {
      popNotification();
    }
  }, [contentState]);

  return (
    <div id="wire-main" className={`main-accent-color-${accent_id} show`}>
      <StyledApp themeId={THEME_ID.DEFAULT} css={{backgroundColor: 'unset', height: '100%'}}>
        <RootProvider value={mainView}>
          <main>
            <div id="app" className="app">
              {(!smBreakpoint || isLeftSidebarVisible) && (
                <LeftSidebar
                  listViewModel={mainView.list}
                  selfUser={selfUser}
                  isActivatedAccount={isActivatedAccount}
                />
              )}

              {(!smBreakpoint || !isLeftSidebarVisible) && (
                <MainContent isRightSidebarOpen={!!currentState} openRightSidebar={toggleRightSidebar} />
              )}

              {currentState && (
                <RightSidebar
                  currentEntity={currentEntity}
                  repositories={repositories}
                  actionsViewModel={mainView.actions}
                  isFederated={mainView.isFederated}
                  teamState={teamState}
                  userState={userState}
                />
              )}
            </div>

            <AppLock clientRepository={repositories.client} />
            <WarningsContainer />

            <CallingContainer
              multitasking={mainView.multitasking}
              callingRepository={repositories.calling}
              mediaRepository={repositories.media}
            />

            <LegalHoldModal
              userState={userState}
              conversationRepository={repositories.conversation}
              searchRepository={repositories.search}
              teamRepository={repositories.team}
              clientRepository={repositories.client}
              messageRepository={repositories.message}
              cryptographyRepository={repositories.cryptography}
            />

            {/*The order of these elements matter to show proper modals stack upon each other*/}
            <UserModal userRepository={repositories.user} />
            <PrimaryModalComponent />
            <GroupCreationModal userState={userState} teamState={teamState} />
          </main>
        </RootProvider>
      </StyledApp>
    </div>
  );
};

// registerReactComponent('app-container', AppMain);

export {AppMain};
