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

import {createFakeWallClock} from './fakeWallClock';

describe('createFakeWallClock', () => {
  it('starts at zero by default', () => {
    const fakeWallClock = createFakeWallClock();

    expect(typeof fakeWallClock.currentTimestampInMilliseconds).toBe('number');
    expect(fakeWallClock.currentDate).toBeInstanceOf(Date);
    expect(fakeWallClock.currentTimestampInMilliseconds).toBe(0);
    expect(fakeWallClock.currentDate.getTime()).toBe(0);
  });

  it('starts with the provided initial timestamp', () => {
    const initialCurrentTimestampInMilliseconds = 1_704_067_200_000;
    const fakeWallClock = createFakeWallClock({initialCurrentTimestampInMilliseconds});

    expect(typeof fakeWallClock.currentTimestampInMilliseconds).toBe('number');
    expect(fakeWallClock.currentDate).toBeInstanceOf(Date);
    expect(fakeWallClock.currentTimestampInMilliseconds).toBe(initialCurrentTimestampInMilliseconds);
    expect(fakeWallClock.currentDate.getTime()).toBe(initialCurrentTimestampInMilliseconds);
  });

  it('sets the current timestamp in milliseconds', () => {
    const fakeWallClock = createFakeWallClock();
    const nextTimestampInMilliseconds = 1_800_000;

    fakeWallClock.setCurrentTimestampInMilliseconds(nextTimestampInMilliseconds);

    expect(fakeWallClock.currentTimestampInMilliseconds).toBe(nextTimestampInMilliseconds);
    expect(fakeWallClock.currentDate.getTime()).toBe(nextTimestampInMilliseconds);
  });

  it('advances current timestamp by the provided delay', () => {
    const fakeWallClock = createFakeWallClock({initialCurrentTimestampInMilliseconds: 10_000});

    fakeWallClock.advanceByMilliseconds(500);
    fakeWallClock.advanceByMilliseconds(1_500);

    expect(fakeWallClock.currentTimestampInMilliseconds).toBe(12_000);
    expect(fakeWallClock.currentDate.getTime()).toBe(12_000);
  });

  it('returns a new date instance for each call', () => {
    const fakeWallClock = createFakeWallClock({initialCurrentTimestampInMilliseconds: 100});

    const firstCurrentDate = fakeWallClock.currentDate;
    const secondCurrentDate = fakeWallClock.currentDate;

    expect(firstCurrentDate).not.toBe(secondCurrentDate);
    expect(firstCurrentDate.getTime()).toBe(100);
    expect(secondCurrentDate.getTime()).toBe(100);
  });

  it('does not execute interval callback before enough time elapsed', () => {
    const fakeWallClock = createFakeWallClock();
    const intervalCallback = jest.fn();

    fakeWallClock.setInterval(intervalCallback, 1_000);
    fakeWallClock.advanceByMilliseconds(999);

    expect(intervalCallback).not.toHaveBeenCalled();
  });

  it('executes interval callback repeatedly when enough time elapsed', () => {
    const fakeWallClock = createFakeWallClock();
    const intervalCallback = jest.fn();

    fakeWallClock.setInterval(intervalCallback, 1_000);
    fakeWallClock.advanceByMilliseconds(3_500);

    expect(intervalCallback).toHaveBeenCalledTimes(3);
  });

  it('stops executing interval callback after clearInterval', () => {
    const fakeWallClock = createFakeWallClock();
    const intervalCallback = jest.fn();
    const intervalIdentifier = fakeWallClock.setInterval(intervalCallback, 1_000);

    fakeWallClock.advanceByMilliseconds(1_000);
    fakeWallClock.clearInterval(intervalIdentifier);
    fakeWallClock.advanceByMilliseconds(5_000);

    expect(intervalCallback).toHaveBeenCalledTimes(1);
  });

  it('does not execute an interval that was cleared by another interval callback', () => {
    const fakeWallClock = createFakeWallClock();
    const clearedIntervalCallback = jest.fn();
    let clearedIntervalIdentifier: ReturnType<typeof globalThis.setInterval> | undefined;

    fakeWallClock.setInterval(() => {
      if (clearedIntervalIdentifier !== undefined) {
        fakeWallClock.clearInterval(clearedIntervalIdentifier);
      }
    }, 1_000);
    clearedIntervalIdentifier = fakeWallClock.setInterval(clearedIntervalCallback, 1_000);
    fakeWallClock.advanceByMilliseconds(1_000);

    expect(clearedIntervalCallback).not.toHaveBeenCalled();
  });

  it('executes interval callback with arguments', () => {
    const fakeWallClock = createFakeWallClock();
    const intervalCallback = jest.fn();

    fakeWallClock.setInterval(intervalCallback, 1_000, 'first', 42);
    fakeWallClock.advanceByMilliseconds(1_000);

    expect(intervalCallback).toHaveBeenCalledWith('first', 42);
  });

  it('throws for non-positive interval delay', () => {
    const fakeWallClock = createFakeWallClock();

    expect(() => {
      fakeWallClock.setInterval(jest.fn(), 0);
    }).toThrow('Invalid delay 0, must be greater than 0');
    expect(() => {
      fakeWallClock.setInterval(jest.fn(), -1);
    }).toThrow('Invalid delay -1, must be greater than 0');
  });

  it('throws for non-finite interval delay', () => {
    const fakeWallClock = createFakeWallClock();

    expect(() => fakeWallClock.setInterval(jest.fn(), Number.NaN)).toThrow('Invalid delay, must be a finite number');
    expect(() => fakeWallClock.setInterval(jest.fn(), Number.POSITIVE_INFINITY)).toThrow(
      'Invalid delay, must be a finite number',
    );
  });
});
