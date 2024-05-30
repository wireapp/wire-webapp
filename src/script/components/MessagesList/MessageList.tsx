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

import React, {FC, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {filterMessages} from 'Components/MessagesList/utils/messagesFilter';
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

import {Message, MessageActions} from './Message';
import {MarkerComponent} from './Message/Marker';
import {ScrollToElement} from './Message/types';
import {groupMessagesBySenderAndTime, isMarker} from './utils/messagesGroup';
import {updateScroll, FocusedElement} from './utils/scrollUpdater';

import {Conversation as ConversationEntity, Conversation} from '../../entity/Conversation';
import {isContentMessage} from '../../guards/Message';

interface MessagesListParams {
  cancelConnectionRequest: (message: MemberMessage) => void;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  getVisibleCallback: (conversationEntity: Conversation, messageEntity: MessageEntity) => (() => void) | undefined;
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
  isRightSidebarOpen?: boolean;
}

export const MessagesList: FC<MessagesListParams> = ({
  conversation,
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
  isRightSidebarOpen = false,
}) => {
  const {
    messages: allMessages,
    lastDeliveredMessage,
    isGuestRoom,
    isGuestAndServicesRoom,
    isActiveParticipant,
    inTeam,
    isLoadingMessages,
    hasAdditionalMessages,
    initialMessage,
  } = useKoSubscribableChildren(conversation, [
    'inTeam',
    'isActiveParticipant',
    'messages',
    'lastDeliveredMessage',
    'isGuestRoom',
    'isGuestAndServicesRoom',
    'isLoadingMessages',
    'hasAdditionalMessages',
    'initialMessage',
  ]);

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [highlightedMessage, setHighlightedMessage] = useState<string | undefined>(initialMessage?.id);
  const conversationLastReadTimestamp = useRef(conversation.last_read_timestamp());

  const filteredMessages = filterMessages(allMessages);
  const filteredMessagesLength = filteredMessages.length;

  const groupedMessages = groupMessagesBySenderAndTime(filteredMessages, conversationLastReadTimestamp.current);

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

  const syncScrollPosition = useCallback(() => {
    const scrollingContainer = messagesContainer?.parentElement;
    if (!scrollingContainer || !loaded) {
      return;
    }

    const newScrollHeight = updateScroll(scrollingContainer, {
      focusedElement: focusedElement.current,
      prevScrollHeight: scrollHeight.current,
      prevNbMessages: nbMessages.current,
      messages: filteredMessages,
      selfUserId: selfUser?.id,
    });

    nbMessages.current = filteredMessages.length;
    scrollHeight.current = newScrollHeight;
  }, [messagesContainer?.parentElement, loaded, filteredMessages, selfUser?.id]);

  // Listen to resizes of the the content element (if it's resized it means something has changed in the message list, link a link preview was generated)
  useResizeObserver(syncScrollPosition, messagesContainer);
  // Also listen to the scrolling container resizes (when the window resizes or the inputBar changes)
  useResizeObserver(syncScrollPosition, messagesContainer?.parentElement);

  useLayoutEffect(syncScrollPosition, [syncScrollPosition]);

  const loadPrecedingMessages = async (): Promise<void> => {
    const shouldPullMessages = !isLoadingMessages && hasAdditionalMessages;

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

  const {focusedId, handleKeyDown, setFocusedId} = useRoveFocus(filteredMessages.map(message => message.id));

  // when a new conversation is opened using keyboard(enter), focus on the last message
  useEffect(() => {
    if (loaded && history.state?.eventKey === 'Enter') {
      const lastMessage = filteredMessages[filteredMessages.length - 1];
      setFocusedId(lastMessage?.id);

      // reset the eventKey to stop focusing on every new message user send/receive afterwards
      // last message should be focused only when user enters a new conversation using keyboard(press enter)
      history.state.eventKey = '';
      window.history.replaceState(history.state, '', window.location.hash);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const scrollToElement: ScrollToElement = ({element, center}, isUnread) => {
    if (isUnread && messagesContainer) {
      // if it's a new unread message, but we are not on the first render of the list,
      // we do not need to scroll to the unread message
      return;
    }
    focusedElement.current = {center, element};
    setTimeout(() => (focusedElement.current = null), 1000);
    syncScrollPosition();
  };

  return (
    <FadingScrollbar
      ref={messageListRef}
      id="message-list"
      className={cx('message-list', {'is-right-panel-open': isRightSidebarOpen})}
      tabIndex={TabIndex.UNFOCUSABLE}
    >
      <div ref={setMessageContainer} className={cx('messages', {'flex-center': verticallyCenterMessage()})}>
        {groupedMessages.flatMap(group => {
          if (isMarker(group)) {
            return (
              <MarkerComponent key={`${group.type}-${group.timestamp}`} scrollTo={scrollToElement} marker={group} />
            );
          }
          const {messages, firstMessageTimestamp} = group;

          return messages.map(message => {
            const isLastDeliveredMessage = lastDeliveredMessage?.id === message.id;

            const visibleCallback = getVisibleCallback(conversation, message);

            const key = `${message.id || 'message'}-${message.timestamp()}`;

            const isHighlighted = !!highlightedMessage && highlightedMessage === message.id;
            const isFocused = !!focusedId && focusedId === message.id;

            return (
              <Message
                key={key}
                onVisible={visibleCallback}
                message={message}
                hideHeader={message.timestamp() !== firstMessageTimestamp}
                messageActions={messageActions}
                conversation={conversation}
                hasReadReceiptsTurnedOn={conversationRepository.expectReadReceipt(conversation)}
                isLastDeliveredMessage={isLastDeliveredMessage}
                isHighlighted={isHighlighted}
                scrollTo={scrollToElement}
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
                onClickTimestamp={async function (messageId: string) {
                  setHighlightedMessage(messageId);
                  setTimeout(() => setHighlightedMessage(undefined), 5000);
                  const messageIsLoaded = conversation.getMessage(messageId);

                  if (!messageIsLoaded) {
                    const messageEntity = await messageRepository.getMessageInConversationById(conversation, messageId);
                    conversation.removeMessages();
                    conversationRepository.getMessagesWithOffset(conversation, messageEntity);
                  }
                }}
                selfId={selfUser.qualifiedId}
                shouldShowInvitePeople={shouldShowInvitePeople}
                isFocused={isFocused}
                handleFocus={setFocusedId}
                handleArrowKeyDown={handleKeyDown}
                isMsgElementsFocusable={isMsgElementsFocusable}
                setMsgElementsFocusable={setMsgElementsFocusable}
              />
            );
          });
        })}
      </div>
    </FadingScrollbar>
  );
};
