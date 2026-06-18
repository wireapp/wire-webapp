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

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';
import {amplify} from 'amplify';
import cx from 'classnames';
import ky from 'ky';
import {ErrorBoundary} from 'react-error-boundary';
import {container} from 'tsyringe';

import {FireAndForgetInvoker} from '@wireapp/core';
import {Mention} from '@wireapp/protocol-messaging';
import {QUERY, StyledApp, THEME_ID, useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {CallingContainer} from 'Components/calling/CallingOverlayContainer';
import {ChooseScreen} from 'Components/calling/ChooseScreen';
import {ConfigToolbar} from 'Components/ConfigToolbar/ConfigToolbar';
import {ErrorFallback} from 'Components/ErrorFallback';
import {CreateConversationModal} from 'Components/Modals/CreateConversation/CreateConversaionModal';
import {FileHistoryModal} from 'Components/Modals/FileHistoryModal/FileHistoryModal';
import {GroupCreationModal} from 'Components/Modals/GroupCreation/GroupCreationModal';
import {LegalHoldModal} from 'Components/Modals/LegalHoldModal/LegalHoldModal';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showUserModal, UserModal} from 'Components/Modals/UserModal';
import {useActiveWindow} from 'Hooks/useActiveWindow';
import {useInitializeRootFontSize} from 'Hooks/useRootFontSize';
import {CallingViewMode, CallState, DesktopScreenShareMenu} from 'Repositories/calling/CallState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {showInitialModal} from 'Repositories/user/availabilityModal';
import {UserState} from 'Repositories/user/userState';
import {isUUID} from 'src/script/auth/util/stringUtil';
import {Config} from 'src/script/Config';
import {base64ToArray} from 'src/script/util/util';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {AppLock} from './AppLock';
import {useE2EIFeatureConfigUpdate} from './components/FeatureConfigChange/FeatureConfigChangeHandler/Features/useE2EIFeatureConfigUpdate';
import {FeatureConfigChangeNotifier} from './components/FeatureConfigChange/FeatureConfigChangeNotifier';
import {ForceReloadModal} from './components/ForceReloadModal/ForceReloadModal';
import {WindowTitleUpdater} from './components/WindowTitleUpdater';
import {LeftSidebar} from './LeftSidebar';
import {TeamCreationModalContainer} from './LeftSidebar/panels/Conversations/ConversationTabs/TeamCreation/TeamCreationModalContainer';
import {SidebarTabs, useSidebarStore} from './LeftSidebar/panels/Conversations/useSidebarStore';
import {MainContent} from './MainContent';
import {PanelEntity, PanelState, RightSidebar} from './RightSidebar';
import {RootProvider} from './RootProvider';
import {useAppMainState, ViewType} from './state';
import {ContentState, useAppState} from './useAppState';

import {
  isThreadTrackedForSelf,
  useThreadUnreadRepliesStore,
} from '../components/MessagesList/threading/threadUnreadRepliesStore';
import {useThreadIndexStore} from '../components/MessagesList/threading/threadIndexStore';
import {runClientVersionCheck} from '../application-periodic-checks/runClientVersionCheck';
import {startApplicationPeriodicChecks} from '../application-periodic-checks/startApplicationPeriodicChecks';
import {WallClock} from '../clock/wallClock';
import {meetingsFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import {StartupFeatureToggleName} from '../featureToggles/startupFeatureToggles';
import {App} from '../main/app';
import {initialiseMLSMigrationFlow} from '../mls/MLSMigration';
import {ClientEvent} from '../repositories/event/Client';
import {generateConversationUrl} from '../router/routeGenerator';
import {configureRoutes, navigate} from '../router/Router';
import {TIME_IN_MILLIS} from '../util/timeUtil';
import {MainViewModel} from '../view_model/MainViewModel';
import {WarningsContainer} from '../view_model/WarningsContainer/WarningsContainer';

export type RightSidebarParams = {
  entity: PanelEntity | null;
  showReactions?: boolean;
  highlighted?: User[];
};

type AppMainProps = {
  readonly app: App;
  readonly fireAndForgetInvoker: FireAndForgetInvoker;
  readonly isFeatureToggleEnabled: (featureName: StartupFeatureToggleName) => boolean;
  readonly selfUser: User;
  readonly mainView: MainViewModel;
  readonly conversationState?: ConversationState;
  readonly callState?: CallState;
  readonly wallClock: WallClock;
  /** will block the user from being able to interact with the application (no notifications and no messages will be shown) */
  readonly locked: boolean;
};

export const AppMain = (properties: AppMainProps) => {
  const {
    app,
    fireAndForgetInvoker,
    isFeatureToggleEnabled,
    mainView,
    selfUser,
    conversationState = container.resolve(ConversationState),
    callState = container.resolve(CallState),
    wallClock,
    locked,
  } = properties;
  const [doesApplicationNeedForceReload, setDoesApplicationNeedForceReload] = useState(false);
  const clientVersion = Config.getConfig().VERSION;
  const runApplicationPeriodicCheck: () => void = useCallback(() => {
    void runClientVersionCheck({ky, clientVersion, setDoesApplicationNeedForceReload});
  }, [clientVersion]);
  const apiContext = app.getAPIContext();

  useEffect(() => {
    return startApplicationPeriodicChecks({
      wallClock,
      periodicChecksIntervalDelayInMilliseconds: TIME_IN_MILLIS.MINUTE * 5,
      runPeriodicCheck: runApplicationPeriodicCheck,
    });
  }, [wallClock, runApplicationPeriodicCheck]);

  useActiveWindow(window);

  useInitializeRootFontSize();

  if (!apiContext) {
    throw new Error('API Context has not been set');
  }

  const {repository: repositories} = app;

  const {availability: userAvailability, isActivatedAccount} = useKoSubscribableChildren(selfUser, [
    'availability',
    'isActivatedAccount',
  ]);
  const {visibleConversations} = useKoSubscribableChildren(conversationState, ['visibleConversations']);

  const {hasAvailableScreensToShare, desktopScreenShareMenu, viewMode} = useKoSubscribableChildren(callState, [
    'hasAvailableScreensToShare',
    'desktopScreenShareMenu',
    'viewMode',
  ]);

  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);
  const hasHydratedThreadIndexRef = useRef(false);

  const isScreenshareActive =
    hasAvailableScreensToShare && desktopScreenShareMenu === DesktopScreenShareMenu.MAIN_WINDOW;

  const {
    history,
    entity: currentEntity,
    close: closeRightSidebar,
    lastViewedMessageDetailsEntity,
    goTo,
  } = useAppMainState(state => state.rightSidebar);
  const currentState = history[history.length - 1];

  const {currentTab} = useSidebarStore();

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
  const isMobileView = useMatchMedia(QUERY.tabletSMDown);
  const {currentView} = useAppMainState(state => state.responsiveView);
  const {isHidden: isLeftSidebarHidden} = useAppMainState(state => state.leftSidebar);

  const isMobileLeftSidebarView = currentView == ViewType.MOBILE_LEFT_SIDEBAR;
  const isMobileCentralColumnView = currentView == ViewType.MOBILE_CENTRAL_COLUMN;

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

    const showConversationMessages = (conversationId: string, domain = apiContext.domain ?? '') => {
      void mainView.content.showConversation({id: conversationId, domain});
    };

    const showConversationFiles = async (
      conversationId: string,
      domain = apiContext.domain ?? '',
      path: string | string[] = '',
    ) => {
      const pathString = Array.isArray(path) ? path.join('/') : path;

      await mainView.content.showConversation(
        {id: conversationId, domain},
        {filePath: `files${pathString ? `/${pathString}` : ''}`},
      );
    };

    const showUserProfile = (param1: string, param2?: string) => {
      // If param1 is a UUID, it's the userId, otherwise param2 must be the userId
      const userId = isUUID(param1) ? param1 : param2;
      const domain = isUUID(param1) ? param2 || apiContext.domain || '' : param1;

      if (!userId) {
        navigate('/');
        return;
      }

      showMostRecentConversation();
      showUserModal({domain, id: userId}, () => navigate('/'));
    };

    configureRoutes({
      '/': showMostRecentConversation,
      '/conversation/:conversationId/:domain': showConversationMessages,
      '/conversation/:conversationId': showConversationMessages,
      '/conversation/:conversationId/:domain/files': showConversationFiles,
      '/conversation/:conversationId/files': showConversationFiles,
      '/conversation/:conversationId/:domain/files/*path': showConversationFiles,
      '/conversation/:conversationId/files/*path': showConversationFiles,
      '/preferences/about': () => mainView.list.openPreferencesAbout(),
      '/preferences/account': () => mainView.list.openPreferencesAccount(),
      '/preferences/av': () => mainView.list.openPreferencesAudioVideo(),
      '/preferences/devices': () => mainView.list.openPreferencesDevices(),
      '/preferences/options': () => mainView.list.openPreferencesOptions(),
      '/meetings': () =>
        teamState.isMeetingsEnabled() && isFeatureToggleEnabled(meetingsFeatureToggleName)
          ? mainView.list.openMeetingsList()
          : navigate('/'),
      '/user/:userId/:domain': showUserProfile,
      '/user/:domain/:userId': showUserProfile,
      '/user/:userId': showUserProfile,
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

    repositories.properties.checkTelemetrySharingPermission();
    window.setTimeout(() => repositories.notification.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);

    //after app is loaded, check mls migration configuration and start migration if needed
    await initialiseMLSMigrationFlow({
      selfUser,
      conversationRepository: repositories.conversation,
      getTeamMLSMigrationStatus: repositories.team.getTeamMLSMigrationStatus,
      refreshAllKnownUsers: repositories.user.refreshAllKnownUsers,
    });
  };

  const normalizeThreadId = (threadId?: string | null) =>
    typeof threadId === 'string' && threadId.length ? threadId : null;

  const extractThreadPreview = (event?: {
    data?: {
      content?: string;
      text?: {content?: string};
    };
  }) => {
    const preview = event?.data?.text?.content ?? event?.data?.content;
    if (typeof preview !== 'string') {
      return undefined;
    }

    const normalizedPreview = preview.trim();
    return normalizedPreview.length > 0 ? normalizedPreview : undefined;
  };

  const isThreadReplyMessageEvent = (eventType?: string) => {
    if (!eventType) {
      return false;
    }

    return (
      eventType === ClientEvent.CONVERSATION.MESSAGE_ADD ||
      eventType === ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD ||
      eventType === CONVERSATION_EVENT.OTR_MESSAGE_ADD ||
      eventType === CONVERSATION_EVENT.MLS_MESSAGE_ADD
    );
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

  useEffect(() => {
    if (!visibleConversations.length) {
      return;
    }

    const accessibleConversationIds = visibleConversations.map(conversation => conversation.id);
    useThreadIndexStore.getState().pruneToConversationIds(accessibleConversationIds);
  }, [visibleConversations]);

  useEffect(() => {
    if (hasHydratedThreadIndexRef.current || !visibleConversations.length) {
      return;
    }

    hasHydratedThreadIndexRef.current = true;

    const hydrateThreadIndex = async () => {
      const HYDRATION_CONVERSATION_LIMIT = 100;
      const HYDRATION_WINDOW_IN_DAYS = 30;
      // POC safeguard to avoid unbounded local growth until cleanup policies are finalized.
      const THREAD_INDEX_MAX_ENTRIES = 2000;
      const fromDate = new Date(Date.now() - HYDRATION_WINDOW_IN_DAYS * 24 * 60 * 60 * 1000);
      const recentConversations = visibleConversations.slice(0, HYDRATION_CONVERSATION_LIMIT);
      const aggregatedThreads = new Map<
        string,
        {
          conversationId: string;
          threadId: string;
          lastReplyAt: string;
          lastReplyMessageId?: string;
          lastReplyAuthorId?: string;
          lastReplyPreview?: string;
          replyCount: number;
          hasReplyBySelf: boolean;
          participantUserIds: Set<string>;
          seenMessageIds: Set<string>;
        }
      >();

      await Promise.all(
        recentConversations.map(async conversation => {
          try {
            const events = (await repositories.event.eventService.loadFollowingEvents(
              conversation.id,
              fromDate,
              Number.MAX_SAFE_INTEGER,
              true,
              {includeThreadReplies: true},
            )) as Array<{
              conversation?: string;
              from?: string;
              id?: string;
              is_thread_reply?: boolean;
              thread_id?: string | null;
              thread_root_message_id?: string | null;
              time?: string;
              type?: string;
              data?: {
                content?: string;
                text?: {content?: string};
              };
            }>;

            events.forEach(event => {
              const conversationId = event?.conversation;
              const threadId = normalizeThreadId(event?.thread_id ?? event?.thread_root_message_id);

              if (!conversationId || !threadId || !event?.is_thread_reply || !isThreadReplyMessageEvent(event.type)) {
                return;
              }

              const key = `${conversationId}:${threadId}`;
              const current = aggregatedThreads.get(key) ?? {
                conversationId,
                threadId,
                lastReplyAt: new Date(0).toISOString(),
                replyCount: 0,
                hasReplyBySelf: false,
                participantUserIds: new Set<string>(),
                seenMessageIds: new Set<string>(),
              };

              if (event.id && current.seenMessageIds.has(event.id)) {
                return;
              }
              if (event.id) {
                current.seenMessageIds.add(event.id);
              }

              current.replyCount += 1;
              current.hasReplyBySelf = current.hasReplyBySelf || event.from === selfUser.id;
              if (event.from) {
                current.participantUserIds.add(event.from);
              }

              const eventTime = event.time ?? new Date().toISOString();
              if (new Date(eventTime).getTime() >= new Date(current.lastReplyAt).getTime()) {
                current.lastReplyAt = eventTime;
                current.lastReplyMessageId = event.id;
                current.lastReplyAuthorId = event.from;
                current.lastReplyPreview = extractThreadPreview(event);
              }

              aggregatedThreads.set(key, current);
            });
          } catch {
            // Keep partial hydration results if one conversation scan fails.
          }
        }),
      );

      const threadIndexStore = useThreadIndexStore.getState();
      await Promise.all(
        Array.from(aggregatedThreads.values()).map(async thread => {
          let isRootMessageBySelf = false;
          let rootMessagePreview: string | undefined;
          let rootMessageAuthorId: string | undefined;
          let rootMessageTimestamp: string | undefined;
          try {
            const rootEvent = await repositories.event.eventService.loadEvent(thread.conversationId, thread.threadId);
            isRootMessageBySelf = rootEvent?.from === selfUser.id;
            rootMessagePreview = extractThreadPreview(rootEvent);
            rootMessageAuthorId = rootEvent?.from;
            rootMessageTimestamp = rootEvent?.time;
            if (rootEvent?.from) {
              thread.participantUserIds.add(rootEvent.from);
            }
          } catch {
            // Keep best-effort hydration when root event cannot be resolved.
          }

          threadIndexStore.reconcileHydratedThread({
            conversationId: thread.conversationId,
            threadId: thread.threadId,
            rootMessagePreview,
            rootMessageAuthorId,
            rootMessageTimestamp,
            participantUserIds: Array.from(thread.participantUserIds).slice(0, 3),
            lastReplyAt: thread.lastReplyAt,
            lastReplyMessageId: thread.lastReplyMessageId,
            lastReplyAuthorId: thread.lastReplyAuthorId,
            lastReplyPreview: thread.lastReplyPreview,
            replyCount: thread.replyCount,
            hasReplyBySelf: thread.hasReplyBySelf,
            isRootMessageBySelf,
          });
        }),
      );

      threadIndexStore.pruneToMostRecent(THREAD_INDEX_MAX_ENTRIES);
    };

    void hydrateThreadIndex();
  }, [repositories.event.eventService, selfUser.id, visibleConversations]);

  useE2EIFeatureConfigUpdate(repositories.team);

  useEffect(() => {
    const pendingEligibilityChecks = new Set<string>();

    const handleBackendEvent = async (event?: {
      type?: string;
      conversation?: string;
      from?: string;
      id?: string;
      time?: string;
      mentions?: string[];
      is_thread_reply?: boolean;
      thread_id?: string | null;
      thread_root_message_id?: string | null;
      data?: {
        mentions?: string[];
        content?: string;
        text?: {mentions?: string[]};
        thread_id?: string | null;
        thread_root_message_id?: string | null;
      };
    }) => {
      const conversationId = event?.conversation;
      const threadId = normalizeThreadId(
        event?.thread_id ??
          event?.thread_root_message_id ??
          event?.data?.thread_id ??
          event?.data?.thread_root_message_id,
      );

      if (!conversationId || !threadId || !event?.is_thread_reply || !isThreadReplyMessageEvent(event.type)) {
        return;
      }

      const threadStore = useThreadUnreadRepliesStore.getState();
      const threadIndexStore = useThreadIndexStore.getState();
      const threadKey = `${conversationId}:${threadId}`;
      const selfDomain = selfUser.qualifiedId?.domain ?? '';
      const mentionPayloads = [
        ...(event?.mentions ?? []),
        ...(event?.data?.mentions ?? []),
        ...(event?.data?.text?.mentions ?? []),
      ];
      const isSelfMentionedInThreadReply = mentionPayloads.some(encodedMention => {
        try {
          const mention = Mention.decode(base64ToArray(encodedMention));
          const mentionedId = mention.qualifiedUserId?.id || mention.userId;
          const mentionedDomain = mention.qualifiedUserId?.domain ?? '';

          if (!mentionedId || mentionedId !== selfUser.id) {
            return false;
          }

          return !mentionedDomain || !selfDomain || mentionedDomain === selfDomain;
        } catch {
          return false;
        }
      });

      threadIndexStore.recordThreadReplyEvent({
        conversationId,
        threadId,
        eventTime: event.time,
        messageId: event.id,
        authorId: event.from,
        preview: extractThreadPreview(event),
        isSelfReply: event.from === selfUser.id,
        hasSelfMention: isSelfMentionedInThreadReply,
      });

      if (event.from === selfUser.id) {
        threadStore.markThreadRepliedBySelf(conversationId, threadId);
        return;
      }

      if (isSelfMentionedInThreadReply) {
        threadStore.markThreadUnreadMentionForSelf(conversationId, threadId);
      }

      if (isThreadTrackedForSelf(conversationId, threadId, threadStore)) {
        threadStore.incrementUnreadForThread(conversationId, threadId, isSelfMentionedInThreadReply);
        return;
      }

      if (isSelfMentionedInThreadReply) {
        threadStore.incrementUnreadForThread(conversationId, threadId, true);
        return;
      }

      if (pendingEligibilityChecks.has(threadKey)) {
        return;
      }

      pendingEligibilityChecks.add(threadKey);

      try {
        const rootEvent = await repositories.event.eventService.loadEvent(conversationId, threadId);
        const rootMessagePreview = extractThreadPreview(rootEvent);
        if (rootMessagePreview) {
          useThreadIndexStore.getState().upsertThread({
            conversationId,
            threadId,
            rootMessagePreview,
          });
        }

        if (rootEvent?.from === selfUser.id) {
          const freshStore = useThreadUnreadRepliesStore.getState();
          const freshThreadIndexStore = useThreadIndexStore.getState();
          freshStore.markThreadRootAuthoredBySelf(conversationId, threadId);
          freshThreadIndexStore.markThreadRootMessageBySelf(conversationId, threadId);
          freshStore.incrementUnreadForThread(conversationId, threadId, isSelfMentionedInThreadReply);
          return;
        }

        const threadEvents = await repositories.event.eventService.loadThreadEvents(conversationId, threadId);
        const hasReplyFromSelf = threadEvents.some(
          threadEvent => threadEvent.id !== threadId && threadEvent.from === selfUser.id,
        );

        if (hasReplyFromSelf) {
          const freshStore = useThreadUnreadRepliesStore.getState();
          freshStore.markThreadRepliedBySelf(conversationId, threadId);
          freshStore.incrementUnreadForThread(conversationId, threadId, isSelfMentionedInThreadReply);
        }
      } finally {
        pendingEligibilityChecks.delete(threadKey);
      }
    };

    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleBackendEvent);
    return () => {
      amplify.unsubscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleBackendEvent);
    };
  }, [repositories.event.eventService, selfUser.id, selfUser.qualifiedId?.domain]);

  const showLeftSidebar = (isMobileView && isMobileLeftSidebarView) || (!isMobileView && !isLeftSidebarHidden);
  const showMainContent =
    currentTab === SidebarTabs.CELLS ||
    currentTab === SidebarTabs.MEETINGS ||
    !isMobileView ||
    isMobileCentralColumnView;
  return (
    <StyledApp
      themeId={THEME_ID.DEFAULT}
      css={{backgroundColor: 'unset', height: '100%'}}
      id="wire-main"
      data-uie-name="status-webapp"
      data-uie-value="is-loaded"
    >
      {!locked && <WindowTitleUpdater />}
      <RootProvider
        value={{
          fireAndForgetInvoker,
          mainViewModel: mainView,
          wallClock,
          doesApplicationNeedForceReload,
          isFeatureToggleEnabled,
          applicationNavigation: {
            get currentPathname(): string {
              return window.location.pathname;
            },
            get currentSearch(): string {
              return window.location.search;
            },
            get currentHash(): string {
              return window.location.hash;
            },
            navigateTo(url) {
              window.location.assign(url);
            },
          },
        }}
      >
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <ForceReloadModal reloadApplication={app.refresh} />
          {Config.getConfig().FEATURE.ENABLE_DEBUG && <ConfigToolbar />}
          {!locked && (
            <div
              id="app"
              className={cx('app', {
                'app--hide-main-content-on-mobile':
                  currentTab !== SidebarTabs.CELLS && currentTab !== SidebarTabs.MEETINGS,
                'app--message-thread-panel': currentState === PanelState.MESSAGE_THREAD,
                'app--conversation-threads-list-panel': currentState === PanelState.CONVERSATION_THREADS_LIST,
              })}
            >
              {showLeftSidebar && (
                <LeftSidebar
                  listViewModel={mainView.list}
                  selfUser={selfUser}
                  isActivatedAccount={isActivatedAccount}
                />
              )}

              {showMainContent && (
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

          {!locked && (
            <>
              <FeatureConfigChangeNotifier selfUserId={selfUser.id} teamState={teamState} />

              {viewMode === CallingViewMode.FULL_SCREEN && (
                <CallingContainer
                  propertiesRepository={repositories.properties}
                  callingRepository={repositories.calling}
                  fireAndForgetInvoker={fireAndForgetInvoker}
                  toggleScreenshare={mainView.calling.callActions.toggleScreenshare}
                />
              )}

              {isScreenshareActive && <ChooseScreen choose={repositories.calling.onChooseScreen} />}

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
          <CreateConversationModal />
          <FileHistoryModal />
          <TeamCreationModalContainer
            selfUser={selfUser}
            teamRepository={repositories.team}
            userRepository={repositories.user}
          />
        </ErrorBoundary>
      </RootProvider>

      <div id="app-notification"></div>
    </StyledApp>
  );
};
