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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import AvailabilityState from 'Components/AvailabilityState';
import Icon from 'Components/Icon';
import LegalHoldDot from 'Components/LegalHoldDot';
import ConversationListCallingCell from 'Components/list/ConversationListCallingCell';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isTabKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {ConversationsList} from './ConversationsList';
import {useFolderState} from './state';

import {CallState} from '../../../../calling/CallState';
import {DefaultLabelIds} from '../../../../conversation/ConversationLabelRepository';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {User} from '../../../../entity/User';
import useRoveFocus from '../../../../hooks/useRoveFocus';
import {useMLSConversationState} from '../../../../mls/mlsConversationState';
import {PreferenceNotificationRepository} from '../../../../notification/PreferenceNotificationRepository';
import {PropertiesRepository} from '../../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../../properties/PropertiesType';
import {TeamState} from '../../../../team/TeamState';
import {AvailabilityContextMenu} from '../../../../ui/AvailabilityContextMenu';
import {Shortcut} from '../../../../ui/Shortcut';
import {ShortcutType} from '../../../../ui/ShortcutType';
import {UserState} from '../../../../user/UserState';
import {ListState, ListViewModel} from '../../../../view_model/ListViewModel';
import {useAppMainState, ViewType} from '../../../state';
import ListWrapper from '../ListWrapper';

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

export enum ConverationViewStyle {
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
  const {conversations_archived: archivedConversations, conversations_unarchived: conversations} =
    useKoSubscribableChildren(conversationState, ['conversations_archived', 'conversations_unarchived']);
  const {notifications} = useKoSubscribableChildren(preferenceNotificationRepository, ['notifications']);

  const {filterEstablishedConversations} = useMLSConversationState();

  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);
  const initialViewStyle = propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS)
    ? ConverationViewStyle.FOLDER
    : ConverationViewStyle.RECENT;

  const [viewStyle, setViewStyle] = useState<ConverationViewStyle>(initialViewStyle);
  const showBadge = notifications.length > 0;

  const hasNoConversations = conversations.length + connectRequests.length === 0;
  const openFolder = useFolderState(state => state.openFolder);
  const isFolderOpen = useFolderState(state => state.isOpen);

  const {conversationLabelRepository} = conversationRepository;
  const [isConversationListFocus, focusConversationList] = useState(false);

  const {responsiveView} = useAppMainState.getState();

  const onClickPreferences = () => {
    responsiveView.setCurrentView(ViewType.LEFT_SIDEBAR);
    switchList(ListState.PREFERENCES);
    const {rightSidebar} = useAppMainState.getState();
    rightSidebar.clearHistory();
  };

  useEffect(() => {
    if (!activeConversation) {
      return () => {};
    }
    const conversationLabels = conversationLabelRepository.getConversationLabelIds(activeConversation);
    amplify.subscribe(WebAppEvents.CONTENT.EXPAND_FOLDER, openFolder);
    const hasAlreadyOpenFolder = conversationLabels.some(isFolderOpen);
    if (!hasAlreadyOpenFolder) {
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
    propertiesRepository.savePreference(
      PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS,
      viewStyle === ConverationViewStyle.FOLDER,
    );
  }, [viewStyle]);

  const header = (
    <>
      <button
        type="button"
        className={`conversations-settings-button accent-text ${showBadge ? 'conversations-settings--badge' : ''}`}
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
            onClick={event => AvailabilityContextMenu.show(event.nativeEvent, 'left-list-availability-menu')}
            onBlur={event => {
              // on blur conversation list should get the focus
              focusConversationList(true);
            }}
          >
            <AvailabilityState
              className="availability-state"
              availability={userAvailability}
              dataUieName={'status-availability'}
              label={userName}
            />
          </button>

          {(isOnLegalHold || hasPendingLegalHold) && (
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
          tabIndex={0}
          onBlur={event => {
            // personal user won't see availability status menu, on blur of the user name
            // conversation list should get the focus
            focusConversationList(true);
          }}
        >
          {userName}
        </span>
      )}
    </>
  );

  const footer = (
    <section className="conversations-footer">
      <div role="tablist" aria-owns="tab-1 tab-2 tab-3">
        <ul className="conversations-footer-list">
          <li className="conversations-footer-list-item">
            <button
              id="tab-1"
              type="button"
              className="conversations-footer-btn"
              onClick={() => switchList(ListState.START_UI)}
              onKeyDown={event => {
                //shift+tab from contacts tab should focus on the first conversation
                if (event.shiftKey && isTabKey(event)) {
                  focusConversationList(true);
                }
              }}
              title={t('tooltipConversationsStart', Shortcut.getShortcutTooltip(ShortcutType.START))}
              data-uie-name="go-people"
            >
              <Icon.People />
              {t('conversationFooterContacts')}
            </button>
          </li>

          <li className="conversations-footer-list-item">
            <button
              id="tab-2"
              type="button"
              role="tab"
              className={`conversations-footer-btn ${viewStyle === ConverationViewStyle.RECENT ? 'active' : ''}`}
              onClick={() => {
                setViewStyle(ConverationViewStyle.RECENT);
              }}
              title={t('conversationViewTooltip')}
              data-uie-name="go-recent-view"
              data-uie-status={viewStyle === ConverationViewStyle.RECENT ? 'active' : 'inactive'}
              aria-selected={viewStyle === ConverationViewStyle.RECENT}
            >
              <Icon.ConversationsRecent />
              {t('conversationViewTooltip')}
            </button>
          </li>
          <li className="conversations-footer-list-item">
            <button
              id="tab-3"
              type="button"
              role="tab"
              className={`conversations-footer-btn ${viewStyle === ConverationViewStyle.FOLDER ? 'active' : ''}`}
              onClick={() => setViewStyle(ConverationViewStyle.FOLDER)}
              title={t('folderViewTooltip')}
              data-uie-name="go-folder-view"
              data-uie-status={viewStyle === ConverationViewStyle.FOLDER ? 'active' : 'inactive'}
              aria-selected={viewStyle === ConverationViewStyle.FOLDER}
            >
              <Icon.ConversationsFolder />
              {t('folderViewTooltip')}
            </button>
          </li>
          {archivedConversations.length > 0 && (
            <li className="conversations-footer-list-item">
              <button
                type="button"
                className="conversations-footer-btn"
                data-uie-name="go-archive"
                onClick={() => switchList(ListState.ARCHIVE)}
                title={t('tooltipConversationsArchived', archivedConversations.length)}
              >
                <Icon.Archive />
                {t('conversationFooterArchive')}
              </button>
            </li>
          )}
        </ul>
      </div>
    </section>
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
              <ConversationListCallingCell
                classifiedDomains={classifiedDomains}
                call={call}
                callActions={callingViewModel.callActions}
                callingRepository={callingRepository}
                conversation={conversation}
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
  const {currentFocus, handleKeyDown, setCurrentFocus} = useRoveFocus(conversations.length);

  return (
    <ListWrapper id={'conversations'} headerElement={header} footer={footer} before={callingView}>
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
          conversations={filterEstablishedConversations(conversations)}
          viewStyle={viewStyle}
          listViewModel={listViewModel}
          conversationState={conversationState}
          conversationRepository={conversationRepository}
          handleFocus={setCurrentFocus}
          currentFocus={currentFocus}
          isConversationListFocus={isConversationListFocus}
          handleArrowKeyDown={handleKeyDown}
        />
      )}
    </ListWrapper>
  );
};

export default Conversations;
