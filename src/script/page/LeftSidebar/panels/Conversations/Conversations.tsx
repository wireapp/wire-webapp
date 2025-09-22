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

import React, {KeyboardEvent as ReactKeyBoardEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';
import {useShallow} from 'zustand/react/shallow';

import {useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useConversationFocus} from 'Hooks/useConversationFocus';
import {CallState} from 'Repositories/calling/CallState';
import {createLabel} from 'Repositories/conversation/ConversationLabelRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {PreferenceNotificationRepository} from 'Repositories/notification/PreferenceNotificationRepository';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {EventName} from 'Repositories/tracking/EventName';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {Preferences} from 'src/script/page/LeftSidebar/panels/Preferences';
import {ANIMATED_PAGE_TRANSITION_DURATION} from 'src/script/page/MainContent';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {ContentState, ListState} from 'src/script/page/useAppState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {ConversationCallingView} from './ConversationCallingView/ConversationCallingView';
import {ConversationHeader} from './ConversationHeader';
import {conversationsSpacerStyles} from './Conversations.styles';
import {ConversationSidebar} from './ConversationSidebar/ConversationSidebar';
import {ConversationsList} from './ConversationsList';
import {EmptyConversationList} from './EmptyConversationList';
import {getGroupParticipantsConversations} from './getGroupParticipantsConversation';
import {getTabConversations, scrollToConversation} from './helpers';
import {useDraftConversations} from './hooks/useDraftConversations';
import {useFolderStore} from './useFoldersStore';
import {SidebarStatus, SidebarTabs, useSidebarStore} from './useSidebarStore';

import {generateConversationUrl} from '../../../../router/routeGenerator';
import {createNavigateKeyboard} from '../../../../router/routerBindings';
import {ListViewModel} from '../../../../view_model/ListViewModel';
import {ListWrapper} from '../ListWrapper';
import {StartUI} from '../StartUI';

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

export const Conversations: React.FC<ConversationsProps> = ({
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
  const [conversationListRef, setConversationListRef] = useState<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    currentTab,
    status: sidebarStatus,
    setStatus: setSidebarStatus,
    setCurrentTab,
    conversationFilter,
  } = useSidebarStore(useShallow(state => state));
  const {isChannelsEnabled} = useChannelsFeatureFlag();
  const [conversationsFilter, setConversationsFilter] = useState<string>('');
  const {classifiedDomains, isTeam} = useKoSubscribableChildren(teamState, ['classifiedDomains', 'isTeam']);
  const {connectRequests} = useKoSubscribableChildren(userState, ['connectRequests']);
  const {notifications} = useKoSubscribableChildren(preferenceNotificationRepository, ['notifications']);

  const {isTemporaryGuest} = useKoSubscribableChildren(selfUser, ['isTemporaryGuest']);

  const {
    activeConversation,
    unreadConversations,
    archivedConversations,
    groupConversations,
    directConversations,
    visibleConversations,
    channelConversations,
    channelAndGroupConversations,
  } = useKoSubscribableChildren(conversationState, [
    'activeConversation',
    'archivedConversations',
    'groupConversations',
    'directConversations',
    'unreadConversations',
    'visibleConversations',
    'channelConversations',
    'channelAndGroupConversations',
  ]);

  const conversations = useMemo(() => visibleConversations, [visibleConversations]);

  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);

  const {conversationLabelRepository} = conversationRepository;
  const {labels} = useKoSubscribableChildren(conversationLabelRepository, ['labels']);
  const favoriteLabel = conversationLabelRepository.getFavoriteLabel();

  const favoriteConversations = useMemo(
    () => conversationLabelRepository.getLabelConversations(favoriteLabel, conversations),
    [conversationLabelRepository, conversations, favoriteLabel],
  );

  const isPreferences = currentTab === SidebarTabs.PREFERENCES;
  const isCells = currentTab === SidebarTabs.CELLS;
  const isMeetings = currentTab === SidebarTabs.MEETINGS;

  const showSearchInput = [
    SidebarTabs.RECENT,
    SidebarTabs.FOLDER,
    SidebarTabs.FAVORITES,
    SidebarTabs.GROUPS,
    SidebarTabs.CHANNELS,
    SidebarTabs.DIRECTS,
    SidebarTabs.ARCHIVES,
  ].includes(currentTab);

  const {setCurrentView} = useAppMainState(useShallow(state => state.responsiveView));
  const {openFolder, closeFolder, expandedFolder, isFoldersTabOpen, toggleFoldersTab} = useFolderStore(
    useShallow(state => state),
  );
  const {currentFocus, handleKeyDown, resetConversationFocus} = useConversationFocus(conversations);

  // false when screen is larger than 1000px
  // true when screen is smaller than 1000px
  const isScreenLessThanMdBreakpoint = useMatchMedia('(max-width: 1000px)');
  const isSideBarOpen = sidebarStatus === SidebarStatus.OPEN;

  useEffect(() => {
    if (isScreenLessThanMdBreakpoint) {
      setSidebarStatus(SidebarStatus.CLOSED);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.UI.SIDEBAR_COLLAPSE);
    }
  }, [isScreenLessThanMdBreakpoint, setSidebarStatus]);

  // Get conversations with drafts for the draft filter
  const allConversations = [...conversations, ...archivedConversations];
  const draftConversations = useDraftConversations(allConversations);

  const {conversations: currentTabConversations, searchInputPlaceholder} = getTabConversations({
    currentTab,
    conversations,
    conversationsFilter,
    archivedConversations,
    groupConversations,
    directConversations,
    favoriteConversations,
    channelConversations,
    isChannelsEnabled,
    channelAndGroupConversations,
    conversationFilter,
    draftConversations,
  });

  const currentFolder = labels
    .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
    .find(folder => folder.id === expandedFolder);

  const groupParticipantsConversations = getGroupParticipantsConversations({
    currentTab,
    conversationRepository,
    searchRepository,
    conversationsFilter,
    favoriteConversations,
    conversations: currentTabConversations,
    currentFolder,
    archivedConversations,
  });

  const isGroupParticipantsVisible =
    !!conversationsFilter &&
    ![SidebarTabs.DIRECTS, SidebarTabs.GROUPS, SidebarTabs.FAVORITES].includes(currentTab) &&
    groupParticipantsConversations.length > 0;

  const showConnectionRequests = [SidebarTabs.RECENT, SidebarTabs.DIRECTS].includes(currentTab);
  const hasVisibleConnectionRequests = connectRequests.length > 0 && showConnectionRequests;
  const hasVisibleConversations = currentTabConversations.length > 0;
  const hasNoVisbleConversations = !hasVisibleConversations && !hasVisibleConnectionRequests;

  const hasEmptyConversationsList =
    !isGroupParticipantsVisible &&
    ((showSearchInput && hasNoVisbleConversations) ||
      (hasNoVisbleConversations && currentTab !== SidebarTabs.ARCHIVES));

  const toggleSidebar = useCallback(() => {
    if (isFoldersTabOpen) {
      toggleFoldersTab();
    }

    setSidebarStatus(isSideBarOpen ? SidebarStatus.CLOSED : SidebarStatus.OPEN);
    amplify.publish(
      WebAppEvents.ANALYTICS.EVENT,
      isSideBarOpen ? EventName.UI.SIDEBAR_COLLAPSE : EventName.UI.SIDEBAR_UNCOLLAPSE,
    );
  }, [isFoldersTabOpen, isSideBarOpen, setSidebarStatus, toggleFoldersTab]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, (conversation?: Conversation) => {
      if (!conversation) {
        return;
      }

      const includesConversation = currentTabConversations.includes(conversation);

      if (!includesConversation) {
        setCurrentTab(SidebarTabs.RECENT);
      }
    });
  }, [currentTabConversations]);

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

  const clearConversationFilter = useCallback(() => setConversationsFilter(''), []);

  const switchList = listViewModel.switchList;
  const switchContent = listViewModel.contentViewModel.switchContent;

  const onExitPreferences = useCallback(() => {
    setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR);
    switchList(ListState.CONVERSATIONS);
    switchContent(ContentState.CONVERSATION);
  }, []);

  const changeTab = useCallback(
    (nextTab: SidebarTabs, folderId?: string) => {
      if (!folderId) {
        closeFolder();
      }

      if (nextTab === SidebarTabs.ARCHIVES) {
        // will eventually load missing events from the db
        void conversationRepository.updateArchivedConversations();
      }

      if (![SidebarTabs.PREFERENCES, SidebarTabs.CELLS, SidebarTabs.MEETINGS].includes(nextTab)) {
        onExitPreferences();
      }

      if (nextTab === SidebarTabs.CELLS) {
        switchList(ListState.CELLS);
        switchContent(ContentState.CELLS);
      }

      if (nextTab === SidebarTabs.MEETINGS) {
        switchList(ListState.MEETINGS);
        switchContent(ContentState.MEETINGS);
      }

      clearConversationFilter();
      setCurrentTab(nextTab);
    },
    [conversationRepository],
  );

  const onClickPreferences = useCallback((itemId: ContentState) => {
    switchList(ListState.PREFERENCES);
    setCurrentView(ViewType.MOBILE_CENTRAL_COLUMN);
    switchContent(itemId);

    setTimeout(() => {
      const centerColumn = document.getElementById('center-column');
      const nextElementToFocus = centerColumn?.querySelector("[tabindex='0']") as HTMLElement | null;
      nextElementToFocus?.focus();
    }, ANIMATED_PAGE_TRANSITION_DURATION + 1);
  }, []);

  const handleEnterSearchClick = useCallback(
    (event: ReactKeyBoardEvent<HTMLDivElement>) => {
      const firstFoundConversation = currentTabConversations?.[0];

      if (firstFoundConversation) {
        createNavigateKeyboard(generateConversationUrl(firstFoundConversation.qualifiedId), true)(event);
        setConversationsFilter('');
        scrollToConversation(firstFoundConversation.id);
      }
    },
    [currentTabConversations],
  );

  const onSearch = useCallback(
    (searchValue: string) => {
      setConversationsFilter(searchValue);
      conversationListRef?.scrollTo(0, 0);
    },
    [conversationListRef],
  );

  const jumpToRecentSearch = useCallback(() => {
    switchList(ListState.CONVERSATIONS);
    setCurrentTab(SidebarTabs.RECENT);
  }, []);

  return (
    <div className="conversations-wrapper">
      <div className="conversations-sidebar-spacer" css={conversationsSpacerStyles(isScreenLessThanMdBreakpoint)} />
      <ListWrapper
        id="conversations"
        headerElement={
          <ConversationHeader
            currentFolder={currentFolder}
            currentTab={currentTab}
            selfUser={selfUser}
            showSearchInput={(showSearchInput && hasVisibleConversations) || !!conversationsFilter}
            searchValue={conversationsFilter}
            setSearchValue={onSearch}
            searchInputPlaceholder={searchInputPlaceholder}
            onSearchEnterClick={handleEnterSearchClick}
            jumpToRecentSearch={jumpToRecentSearch}
            searchInputRef={searchInputRef}
          />
        }
        conversationListRef={conversationListRef}
        setConversationListRef={setConversationListRef}
        hasHeader={!isPreferences}
        sidebar={
          !isTemporaryGuest && (
            <ConversationSidebar
              isOpen={isSideBarOpen}
              toggleOpen={toggleSidebar}
              isScreenLessThanMdBreakpoint={isScreenLessThanMdBreakpoint}
              selfUser={selfUser}
              conversationState={conversationState}
              isTeam={isTeam}
              changeTab={changeTab}
              currentTab={currentTab}
              groupConversations={groupConversations}
              directConversations={directConversations}
              unreadConversations={unreadConversations}
              favoriteConversations={favoriteConversations}
              archivedConversations={archivedConversations}
              conversationRepository={conversationRepository}
              onClickPreferences={onClickPreferences}
              showNotificationsBadge={notifications.length > 0}
              channelConversations={channelConversations}
            />
          )
        }
        footer={
          <ConversationCallingView
            activeCalls={activeCalls}
            listViewModel={listViewModel}
            classifiedDomains={classifiedDomains}
            propertiesRepository={propertiesRepository}
          />
        }
      >
        {isCells || isMeetings ? null : isPreferences ? (
          <Preferences
            onPreferenceItemClick={onClickPreferences}
            teamRepository={teamRepository}
            preferenceNotificationRepository={preferenceNotificationRepository}
            {...(isTemporaryGuest && {
              onClose: onExitPreferences,
            })}
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

            {hasEmptyConversationsList && (
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
                currentFocus={currentFocus}
                listViewModel={listViewModel}
                connectRequests={showConnectionRequests ? connectRequests : []}
                handleArrowKeyDown={handleKeyDown}
                conversationState={conversationState}
                conversations={currentTabConversations}
                resetConversationFocus={resetConversationFocus}
                clearSearchFilter={clearConversationFilter}
                isEmpty={hasEmptyConversationsList}
                groupParticipantsConversations={groupParticipantsConversations}
                isGroupParticipantsVisible={isGroupParticipantsVisible}
                searchInputRef={searchInputRef}
              />
            )}
          </>
        )}
      </ListWrapper>
    </div>
  );
};
