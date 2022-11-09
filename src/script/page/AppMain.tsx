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

import {FC, useCallback, useEffect, useMemo, useState} from 'react';

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {CONV_TYPE} from '@wireapp/avs';
import {Runtime} from '@wireapp/commons';
import {StyledApp, THEME_ID, useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {CallingContainer} from 'Components/calling/CallingOverlayContainer';
import {GroupCreationModal} from 'Components/Modals/GroupCreation/GroupCreationModal';
import {LegalHoldModal} from 'Components/Modals/LegalHoldModal/LegalHoldModal';
import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {PrimaryModalComponent} from 'Components/Modals/PrimaryModal/PrimaryModal';
import {showUserModal, UserModal} from 'Components/Modals/UserModal';
import {iterateItem} from 'Util/ArrayUtil';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {isConversationEntity} from 'Util/TypePredicateUtil';

import {AppLock} from './AppLock';
import {LeftSidebar} from './LeftSidebar';
import {MainContent} from './MainContent';
import {PanelEntity, PanelState, RightSidebar} from './RightSidebar';
import {useAppMainState, ViewType} from './state';
import {ContentState, ListState, useAppState} from './useAppState';
import {usePopNotification} from './usePopNotification';
import {useWindowTitle} from './useWindowTitle';

import {Config} from '../Config';
import {ConversationState} from '../conversation/ConversationState';
import {Conversation} from '../entity/Conversation';
import {Message} from '../entity/message/Message';
import {User} from '../entity/User';
import {ConversationError} from '../error/ConversationError';
import {App} from '../main/app';
import {Router} from '../router/Router';
import {initializeRouter} from '../router/routerBindings';
import {TeamState} from '../team/TeamState';
import {showContextMenu} from '../ui/ContextMenu';
import {showLabelContextMenu} from '../ui/LabelContextMenu';
import {Shortcut} from '../ui/Shortcut';
import {ShortcutType} from '../ui/ShortcutType';
import {showInitialModal} from '../user/AvailabilityModal';
import {UserState} from '../user/UserState';
import {MainViewModel} from '../view_model/MainViewModel';
import {WarningsContainer} from '../view_model/WarningsContainer/WarningsContainer';

export interface ShowConversationOptions {
  exposeMessage?: Message;
  openFirstSelfMention?: boolean;
  openNotificationSettings?: boolean;
}

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

const sidebarId = 'left-column';

const AppMain: FC<AppMainProps> = ({app, mainView, selfUser}) => {
  const apiContext = app.getAPIContext();

  if (!apiContext) {
    throw new Error('API Context has not been set');
  }

  // It's not used in ViewModel, what do to with it?
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastUpdate, setLastUpdate] = useState<number>();

  const {
    contentState,
    setContentState,
    previousContentState,
    setPreviousContentState,
    initialMessage,
    setInitialMessage,
    listState,
    setListState,
  } = useAppState();

  const {history, entity: currentEntity, clearHistory, goTo} = useAppMainState(state => state.rightSidebar);
  const {showRequestModal} = useLegalHoldModalState();

  const currentState = history.at(-1);

  const {repository: repositories} = app;
  const {conversation: conversationRepository, calling: callingRepository, team: teamRepository} = repositories;

  const conversationState = container.resolve(ConversationState);
  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);

  const {accent_id, availability: userAvailability} = useKoSubscribableChildren(selfUser, [
    'accent_id',
    'availability',
  ]);
  const {
    activeConversation,
    conversations_archived: archivedConversations,
    conversations_unarchived: unarchivedConversations,
  } = useKoSubscribableChildren(conversationState, [
    'activeConversation',
    'conversations_archived',
    'conversations_unarchived',
  ]);
  const {isTeam: isProAccount, supportsLegalHold} = useKoSubscribableChildren(teamState, [
    'isTeam',
    'supportsLegalHold',
  ]);
  const {connectRequests, isActivatedAccount, isTemporaryGuest} = useKoSubscribableChildren(userState, [
    'connectRequests',
    'isActivatedAccount',
    'isTemporaryGuest',
  ]);

  const visibleListItems = useMemo(() => {
    const isStatePreferences = listState === ListState.PREFERENCES;

    if (isStatePreferences) {
      const preferenceItems = [
        ContentState.PREFERENCES_ACCOUNT,
        ContentState.PREFERENCES_DEVICES,
        ContentState.PREFERENCES_OPTIONS,
        ContentState.PREFERENCES_AV,
      ];

      if (!Runtime.isDesktopApp()) {
        preferenceItems.push(ContentState.PREFERENCES_ABOUT);
      }

      return preferenceItems;
    }

    const hasConnectRequests = !!connectRequests.length;
    const states: (string | Conversation)[] = hasConnectRequests ? [ContentState.CONNECTION_REQUESTS] : [];

    return states.concat(unarchivedConversations);
  }, [connectRequests.length, listState, unarchivedConversations]);

  useWindowTitle();
  usePopNotification(contentState, repositories.preferenceNotification);

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
  const smBreakpoint = useMatchMedia('max-width: 640px');

  const {currentView} = useAppMainState(state => state.responsiveView);
  const isLeftSidebarVisible = currentView == ViewType.LEFT_SIDEBAR;

  const updateList = (newListState: ListState, respectLastState: boolean) => {
    switch (newListState) {
      case ListState.PREFERENCES:
        setContentState(ContentState.PREFERENCES_ACCOUNT);
        break;
      default:
        if (respectLastState) {
          switchPreviousContent();
        }
    }
  };

  const showList = (newListState: ListState) => {
    setListState(newListState);
    setLastUpdate(Date.now());

    document.addEventListener('keydown', onKeyDownListView);
  };

  const switchList = (newListState: ListState, respectLastState = true): void => {
    const isStateChange = listState !== newListState;

    if (isStateChange) {
      hideList();
      updateList(newListState, respectLastState);
      showList(newListState);
    }
  };

  const onKeyDownListView = (keyboardEvent: KeyboardEvent) => {
    if (isEscapeKey(keyboardEvent)) {
      const newState = isActivatedAccount ? ListState.CONVERSATIONS : ListState.TEMPORARY_GUEST;
      switchList(newState);
    }
  };

  const hideList = (): void => {
    document.removeEventListener('keydown', onKeyDownListView);
  };

  const releaseContent = (newContentState: ContentState) => {
    const isStateConversation = previousContentState === ContentState.CONVERSATION;
    setPreviousContentState(contentState);

    if (isStateConversation) {
      const isCollectionState = ContentState.COLLECTION === newContentState;

      if (!isCollectionState) {
        conversationState.activeConversation(null);
      }

      return activeConversation?.release();
    }
  };

  const shiftContent = (hideSidebar: boolean = false) => {
    const sidebar = document.querySelector(`#${sidebarId}`) as HTMLElement | null;

    if (hideSidebar) {
      if (sidebar) {
        sidebar.style.visibility = 'hidden';
      }
    } else if (sidebar) {
      sidebar.style.visibility = '';
    }
  };

  const showContent = (newContentState: ContentState) => {
    setContentState(newContentState);

    const isHistoryExport = newContentState === ContentState.HISTORY_EXPORT;
    const isHistoryImport = newContentState === ContentState.HISTORY_IMPORT;

    return shiftContent(isHistoryExport || isHistoryImport);
  };

  const checkContentAvailability = (newState: ContentState): ContentState => {
    const isStateRequests = newState === ContentState.CONNECTION_REQUESTS;

    if (isStateRequests) {
      const hasConnectRequests = !!connectRequests.length;

      if (!hasConnectRequests) {
        return ContentState.WATERMARK;
      }
    }

    return newState;
  };

  const switchContent = (newContentState: ContentState): void => {
    const isStateChange = newContentState !== contentState;

    if (isStateChange) {
      releaseContent(newContentState);
      showContent(checkContentAvailability(newContentState));
    }
  };

  const changeConversation = (conversationEntity: Conversation, messageEntity?: Message) => {
    // Clean up old conversation
    if (activeConversation) {
      activeConversation.release();
    }

    // Update new conversation
    if (messageEntity) {
      setInitialMessage(messageEntity);
    }
    conversationState.activeConversation(conversationEntity);
  };

  const openConversations = () => {
    const newState = isActivatedAccount ? ListState.CONVERSATIONS : ListState.TEMPORARY_GUEST;
    switchList(newState, false);
  };

  /**
   * Opens the specified conversation.
   *
   * @note If the conversation_et is not defined, it will open the incoming connection requests instead
   *
   * @param conversation Conversation entity or conversation ID
   * @param options State to open conversation in
   * @param domain Domain name
   */
  const showConversation = useCallback(
    async (conversation: Conversation | string, options: ShowConversationOptions, domain: string | null = null) => {
      openConversations();

      const {
        exposeMessage: exposeMessageEntity,
        openFirstSelfMention = false,
        openNotificationSettings = false,
      } = options;

      if (!conversation) {
        switchContent(ContentState.CONNECTION_REQUESTS);

        return;
      }

      try {
        const conversationEntity = isConversationEntity(conversation)
          ? conversation
          : await conversationRepository.getConversationById({domain: domain || '', id: conversation});

        if (!conversationEntity) {
          throw new ConversationError(
            ConversationError.TYPE.CONVERSATION_NOT_FOUND,
            ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
          );
        }

        const isActiveConversation = conversationState.isActiveConversation(conversationEntity);
        const isConversationState = contentState === ContentState.CONVERSATION;
        const isOpenedConversation = conversationEntity && isActiveConversation && isConversationState;

        if (isOpenedConversation) {
          if (openNotificationSettings) {
            goTo(PanelState.NOTIFICATIONS, {entity: conversationEntity});
          }

          return;
        }

        releaseContent(contentState);

        setContentState(ContentState.CONVERSATION);
        openConversations();

        if (!isActiveConversation) {
          conversationState.activeConversation(conversationEntity);
        }

        const messageEntity = openFirstSelfMention
          ? conversationEntity.getFirstUnreadSelfMention()
          : exposeMessageEntity;

        if (conversationEntity.is_cleared()) {
          conversationEntity.cleared_timestamp(0);
        }

        if (conversationEntity.is_archived()) {
          await conversationRepository.unarchiveConversation(conversationEntity);
        }

        changeConversation(conversationEntity, messageEntity);
        showContent(ContentState.CONVERSATION);

        if (openNotificationSettings) {
          goTo(PanelState.NOTIFICATIONS, {entity: activeConversation});
        }
      } catch (error) {
        const conversationError = error as ConversationError;
        const isConversationNotFound = conversationError.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;

        if (isConversationNotFound) {
          const acknowledgeModalOptions = {
            text: {
              message: t('conversationNotFoundMessage'),
              title: t('conversationNotFoundTitle', Config.getConfig().BRAND_NAME),
            },
          };

          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, acknowledgeModalOptions, undefined);
        } else {
          throw error;
        }
      }
    },
    [activeConversation, contentState, conversationState],
  );

  const switchPreviousContent = () => {
    const isStateChange = previousContentState !== contentState;

    if (isStateChange) {
      const isStateRequests = previousContentState === ContentState.CONNECTION_REQUESTS;
      if (isStateRequests) {
        switchContent(ContentState.CONNECTION_REQUESTS);
      }

      const repoHasConversation = conversationState
        .conversations()
        .some(conversation => activeConversation && matchQualifiedIds(conversation, activeConversation));

      if (activeConversation && repoHasConversation && !activeConversation.is_archived()) {
        return showConversation(activeConversation, {});
      }

      return switchContent(ContentState.WATERMARK);
    }
  };

  const iterateActiveConversation = (reverse: boolean) => {
    const {contentState} = useAppState.getState();

    const isStateRequests = contentState === ContentState.CONNECTION_REQUESTS;
    const activeConversationItem = isStateRequests ? ContentState.CONNECTION_REQUESTS : activeConversation;
    const nextItem = iterateItem(visibleListItems, activeConversationItem, reverse);
    const isConnectionRequestItem = nextItem === ContentState.CONNECTION_REQUESTS;

    if (isConnectionRequestItem) {
      return switchContent(ContentState.CONNECTION_REQUESTS);
    }

    if (nextItem) {
      showConversation(nextItem, {});
    }
  };

  const iterateActivePreference = (reverse: boolean) => {
    let activePreference = contentState;
    const isDeviceDetails = activePreference === ContentState.PREFERENCES_DEVICE_DETAILS;

    if (isDeviceDetails) {
      activePreference = ContentState.PREFERENCES_DEVICES;
    }

    const nextPreference = iterateItem(visibleListItems, activePreference, reverse) as ContentState;

    if (nextPreference) {
      switchContent(nextPreference);
    }
  };

  const iterateActiveItem = (reverse = false) => {
    const isStatePreferences = listState === ListState.PREFERENCES;

    return isStatePreferences ? iterateActivePreference(reverse) : iterateActiveConversation(reverse);
  };

  const goToNext = () => iterateActiveItem(true);

  const goToPrevious = () => iterateActiveItem(false);

  const clickToArchive = (conversationEntity = activeConversation): void => {
    if (isActivatedAccount && conversationEntity) {
      mainView.actions.archiveConversation(conversationEntity);
    }
  };

  const clickToClear = (conversationEntity = activeConversation): void => {
    if (conversationEntity) {
      mainView.actions.clearConversation(conversationEntity);
    }
  };

  const clickToToggleMute = (conversationEntity = activeConversation): void => {
    if (conversationEntity) {
      mainView.actions.toggleMuteConversation(conversationEntity);
    }
  };

  const changeNotificationSetting = () => {
    if (isProAccount) {
      goTo(PanelState.NOTIFICATIONS, {entity: activeConversation});
    } else {
      clickToToggleMute();
    }
  };

  const answerCall = (conversationEntity: Conversation): void => {
    const call = callingRepository.findCall(conversationEntity.qualifiedId);

    if (!call) {
      return;
    }

    if (call.conversationType === CONV_TYPE.CONFERENCE && !callingRepository.supportsConferenceCalling) {
      const acknowledgeModalOptions = {
        text: {
          message: `${t('modalConferenceCallNotSupportedMessage')} ${t('modalConferenceCallNotSupportedJoinMessage')}`,
          title: t('modalConferenceCallNotSupportedHeadline'),
        },
      };

      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, acknowledgeModalOptions);
    } else {
      callingRepository.answerCall(call);
    }
  };

  const openPreferencesAbout = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_ABOUT);
  };

  const openPreferencesAccount = async () => {
    await teamRepository.getTeam();
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_ACCOUNT);
  };

  const openPreferencesAudioVideo = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_AV);
  };

  const openPreferencesDevices = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_DEVICES);
  };

  const openPreferencesOptions = () => {
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_OPTIONS);
  };

  const openStartUI = () => {
    switchList(ListState.START_UI);
  };

  const clickToOpenNotificationSettings = (conversationEntity = activeConversation) => {
    if (conversationEntity) {
      showConversation(conversationEntity, {openNotificationSettings: true});
    }
  };

  const clickToUnarchive = (conversationEntity: Conversation): void => {
    conversationRepository.unarchiveConversation(conversationEntity, true, 'manual un-archive').then(() => {
      if (!archivedConversations.length) {
        switchList(ListState.CONVERSATIONS);
      }
    });
  };

  const shouldHideConversation = (conversationEntity: Conversation): boolean => {
    const isStateConversations = listState === ListState.CONVERSATIONS;
    const isActiveConversation = conversationState.isActiveConversation(conversationEntity);

    return isStateConversations && isActiveConversation;
  };

  const clickToCancelRequest = (conversationEntity: Conversation): void => {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = shouldHideConversation(conversationEntity);
    const nextConversationEntity = conversationRepository.getNextConversation(conversationEntity);

    mainView.actions.cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity);
  };

  const clickToBlock = async (conversationEntity: Conversation): Promise<void> => {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = shouldHideConversation(conversationEntity);
    const nextConversationEntity = conversationRepository.getNextConversation(conversationEntity);

    await mainView.actions.blockUser(userEntity, hideConversation, nextConversationEntity);
  };

  const onContextMenu = (
    conversationEntity: Conversation,
    event: MouseEvent | React.MouseEvent<Element, MouseEvent>,
  ) => {
    const entries = [];

    if (conversationEntity.isMutable()) {
      const notificationsShortcut = Shortcut.getShortcutTooltip(ShortcutType.NOTIFICATIONS);

      if (isProAccount) {
        entries.push({
          click: () => clickToOpenNotificationSettings(conversationEntity),
          label: t('conversationsPopoverNotificationSettings'),
          title: t('tooltipConversationsNotifications', notificationsShortcut),
        });
      } else {
        const label = conversationEntity.showNotificationsNothing()
          ? t('conversationsPopoverNotify')
          : t('conversationsPopoverSilence');
        const title = conversationEntity.showNotificationsNothing()
          ? t('tooltipConversationsNotify', notificationsShortcut)
          : t('tooltipConversationsSilence', notificationsShortcut);

        entries.push({
          click: () => clickToToggleMute(conversationEntity),
          label,
          title,
        });
      }
    }

    if (!conversationEntity.is_archived()) {
      const {conversationLabelRepository} = conversationRepository;

      if (!conversationLabelRepository.isFavorite(conversationEntity)) {
        entries.push({
          click: () => {
            conversationLabelRepository.addConversationToFavorites(conversationEntity);
          },
          label: t('conversationPopoverFavorite'),
        });
      } else {
        entries.push({
          click: () => conversationLabelRepository.removeConversationFromFavorites(conversationEntity),
          label: t('conversationPopoverUnfavorite'),
        });
      }

      const customLabel = conversationLabelRepository.getConversationCustomLabel(conversationEntity);

      if (customLabel) {
        entries.push({
          click: () => conversationLabelRepository.removeConversationFromLabel(customLabel, conversationEntity),
          label: t('conversationsPopoverRemoveFrom', customLabel.name),
        });
      }

      entries.push({
        click: () => showLabelContextMenu(event, conversationEntity, conversationLabelRepository),
        label: t('conversationsPopoverMoveTo'),
      });
    }

    if (conversationEntity.is_archived()) {
      entries.push({
        click: () => clickToUnarchive(conversationEntity),
        label: t('conversationsPopoverUnarchive'),
      });
    } else {
      const shortcut = Shortcut.getShortcutTooltip(ShortcutType.ARCHIVE);

      entries.push({
        click: () => clickToArchive(conversationEntity),
        label: t('conversationsPopoverArchive'),
        title: t('tooltipConversationsArchive', shortcut),
      });
    }

    if (conversationEntity.isRequest()) {
      entries.push({
        click: () => clickToCancelRequest(conversationEntity),
        label: t('conversationsPopoverCancel'),
      });
    }

    if (conversationEntity.isClearable()) {
      entries.push({
        click: () => clickToClear(conversationEntity),
        label: t('conversationsPopoverClear'),
      });
    }

    if (!conversationEntity.isGroup()) {
      const userEntity = conversationEntity.firstUserEntity();
      const canBlock = userEntity && (userEntity.isConnected() || userEntity.isRequest());

      if (canBlock) {
        entries.push({
          click: () => clickToBlock(conversationEntity),
          label: t('conversationsPopoverBlock'),
        });
      }
    }

    if (conversationEntity.isLeavable()) {
      entries.push({
        click: () => mainView.actions.leaveConversation(conversationEntity),
        label: t('conversationsPopoverLeave'),
      });
    }

    showContextMenu(event, entries, 'conversation-list-options-menu');
  };

  const initializeAppRouter = () => {
    const router = new Router({
      '/conversation/:conversationId(/:domain)': (conversationId: string, domain: string = apiContext.domain ?? '') => {
        showConversation(conversationId, {}, domain);
      },
      '/preferences/about': () => openPreferencesAbout(),
      '/preferences/account': () => openPreferencesAccount(),
      '/preferences/av': () => openPreferencesAudioVideo(),
      '/preferences/devices': () => openPreferencesDevices(),
      '/preferences/options': () => openPreferencesOptions(),
      '/user/:userId(/:domain)': (userId: string, domain: string = apiContext.domain ?? '') => {
        showUserModal({domain, id: userId}, () => router.navigate('/'));
      },
    });

    initializeRouter(router);
    container.registerInstance(Router, router);
  };

  const initializeApp = () => {
    repositories.notification.setContentViewModelStates(contentState, mainView.multitasking);

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
      setTimeout(() => repositories.notification.checkPermission(), App.CONFIG.NOTIFICATION_CHECK);
    });
  };

  // Initialize this only once.
  useEffect(() => {
    initializeAppRouter();
    initializeApp();

    PrimaryModal.init();
    showInitialModal(userAvailability);

    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, showConversation);

    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT, openPreferencesAccount);
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_DEVICES, openPreferencesDevices);
    amplify.subscribe(WebAppEvents.PREFERENCES.SHOW_AV, openPreferencesAudioVideo);
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, openStartUI);
  }, []);

  useEffect(() => {
    const conversationEntity = repositories.conversation.getMostRecentConversation();

    if (isTemporaryGuest) {
      switchList(ListState.TEMPORARY_GUEST);
      showConversation(conversationEntity, {});
    } else if (conversationEntity) {
      showConversation(conversationEntity, {});
    } else if (connectRequests.length) {
      setContentState(ContentState.CONNECTION_REQUESTS);
    }
  }, []);

  useEffect(() => {
    const isStateRequests = contentState === ContentState.CONNECTION_REQUESTS;

    if (isStateRequests && !connectRequests.length) {
      showConversation(conversationRepository.getMostRecentConversation(), {});
    }
  }, [connectRequests, contentState, conversationRepository]);

  useEffect(() => {
    if (activeConversation?.connection().status() === ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT) {
      showConversation(conversationRepository.getMostRecentConversation(), {});
    }
  }, [activeConversation, conversationRepository, showConversation]);

  useEffect(() => {
    if (supportsLegalHold) {
      showRequestModal(true);
    }
  }, [supportsLegalHold]);

  // Shortcuts
  useEffect(() => {
    amplify.subscribe(WebAppEvents.SHORTCUT.NEXT, goToNext);
    amplify.subscribe(WebAppEvents.SHORTCUT.PREV, goToPrevious);
    amplify.subscribe(WebAppEvents.SHORTCUT.ARCHIVE, clickToArchive);
    amplify.subscribe(WebAppEvents.SHORTCUT.DELETE, clickToClear);
    amplify.subscribe(WebAppEvents.SHORTCUT.NOTIFICATIONS, changeNotificationSetting);
    amplify.subscribe(WebAppEvents.SHORTCUT.SILENCE, changeNotificationSetting); // todo: deprecated - remove when user base of wrappers version >= 3.4 is large enough
  }, []);

  return (
    <StyledApp
      themeId={THEME_ID.DEFAULT}
      css={{backgroundColor: 'unset', height: '100%'}}
      className={`main-accent-color-${accent_id} show`}
      id="wire-main"
      data-uie-name="status-webapp"
      data-uie-value="is-loaded"
    >
      <div id="app" className="app">
        {(!smBreakpoint || isLeftSidebarVisible) && (
          <LeftSidebar
            answerCall={answerCall}
            actionsView={mainView.actions}
            callView={mainView.calling}
            selfUser={selfUser}
            isActivatedAccount={isActivatedAccount}
            showConversation={showConversation}
            switchContent={switchContent}
            switchList={switchList}
            openContextMenu={onContextMenu}
            openPreferencesAccount={openPreferencesAccount}
            repositories={repositories}
            isFederated={mainView.isFederated}
          />
        )}

        {(!smBreakpoint || !isLeftSidebarVisible) && activeConversation && (
          <MainContent
            activeConversation={activeConversation}
            actionsView={mainView.actions}
            callingView={mainView.calling}
            repositories={repositories}
            switchContent={switchContent}
            isRightSidebarOpen={!!currentState}
            openRightSidebar={toggleRightSidebar}
            showConversation={showConversation}
            switchPreviousContent={switchPreviousContent}
            initialMessage={initialMessage}
            isFederated={mainView.isFederated}
            removeDevice={mainView.actions.deleteClient}
          />
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
      <UserModal actionsView={mainView.actions} userRepository={repositories.user} />
      <PrimaryModalComponent />
      <GroupCreationModal
        repositories={repositories}
        showConversation={showConversation}
        userState={userState}
        teamState={teamState}
      />
    </StyledApp>
  );
};

export {AppMain};
