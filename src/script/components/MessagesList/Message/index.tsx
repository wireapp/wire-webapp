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

import React, {useLayoutEffect, useRef, useEffect} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import cx from 'classnames';

import {InViewport} from 'Components/utils/InViewport';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getMessageMarkerType, MessageMarkerType} from 'Util/conversationMessages';
import {getAllFocusableElements, setElementsTabIndex} from 'Util/focusUtil';
import {isTabKey} from 'Util/KeyboardUtil';

import {ElementType, MessageDetails} from './ContentMessage/asset/TextMessageRenderer';
import {MessageTime} from './MessageTime';
import {MessageWrapper} from './MessageWrapper';
import {useMessageFocusedTabIndex} from './util';

import type {MessageRepository} from '../../../conversation/MessageRepository';
import type {Conversation} from '../../../entity/Conversation';
import type {ContentMessage} from '../../../entity/message/ContentMessage';
import type {DecryptErrorMessage} from '../../../entity/message/DecryptErrorMessage';
import type {MemberMessage as MemberMessageEntity} from '../../../entity/message/MemberMessage';
import {Message as BaseMessage} from '../../../entity/message/Message';
import type {User} from '../../../entity/User';
import {useRelativeTimestamp} from '../../../hooks/useRelativeTimestamp';
import {TeamState} from '../../../team/TeamState';

export interface MessageActions {
  onClickAvatar: (user: User | ServiceEntity) => void;
  onClickCancelRequest: (message: MemberMessageEntity) => void;
  onClickImage: (message: ContentMessage, event: React.UIEvent) => void;
  onClickInvitePeople: () => void;
  onClickReactionDetails: (message: BaseMessage) => void;
  onClickMessage: (event: MouseEvent | KeyboardEvent, elementType: ElementType, messageDetails: MessageDetails) => void;
  onClickParticipants: (participants: User[]) => void;
  onClickDetails: (message: BaseMessage) => void;
  onClickResetSession: (messageError: DecryptErrorMessage) => void;
  onClickTimestamp: (messageId: string) => void;
}

export interface MessageParams extends MessageActions {
  conversation: Conversation;
  hasReadReceiptsTurnedOn: boolean;
  isLastDeliveredMessage: boolean;
  isMarked: boolean;
  isSelfTemporaryGuest: boolean;
  /** The last read timestamp at the moment the conversation was rendered */
  lastReadTimestamp: number;
  message: BaseMessage;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: BaseMessage) => void;
    deleteMessageEveryone: (conversation: Conversation, message: BaseMessage) => void;
  };
  messageRepository: MessageRepository;
  onVisible?: () => void;
  previousMessage?: BaseMessage;
  selfId: QualifiedId;
  shouldShowInvitePeople: boolean;
  teamState?: TeamState;
  totalMessage: number;
  index: number;
  isMessageFocused: boolean;
  handleFocus: (index: number) => void;
  handleArrowKeyDown: (e: React.KeyboardEvent) => void;
  isMsgElementsFocusable: boolean;
  setMsgElementsFocusable: (isMsgElementsFocusable: boolean) => void;
}

const Message: React.FC<
  MessageParams & {scrollTo?: (elm: {center?: boolean; element: HTMLElement}, isUnread?: boolean) => void}
> = props => {
  const {
    message,
    previousMessage,
    isMarked,
    lastReadTimestamp,
    onVisible,
    scrollTo,
    totalMessage,
    isMessageFocused,
    handleFocus,
    handleArrowKeyDown,
    index,
    isMsgElementsFocusable,
    setMsgElementsFocusable,
  } = props;
  const messageElementRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const {status, ephemeral_expires, timestamp} = useKoSubscribableChildren(message, [
    'status',
    'ephemeral_expires',
    'timestamp',
  ]);
  const timeAgo = useRelativeTimestamp(message.timestamp());
  const timeAgoDay = useRelativeTimestamp(message.timestamp(), true);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const markerType = getMessageMarkerType(message, lastReadTimestamp, previousMessage);

  useLayoutEffect(() => {
    if (!messageElementRef.current) {
      return;
    }
    if (isMarked) {
      scrollTo?.({center: true, element: messageElementRef.current});

      // for reply message, focus on the original message when original message link is clicked for keyboard users
      handleFocus(index);
    } else if (markerType === MessageMarkerType.UNREAD) {
      scrollTo?.({element: messageElementRef.current}, true);
    }
  }, [isMarked, messageElementRef]);

  const handleDivKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // when a message is focused set its elements focusable
    if (!event.shiftKey && isTabKey(event)) {
      if (!messageRef.current) {
        return;
      }
      setMsgElementsFocusable(true);
    }
    if (isTabKey(event)) {
      // don't call arrow key down for tab key
      return;
    }
    handleArrowKeyDown(event);
  };

  // when a new conversation is opened using keyboard(enter), focus on the last message
  useEffect(() => {
    if (!messageRef.current) {
      return;
    }
    if (history.state?.eventKey === 'Enter') {
      handleFocus(totalMessage - 1);
    }
  }, [totalMessage]);

  useEffect(() => {
    // Move element into view when it is focused
    if (isMessageFocused) {
      messageRef.current?.focus();
    }
  }, [isMessageFocused, message]);

  // set message elements focus for non content type mesages
  // some non content type message has interactive element like invite people for member message
  useEffect(() => {
    if (!messageRef.current || message.isContent()) {
      return;
    }
    const interactiveMsgElements = getAllFocusableElements(messageRef.current);
    setElementsTabIndex(interactiveMsgElements, isMsgElementsFocusable && isMessageFocused);
  }, [isMessageFocused, isMsgElementsFocusable, message]);

  const getTimestampClass = (): string => {
    const classes = {
      [MessageMarkerType.NONE]: '',
      [MessageMarkerType.DAY]: 'message-timestamp-visible message-timestamp-day',
      [MessageMarkerType.HOUR]: 'message-timestamp-visible',
      [MessageMarkerType.UNREAD]: 'message-timestamp-visible message-timestamp-unread',
    };
    return classes[markerType];
  };

  const content = (
    <MessageWrapper
      {...props}
      hasMarker={markerType !== MessageMarkerType.NONE}
      isMessageFocused={isMessageFocused}
      isMsgElementsFocusable={isMsgElementsFocusable}
    />
  );

  const wrappedContent = onVisible ? (
    <InViewport requireFullyInView allowBiggerThanViewport checkOverlay onVisible={onVisible}>
      {content}
    </InViewport>
  ) : (
    content
  );

  return (
    <div
      className={cx('message', {'message-marked': isMarked})}
      ref={messageElementRef}
      data-uie-uid={message.id}
      data-uie-value={message.super_type}
      data-uie-expired-status={ephemeral_expires}
      data-uie-send-status={status}
      data-uie-name="item-message"
      role="list"
    >
      {markerType !== MessageMarkerType.NONE ? (
        <div className={cx('message-header message-timestamp', getTimestampClass())}>
          <div className="message-header-icon">
            <span className="message-unread-dot" />
          </div>

          <h3 className="message-header-label">
            <MessageTime timestamp={timestamp} className="label-xs" data-timestamp-type="normal">
              {timeAgo}
            </MessageTime>

            <MessageTime timestamp={timestamp} data-timestamp-type="day" className="label-bold-xs">
              {timeAgoDay}
            </MessageTime>
          </h3>
        </div>
      ) : null}

      {/*eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions*/}
      <div
        tabIndex={messageFocusedTabIndex}
        ref={messageRef}
        role="listitem"
        onKeyDown={handleDivKeyDown}
        className="message-wrapper"
      >
        {wrappedContent}
      </div>
    </div>
  );
};

export {Message};
