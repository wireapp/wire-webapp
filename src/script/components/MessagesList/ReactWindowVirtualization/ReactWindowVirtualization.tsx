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

import {useEffect, useMemo, useRef, useState} from 'react';

import {List, ListImperativeAPI} from 'react-window';

import {MarkerComponent} from 'Components/MessagesList/Message/Marker';
import {Message} from 'Components/MessagesList/Message/VirtualizedMessage';
import {MessagesListParams} from 'Components/MessagesList/MessageList.types';
import {filterMessages} from 'Components/MessagesList/utils/messagesFilter';
import {groupMessagesBySenderAndTime, isMarker} from 'Components/MessagesList/utils/virtualizedMessagesGroup';
import {useRoveFocus} from 'Hooks/useRoveFocus';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

interface Props extends Omit<MessagesListParams, 'isRightSidebarOpen' | 'getVisibleCallback'> {}

export const ReactWindowVirtualization = ({
  conversation,
  conversationRepository,
  onLoading,
  contextMessageActions,
  selfUser,
  messageRepository,
  invitePeople,
  cancelConnectionRequest,
  showUserDetails,
  showMessageDetails,
  showMessageReactions,
  showParticipants,
  showImageDetails,
  resetSession,
  onClickMessage,
  isMsgElementsFocusable,
  setMsgElementsFocusable,
}: Props) => {
  const conversationLastReadTimestamp = useRef(conversation.last_read_timestamp());
  const listRef = useRef<ListImperativeAPI | undefined>(undefined);

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

  const shouldShowInvitePeople = isActiveParticipant && inTeam && (isGuestRoom || isGuestAndServicesRoom);

  const [highlightedMessage, setHighlightedMessage] = useState<string | undefined>(conversation.initialMessage()?.id);

  const filteredMessages = filterMessages(allMessages);

  const {focusedId, handleKeyDown, setFocusedId} = useRoveFocus(filteredMessages.map(message => message.id));

  const groupedMessages = useMemo(() => {
    return groupMessagesBySenderAndTime(filteredMessages, conversationLastReadTimestamp.current);
  }, [conversationLastReadTimestamp, filteredMessages]);

  const loadConversation = async (conversation: Conversation, message?: MessageEntity): Promise<MessageEntity[]> => {
    await conversationRepository.updateParticipatingUserEntities(conversation, false, true);

    return message
      ? conversationRepository.getMessagesWithOffset(conversation, message)
      : conversationRepository.getPrecedingMessages(conversation);
  };

  useEffect(() => {
    onLoading(true);
    // setLoaded(false);
    conversationLastReadTimestamp.current = conversation.last_read_timestamp();
    loadConversation(conversation, conversation.initialMessage()).then(() => {
      setTimeout(() => {
        onLoading(false);
      }, 10);
    });
    return () => conversation.release();
  }, [conversation]);

  const Row = ({index, style}: {index: number; style: React.CSSProperties}) => {
    const messageElement = groupedMessages[index];

    if (isMarker(messageElement)) {
      return <MarkerComponent marker={messageElement} />;
    }

    return (
      <Message
        key={`${messageElement.message.id || 'message'}-${messageElement.message.timestamp()}`}
        message={messageElement.message}
        hideHeader={messageElement.shouldGroup}
        contextMessageActions={contextMessageActions}
        conversation={conversation}
        hasReadReceiptsTurnedOn={conversationRepository.expectReadReceipt(conversation)}
        isLastDeliveredMessage={lastDeliveredMessage?.id === messageElement.message.id}
        isHighlighted={!!highlightedMessage && highlightedMessage === messageElement.message.id}
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
            // setLoaded(false); // this will block automatic scroll triggers (like loading extra messages)
            const messageEntity = await messageRepository.getMessageInConversationById(conversation, messageId);
            conversation.removeMessages();
            conversationRepository.getMessagesWithOffset(conversation, messageEntity);
            // setLoaded(true); // unblock automatic scroll triggers
          }
        }}
        selfId={selfUser.qualifiedId}
        shouldShowInvitePeople={shouldShowInvitePeople}
        isFocused={!!focusedId && focusedId === messageElement.message.id}
        handleFocus={setFocusedId}
        handleArrowKeyDown={handleKeyDown}
        isMsgElementsFocusable={isMsgElementsFocusable}
        setMsgElementsFocusable={setMsgElementsFocusable}
      />
    );
  };

  const getRowHeight = (index: number, cellProps: object) => {
    return 50; // Example fixed height, replace with your logic
  };

  return (
    // <AutoSizer disableWidth>
    //   {({height}) => (
    <List
      listRef={listRef}
      // height={height}
      // width={width}
      rowHeight={getRowHeight}
      rowCount={groupedMessages.length}
      rowComponent={Row}
      rowProps={{groupedMessages}}
    />
    // )}
    // </AutoSizer>
  );
};
