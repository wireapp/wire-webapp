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

import {saveState, loadState, deleteState} from './RecurringTaskScheduler.store';

import {LowPrecisionTaskScheduler} from '../LowPrecisionTaskScheduler';
import {TaskScheduler} from '../TaskScheduler';

interface TaskParams {
  every: number;
  task: () => void;
  key: string;
}

export function registerRecurringTask({every, task, key}: TaskParams) {
  const firingDate = loadState(key) || Date.now() + every;
  saveState(key, firingDate);

  const taskConfig = {
    firingDate,
    key,
    task: () => {
      deleteState(key);
      task();
      registerRecurringTask({every, task, key});
    },
  };

  if (every > TimeUtil.TimeInMillis.DAY * 20) {
    // If the firing date is in more that 20 days, we could switch to a lowPrecision scheduler that will avoid hitting the limit of setTimeout
    // (see https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value)
    LowPrecisionTaskScheduler.addTask({...taskConfig, intervalDelay: TimeUtil.TimeInMillis.MINUTE});
  } else {
    TaskScheduler.addTask(taskConfig);
  }
}

export function cancelRecurringTask(taskKey: string) {
  deleteState(taskKey);
  TaskScheduler.cancelTask(taskKey);
  LowPrecisionTaskScheduler.cancelTask({intervalDelay: TimeUtil.TimeInMillis.MINUTE, key: taskKey});
}
