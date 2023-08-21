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

import {useEffect} from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ConversationListCell} from 'Components/list/ConversationListCell';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {ListWrapper} from './ListWrapper';

import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {ConversationState} from '../../../conversation/ConversationState';
import {Conversation} from '../../../entity/Conversation';
import {useConversationFocus} from '../../../hooks/useConversationFocus';
import {ListViewModel} from '../../../view_model/ListViewModel';

type ArchiveProps = {
  answerCall: (conversation: Conversation) => void;
  conversationRepository: ConversationRepository;
  conversationState?: ConversationState;
  listViewModel: ListViewModel;
  onClose: () => void;
};

const Archive = ({
  listViewModel,
  conversationRepository,
  answerCall,
  onClose,
  conversationState = container.resolve(ConversationState),
}: ArchiveProps) => {
  const {archivedConversations: conversations} = useKoSubscribableChildren(conversationState, [
    'archivedConversations',
  ]);

  const onClickConversation = async (conversation: Conversation) => {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversation, {archive: true});
  };

  useEffect(() => {
    // will eventually load missing events from the db
    conversationRepository.updateArchivedConversations();
  }, []);

  const {currentFocus, handleKeyDown, resetConversationFocus} = useConversationFocus(conversations);

  return (
    <ListWrapper id="archive" header={t('archiveHeader')} onClose={onClose}>
      <h2 className="visually-hidden">{t('archiveHeader')}</h2>

      <ul className="left-list-items no-scroll">
        {conversations.map((conversation, index) => (
          <ConversationListCell
            isFocused={currentFocus === conversation.id}
            resetConversationFocus={resetConversationFocus}
            key={conversation.id}
            handleArrowKeyDown={handleKeyDown(index)}
            dataUieName="item-conversation-archived"
            onClick={() => onClickConversation(conversation)}
            rightClick={listViewModel.onContextMenu}
            conversation={conversation}
            onJoinCall={answerCall}
            showJoinButton={false}
          />
        ))}
      </ul>
    </ListWrapper>
  );
};

export {Archive};
