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

import {MEETING_LIST_OVERSCAN} from 'Components/meeting/meetingList/meetingListConstants';

export type UseMeetingListVirtualizerParams = {
  itemCount: number;
  getScrollElement: () => HTMLElement | null;
  getEstimatedItemHeight: (itemIndex: number) => number;
  getItemKey: (itemIndex: number) => string;
};

export type UseMeetingListVirtualizer = (params: UseMeetingListVirtualizerParams) => Virtualizer<HTMLElement, Element>;

export const useMeetingListVirtualizer: UseMeetingListVirtualizer = ({
  itemCount,
  getScrollElement,
  getEstimatedItemHeight,
  getItemKey,
}) =>
  useVirtualizer({
    count: itemCount,
    getScrollElement,
    estimateSize: itemIndex => getEstimatedItemHeight(itemIndex),
    getItemKey: itemIndex => getItemKey(itemIndex),
    measureElement: element => element.getBoundingClientRect().height,
    overscan: MEETING_LIST_OVERSCAN,
  });
