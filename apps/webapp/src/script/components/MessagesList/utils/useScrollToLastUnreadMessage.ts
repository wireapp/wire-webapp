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

import {MutableRefObject, useLayoutEffect, useRef} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';
import {Maybe} from 'true-myth';

import {GroupedMessage, isMarker, Marker} from 'Components/MessagesList/utils/virtualizedMessagesGroup';

type ScrollAlign = 'start' | 'center' | 'end';

type InitialScrollPosition = {
  scrollAlign: ScrollAlign;
  scrollIndex: number;
};

interface Props {
  isConversationLoaded: boolean;
  groupedMessages: (Marker | GroupedMessage)[];
  conversationLastReadTimestamp: MutableRefObject<number>;
}

export function getInitialScrollPosition(
  groupedMessages: (Marker | GroupedMessage)[],
  lastReadTimestamp: number,
): Maybe<InitialScrollPosition> {
  if (groupedMessages.length === 0) {
    return Maybe.nothing();
  }

  const firstUnreadMessageIndex = groupedMessages.findIndex(
    message => !isMarker(message) && message.timestamp > lastReadTimestamp,
  );

  if (firstUnreadMessageIndex !== -1) {
    return Maybe.just({
      scrollAlign: 'start',
      scrollIndex: Math.max(0, firstUnreadMessageIndex - 1),
    });
  }

  return Maybe.just({
    scrollAlign: 'end',
    scrollIndex: groupedMessages.length - 1,
  });
}

export const useScrollToLastUnreadMessage = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  {isConversationLoaded, groupedMessages, conversationLastReadTimestamp}: Props,
) => {
  const hasScrolledToInitialPosition = useRef(false);

  useLayoutEffect(() => {
    if (!isConversationLoaded) {
      hasScrolledToInitialPosition.current = false;
      return;
    }

    if (hasScrolledToInitialPosition.current) {
      return;
    }

    const initialScrollPosition = getInitialScrollPosition(groupedMessages, conversationLastReadTimestamp.current);

    if (initialScrollPosition.isNothing) {
      return;
    }

    virtualizer.measure();
    hasScrolledToInitialPosition.current = true;
    const {scrollAlign, scrollIndex} = initialScrollPosition.value;

    requestAnimationFrame(() => {
      virtualizer.measure();
      virtualizer.scrollToIndex(scrollIndex, {align: scrollAlign});
    });
  }, [conversationLastReadTimestamp, groupedMessages, isConversationLoaded, virtualizer]);
};
