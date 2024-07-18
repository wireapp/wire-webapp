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

import {ConversationListCell} from 'Components/list/ConversationListCell';
import {Call} from 'src/script/calling/Call';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isKeyboardEvent} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ConnectionRequests} from './ConnectionRequests';
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
  const contentState = useAppState(state => state.contentState);

  const {joinableCalls} = useKoSubscribableChildren(callState, ['joinableCalls']);

  const isActiveConversation = (conversation: Conversation) => conversationState.isActiveConversation(conversation);

  const openContextMenu = (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) =>
    listViewModel.onContextMenu(conversation, event);
  const answerCall = (conversation: Conversation) => listViewModel.answerCall(conversation);
  const isShowingConnectionRequests = contentState === ContentState.CONNECTION_REQUESTS;

  const hasJoinableCall = (conversation: Conversation) => {
    const call = joinableCalls.find((callInstance: Call) =>
      matchQualifiedIds(callInstance.conversation.qualifiedId, conversation.qualifiedId),
    );
    if (!call) {
      return false;
    }
    return !conversation.isSelfUserRemoved();
  };

  const {setCurrentView} = useAppMainState(state => state.responsiveView);

  const onConnectionRequestClick = () => {
    setCurrentView(ViewType.CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(ContentState.CONNECTION_REQUESTS);
  };

  const isFolderView = viewStyle === ConversationViewStyle.FOLDER;

  return (
    <>
      <h2 className="visually-hidden">{t(isFolderView ? 'folderViewTooltip' : 'conversationViewTooltip')}</h2>

      <ul css={css({margin: 0, paddingLeft: 0})} data-uie-name={isFolderView ? 'folder-view' : 'recent-view'}>
        <ConnectionRequests
          connectionRequests={connectRequests}
          onConnectionRequestClick={onConnectionRequestClick}
          isShowingConnectionRequests={isShowingConnectionRequests}
        />

        {viewStyle === ConversationViewStyle.RECENT ? (
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
                    if (isKeyboardEvent(event)) {
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
        )}
      </ul>
    </>
  );
};
