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

import {TimeUtil} from '@wireapp/commons';

import {RecurringTaskScheduler} from './RecurringTaskScheduler';

const mockedStore = {
  storage: new Map<string, number>(),
  set: async (key: string, timestamp: number) => {
    mockedStore.storage.set(key, timestamp);
  },
  get: async (key: string) => {
    return mockedStore.storage.get(key);
  },
  delete: async (key: string) => {
    mockedStore.storage.delete(key);
  },
  clearAll: async () => {
    mockedStore.storage.clear();
  },
};

const recurringTaskScheduler = new RecurringTaskScheduler(mockedStore);

describe('RecurringTaskScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('executes a task periodically', async () => {
    const task = jest.fn();
    await recurringTaskScheduler.registerTask({every: TimeUtil.TimeInMillis.MINUTE, task, key: 'test-task'});

    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE + 1);
    expect(task).toHaveBeenCalledTimes(1);

    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE + 1);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('resumes a task after re-registering a recurring task', async () => {
    const task = jest.fn();

    // it should fire in a minute
    await recurringTaskScheduler.registerTask({every: TimeUtil.TimeInMillis.MINUTE, task, key: 'test-task2'});
    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE / 2);

    // re-register the task
    await recurringTaskScheduler.registerTask({every: TimeUtil.TimeInMillis.MINUTE, task, key: 'test-task2'});

    // only 30s have passed, so the task should not have fired yet
    expect(task).toHaveBeenCalledTimes(0);

    // advance the timer by another 30s (so we have 1 minute in total)
    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE / 2);

    // the task should have fired once after a minute from the beginning even if we re-registered it
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('cancel a task before it is run', async () => {
    const task = jest.fn();
    const testKey = 'test-task-1';

    await recurringTaskScheduler.registerTask({
      key: testKey,
      every: TimeUtil.TimeInMillis.MINUTE,
      task,
    });

    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE - 1);
    expect(task).not.toHaveBeenCalled();

    await recurringTaskScheduler.cancelTask(testKey);
    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE);

    expect(task).not.toHaveBeenCalled();
  });

  it('adds multiple tasks to schedule and runs it after given delay', async () => {
    const mockedTask1 = jest.fn();
    const mockedTask2 = jest.fn();

    await recurringTaskScheduler.registerTask({
      key: 'test1-key',
      every: TimeUtil.TimeInMillis.MINUTE,
      task: mockedTask1,
    });

    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE + 1);

    expect(mockedTask1).toHaveBeenCalledTimes(1);

    await recurringTaskScheduler.registerTask({
      key: 'test2-key',
      every: TimeUtil.TimeInMillis.MINUTE,
      task: mockedTask2,
    });

    await advanceJestTimersWithPromise(TimeUtil.TimeInMillis.MINUTE + 1);

    expect(mockedTask1).toHaveBeenCalledTimes(2);
    expect(mockedTask2).toHaveBeenCalledTimes(1);
  });
});
