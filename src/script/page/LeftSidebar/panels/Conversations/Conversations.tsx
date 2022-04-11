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

import Icon from 'Components/Icon';
import React, {useEffect, useState} from 'react';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';

import {ListState, ListViewModel} from '../../../../view_model/ListViewModel';
import ListWrapper from '../ListWrapper';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {User} from '../../../../entity/User';
import {ConversationState} from '../../../../conversation/ConversationState';
import {Shortcut} from '../../../../ui/Shortcut';
import {ShortcutType} from '../../../../ui/ShortcutType';
import {PropertiesRepository} from '../../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../../properties/PropertiesType';
import {CallState} from '../../../../calling/CallState';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {DefaultLabelIds} from '../../../../conversation/ConversationLabelRepository';
import ConversationListCallingCell from 'Components/list/ConversationListCallingCell';
import AvailabilityState from 'Components/AvailabilityState';
import LegalHoldDot from 'Components/LegalHoldDot';
import {TeamState} from '../../../../team/TeamState';
import {AvailabilityContextMenu} from '../../../../ui/AvailabilityContextMenu';
import {UserState} from '../../../../user/UserState';
import {ConversationsList} from './ConversationsList';
import {PreferenceNotificationRepository} from 'src/script/notification/PreferenceNotificationRepository';
import {useFolderState} from './state';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

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
        onClick={() => switchList(ListState.PREFERENCES)}
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
              legalHoldModal={listViewModel.contentViewModel.legalHoldModal}
            />
          )}
        </>
      ) : (
        <span className="left-list-header-text" data-uie-name="status-name">
          {userName}
        </span>
      )}
    </>
  );

  const footer = (
    <section className="conversations-footer">
      <ul className="conversations-footer-list">
        <li className="conversations-footer-list-item">
          <button
            type="button"
            className="button-icon-large"
            onClick={() => switchList(ListState.START_UI)}
            title={t('tooltipConversationsStart', Shortcut.getShortcutTooltip(ShortcutType.START))}
            data-uie-name="go-people"
          >
            <Icon.People />
          </button>
        </li>

        <li className="conversations-footer-list-item">
          <button
            type="button"
            className={`button-icon-large ${viewStyle === ConverationViewStyle.RECENT ? 'accent-fill' : ''}`}
            onClick={() => setViewStyle(ConverationViewStyle.RECENT)}
            title={t('conversationViewTooltip')}
            data-uie-name="go-recent-view"
            data-uie-status={viewStyle === ConverationViewStyle.RECENT ? 'active' : 'inactive'}
          >
            <Icon.ConversationsRecent />
          </button>
        </li>
        <li className="conversations-footer-list-item">
          <button
            type="button"
            className={`button-icon-large ${viewStyle === ConverationViewStyle.FOLDER ? 'accent-fill' : ''}`}
            onClick={() => setViewStyle(ConverationViewStyle.FOLDER)}
            title={t('folderViewTooltip')}
            data-uie-name="go-folder-view"
            data-uie-status={viewStyle === ConverationViewStyle.FOLDER ? 'active' : 'inactive'}
          >
            <Icon.ConversationsFolder />
          </button>
        </li>
        {archivedConversations.length > 0 && (
          <li className="conversations-footer-list-item">
            <button
              type="button"
              className="button-icon-large"
              data-uie-name="go-archive"
              onClick={() => switchList(ListState.ARCHIVE)}
              title={t('tooltipConversationsArchived', archivedConversations.length)}
            >
              <Icon.Archive />
            </button>
          </li>
        )}
      </ul>
    </section>
  );

  const callingView = (
    <>
      {activeCalls.map(call => {
        const conversation = conversationState.findConversation(call.conversationId);
        const callingViewModel = listViewModel.callingViewModel;
        const callingRepository = callingViewModel.callingRepository;
        return (
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
        );
      })}
    </>
  );

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
          conversations={conversations}
          viewStyle={viewStyle}
          listViewModel={listViewModel}
          conversationState={conversationState}
          conversationRepository={conversationRepository}
        />
      )}
    </ListWrapper>
  );
};

export default Conversations;
