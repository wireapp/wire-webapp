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

import {PromiseQueue} from './PromiseQueue';

class Deferred<T = undefined> {
  public resolve: (value: T) => void;
  public reject: () => void;
  public promise: Promise<T>;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

describe('PromiseQueue', () => {
  describe('push', () => {
    it('processes promises', async () => {
      let counter = 0;
      const result: number[] = [];

      const promiseFn = function () {
        result.push(counter++);
        return Promise.resolve();
      };

      const queue = new PromiseQueue({name: 'TestQueue'});
      void queue.push(promiseFn);
      void queue.push(promiseFn);

      await queue.push(promiseFn);

      expect(result).toEqual([0, 1, 2]);
    });

    it('continues to process the queue even when a prior promise rejects', async () => {
      /**
       * Prevents Jest from failing due to unhandled promise rejection.
       * Adds a catch to the promise but doesn't await its execution.
       * @see https://github.com/facebook/jest/issues/9210
       * @param {Promise} promise Promise to handle
       *
       * @returns {Promise} The handled promise
       */
      function hideUnhandledPromise(promise: Promise<unknown>) {
        promise.catch(() => {});
        return promise;
      }
      const resolvingPromiseSpy = jest.fn().mockResolvedValue(0);
      const rejectingPromise = () => Promise.reject(new Error('Unit test error'));

      const queue = new PromiseQueue({name: 'TestQueue'});
      void hideUnhandledPromise(queue.push(rejectingPromise));

      await queue.push(resolvingPromiseSpy);
      expect(resolvingPromiseSpy).toHaveBeenCalled();
    });

    // eslint-disable-next-line jest/no-done-callback
    it('processes promises even when one of them times out (with retries)', done => {
      jest.useFakeTimers();
      const resolvingPromiseSpy = jest.fn().mockImplementation(() => Promise.resolve(0));

      const timeoutPromise = function () {
        return new Promise(() => {});
      };

      const queue = new PromiseQueue({name: 'TestQueue', timeout: 100});
      void queue.push(timeoutPromise);
      void queue.push(resolvingPromiseSpy).then(() => {
        expect(resolvingPromiseSpy).toHaveBeenCalled();
        expect(queue.getLength()).toBe(0);
        done();
      });

      jest.advanceTimersByTime(120);
      jest.useRealTimers();
    });
  });

  describe('hasRunningTasks', () => {
    it('returns true if a task is running', async () => {
      const queue = new PromiseQueue({name: 'testqueue', timeout: 100});
      expect(queue.hasRunningTasks()).toBe(false);
      const promise = new Deferred();
      const done = queue.push(() => promise.promise);

      expect(queue.hasRunningTasks()).toBe(true);

      promise.resolve(undefined);
      await done;
      await new Promise(res => setTimeout(res));
      expect(queue.hasRunningTasks()).toBe(false);
      expect(queue.getLength()).toBe(0);
    });
  });
});
