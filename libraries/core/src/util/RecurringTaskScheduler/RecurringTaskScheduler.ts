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

import {LowPrecisionTaskScheduler} from '../LowPrecisionTaskScheduler';
import {TaskScheduler} from '../TaskScheduler';

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

export class RecurringTaskScheduler {
  constructor(private readonly storage: RecurringTaskSchedulerStorage) {}

  public readonly registerTask = async ({
    every,
    task,
    key,
    addTaskOnWindowFocusEvent = false,
  }: TaskParams): Promise<void> => {
    const firingDate = (await this.storage.get(key)) || Date.now() + every;
    await this.storage.set(key, firingDate);

    const taskConfig = {
      firingDate,
      key,
      task: async () => {
        await this.storage.delete(key);
        try {
          await task();
        } finally {
          await this.registerTask({every, task, key});
        }
      },
    };

    if (every > TimeUtil.TimeInMillis.DAY * 20) {
      // If the firing date is in more that 20 days, we could switch to a lowPrecision scheduler that will avoid hitting the limit of setTimeout
      // (see https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value)
      LowPrecisionTaskScheduler.addTask({...taskConfig, intervalDelay: TimeUtil.TimeInMillis.MINUTE});
    } else {
      TaskScheduler.addTask(taskConfig);
    }

    // If the task should be added on window focus event, we add it here

    if (addTaskOnWindowFocusEvent && typeof window !== 'undefined') {
      window.addEventListener('focus', taskConfig.task);
    }
  };

  public readonly cancelTask = async (taskKey: string): Promise<void> => {
    await this.storage.delete(taskKey);
    TaskScheduler.cancelTask(taskKey);
    LowPrecisionTaskScheduler.cancelTask({intervalDelay: TimeUtil.TimeInMillis.MINUTE, key: taskKey});
  };

  public readonly hasTask = async (taskKey: string): Promise<boolean> => {
    return !!(await this.storage.get(taskKey));
  };
}
