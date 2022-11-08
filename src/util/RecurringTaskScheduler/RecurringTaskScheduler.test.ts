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

import {TimeUtil} from '@wireapp/commons';

import {cancelRecurringTask, registerRecurringTask} from './RecurringTaskScheduler';

// Storage Mock
function storageMock() {
  const storage: any = {};

  return {
    setItem: function (key: any, value: any) {
      storage[key] = value || '';
    },
    getItem: function (key: any) {
      return key in storage ? storage[key] : null;
    },
    removeItem: function (key: any) {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: function (i: any) {
      const keys = Object.keys(storage);
      return keys[i] || null;
    },
  };
}

(global as any).localStorage = storageMock();

describe('RecurringTaskScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('executes a task periodically', () => {
    const task = jest.fn();
    registerRecurringTask({every: TimeUtil.TimeInMillis.MINUTE, task, key: 'test-task'});
    jest.advanceTimersByTime(TimeUtil.TimeInMillis.MINUTE + 1);

    expect(task).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(TimeUtil.TimeInMillis.MINUTE + 1);

    expect(task).toHaveBeenCalledTimes(2);
  });

  it('cancel a task before it is run', () => {
    const task = jest.fn();
    const testKey = 'test-task-1';

    registerRecurringTask({
      key: testKey,
      every: TimeUtil.TimeInMillis.MINUTE,
      task,
    });

    jest.advanceTimersByTime(TimeUtil.TimeInMillis.MINUTE - 1);
    expect(task).not.toHaveBeenCalled();

    cancelRecurringTask(testKey);
    jest.advanceTimersByTime(TimeUtil.TimeInMillis.MINUTE);
    expect(task).not.toHaveBeenCalled();
  });

  it('adds multiple tasks to schedule and runs it after given delay', () => {
    const mockedTask1 = jest.fn();
    const mockedTask2 = jest.fn();

    registerRecurringTask({
      key: 'test1-key',
      every: TimeUtil.TimeInMillis.MINUTE,
      task: mockedTask1,
    });

    jest.advanceTimersByTime(TimeUtil.TimeInMillis.MINUTE + 1);
    expect(mockedTask1).toHaveBeenCalledTimes(1);

    registerRecurringTask({
      key: 'test2-key',
      every: TimeUtil.TimeInMillis.MINUTE,
      task: mockedTask2,
    });

    jest.advanceTimersByTime(TimeUtil.TimeInMillis.MINUTE + 1);

    expect(mockedTask1).toHaveBeenCalledTimes(2);
    expect(mockedTask2).toHaveBeenCalledTimes(1);
  });
});
