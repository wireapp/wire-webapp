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

import React, {MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyBoardEvent, useEffect, useState} from 'react';

import {ConversationListCell} from 'Components/list/ConversationListCell';
import {Call} from 'src/script/calling/Call';
import {ConversationLabel, ConversationLabelRepository} from 'src/script/conversation/ConversationLabelRepository';
import {User} from 'src/script/entity/User';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isKeyboardEvent} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConnectionRequests} from './ConnectionRequests';
import {conversationsList, headingTitle, paragraph} from './ConversationsList.styles';
import {conversationSearchFilter, scrollToConversation} from './helpers';

import {CallState} from '../../../../calling/CallState';
import {ConversationState} from '../../../../conversation/ConversationState';
import {Conversation} from '../../../../entity/Conversation';
import {generateConversationUrl} from '../../../../router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from '../../../../router/routerBindings';
import {ListViewModel} from '../../../../view_model/ListViewModel';
import {useAppMainState, ViewType} from '../../../state';
import {ContentState} from '../../../useAppState';

interface ConversationsListProps {
  callState: CallState;
  connectRequests: User[];
  conversations: Conversation[];
  conversationState: ConversationState;
  listViewModel: ListViewModel;
  conversationLabelRepository: ConversationLabelRepository;
  currentFocus: string;
  conversationsFilter: string;
  currentFolder?: ConversationLabel;
  resetConversationFocus: () => void;
  handleArrowKeyDown: (index: number) => (e: React.KeyboardEvent) => void;
  clearSearchFilter: () => void;
  groupParticipantsConversations: Conversation[];
  isGroupParticipantsVisible: boolean;
  isEmpty: boolean;
}

export const ConversationsList = ({
  conversations,
  conversationsFilter,
  listViewModel,
  connectRequests,
  conversationState,
  callState,
  currentFocus,
  currentFolder,
  resetConversationFocus,
  handleArrowKeyDown,
  clearSearchFilter,
  groupParticipantsConversations,
  isGroupParticipantsVisible,
  isEmpty,
}: ConversationsListProps) => {
  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const {currentTab} = useSidebarStore();

  const [clickedFilteredConversationId, setClickedFilteredConversationId] = useState<string | null>(null);

  const {joinableCalls} = useKoSubscribableChildren(callState, ['joinableCalls']);

  const isActiveConversation = (conversation: Conversation) => conversationState.isActiveConversation(conversation);

  const openContextMenu = (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) =>
    listViewModel.onContextMenu(conversation, event);

  const answerCall = (conversation: Conversation) => listViewModel.answerCall(conversation);

  const hasJoinableCall = (conversation: Conversation) => {
    const call = joinableCalls.find((callInstance: Call) =>
      matchQualifiedIds(callInstance.conversation.qualifiedId, conversation.qualifiedId),
    );

    return !!call && !conversation.isSelfUserRemoved();
  };

  const onConnectionRequestClick = () => {
    setCurrentView(ViewType.MOBILE_CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(ContentState.CONNECTION_REQUESTS);
  };

  const getCommonConversationCellProps = (conversation: Conversation, index: number) => ({
    isFocused: !conversationsFilter && currentFocus === conversation.id,
    handleArrowKeyDown: handleArrowKeyDown(index),
    resetConversationFocus: resetConversationFocus,
    dataUieName: 'item-conversation',
    conversation: conversation,
    onClick: (event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>) => {
      if (isKeyboardEvent(event)) {
        createNavigateKeyboard(generateConversationUrl(conversation.qualifiedId), true)(event);
      } else {
        createNavigate(generateConversationUrl(conversation.qualifiedId))(event);
      }

      clearSearchFilter();
      setClickedFilteredConversationId(conversation.id);
    },
    isSelected: isActiveConversation,
    onJoinCall: answerCall,
    rightClick: openContextMenu,
    showJoinButton: hasJoinableCall(conversation),
  });

  useEffect(() => {
    if (!conversationsFilter && clickedFilteredConversationId) {
      scrollToConversation(clickedFilteredConversationId);
      setClickedFilteredConversationId(null);
    }
  }, [conversationsFilter, clickedFilteredConversationId]);

  const isFolderView = currentTab === SidebarTabs.FOLDER;
  const filteredConversations =
    (isFolderView && currentFolder?.conversations().filter(conversationSearchFilter(conversationsFilter))) || [];
  const conversationsToDisplay = filteredConversations.length ? filteredConversations : conversations;

  return (
    <>
      <h2 className="visually-hidden">{t('conversationViewTooltip')}</h2>

      <ConnectionRequests connectionRequests={connectRequests} onConnectionRequestClick={onConnectionRequestClick} />

      {conversationsFilter && !isEmpty && <h3 css={headingTitle}>{t('searchConversationNames')}</h3>}

      {conversations.length === 0 && groupParticipantsConversations.length > 0 && (
        <p css={paragraph}>{t('searchConversationsNoResult')}</p>
      )}

      <ul css={conversationsList} data-uie-name="conversation-view">
        {conversationsToDisplay.map((conversation, index) => (
          <ConversationListCell key={conversation.id} {...getCommonConversationCellProps(conversation, index)} />
        ))}
      </ul>

      {isGroupParticipantsVisible && (
        <>
          <h3 css={headingTitle}>{t('searchGroupParticipants')}</h3>
          <ul
            css={conversationsList}
            data-uie-name="group-participants-conversations-view"
            className="group-participants-conversations"
          >
            {groupParticipantsConversations.map((conversation, index) => (
              <ConversationListCell key={conversation.id} {...getCommonConversationCellProps(conversation, index)} />
            ))}
          </ul>
        </>
      )}
    </>
  );
};
