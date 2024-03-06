/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {advanceJestTimersWithPromise} from '@wireapp/commons/lib/util/testUtils';

import {LowPrecisionTaskScheduler} from './LowPrecisionTaskScheduler';

describe('LowPrecisionTaskScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("task won't run again after it was executed previously", async () => {
    const mockedTask = jest.fn(() => Promise.resolve('hello task'));

    LowPrecisionTaskScheduler.addTask({
      key: 'test-key',
      firingDate: 0,
      intervalDelay: 2000,
      task: mockedTask,
    });

    await advanceJestTimersWithPromise(5000);

    expect(mockedTask).toHaveBeenCalledTimes(1);
  });

  it('adds single task to schedule and runs it after given delay', async () => {
    const mockedTask = jest.fn(() => Promise.resolve('hello task'));

    LowPrecisionTaskScheduler.addTask({
      key: 'test-key',
      firingDate: 0,
      intervalDelay: 1000,
      task: mockedTask,
    });

    await advanceJestTimersWithPromise(1001);

    expect(mockedTask).toHaveBeenCalled();
  });

  it('adds multiple tasks to schedule and runs it after given delay', async () => {
    const mockedTask1 = jest.fn().mockReturnValue(Promise.resolve('hello task 1'));
    const mockedTask2 = jest.fn().mockReturnValue(Promise.resolve('hello task 2'));

    LowPrecisionTaskScheduler.addTask({
      key: 'test1-key',
      firingDate: 0,
      intervalDelay: 5000,
      task: mockedTask1,
    });

    await advanceJestTimersWithPromise(1000);

    LowPrecisionTaskScheduler.addTask({
      key: 'test2-key',
      firingDate: 0,
      intervalDelay: 5000,
      task: mockedTask2,
    });

    await advanceJestTimersWithPromise(5001);

    expect(mockedTask1).toHaveBeenCalled();
    expect(mockedTask2).toHaveBeenCalled();
  });

  it('adding a task with the same delay and key should overwrite the previous task', async () => {
    const mockedTask1 = jest.fn().mockReturnValue(Promise.resolve('hello task 1'));

    LowPrecisionTaskScheduler.addTask({
      key: 'same-key',
      firingDate: 5000,
      intervalDelay: 1000,
      task: mockedTask1,
    });

    LowPrecisionTaskScheduler.addTask({
      key: 'same-key',
      firingDate: 7000,
      intervalDelay: 1000,
      task: mockedTask1,
    });

    await advanceJestTimersWithPromise(5000);
    expect(mockedTask1).not.toHaveBeenCalled();

    await advanceJestTimersWithPromise(2000);
    expect(mockedTask1).toHaveBeenCalled();
  });

  it('cancels tasks', async () => {
    const mockedTask3 = jest.fn().mockReturnValue(Promise.resolve('hello task 3'));
    const mockedTask4 = jest.fn().mockReturnValue(Promise.resolve('hello task 4'));

    LowPrecisionTaskScheduler.addTask({
      key: 'test3-key',
      firingDate: 0,
      intervalDelay: 4000,
      task: mockedTask3,
    });

    await advanceJestTimersWithPromise(1000);

    LowPrecisionTaskScheduler.addTask({
      key: 'test4-key',
      firingDate: 0,
      intervalDelay: 4000,
      task: mockedTask4,
    });

    LowPrecisionTaskScheduler.cancelTask({
      intervalDelay: 4000,
      key: 'test3-key',
    });

    await advanceJestTimersWithPromise(4001);

    expect(mockedTask3).not.toHaveBeenCalled();
    expect(mockedTask4).toHaveBeenCalled();
  });
});
