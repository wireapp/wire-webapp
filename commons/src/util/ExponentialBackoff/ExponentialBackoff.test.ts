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

import {advanceJestTimersWithPromise} from '../testUtils';

import {exponentialBackoff} from '.';

describe('exponentialBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should back off every time 'backOff' is called until maxRetries is reached", async () => {
    const {backOff} = exponentialBackoff('one', {
      maxDelay: 32000,
      minDelay: 500,
      maxRetries: 3,
      multiplyBy: 2,
    });

    const mockedTask = jest.fn(() => Promise.resolve('hello task'));

    const backOffed = () => backOff(mockedTask);

    void backOffed();

    await advanceJestTimersWithPromise(100);
    expect(mockedTask).not.toHaveBeenCalled();

    await advanceJestTimersWithPromise(400);
    expect(mockedTask).toHaveBeenCalledTimes(1);

    void backOffed();

    await advanceJestTimersWithPromise(400);
    expect(mockedTask).toHaveBeenCalledTimes(1);

    await advanceJestTimersWithPromise(600);
    expect(mockedTask).toHaveBeenCalledTimes(2);

    void backOffed();

    await advanceJestTimersWithPromise(1000);
    expect(mockedTask).toHaveBeenCalledTimes(2);

    await advanceJestTimersWithPromise(1000);
    expect(mockedTask).toHaveBeenCalledTimes(3);

    await expect(async () => {
      await backOffed();
      await advanceJestTimersWithPromise(1000);
    }).rejects.toThrow();

    await advanceJestTimersWithPromise(2000);
    expect(mockedTask).toHaveBeenCalledTimes(3);
  });

  it("should back off every time 'backOff' is called until maxDelay is reached", async () => {
    const {backOff} = exponentialBackoff('two', {
      maxDelay: 2000,
      minDelay: 500,
      maxRetries: 100,
      multiplyBy: 2,
    });

    const mockedTask = jest.fn(() => Promise.resolve('hello task'));

    const backOffed = () => backOff(mockedTask);

    void backOffed();

    await advanceJestTimersWithPromise(100);
    expect(mockedTask).not.toHaveBeenCalled();

    await advanceJestTimersWithPromise(400);
    expect(mockedTask).toHaveBeenCalledTimes(1);

    void backOffed();

    await advanceJestTimersWithPromise(400);
    expect(mockedTask).toHaveBeenCalledTimes(1);

    await advanceJestTimersWithPromise(600);
    expect(mockedTask).toHaveBeenCalledTimes(2);

    void backOffed();

    await advanceJestTimersWithPromise(1000);
    expect(mockedTask).toHaveBeenCalledTimes(2);

    await advanceJestTimersWithPromise(1000);
    expect(mockedTask).toHaveBeenCalledTimes(3);

    await expect(async () => {
      await backOffed();
      await advanceJestTimersWithPromise(1000);
    }).rejects.toThrow();

    await advanceJestTimersWithPromise(4000);
    expect(mockedTask).toHaveBeenCalledTimes(3);
  });

  it("should NOT increase the delay if method is called while there's an ongoing timer", async () => {
    const {backOff} = exponentialBackoff('three', {
      maxDelay: 2000,
      minDelay: 500,
      maxRetries: 100,
      multiplyBy: 2,
    });

    const mockedTask = jest.fn(() => Promise.resolve('hello task'));

    const backOffed = () => backOff(mockedTask);

    void backOffed();

    await advanceJestTimersWithPromise(100);
    expect(mockedTask).not.toHaveBeenCalled();

    void backOffed();

    await advanceJestTimersWithPromise(400);

    // Timeout was cleared so after 500 ms in total has elapsed, the task will not be called
    expect(mockedTask).not.toHaveBeenCalled();

    await advanceJestTimersWithPromise(100);
    expect(mockedTask).toHaveBeenCalledTimes(1);
  });

  it("should reset the backoff when 'resetBackOff' is called", async () => {
    const {backOff, resetBackOff} = exponentialBackoff('four', {
      maxDelay: 2000,
      minDelay: 500,
      maxRetries: 100,
      multiplyBy: 2,
    });

    const mockedTask = jest.fn(() => Promise.resolve('hello task'));

    const backOffed = () => backOff(mockedTask);

    void backOffed();

    await advanceJestTimersWithPromise(100);
    expect(mockedTask).not.toHaveBeenCalled();

    resetBackOff();

    await advanceJestTimersWithPromise(400);

    expect(mockedTask).not.toHaveBeenCalled();
  });
});
