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

import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import {getMeetingInstancesInRange} from './getMeetingInstancesInRange';

/**
 * Expands every series in the store into list instances for the visible window, then sorts by start time.
 *
 * This is what the meeting list calls: one flat timeline of rows to group by day. Delegates per-series
 * expansion to {@link getMeetingInstancesInRange}.
 *
 * @param meetingSeriesList - Full list from Zustand (one entry per backend meeting / recurrence rule).
 * @param from - Inclusive start of the visible window.
 * @param to - Exclusive end of the visible window.
 * @returns All instances across all series, sorted earliest first.
 */
export const getMeetingInstances = (meetingSeriesList: MeetingSeries[], from: Date, to: Date): MeetingInstance[] =>
  meetingSeriesList
    .flatMap(meetingSeries => getMeetingInstancesInRange(meetingSeries, from, to))
    .toSorted((left, right) => left.start.getTime() - right.start.getTime());
