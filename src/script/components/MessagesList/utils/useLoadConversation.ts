/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {MutableRefObject, useEffect} from 'react';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message as MessageEntity} from 'Repositories/entity/message/Message';

interface Props {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  conversationLastReadTimestamp: MutableRefObject<number>;
  onLoading: (isLoading: boolean) => void;
}

export const useLoadConversation = ({
  conversation,
  conversationRepository,
  conversationLastReadTimestamp,
  onLoading,
}: Props) => {
  const loadConversation = async (conversationToLoad: Conversation): Promise<MessageEntity[]> => {
    onLoading(true);
    try {
      conversationLastReadTimestamp.current = conversationToLoad.last_read_timestamp();
      await conversationRepository.updateParticipatingUserEntities(conversationToLoad, false, true);

      const initialMessage = conversationToLoad.initialMessage();

      return initialMessage
        ? await conversationRepository.getMessagesWithOffset(conversationToLoad, initialMessage)
        : await conversationRepository.getPrecedingMessages(conversationToLoad);
    } finally {
      onLoading(false);
    }
  };

  useEffect(() => {
    void loadConversation(conversation);

    return () => conversation.release();
  }, [conversation]);

  return {loadConversation};
};
