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

import {Config} from './Config';
import {Item} from './Item';
import {Priority} from './Priority';

export class PriorityQueue {
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
    shouldRetry: () => true,
  };

  private isRunning: boolean = false;
  private queue: Item[] = [];

  constructor(config?: Partial<Config>) {
    this.config = {...this.config, ...config};
  }

  public add<T>(thunkedPromise: () => T, priority: Priority = Priority.MEDIUM, label?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const item = new Item();
      item.fn = thunkedPromise;
      item.label = label;
      item.priority = priority;
      item.reject = reject;
      item.resolve = resolve;
      item.retry = 0;
      item.timestamp = Date.now() + this.size;

      this.enqueue(item);

      if (!this.isRunning) {
        this.isRunning = true;
        void this.processList();
      }
    });
  }

  enqueue(item: Item): void {
    this.queue.push(item);
    this.queue.sort(this.config.comparator);
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
    const item = this.queue.shift();

    if (!item) {
      this.isRunning = false;
      return;
    }

    try {
      item.resolve(await item.fn());
      void this.processList();
    } catch (error) {
      if (this.config.shouldRetry(error) && item.retry < this.config.maxRetries) {
        this.enqueue(item);
        setTimeout(() => this.processList(), this.getGrowingDelay(item.retry));
        item.retry++;
      } else {
        item.reject(error);
        void this.processList();
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
