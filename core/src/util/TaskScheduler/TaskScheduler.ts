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

import {TaskSchedulerStore} from './TaskScheduler.store';

const logger = LogFactory.getLogger('@wireapp/core/TaskScheduler');

type ScheduleTaskParams = {
  task: () => Promise<void> | void;
  firingDate: number;
  key: string;
  persist?: boolean;
};

const activeTimeouts: Record<string, NodeJS.Timeout> = {};

/**
 * Execute a task at a given time.
 *
 * @param task function to be executed
 * @param firingDate execution date
 * @param key unique key for the task
 */
const addTask = ({task, firingDate, key, persist = false}: ScheduleTaskParams) => {
  const now = Date.now();
  const execute = new Date(firingDate);
  const delay = execute.getTime() - now;

  if (TaskSchedulerStore.has(key)) {
    TaskSchedulerStore.remove(key);
  }
  if (activeTimeouts[key]) {
    cancelTask(key);
  }

  const timeout = setTimeout(
    async () => {
      logger.info(`Executing task with key "${key}"`);
      delete activeTimeouts[key];
      TaskSchedulerStore.remove(key);
      await task();
    },
    delay > 0 ? delay : 0,
  );

  // add the task to the list of active tasks
  activeTimeouts[key] = timeout;
  if (persist) {
    TaskSchedulerStore.add(key, firingDate);
  }

  logger.info(`New scheduled task to be executed at "${execute}" with key "${key}"`);
};

/**
 * Cancel a scheduled task early
 *
 * @param key unique key for the task
 */
const cancelTask = (key: string) => {
  const timeout = activeTimeouts[key];
  if (timeout) {
    clearTimeout(timeout);
    delete activeTimeouts[key];
    logger.info(`Scheduled task with key "${key}" prematurely cleared`);
  }
};

/**
 * Checks if a task has been scheduled in the past and reschedules it
 * @param task function to be executed
 * @param key unique key for the task
 */
const continueTask = ({key, task}: Omit<ScheduleTaskParams, 'firingDate' | 'persist'>) => {
  const activeTaskEndTime = TaskSchedulerStore.get(key);
  if (activeTaskEndTime) {
    addTask({task, firingDate: activeTaskEndTime, key, persist: true});
  }
};

const hasActiveTask = (key: string) => !!activeTimeouts[key];

export const TaskScheduler = {
  addTask,
  cancelTask,
  continueTask,
  hasActiveTask,
};
