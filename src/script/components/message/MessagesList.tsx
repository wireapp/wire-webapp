import {previousWednesday} from 'date-fns';
import React, {useEffect, useMemo} from 'react';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {Message} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import MessageWrapper from './MessageWrapper';

interface MessagesListParams {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  selfUser: User;
}

const MessagesList: React.FC<MessagesListParams> = ({
  conversation,
  selfUser,
  conversationRepository,
  messageRepository,
}) => {
  const {messages_visible: messages} = useKoSubscribableChildren(conversation, ['messages_visible']);
  console.log(messages);
  const conversationLastReadTimestamp = useMemo(() => conversation.last_read_timestamp(), []);

  const loadConversation = async (conversation: Conversation, message?: Message): Promise<Message[]> => {
    await conversationRepository.updateParticipatingUserEntities(conversation, false, true);

    return message
      ? await conversationRepository.getMessagesWithOffset(conversation, message)
      : await conversationRepository.getPrecedingMessages(conversation);
  };
  const verticallyCenterMessage = (): boolean => {
    if (messages.length === 1) {
      const [firstMessage] = messages;
      return firstMessage.isMember() && firstMessage.isConnection();
    }
    return false;
  };

  useEffect(() => {
    loadConversation(conversation, undefined);
  }, []);

  const messageViews = messages.map((message, index) => {
    const previousMessage = index > 0 && messages.at(index - 1);
    const isLastDeliveredMessage = conversation.getLastDeliveredMessage() === message;
    return (
      <MessageWrapper
        message={message}
        previousMessage={previousMessage}
        actionsViewModel={undefined}
        conversation={conversation}
        conversationLastReadTimestamp={conversationLastReadTimestamp}
        hasReadReceiptsTurnedOn={conversationRepository.expectReadReceipt(conversation)}
        isLastDeliveredMessage={isLastDeliveredMessage}
        isMarked={false}
        isSelfTemporaryGuest={selfUser.isTemporaryGuest()}
        messageRepository={messageRepository}
        lastReadTimestamp={conversationLastReadTimestamp}
        onClickAvatar={function (user: User): void {
          throw new Error('Function not implemented.');
        }}
        onClickCancelRequest={function (message: ContentMessage): void {
          throw new Error('Function not implemented.');
        }}
        onClickImage={function (message: ContentMessage, event: UIEvent): void {
          throw new Error('Function not implemented.');
        }}
        onClickInvitePeople={function (): void {
          throw new Error('Function not implemented.');
        }}
        onClickLikes={function (view: MessageListViewModel): void {
          throw new Error('Function not implemented.');
        }}
        onClickMessage={function (message: ContentMessage, event: Event): void {
          throw new Error('Function not implemented.');
        }}
        onClickParticipants={function (participants: User[]): void {
          throw new Error('Function not implemented.');
        }}
        onClickReceipts={function (view: Message): void {
          throw new Error('Function not implemented.');
        }}
        onClickResetSession={function (messageError: DecryptErrorMessage): void {
          throw new Error('Function not implemented.');
        }}
        onClickTimestamp={function (messageId: string): void {
          throw new Error('Function not implemented.');
        }}
        onContentUpdated={function (): void {
          throw new Error('Function not implemented.');
        }}
        onLike={function (message: ContentMessage, button?: boolean): void {
          throw new Error('Function not implemented.');
        }}
        onMessageMarked={function (element: HTMLElement): void {
          throw new Error('Function not implemented.');
        }}
        selfId={selfUser.qualifiedId}
        shouldShowInvitePeople={false}
      />
    );
  });
  return <div className={`messages ${verticallyCenterMessage() ? 'flex-center' : ''}`}>{messageViews}</div>;
};

export default MessagesList;

registerReactComponent('messages-list', {
  bindings: `
    conversation: ko.unwrap(conversation),
    conversationRepository: conversationRepository,
    messageRepository: messageRepository,
    selfUser: ko.unwrap(selfUser),
    `,
  component: MessagesList,
});
