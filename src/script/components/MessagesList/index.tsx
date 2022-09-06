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

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {DecryptErrorMessage} from 'src/script/entity/message/DecryptErrorMessage';
import {MemberMessage} from 'src/script/entity/message/MemberMessage';
import {Message as MessageEntity} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {StatusType} from '../../message/StatusType';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import Message from './Message';
import {Text} from 'src/script/entity/message/Text';
import {useResizeObserver} from '../../ui/resizeObserver';
import {isMemberMessage} from '../../guards/Message';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';

type FocusedElement = {center?: boolean; element: Element};
interface MessagesListParams {
  cancelConnectionRequest: (message: MemberMessage) => void;
  conversation: Conversation;
  conversationRepository: Pick<
    ConversationRepository,
    'getPrecedingMessages' | 'getMessagesWithOffset' | 'updateParticipatingUserEntities' | 'expectReadReceipt'
  >;
  getVisibleCallback: (conversation: Conversation, message: MessageEntity) => () => void | undefined;
  initialMessage: MessageEntity;
  invitePeople: (convesation: Conversation) => void;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: MessageEntity) => void;
    deleteMessageEveryone: (conversation: Conversation, message: MessageEntity) => void;
  };
  messageRepository: MessageRepository;
  onClickMessage: (message: ContentMessage | Text, event: React.UIEvent) => void;
  onLoading: (isLoading: boolean) => void;
  resetSession: (messageError: DecryptErrorMessage) => void;
  selfUser: User;
  showImageDetails: (message: MessageEntity, event: React.UIEvent) => void;
  showMessageDetails: (message: MessageEntity, showLikes?: boolean) => void;
  showParticipants: (users: User[]) => void;
  showUserDetails: (user: User | ServiceEntity) => void;
}

const filterDuplicatedMemberMessages = (messages: MessageEntity[]) => {
  const typesToFilter = ['conversation.member-join', 'conversation.group-creation', 'conversation.member-leave'];
  return messages.reduce<MessageEntity[]>((uniqMessages, currentMessage) => {
    if (isMemberMessage(currentMessage)) {
      const uniqMemberMessages = uniqMessages.filter(isMemberMessage);

      if (!!uniqMemberMessages.length && typesToFilter.includes(currentMessage.type)) {
        switch (currentMessage.type) {
          case 'conversation.group-creation':
            // Dont show duplicated group creation messages
            if (uniqMemberMessages.some(m => m.type === currentMessage.type)) {
              return uniqMessages;
            }
          case 'conversation.member-join':
          case 'conversation.member-leave':
            // Dont show duplicated member join/leave messages that follow each other
            if (uniqMemberMessages?.[uniqMemberMessages.length - 1]?.htmlCaption() === currentMessage.htmlCaption()) {
              return uniqMessages;
            }
        }
      }
    }

    return [...uniqMessages, currentMessage];
  }, []);
};

const filterHiddenMessages = (messages: MessageEntity[]) => messages.filter(message => message.visible());

const MessagesList: React.FC<MessagesListParams> = ({
  conversation,
  initialMessage,
  selfUser,
  conversationRepository,
  messageRepository,
  getVisibleCallback,
  onClickMessage,
  showUserDetails,
  showMessageDetails,
  showImageDetails,
  showParticipants,
  cancelConnectionRequest,
  resetSession,
  invitePeople,
  messageActions,
  onLoading,
}) => {
  const {
    messages: allMessages,
    lastDeliveredMessage,
    isGuestRoom,
    isGuestAndServicesRoom,
  } = useKoSubscribableChildren(conversation, [
    'messages',
    'lastDeliveredMessage',
    'isGuestRoom',
    'isGuestAndServicesRoom',
  ]);
  const [loaded, setLoaded] = useState(false);
  const [focusedMessage, setFocusedMessage] = useState<string | undefined>(initialMessage?.id);

  const filteredMessages = filterDuplicatedMemberMessages(filterHiddenMessages(allMessages));

  const shouldShowInvitePeople =
    conversation.isActiveParticipant() && conversation.inTeam() && (isGuestRoom || isGuestAndServicesRoom);

  const loadConversation = async (conversation: Conversation, message?: MessageEntity): Promise<MessageEntity[]> => {
    await conversationRepository.updateParticipatingUserEntities(conversation, false, true);

    return message
      ? conversationRepository.getMessagesWithOffset(conversation, message)
      : conversationRepository.getPrecedingMessages(conversation);
  };

  const verticallyCenterMessage = (): boolean => {
    if (filteredMessages.length === 1) {
      const [firstMessage] = filteredMessages;
      return firstMessage.isMember() && firstMessage.isConnection();
    }
    return false;
  };

  const [messagesContainer, setContainer] = useState<HTMLDivElement | null>(null);
  const scrollHeight = useRef(0);
  const nbMessages = useRef(0);
  const focusedElement = useRef<FocusedElement | null>(null);
  const conversationLastReadTimestamp = useRef(conversation.last_read_timestamp());

  const updateScroll = (container: Element | null) => {
    const scrollingContainer = container?.parentElement;
    if (!scrollingContainer || !loaded) {
      return;
    }
    const lastMessage = filteredMessages[filteredMessages.length - 1];
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
      const behavior = nbMessages.current !== filteredMessages.length ? 'smooth' : 'auto';
      // Simple content update, we just scroll to bottom if we are in the stick to bottom threshold
      scrollingContainer.scrollTo?.({behavior, top: scrollingContainer.scrollHeight});
    } else if (lastMessage && lastMessage.status() === StatusType.SENDING && lastMessage.user().id === selfUser.id) {
      // The self user just sent a message, we scroll straight to the bottom
      scrollingContainer.scrollTo?.({behavior: 'smooth', top: scrollingContainer.scrollHeight});
    }
    scrollHeight.current = scrollingContainer.scrollHeight;
    nbMessages.current = filteredMessages.length;
  };

  // Listen to resizes of the the container element (if it's resized it means something has changed in the message list)
  useResizeObserver(messagesContainer, () => updateScroll(messagesContainer));
  // Also listen to the scrolling container resizes (when the window resizes or the inputBar changes)
  useResizeObserver(messagesContainer?.parentElement, () => updateScroll(messagesContainer));
  useLayoutEffect(() => {
    if (messagesContainer) {
      updateScroll(messagesContainer);
    }
  }, [filteredMessages.length, messagesContainer]);

  useEffect(() => {
    onLoading(true);
    loadConversation(conversation, initialMessage).then(() => {
      setTimeout(() => {
        setLoaded(true);
        onLoading(false);
      }, 10);
    });
  }, []);

  if (!loaded) {
    return null;
  }

  const messageViews = filteredMessages.map((message, index) => {
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
        onClickLikes={message => showMessageDetails(message, true)}
        onClickMessage={onClickMessage}
        onClickParticipants={showParticipants}
        onClickReceipts={message => showMessageDetails(message)}
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
        onLike={message => messageRepository.toggleLike(conversation, message)}
        selfId={selfUser.qualifiedId}
        shouldShowInvitePeople={shouldShowInvitePeople}
      />
    );
  });

  return (
    <div ref={setContainer} className={`messages ${verticallyCenterMessage() ? 'flex-center' : ''}`}>
      {messageViews}
    </div>
  );
};

export default MessagesList;

registerReactComponent('messages-list', MessagesList);
