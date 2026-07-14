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

import {LowPrecisionTaskScheduler} from '../lowPrecisionTaskScheduler';
import {TaskScheduler} from '../taskScheduler';

interface RecurringTaskSchedulerStorage {
  set: (key: string, timestamp: number) => Promise<void>;
  get: (key: string) => Promise<number | undefined>;
  delete: (key: string) => Promise<void>;
}

export interface TaskParams {
  every: number;
  task: () => Promise<unknown> | unknown;
  key: string;
  addTaskOnWindowFocusEvent?: boolean;
}

const WINDOW_FOCUS_MIN_INTERVAL_MS = 15 * TimeUtil.TimeInMillis.MINUTE;

export class RecurringTaskScheduler {
  private readonly focusListeners = new Map<string, () => void>();
  private readonly lastExecutedAt = new Map<string, number>();
  private readonly windowFocusTaskKeys = new Set<string>();

  constructor(private readonly storage: RecurringTaskSchedulerStorage) {}

  public readonly registerTask = async ({
    every,
    task,
    key,
    addTaskOnWindowFocusEvent = false,
  }: TaskParams): Promise<void> => {
    if (addTaskOnWindowFocusEvent === true) {
      this.windowFocusTaskKeys.add(key);
    }

    const firingDate = (await this.storage.get(key)) ?? Date.now() + every;
    await this.storage.set(key, firingDate);

    const executeTask = async () => {
      await this.storage.delete(key);
      try {
        await task();
      } finally {
        this.lastExecutedAt.set(key, Date.now());
        await this.registerTask({
          every,
          task,
          key,
          addTaskOnWindowFocusEvent: this.windowFocusTaskKeys.has(key),
        });
      }
    };

    const taskConfig = {
      firingDate,
      key,
      task: executeTask,
    };

    if (every > TimeUtil.TimeInMillis.DAY * 20) {
      // If the firing date is in more that 20 days, we could switch to a lowPrecision scheduler that will avoid hitting the limit of setTimeout
      // (see https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value)
      LowPrecisionTaskScheduler.addTask({...taskConfig, intervalDelay: TimeUtil.TimeInMillis.MINUTE});
    } else {
      TaskScheduler.addTask(taskConfig);
    }

    if (this.windowFocusTaskKeys.has(key) === true && typeof window !== 'undefined') {
      this.removeWindowFocusListener(key);

      const focusHandler = () => {
        const lastRun = this.lastExecutedAt.get(key);
        if (lastRun !== undefined && Date.now() - lastRun < WINDOW_FOCUS_MIN_INTERVAL_MS) {
          return;
        }

        void executeTask();
      };

      this.focusListeners.set(key, focusHandler);
      window.addEventListener('focus', focusHandler);
    }
  };

  public readonly cancelTask = async (taskKey: string): Promise<void> => {
    this.windowFocusTaskKeys.delete(taskKey);
    this.removeWindowFocusListener(taskKey);
    this.lastExecutedAt.delete(taskKey);
    await this.storage.delete(taskKey);
    TaskScheduler.cancelTask(taskKey);
    LowPrecisionTaskScheduler.cancelTask({intervalDelay: TimeUtil.TimeInMillis.MINUTE, key: taskKey});
  };

  public readonly hasTask = async (taskKey: string): Promise<boolean> => {
    return (await this.storage.get(taskKey)) !== undefined;
  };

  private readonly removeWindowFocusListener = (key: string): void => {
    const handler = this.focusListeners.get(key);
    if (handler === undefined || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('focus', handler);
    this.focusListeners.delete(key);
  };
}
