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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {CircleCloseIcon, GroupIcon, Input, SearchIcon, StarIcon} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {CallingCell} from 'Components/calling/CallingCell';
import {Icon} from 'Components/Icon';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {UserInfo} from 'Components/UserInfo';
import {UserVerificationBadges} from 'Components/VerificationBadge';
import {Config} from 'src/script/Config';
import {
  closeIconStyles,
  searchIconStyles,
  searchInputStyles,
  searchInputWrapperStyles,
} from 'src/script/page/LeftSidebar/panels/Conversations/Conversations.styles';
import {ListState} from 'src/script/page/useAppState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {ConversationsList} from './ConversationsList';
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
import {AvailabilityContextMenu} from '../../../../ui/AvailabilityContextMenu';
import {Shortcut} from '../../../../ui/Shortcut';
import {ShortcutType} from '../../../../ui/ShortcutType';
import {UserState} from '../../../../user/UserState';
import {ListViewModel} from '../../../../view_model/ListViewModel';
import {useAppMainState, ViewType} from '../../../state';
import {ListWrapper} from '../ListWrapper';

type ConversationsProps = {
  callState?: CallState;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  listViewModel: ListViewModel;
  preferenceNotificationRepository: PreferenceNotificationRepository;
  propertiesRepository: PropertiesRepository;
  selfUser: User;
  switchList: (list: ListState) => void;
  teamState?: TeamState;
  userState?: UserState;
};

export enum ConversationViewStyle {
  RECENT,
  FOLDER,
  FAVORITES,
  GROUPS,
}

const Conversations: React.FC<ConversationsProps> = ({
  propertiesRepository,
  conversationRepository,
  preferenceNotificationRepository,
  listViewModel,
  conversationState = container.resolve(ConversationState),
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
  userState = container.resolve(UserState),
  selfUser,
  switchList,
}) => {
  const [conversationsFilter, setConversationsFilter] = useState<string>('');
  const {
    name: userName,
    isOnLegalHold,
    hasPendingLegalHold,
  } = useKoSubscribableChildren(selfUser, ['hasPendingLegalHold', 'isOnLegalHold', 'name']);
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
  const totalUnreadGroupConversations = groupConversations.filter(conversation => conversation.hasUnread()).length;

  const totalUnreadConversations = unreadConversations.length;

  const totalUnreadFavoriteConversations = favoriteConversations.filter(favoriteConversation =>
    favoriteConversation.hasUnread(),
  ).length;

  const totalUnreadArchivedConversations = archivedConversations.filter(conversation =>
    conversation.hasUnread(),
  ).length;

  const {notifications} = useKoSubscribableChildren(preferenceNotificationRepository, ['notifications']);
  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);

  const filteredConversations = conversations.filter(conversation =>
    conversation.display_name().toLowerCase().includes(conversationsFilter.toLowerCase()),
  );

  const initialViewStyle = propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS)
    ? ConversationViewStyle.FOLDER
    : ConversationViewStyle.RECENT;

  const [viewStyle, setViewStyle] = useState<ConversationViewStyle>(initialViewStyle);
  const showBadge = notifications.length > 0;

  const isRecentViewStyle = viewStyle === ConversationViewStyle.RECENT;
  const isFolderViewStyle = viewStyle === ConversationViewStyle.FOLDER;
  const isFavoritesViewStyle = viewStyle === ConversationViewStyle.FAVORITES;
  const isGroupsViewStyle = viewStyle === ConversationViewStyle.GROUPS;

  const hasNoConversations = conversations.length + connectRequests.length === 0;
  const {isOpen: isFolderOpen, openFolder} = useFolderState();

  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const {close: closeRightSidebar} = useAppMainState(state => state.rightSidebar);

  const showLegalHold = isOnLegalHold || hasPendingLegalHold;

  const onClickPreferences = () => {
    setCurrentView(ViewType.LEFT_SIDEBAR);
    switchList(ListState.PREFERENCES);
    closeRightSidebar();
  };

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
    propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS, isFolderViewStyle);
  }, [isFolderViewStyle]);

  const header = (
    <>
      <button
        type="button"
        className={cx(`conversations-settings-button accent-text`, {'conversations-settings--badge': showBadge})}
        title={t('tooltipConversationsPreferences')}
        onClick={onClickPreferences}
        data-uie-name="go-preferences"
      >
        <Icon.Settings />
      </button>

      {teamState.isTeam() ? (
        <>
          <button
            type="button"
            className="left-list-header-availability"
            css={{...(showLegalHold && {gridColumn: '2/3'})}}
            onClick={event => AvailabilityContextMenu.show(event.nativeEvent, 'left-list-availability-menu')}
          >
            <UserInfo user={selfUser} className="availability-state" dataUieName="status-availability" showAvailability>
              <UserVerificationBadges
                user={selfUser}
                isSelfUser
                groupId={conversationState.selfMLSConversation()?.groupId}
              />
            </UserInfo>
          </button>

          {showLegalHold && (
            <LegalHoldDot
              isPending={hasPendingLegalHold}
              dataUieName={hasPendingLegalHold ? 'status-legal-hold-pending' : 'status-legal-hold'}
              showText
              isInteractive
            />
          )}
        </>
      ) : (
        <span
          className="left-list-header-text"
          data-uie-name="status-name"
          role="presentation"
          tabIndex={TabIndex.FOCUSABLE}
        >
          {userName}
        </span>
      )}
    </>
  );

  const sidebar = (
    <nav className="conversations-sidebar">
      <div
        role="tablist"
        aria-label={t('accessibility.headings.sidebar')}
        aria-owns="tab-1 tab-2 tab-3 tab-4 tab-5 tab-6"
        className="conversations-sidebar-list"
      >
        <div className="conversations-sidebar-title">{t('videoCallOverlayConversations')}</div>

        <button
          id="tab-1"
          type="button"
          role="tab"
          className={cx(`conversations-sidebar-btn`, {active: isRecentViewStyle})}
          onClick={() => setViewStyle(ConversationViewStyle.RECENT)}
          title={t('conversationViewTooltip')}
          data-uie-name="go-recent-view"
          data-uie-status={isRecentViewStyle ? 'active' : 'inactive'}
          aria-selected={isRecentViewStyle}
        >
          <span className="conversations-sidebar-btn--text-wrapper">
            <Icon.ConversationsOutline />
            <span className="conversations-sidebar-btn--text">{t('conversationViewTooltip')}</span>
          </span>
          {totalUnreadConversations > 0 && (
            <span className="conversations-sidebar-btn--badge">{unreadConversations.length}</span>
          )}
        </button>

        <button
          id="tab-2"
          type="button"
          role="tab"
          className={cx(`conversations-sidebar-btn`, {active: isFavoritesViewStyle})}
          onClick={() => setViewStyle(ConversationViewStyle.FAVORITES)}
          title={t('conversationLabelFavorites')}
          data-uie-name="go-favorites-view"
          data-uie-status={isFavoritesViewStyle ? 'active' : 'inactive'}
          aria-selected={isFavoritesViewStyle}
        >
          <span className="conversations-sidebar-btn--text-wrapper">
            <StarIcon />
            <span className="conversations-sidebar-btn--text">{t('conversationLabelFavorites')}</span>
          </span>
          {totalUnreadFavoriteConversations > 0 && (
            <span className="conversations-sidebar-btn--badge">{totalUnreadFavoriteConversations}</span>
          )}
        </button>

        <button
          id="tab-3"
          type="button"
          role="tab"
          className={cx(`conversations-sidebar-btn`, {active: isGroupsViewStyle})}
          onClick={() => setViewStyle(ConversationViewStyle.GROUPS)}
          title={t('conversationLabelGroups')}
          data-uie-name="go-favorites-view"
          data-uie-status={isGroupsViewStyle ? 'active' : 'inactive'}
          aria-selected={isGroupsViewStyle}
        >
          <span className="conversations-sidebar-btn--text-wrapper">
            <GroupIcon />
            <span className="conversations-sidebar-btn--text">{t('conversationLabelGroups')}</span>
          </span>
          {totalUnreadGroupConversations > 0 && (
            <span className="conversations-sidebar-btn--badge">{totalUnreadGroupConversations}</span>
          )}
        </button>

        <button
          id="tab-4"
          type="button"
          role="tab"
          className={cx(`conversations-sidebar-btn`, {active: isFolderViewStyle})}
          onClick={() => setViewStyle(ConversationViewStyle.FOLDER)}
          title={t('folderViewTooltip')}
          data-uie-name="go-folder-view"
          data-uie-status={isFolderViewStyle ? 'active' : 'inactive'}
          aria-selected={isFolderViewStyle}
        >
          <span className="conversations-sidebar-btn--text-wrapper">
            <Icon.ConversationsFolder />
            <span className="conversations-sidebar-btn--text">{t('folderViewTooltip')}</span>
          </span>
          {totalUnreadConversations > 0 && (
            <span className="conversations-sidebar-btn--badge">{totalUnreadConversations}</span>
          )}
        </button>

        {archivedConversations.length > 0 && (
          <button
            id="tab-5"
            type="button"
            className="conversations-sidebar-btn"
            data-uie-name="go-archive"
            onClick={() => switchList(ListState.ARCHIVE)}
            title={t('tooltipConversationsArchived', archivedConversations.length)}
          >
            <span className="conversations-sidebar-btn--text-wrapper">
              <Icon.Archive />
              <span className="conversations-sidebar-btn--text">{t('conversationFooterArchive')}</span>
            </span>
            {totalUnreadArchivedConversations > 0 && (
              <span className="conversations-sidebar-btn--badge">{totalUnreadArchivedConversations}</span>
            )}
          </button>
        )}
        <div className="conversations-sidebar-title">{t('conversationFooterContacts')}</div>
        <button
          id="tab-6"
          type="button"
          className="conversations-sidebar-btn"
          onClick={() => switchList(ListState.START_UI)}
          title={t('searchConnect', Shortcut.getShortcutTooltip(ShortcutType.START))}
          data-uie-name="go-people"
        >
          <span className="conversations-sidebar-btn--text-wrapper">
            <Icon.Plus className="people-outline" />
            <span className="conversations-sidebar-btn--text">{t('searchConnect')}</span>
          </span>
        </button>
      </div>
    </nav>
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

  function getViewStyleConversations() {
    if (viewStyle === ConversationViewStyle.FOLDER || viewStyle === ConversationViewStyle.RECENT) {
      return filteredConversations;
    }

    if (viewStyle === ConversationViewStyle.GROUPS) {
      return groupConversations;
    }

    if (viewStyle === ConversationViewStyle.FAVORITES) {
      return favoriteConversations;
    }

    return [];
  }

  return (
    <div className="conversations-wrapper">
      <ListWrapper id="conversations" headerElement={header} sidebar={sidebar} before={callingView}>
        {hasNoConversations ? (
          <>
            {archivedConversations.length === 0 ? (
              <div className="conversations-centered">
                <div>
                  {t('conversationsWelcome', {
                    brandName: Config.getConfig().BRAND_NAME,
                  })}
                </div>
                <button className="button-reset-default text-underline" onClick={() => switchList(ListState.START_UI)}>
                  {t('conversationsNoConversations')}
                </button>
              </div>
            ) : (
              <div className="conversations-all-archived">{t('conversationsAllArchived')}</div>
            )}
          </>
        ) : (
          <>
            {isRecentViewStyle && (
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
                placeholder={t('searchConversations')}
              />
            )}
            {filteredConversations.length === 0 && (
              <div className="conversations-centered">
                <div>{t('searchConversationsNoResult')}</div>
                <button className="button-reset-default text-underline" onClick={() => switchList(ListState.START_UI)}>
                  {t('searchConversationsNoResultConnectSuggestion')}
                </button>
              </div>
            )}
            <ConversationsList
              connectRequests={connectRequests}
              callState={callState}
              conversations={getViewStyleConversations()}
              viewStyle={viewStyle}
              listViewModel={listViewModel}
              conversationState={conversationState}
              conversationRepository={conversationRepository}
              currentFocus={currentFocus}
              resetConversationFocus={resetConversationFocus}
              handleArrowKeyDown={handleKeyDown}
            />
          </>
        )}
      </ListWrapper>
    </div>
  );
};

export {Conversations};
