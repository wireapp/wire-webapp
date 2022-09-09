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

interface IntervalTask {
  key: string;
  firingDate: number;
  task: () => Promise<any>;
}

interface ScheduleLowPrecisionTaskParams extends IntervalTask {
  intervalDelay: number;
}

interface CancelLowPrecisionTaskParams {
  key: string;
  intervalDelay: number;
}

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
      const tasksToExecute = await tasks.reduce(async (accPromise, {firingDate, task}) => {
        const acc = await accPromise;

        if (nowTime >= firingDate) {
          const taskPromise = task();
          acc.push(taskPromise);
          cancelTask({intervalDelay, key});
        }
        return acc;
      }, Promise.resolve([] as Promise<void>[]));

      await Promise.all(tasksToExecute);
    }
  }, intervalDelay);

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

    if (newTasks.length === 0) {
      clearInterval(intervals[intervalDelay].timeoutId);
      delete intervals[intervalDelay];
    }
  }
};

export const LowPrecisionTaskScheduler = {addTask, cancelTask};
