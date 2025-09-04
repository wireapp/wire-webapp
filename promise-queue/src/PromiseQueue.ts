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

import {PromiseQueueOptions} from './PromiseQueueOptions';
import {QueueEntry, Task} from './QueueEntry';

const defaultOptions = {
  timeout: 1000 * 60, // 1 minute
  concurrent: 1,
  paused: false,
  delay: 0,
};

export class PromiseQueue {
  static ERROR_CAUSES = {
    TIMEOUT: 'QUEUE_TIMEOUT',
    FLUSHED: 'QUEUE_FLUSHED',
  };

  static createTimeoutError(timeout: number): Error {
    const error = new Error(`Timeout Error: Promise did not resolve in ${timeout}ms`);
    error.cause = PromiseQueue.ERROR_CAUSES.TIMEOUT;
    return error;
  }

  static createFlushError(): Error {
    const error = new Error('Queue was flushed');
    error.cause = PromiseQueue.ERROR_CAUSES.FLUSHED;

    return error;
  }

  private blocked: boolean;
  private runningTasks: number;
  private paused: boolean;
  private readonly concurrent: number;
  private readonly logger?: {warn: (...args: any[]) => void};
  private readonly queue: QueueEntry<any>[];
  private readonly timeout: number;

  constructor(options?: PromiseQueueOptions) {
    this.blocked = false;
    this.concurrent = options?.concurrent ?? defaultOptions.concurrent;
    this.runningTasks = 0;
    this.paused = options?.paused ?? defaultOptions.paused;
    this.queue = [];
    this.timeout = options?.timeout ?? defaultOptions.timeout;
  }

  /**
   * Executes first function in the queue.
   */
  private execute(): void {
    if (this.paused || this.blocked) {
      return;
    }

    const queueEntry = this.queue.shift();
    if (!queueEntry) {
      return;
    }

    this.runningTasks++;

    if (this.runningTasks >= this.concurrent) {
      this.blocked = true;
    }

    /**
     * If we don’t clear the timer, the Node.js event loop (or browser timer queue) will still hold on to
     * the timer until it fires. For many tasks this means we'll have thousands of useless timers still pending in memory.
     * In long queues (like app startup notifications) it can lead to memory bloat and unnecessary wake-ups in the event loop.
     */
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        this.logger?.warn?.(
          `Promise queue task timed-out after ${this.timeout}ms, rejecting and advancing to the next task in queue`,
          {
            pending: this.queue.length,
          },
        );
        reject(PromiseQueue.createTimeoutError(this.timeout));
      }, this.timeout);
    });

    Promise.race([queueEntry.fn(), timeout])
      .then(result => queueEntry.resolveFn(result as any))
      .catch(err => {
        queueEntry.resolveFn = () => {};
        queueEntry.rejectFn(err);
      })
      .finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        this.runningTasks--;
        if (this.runningTasks < this.concurrent) {
          this.blocked = false;
        }
        this.execute();
      });
  }

  hasRunningTasks(): boolean {
    return this.runningTasks > 0;
  }

  /**
   * Get the number of queued functions.
   * @returns Number of queued functions
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Pause the execution.
   */
  pause(): PromiseQueue {
    this.paused = true;

    return this;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Queued function is executed when queue is empty or previous functions are executed.
   * @param fn Function to be executed in queue order
   * @returns Resolves when function was executed
   */
  push<T>(fn: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queueEntry: QueueEntry<T> = {
        fn,
        rejectFn: reject,
        resolveFn: resolve,
      };

      this.queue.push(queueEntry);
      this.execute();
    });
  }

  /**
   * Resume execution of queue.
   */
  public resume(): void {
    this.paused = false;
    this.execute();
  }

  /**
   * Flushes the queue by removing all pending tasks without executing them.
   * All flushed promises are rejected with the provided reason.
   *
   * Running tasks are unaffected.
   */
  flush(reason: Error = PromiseQueue.createFlushError()): void {
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (entry) {
        // Prevent accidental resolve if the task ever runs
        entry.resolveFn = () => {};
        entry.rejectFn(reason);
      }
    }
  }
}
