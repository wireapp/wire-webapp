/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

interface PromiseQueueOptions {
  /** Concurrent promise execution. Default is 1. */
  concurrent?: number;
  /** Name for Promise queue */
  name: string;
  /** Initial paused state. Default is `false`. */
  paused?: boolean;
  /** Timeout in ms. Default is 1000 (1 minute). */
  timeout?: number;
}

export type PromiseFn<T> = (...args: any[]) => Promise<T>;
export type PromiseResolveFn = (value?: unknown) => void;
export type PromiseRejectFn = (reason?: any) => void;

export interface QueueEntry<T> {
  fn: PromiseFn<T>;
  rejectFn: PromiseRejectFn;
  resolveFn?: PromiseResolveFn;
}

export class PromiseQueue {
  private blocked: boolean;
  private current: number;
  private interval?: number;
  private paused: boolean;
  private readonly concurrent: number;
  private readonly logger: Logger;
  private readonly queue: QueueEntry<any>[];
  private readonly timeout: number;

  static get CONFIG() {
    return {
      UNBLOCK_INTERVAL: TIME_IN_MILLIS.MINUTE,
    };
  }

  constructor(options?: PromiseQueueOptions) {
    const loggerName = `PromiseQueue${name ? ` (${name})` : ''}`;
    this.logger = getLogger(loggerName);

    this.blocked = false;
    this.concurrent = options.concurrent ?? 1;
    this.current = 0;
    this.interval = undefined;
    this.paused = options.paused ?? false;
    this.queue = [];
    this.timeout = options.timeout ?? PromiseQueue.CONFIG.UNBLOCK_INTERVAL;
  }

  /**
   * Executes first function in the queue.
   */
  execute(): void {
    if (this.paused || this.blocked) {
      return;
    }

    const queueEntry = this.queue.shift();
    if (queueEntry) {
      this.clearInterval();

      this.current++;

      if (this.current >= this.concurrent) {
        this.blocked = true;
      }

      this.interval = window.setInterval(() => {
        if (!this.paused) {
          const logObject = {pendingEntry: queueEntry, queueState: this.queue};
          this.logger.error('Promise queue failed, unblocking queue', logObject);
          this.resume();
        }
      }, this.timeout);

      queueEntry
        .fn()
        .catch(error => {
          queueEntry.resolveFn = undefined;
          queueEntry.rejectFn(error);
        })
        .then(response => {
          if (queueEntry.resolveFn) {
            queueEntry.resolveFn(response);
          }

          this.clearInterval();

          this.current--;

          if (this.current < this.concurrent) {
            this.blocked = false;
          }

          window.setTimeout(() => this.execute(), 0);
        });
    }
  }

  /**
   * Get the number of queued functions.
   * @returns Number of queued functions
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Pause or resume the execution.
   */
  pause(shouldPause: boolean = true): PromiseQueue {
    this.paused = shouldPause;

    if (!this.paused) {
      this.execute();
    }

    return this;
  }

  /**
   * Queued function is executed when queue is empty or previous functions are executed.
   * @param fn Function to be executed in queue order
   * @returns Resolves when function was executed
   */
  push<T>(fn: PromiseFn<T>): Promise<T> {
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
  private resume(): void {
    this.clearInterval();
    this.blocked = false;
    this.pause(false);
  }

  /**
   * Queued function is executed.
   * @param fn Function to be executed in queue order
   * @returns Resolves when function was executed
   */
  unshift<T>(fn: PromiseFn<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queueEntry = {
        fn: fn,
        rejectFn: reject,
        resolveFn: resolve,
      };

      this.queue.unshift(queueEntry);
      this.execute();
    });
  }

  private clearInterval(): void {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}
