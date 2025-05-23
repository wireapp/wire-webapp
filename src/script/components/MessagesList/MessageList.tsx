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

import {elementScroll, useVirtualizer} from '@tanstack/react-virtual';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {JumpToLastMessageButton} from 'Components/MessagesList/JumpToLastMessageButton';
import {verticallyCenterMessage} from 'Components/MessagesList/utils/helpers';
import {filterMessages} from 'Components/MessagesList/utils/messagesFilter';
import {useScroll} from 'Components/MessagesList/utils/useScroll';
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
import {isLastReceivedMessage} from 'Util/conversationMessages';
import {onHitTopOrBottom} from 'Util/DOM/onHitTopOrBottom';

import {Message, MessageActions} from './Message';
import {MarkerComponent} from './Message/Marker';
import {ScrollToElement} from './Message/types';
import {UploadAssets} from './UploadAssets';
import {groupMessagesBySenderAndTime, isMarker} from './utils/messagesGroup';
import {FocusedElement} from './utils/scrollUpdater';

import {AssetRepository} from '../../assets/AssetRepository';
import {Conversation} from '../../entity/Conversation';

const ESTIMATED_ELEMENT_SIZE = 36;

interface MessagesListParams {
  assetRepository: AssetRepository;
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
  isMsgElementsFocusable: boolean;
  setMsgElementsFocusable: (isMsgElementsFocusable: boolean) => void;
  isRightSidebarOpen?: boolean;
  updateConversationLastRead: (conversation: Conversation) => void;
}

export const MessagesList = ({
  assetRepository,
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
  isMsgElementsFocusable,
  setMsgElementsFocusable,
  isRightSidebarOpen = false,
  updateConversationLastRead,
}: MessagesListParams) => {
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

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const conversationLastReadTimestamp = useRef(conversation.last_read_timestamp());
  const focusedElement = useRef<FocusedElement | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [highlightedMessage, setHighlightedMessage] = useState<string | undefined>(conversation.initialMessage()?.id);
  const [messagesContainer, setMessagesContainer] = useState<HTMLDivElement | null>(null);

  const filteredMessages = filterMessages(allMessages);
  const groupedMessages = groupMessagesBySenderAndTime(filteredMessages, conversationLastReadTimestamp.current);

  const {focusedId, handleKeyDown, setFocusedId} = useRoveFocus(filteredMessages.map(message => message.id));

  const shouldShowInvitePeople = isActiveParticipant && inTeam && (isGuestRoom || isGuestAndServicesRoom);

  const loadConversation = async (conversation: Conversation, message?: MessageEntity): Promise<MessageEntity[]> => {
    await conversationRepository.updateParticipatingUserEntities(conversation, false, true);

    return message
      ? conversationRepository.getMessagesWithOffset(conversation, message)
      : conversationRepository.getPrecedingMessages(conversation);
  };

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
        conversationRepository.getSubsequentMessages(conversation, lastMessage);
      }
    }
  };

  useEffect(() => {
    onLoading(true);
    setLoaded(false);
    conversationLastReadTimestamp.current = conversation.last_read_timestamp();
    void loadConversation(conversation, conversation.initialMessage()).then(() => {
      setTimeout(() => {
        setLoaded(true);
        onLoading(false);
        // if new conversation is loaded but there are unread messages, previous conversation
        // last message visibility might not be cleaned as this conversation last message is not loaded yet
        if (!conversation.hasLastReceivedMessageLoaded()) {
          conversation.isLastMessageVisible(false);
        }
      }, 10);
    });
    return () => conversation.release();
  }, [conversation]);

  useLayoutEffect(() => {
    if (loaded && messageListRef.current) {
      onHitTopOrBottom(messageListRef.current, loadPrecedingMessages, loadFollowingMessages);
    }
  }, [loaded]);

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

  const rowVirtualizer = useVirtualizer({
    count: groupedMessages.length,
    getScrollElement: () => messageListRef.current,
    estimateSize: () => ESTIMATED_ELEMENT_SIZE,
    measureElement: element => element?.getBoundingClientRect().height,
    scrollToFn: (offset, canSmooth, instance) => elementScroll(offset, {...canSmooth, behavior: 'smooth'}, instance),
  });

  const {syncScrollPosition} = useScroll(
    rowVirtualizer,
    messagesContainer,
    loaded,
    focusedElement,
    filteredMessages,
    selfUser,
  );

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

  if (!loaded) {
    return null;
  }

  const jumpToLastMessage = () => {
    if (conversation) {
      // clean up anything like search result
      setHighlightedMessage(undefined);
      conversation.initialMessage(undefined);
      focusedElement.current = null;
      // if there are unloaded messages, the conversation should be marked as read and reloaded
      if (!conversation.hasLastReceivedMessageLoaded()) {
        updateConversationLastRead(conversation);
        conversation.release();
        loadConversation(conversation);
      } else {
        // we just need to scroll down
        rowVirtualizer.scrollToIndex(groupedMessages.length);
      }
    }
  };

  return (
    <>
      <FadingScrollbar
        ref={messageListRef}
        id="message-list"
        className={cx('message-list', {'is-right-panel-open': isRightSidebarOpen})}
        tabIndex={TabIndex.UNFOCUSABLE}
        style={{height: '100%', overflow: 'auto', position: 'relative'}}
      >
        <div
          ref={setMessagesContainer}
          className={cx('messages', {'flex-center': verticallyCenterMessage(filteredMessages)})}
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem, groupIndex) => {
            const item = groupedMessages[virtualItem.index];

            return (
              <div
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                key={virtualItem.index}
                style={{
                  position: 'absolute',
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {isMarker(item) ? (
                  <MarkerComponent scrollTo={scrollToElement} marker={item} />
                ) : (
                  <Message
                    key={`${item.id || 'message'}-${item.timestamp()}`}
                    // onVisible={visibleCallback}
                    // onVisibilityLost={lastMessageInvisibleCallback}
                    onVisibilityLost={
                      groupIndex === groupedMessages.length - 1 && conversation.hasLastReceivedMessageLoaded()
                        ? () => {
                            conversation.isLastMessageVisible(false);
                          }
                        : undefined
                    }
                    message={item}
                    // hideHeader={item.timestamp() !== item.firstMessageTimestamp}
                    hideHeader={false}
                    messageActions={messageActions}
                    conversation={conversation}
                    hasReadReceiptsTurnedOn={conversationRepository.expectReadReceipt(conversation)}
                    isLastDeliveredMessage={lastDeliveredMessage?.id === item.id}
                    // isLastDeliveredMessage={isLastDeliveredMessage}
                    // isHighlighted={isHighlighted}
                    isHighlighted={!!highlightedMessage && highlightedMessage === item.id}
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
                        setLoaded(false); // this will block automatic scroll triggers (like loading extra messages)
                        const messageEntity = await messageRepository.getMessageInConversationById(
                          conversation,
                          messageId,
                        );
                        conversation.removeMessages();
                        conversationRepository.getMessagesWithOffset(conversation, messageEntity);
                        setLoaded(true); // unblock automatic scroll triggers
                      }
                    }}
                    selfId={selfUser.qualifiedId}
                    shouldShowInvitePeople={shouldShowInvitePeople}
                    // isFocused={isFocused}
                    isFocused={!!focusedId && focusedId === item.id}
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

        <JumpToLastMessageButton onGoToLastMessage={jumpToLastMessage} conversation={conversation} />
      </FadingScrollbar>
    </>
  );
};
