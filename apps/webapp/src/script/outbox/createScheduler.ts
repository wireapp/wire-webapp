/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {SchedulerPlan} from './planScheduler';

/** A longer delay makes `setTimeout` fire at once */
const MAXIMUM_TIMER_MILLISECONDS = 2_147_483_647;

export type SchedulerActions = {
  plan: (afterStoreFailure: boolean) => SchedulerPlan;
  /** Answers whether the store coped */
  expire: (operationId: string) => Promise<boolean>;
  /** Answers whether the store coped */
  start: (operationId: string) => Promise<boolean>;
  /** Called after a pass in which the store failed */
  onStoreFailure: () => void;
};

export type Scheduler = {
  /** Asks for a pass; it does nothing before `activate` and after `stop` */
  pump: () => void;
  /** Lets passes run: the operations are loaded */
  activate: () => void;
  stop: () => void;
};

/**
 * Runs passes that expire what is due and start what may start, and wakes up for what changes by itself.
 * Passes never overlap, and a request during one makes another follow.
 */
export function createScheduler(actions: SchedulerActions): Scheduler {
  let isActive = false;
  let isStopped = false;
  let isPassRunning = false;
  let isAnotherPassWanted = false;
  let wakeTimer: ReturnType<typeof setTimeout> | undefined;

  /** Answers whether the store failed at some step */
  async function runPass(): Promise<boolean> {
    let hasStoreFailed = false;
    for (const operationId of actions.plan(false).expire) {
      hasStoreFailed = !(await actions.expire(operationId)) || hasStoreFailed;
    }
    for (const operationId of actions.plan(false).start) {
      hasStoreFailed = !(await actions.start(operationId)) || hasStoreFailed;
    }
    if (hasStoreFailed) {
      actions.onStoreFailure();
    }
    return hasStoreFailed;
  }

  function armWakeTimer(afterStoreFailure: boolean): void {
    clearTimeout(wakeTimer);
    wakeTimer = undefined;
    const {wakeInMilliseconds} = actions.plan(afterStoreFailure);
    if (!isStopped && wakeInMilliseconds !== undefined) {
      wakeTimer = setTimeout(pump, Math.min(wakeInMilliseconds, MAXIMUM_TIMER_MILLISECONDS));
    }
  }

  async function runPasses(): Promise<void> {
    do {
      isAnotherPassWanted = false;
      armWakeTimer(await runPass());
    } while (isAnotherPassWanted && !isStopped);
    isPassRunning = false;
  }

  function pump(): void {
    if (isStopped || !isActive) {
      return;
    }
    if (isPassRunning) {
      isAnotherPassWanted = true;
      return;
    }
    isPassRunning = true;
    void runPasses();
  }

  return {
    pump,
    activate() {
      isActive = true;
      pump();
    },
    stop() {
      isStopped = true;
      clearTimeout(wakeTimer);
    },
  };
}
