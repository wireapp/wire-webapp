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
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import Message from './Message';
import {Text} from 'src/script/entity/message/Text';
import {useResizeObserver} from '../../ui/resizeObserver';
import useEffectRef from 'Util/useEffectRef';

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
  onClickMessage: (message: ContentMessage | Text, event: React.MouseEvent) => void;
  onLoading: (isLoading: boolean) => void;
  resetSession: (messageError: DecryptErrorMessage) => void;
  selfUser: User;
  showImageDetails: (message: MessageEntity, event: React.MouseEvent | React.KeyboardEvent) => void;
  showMessageDetails: (message: MessageEntity, showLikes?: boolean) => void;
  showParticipants: (users: User[]) => void;
  showUserDetails: (user: User) => void;
}

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
  const messages = allMessages.filter(message => message.visible());
  const [loaded, setLoaded] = useState(false);
  const [focusedMessage, setFocusedMessage] = useState<string | undefined>(initialMessage?.id);

  const shouldShowInvitePeople =
    conversation.isActiveParticipant() && conversation.inTeam() && (isGuestRoom || isGuestAndServicesRoom);

  const loadConversation = async (conversation: Conversation, message?: MessageEntity): Promise<MessageEntity[]> => {
    await conversationRepository.updateParticipatingUserEntities(conversation, false, true);

    return message
      ? conversationRepository.getMessagesWithOffset(conversation, message)
      : conversationRepository.getPrecedingMessages(conversation);
  };

  const verticallyCenterMessage = (): boolean => {
    if (messages.length === 1) {
      const [firstMessage] = messages;
      return firstMessage.isMember() && firstMessage.isConnection();
    }
    return false;
  };

  const [messagesContainer, setContainer] = useEffectRef<HTMLDivElement | null>(null);
  const scrollHeight = useRef(0);
  const nbMessages = useRef(0);
  const focusedElement = useRef<FocusedElement | null>(null);
  const conversationLastReadTimestamp = useRef(conversation.last_read_timestamp());

  const updateScroll = (container: Element | null) => {
    const scrollingContainer = container?.parentElement;
    if (!scrollingContainer || !loaded) {
      return;
    }
    const lastMessage = messages[messages.length - 1];
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
      const behavior = nbMessages.current !== messages.length ? 'smooth' : 'auto';
      // Simple content update, we just scroll to bottom if we are in the stick to bottom threshold
      scrollingContainer.scrollTo?.({behavior, top: scrollingContainer.scrollHeight});
    } else if (lastMessage && lastMessage.status() === StatusType.SENDING && lastMessage.user().id === selfUser.id) {
      // The self user just sent a message, we scroll straight to the bottom
      scrollingContainer.scrollTo?.({behavior: 'smooth', top: scrollingContainer.scrollHeight});
    }
    scrollHeight.current = scrollingContainer.scrollHeight;
    nbMessages.current = messages.length;
  };

  // Listen to resizes of the the container element (if it's resized it means something has changed in the message list)
  useResizeObserver(messagesContainer, () => updateScroll(messagesContainer));
  // Also listen to the scrolling container resizes (when the window resizes or the inputBar changes)
  useResizeObserver(messagesContainer?.parentElement, () => updateScroll(messagesContainer));
  useLayoutEffect(() => {
    if (messagesContainer) {
      updateScroll(messagesContainer);
    }
  }, [messages.length, messagesContainer]);

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

  const messageViews = messages.map((message, index) => {
    const previousMessage = messages[index - 1];
    const isLastDeliveredMessage = lastDeliveredMessage?.id === message.id;

    const visibleCallback = getVisibleCallback(conversation, message);
    return (
      <Message
        key={message.id}
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

registerStaticReactComponent('messages-list', MessagesList);
