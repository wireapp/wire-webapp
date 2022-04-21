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

import {css} from '@emotion/react';
import React from 'react';
import {t} from 'Util/LocalizerUtil';
import {ListViewModel} from '../../../../view_model/ListViewModel';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ConversationState} from '../../../../conversation/ConversationState';
import {Conversation} from '../../../../entity/Conversation';
import ConversationListCell from 'Components/list/ConversationListCell';
import GroupedConversations from './GroupedConversations';
import {createNavigate} from '../../../../router/routerBindings';
import {generateConversationUrl} from '../../../../router/routeGenerator';
import {CallState} from '../../../../calling/CallState';
import {Call} from 'src/script/calling/Call';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {ConversationRepository} from '../../../../conversation/ConversationRepository';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import GroupAvatar from 'Components/avatar/GroupAvatar';
import {ContentViewModel} from '../../../../view_model/ContentViewModel';
import {ConverationViewStyle} from './Conversations';
import {User} from 'src/script/entity/User';

export const ConversationsList: React.FC<{
  callState: CallState;
  connectRequests: User[];
  conversationRepository: ConversationRepository;
  conversations: Conversation[];
  conversationState: ConversationState;
  listViewModel: ListViewModel;
  viewStyle: ConverationViewStyle;
}> = ({
  conversations,
  listViewModel,
  viewStyle,
  connectRequests,
  conversationState,
  conversationRepository,
  callState,
}) => {
  const {joinableCalls} = useKoSubscribableChildren(callState, ['joinableCalls']);

  const isActiveConversation = (conversation: Conversation) => conversationState.isActiveConversation(conversation);

  const openContextMenu = (conversation: Conversation, event: MouseEvent) =>
    listViewModel.onContextMenu(conversation, event);
  const answerCall = (conversation: Conversation) => listViewModel.answerCall(conversation);
  const {state: contentState} = useKoSubscribableChildren(listViewModel.contentViewModel, ['state']);
  const isShowingConnectionRequests = contentState === ContentViewModel.STATE.CONNECTION_REQUESTS;

  const hasJoinableCall = (conversation: Conversation) => {
    const call = joinableCalls.find((callInstance: Call) =>
      matchQualifiedIds(callInstance.conversationId, conversation.qualifiedId),
    );
    if (!call) {
      return false;
    }
    return !conversation.removed_from_conversation();
  };

  const conversationView =
    viewStyle === ConverationViewStyle.RECENT ? (
      <>
        {conversations.map(conversation => (
          <ConversationListCell
            key={conversation.id}
            dataUieName="item-conversation"
            conversation={conversation}
            onClick={createNavigate(generateConversationUrl(conversation.id, conversation.domain))}
            isSelected={isActiveConversation}
            onJoinCall={answerCall}
            rightClick={openContextMenu}
            showJoinButton={hasJoinableCall(conversation)}
          />
        ))}
      </>
    ) : (
      <li>
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

  const uieName = viewStyle === ConverationViewStyle.FOLDER ? 'folder-view' : 'recent-view';

  const connectionText =
    connectRequests.length > 1
      ? t('conversationsConnectionRequestMany', connectRequests.length)
      : t('conversationsConnectionRequestOne');

  const connectionRequests =
    connectRequests.length === 0 ? null : (
      <li
        className={`conversation-list-cell ${isShowingConnectionRequests ? 'conversation-list-cell-active' : ''}`}
        onClick={() => listViewModel.contentViewModel.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS)}
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
          ></span>
        </div>
      </li>
    );
  return (
    <ul css={css({margin: 0, paddingLeft: 0})} data-uie-name={uieName}>
      {connectionRequests}
      {conversationView}
    </ul>
  );
};
