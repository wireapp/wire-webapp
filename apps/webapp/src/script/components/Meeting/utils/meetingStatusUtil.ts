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

export enum MeetingStatuses {
  ON_GOING = 'on_going',
  PARTICIPATING = 'participating',
  UPCOMING = 'upcoming',
  PAST = 'past',
}

/**
 * Determines the status of a meeting at a specific time.
 *
 * @param {number} nowMilliseconds - The current time in milliseconds.
 * @param {string} start_date - The start date of the meeting in ISO format.
 * @param {string} end_date - The end date of the meeting in ISO format.
 * @param {boolean} [attending=false] - Whether the user is attending the meeting.
 * @returns {MeetingStatuses} - The status of the meeting.
 */
export const getMeetingStatusAt = (
  nowMilliseconds: number,
  start_date: string,
  end_date: string,
  attending: boolean = false,
): MeetingStatuses => {
  const startMs = new Date(start_date).getTime();
  const endMs = new Date(end_date).getTime();

  if (nowMilliseconds > endMs) {
    return MeetingStatuses.PAST;
  }

  if (nowMilliseconds >= startMs) {
    return attending ? MeetingStatuses.PARTICIPATING : MeetingStatuses.ON_GOING;
  }

  return MeetingStatuses.UPCOMING;
};
