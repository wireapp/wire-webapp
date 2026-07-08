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

import {useVirtualizer, type Virtualizer} from '@tanstack/react-virtual';

import {MEETING_LIST_OVERSCAN} from 'Components/Meeting/MeetingList/meetingListConstants';

export type UseMeetingDayGroupVirtualizerParams = {
  visibleDayGroupCount: number;
  getScrollElement: () => HTMLElement | null;
  getEstimatedDayGroupHeight: (dayGroupIndex: number) => number;
};

export type UseMeetingDayGroupVirtualizer = (
  params: UseMeetingDayGroupVirtualizerParams,
) => Virtualizer<HTMLElement, Element>;

export const useMeetingDayGroupVirtualizer: UseMeetingDayGroupVirtualizer = ({
  visibleDayGroupCount,
  getScrollElement,
  getEstimatedDayGroupHeight,
}) =>
  useVirtualizer({
    count: visibleDayGroupCount,
    getScrollElement,
    estimateSize: dayGroupIndex => getEstimatedDayGroupHeight(dayGroupIndex),
    overscan: MEETING_LIST_OVERSCAN,
  });
