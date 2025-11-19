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

import {MeetingEntity} from 'Components/Meeting/MeetingList/MeetingList';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

export enum MEETING_STATUS {
  ON_GOING = 'on_going',
  STARTING_SOON = 'starting_soon',
  PARTICIPATING = 'participating',
  UPCOMING = 'upcoming',
  PAST = 'past',
}

/**
 * Threshold in milliseconds to determine if a meeting is starting soon.
 */
export const STARTING_SOON_THRESHOLD_MS = 5 * TIME_IN_MILLIS.MINUTE;

/**
 * Filters the list of meetings to return only those that are ongoing at the specified time.
 *
 * @param {MeetingEntity[]} meetings - The list of meetings to filter.
 * @param {number} nowMs - The current time in milliseconds.
 * @returns {MeetingEntity[]} - The list of ongoing meetings.
 */
export const getOnGoingMeetingsAt = (meetings: MeetingEntity[], nowMs: number): MeetingEntity[] =>
  meetings.filter(meeting => {
    const startMs = new Date(meeting.start_date).getTime();
    const endMs = new Date(meeting.end_date).getTime();
    return nowMs >= startMs && nowMs < endMs;
  });

/**
 * Determines the status of a meeting at a specific time.
 *
 * @param {number} nowMs - The current time in milliseconds.
 * @param {string} start_date - The start date of the meeting in ISO format.
 * @param {string} end_date - The end date of the meeting in ISO format.
 * @param {boolean} [attending=false] - Whether the user is attending the meeting.
 * @returns {MEETING_STATUS} - The status of the meeting.
 */
export const getMeetingStatusAt = (
  nowMs: number,
  start_date: string,
  end_date: string,
  attending: boolean = false,
): MEETING_STATUS => {
  const startMs = new Date(start_date).getTime();
  const endMs = new Date(end_date).getTime();

  if (nowMs > endMs) {
    return MEETING_STATUS.PAST;
  }

  if (nowMs >= startMs) {
    return attending ? MEETING_STATUS.PARTICIPATING : MEETING_STATUS.ON_GOING;
  }

  if (startMs <= nowMs + STARTING_SOON_THRESHOLD_MS) {
    return MEETING_STATUS.STARTING_SOON;
  }

  return MEETING_STATUS.UPCOMING;
};

/**
 * Calculates the countdown in seconds until a meeting starts.
 *
 * @param {number} nowMs - The current time in milliseconds.
 * @param {string} start_date - The start date of the meeting in ISO format.
 * @returns {number} - The countdown in seconds, or 0 if the meeting has already started.
 */
export const getCountdownSeconds = (nowMs: number, start_date: string): number => {
  const startMs = new Date(start_date).getTime();
  return Math.max(0, Math.ceil((startMs - nowMs) / TIME_IN_MILLIS.SECOND));
};
