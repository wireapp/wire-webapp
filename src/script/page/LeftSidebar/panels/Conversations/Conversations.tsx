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

import {WebAppEvents} from '@wireapp/webapp-events';

import {AvailabilityState} from 'Components/AvailabilityState';
import {CallingCell} from 'Components/calling/CallingCell';
import {Icon} from 'Components/Icon';
import {LegalHoldDot} from 'Components/LegalHoldDot';
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
  const {
    name: userName,
    availability: userAvailability,
    isOnLegalHold,
    hasPendingLegalHold,
  } = useKoSubscribableChildren(selfUser, ['hasPendingLegalHold', 'isOnLegalHold', 'name', 'availability']);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {connectRequests} = useKoSubscribableChildren(userState, ['connectRequests']);
  const {activeConversation} = useKoSubscribableChildren(conversationState, ['activeConversation']);
  const {archivedConversations, visibleConversations: conversations} = useKoSubscribableChildren(conversationState, [
    'archivedConversations',
    'visibleConversations',
  ]);
  const {notifications} = useKoSubscribableChildren(preferenceNotificationRepository, ['notifications']);
  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);

  const initialViewStyle = propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS)
    ? ConversationViewStyle.FOLDER
    : ConversationViewStyle.RECENT;

  const [viewStyle, setViewStyle] = useState<ConversationViewStyle>(initialViewStyle);
  const showBadge = notifications.length > 0;

  const isRecentViewStyle = viewStyle === ConversationViewStyle.RECENT;
  const isFolderViewStyle = viewStyle === ConversationViewStyle.FOLDER;

  const hasNoConversations = conversations.length + connectRequests.length === 0;
  const {isOpen: isFolderOpen, openFolder} = useFolderState();

  const {conversationLabelRepository} = conversationRepository;

  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const {close: closeRightSidebar} = useAppMainState(state => state.rightSidebar);

  const showLegalHold = isOnLegalHold || hasPendingLegalHold;

  const onClickPreferences = () => {
    setCurrentView(ViewType.LEFT_SIDEBAR);
    switchList(ListState.PREFERENCES);
    closeRightSidebar();
  };

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
            <AvailabilityState
              className="availability-state"
              availability={userAvailability}
              dataUieName="status-availability"
              label={userName}
              showBadges
            />
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

  const footer = (
    <nav className="conversations-footer">
      <div
        role="tablist"
        aria-label={t('accessibility.headings.sidebar')}
        aria-owns="tab-1 tab-2 tab-3"
        className="conversations-footer-list"
      >
        <button
          id="tab-1"
          type="button"
          className="conversations-footer-btn"
          onClick={() => switchList(ListState.START_UI)}
          title={t('tooltipConversationsStart', Shortcut.getShortcutTooltip(ShortcutType.START))}
          data-uie-name="go-people"
        >
          <Icon.PeopleOutline className="people-outline" />
          <span className="conversations-footer-btn--text">{t('conversationFooterContacts')}</span>
        </button>

        <button
          id="tab-2"
          type="button"
          role="tab"
          className={cx(`conversations-footer-btn`, {active: isRecentViewStyle})}
          onClick={() => setViewStyle(ConversationViewStyle.RECENT)}
          title={t('conversationViewTooltip')}
          data-uie-name="go-recent-view"
          data-uie-status={isRecentViewStyle ? 'active' : 'inactive'}
          aria-selected={isRecentViewStyle}
        >
          <Icon.ConversationsOutline className={cx('conversations-outline', {active: isRecentViewStyle})} />
          <span className="conversations-footer-btn--text">{t('conversationViewTooltip')}</span>
        </button>

        <button
          id="tab-3"
          type="button"
          role="tab"
          className={cx(`conversations-footer-btn`, {active: isFolderViewStyle})}
          onClick={() => setViewStyle(ConversationViewStyle.FOLDER)}
          title={t('folderViewTooltip')}
          data-uie-name="go-folder-view"
          data-uie-status={isFolderViewStyle ? 'active' : 'inactive'}
          aria-selected={isFolderViewStyle}
        >
          <Icon.FoldersOutline className={cx('folders-outline', {active: isFolderViewStyle})} />
          <span className="conversations-footer-btn--text">{t('folderViewTooltip')}</span>
        </button>

        {archivedConversations.length > 0 && (
          <button
            type="button"
            className="conversations-footer-btn"
            data-uie-name="go-archive"
            onClick={() => switchList(ListState.ARCHIVE)}
            title={t('tooltipConversationsArchived', archivedConversations.length)}
          >
            <Icon.ArchiveOutline className="archive-outline" />
            <span className="conversations-footer-btn--text">{t('conversationFooterArchive')}</span>
          </button>
        )}
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

  return (
    <ListWrapper id="conversations" headerElement={header} footer={footer} before={callingView}>
      {hasNoConversations ? (
        <>
          {archivedConversations.length === 0 ? (
            <div className="conversations-hint" data-uie-name="status-start-conversation-hint">
              <div className="conversations-hint-text">{t('conversationsNoConversations')}</div>
              <Icon.ArrowDownLong className="conversations-hint-arrow" />
            </div>
          ) : (
            <div className="conversations-all-archived">{t('conversationsAllArchived')}</div>
          )}
        </>
      ) : (
        <ConversationsList
          connectRequests={connectRequests}
          callState={callState}
          conversations={conversations}
          viewStyle={viewStyle}
          listViewModel={listViewModel}
          conversationState={conversationState}
          conversationRepository={conversationRepository}
          currentFocus={currentFocus}
          resetConversationFocus={resetConversationFocus}
          handleArrowKeyDown={handleKeyDown}
        />
      )}
    </ListWrapper>
  );
};

export {Conversations};
