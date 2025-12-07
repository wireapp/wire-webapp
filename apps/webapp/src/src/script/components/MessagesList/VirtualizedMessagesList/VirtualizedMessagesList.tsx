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

import {MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

import {useVirtualizer} from '@tanstack/react-virtual';
import cx from 'classnames';

import {MarkerComponent} from 'Components/MessagesList/Message/Marker';
import {Message} from 'Components/MessagesList/Message/VirtualizedMessage';
import {MessagesListParams} from 'Components/MessagesList/MessageList.types';
import {UploadAssets} from 'Components/MessagesList/UploadAssets';
import {verticallyCenterMessage} from 'Components/MessagesList/utils/helpers';
import {filterMessages} from 'Components/MessagesList/utils/messagesFilter';
import {useLoadConversation} from 'Components/MessagesList/utils/useLoadConversation';
import {useScrollToLastUnreadMessage} from 'Components/MessagesList/utils/useScrollToLastUnreadMessage';
import {groupMessagesBySenderAndTime, isMarker} from 'Components/MessagesList/utils/virtualizedMessagesGroup';
import {useLoadMessages} from 'Components/MessagesList/VirtualizedMessagesList/useLoadMessages';
import {useScrollMessages} from 'Components/MessagesList/VirtualizedMessagesList/useScrollMessages';
import {useRoveFocus} from 'Hooks/useRoveFocus';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {VirtualizedJumpToLastMessageButton} from '../VirtualizedJumpToLastMessageButton';

const ESTIMATED_ELEMENT_SIZE = 70;
const MARKER_ESTIMATE = 56;

interface Props extends Omit<MessagesListParams, 'isRightSidebarOpen' | 'onLoading'> {
  parentElement: HTMLDivElement;
  conversationLastReadTimestamp: MutableRefObject<number>;
  onLoading: (isLoading: boolean) => void;
}

export const VirtualizedMessagesList = ({
  conversation,
  parentElement,
  assetRepository,
  selfUser,
  conversationRepository,
  messageRepository,
  getVisibleCallback,
  invitePeople,
  cancelConnectionRequest,
  showUserDetails,
  showMessageDetails,
  showMessageReactions,
  showParticipants,
  showImageDetails,
  resetSession,
  onClickMessage,
  messageActions,
  isMsgElementsFocusable,
  setMsgElementsFocusable,
  conversationLastReadTimestamp,
  updateConversationLastRead,
  onLoading,
  isConversationLoaded,
}: Props) => {
  const {
    messages: allMessages,
    lastDeliveredMessage,
    isGuestRoom,
    isGuestAndServicesRoom,
    isActiveParticipant,
    inTeam,
    isLoadingMessages,
    hasAdditionalMessages,
  } = useKoSubscribableChildren(conversation, [
    'inTeam',
    'isActiveParticipant',
    'messages',
    'lastDeliveredMessage',
    'isGuestRoom',
    'isGuestAndServicesRoom',
    'isLoadingMessages',
    'hasAdditionalMessages',
  ]);

  const {processQueue} = useKoSubscribableChildren(assetRepository, ['processQueue', 'uploadProgressQueue']);
  const currentConversationProcessQueue = processQueue.filter(item => item.conversationId === conversation.id);

  const filteredMessages = filterMessages(allMessages);

  const groupedMessages = useMemo(() => {
    return groupMessagesBySenderAndTime(filteredMessages, conversationLastReadTimestamp.current);
  }, [conversationLastReadTimestamp, filteredMessages]);

  const [highlightedMessage, setHighlightedMessage] = useState<string | undefined>(conversation.initialMessage()?.id);

  const {focusedId, handleKeyDown, setFocusedId} = useRoveFocus(filteredMessages.map(message => message.id));

  const shouldShowInvitePeople = isActiveParticipant && inTeam && (isGuestRoom || isGuestAndServicesRoom);

  const getItemKey = useCallback((index: number) => index, [groupedMessages]);

  const virtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => parentElement,
    estimateSize: index => {
      const item = groupedMessages[index];
      return isMarker(item) ? MARKER_ESTIMATE : ESTIMATED_ELEMENT_SIZE;
    },
    measureElement: (element, _entry, instance) => {
      const direction = instance.scrollDirection;
      if (direction === 'forward' || direction === null) {
        // Allow remeasuring when scrolling down or direction is null
        return element.getBoundingClientRect().height;
      }
      // When scrolling up, use cached measurement to prevent stuttering
      const indexKey = Number(element.getAttribute('data-index'));
      const cachedMeasurement = instance.measurementsCache[indexKey]?.size;

      if (cachedMeasurement === ESTIMATED_ELEMENT_SIZE) {
        return element.getBoundingClientRect().height;
      }

      return cachedMeasurement || element.getBoundingClientRect().height;
    },
    getItemKey,
  });

  // Hook for load current conversation
  const {loadConversation} = useLoadConversation({
    conversation,
    conversationRepository,
    conversationLastReadTimestamp,
    onLoading,
  });

  // Hook for scrolling to last unread message
  useScrollToLastUnreadMessage(virtualizer, {
    isConversationLoaded,
    groupedMessages,
    conversationLastReadTimestamp,
  });

  // Hook for loading preceding / following messages when user scrolls to top / bottom
  useLoadMessages(virtualizer, {
    conversation,
    conversationRepository,
    itemsLength: groupedMessages.length,
    shouldPullMessages: !isLoadingMessages && hasAdditionalMessages,
    isConversationLoaded,
    parentElement,
  });

  // Hook for scrolling messages when a new message is sent or received
  useScrollMessages(virtualizer, {
    messages: groupedMessages,
    userId: selfUser.id,
    isConversationLoaded,
  });

  // When a new conversation is opened using keyboard(enter), focus on the last message
  useEffect(() => {
    if (history.state?.eventKey === 'Enter') {
      const lastMessage = filteredMessages[filteredMessages.length - 1];
      setFocusedId(lastMessage?.id);

      // reset the eventKey to stop focusing on every new message user send/receive afterward
      // last message should be focused only when user enters a new conversation using keyboard(press enter)
      history.state.eventKey = '';
      window.history.replaceState(history.state, '', window.location.hash);
    }
  }, []);

  const scrolledToHighlightedMessage = useRef(false);

  const onTimestampClick = async (messageId: string) => {
    scrolledToHighlightedMessage.current = false;
    setHighlightedMessage(messageId);

    const clearHighlightedMessage = setTimeout(() => {
      setHighlightedMessage(undefined);
      scrolledToHighlightedMessage.current = false;
      clearTimeout(clearHighlightedMessage);
    }, 5000);

    const messageIsLoaded = conversation.getMessage(messageId);

    if (!messageIsLoaded) {
      const messageEntity = await messageRepository.getMessageInConversationById(conversation, messageId);
      conversation.removeMessages();
      void conversationRepository.getMessagesWithOffset(conversation, messageEntity);
    }
  };

  useLayoutEffect(() => {
    if (highlightedMessage && !scrolledToHighlightedMessage.current) {
      const highlightedMessageIndex = groupedMessages.findIndex(
        msg => !isMarker(msg) && msg.message.id === highlightedMessage,
      );

      if (highlightedMessageIndex !== -1) {
        virtualizer.scrollToIndex(highlightedMessageIndex, {align: 'center'});
        scrolledToHighlightedMessage.current = true;

        const setScrolledToHighlightedMessageTimeout = setTimeout(() => {
          clearTimeout(setScrolledToHighlightedMessageTimeout);
        }, 100);
      }
    }
  }, [groupedMessages, highlightedMessage]);

  const onJumpToLastMessageClick = async () => {
    setHighlightedMessage(undefined);
    conversation.initialMessage(undefined);

    if (!conversation.hasLastReceivedMessageLoaded()) {
      updateConversationLastRead(conversation);
      conversation.release();

      await loadConversation(conversation);
    }

    conversationLastReadTimestamp.current = allMessages[allMessages.length - 1].timestamp();

    const scrollTimeout = setTimeout(() => {
      virtualizer.scrollToIndex(groupedMessages.length - 1, {align: 'end'});
      clearTimeout(scrollTimeout);
    }, 100);
  };

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = groupedMessages.length - 1;
  const isLastMessageVisible = virtualItems.some(item => item.index === lastIndex);

  useEffect(() => {
    // Timeout to ensure that the messages are rendered before calling getVisibleCallback
    const timeout = setTimeout(() => {
      if (!isConversationLoaded) {
        return;
      }

      virtualItems.forEach(virtualItem => {
        const item = groupedMessages[virtualItem.index];
        if (!isMarker(item)) {
          getVisibleCallback(conversation, item.message)?.();
        }
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [isConversationLoaded, virtualItems]);

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      virtualizer.measure();
    });
  }, [virtualizer, groupedMessages.length]);

  if (!isConversationLoaded) {
    return null;
  }

  return (
    <>
      <div
        className={cx('messages', {'flex-center': verticallyCenterMessage(filteredMessages)})}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map(virtualItem => {
          const item = groupedMessages[virtualItem.index];
          const isLast = virtualItem.index === groupedMessages.length - 1;

          return (
            <div
              key={virtualItem.key}
              style={{
                minHeight: `${virtualItem.size}px`,
                transform: `translate3d(0, ${virtualItem.start}px, 0)`,
                willChange: 'transform',
              }}
              css={{
                position: 'absolute',
                width: '100%',
                ...(isLast &&
                  !currentConversationProcessQueue?.length && {
                    '.message': {
                      paddingBottom: '40px',
                    },
                  }),
              }}
            >
              {isMarker(item) ? (
                <MarkerComponent marker={item} measureElement={virtualizer.measureElement} index={virtualItem.index} />
              ) : (
                <Message
                  measureElement={virtualizer.measureElement}
                  index={virtualItem.index}
                  message={item.message}
                  hideHeader={item.shouldGroup}
                  messageActions={messageActions}
                  conversation={conversation}
                  hasReadReceiptsTurnedOn={conversationRepository.expectReadReceipt(conversation)}
                  isLastDeliveredMessage={lastDeliveredMessage?.id === item.message.id}
                  isHighlighted={!!highlightedMessage && highlightedMessage === item.message.id}
                  isSelfTemporaryGuest={selfUser.isTemporaryGuest()}
                  messageRepository={messageRepository}
                  onClickAvatar={showUserDetails}
                  onClickCancelRequest={cancelConnectionRequest}
                  onClickImage={showImageDetails}
                  onClickInvitePeople={() => invitePeople(conversation)}
                  onClickReactionDetails={message => showMessageReactions(message, true)}
                  onClickMessage={onClickMessage}
                  onClickParticipants={showParticipants}
                  onClickDetails={message => showMessageDetails(message)}
                  onClickResetSession={resetSession}
                  onClickTimestamp={onTimestampClick}
                  selfId={selfUser.qualifiedId}
                  shouldShowInvitePeople={shouldShowInvitePeople}
                  isFocused={!!focusedId && focusedId === item.message.id}
                  handleFocus={setFocusedId}
                  handleArrowKeyDown={handleKeyDown}
                  isMsgElementsFocusable={isMsgElementsFocusable}
                  setMsgElementsFocusable={setMsgElementsFocusable}
                />
              )}
            </div>
          );
        })}

        {currentConversationProcessQueue?.length > 0 && (
          <div
            key={`upload-assets-${conversation.id}`}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              width: '100%',
              transform: `translateY(${virtualizer.getTotalSize()}px)`,
              paddingBottom: '40px',
            }}
          >
            <UploadAssets
              assetRepository={assetRepository}
              conversationId={conversation.id}
              scrollToEnd={() => virtualizer.scrollToOffset(parentElement.scrollHeight, {align: 'end'})}
            />
          </div>
        )}
      </div>

      {!isLastMessageVisible && <VirtualizedJumpToLastMessageButton onGoToLastMessage={onJumpToLastMessageClick} />}
    </>
  );
};
