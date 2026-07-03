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

import {useCallback, useEffect, useRef, useState} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {isLastReceivedMessage} from 'Util/conversationMessages';

type UseLoadMessagesProps = {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  itemsLength: number;
  shouldPullMessages: boolean;
  isConversationLoaded: boolean;
  parentElement: HTMLElement;
};

export const useLoadMessages = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  properties: UseLoadMessagesProps,
): void => {
  const {conversation, conversationRepository, itemsLength, shouldPullMessages, isConversationLoaded, parentElement} =
    properties;
  const {fireAndForgetInvoker} = useApplicationContext();
  const fillContainerByMessagesRef = useRef(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // On hit top, we load preceding messages
  const loadPrecedingMessages = useCallback(async () => {
    if (!shouldPullMessages) {
      return;
    }

    virtualizer.measure();
    const prev = virtualizer.getTotalSize();

    setIsLoadingMessages(true);
    await conversationRepository.getPrecedingMessages(conversation).finally(() => {
      requestAnimationFrame(() => {
        const newSize = virtualizer.getTotalSize();
        const diff = newSize - prev;

        parentElement.scrollTop += diff;
        setIsLoadingMessages(false);
      });
    });
  }, [virtualizer, parentElement, shouldPullMessages, conversationRepository, conversation]);

  // On hit bottom, we load following messages
  const loadFollowingMessages = useCallback(async () => {
    const lastMessage = conversation.getNewestMessage();

    if (lastMessage !== null && lastMessage !== undefined) {
      if (!isLastReceivedMessage(lastMessage, conversation)) {
        virtualizer.measure();
        setIsLoadingMessages(true);
        // if the last loaded message is not the last of the conversation, we load the subsequent messages
        await conversationRepository.getSubsequentMessages(conversation, lastMessage).finally(() => {
          requestAnimationFrame(() => {
            const clientHeight = parentElement.clientHeight;
            const diff = clientHeight / 2;

            parentElement.scrollTop += diff;
            setIsLoadingMessages(false);
          });
        });
      }
    }
  }, [conversation, conversationRepository, parentElement, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();

  // Load previous messages when scrolling to the top
  useEffect(() => {
    if (isLoadingMessages) {
      return () => undefined;
    }

    const timeout = setTimeout(() => {
      if (!isConversationLoaded) {
        return;
      }

      if (virtualItems.length === 0) {
        return;
      }
      const [firstItem] = [...virtualItems];

      if (firstItem.index === 0) {
        fireAndForgetInvoker.fireAndForget(loadPrecedingMessages);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [fireAndForgetInvoker, isConversationLoaded, isLoadingMessages, loadPrecedingMessages, virtualItems]);

  // Load new messages when scrolling to the down
  useEffect(() => {
    if (isLoadingMessages) {
      return () => undefined;
    }

    const timeout = setTimeout(() => {
      if (!isConversationLoaded) {
        return;
      }

      if (virtualItems.length === 0) {
        return;
      }
      const [lastItem] = virtualItems.toReversed();

      if (lastItem.index >= itemsLength - 1) {
        fireAndForgetInvoker.fireAndForget(loadFollowingMessages);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [
    fireAndForgetInvoker,
    isConversationLoaded,
    isLoadingMessages,
    itemsLength,
    loadFollowingMessages,
    virtualizer,
    virtualItems,
  ]);

  // This function ensures that after user scroll to top or bottom content,
  // the preceding / following messages will be loaded.

  // Load more messages on mount if the list doesn't fill the viewport
  useEffect(() => {
    if (itemsLength === 0 || fillContainerByMessagesRef.current) {
      return () => undefined;
    }

    const frame = requestAnimationFrame(() => {
      const totalSize = virtualizer.getTotalSize();
      const containerHeight = virtualizer.scrollElement?.clientHeight ?? 0;

      if (totalSize < containerHeight) {
        fireAndForgetInvoker.fireAndForget(loadPrecedingMessages);
      }

      fillContainerByMessagesRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [fireAndForgetInvoker, itemsLength, loadPrecedingMessages, virtualizer]);
};
