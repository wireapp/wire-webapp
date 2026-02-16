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

import timers from 'node:timers/promises';

import {createWallClock} from './wallClock';

describe('wall clock', () => {
  it('returns the current timestamp in milliseconds', () => {
    const lowerTimestampBound = Date.now();
    const wallClock = createWallClock();
    const currentTimestamp = wallClock.currentTimestampInMilliseconds;
    const upperTimestampBound = Date.now();

    expect(typeof currentTimestamp).toBe('number');
    expect(currentTimestamp).toBeGreaterThanOrEqual(lowerTimestampBound);
    expect(currentTimestamp).toBeLessThanOrEqual(upperTimestampBound);
  });

  it('returns the current date based on Date.now()', () => {
    const lowerTimestampBound = Date.now();
    const wallClock = createWallClock();
    const currentDate = wallClock.currentDate;
    const upperTimestampBound = Date.now();

    expect(currentDate).toBeInstanceOf(Date);
    expect(currentDate.getTime()).toBeGreaterThanOrEqual(lowerTimestampBound);
    expect(currentDate.getTime()).toBeLessThanOrEqual(upperTimestampBound);
  });

  it('returns a new date instance for each call', async () => {
    const wallClock = createWallClock();

    const firstCurrentDate = wallClock.currentDate;
    await timers.setTimeout(1);
    const secondCurrentDate = wallClock.currentDate;

    expect(firstCurrentDate).not.toBe(secondCurrentDate);
    expect(secondCurrentDate.getTime()).toBeGreaterThanOrEqual(firstCurrentDate.getTime());
  });
});
