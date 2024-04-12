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

import React, {useEffect, useState} from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {ChevronIcon, useMatchMedia} from '@wireapp/react-ui-kit';
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
import {ConversationsList} from './ConversationsList';
import {ConversationTabs} from './ConversationTabs';
import {EmptyConversationList} from './EmptyConversationList';
import {getTabConversations} from './helpers';
import {useFolderState, useSidebarStore} from './state';

import {CallState} from '../../../../calling/CallState';
import {createLabel, DefaultLabelIds} from '../../../../conversation/ConversationLabelRepository';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {User} from '../../../../entity/User';
import {useConversationFocus} from '../../../../hooks/useConversationFocus';
import {PreferenceNotificationRepository} from '../../../../notification/PreferenceNotificationRepository';
import {PropertiesRepository} from '../../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../../properties/PropertiesType';
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
};

export enum SidebarTabs {
  RECENT,
  FOLDER,
  FAVORITES,
  GROUPS,
  DIRECTS,
  ARCHIVES,
  CONNECT,
  PREFERENCES,
}

const Conversations: React.FC<ConversationsProps> = ({
  integrationRepository,
  searchRepository,
  teamRepository,
  userRepository,
  propertiesRepository,
  conversationRepository,
  preferenceNotificationRepository,
  listViewModel,
  conversationState = container.resolve(ConversationState),
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
  userState = container.resolve(UserState),
  selfUser,
}) => {
  const {isOpen: isSideBarOpen, toggleIsOpen: toggleSidebarIsOpen, setIsOpen: setIsSidebarOpen} = useSidebarStore();
  const [conversationsFilter, setConversationsFilter] = useState<string>('');
  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
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

  const {conversationLabelRepository} = conversationRepository;
  const favoriteConversations = conversationLabelRepository.getFavorites(conversations);

  const initialTab = propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS)
    ? SidebarTabs.FOLDER
    : SidebarTabs.RECENT;

  const [currentTab, setCurrentTab] = useState<SidebarTabs>(initialTab);

  const isFolderTab = currentTab === SidebarTabs.FOLDER;
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
    toggleSidebarIsOpen();
  }

  const hasNoConversations = conversations.length + connectRequests.length === 0;

  const mdBreakpoint = useMatchMedia('(max-width: 1000px)');

  useEffect(() => {
    if (mdBreakpoint) {
      setIsSidebarOpen(false);
      return;
    }

    setIsSidebarOpen(true);
  }, [mdBreakpoint, setIsSidebarOpen]);

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
    const openFavorites = () => openFolder(DefaultLabelIds.Favorites);
    conversationLabelRepository.addEventListener('conversation-favorited', openFavorites);
    return () => {
      conversationLabelRepository.removeEventListener('conversation-favorited', openFavorites);
    };
  }, []);

  useEffect(() => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS, isFolderTab);
  }, [isFolderTab]);

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

    setConversationsFilter('');
    setCurrentTab(nextTab);
  }

  const switchList = listViewModel.switchList;

  const onExitPreferences = () => {
    setCurrentView(ViewType.LEFT_SIDEBAR);
    switchList(ListState.CONVERSATIONS);
    listViewModel.contentViewModel.switchContent(ContentState.CONVERSATION);
  };

  function onClickPreferences(itemId: ContentState) {
    switchList(ListState.PREFERENCES);
    setCurrentView(ViewType.CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(itemId);

    setTimeout(() => {
      const centerColumn = document.getElementById('center-column');
      const nextElementToFocus = centerColumn?.querySelector("[tabindex='0']") as HTMLElement | null;
      nextElementToFocus?.focus();
    }, ANIMATED_PAGE_TRANSITION_DURATION + 1);
  }

  const sidebar = (
    <nav className="conversations-sidebar">
      <FadingScrollbar className="conversations-sidebar-items" data-is-collapsed={!isSideBarOpen}>
        <UserDetails
          user={selfUser}
          groupId={conversationState.selfMLSConversation()?.groupId}
          isTeam={teamState.isTeam()}
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

      {!mdBreakpoint && (
        <button
          type="button"
          role="tab"
          className="conversations-sidebar-handle"
          data-is-collapsed={!isSideBarOpen || mdBreakpoint}
          onClick={toggleSidebar}
        >
          <ChevronIcon width={12} height={12} />
        </button>
      )}
    </nav>
  );

  const callingView = (
    <>
      {activeCalls.map(call => {
        const conversation = conversationState.findConversation(call.conversationId);

        if (!conversation) {
          return null;
        }

        const callingViewModel = listViewModel.callingViewModel;
        const {callingRepository} = callingViewModel;

        return (
          <div className="calling-cell" key={conversation.id}>
            <CallingCell
              classifiedDomains={classifiedDomains}
              call={call}
              callActions={callingViewModel.callActions}
              callingRepository={callingRepository}
              pushToTalkKey={propertiesRepository.getPreference(PROPERTIES_TYPE.CALL.PUSH_TO_TALK_KEY)}
              conversation={conversation}
              isFullUi
              hasAccessToCamera={callingViewModel.hasAccessToCamera()}
              isSelfVerified={selfUser.is_verified()}
              multitasking={callingViewModel.multitasking}
            />
          </div>
        );
      })}
    </>
  );

  return (
    <div className="conversations-wrapper">
      <ListWrapper
        id="conversations"
        headerElement={
          <ConversationHeader
            currentFolder={currentFolder}
            currentTab={currentTab}
            selfUser={selfUser}
            showSearchInput={(showSearchInput && currentTabConversations.length !== 0) || !!conversationsFilter}
            searchValue={conversationsFilter}
            setSearchValue={setConversationsFilter}
            searchInputPlaceholder={searchInputPlaceholder}
          />
        }
        hasHeader={!isPreferences}
        sidebar={sidebar}
        before={callingView}
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

            {((showSearchInput && currentTabConversations.length === 0) || hasNoConversations) && (
              <EmptyConversationList
                currentTab={currentTab}
                onChangeTab={changeTab}
                searchValue={conversationsFilter}
              />
            )}

            {showSearchInput && (
              <ConversationsList
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
              />
            )}
          </>
        )}
      </ListWrapper>
    </div>
  );
};

export {Conversations};
