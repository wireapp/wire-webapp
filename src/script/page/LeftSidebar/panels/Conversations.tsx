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
import {css} from '@emotion/core';
import React, {useCallback, useEffect, useState} from 'react';
import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';

import {ListState, ListViewModel} from '../../../view_model/ListViewModel';
import ListWrapper from './ListWrapper';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {User} from '../../../entity/User';
import {ConversationState} from '../../../conversation/ConversationState';
import {Shortcut} from '../../../ui/Shortcut';
import {ShortcutType} from '../../../ui/ShortcutType';
import {PropertiesRepository} from '../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../properties/PropertiesType';
import {Conversation} from '../../../entity/Conversation';
import ConversationListCell from 'Components/list/ConversationListCell';
import GroupedConversations from 'Components/list/GroupedConversations';
import {createNavigate} from '../../../router/routerBindings';
import {generateConversationUrl} from '../../../router/routeGenerator';
import {CallState} from '../../../calling/CallState';
import {Call} from 'src/script/calling/Call';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import ConversationListCallingCell from 'Components/list/ConversationListCallingCell';
import AvailabilityState from 'Components/AvailabilityState';
import LegalHoldDot from 'Components/LegalHoldDot';
import {TeamState} from '../../../team/TeamState';
import {AvailabilityContextMenu} from '../../../ui/AvailabilityContextMenu';

type ConversationsProps = {
  callState?: CallState;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  listViewModel: ListViewModel;
  propertiesRepository: PropertiesRepository;
  selfUser: User;
  switchList: (list: ListState) => void;
  teamState?: TeamState;
};

enum ConverationViewStyle {
  RECENT,
  FOLDER,
}

const ConversationsList: React.FC<{
  callState: CallState;
  conversationRepository: ConversationRepository;
  conversations: Conversation[];
  conversationState: ConversationState;
  listViewModel: ListViewModel;
  viewStyle: ConverationViewStyle;
}> = ({conversations, listViewModel, viewStyle, conversationState, conversationRepository, callState}) => {
  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const openContextMenu = useCallback(
    (conversation: Conversation, event: MouseEvent) => listViewModel.onContextMenu(conversation, event),
    [],
  );
  const answerCall = useCallback((conversation: Conversation) => listViewModel.answerCall(conversation), []);
  const isActiveConversation = useCallback(
    (conversation: Conversation) => conversationState.isActiveConversation(conversation),
    [],
  );

  const hasJoinableCall = useCallback((conversation: Conversation) => {
    const call = activeCalls.find((callInstance: Call) =>
      matchQualifiedIds(callInstance.conversationId, conversation.qualifiedId),
    );
    if (!call) {
      return false;
    }
    return (
      !conversation.removed_from_conversation() &&
      call.state() === CALL_STATE.INCOMING &&
      call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE
    );
  }, []);

  const conversationView =
    viewStyle === ConverationViewStyle.RECENT ? (
      <div data-uie-name="recent-view">
        {conversations.map(conversation => (
          <ConversationListCell
            key={conversation.id}
            data-uie-name="item-conversation"
            conversation={conversation}
            onClick={createNavigate(generateConversationUrl(conversation.id, conversation.domain))}
            isSelected={isActiveConversation}
            onJoinCall={answerCall}
            rightClick={openContextMenu}
            showJoinButton={hasJoinableCall(conversation)}
          />
        ))}
      </div>
    ) : (
      <div data-uie-name="folder-view">
        <GroupedConversations
          callState={callState}
          conversationRepository={conversationRepository}
          conversationState={conversationState}
          expandedFolders={expandedFolders}
          hasJoinableCall={hasJoinableCall}
          isSelectedConversation={isActiveConversation}
          listViewModel={listViewModel}
          onJoinCall={answerCall}
          setExpandedFolders={setExpandedFolders}
        />
      </div>
    );

  return (
    <ul css={css({paddingLeft: 0})}>
      {/*
      <!-- ko if: showConnectRequests() -->
      <li
        className="conversation-list-cell"
        data-bind="click: clickOnConnectRequests, css: {'conversation-list-cell-active': stateIsRequests()}"
      >
        <div className="conversation-list-cell-left">
          <!-- ko if: connectRequests().length === 1 -->
          <div className="avatar-halo">
            <participant-avatar params="participant: connectRequests()[0], avatarSize: participantAvatarSize">
            </participant-avatar>
          </div>
          <!-- /ko -->

          <!-- ko if: connectRequests().length > 1 -->
          <group-avatar params="users: connectRequests()"></group-avatar>
          <!-- /ko -->
        </div>

        <div className="conversation-list-cell-center">
          <span
            className="conversation-list-cell-name"
            data-bind="text: connectRequestsText, css: {'accent-text': stateIsRequests()}"
            data-uie-name="item-pending-requests"
          ></span>
        </div>

        <div className="conversation-list-cell-right">
          <span className="conversation-list-cell-badge cell-badge-dark icon-pending" data-uie-name="status-pending"></span>
        </div>
      </li>
      <!-- /ko -->
*/}
      {conversationView}
    </ul>
  );
};

const Conversations: React.FC<ConversationsProps> = ({
  propertiesRepository,
  conversationRepository,
  listViewModel,
  conversationState = container.resolve(ConversationState),
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
  selfUser,
  switchList,
}) => {
  const {
    name: userName,
    availability: userAvailability,
    hasPendingLegalHold,
  } = useKoSubscribableChildren(selfUser, ['hasPendingLegalHold', 'name', 'availability']);
  const {conversations_archived: archivedConversations, conversations_unarchived: conversations} =
    useKoSubscribableChildren(conversationState, ['conversations_archived', 'conversations_unarchived']);

  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);
  const initialViewStyle = propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS)
    ? ConverationViewStyle.FOLDER
    : ConverationViewStyle.RECENT;

  const [viewStyle, setViewStyle] = useState<ConverationViewStyle>(initialViewStyle);
  const isLegalHold = false;
  const showBadge = () => false;

  const hasNoConversations = conversations.length === 0;

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
        className={`conversations-settings button-icon-large accent-text ${
          showBadge() ? 'conversations-settings--badge' : ''
        }`}
        title={t('tooltipConversationsPreferences')}
        onClick={() => switchList(ListState.PREFERENCES)}
        data-uie-name="go-preferences"
      >
        <Icon.Settings />
      </button>
      {teamState.isTeam ? (
        <>
          <button
            type="button"
            className="left-list-header-availability"
            tabIndex={0}
            onClick={event => AvailabilityContextMenu.show(event.nativeEvent, 'left-list-availability-menu')}
          >
            <AvailabilityState
              className="availability-state"
              availability={userAvailability}
              dataUieName={'status-availability'}
              label={userName}
            />
          </button>
          {isLegalHold && (
            <LegalHoldDot
              isPending={hasPendingLegalHold}
              data-uie-name={hasPendingLegalHold ? 'status-legal-hold-pending' : 'status-legal-hold'}
              legalHoldModal={undefined /**TODO*/}
              style={{padding: '8px'}}
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
            tabIndex={0}
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
            tabIndex={0}
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
            tabIndex={0}
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
              tabIndex={0}
              className="button-icon-large"
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
      {activeCalls
        .filter(call => !call.reason())
        .map(call => {
          const conversation = conversationState.findConversation(call.conversationId);
          const callingViewModel = listViewModel.callingViewModel;
          const callingRepository = callingViewModel.callingRepository;
          return (
            <div className="calling-cell" key={conversation.id}>
              <ConversationListCallingCell
                data-uie-name="item-call"
                data-uie-id={conversation.id}
                data-uie-value={conversation.display_name()}
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
