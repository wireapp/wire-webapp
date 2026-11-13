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

import {
  getMeetingPrepStatus,
  getMillisecondsUntilStatusChange,
  MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS,
} from './meetingPrepStatus';

const startInMilliseconds = 1_800_000_000_000;

describe('getMeetingPrepStatus', () => {
  it('counts down the minutes before the start, rounding up', () => {
    expect(
      getMeetingPrepStatus({
        startInMilliseconds,
        nowInMilliseconds: startInMilliseconds - 5 * 60_000,
        isCallInProgress: false,
      }),
    ).toEqual({type: 'startsIn', minutes: 5});
    expect(
      getMeetingPrepStatus({
        startInMilliseconds,
        nowInMilliseconds: startInMilliseconds - 4 * 60_000 - 1,
        isCallInProgress: false,
      }),
    ).toEqual({type: 'startsIn', minutes: 5});
  });

  it('reads 1 min until 1 ms before the start, and nothing at the start', () => {
    expect(
      getMeetingPrepStatus({startInMilliseconds, nowInMilliseconds: startInMilliseconds - 1, isCallInProgress: false}),
    ).toEqual({type: 'startsIn', minutes: 1});
    expect(
      getMeetingPrepStatus({startInMilliseconds, nowInMilliseconds: startInMilliseconds, isCallInProgress: false}),
    ).toEqual({
      type: 'none',
    });
  });

  it('starts the countdown one hour before the start, not earlier', () => {
    expect(
      getMeetingPrepStatus({
        startInMilliseconds,
        nowInMilliseconds: startInMilliseconds - MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS,
        isCallInProgress: false,
      }),
    ).toEqual({type: 'startsIn', minutes: 60});
    expect(
      getMeetingPrepStatus({
        startInMilliseconds,
        nowInMilliseconds: startInMilliseconds - MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS - 1,
        isCallInProgress: false,
      }),
    ).toEqual({type: 'none'});
  });

  it('shows in progress whenever a call runs, before or after the start', () => {
    expect(
      getMeetingPrepStatus({
        startInMilliseconds,
        nowInMilliseconds: startInMilliseconds - 10 * 60_000,
        isCallInProgress: true,
      }),
    ).toEqual({type: 'inProgress'});
    expect(
      getMeetingPrepStatus({
        startInMilliseconds,
        nowInMilliseconds: startInMilliseconds + 10 * 60_000,
        isCallInProgress: true,
      }),
    ).toEqual({type: 'inProgress'});
  });
});

describe('getMillisecondsUntilStatusChange', () => {
  const until = (nowInMilliseconds: number): Maybe<number> => {
    return getMillisecondsUntilStatusChange({startInMilliseconds, nowInMilliseconds});
  };

  it('wakes up when the countdown window opens', () => {
    expect(until(startInMilliseconds - MEETING_PREP_COUNTDOWN_WINDOW_IN_MILLISECONDS - 5_000)).toEqual(
      Maybe.just(5_000),
    );
  });

  it('never asks for a timer longer than the browser can hold', () => {
    const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60_000;
    expect(until(startInMilliseconds - thirtyDaysInMilliseconds)).toEqual(Maybe.just(2_147_483_647));
  });

  it('wakes up when the rounded minute count drops', () => {
    expect(until(startInMilliseconds - 4 * 60_000 - 14_900)).toEqual(Maybe.just(14_900));
    expect(until(startInMilliseconds - 5 * 60_000)).toEqual(Maybe.just(60_000));
  });

  it('wakes up at the start, then stops', () => {
    expect(until(startInMilliseconds - 1)).toEqual(Maybe.just(1));
    expect(until(startInMilliseconds).isNothing).toBe(true);
    expect(until(startInMilliseconds + 60_000).isNothing).toBe(true);
  });
});
