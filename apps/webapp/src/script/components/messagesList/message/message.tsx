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

import React, {useLayoutEffect, useRef, useEffect, type FunctionComponent} from 'react';

import {isFunction, isNull} from '@sindresorhus/is';
import cx from 'classnames';

import {MessageWrapper} from './messageWrapper';
import {MessageParams, ScrollToElement} from './types';
import {useMessageFocusedTabIndex} from './util';

import {useKoSubscribableChildren} from '../../../util/componentUtil';
import {getAllFocusableElements, setElementsTabIndex} from '../../../util/focusUtil';
import {isTabKey} from '../../../util/keyboardUtil';
import {InViewport} from '../../inViewport';

export type {MessageActions, MessageParams} from './types';

export const Message: FunctionComponent<MessageParams & {scrollTo?: ScrollToElement}> = (
  props: MessageParams & {scrollTo?: ScrollToElement},
) => {
  const {
    message,
    isHighlighted,
    hideHeader,
    onVisible,
    onVisibilityLost,
    scrollTo,
    isFocused,
    handleFocus,
    handleArrowKeyDown,
    isMsgElementsFocusable,
    setMsgElementsFocusable,
  } = props;
  const messageElementRef = useRef<HTMLDivElement>(null);
  const {status, ephemeral_expires} = useKoSubscribableChildren(message, ['status', 'ephemeral_expires']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isFocused);

  useLayoutEffect(() => {
    if (isNull(messageElementRef.current)) {
      return;
    }
    if (isHighlighted) {
      scrollTo?.({center: true, element: messageElementRef.current});
      // for reply message, focus on the original message when original message link is clicked for keyboard users
      handleFocus(message.id);
    }
  }, [isHighlighted]);

  const handleDivKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    // when a message is focused set its elements focusable
    if (!event.shiftKey && isTabKey(event)) {
      if (isNull(messageElementRef.current)) {
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
      messageElementRef.current?.focus();
    }
  }, [isFocused]);

  // When component is unmounted, it's not visible anymore
  useEffect(() => {
    return onVisibilityLost;
  }, [onVisibilityLost]);

  // set message elements focus for non content type mesages
  // some non content type message has interactive element like invite people for member message
  useEffect(() => {
    if (isNull(messageElementRef.current) || message.isContent()) {
      return;
    }
    const interactiveMsgElements = getAllFocusableElements(messageElementRef.current);
    setElementsTabIndex(interactiveMsgElements, isMsgElementsFocusable && isFocused);
  }, [isFocused, isMsgElementsFocusable, message]);

  const messageContent = (
    <MessageWrapper
      {...props}
      hideHeader={hideHeader}
      isFocused={isFocused}
      isMsgElementsFocusable={isMsgElementsFocusable}
    />
  );

  return (
    /*eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions*/
    <div
      className={cx('message message-wrapper', {
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
      tabIndex={messageFocusedTabIndex}
      onKeyDown={handleDivKeyDown}
      onClick={() => {
        return handleFocus(message.id);
      }}
    >
      {isFunction(onVisible) ? (
        <InViewport
          requireFullyInView
          allowBiggerThanViewport
          checkOverlay
          onVisible={onVisible}
          onVisibilityLost={onVisibilityLost}
        >
          {messageContent}
        </InViewport>
      ) : (
        messageContent
      )}
    </div>
  );
};
