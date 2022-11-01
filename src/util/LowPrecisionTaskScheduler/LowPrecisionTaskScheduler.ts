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

import logdown from 'logdown';

interface IntervalTask {
  key: string;
  firingDate: number;
  task: () => void;
}

interface ScheduleLowPrecisionTaskParams extends IntervalTask {
  intervalDelay: number;
}

interface CancelLowPrecisionTaskParams {
  key: string;
  intervalDelay: number;
}

const logger = logdown('@wireapp/core/TaskScheduler');
const intervals: Record<number, {timeoutId: NodeJS.Timeout; tasks: IntervalTask[]}> = {};

const addTask = ({key, firingDate, task, intervalDelay}: ScheduleLowPrecisionTaskParams) => {
  const existingIntervalId = intervals[intervalDelay]?.timeoutId;
  if (existingIntervalId) {
    clearInterval(existingIntervalId);
  }

  const tasks = intervals[intervalDelay]?.tasks || [];
  tasks.push({key, firingDate, task});

  const timeoutId = setInterval(async () => {
    const nowTime = new Date().getTime();

    const tasks = intervals[intervalDelay]?.tasks;
    if (tasks?.length !== 0) {
      for (const taskData of tasks) {
        if (nowTime >= firingDate) {
          const {task, key} = taskData;
          logger.info(`Executing task with key "${key}"`);
          task();
          cancelTask({intervalDelay, key});
        }
      }
    }
  }, intervalDelay);

  logger.info(`New scheduled task to be executed at "${new Date(firingDate)}" with key "${key}"`);
  intervals[intervalDelay] = {timeoutId, tasks};
};

interface CancelLowPrecisionTaskParams {
  key: string;
  intervalDelay: number;
}

const cancelTask = ({intervalDelay, key}: CancelLowPrecisionTaskParams) => {
  if (intervals[intervalDelay]) {
    const tasks = intervals[intervalDelay].tasks || [];
    const newTasks = tasks.filter(task => task.key !== key);
    intervals[intervalDelay].tasks = newTasks;

    logger.info(`Scheduled task with key "${key}" prematurely cleared`);
    if (newTasks.length === 0) {
      clearInterval(intervals[intervalDelay].timeoutId);
      delete intervals[intervalDelay];
    }
  }
};

export const LowPrecisionTaskScheduler = {addTask, cancelTask};
