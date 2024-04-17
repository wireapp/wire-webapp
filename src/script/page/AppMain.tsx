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

import {amplify} from 'amplify';
import {ErrorBoundary} from 'react-error-boundary';
import {container} from 'tsyringe';

import {StyledApp, THEME_ID, useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {CallingCell} from 'Components/calling/CallingCell';
import {CallingContainer} from 'Components/calling/CallingOverlayContainer';
import {ErrorFallback} from 'Components/ErrorFallback';
import {GroupCreationModal} from 'Components/Modals/GroupCreation/GroupCreationModal';
import {LegalHoldModal} from 'Components/Modals/LegalHoldModal/LegalHoldModal';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showUserModal, UserModal} from 'Components/Modals/UserModal';
import {WindowPopup} from 'Components/WindowPopup/WindowPopup';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {AppLock} from './AppLock';
import {useE2EIFeatureConfigUpdate} from './components/FeatureConfigChange/FeatureConfigChangeHandler/Features/useE2EIFeatureConfigUpdate';
import {FeatureConfigChangeNotifier} from './components/FeatureConfigChange/FeatureConfigChangeNotifier';
import {WindowTitleUpdater} from './components/WindowTitleUpdater';
import {LeftSidebar} from './LeftSidebar';
import {MainContent} from './MainContent';
import {PanelEntity, PanelState, RightSidebar} from './RightSidebar';
import {RootProvider} from './RootProvider';
import {useAppMainState, ViewType} from './state';
import {useAppState, ContentState} from './useAppState';

import {CallingViewMode, CallState} from '../calling/CallState';
import {ConversationState} from '../conversation/ConversationState';
import {User} from '../entity/User';
import {useInitializeRootFontSize} from '../hooks/useRootFontSize';
import {App} from '../main/app';
import {initialiseMLSMigrationFlow} from '../mls/MLSMigration';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';
import {generateConversationUrl} from '../router/routeGenerator';
import {configureRoutes, navigate} from '../router/Router';
import {TeamState} from '../team/TeamState';
import {showInitialModal} from '../user/AvailabilityModal';
import {UserState} from '../user/UserState';
import {MainViewModel} from '../view_model/MainViewModel';
import {WarningsContainer} from '../view_model/WarningsContainer/WarningsContainer';

export type RightSidebarParams = {
  entity: PanelEntity | null;
  showReactions?: boolean;
  highlighted?: User[];
};

interface AppMainProps {
  app: App;
  selfUser: User;
  mainView: MainViewModel;
  conversationState?: ConversationState;
  /** will block the user from being able to interact with the application (no notifications and no messages will be shown) */
  locked: boolean;
}

export const AppMain: FC<AppMainProps> = ({
  app,
  mainView,
  selfUser,
  conversationState = container.resolve(ConversationState),
  locked,
}) => {
  const apiContext = app.getAPIContext();

  useInitializeRootFontSize();

  if (!apiContext) {
    throw new Error('API Context has not been set');
  }

  const {repository: repositories} = app;

  const {availability: userAvailability, isActivatedAccount} = useKoSubscribableChildren(selfUser, [
    'availability',
    'isActivatedAccount',
  ]);

  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);
  const callState = container.resolve(CallState);

  const {
    history,
    entity: currentEntity,
    close: closeRightSidebar,
    lastViewedMessageDetailsEntity,
    goTo,
  } = useAppMainState(state => state.rightSidebar);
  const currentState = history[history.length - 1];

  const toggleRightSidebar = (panelState: PanelState, params: RightSidebarParams, compareEntityId = false) => {
    const isDifferentState = currentState !== panelState;
    const isDifferentId = compareEntityId && currentEntity?.id !== params?.entity?.id;

    if (isDifferentId || isDifferentState) {
      goTo(panelState, params);
    } else {
      closeRightSidebar();
    }
  };

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia('max-width: 640px');

  const {currentView} = useAppMainState(state => state.responsiveView);
  const isLeftSidebarVisible = currentView == ViewType.LEFT_SIDEBAR;

  const initializeApp = async () => {
    const showMostRecentConversation = () => {
      const isShowingConversation = useAppState.getState().isShowingConversation();
      if (!isShowingConversation) {
        return;
      }

      const activeConversation = conversationState.activeConversation();

      if (selfUser.isTemporaryGuest()) {
        return mainView.list.showTemporaryGuest();
      }
      if (activeConversation) {
        // There is already an active conversation, keeping state as is
        return;
      }
      const mostRecentConversation = conversationState.getMostRecentConversation();
      if (mostRecentConversation) {
        navigate(generateConversationUrl(mostRecentConversation.qualifiedId));
      } else if (repositories.user['userState'].connectRequests().length) {
        amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.CONNECTION_REQUESTS);
      }
    };

    // on app load reset last message focus to ensure last message is focused
    // only when user enters a new conversation using keyboard(press enter)
    const historyState = window.history.state;
    if (historyState && !!historyState.eventKey) {
      historyState.eventKey = '';
      window.history.replaceState(historyState, '', window.location.hash);
    }

    configureRoutes({
      '/': showMostRecentConversation,
      '/conversation/:conversationId(/:domain)': (conversationId: string, domain: string = apiContext.domain ?? '') =>
        mainView.content.showConversation({id: conversationId, domain}, {}),
      '/preferences/about': () => mainView.list.openPreferencesAbout(),
      '/preferences/account': () => mainView.list.openPreferencesAccount(),
      '/preferences/av': () => mainView.list.openPreferencesAudioVideo(),
      '/preferences/devices': () => mainView.list.openPreferencesDevices(),
      '/preferences/options': () => mainView.list.openPreferencesOptions(),
      '/user/:userId(/:domain)': (userId: string, domain: string = apiContext.domain ?? '') => {
        showMostRecentConversation();
        showUserModal({domain, id: userId}, () => navigate('/'));
      },
    });

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

    repositories.properties.checkPrivacyPermission().then(() => {
      window.setTimeout(() => repositories.notification.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);
    });

    //after app is loaded, check mls migration configuration and start migration if needed
    await initialiseMLSMigrationFlow({
      selfUser,
      conversationHandler: repositories.conversation,
      getTeamMLSMigrationStatus: repositories.team.getTeamMLSMigrationStatus,
      refreshAllKnownUsers: repositories.user.refreshAllKnownUsers,
    });
  };

  useEffect(() => {
    PrimaryModal.init();
    showInitialModal(userAvailability);
    // userAvailability not needed for dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!locked) {
      initializeApp();
    }
  }, [locked]);

  useE2EIFeatureConfigUpdate(repositories.team);

  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {joinedCall: activeCall, viewMode} = useKoSubscribableChildren(callState, ['joinedCall', 'viewMode']);
  const isPopOutView = viewMode === CallingViewMode.POPOUT;

  const onPopOutClose = () => {
    callState.viewMode(CallingViewMode.MINIMIZED);
  };

  return (
    <StyledApp
      themeId={THEME_ID.DEFAULT}
      css={{backgroundColor: 'unset', height: '100%'}}
      id="wire-main"
      data-uie-name="status-webapp"
      data-uie-value="is-loaded"
    >
      {!locked && <WindowTitleUpdater />}
      <RootProvider value={mainView}>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          {!locked && (
            <div id="app" className="app">
              {(!smBreakpoint || isLeftSidebarVisible) && (
                <LeftSidebar
                  listViewModel={mainView.list}
                  selfUser={selfUser}
                  isActivatedAccount={isActivatedAccount}
                />
              )}

              {(!smBreakpoint || !isLeftSidebarVisible) && (
                <MainContent
                  selfUser={selfUser}
                  isRightSidebarOpen={!!currentState}
                  openRightSidebar={toggleRightSidebar}
                  reloadApp={app.refresh}
                />
              )}

              {currentState && (
                <RightSidebar
                  lastViewedMessageDetailsEntity={lastViewedMessageDetailsEntity}
                  currentEntity={currentEntity}
                  repositories={repositories}
                  actionsViewModel={mainView.actions}
                  isFederated={mainView.isFederated}
                  teamState={teamState}
                  selfUser={selfUser}
                  userState={userState}
                />
              )}
            </div>
          )}

          <AppLock clientRepository={repositories.client} />
          <WarningsContainer onRefresh={app.refresh} />

          {activeCall && isPopOutView && (
            <WindowPopup onClose={onPopOutClose}>
              <CallingCell
                classifiedDomains={classifiedDomains}
                call={activeCall}
                callActions={mainView.calling.callActions}
                callingRepository={repositories.calling}
                pushToTalkKey={repositories.properties.getPreference(PROPERTIES_TYPE.CALL.PUSH_TO_TALK_KEY)}
                isFullUi
                hasAccessToCamera={mainView.calling.hasAccessToCamera()}
                isSelfVerified={selfUser.is_verified()}
              />
            </WindowPopup>
          )}

          {!locked && (
            <>
              <FeatureConfigChangeNotifier selfUserId={selfUser.id} teamState={teamState} />
              <CallingContainer
                callingRepository={repositories.calling}
                mediaRepository={repositories.media}
                toggleScreenshare={mainView.calling.callActions.toggleScreenshare}
              />

              <LegalHoldModal
                selfUser={selfUser}
                conversationRepository={repositories.conversation}
                searchRepository={repositories.search}
                teamRepository={repositories.team}
                clientRepository={repositories.client}
                messageRepository={repositories.message}
                cryptographyRepository={repositories.cryptography}
              />
            </>
          )}

          {/*The order of these elements matter to show proper modals stack upon each other*/}
          <UserModal selfUser={selfUser} userRepository={repositories.user} />
          <GroupCreationModal userState={userState} teamState={teamState} />
        </ErrorBoundary>
      </RootProvider>
    </StyledApp>
  );
};
