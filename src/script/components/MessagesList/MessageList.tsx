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

import React, {FC, useEffect, useLayoutEffect, useRef, useState} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {DecryptErrorMessage} from 'src/script/entity/message/DecryptErrorMessage';
import {MemberMessage} from 'src/script/entity/message/MemberMessage';
import {Message as MessageEntity} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {useRoveFocus} from 'src/script/hooks/useRoveFocus';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {onHitTopOrBottom} from 'Util/DOM/onHitTopOrBottom';
import {useResizeObserver} from 'Util/DOM/resizeObserver';
import {filterMessages} from 'Util/messagesFilterUtil';

import {Message, MessageActions} from './Message';

import {Conversation as ConversationEntity, Conversation} from '../../entity/Conversation';
import {isContentMessage} from '../../guards/Message';
import {StatusType} from '../../message/StatusType';

type FocusedElement = {center?: boolean; element: Element};

interface MessagesListParams {
  cancelConnectionRequest: (message: MemberMessage) => void;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  getVisibleCallback: (conversationEntity: Conversation, messageEntity: MessageEntity) => (() => void) | undefined;
  initialMessage?: MessageEntity;
  invitePeople: (convesation: Conversation) => void;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: MessageEntity) => void;
    deleteMessageEveryone: (conversation: Conversation, message: MessageEntity) => void;
  };
  messageRepository: MessageRepository;
  onClickMessage: MessageActions['onClickMessage'];
  onLoading: (isLoading: boolean) => void;
  resetSession: (messageError: DecryptErrorMessage) => void;
  selfUser: User;
  showImageDetails: (message: ContentMessage, event: React.UIEvent) => void;
  showMessageDetails: (message: MessageEntity, showReactions?: boolean) => void;
  showMessageReactions: (message: MessageEntity, showReactions?: boolean) => void;
  showParticipants: (users: User[]) => void;
  showUserDetails: (user: User | ServiceEntity) => void;
  isLastReceivedMessage: (messageEntity: MessageEntity, conversationEntity: ConversationEntity) => boolean;
  isMsgElementsFocusable: boolean;
  setMsgElementsFocusable: (isMsgElementsFocusable: boolean) => void;
}

const MessagesList: FC<MessagesListParams> = ({
  conversation,
  initialMessage,
  selfUser,
  conversationRepository,
  messageRepository,
  getVisibleCallback,
  onClickMessage,
  showUserDetails,
  showMessageDetails,
  showMessageReactions,
  showImageDetails,
  showParticipants,
  cancelConnectionRequest,
  resetSession,
  invitePeople,
  messageActions,
  onLoading,
  isLastReceivedMessage,
  isMsgElementsFocusable,
  setMsgElementsFocusable,
}) => {
  const {
    messages: allMessages,
    lastDeliveredMessage,
    isGuestRoom,
    isGuestAndServicesRoom,
    isActiveParticipant,
    inTeam,
    is_pending: isPending,
    hasAdditionalMessages,
  } = useKoSubscribableChildren(conversation, [
    'inTeam',
    'isActiveParticipant',
    'messages',
    'lastDeliveredMessage',
    'isGuestRoom',
    'isGuestAndServicesRoom',
    'is_pending',
    'hasAdditionalMessages',
  ]);

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [focusedMessage, setFocusedMessage] = useState<string | undefined>(initialMessage?.id);

  const filteredMessages = filterMessages(allMessages);
  const filteredMessagesLength = filteredMessages.length;

  const [messagesContainer, setMessageContainer] = useState<HTMLDivElement | null>(null);

  const shouldShowInvitePeople = isActiveParticipant && inTeam && (isGuestRoom || isGuestAndServicesRoom);

  const loadConversation = async (conversation: Conversation, message?: MessageEntity): Promise<MessageEntity[]> => {
    await conversationRepository.updateParticipatingUserEntities(conversation, false, true);

    return message
      ? conversationRepository.getMessagesWithOffset(conversation, message)
      : conversationRepository.getPrecedingMessages(conversation);
  };

  const verticallyCenterMessage = (): boolean => {
    if (filteredMessagesLength === 1) {
      const [firstMessage] = filteredMessages;
      return firstMessage.isMember() && firstMessage.isConnection();
    }
    return false;
  };

  const scrollHeight = useRef(0);
  const nbMessages = useRef(0);
  const focusedElement = useRef<FocusedElement | null>(null);
  const conversationLastReadTimestamp = useRef(conversation.last_read_timestamp());

  const updateScroll = (container: Element | null) => {
    const scrollingContainer = container?.parentElement;

    if (!scrollingContainer || !loaded) {
      return;
    }

    const lastMessage = filteredMessages[filteredMessagesLength - 1];
    const previousScrollHeight = scrollHeight.current;
    const scrollBottomPosition = scrollingContainer.scrollTop + scrollingContainer.clientHeight;
    const shouldStickToBottom = previousScrollHeight - scrollBottomPosition < 100;

    if (focusedElement.current) {
      // If we have an element we want to focus
      const {element, center} = focusedElement.current;
      const elementPosition = element.getBoundingClientRect();
      const containerPosition = scrollingContainer.getBoundingClientRect();
      const scrollBy = scrollingContainer.scrollTop + elementPosition.top - containerPosition.top;
      scrollingContainer.scrollTo({top: scrollBy - (center ? scrollingContainer.offsetHeight / 2 : 0)});
    } else if (scrollingContainer.scrollTop === 0 && scrollingContainer.scrollHeight > previousScrollHeight) {
      // If we hit the top and new messages were loaded, we keep the scroll position stable
      scrollingContainer.scrollTop = scrollingContainer.scrollHeight - previousScrollHeight;
    } else if (shouldStickToBottom) {
      // We only want to animate the scroll if there are new messages in the list
      const behavior = nbMessages.current !== filteredMessagesLength ? 'smooth' : 'auto';
      // Simple content update, we just scroll to bottom if we are in the stick to bottom threshold
      scrollingContainer.scrollTo?.({behavior, top: scrollingContainer.scrollHeight});
    } else if (lastMessage && lastMessage.status() === StatusType.SENDING && lastMessage.user().id === selfUser.id) {
      // The self user just sent a message, we scroll straight to the bottom
      scrollingContainer.scrollTo?.({behavior: 'smooth', top: scrollingContainer.scrollHeight});
    }
    scrollHeight.current = scrollingContainer.scrollHeight;
    nbMessages.current = filteredMessagesLength;
  };

  // Listen to resizes of the the container element (if it's resized it means something has changed in the message list)
  useResizeObserver(() => updateScroll(messagesContainer), messagesContainer);
  // Also listen to the scrolling container resizes (when the window resizes or the inputBar changes)
  useResizeObserver(() => updateScroll(messagesContainer), messagesContainer?.parentElement);

  const loadPrecedingMessages = async (): Promise<void> => {
    const shouldPullMessages = !isPending && hasAdditionalMessages;

    if (shouldPullMessages) {
      await conversationRepository.getPrecedingMessages(conversation);
    }
  };

  const loadFollowingMessages = () => {
    const lastMessage = conversation.getNewestMessage();

    if (lastMessage) {
      if (!isLastReceivedMessage(lastMessage, conversation)) {
        // if the last loaded message is not the last of the conversation, we load the subsequent messages
        if (isContentMessage(lastMessage)) {
          conversationRepository.getSubsequentMessages(conversation, lastMessage);
        }
      }
    }
  };

  useLayoutEffect(() => {
    if (messagesContainer) {
      updateScroll(messagesContainer);
    }
  }, [messagesContainer, filteredMessagesLength]);

  useEffect(() => {
    onLoading(true);
    setLoaded(false);
    conversationLastReadTimestamp.current = conversation.last_read_timestamp();
    loadConversation(conversation, initialMessage).then(() => {
      setTimeout(() => {
        setLoaded(true);
        onLoading(false);
      }, 10);
    });
    return () => conversation.release();
  }, [conversation, initialMessage]);

  useLayoutEffect(() => {
    if (loaded && messageListRef.current) {
      onHitTopOrBottom(messageListRef.current, loadPrecedingMessages, loadFollowingMessages);
    }
  }, [loaded]);

  const defaultFocus = -1;
  const isMsgListInfinite = false;
  const {currentFocus, handleKeyDown, setCurrentFocus} = useRoveFocus(
    filteredMessagesLength,
    defaultFocus,
    isMsgListInfinite,
  );

  if (!loaded) {
    return null;
  }
  return (
    <FadingScrollbar ref={messageListRef} id="message-list" className="message-list" tabIndex={TabIndex.UNFOCUSABLE}>
      <div ref={setMessageContainer} className={cx('messages', {'flex-center': verticallyCenterMessage()})}>
        {filteredMessages.map((message, index) => {
          const previousMessage = filteredMessages[index - 1];
          const isLastDeliveredMessage = lastDeliveredMessage?.id === message.id;

          const visibleCallback = getVisibleCallback(conversation, message);

          const key = `${message.id || 'message'}-${message.timestamp()}`;

          return (
            <Message
              key={key}
              onVisible={visibleCallback}
              message={message}
              previousMessage={previousMessage}
              messageActions={messageActions}
              conversation={conversation}
              hasReadReceiptsTurnedOn={conversationRepository.expectReadReceipt(conversation)}
              isLastDeliveredMessage={isLastDeliveredMessage}
              isMarked={!!focusedMessage && focusedMessage === message.id}
              scrollTo={({element, center}, isUnread) => {
                if (isUnread && messagesContainer) {
                  // if it's a new unread message, but we are not on the first render of the list,
                  // we do not need to scroll to the unread message
                  return;
                }
                focusedElement.current = {center, element};
                setTimeout(() => (focusedElement.current = null), 1000);
                updateScroll(messagesContainer);
              }}
              isSelfTemporaryGuest={selfUser.isTemporaryGuest()}
              messageRepository={messageRepository}
              lastReadTimestamp={conversationLastReadTimestamp.current}
              onClickAvatar={showUserDetails}
              onClickCancelRequest={cancelConnectionRequest}
              onClickImage={showImageDetails}
              onClickInvitePeople={() => invitePeople(conversation)}
              onClickReactionDetails={message => showMessageReactions(message, true)}
              onClickMessage={onClickMessage}
              onClickParticipants={showParticipants}
              onClickDetails={message => showMessageDetails(message)}
              onClickResetSession={resetSession}
              onClickTimestamp={async function (messageId: string) {
                setFocusedMessage(messageId);
                setTimeout(() => setFocusedMessage(undefined), 5000);
                const messageIsLoaded = conversation.getMessage(messageId);

                if (!messageIsLoaded) {
                  const messageEntity = await messageRepository.getMessageInConversationById(conversation, messageId);
                  conversation.removeMessages();
                  conversationRepository.getMessagesWithOffset(conversation, messageEntity);
                }
              }}
              selfId={selfUser.qualifiedId}
              shouldShowInvitePeople={shouldShowInvitePeople}
              totalMessage={filteredMessagesLength}
              index={index}
              isMessageFocused={currentFocus === index}
              handleFocus={setCurrentFocus}
              handleArrowKeyDown={handleKeyDown}
              isMsgElementsFocusable={isMsgElementsFocusable}
              setMsgElementsFocusable={setMsgElementsFocusable}
            />
          );
        })}
      </div>
    </FadingScrollbar>
  );
};

export {MessagesList};
