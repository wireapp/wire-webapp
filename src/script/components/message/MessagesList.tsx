import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {DecryptErrorMessage} from 'src/script/entity/message/DecryptErrorMessage';
import {MemberMessage} from 'src/script/entity/message/MemberMessage';
import {Message} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {scrollEnd} from 'Util/scroll-helpers';
import MessageWrapper from './MessageWrapper';

interface MessagesListParams {
  cancelConnectionRequest: (message: MemberMessage) => void;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  invitePeople: (convesation: Conversation) => void;
  messageRepository: MessageRepository;
  onClickMessage: (message: ContentMessage, event: Event) => void;
  resetSession: (messageError: DecryptErrorMessage) => void;
  selfUser: User;
  showImageDetails: (message: Message, event: MouseEvent) => void;
  showMessageDetails: (message: Message, showLikes?: boolean) => void;
  showParticipants: (users: User[]) => void;
  showUserDetails: (user: User) => void;
}

const MessagesList: React.FC<MessagesListParams> = ({
  conversation,
  selfUser,
  conversationRepository,
  messageRepository,
  onClickMessage,
  showUserDetails,
  showMessageDetails,
  showImageDetails,
  showParticipants,
  cancelConnectionRequest,
  resetSession,
  invitePeople,
}) => {
  const {messages} = useKoSubscribableChildren(conversation, ['messages']);
  const [focusedMessage, setFocusedMessage] = useState<string>();

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

  const messagesEndRef = useRef(null);
  const updateScroll = (endElement: HTMLElement | undefined) => {
    if (!endElement) {
      return;
    }
    const scrollingContainer = endElement.parentElement.parentElement;
    const scrollPosition = Math.ceil(scrollingContainer.scrollTop);
    const scrollEndValue = Math.ceil(scrollEnd(scrollingContainer));
    const shouldStickToBottom = scrollPosition > scrollEndValue - 100;
    if (shouldStickToBottom) {
      endElement.scrollIntoView();
    }
  };

  useEffect(() => {
    updateScroll(messagesEndRef.current);
  }, [messages, messagesEndRef]);

  useEffect(() => {
    loadConversation(conversation, undefined);
  }, []);

  const messageViews = messages.map((message, index) => {
    const previousMessage = index > 0 && messages.at(index - 1);
    const isLastDeliveredMessage = conversation.getLastDeliveredMessage() === message;
    return (
      <MessageWrapper
        key={message.id}
        message={message}
        previousMessage={previousMessage}
        actionsViewModel={undefined}
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
        onContentUpdated={() => updateScroll(messagesEndRef.current)}
        onLike={message => messageRepository.toggleLike(conversation, message)}
        selfId={selfUser.qualifiedId}
        shouldShowInvitePeople={shouldShowInvitePeople}
      />
    );
  });
  return (
    <div className={`messages ${verticallyCenterMessage() ? 'flex-center' : ''}`}>
      {messageViews}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessagesList;

registerReactComponent('messages-list', {
  bindings: `
    conversation: ko.unwrap(conversation),
    conversationRepository,
    messageRepository,
    selfUser: ko.unwrap(selfUser),
    onClickMessage,
    showUserDetails,
    showImageDetails,
    showMessageDetails,
    showParticipants,
    resetSession,
    invitePeople,
    cancelConnectionRequest,
    `,
  component: MessagesList,
});
