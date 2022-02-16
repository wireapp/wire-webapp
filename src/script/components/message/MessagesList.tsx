import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {DecryptErrorMessage} from 'src/script/entity/message/DecryptErrorMessage';
import {MemberMessage} from 'src/script/entity/message/MemberMessage';
import {Message} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {StatusType} from '../../message/StatusType';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import MessageWrapper from './MessageWrapper';
import {Text} from 'src/script/entity/message/Text';

interface MessagesListParams {
  cancelConnectionRequest: (message: MemberMessage) => void;
  conversation: Conversation;
  conversationRepository: Pick<
    ConversationRepository,
    'getPrecedingMessages' | 'getMessagesWithOffset' | 'updateParticipatingUserEntities' | 'expectReadReceipt'
  >;
  getVisibleCallback: (conversation: Conversation, message: Message) => () => void | undefined;
  initialMessage: Message;
  invitePeople: (convesation: Conversation) => void;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: Message) => void;
    deleteMessageEveryone: (conversation: Conversation, message: Message) => void;
  };
  messageRepository: MessageRepository;
  onClickMessage: (message: ContentMessage | Text, event: React.MouseEvent) => void;
  onLoading: (isLoading: boolean) => void;
  resetSession: (messageError: DecryptErrorMessage) => void;
  selfUser: User;
  showImageDetails: (message: Message, event: React.MouseEvent) => void;
  showMessageDetails: (message: Message, showLikes?: boolean) => void;
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
  const {messages: allMessages, lastDeliveredMessage} = useKoSubscribableChildren(conversation, [
    'messages',
    'lastDeliveredMessage',
  ]);
  const messages = allMessages.filter(message => message.visible());
  const [loaded, setLoaded] = useState(false);
  const [focusedMessage, setFocusedMessage] = useState<string | undefined>(initialMessage?.id);

  const conversationLastReadTimestamp = useMemo(() => conversation.last_read_timestamp(), []);
  const shouldShowInvitePeople =
    conversation.isActiveParticipant() && conversation.inTeam() && conversation.isGuestRoom();

  const loadConversation = async (conversation: Conversation, message?: Message): Promise<Message[]> => {
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

  const container = useRef<HTMLDivElement | null>(null);
  const scrollHeight = useRef(0);

  const updateScroll = (visibleElement?: {center?: boolean; element: HTMLElement}) => {
    if (!container.current) {
      return;
    }
    const scrollingContainer = container.current.parentElement;
    if (!scrollingContainer) {
      return;
    }
    const lastMessage = messages[messages.length - 1];
    const previousScrollHeight = scrollHeight.current;
    const scrollBottomPosition = scrollingContainer.scrollTop + scrollingContainer.clientHeight;
    const shouldStickToBottom = previousScrollHeight - scrollBottomPosition < 100;

    if (visibleElement) {
      // If we have an element we want to focus
      const {element, center} = visibleElement;
      element.scrollIntoView(center ? {block: 'center'} : true);
    } else if (lastMessage && lastMessage.status() === StatusType.SENDING && lastMessage.user().id === selfUser.id) {
      // The self user just sent a message, we scroll straight to the bottom
      scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
    } else if (scrollingContainer.scrollTop === 0 && scrollingContainer.scrollHeight > previousScrollHeight) {
      // If we hit the top and new messages were loaded, we keep the scroll position stable
      scrollingContainer.scrollTop = scrollingContainer.scrollHeight - previousScrollHeight;
    } else if (shouldStickToBottom) {
      // Simple content update, we just scroll to bottom if we are in the stick to bottom threshold
      scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
    }
    scrollHeight.current = scrollingContainer.scrollHeight;
  };

  useLayoutEffect(() => {
    if (loaded) {
      // Update the scroll when the message list is updated
      updateScroll();
    }
  }, [messages.length, loaded]);

  useEffect(() => {
    onLoading(true);
    loadConversation(conversation, initialMessage).then(() => {
      setTimeout(() => {
        setLoaded(true);
        onLoading(false);
      }, 100);
    });
  }, []);

  const messageViews = messages.map((message, index) => {
    const previousMessage = messages[index - 1];
    const isLastDeliveredMessage = lastDeliveredMessage?.id === message.id;

    const visibleCallback = getVisibleCallback(conversation, message);
    return (
      <MessageWrapper
        key={message.id}
        onVisible={visibleCallback}
        message={message}
        previousMessage={previousMessage}
        messageActions={messageActions}
        conversation={conversation}
        conversationLastReadTimestamp={conversationLastReadTimestamp}
        hasReadReceiptsTurnedOn={conversationRepository.expectReadReceipt(conversation)}
        isLastDeliveredMessage={isLastDeliveredMessage}
        isMarked={!!focusedMessage && focusedMessage === message.id}
        scrollTo={(element, center) => updateScroll({center, element})}
        isSelfTemporaryGuest={selfUser.isTemporaryGuest()}
        messageRepository={messageRepository}
        lastReadTimestamp={conversationLastReadTimestamp}
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
        onContentUpdated={() => updateScroll()}
        onLike={message => messageRepository.toggleLike(conversation, message)}
        selfId={selfUser.qualifiedId}
        shouldShowInvitePeople={shouldShowInvitePeople}
      />
    );
  });
  if (!loaded) {
    return null;
  }
  return (
    <div ref={container} className={`messages ${verticallyCenterMessage() ? 'flex-center' : ''}`}>
      {messageViews}
    </div>
  );
};

export default MessagesList;

registerStaticReactComponent('messages-list', MessagesList);
