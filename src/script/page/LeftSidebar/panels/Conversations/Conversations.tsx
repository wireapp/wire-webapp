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

import {CircleCloseIcon, GroupIcon, Input, SearchIcon, StarIcon, InfoIcon, ChevronIcon} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {CallingCell} from 'Components/calling/CallingCell';
import {Icon} from 'Components/Icon';
import {Config} from 'src/script/Config';
import {Conversation} from 'src/script/entity/Conversation';
import {IntegrationRepository} from 'src/script/integration/IntegrationRepository';
import {
  closeIconStyles,
  searchIconStyles,
  searchInputStyles,
  searchInputWrapperStyles,
} from 'src/script/page/LeftSidebar/panels/Conversations/Conversations.styles';
import {Preferences} from 'src/script/page/LeftSidebar/panels/Preferences';
import {StartUI} from 'src/script/page/LeftSidebar/panels/StartUI';
import {ANIMATED_PAGE_TRANSITION_DURATION} from 'src/script/page/MainContent';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {ContentState, ListState} from 'src/script/page/useAppState';
import {SearchRepository} from 'src/script/search/SearchRepository';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {ConversationsList} from './ConversationsList';
import {ConversationTab} from './ConversationTab';
import {useFolderState} from './state';

import {CallState} from '../../../../calling/CallState';
import {DefaultLabelIds} from '../../../../conversation/ConversationLabelRepository';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {User} from '../../../../entity/User';
import {useConversationFocus} from '../../../../hooks/useConversationFocus';
import {PreferenceNotificationRepository} from '../../../../notification/PreferenceNotificationRepository';
import {PropertiesRepository} from '../../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../../properties/PropertiesType';
import {TeamState} from '../../../../team/TeamState';
import {Shortcut} from '../../../../ui/Shortcut';
import {ShortcutType} from '../../../../ui/ShortcutType';
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
  listState: ListState;
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
  listState,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [conversationsFilter, setConversationsFilter] = useState<string>('');
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {connectRequests} = useKoSubscribableChildren(userState, ['connectRequests']);
  const {activeConversation, unreadConversations} = useKoSubscribableChildren(conversationState, [
    'activeConversation',
    'archivedConversations',
    'unreadConversations',
  ]);

  const {archivedConversations, visibleConversations: conversations} = useKoSubscribableChildren(conversationState, [
    'archivedConversations',
    'visibleConversations',
  ]);

  const {conversationLabelRepository} = conversationRepository;

  const favoriteConversations = conversationLabelRepository.getFavorites(conversations);
  const groupConversations = conversations.filter(conversation => conversation.isGroup());
  const directConversations = conversations.filter(conversation => conversation.is1to1());

  const totalUnreadConversations = unreadConversations.length;

  const totalUnreadFavoriteConversations = favoriteConversations.filter(favoriteConversation =>
    favoriteConversation.hasUnread(),
  ).length;

  const totalUnreadArchivedConversations = archivedConversations.filter(conversation =>
    conversation.hasUnread(),
  ).length;

  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);

  const initialTab = propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS)
    ? SidebarTabs.FOLDER
    : SidebarTabs.RECENT;

  const [currentTab, setCurrentTab] = useState<SidebarTabs>(initialTab);

  const isRecentTab = currentTab === SidebarTabs.RECENT;
  const isFolderTab = currentTab === SidebarTabs.FOLDER;
  const isFavoritesTab = currentTab === SidebarTabs.FAVORITES;
  const isGroupsTab = currentTab === SidebarTabs.GROUPS;
  const isDirectsTab = currentTab === SidebarTabs.DIRECTS;
  const isArchivesTab = currentTab === SidebarTabs.ARCHIVES;
  const isConnectTab = currentTab === SidebarTabs.CONNECT;
  const isPreferences = currentTab === SidebarTabs.PREFERENCES;

  const showSearchInput = isRecentTab || isFolderTab || isFavoritesTab || isGroupsTab || isDirectsTab || isArchivesTab;

  const hasNoConversations = conversations.length + connectRequests.length === 0;
  const {isOpen: isFolderOpen, openFolder} = useFolderState();

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

    const conversationLabels = conversationLabelRepository.getConversationLabelIds(activeConversation);
    amplify.subscribe(WebAppEvents.CONTENT.EXPAND_FOLDER, openFolder);

    if (!conversationLabels.some(isFolderOpen)) {
      openFolder(conversationLabels[0]);
    }

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

  function changeTab(nextTab: SidebarTabs) {
    if (nextTab === SidebarTabs.ARCHIVES) {
      // will eventually load missing events from the db
      conversationRepository.updateArchivedConversations();
    }

    if (
      nextTab !== SidebarTabs.PREFERENCES
      //  && isPreferences
    ) {
      onExitPreferences();
      // switchList(ListState.CONVERSATIONS);
      // listViewModel.contentViewModel.switchContent(ContentState.COLLECTION);
    }

    setConversationsFilter('');
    setCurrentTab(nextTab);
  }

  const conversationTabs = [
    {
      type: SidebarTabs.RECENT,
      title: t('conversationViewTooltip'),
      dataUieName: 'go-recent-view',
      Icon: <Icon.ConversationsOutline />,
      unreadConversations: unreadConversations.length,
    },
    {
      type: SidebarTabs.FAVORITES,
      title: t('conversationLabelFavorites'),
      dataUieName: 'go-favorites-view',
      Icon: <StarIcon />,
      unreadConversations: totalUnreadFavoriteConversations,
    },
    {
      type: SidebarTabs.GROUPS,
      title: t('conversationLabelGroups'),
      dataUieName: 'go-groups-view',
      Icon: <GroupIcon />,
      unreadConversations: groupConversations.filter(conversation => conversation.hasUnread()).length,
    },
    {
      type: SidebarTabs.DIRECTS,
      title: t('conversationLabelDirects'),
      dataUieName: 'go-directs-view',
      Icon: <Icon.People />,
      unreadConversations: directConversations.filter(conversation => conversation.hasUnread()).length,
    },
    {
      type: SidebarTabs.FOLDER,
      title: t('folderViewTooltip'),
      dataUieName: 'go-folders-view',
      Icon: <Icon.ConversationsFolder />,
      unreadConversations: totalUnreadConversations,
    },
    {
      hideTab: archivedConversations.length === 0,
      type: SidebarTabs.ARCHIVES,
      title: t('tooltipConversationsArchived', archivedConversations.length),
      label: t('conversationFooterArchive'),
      dataUieName: 'go-archive',
      Icon: <Icon.Archive />,
      unreadConversations: totalUnreadArchivedConversations,
    },
  ];

  const sidebar = (
    <div className="conversations-sidebar-wrapper">
      <nav className="conversations-sidebar" data-is-collapsed={isSidebarCollapsed}>
        <div className="conversations-sidebar-items">
          <UserDetails
            user={selfUser}
            groupId={conversationState.selfMLSConversation()?.groupId}
            isTeam={teamState.isTeam()}
          />

          <div
            role="tablist"
            aria-label={t('accessibility.headings.sidebar')}
            aria-owns="tab-1 tab-2 tab-3 tab-4 tab-5 tab-6 tab-7"
            className="conversations-sidebar-list"
          >
            <div className="conversations-sidebar-title">{t('videoCallOverlayConversations')}</div>

            {conversationTabs.map((conversationTab, index) => {
              if (conversationTab.hideTab) {
                return null;
              }

              return (
                <ConversationTab
                  {...conversationTab}
                  key={conversationTab.type}
                  conversationTabIndex={index + 1}
                  onChangeTab={changeTab}
                  isActive={conversationTab.type === currentTab}
                />
              );
            })}

            <div className="conversations-sidebar-title">{t('conversationFooterContacts')}</div>

            <ConversationTab
              title={t('searchConnect', Shortcut.getShortcutTooltip(ShortcutType.START))}
              label={t('searchConnect')}
              type={SidebarTabs.CONNECT}
              Icon={<Icon.Plus />}
              onChangeTab={changeTab}
              conversationTabIndex={conversationTabs.length + 1}
              dataUieName="go-people"
              isActive={isConnectTab}
            />
          </div>

          <div
            role="tablist"
            aria-label={t('accessibility.headings.sidebar.footer')}
            aria-owns="tab-1 tab-2"
            className="conversations-sidebar-list-footer"
          >
            <ConversationTab
              title={t('preferencesHeadline', Shortcut.getShortcutTooltip(ShortcutType.START))}
              label={t('preferencesHeadline')}
              type={SidebarTabs.PREFERENCES}
              Icon={<Icon.Settings />}
              onChangeTab={tab => {
                changeTab(tab);
                onClickPreferences(ContentState.PREFERENCES_ACCOUNT);
              }}
              conversationTabIndex={1}
              dataUieName="go-preferences"
              isActive={isPreferences}
            />

            <a
              rel="nofollow noopener noreferrer"
              target="_blank"
              href={Config.getConfig().URL.SUPPORT.INDEX}
              id="tab-2"
              type="button"
              className="conversations-sidebar-btn"
              title={t('preferencesAboutSupport', Shortcut.getShortcutTooltip(ShortcutType.START))}
              data-uie-name="go-people"
            >
              <span className="conversations-sidebar-btn--text-wrapper">
                <InfoIcon />
                <span className="conversations-sidebar-btn--text">{t('preferencesAboutSupport')}</span>
              </span>
            </a>
          </div>
        </div>
      </nav>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="conversations-sidebar-handle" onClick={() => setIsSidebarCollapsed(previous => !previous)}>
        <div className="conversations-sidebar-handle-icon" data-is-collapsed={isSidebarCollapsed}>
          <ChevronIcon width={12} height={12} />
        </div>
      </div>
    </div>
  );

  const callingView = (
    <>
      {activeCalls.map(call => {
        const conversation = conversationState.findConversation(call.conversationId);
        const callingViewModel = listViewModel.callingViewModel;
        const callingRepository = callingViewModel.callingRepository;

        return (
          conversation && (
            <div className="calling-cell" key={conversation.id}>
              <CallingCell
                classifiedDomains={classifiedDomains}
                call={call}
                callActions={callingViewModel.callActions}
                callingRepository={callingRepository}
                conversation={conversation}
                isFullUi
                hasAccessToCamera={callingViewModel.hasAccessToCamera()}
                isSelfVerified={selfUser.is_verified()}
                multitasking={callingViewModel.multitasking}
              />
            </div>
          )
        );
      })}
    </>
  );

  const {currentFocus, handleKeyDown, resetConversationFocus} = useConversationFocus(conversations);

  function conversationSearchFilter(conversation: Conversation) {
    return conversation.display_name().toLowerCase().includes(conversationsFilter.toLowerCase());
  }

  function getTabConversations() {
    if ([SidebarTabs.FOLDER, SidebarTabs.RECENT].includes(currentTab)) {
      return {
        conversations: conversations.filter(conversationSearchFilter),
        searchInputPlaceholder: t('searchConversations'),
      };
    }

    if (currentTab === SidebarTabs.GROUPS) {
      return {
        conversations: groupConversations.filter(conversationSearchFilter),
        searchInputPlaceholder: t('searchGroupConversations'),
      };
    }

    if (currentTab === SidebarTabs.DIRECTS) {
      return {
        conversations: directConversations.filter(conversationSearchFilter),
        searchInputPlaceholder: t('searchDirectConversations'),
      };
    }

    if (currentTab === SidebarTabs.FAVORITES) {
      return {
        conversations: favoriteConversations.filter(conversationSearchFilter),
        searchInputPlaceholder: t('searchFavoriteConversations'),
      };
    }

    if (currentTab === SidebarTabs.ARCHIVES) {
      return {
        conversations: archivedConversations.filter(conversationSearchFilter),
        searchInputPlaceholder: t('searchArchivedConversations'),
      };
    }

    return {
      conversations: [],
      searchInputPlaceholder: '',
    };
  }

  const {conversations: currentTabConversations, searchInputPlaceholder} = getTabConversations();

  const {setCurrentView} = useAppMainState(state => state.responsiveView);

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

  function getListWrapperItems() {
    if (isPreferences) {
      return (
        <Preferences
          onPreferenceItemClick={onClickPreferences}
          teamRepository={teamRepository}
          preferenceNotificationRepository={preferenceNotificationRepository}
        />
      );
    }

    return hasNoConversations ? (
      <>
        {archivedConversations.length === 0 ? (
          <div className="conversations-centered">
            <div>
              {t('conversationsWelcome', {
                brandName: Config.getConfig().BRAND_NAME,
              })}
            </div>
            <button className="button-reset-default text-underline" onClick={() => changeTab(SidebarTabs.CONNECT)}>
              {t('conversationsNoConversations')}
            </button>
          </div>
        ) : (
          <div className="conversations-all-archived">{t('conversationsAllArchived')}</div>
        )}
      </>
    ) : (
      <>
        {showSearchInput && (
          <Input
            className="label-1"
            value={conversationsFilter}
            onChange={event => {
              setConversationsFilter(event.currentTarget.value);
            }}
            startContent={<SearchIcon width={14} height={14} css={searchIconStyles} />}
            endContent={
              conversationsFilter && (
                <CircleCloseIcon
                  className="cursor-pointer"
                  onClick={() => setConversationsFilter('')}
                  css={closeIconStyles}
                />
              )
            }
            inputCSS={searchInputStyles}
            wrapperCSS={searchInputWrapperStyles}
            placeholder={searchInputPlaceholder}
          />
        )}
        {showSearchInput && currentTabConversations.length === 0 && (
          <div className="conversations-centered">
            <div>{t('searchConversationsNoResult')}</div>
            <button className="button-reset-default text-underline" onClick={() => changeTab(SidebarTabs.CONNECT)}>
              {t('searchConversationsNoResultConnectSuggestion')}
            </button>
          </div>
        )}

        {isConnectTab && (
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

        {showSearchInput && (
          <ConversationsList
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
    );
  }

  return (
    <div className="conversations-wrapper">
      <ListWrapper id="conversations" headerElement={<></>} hasHeader={false} sidebar={sidebar} before={callingView}>
        {getListWrapperItems()}
      </ListWrapper>
    </div>
  );
};

export {Conversations};
