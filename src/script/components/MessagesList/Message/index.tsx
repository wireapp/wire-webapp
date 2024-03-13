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
import {getAllFocusableElements, setElementsTabIndex} from 'Util/focusUtil';
import {isTabKey} from 'Util/KeyboardUtil';

import {ElementType, MessageDetails} from './ContentMessage/asset/TextMessageRenderer';
import {MessageWrapper} from './MessageWrapper';
import {ScrollToElement} from './types';
import {useMessageFocusedTabIndex} from './util';

import type {MessageRepository} from '../../../conversation/MessageRepository';
import type {Conversation} from '../../../entity/Conversation';
import type {ContentMessage} from '../../../entity/message/ContentMessage';
import type {DecryptErrorMessage} from '../../../entity/message/DecryptErrorMessage';
import type {MemberMessage as MemberMessageEntity} from '../../../entity/message/MemberMessage';
import {Message as BaseMessage} from '../../../entity/message/Message';
import type {User} from '../../../entity/User';
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
  isSelfTemporaryGuest: boolean;
  message: BaseMessage;
  /** whether the message should display the user avatar and user name before the actual content */
  hideHeader: boolean;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: BaseMessage) => void;
    deleteMessageEveryone: (conversation: Conversation, message: BaseMessage) => void;
  };
  messageRepository: MessageRepository;
  onVisible?: () => void;
  selfId: QualifiedId;
  shouldShowInvitePeople: boolean;
  teamState?: TeamState;
  /** whether the message is being accessed using the keyboard (will then show the focus state of the elements) */
  isFocused: boolean;
  /** will visually highlight the message when it's being loaded */
  isHighlighted: boolean;
  handleFocus: (id: string) => void;
  handleArrowKeyDown: (e: React.KeyboardEvent) => void;
  isMsgElementsFocusable: boolean;
  setMsgElementsFocusable: (isMsgElementsFocusable: boolean) => void;
}

export const Message: React.FC<MessageParams & {scrollTo?: ScrollToElement}> = props => {
  const {
    message,
    isHighlighted,
    hideHeader,
    onVisible,
    scrollTo,
    isFocused,
    handleFocus,
    handleArrowKeyDown,
    isMsgElementsFocusable,
    setMsgElementsFocusable,
  } = props;
  const messageElementRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const {status, ephemeral_expires} = useKoSubscribableChildren(message, ['status', 'ephemeral_expires']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocused);

  useLayoutEffect(() => {
    if (!messageElementRef.current) {
      return;
    }
    if (isHighlighted) {
      scrollTo?.({center: true, element: messageElementRef.current});
      // for reply message, focus on the original message when original message link is clicked for keyboard users
      handleFocus(message.id);
    }
  }, [isHighlighted]);

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
      // on tab key from message element reset the floating action menu selection
      return;
    }
    handleArrowKeyDown(event);
  };

  useEffect(() => {
    // Move element into view when it is focused
    if (isFocused) {
      messageRef.current?.focus();
    }
  }, [isFocused]);

  // set message elements focus for non content type mesages
  // some non content type message has interactive element like invite people for member message
  useEffect(() => {
    if (!messageRef.current || message.isContent()) {
      return;
    }
    const interactiveMsgElements = getAllFocusableElements(messageRef.current);
    setElementsTabIndex(interactiveMsgElements, isMsgElementsFocusable && isFocused);
  }, [isFocused, isMsgElementsFocusable, message]);

  const content = (
    <MessageWrapper
      {...props}
      hideHeader={hideHeader}
      isFocused={isFocused}
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
      className={cx('message', {
        'message-marked': isHighlighted,
        'content-message': message.isContent(),
        'system-message': !message.isContent(),
      })}
      ref={messageElementRef}
      data-uie-uid={message.id}
      data-uie-value={message.super_type}
      data-uie-expired-status={ephemeral_expires}
      data-uie-send-status={status}
      data-uie-name="item-message"
      role="list"
    >
      {/*eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions*/}
      <div
        tabIndex={messageFocusedTabIndex}
        ref={messageRef}
        role="listitem"
        onKeyDown={handleDivKeyDown}
        onClick={event => {
          handleFocus(message.id);
        }}
        className="message-wrapper"
      >
        {wrappedContent}
      </div>
    </div>
  );
};
