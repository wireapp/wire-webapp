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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {t} from 'Util/LocalizerUtil';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import LeftListWrapper from 'Components/list/LeftListWrapper';
import ConversationListCell from 'Components/list/ConversationListCell';
import {Conversation} from '../../entity/Conversation';
import {ListViewModel} from '../../view_model/ListViewModel';
import {ConversationState} from '../../conversation/ConversationState';
import {container} from 'tsyringe';
import {ConversationRepository} from '../../conversation/ConversationRepository';

type ArchiveListProps = {
  conversationRepository: ConversationRepository;
  conversationState: ConversationState;
  listViewModel: ListViewModel;
};

const ArchiveList: React.FC<ArchiveListProps> = ({
  listViewModel,
  conversationRepository,
  conversationState = container.resolve(ConversationState),
}) => {
  const {conversations_archived: conversations} = useKoSubscribableChildren(conversationState, [
    'conversations_archived',
  ]);

  const close = () => {
    listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);
  };

  const onClickConversation = async (conversation: Conversation) => {
    await conversationRepository.unarchiveConversation(conversation, true, 'opened conversation from archive');
    close();
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {});
  };

  return (
    <LeftListWrapper
      listViewModel={listViewModel}
      openState={ListViewModel.STATE.ARCHIVE}
      id="archive"
      header={t('archiveHeader')}
      onClose={close}
    >
      <ul
        className="left-list-items"
        data-bind="antiscroll: shouldUpdateScrollbar, bordered_list: archivedConversations"
      >
        {conversations.map((conversation, index) => (
          <li key={conversation.id}>
            <ConversationListCell
              dataUieName="item-conversation-archived"
              onClick={() => onClickConversation(conversation)}
              rightClick={listViewModel.onContextMenu}
              conversation={conversation}
              onJoinCall={function (conversation: Conversation): boolean {
                throw new Error('Function not implemented.');
              }}
              index={index}
              showJoinButton={false}
            />
          </li>
        ))}
      </ul>
    </LeftListWrapper>
  );
};

export default ArchiveList;

registerStaticReactComponent('archive-list', ArchiveList);
