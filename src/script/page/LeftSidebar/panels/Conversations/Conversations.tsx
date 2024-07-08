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

import React, {KeyboardEvent as ReactKeyBoardEvent, useEffect, useState} from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {ChevronIcon, IconButton, useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {CallingCell} from 'Components/calling/CallingCell';
import {FadingScrollbar} from 'Components/FadingScrollbar';
import {IntegrationRepository} from 'src/script/integration/IntegrationRepository';
import {Preferences} from 'src/script/page/LeftSidebar/panels/Preferences';
import {StartUI} from 'src/script/page/LeftSidebar/panels/StartUI';
import {ANIMATED_PAGE_TRANSITION_DURATION} from 'src/script/page/MainContent';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {ContentState, ListState} from 'src/script/page/useAppState';
import {SearchRepository} from 'src/script/search/SearchRepository';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ConversationHeader} from './ConversationHeader';
import {
  conversationsSpacerStyles,
  conversationsSidebarStyles,
  conversationsSidebarHandleStyles,
  conversationsSidebarHandleIconStyles,
} from './Conversations.styles';
import {ConversationsList} from './ConversationsList';
import {ConversationTabs} from './ConversationTabs';
import {EmptyConversationList} from './EmptyConversationList';
import {getTabConversations} from './helpers';
import {SidebarStatus, SidebarTabs, useFolderState, useSidebarStore} from './state';

import {CallState} from '../../../../calling/CallState';
import {createLabel} from '../../../../conversation/ConversationLabelRepository';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {User} from '../../../../entity/User';
import {useConversationFocus} from '../../../../hooks/useConversationFocus';
import {PreferenceNotificationRepository} from '../../../../notification/PreferenceNotificationRepository';
import {PropertiesRepository} from '../../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../../properties/PropertiesType';
import {generateConversationUrl} from '../../../../router/routeGenerator';
import {createNavigateKeyboard} from '../../../../router/routerBindings';
import {TeamState} from '../../../../team/TeamState';
import {UserState} from '../../../../user/UserState';
import {ListViewModel} from '../../../../view_model/ListViewModel';
import {UserDetails} from '../../UserDetails';
import {ListWrapper} from '../ListWrapper';

type ConversationsProps = {
  callState?: CallState;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  listViewModel: ListViewModel;
  preferenceNotificationRepository: PreferenceNotificationRepository;
  propertiesRepository: PropertiesRepository;
  selfUser: User;
  teamState?: TeamState;
  userState?: UserState;
  integrationRepository: IntegrationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  userRepository: UserRepository;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  isConversationFilterFocused: boolean;
  setIsConversationFilterFocused: (isFocused: boolean) => void;
};

const Conversations: React.FC<ConversationsProps> = ({
  inputRef,
  integrationRepository,
  searchRepository,
  teamRepository,
  userRepository,
  propertiesRepository,
  conversationRepository,
  preferenceNotificationRepository,
  isConversationFilterFocused,
  setIsConversationFilterFocused,
  listViewModel,
  conversationState = container.resolve(ConversationState),
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
  userState = container.resolve(UserState),
  selfUser,
}) => {
  const {currentTab, status: sidebarStatus, setStatus: setSidebarStatus, setCurrentTab} = useSidebarStore();
  const [conversationsFilter, setConversationsFilter] = useState<string>('');
  const {classifiedDomains, isTeam} = useKoSubscribableChildren(teamState, ['classifiedDomains', 'isTeam']);
  const {connectRequests} = useKoSubscribableChildren(userState, ['connectRequests']);

  const {
    activeConversation,
    unreadConversations,
    archivedConversations,
    groupConversations,
    directConversations,
    visibleConversations: conversations,
  } = useKoSubscribableChildren(conversationState, [
    'activeConversation',
    'archivedConversations',
    'groupConversations',
    'directConversations',
    'unreadConversations',
    'visibleConversations',
  ]);
  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);

  const {conversationLabelRepository} = conversationRepository;
  const favoriteConversations = conversationLabelRepository.getFavorites(conversations);

  const isPreferences = currentTab === SidebarTabs.PREFERENCES;

  const showSearchInput = [
    SidebarTabs.RECENT,
    SidebarTabs.FOLDER,
    SidebarTabs.FAVORITES,
    SidebarTabs.GROUPS,
    SidebarTabs.DIRECTS,
    SidebarTabs.ARCHIVES,
  ].includes(currentTab);

  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const {openFolder, closeFolder, expandedFolder, isFoldersTabOpen, toggleFoldersTab} = useFolderState();
  const {currentFocus, handleKeyDown, resetConversationFocus} = useConversationFocus(conversations);

  // false when screen is larger than 1000px
  // true when screen is smaller than 1000px
  const isScreenLessThanMdBreakpoint = useMatchMedia('(max-width: 1000px)');
  const isSideBarOpen =
    sidebarStatus === SidebarStatus.AUTO ? !isScreenLessThanMdBreakpoint : sidebarStatus === SidebarStatus.OPEN;

  const {conversations: currentTabConversations, searchInputPlaceholder} = getTabConversations({
    currentTab,
    conversations,
    conversationsFilter,
    archivedConversations,
    groupConversations,
    directConversations,
    favoriteConversations,
  });

  const currentFolder = conversationLabelRepository
    .getLabels()
    .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
    .find(folder => folder.id === expandedFolder);

  function toggleSidebar() {
    if (isFoldersTabOpen) {
      toggleFoldersTab();
    }

    setSidebarStatus(isSideBarOpen ? SidebarStatus.CLOSED : SidebarStatus.OPEN);
  }

  const hasNoConversations = conversations.length + connectRequests.length === 0;

  useEffect(() => {
    if (activeConversation && !conversationState.isVisible(activeConversation)) {
      // If the active conversation is not visible, switch to the recent view
      listViewModel.contentViewModel.loadPreviousContent();
    }
  }, [activeConversation, conversationState, listViewModel.contentViewModel, conversations.length]);

  useEffect(() => {
    if (!activeConversation) {
      return () => {};
    }

    amplify.subscribe(WebAppEvents.CONTENT.EXPAND_FOLDER, openFolder);

    return () => {
      amplify.unsubscribe(WebAppEvents.CONTENT.EXPAND_FOLDER, openFolder);
    };
  }, [activeConversation]);

  useEffect(() => {
    const openFavorites = () => changeTab(SidebarTabs.FAVORITES);
    conversationLabelRepository.addEventListener('conversation-favorited', openFavorites);
    return () => {
      conversationLabelRepository.removeEventListener('conversation-favorited', openFavorites);
    };
  }, []);

  const clearConversationFilter = () => setConversationsFilter('');

  function changeTab(nextTab: SidebarTabs, folderId?: string) {
    if (!folderId) {
      closeFolder();
    }

    if (nextTab === SidebarTabs.ARCHIVES) {
      // will eventually load missing events from the db
      void conversationRepository.updateArchivedConversations();
    }

    if (nextTab !== SidebarTabs.PREFERENCES) {
      onExitPreferences();
    }

    clearConversationFilter();
    setCurrentTab(nextTab);
  }

  const switchList = listViewModel.switchList;

  const onExitPreferences = () => {
    setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR);
    switchList(ListState.CONVERSATIONS);
    listViewModel.contentViewModel.switchContent(ContentState.CONVERSATION);
  };

  function onClickPreferences(itemId: ContentState) {
    switchList(ListState.PREFERENCES);
    setCurrentView(ViewType.MOBILE_CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(itemId);

    setTimeout(() => {
      const centerColumn = document.getElementById('center-column');
      const nextElementToFocus = centerColumn?.querySelector("[tabindex='0']") as HTMLElement | null;
      nextElementToFocus?.focus();
    }, ANIMATED_PAGE_TRANSITION_DURATION + 1);
  }

  const sidebar = (
    <nav className="conversations-sidebar" css={conversationsSidebarStyles(isScreenLessThanMdBreakpoint)}>
      <FadingScrollbar className="conversations-sidebar-items" data-is-collapsed={!isSideBarOpen}>
        <UserDetails
          user={selfUser}
          groupId={conversationState.selfMLSConversation()?.groupId}
          isTeam={isTeam}
          isSideBarOpen={isSideBarOpen}
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
          onClickPreferences={() => onClickPreferences(ContentState.PREFERENCES_ACCOUNT)}
        />
      </FadingScrollbar>

      <IconButton
        css={conversationsSidebarHandleStyles(isSideBarOpen)}
        className="conversations-sidebar-handle"
        onClick={toggleSidebar}
      >
        <ChevronIcon css={conversationsSidebarHandleIconStyles} />
      </IconButton>
    </nav>
  );

  const callingView = (
    <>
      {activeCalls.map(call => {
        const {conversation} = call;
        const callingViewModel = listViewModel.callingViewModel;
        const {callingRepository} = callingViewModel;

        return (
          conversation && (
            <CallingCell
              key={conversation.id}
              classifiedDomains={classifiedDomains}
              call={call}
              callActions={callingViewModel.callActions}
              callingRepository={callingRepository}
              pushToTalkKey={propertiesRepository.getPreference(PROPERTIES_TYPE.CALL.PUSH_TO_TALK_KEY)}
              isFullUi
              hasAccessToCamera={callingViewModel.hasAccessToCamera()}
            />
          )
        );
      })}
    </>
  );

  const handleEnterSearchClick = (event: ReactKeyBoardEvent<HTMLDivElement>) => {
    const firstFoundConversation = currentTabConversations?.[0];

    if (firstFoundConversation) {
      createNavigateKeyboard(generateConversationUrl(firstFoundConversation.qualifiedId), true)(event);
      setConversationsFilter('');
    }
  };

  return (
    <div className="conversations-wrapper">
      <div className="conversations-sidebar-spacer" css={conversationsSpacerStyles(isScreenLessThanMdBreakpoint)} />
      <ListWrapper
        id="conversations"
        headerElement={
          <ConversationHeader
            ref={inputRef}
            currentFolder={currentFolder}
            currentTab={currentTab}
            selfUser={selfUser}
            showSearchInput={(showSearchInput && currentTabConversations.length !== 0) || !!conversationsFilter}
            searchValue={conversationsFilter}
            setSearchValue={setConversationsFilter}
            searchInputPlaceholder={searchInputPlaceholder}
            setIsConversationFilterFocused={value => setIsConversationFilterFocused(value)}
            onSearchEnterClick={handleEnterSearchClick}
          />
        }
        hasHeader={!isPreferences}
        sidebar={sidebar}
        footer={callingView}
      >
        {isPreferences ? (
          <Preferences
            onPreferenceItemClick={onClickPreferences}
            teamRepository={teamRepository}
            preferenceNotificationRepository={preferenceNotificationRepository}
          />
        ) : (
          <>
            {currentTab === SidebarTabs.CONNECT && (
              <StartUI
                conversationRepository={conversationRepository}
                searchRepository={searchRepository}
                teamRepository={teamRepository}
                integrationRepository={integrationRepository}
                mainViewModel={listViewModel.mainViewModel}
                userRepository={userRepository}
                isFederated={listViewModel.isFederated}
                selfUser={selfUser}
              />
            )}

            {((showSearchInput && currentTabConversations.length === 0) ||
              (hasNoConversations && currentTab !== SidebarTabs.ARCHIVES)) && (
              <EmptyConversationList
                currentTab={currentTab}
                onChangeTab={changeTab}
                searchValue={conversationsFilter}
              />
            )}

            {showSearchInput && (
              <ConversationsList
                conversationsFilter={conversationsFilter}
                currentFolder={currentFolder}
                conversationLabelRepository={conversationLabelRepository}
                callState={callState}
                currentTab={currentTab}
                currentFocus={currentFocus}
                listViewModel={listViewModel}
                connectRequests={connectRequests}
                handleArrowKeyDown={handleKeyDown}
                conversationState={conversationState}
                conversations={currentTabConversations}
                conversationRepository={conversationRepository}
                resetConversationFocus={resetConversationFocus}
                clearSearchFilter={clearConversationFilter}
                isConversationFilterFocused={isConversationFilterFocused}
              />
            )}
          </>
        )}
      </ListWrapper>
    </div>
  );
};

export {Conversations};
