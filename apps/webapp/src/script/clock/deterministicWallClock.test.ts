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

import {createDeterministicWallClock} from './deterministicWallClock';

describe('createDeterministicWallClock', () => {
  it('starts at zero by default', () => {
    const deterministicWallClock = createDeterministicWallClock();

    expect(typeof deterministicWallClock.currentTimestampInMilliseconds).toBe('number');
    expect(deterministicWallClock.currentDate).toBeInstanceOf(Date);
    expect(deterministicWallClock.currentTimestampInMilliseconds).toBe(0);
    expect(deterministicWallClock.currentDate.getTime()).toBe(0);
  });

  it('starts with the provided initial timestamp', () => {
    const initialCurrentTimestampInMilliseconds = 1_704_067_200_000;
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds});

    expect(typeof deterministicWallClock.currentTimestampInMilliseconds).toBe('number');
    expect(deterministicWallClock.currentDate).toBeInstanceOf(Date);
    expect(deterministicWallClock.currentTimestampInMilliseconds).toBe(initialCurrentTimestampInMilliseconds);
    expect(deterministicWallClock.currentDate.getTime()).toBe(initialCurrentTimestampInMilliseconds);
  });

  it('sets the current timestamp in milliseconds', () => {
    const deterministicWallClock = createDeterministicWallClock();
    const nextTimestampInMilliseconds = 1_800_000;

    deterministicWallClock.setCurrentTimestampInMilliseconds(nextTimestampInMilliseconds);

    expect(deterministicWallClock.currentTimestampInMilliseconds).toBe(nextTimestampInMilliseconds);
    expect(deterministicWallClock.currentDate.getTime()).toBe(nextTimestampInMilliseconds);
  });

  it('advances current timestamp by the provided delay', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 10_000});

    deterministicWallClock.advanceByMilliseconds(500);
    deterministicWallClock.advanceByMilliseconds(1_500);

    expect(deterministicWallClock.currentTimestampInMilliseconds).toBe(12_000);
    expect(deterministicWallClock.currentDate.getTime()).toBe(12_000);
  });

  it('returns a new date instance for each call', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 100});

    const firstCurrentDate = deterministicWallClock.currentDate;
    const secondCurrentDate = deterministicWallClock.currentDate;

    expect(firstCurrentDate).not.toBe(secondCurrentDate);
    expect(firstCurrentDate.getTime()).toBe(100);
    expect(secondCurrentDate.getTime()).toBe(100);
  });

  it('executes interval callbacks repeatedly when time advances', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const intervalHandler = jest.fn();

    deterministicWallClock.setInterval(intervalHandler, 100, 'interval argument');
    deterministicWallClock.advanceByMilliseconds(250);

    expect(intervalHandler).toHaveBeenCalledTimes(2);
    expect(intervalHandler).toHaveBeenNthCalledWith(1, 'interval argument');
    expect(intervalHandler).toHaveBeenNthCalledWith(2, 'interval argument');
  });

  it('stops executing callbacks after clearInterval', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const intervalHandler = jest.fn();

    const intervalIdentifier = deterministicWallClock.setInterval(intervalHandler, 100);
    deterministicWallClock.advanceByMilliseconds(100);
    deterministicWallClock.clearInterval(intervalIdentifier);
    deterministicWallClock.advanceByMilliseconds(300);

    expect(intervalHandler).toHaveBeenCalledTimes(1);
  });

  it('executes timeout callback once when time reaches the delay', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const timeoutHandler = jest.fn();

    deterministicWallClock.setTimeout(timeoutHandler, 100, 'timeout argument');
    deterministicWallClock.advanceByMilliseconds(100);
    deterministicWallClock.advanceByMilliseconds(500);

    expect(timeoutHandler).toHaveBeenCalledTimes(1);
    expect(timeoutHandler).toHaveBeenNthCalledWith(1, 'timeout argument');
  });

  it('does not execute timeout callback before the delay', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const timeoutHandler = jest.fn();

    deterministicWallClock.setTimeout(timeoutHandler, 100);
    deterministicWallClock.advanceByMilliseconds(99);

    expect(timeoutHandler).not.toHaveBeenCalled();
  });

  it('stops executing timeout callback after clearTimeout', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const timeoutHandler = jest.fn();

    const timeoutIdentifier = deterministicWallClock.setTimeout(timeoutHandler, 100);
    deterministicWallClock.clearTimeout(timeoutIdentifier);
    deterministicWallClock.advanceByMilliseconds(100);

    expect(timeoutHandler).not.toHaveBeenCalled();
  });

  it('executes due timeout callbacks in registration order for the same execution timestamp', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const executionOrder: string[] = [];

    deterministicWallClock.setTimeout(() => executionOrder.push('first timeout'), 100);
    deterministicWallClock.setTimeout(() => executionOrder.push('second timeout'), 100);
    deterministicWallClock.setTimeout(() => executionOrder.push('third timeout'), 100);
    deterministicWallClock.advanceByMilliseconds(100);

    expect(executionOrder).toEqual(['first timeout', 'second timeout', 'third timeout']);
  });
});
