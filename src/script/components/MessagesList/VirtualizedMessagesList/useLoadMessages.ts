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

import {useCallback, useEffect} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isLastReceivedMessage} from 'Util/conversationMessages';

const SCROLL_THRESHOLD = 10;

interface Props {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  loadingMessages: boolean;
  onLoadingMessages: (isLoading: boolean) => void;
  itemsLength: number;
  initialMessageId?: string;
}

export const useLoadMessages = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  {conversation, conversationRepository, loadingMessages, onLoadingMessages, itemsLength, initialMessageId}: Props,
) => {
  const {isLoadingMessages, hasAdditionalMessages} = useKoSubscribableChildren(conversation, [
    'isLoadingMessages',
    'hasAdditionalMessages',
  ]);

  const loadPrecedingMessages = useCallback(async () => {
    const shouldPullMessages = !isLoadingMessages && hasAdditionalMessages;

    if (shouldPullMessages) {
      onLoadingMessages(true);
      const newMessages = await conversationRepository.getPrecedingMessages(conversation).then(messages => {
        onLoadingMessages(false);
        return messages;
      });

      if (!initialMessageId) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(itemsLength - (itemsLength - newMessages.length), {align: 'start'});
        });
      }
    }
  }, [
    conversation,
    conversationRepository,
    hasAdditionalMessages,
    isLoadingMessages,
    onLoadingMessages,
    initialMessageId,
  ]);

  const loadFollowingMessages = useCallback(async () => {
    const lastMessage = conversation.getNewestMessage();

    if (lastMessage) {
      if (!isLastReceivedMessage(lastMessage, conversation)) {
        onLoadingMessages(true);
        // if the last loaded message is not the last of the conversation, we load the subsequent messages
        const newMessages = await conversationRepository
          .getSubsequentMessages(conversation, lastMessage)
          .then(messages => {
            onLoadingMessages(false);
            return messages;
          });

        if (!initialMessageId) {
          requestAnimationFrame(() => {
            virtualizer.scrollToIndex(itemsLength - (itemsLength - newMessages.length), {align: 'start'});
          });
        }
      }
    }
  }, [conversation, conversationRepository, onLoadingMessages, initialMessageId]);

  // This function ensures that after user scroll to top or bottom content,
  // the preceding / following messages will be loaded.
  useEffect(() => {
    const scrollElement = virtualizer.scrollElement;

    if (!scrollElement) {
      return () => undefined;
    }

    let ticking = false;

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        const scrollBottom = scrollElement.scrollTop + scrollElement.clientHeight;
        const scrollHeight = scrollElement.scrollHeight;

        const isScrollAtTop = scrollElement.scrollTop <= SCROLL_THRESHOLD;
        const isScrollAtBottom = scrollHeight - scrollBottom <= SCROLL_THRESHOLD;

        if (isScrollAtTop && !loadingMessages) {
          void loadPrecedingMessages();
        } else if (isScrollAtBottom && !loadingMessages) {
          void loadFollowingMessages();
        }
      });
    };

    scrollElement.addEventListener('scroll', onScroll);
    return () => scrollElement.removeEventListener('scroll', onScroll);
  }, [loadingMessages, loadFollowingMessages, loadPrecedingMessages, virtualizer.scrollElement]);
};
