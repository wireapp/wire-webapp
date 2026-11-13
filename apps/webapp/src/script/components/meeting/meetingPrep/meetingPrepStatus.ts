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

import {Maybe} from 'true-myth';

const millisecondsPerMinute = 60_000;
const countdownWindowInMinutes = 60;
/** setTimeout fires at once above this, so a far-off meeting wakes up at most this late and checks again. */
const maximumTimerDelayInMilliseconds = 2_147_483_647;
/** The countdown shows only this close to the start. Earlier, the date and time line is enough. */
export const MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS = countdownWindowInMinutes * millisecondsPerMinute;

export type MeetingPrepStatus =
  {readonly type: 'inProgress'} | {readonly type: 'startsIn'; readonly minutes: number} | {readonly type: 'none'};

interface MeetingPrepStatusInput {
  readonly startInMilliseconds: number;
  readonly nowInMilliseconds: number;
  readonly isCallInProgress: boolean;
}

/**
 * The status chip of the meeting green room.
 * - inProgress: a call runs in the meeting conversation, whatever the clock says
 * - startsIn: the meeting starts within the next hour; minutes round up, so the last minute reads "1 min"
 * - none: further ahead, or the start time has passed and nobody is in the call
 */
export const getMeetingPrepStatus = ({
  startInMilliseconds,
  nowInMilliseconds,
  isCallInProgress,
}: MeetingPrepStatusInput): MeetingPrepStatus => {
  if (isCallInProgress) {
    return {type: 'inProgress'};
  }

  const remainingInMilliseconds = startInMilliseconds - nowInMilliseconds;
  if (remainingInMilliseconds <= 0 || remainingInMilliseconds > MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS) {
    return {type: 'none'};
  }

  return {type: 'startsIn', minutes: Math.ceil(remainingInMilliseconds / millisecondsPerMinute)};
};

/**
 * How long the status chip stays as it is, so the green room can re-read the clock exactly when it
 * changes: when the countdown window opens, when the minute count drops, and at the start.
 * Nothing once the start has passed, because the clock no longer changes the chip.
 */
export const getMillisecondsUntilStatusChange = ({
  startInMilliseconds,
  nowInMilliseconds,
}: Omit<MeetingPrepStatusInput, 'isCallInProgress'>): Maybe<number> => {
  const remainingInMilliseconds = startInMilliseconds - nowInMilliseconds;
  if (remainingInMilliseconds <= 0) {
    return Maybe.nothing();
  }
  if (remainingInMilliseconds > MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS) {
    return Maybe.just(
      Math.min(
        remainingInMilliseconds - MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS,
        maximumTimerDelayInMilliseconds,
      ),
    );
  }
  return Maybe.just(((remainingInMilliseconds - 1) % millisecondsPerMinute) + 1);
};
