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

import {FC, useCallback, useEffect, useRef, useState} from 'react';

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {container} from 'tsyringe';

import {StyledApp, THEME_ID, useMatchMedia} from '@wireapp/react-ui-kit';

import {CallingContainer} from 'Components/calling/CallingOverlayContainer';
import {GroupCreationModal} from 'Components/Modals/GroupCreation/GroupCreationModal';
import {LegalHoldModal} from 'Components/Modals/LegalHoldModal/LegalHoldModal';
import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {PrimaryModalComponent} from 'Components/Modals/PrimaryModal/PrimaryModal';
import {UserModal} from 'Components/Modals/UserModal';
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
import {useInitializeApp} from './useInitializeApp';
import {useInitializeRouter} from './useInitializeRouter';
import {useInitSubscriptions} from './useInitSubscriptions';
import {usePopNotification} from './usePopNotification';
import {useWindowTitle} from './useWindowTitle';
import {onContextMenu, shiftContent} from './utils';

import {Config} from '../Config';
import {ConversationState} from '../conversation/ConversationState';
import {Conversation} from '../entity/Conversation';
import {Message} from '../entity/message/Message';
import {User} from '../entity/User';
import {ConversationError} from '../error/ConversationError';
import {App} from '../main/app';
import {TeamState} from '../team/TeamState';
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

const AppMain: FC<AppMainProps> = ({app, mainView, selfUser}) => {
  const apiContext = app.getAPIContext();

  if (!apiContext) {
    throw new Error('API Context has not been set');
  }

  const leftSidebarRef = useRef<HTMLDivElement | null>(null);

  // It's not used in ViewModel, what do to with it?
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastUpdate, setLastUpdate] = useState<number>();
  const [initialMessage, setInitialMessage] = useState<Message>();

  const {contentState, setContentState, previousContentState, setPreviousContentState, listState, setListState} =
    useAppState();

  const {history, entity: currentEntity, close: closeRightSidebar, goTo} = useAppMainState(state => state.rightSidebar);
  const {showRequestModal} = useLegalHoldModalState();
  const {currentView} = useAppMainState(state => state.responsiveView);
  const isLeftSidebarVisible = currentView == ViewType.LEFT_SIDEBAR;

  const currentState = history.at(-1);

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia('max-width: 640px');

  const {repository: repositories} = app;
  const {conversation: conversationRepository, team: teamRepository} = repositories;

  const conversationState = container.resolve(ConversationState);
  const teamState = container.resolve(TeamState);
  const userState = container.resolve(UserState);

  const {accent_id, availability: userAvailability} = useKoSubscribableChildren(selfUser, [
    'accent_id',
    'availability',
  ]);
  const {activeConversation, conversations_archived: archivedConversations} = useKoSubscribableChildren(
    conversationState,
    ['activeConversation', 'conversations_archived'],
  );
  const {isTeam: isProAccount, supportsLegalHold} = useKoSubscribableChildren(teamState, [
    'isTeam',
    'supportsLegalHold',
  ]);
  const {connectRequests, isActivatedAccount, isTemporaryGuest} = useKoSubscribableChildren(userState, [
    'connectRequests',
    'isActivatedAccount',
    'isTemporaryGuest',
  ]);

  useWindowTitle();
  usePopNotification(contentState, repositories.preferenceNotification);

  const toggleRightSidebar = (panelState: PanelState, params: RightSidebarParams, compareEntityId = false) => {
    const isDifferentState = currentState !== panelState;
    const isDifferentId = compareEntityId && currentEntity?.id !== params?.entity?.id;

    if (isDifferentId || isDifferentState) {
      goTo(panelState, params);

      return;
    }

    closeRightSidebar();
  };

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

  const switchList = (newListState: ListState, respectLastState = true) => {
    if (listState !== newListState) {
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

  const hideList = () => document.removeEventListener('keydown', onKeyDownListView);

  const releaseContent = (newContentState: ContentState) => {
    setPreviousContentState(contentState);

    if (previousContentState === ContentState.CONVERSATION) {
      if (newContentState !== ContentState.COLLECTION) {
        conversationState.activeConversation(null);
      }

      activeConversation?.release();
    }
  };

  const showContent = (newContentState: ContentState) => {
    setContentState(newContentState);

    const isHistoryExport = newContentState === ContentState.HISTORY_EXPORT;
    const isHistoryImport = newContentState === ContentState.HISTORY_IMPORT;

    return shiftContent(leftSidebarRef.current, isHistoryExport || isHistoryImport);
  };

  const checkContentAvailability = (newState: ContentState): ContentState => {
    const isStateRequests = newState === ContentState.CONNECTION_REQUESTS;
    const hasConnectRequests = !!connectRequests.length;

    return isStateRequests && !hasConnectRequests ? ContentState.WATERMARK : newState;
  };

  const switchContent = (newContentState: ContentState): void => {
    if (newContentState !== contentState) {
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
    async (
      conversation?: Conversation | string,
      options: ShowConversationOptions = {},
      domain: string | null = null,
    ) => {
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

        if (conversationError.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND) {
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
    if (previousContentState !== contentState) {
      if (previousContentState === ContentState.CONNECTION_REQUESTS) {
        switchContent(ContentState.CONNECTION_REQUESTS);
      }

      const conversations = conversationState.conversations();
      const repoHasConversation = conversations.some(
        conversation => activeConversation && matchQualifiedIds(conversation, activeConversation),
      );

      if (activeConversation && repoHasConversation && !activeConversation.is_archived()) {
        showConversation(activeConversation);

        return;
      }

      switchContent(ContentState.WATERMARK);
    }
  };

  const onArchive = (conversationEntity = activeConversation): void => {
    if (isActivatedAccount && conversationEntity) {
      mainView.actions.archiveConversation(conversationEntity);
    }
  };

  const openPreferencesAccount = async () => {
    await teamRepository.getTeam();
    switchList(ListState.PREFERENCES);
    switchContent(ContentState.PREFERENCES_ACCOUNT);
  };

  const openContextMenu = onContextMenu({
    archivedConversations,
    isProAccount,
    conversationRepository,
    actionsView: mainView.actions,
    showConversation,
    switchList,
    listState,
    onArchive,
    conversationState,
  });

  useInitializeApp(repositories.notification, repositories.properties, mainView.multitasking);
  useInitializeRouter(apiContext, showConversation, switchContent, switchList, openPreferencesAccount);
  useInitSubscriptions(
    mainView.actions,
    connectRequests,
    conversationState,
    isProAccount,
    onArchive,
    showConversation,
    switchContent,
  );

  useEffect(() => {
    PrimaryModal.init();
    showInitialModal(userAvailability);

    const conversationEntity = repositories.conversation.getMostRecentConversation();

    if (isTemporaryGuest) {
      switchList(ListState.TEMPORARY_GUEST);
      showConversation(conversationEntity, {});
    } else if (conversationEntity) {
      showConversation(conversationEntity);
    } else if (connectRequests.length) {
      setContentState(ContentState.CONNECTION_REQUESTS);
    }
  }, []);

  useEffect(() => {
    if (contentState === ContentState.CONNECTION_REQUESTS && !connectRequests.length) {
      showConversation(conversationRepository.getMostRecentConversation());
    }
  }, [connectRequests, contentState, conversationRepository]);

  useEffect(() => {
    if (activeConversation?.connection().status() === ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT) {
      showConversation(conversationRepository.getMostRecentConversation());
    }
  }, [activeConversation, conversationRepository, showConversation]);

  useEffect(() => {
    if (supportsLegalHold) {
      showRequestModal(true);
    }
  }, [supportsLegalHold]);

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
            ref={leftSidebarRef}
            actionsView={mainView.actions}
            callView={mainView.calling}
            selfUser={selfUser}
            isActivatedAccount={isActivatedAccount}
            showConversation={showConversation}
            switchContent={switchContent}
            switchList={switchList}
            openContextMenu={openContextMenu}
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
