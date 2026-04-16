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

  it('binds setInterval to globalThis', () => {
    const originalSetInterval = globalThis.setInterval;
    const intervalIdentifier = 123 as unknown as ReturnType<typeof globalThis.setInterval>;
    const intervalInvocationContexts: unknown[] = [];

    const setIntervalStub = function (this: unknown) {
      intervalInvocationContexts.push(this);
      return intervalIdentifier;
    };

    globalThis.setInterval = setIntervalStub as unknown as typeof globalThis.setInterval;

    try {
      const wallClock = createWallClock();
      const returnedIntervalIdentifier = wallClock.setInterval(() => {
        return undefined;
      }, 1);

      expect(returnedIntervalIdentifier).toBe(intervalIdentifier);
      expect(intervalInvocationContexts[0]).toBe(globalThis);
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it('binds clearInterval to globalThis', () => {
    const originalClearInterval = globalThis.clearInterval;
    const clearIntervalInvocationContexts: unknown[] = [];
    const clearIntervalArguments: ReturnType<typeof globalThis.setInterval>[] = [];

    const clearIntervalStub = function (
      this: unknown,
      providedIntervalIdentifier: ReturnType<typeof globalThis.setInterval>,
    ) {
      clearIntervalInvocationContexts.push(this);
      clearIntervalArguments.push(providedIntervalIdentifier);
    };

    globalThis.clearInterval = clearIntervalStub as unknown as typeof globalThis.clearInterval;

    try {
      const wallClock = createWallClock();
      const intervalIdentifier = 123 as unknown as ReturnType<typeof globalThis.setInterval>;

      wallClock.clearInterval(intervalIdentifier);

      expect(clearIntervalInvocationContexts[0]).toBe(globalThis);
      expect(clearIntervalArguments).toEqual([intervalIdentifier]);
    } finally {
      globalThis.clearInterval = originalClearInterval;
    }
  });

  it('binds setTimeout to globalThis', () => {
    const originalSetTimeout = globalThis.setTimeout;
    const timeoutIdentifier = 123 as unknown as ReturnType<typeof globalThis.setTimeout>;
    const timeoutInvocationContexts: unknown[] = [];

    function setTimeoutStub(this: unknown) {
      timeoutInvocationContexts.push(this);
      return timeoutIdentifier;
    }

    globalThis.setTimeout = setTimeoutStub as unknown as typeof globalThis.setTimeout;

    try {
      const wallClock = createWallClock();
      const returnedTimeoutIdentifier = wallClock.setTimeout(() => {
        return undefined;
      }, 1);

      expect(returnedTimeoutIdentifier).toBe(timeoutIdentifier);
      expect(timeoutInvocationContexts[0]).toBe(globalThis);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it('binds clearTimeout to globalThis', () => {
    const originalClearTimeout = globalThis.clearTimeout;
    const clearTimeoutInvocationContexts: unknown[] = [];
    const clearTimeoutArguments: ReturnType<typeof globalThis.setTimeout>[] = [];

    function clearTimeoutStub(this: unknown, providedTimeoutIdentifier: ReturnType<typeof globalThis.setTimeout>) {
      clearTimeoutInvocationContexts.push(this);
      clearTimeoutArguments.push(providedTimeoutIdentifier);
    }

    globalThis.clearTimeout = clearTimeoutStub as unknown as typeof globalThis.clearTimeout;

    try {
      const wallClock = createWallClock();
      const timeoutIdentifier = 123 as unknown as ReturnType<typeof globalThis.setTimeout>;

      wallClock.clearTimeout(timeoutIdentifier);

      expect(clearTimeoutInvocationContexts[0]).toBe(globalThis);
      expect(clearTimeoutArguments).toEqual([timeoutIdentifier]);
    } finally {
      globalThis.clearTimeout = originalClearTimeout;
    }
  });
});
