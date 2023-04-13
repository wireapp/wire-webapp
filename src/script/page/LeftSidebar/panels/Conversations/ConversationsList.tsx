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

import React from 'react';

import {css} from '@emotion/react';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {GroupAvatar, Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {ConversationListCell} from 'Components/list/ConversationListCell';
import {Call} from 'src/script/calling/Call';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConversationViewStyle} from './Conversations';
import {GroupedConversations} from './GroupedConversations';

import {CallState} from '../../../../calling/CallState';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import {Conversation} from '../../../../entity/Conversation';
import {generateConversationUrl} from '../../../../router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from '../../../../router/routerBindings';
import {ListViewModel} from '../../../../view_model/ListViewModel';
import {useAppMainState, ViewType} from '../../../state';
import {ContentState, useAppState} from '../../../useAppState';

interface ConversationsListProps {
  callState: CallState;
  connectRequests: User[];
  conversationRepository: ConversationRepository;
  conversations: Conversation[];
  conversationState: ConversationState;
  listViewModel: ListViewModel;
  viewStyle: ConversationViewStyle;
  currentFocus: string;
  resetConversationFocus: () => void;
  handleArrowKeyDown: (index: number) => (e: React.KeyboardEvent) => void;
}

export const ConversationsList = ({
  conversations,
  listViewModel,
  viewStyle,
  connectRequests,
  conversationState,
  conversationRepository,
  callState,
  currentFocus,
  resetConversationFocus,
  handleArrowKeyDown,
}: ConversationsListProps) => {
  const {contentState} = useAppState();

  const {joinableCalls} = useKoSubscribableChildren(callState, ['joinableCalls']);

  const isActiveConversation = (conversation: Conversation) => conversationState.isActiveConversation(conversation);

  const openContextMenu = (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) =>
    listViewModel.onContextMenu(conversation, event);
  const answerCall = (conversation: Conversation) => listViewModel.answerCall(conversation);
  const isShowingConnectionRequests = contentState === ContentState.CONNECTION_REQUESTS;

  const hasJoinableCall = (conversation: Conversation) => {
    const call = joinableCalls.find((callInstance: Call) =>
      matchQualifiedIds(callInstance.conversationId, conversation.qualifiedId),
    );
    if (!call) {
      return false;
    }
    return !conversation.removed_from_conversation();
  };

  const {setCurrentView} = useAppMainState(state => state.responsiveView);

  const onConnectionRequestClick = () => {
    setCurrentView(ViewType.CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(ContentState.CONNECTION_REQUESTS);
  };

  const conversationView =
    viewStyle === ConversationViewStyle.RECENT ? (
      <>
        {conversations.map((conversation, index) => {
          return (
            <ConversationListCell
              key={conversation.id}
              isFocused={currentFocus === conversation.id}
              handleArrowKeyDown={handleArrowKeyDown(index)}
              resetConversationFocus={resetConversationFocus}
              dataUieName="item-conversation"
              conversation={conversation}
              onClick={event => {
                if ('key' in event) {
                  createNavigateKeyboard(generateConversationUrl(conversation.qualifiedId), true)(event);
                } else {
                  createNavigate(generateConversationUrl(conversation.qualifiedId))(event);
                }
              }}
              isSelected={isActiveConversation}
              onJoinCall={answerCall}
              rightClick={openContextMenu}
              showJoinButton={hasJoinableCall(conversation)}
            />
          );
        })}
      </>
    ) : (
      <li tabIndex={TabIndex.UNFOCUSABLE}>
        <GroupedConversations
          callState={callState}
          conversationRepository={conversationRepository}
          conversationState={conversationState}
          hasJoinableCall={hasJoinableCall}
          isSelectedConversation={isActiveConversation}
          listViewModel={listViewModel}
          onJoinCall={answerCall}
        />
      </li>
    );

  const isFolderView = viewStyle === ConversationViewStyle.FOLDER;
  const uieName = isFolderView ? 'folder-view' : 'recent-view';

  const connectionText =
    connectRequests.length > 1
      ? t('conversationsConnectionRequestMany', connectRequests.length)
      : t('conversationsConnectionRequestOne');

  const connectionRequests =
    connectRequests.length === 0 ? null : (
      <li tabIndex={TabIndex.UNFOCUSABLE}>
        <div
          role="button"
          tabIndex={TabIndex.FOCUSABLE}
          className={`conversation-list-cell ${isShowingConnectionRequests ? 'conversation-list-cell-active' : ''}`}
          onClick={onConnectionRequestClick}
          onKeyDown={event => handleKeyDown(event, onConnectionRequestClick)}
        >
          <div className="conversation-list-cell-left">
            {connectRequests.length === 1 ? (
              <div className="avatar-halo">
                <Avatar participant={connectRequests[0]} avatarSize={AVATAR_SIZE.SMALL} />
              </div>
            ) : (
              <GroupAvatar users={connectRequests} />
            )}
          </div>

          <div className="conversation-list-cell-center">
            <span
              className={`conversation-list-cell-name ${isShowingConnectionRequests ? 'accent-text' : ''}`}
              data-uie-name="item-pending-requests"
            >
              {connectionText}
            </span>
          </div>

          <div className="conversation-list-cell-right">
            <span
              className="conversation-list-cell-badge cell-badge-dark icon-pending"
              data-uie-name="status-pending"
            />
          </div>
        </div>
      </li>
    );
  return (
    <>
      <h2 className="visually-hidden">{t(isFolderView ? 'folderViewTooltip' : 'conversationViewTooltip')}</h2>

      <ul css={css({margin: 0, paddingLeft: 0})} data-uie-name={uieName}>
        {connectionRequests}
        {conversationView}
      </ul>
    </>
  );
};
