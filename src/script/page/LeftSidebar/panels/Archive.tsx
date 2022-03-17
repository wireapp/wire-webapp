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

import React, {useEffect} from 'react';

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {t} from 'Util/LocalizerUtil';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import ListWrapper from './ListWrapper';
import ConversationListCell from 'Components/list/ConversationListCell';
import {Conversation} from '../../../entity/Conversation';
import {ListViewModel} from '../../../view_model/ListViewModel';
import {ConversationState} from '../../../conversation/ConversationState';
import {container} from 'tsyringe';
import {ConversationRepository} from '../../../conversation/ConversationRepository';

type ArchiveProps = {
  answerCall: (conversation: Conversation) => void;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  listViewModel: ListViewModel;
  onClose: () => void;
};

const Archive: React.FC<ArchiveProps> = ({
  listViewModel,
  conversationRepository,
  answerCall,
  onClose,
  conversationState = container.resolve(ConversationState),
}) => {
  const {conversations_archived: conversations} = useKoSubscribableChildren(conversationState, [
    'conversations_archived',
  ]);

  const onClickConversation = async (conversation: Conversation) => {
    await conversationRepository.unarchiveConversation(conversation, true, 'opened conversation from archive');
    onClose();
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {});
  };

  useEffect(() => {
    // will eventually load missing events from the db
    conversationRepository.updateArchivedConversations();
  }, []);

  return (
    <ListWrapper id="archive" header={t('archiveHeader')} onClose={onClose}>
      <ul className="left-list-items no-scroll">
        {conversations.map(conversation => (
          <li key={conversation.id}>
            <ConversationListCell
              dataUieName="item-conversation-archived"
              onClick={() => onClickConversation(conversation)}
              rightClick={listViewModel.onContextMenu}
              conversation={conversation}
              onJoinCall={answerCall}
              showJoinButton={false}
            />
          </li>
        ))}
      </ul>
    </ListWrapper>
  );
};

export default Archive;
