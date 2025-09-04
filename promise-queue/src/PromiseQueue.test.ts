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
  public resolve: ((value: T) => void) | undefined;
  public reject: (() => void) | undefined;
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

    it('rejects a promise if it does not resolve in time', async () => {
      jest.useFakeTimers();

      const never = () => new Promise<void>(() => {}); // never resolves
      const queue = new PromiseQueue({name: 'TestQueue', timeout: 91});

      const p = queue.push(never);

      // attach a handler immediately to avoid unhandled rejection
      const captured = p.catch(e => e);

      await jest.advanceTimersByTimeAsync(120);

      const err = await captured;
      expect(err).toBeInstanceOf(Error);
      expect(err.cause).toBe(PromiseQueue.ERROR_CAUSES.TIMEOUT);
      expect(err.message).toBe('Timeout Error: Promise did not resolve in 91ms');

      jest.useRealTimers();
    });

    it('rejects a promise if it does not resolve in time and advances to the next promise in queue', async () => {
      jest.useFakeTimers();

      const never = () => new Promise<void>(() => {}); // never resolves
      const second = jest.fn().mockResolvedValue('second-done');

      const queue = new PromiseQueue({name: 'TestQueue', timeout: 95});

      const p1 = queue.push(never).catch(e => e);

      // Push a second task that should run after the first times out
      const p2 = queue.push(second);

      await jest.advanceTimersByTimeAsync(120);

      // First promise should time out
      const err = await p1;
      expect(err).toBeInstanceOf(Error);
      expect(err.cause).toBe(PromiseQueue.ERROR_CAUSES.TIMEOUT);
      expect(err.message).toBe('Timeout Error: Promise did not resolve in 95ms');

      // Queue should have advanced and executed the second task
      await expect(p2).resolves.toBe('second-done');
      expect(second).toHaveBeenCalledTimes(1);

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

      promise.resolve?.(undefined);
      await done;
      await new Promise(res => setTimeout(res));
      expect(queue.hasRunningTasks()).toBe(false);
      expect(queue.getLength()).toBe(0);
    });
  });

  describe('flush', () => {
    it('rejects all pending tasks and prevents execution', async () => {
      const queue = new PromiseQueue({name: 'FlushQueue'});

      const runSpy = jest.fn();
      const rejectSpy = jest.fn();

      // Push a task that runs immediately
      await queue.push(() => Promise.resolve());

      let err1: Error = new Error();
      let err2: Error = new Error();

      // Push pending tasks
      const p1 = queue
        .push(() => {
          runSpy();
          return Promise.resolve('Task 1 completed');
        })
        .catch(error => {
          rejectSpy();
          err1 = error;
          throw error;
        });

      const p2 = queue
        .push(() => {
          runSpy();
          return Promise.resolve('Task 2 completed');
        })
        .catch(error => {
          rejectSpy();
          err2 = error;
          throw error;
        });

      queue.flush();

      await expect(p1).rejects.toThrow('Queue was flushed');
      await expect(p2).rejects.toThrow('Queue was flushed');

      // check error cause
      expect(err1?.cause).toBe(PromiseQueue.ERROR_CAUSES.FLUSHED);
      expect(err2?.cause).toBe(PromiseQueue.ERROR_CAUSES.FLUSHED);

      expect(runSpy).not.toHaveBeenCalled();
      expect(rejectSpy).toHaveBeenCalledTimes(2);
    });

    it('does not cancel a currently running task', async () => {
      const queue = new PromiseQueue({name: 'FlushQueue'});

      const started = new Deferred();
      const unblock = new Deferred();
      const finished: string[] = [];

      const runningTask = async () => {
        started.resolve?.(undefined); // Signal start
        await unblock.promise;
        finished.push('running');
      };

      const pendingTask = async () => {
        finished.push('pending');
      };

      void queue.push(runningTask);
      await started.promise;

      // Add a task that should be flushed
      void queue.push(pendingTask).catch(() => {
        finished.push('flushed');
      });

      queue.flush();

      unblock.resolve?.(undefined);

      await new Promise(res => setTimeout(res, 0)); // allow queue to flush execution
      expect(finished).toEqual(['flushed', 'running']);
    });

    it('leaves queue empty after flush', () => {
      const queue = new PromiseQueue({name: 'FlushQueue'});

      void queue.push(() => Promise.resolve()).catch(() => {});
      void queue.push(() => Promise.resolve()).catch(() => {});

      queue.flush();

      expect(queue.getLength()).toBe(0);
    });
  });

  describe('stack safety', () => {
    jest.setTimeout(30000);

    // This test would overflow with synchronous recursion in execute()
    // because it would re-enter execute() ~N times on the same call stack.
    // With microtask/macrotask handoff, the stack stays flat.
    it('processes very long queues without call stack overflow', async () => {
      const N = 100_000; // large enough to blow typical V8 stacks if recursion is sync
      const queue = new PromiseQueue({name: 'HugeQueue', concurrent: 1, timeout: 10_000, paused: true});

      let ran = 0;
      const task = async () => {
        ran++;
      };

      for (let i = 0; i < N; i++) {
        void queue.push(task);
      }

      queue.resume();

      // Push a sentinel task and await it: when it resolves,
      // all previous tasks must have completed.
      await queue.push(() => Promise.resolve('sentinel'));

      expect(ran).toBe(N);
    });
  });
});
