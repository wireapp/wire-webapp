/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {onBackFromSleep} from './BackFromSleepHandler';

const CHECK_INTERVAL = 2000;
const TOLERANCE = CHECK_INTERVAL * 2;

jest.useFakeTimers();

describe('onBackFromSleep', () => {
  let originalDateNow: () => number;
  let now: number;
  const stopFunctions: Array<() => void> = [];

  beforeEach(() => {
    originalDateNow = Date.now;
    now = Date.now();
    jest.spyOn(global, 'Date').mockImplementation(
      () =>
        ({
          getTime: () => now,
        }) as unknown as Date,
    );
  });

  afterEach(() => {
    // Clean up all intervals created during tests
    stopFunctions.forEach(stop => stop());
    stopFunctions.length = 0;
    jest.clearAllTimers();
    global.Date.now = originalDateNow;
  });

  it('should call the callback when system wakes up from sleep', () => {
    const callback = jest.fn();
    const stop = onBackFromSleep({callback});
    stopFunctions.push(stop);

    // Simulate system sleep
    now += TOLERANCE + 1;
    jest.advanceTimersByTime(CHECK_INTERVAL);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call the callback for small delays', () => {
    const callback = jest.fn();
    const stop = onBackFromSleep({callback});
    stopFunctions.push(stop);

    // Simulate small delay
    now += TOLERANCE - 1;
    jest.advanceTimersByTime(CHECK_INTERVAL);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should call the callback if disconnected during sleep', () => {
    const callback = jest.fn();
    const isDisconnected = jest.fn().mockReturnValue(true);

    const stop = onBackFromSleep({callback, isDisconnected});
    stopFunctions.push(stop);

    // Simulate system sleep
    now += TOLERANCE + 1;
    jest.advanceTimersByTime(CHECK_INTERVAL);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call the callback if not disconnected during sleep', () => {
    const callback = jest.fn();
    const isDisconnected = jest.fn().mockReturnValue(false);

    const stop = onBackFromSleep({callback, isDisconnected});
    stopFunctions.push(stop);

    // Simulate system sleep
    now += TOLERANCE + 1;
    jest.advanceTimersByTime(CHECK_INTERVAL);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should call the callback only once after sleep', () => {
    const callback = jest.fn();
    const stop = onBackFromSleep({callback});
    stopFunctions.push(stop);

    // Simulate system sleep and wake up
    now += TOLERANCE + 1;
    jest.advanceTimersByTime(CHECK_INTERVAL);

    expect(callback).toHaveBeenCalledTimes(1);

    // Simulate more intervals
    jest.advanceTimersByTime(CHECK_INTERVAL * 10);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should stop checking when returned function is called', () => {
    const callback = jest.fn();
    const stop = onBackFromSleep({callback});
    stopFunctions.push(stop);

    // Stop the interval manually for this specific test
    stop();

    // Simulate system sleep
    now += TOLERANCE + 1;
    jest.advanceTimersByTime(CHECK_INTERVAL);

    expect(callback).not.toHaveBeenCalled();
  });
});
