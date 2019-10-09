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
    maxRetries: Infinity,
    retryDelay: 1000,
  };
  public isPending: boolean = false;
  private queue: Item[] = [];

  constructor(config?: Config) {
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
      queueObject.retry = Number(this.config.maxRetries) >= 0 ? Number(this.config.maxRetries) : queueObject.retry;
      queueObject.timestamp = Date.now() + this.size;
      this.queue.push(queueObject);
      this.queue.sort(this.config.comparator);
      this.run();
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

  private resolveItems(): void {
    const queueObject = this.first;
    if (!queueObject) {
      return;
    }

    /* tslint:disable:no-floating-promises */
    Promise.resolve(queueObject.fn())
      .then((result: any) => {
        return {shouldContinue: true, wrappedResolve: () => queueObject.resolve(result)};
      })
      .catch((error: Error) => {
        if (queueObject.retry > 0) {
          queueObject.retry -= 1;
          // TODO: Implement configurable reconnection delay (and reconnection delay growth factor)
          setTimeout(() => this.resolveItems(), this.config.retryDelay || 1000);
          return {shouldContinue: false};
        } else {
          queueObject.reject(error);
          return {shouldContinue: true};
        }
      })
      .then(({shouldContinue, wrappedResolve}: {shouldContinue: boolean; wrappedResolve?: Function}) => {
        if (shouldContinue) {
          if (wrappedResolve) {
            wrappedResolve();
          }
          this.isPending = false;
          this.queue.shift();
          this.resolveItems();
        }
      });
    /* tslint:enable:no-floating-promises */
  }

  private run(): void {
    if (!this.isPending && this.first) {
      this.isPending = true;
      this.resolveItems();
    }
  }

  public toString(): string {
    return this.queue
      .map((item: Item, index: number) => {
        return `"${index}": ${item.fn.toString().replace(/(\r\n|\n|\r|\s+)/gm, '')}`;
      })
      .join('\r\n');
  }
}
