import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {DecryptErrorMessage} from 'src/script/entity/message/DecryptErrorMessage';
import {MemberMessage} from 'src/script/entity/message/MemberMessage';
import {Message} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import MessageWrapper from './MessageWrapper';

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
  onClickMessage: (message: ContentMessage, event: React.MouseEvent) => void;
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
  const [focusedMessage, setFocusedMessage] = useState<string>(initialMessage?.id);

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

  const container = useRef();
  const scrollHeight = useRef(0);
  const updateScroll = (endElement: HTMLElement | undefined) => {
    if (!endElement) {
      return;
    }
    const scrollingContainer = endElement.parentElement;
    if (!scrollingContainer) {
      return;
    }
    const scrollPosition = scrollingContainer.scrollTop + scrollingContainer.clientHeight;
    const previousScrollHeight = scrollHeight.current;
    const shouldStickToBottom = scrollPosition > previousScrollHeight - 100;
    if (shouldStickToBottom) {
      scrollingContainer.scrollTo({top: scrollingContainer.scrollHeight});
    } else if (scrollPosition === 0) {
      // If we hit the top and new messages were loaded, we keep the scroll position stable
      scrollingContainer.scrollTo({top: scrollingContainer.scrollHeight - scrollHeight.current});
    }
    scrollHeight.current = scrollingContainer.scrollHeight;
  };

  useLayoutEffect(() => {
    // Update scroll position a first time synchronously
    updateScroll(container.current);
    setTimeout(() => {
      // in case some content loaded async, retrigger a scroll
      updateScroll(container.current);
    });
  }, [messages, container]);

  useEffect(() => {
    onLoading(true);
    loadConversation(conversation, initialMessage).then(() => {
      setTimeout(() => {
        if (!focusedMessage) {
          // We update the scroll in case there are no focused message
          updateScroll(container.current);
        }
        onLoading(false);
      }, 100);
    });
  }, []);

  const messageViews = messages.map((message, index) => {
    const previousMessage = index > 0 && messages[index - 1];
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
        isMarked={focusedMessage === message.id}
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
        onContentUpdated={() => updateScroll(container.current)}
        onLike={message => messageRepository.toggleLike(conversation, message)}
        selfId={selfUser.qualifiedId}
        shouldShowInvitePeople={shouldShowInvitePeople}
      />
    );
  });
  return (
    <div ref={container} className={`messages ${verticallyCenterMessage() ? 'flex-center' : ''}`}>
      {messageViews}
    </div>
  );
};

export default MessagesList;

registerStaticReactComponent('messages-list', MessagesList);
