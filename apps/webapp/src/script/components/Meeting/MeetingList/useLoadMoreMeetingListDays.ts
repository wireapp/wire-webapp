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

import {getHasMeetingInstancesBeyondWindow} from 'Components/Meeting/selectors/getHasMeetingInstancesBeyondWindow';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import {LOAD_MORE_DAY_COUNT} from './meetingListConstants';

type UseLoadMoreMeetingListDaysParams = {
  scrollElementRef?: RefObject<HTMLElement | null>;
  virtualizer: Virtualizer<HTMLElement, Element>;
  visibleDayGroupCount: number;
  visibleDayCount: number;
  setVisibleDayCount: (updateVisibleDayCount: (previousVisibleDayCount: number) => number) => void;
  meetingSeries: MeetingSeries[];
  now: Date;
  wallClock: WallClock;
};

const LOAD_MORE_DEBOUNCE_MS = 100;
const SCROLL_BOTTOM_THRESHOLD_PX = 100;

const isScrolledNearBottom = (scrollElement: HTMLElement): boolean =>
  scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;

const shouldLoadMoreMeetingListDays = (
  virtualizer: Virtualizer<HTMLElement, Element>,
  visibleDayGroupCount: number,
): boolean => {
  if (visibleDayGroupCount === 0) {
    return false;
  }

  const lastVirtualItem = virtualizer.getVirtualItems().at(-1);

  return lastVirtualItem !== undefined && lastVirtualItem.index >= visibleDayGroupCount - 1;
};

const loadMoreMeetingListDaysOnDebouncedScroll = (
  scrollElement: HTMLElement,
  virtualizer: Virtualizer<HTMLElement, Element>,
  visibleDayGroupCount: number,
  setVisibleDayCount: UseLoadMoreMeetingListDaysParams['setVisibleDayCount'],
): void => {
  if (!isScrolledNearBottom(scrollElement)) {
    return;
  }

  if (shouldLoadMoreMeetingListDays(virtualizer, visibleDayGroupCount)) {
    setVisibleDayCount(previousVisibleDayCount => previousVisibleDayCount + LOAD_MORE_DAY_COUNT);
  }
};

export const useLoadMoreMeetingListDays = ({
  scrollElementRef,
  virtualizer,
  visibleDayGroupCount,
  visibleDayCount,
  setVisibleDayCount,
  meetingSeries,
  now,
  wallClock,
}: UseLoadMoreMeetingListDaysParams): void => {
  const hasMeetingInstancesBeyondWindow = getHasMeetingInstancesBeyondWindow(meetingSeries, now, visibleDayCount);
  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;

  useEffect(() => {
    if (!hasMeetingInstancesBeyondWindow) {
      return undefined;
    }

    const scrollElement = scrollElementRef?.current;

    if (scrollElement === null || scrollElement === undefined) {
      return undefined;
    }

    let timeoutId: ReturnType<WallClock['setTimeout']> | undefined;

    const handleScroll = () => {
      if (timeoutId !== undefined) {
        wallClock.clearTimeout(timeoutId);
      }

      timeoutId = wallClock.setTimeout(
        () =>
          loadMoreMeetingListDaysOnDebouncedScroll(
            scrollElement,
            virtualizerRef.current,
            visibleDayGroupCount,
            setVisibleDayCount,
          ),
        LOAD_MORE_DEBOUNCE_MS,
      );
    };

    scrollElement.addEventListener('scroll', handleScroll, {passive: true});

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);

      if (timeoutId !== undefined) {
        wallClock.clearTimeout(timeoutId);
      }
    };
  }, [hasMeetingInstancesBeyondWindow, scrollElementRef, setVisibleDayCount, visibleDayGroupCount, wallClock]);
};
