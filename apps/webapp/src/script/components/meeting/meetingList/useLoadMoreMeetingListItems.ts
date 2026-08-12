/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useEffect, useRef, type RefObject} from 'react';

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import type {Virtualizer} from '@tanstack/react-virtual';

type UseLoadMoreMeetingListItemsParams = {
  scrollElementRef?: RefObject<HTMLElement | null>;
  virtualizer: Virtualizer<HTMLElement, Element>;
  itemCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  wallClock: WallClock;
};

const LOAD_MORE_DEBOUNCE_MS = 100;
const SCROLL_BOTTOM_THRESHOLD_PX = 100;

const isScrolledNearBottom = (scrollElement: HTMLElement): boolean =>
  scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;

const isVirtualizedTailVisible = (virtualizer: Virtualizer<HTMLElement, Element>, itemCount: number): boolean =>
  virtualizer.getVirtualItems().at(-1)?.index === itemCount - 1;

export const useLoadMoreMeetingListItems = ({
  scrollElementRef,
  virtualizer,
  itemCount,
  hasMore,
  onLoadMore,
  wallClock,
}: UseLoadMoreMeetingListItemsParams): void => {
  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;

  useEffect(() => {
    const scrollElement = scrollElementRef?.current;

    if (!hasMore || scrollElement === null || scrollElement === undefined) {
      return undefined;
    }

    let timeoutId: ReturnType<WallClock['setTimeout']> | undefined;

    const handleScroll = () => {
      if (timeoutId !== undefined) {
        wallClock.clearTimeout(timeoutId);
      }

      timeoutId = wallClock.setTimeout(() => {
        if (isScrolledNearBottom(scrollElement) && isVirtualizedTailVisible(virtualizerRef.current, itemCount)) {
          onLoadMore();
        }
      }, LOAD_MORE_DEBOUNCE_MS);
    };

    scrollElement.addEventListener('scroll', handleScroll, {passive: true});

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);

      if (timeoutId !== undefined) {
        wallClock.clearTimeout(timeoutId);
      }
    };
  }, [hasMore, itemCount, onLoadMore, scrollElementRef, wallClock]);
};
