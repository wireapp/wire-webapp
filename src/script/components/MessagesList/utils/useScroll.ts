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

import {MutableRefObject, useCallback, useLayoutEffect, useRef} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';

import {FocusedElement, updateScrollTanStack} from 'Components/MessagesList/utils/scrollUpdater';
import {Message} from 'src/script/entity/message/Message';
import {User} from 'src/script/entity/User';
import {useResizeObserver} from 'Util/DOM/resizeObserver';

export const useScroll = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  messagesContainer: HTMLDivElement | null,
  loaded: boolean,
  focusedElement: MutableRefObject<FocusedElement | null>,
  filteredMessages: Message[],
  selfUser: User,
) => {
  // const scrollHeight = useRef(0);
  const nbMessages = useRef(0);

  const syncScrollPosition = useCallback(() => {
    const scrollingContainer = messagesContainer?.parentElement;
    if (!scrollingContainer || !loaded) {
      return;
    }

    updateScrollTanStack(virtualizer, {
      focusedElement: focusedElement.current,
      prevNbMessages: nbMessages.current,
      messages: filteredMessages,
      selfUserId: selfUser?.id,
    });

    // const newScrollHeight = updateScroll(scrollingContainer, {
    //   focusedElement: focusedElement.current,
    //   prevScrollHeight: scrollHeight.current,
    //   prevNbMessages: nbMessages.current,
    //   messages: filteredMessages,
    //   selfUserId: selfUser?.id,
    // });

    nbMessages.current = filteredMessages.length;
    // scrollHeight.current = newScrollHeight;
  }, [messagesContainer?.parentElement, loaded, filteredMessages, selfUser?.id]);

  // Listen to resizes of the content element (if it's resized it means something has changed in the message list, link a link preview was generated)
  useResizeObserver(syncScrollPosition, messagesContainer);
  // Also listen to the scrolling container resizes (when the window resizes or the inputBar changes)
  useResizeObserver(syncScrollPosition, messagesContainer?.parentElement);

  useLayoutEffect(syncScrollPosition, [syncScrollPosition]);

  return {syncScrollPosition};
};
