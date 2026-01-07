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

import {LogFactory} from '@wireapp/commons';

interface IntervalTask {
  firingDate: number;
  task: () => void;
}

interface ScheduleLowPrecisionTaskParams extends IntervalTask {
  key: string;
  intervalDelay: number;
}

interface CancelLowPrecisionTaskParams {
  key: string;
  intervalDelay: number;
}

const logger = LogFactory.getLogger('@wireapp/core/TaskScheduler');
const intervals: Record<number, {timeoutId: NodeJS.Timeout; tasks: Record<string, IntervalTask>}> = {};

const addTask = ({key, firingDate, task, intervalDelay}: ScheduleLowPrecisionTaskParams) => {
  const existingIntervalId = intervals[intervalDelay]?.timeoutId;
  if (existingIntervalId) {
    clearInterval(existingIntervalId);
  }

  const tasks = intervals[intervalDelay]?.tasks || {};

  tasks[key] = {firingDate, task};

  const timeoutId = setInterval(async () => {
    const nowTime = new Date().getTime();

    const tasks = intervals[intervalDelay]?.tasks;

    if (!tasks) {
      return;
    }

    for (const key in tasks) {
      if (tasks[key].firingDate <= nowTime) {
        const {task} = tasks[key];
        logger.info(`Executing task with key "${key}"`);
        delete tasks[key];
        task();
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
    const tasks = intervals[intervalDelay].tasks || {};

    const newTasks = {...tasks};
    delete newTasks[key];

    intervals[intervalDelay].tasks = newTasks;

    logger.info(`Scheduled task with key "${key}" prematurely cleared`);
    if (Object.keys(newTasks).length === 0) {
      clearInterval(intervals[intervalDelay].timeoutId);
      delete intervals[intervalDelay];
    }
  }
};

export const LowPrecisionTaskScheduler = {addTask, cancelTask};
