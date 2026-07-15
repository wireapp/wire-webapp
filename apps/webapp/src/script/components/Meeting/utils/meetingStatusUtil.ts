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

import {isAfter, isBefore} from 'date-fns';

export enum MeetingTemporalStatuses {
  ON_GOING = 'on_going',
  UPCOMING = 'upcoming',
  PAST = 'past',
}

/**
 * Determines the scheduled time window of a meeting at a specific instant.
 */
export const getMeetingTemporalStatusAt = (now: Date, start: Date, end: Date): MeetingTemporalStatuses => {
  if (isAfter(now, end)) {
    return MeetingTemporalStatuses.PAST;
  }

  if (!isBefore(now, start)) {
    return MeetingTemporalStatuses.ON_GOING;
  }

  return MeetingTemporalStatuses.UPCOMING;
};

export const isMeetingListItemOngoing = (temporalStatus: MeetingTemporalStatuses, isCallActive: boolean): boolean =>
  temporalStatus === MeetingTemporalStatuses.ON_GOING || isCallActive;
