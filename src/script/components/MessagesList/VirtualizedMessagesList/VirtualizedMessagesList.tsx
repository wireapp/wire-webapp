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

import {MutableRefObject, useEffect, useState} from 'react';

import {useVirtualizer} from '@tanstack/react-virtual';
import cx from 'classnames';

import {MarkerComponent} from 'Components/MessagesList/Message/Marker';
import {Message} from 'Components/MessagesList/Message/VirtualizedMessage';
import {MessagesListParams} from 'Components/MessagesList/MessageList.types';
import {UploadAssets} from 'Components/MessagesList/UploadAssets';
import {verticallyCenterMessage} from 'Components/MessagesList/utils/helpers';
import {filterMessages} from 'Components/MessagesList/utils/messagesFilter';
import {groupMessagesBySenderAndTime, isMarker} from 'Components/MessagesList/utils/virtualizedMessagesGroup';
import {useLoadMessages} from 'Components/MessagesList/VirtualizedMessagesList/useLoadMessages';
import {useScrollMessages} from 'Components/MessagesList/VirtualizedMessagesList/useScrollMessages';
import {useRoveFocus} from 'Hooks/useRoveFocus';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {VirtualizedJumpToLastMessageButton} from '../VirtualizedJumpToLastMessageButton';

const ESTIMATED_ELEMENT_SIZE = 36;

interface Props extends Omit<MessagesListParams, 'isRightSidebarOpen' | 'onLoading' | 'isConversationLoaded'> {
  parentElement: HTMLDivElement;
  conversationLastReadTimestamp: MutableRefObject<number>;
  loadConversation: (conversation: Conversation) => Promise<MessageEntity[]>;
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
  loadConversation,
}: Props) => {
  const {
    messages: allMessages,
    lastDeliveredMessage,
    isGuestRoom,
    isGuestAndServicesRoom,
    isActiveParticipant,
    inTeam,
  } = useKoSubscribableChildren(conversation, [
    'inTeam',
    'isActiveParticipant',
    'messages',
    'lastDeliveredMessage',
    'isGuestRoom',
    'isGuestAndServicesRoom',
  ]);

  const filteredMessages = filterMessages(allMessages);
  const groupedMessages = groupMessagesBySenderAndTime(filteredMessages, conversationLastReadTimestamp.current);

  const initialMessageId = conversation.initialMessage()?.id;

  const [highlightedMessage, setHighlightedMessage] = useState<string | undefined>(undefined);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [alreadyScrolledToLastMessage, setAlreadyScrolledToLastMessage] = useState(false);

  useEffect(() => {
    if (!initialMessageId) {
      return () => undefined;
    }

    setHighlightedMessage(initialMessageId);

    const timeout = setTimeout(() => {
      setHighlightedMessage(undefined);
      conversation.initialMessage(undefined);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [conversation, initialMessageId]);

  const {focusedId, handleKeyDown, setFocusedId} = useRoveFocus(filteredMessages.map(message => message.id));

  const shouldShowInvitePeople = isActiveParticipant && inTeam && (isGuestRoom || isGuestAndServicesRoom);

  const virtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => parentElement,
    estimateSize: () => ESTIMATED_ELEMENT_SIZE,
    measureElement: element => element?.getBoundingClientRect().height || ESTIMATED_ELEMENT_SIZE,
    overscan: 2,
  });

  useLoadMessages(virtualizer, {
    conversation,
    conversationRepository,
    loadingMessages,
    onLoadingMessages: setLoadingMessages,
    itemsLength: groupedMessages.length,
    initialMessageId,
  });

  useScrollMessages(virtualizer, {
    messages: groupedMessages,
    highlightedMessage,
    userId: selfUser.id,
    conversationLastReadTimestamp,
    setAlreadyScrolledToLastMessage,
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

  const onTimestampClick = async (messageId: string) => {
    setHighlightedMessage(messageId);

    const highlightMessageTimeout = setTimeout(() => setHighlightedMessage(undefined), 3000);
    clearTimeout(highlightMessageTimeout);

    const messageIsLoaded = conversation.getMessage(messageId);

    if (!messageIsLoaded) {
      const messageEntity = await messageRepository.getMessageInConversationById(conversation, messageId);
      conversation.removeMessages();
      conversationRepository.getMessagesWithOffset(conversation, messageEntity);
    }
  };

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex = groupedMessages.length - 1;
  const isLastMessageVisible = virtualItems.some(item => item.index === lastIndex);

  const onJumpToLastMessageClick = async () => {
    setHighlightedMessage(undefined);
    conversation.initialMessage(undefined);

    if (!conversation.hasLastReceivedMessageLoaded()) {
      updateConversationLastRead(conversation);
      conversation.release();

      await loadConversation(conversation);
    }

    conversationLastReadTimestamp.current = groupedMessages[groupedMessages.length - 1].timestamp;

    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(groupedMessages.length - 1, {align: 'end'});
    });
  };

  useEffect(() => {
    // Timeout to ensure that the messages are rendered before calling getVisibleCallback
    const timeout = setTimeout(() => {
      if (alreadyScrolledToLastMessage) {
        virtualItems.forEach(virtualItem => {
          const item = groupedMessages[virtualItem.index];
          if (!isMarker(item)) {
            getVisibleCallback(conversation, item.message)?.();
          }
        });
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [alreadyScrolledToLastMessage, virtualItems]);

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
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              key={virtualItem.index}
              style={{
                position: 'absolute',
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: isLast ? '40px' : '0px',
              }}
            >
              {isMarker(item) ? (
                <MarkerComponent marker={item} />
              ) : (
                <Message
                  key={`${item.message.id || 'message'}-${item.message.timestamp()}`}
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

        <UploadAssets assetRepository={assetRepository} conversationId={conversation.id} />
      </div>

      {!isLastMessageVisible && <VirtualizedJumpToLastMessageButton onGoToLastMessage={onJumpToLastMessageClick} />}
    </>
  );
};
