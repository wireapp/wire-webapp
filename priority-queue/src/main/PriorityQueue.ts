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

import logdown from 'logdown';
import {Config} from './Config';
import {Item} from './Item';
import {Priority} from './Priority';

export class PriorityQueue {
  private readonly logger: logdown.Logger = logdown('@wireapp/priority-queue/PriorityQueue', {
    logger: console,
    markdown: false,
  });

  private readonly config: Config = {
    comparator: (a: Item, b: Item): Priority => {
      if (a.priority === b.priority) {
        return a.timestamp - b.timestamp;
      }
      return b.priority - a.priority;
    },
    maxRetries: 0,
    maxRetryDelay: Number.MAX_SAFE_INTEGER,
    retryDelay: 1000,
    retryGrowthFactor: 1.3,
  };

  private isRunning: boolean = false;
  private queue: Item[] = [];

  constructor(config?: Partial<Config>) {
    this.config = {...this.config, ...config};
  }

  public add<T>(thunkedPromise: () => T, priority: Priority = Priority.MEDIUM, label?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const queueObject = new Item();
      queueObject.fn = thunkedPromise;
      queueObject.label = label;
      queueObject.priority = priority;
      queueObject.reject = reject;
      queueObject.resolve = resolve;
      queueObject.retry = 0;
      queueObject.timestamp = Date.now() + this.size;
      this.queue.push(queueObject);
      this.queue.sort(this.config.comparator);

      if (!this.isRunning) {
        this.isRunning = true;
        /* tslint:disable-next-line:no-floating-promises */
        this.processList();
      }
    });
  }

  public delete(label: string): void {
    this.queue = this.queue.filter(item => item.label !== label);
  }

  public deleteAll(): void {
    this.queue = [];
  }

  public get all(): Item[] {
    return this.queue;
  }

  public get first(): Item {
    return this.queue[0];
  }

  public get last(): Item {
    return this.queue[this.queue.length - 1];
  }

  public get size(): number {
    return this.queue.length;
  }

  private async processList(): Promise<void> {
    const queueObject = this.first;
    if (!queueObject) {
      this.isRunning = false;
      return;
    }

    try {
      queueObject.resolve(await queueObject.fn());
      this.queue.shift();
      /* tslint:disable-next-line:no-floating-promises */
      this.processList();
    } catch (error) {
      // TODO: print soomething when retrying execution
      if (queueObject.retry >= this.config.maxRetries) {
        this.queue.shift();
        queueObject.reject(error);
        /* tslint:disable-next-line:no-floating-promises */
        this.processList();
      } else {
        this.logger.log(`Retrying item "${queueObject}"`);
        setTimeout(() => this.processList(), this.getGrowingDelay(queueObject.retry));
        queueObject.retry++;
      }
    }
  }

  private getGrowingDelay(currentRetry: number): number {
    const delay =
      currentRetry < 1 ? this.config.retryDelay : this.config.retryDelay * currentRetry * this.config.retryGrowthFactor;
    return Math.min(delay, this.config.maxRetryDelay);
  }

  public toString(): string {
    return this.queue
      .map((item: Item, index: number) => {
        return `"${index}": ${item.toString()}`;
      })
      .join('\r\n');
  }
}
