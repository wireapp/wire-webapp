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

import {PriorityQueue as PQType} from '../../../main';

import {PriorityQueue} from '@wireapp/priority-queue';

beforeAll(() => {
  jest.useRealTimers();
});

describe('PriorityQueue', () => {
  let queue: PQType;

  afterEach(() => {
    if (queue) {
      queue.deleteAll();
    }
  });

  describe('"add"', () => {
    it('works with thunked Promises', async () => {
      queue = new PriorityQueue();

      const results = await Promise.all([
        queue.add(() => Promise.resolve('ape')),
        queue.add(() => Promise.resolve('bear')),
        queue.add(() => Promise.resolve('cat')),
        queue.add(() => Promise.resolve('dog')),
        queue.add(() => Promise.resolve('eagle')),
        queue.add(() => Promise.resolve('falcon')),
      ]);

      expect(results[0]).toBe('ape');
      expect(results[1]).toBe('bear');
      expect(results[2]).toBe('cat');
      expect(results[3]).toBe('dog');
      expect(results[4]).toBe('eagle');
      expect(results[5]).toBe('falcon');
    });

    it('works with thunked functions', async () => {
      function happyFn() {
        return 'happy';
      }

      queue = new PriorityQueue();
      const value = await queue.add(() => happyFn());

      expect(value).toBe('happy');
    });

    it('works with thunked primitive values', async () => {
      queue = new PriorityQueue();

      const results = await Promise.all([
        queue.add(() => 'ape'),
        queue.add(() => 'cat'),
        queue.add(() => 'dog'),
        queue.add(() => 'zebra'),
      ]);

      expect(results[0]).toBe('ape');
      expect(results[1]).toBe('cat');
      expect(results[2]).toBe('dog');
      expect(results[3]).toBe('zebra');
    });

    it('catches throwing thunked functions', async () => {
      function notHappyFn() {
        throw Error('not so happy');
      }

      queue = new PriorityQueue({maxRetries: 3, retryDelay: 100});
      try {
        await queue.add(() => notHappyFn());
      } catch (error) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect((error as Error).message).toBe('not so happy');
      }
    });

    it('supports adding a label', async () => {
      const promise = new Promise<void>(resolve => setTimeout(() => resolve(), 10000));

      queue = new PriorityQueue();

      void queue.add(() => promise, 1, 'get request');
      void queue.add(() => promise, 1, 'put request');
      void queue.add(() => promise, 5, 'access token refresh');
      void queue.add(() => promise, 1, 'another get request');

      const promisesByPriority = queue.all;
      expect(promisesByPriority[0].label).toBe('access token refresh');
    }, 10000);

    it('does not retry execution with maxRetries set to 0', async () => {
      const task = jest.fn().mockReturnValue(Promise.reject(new Error('nope')));

      queue = new PriorityQueue({maxRetries: 0});
      try {
        await queue.add(task);
      } catch (error) {
      } finally {
        expect(task).toHaveBeenCalledTimes(1);
      }
    });

    it('does retry execution with maxRetries set to 1', async () => {
      const task = jest.fn().mockReturnValue(Promise.reject(new Error('nope')));

      queue = new PriorityQueue({maxRetries: 1});
      try {
        await queue.add(task);
      } catch (error) {
      } finally {
        expect(task).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('"delete"', () => {
    it("deletes a Promise from the queue by it's UUID", () => {
      const promise = new Promise<void>(resolve => setTimeout(() => resolve(), 10000));

      queue = new PriorityQueue();
      void queue.add(() => promise, 1);
      void queue.add(() => promise, 1);
      void queue.add(() => promise, 1, 'delete-me');
      void queue.add(() => promise, 1);

      // When adding four items, three are in the queue and one is in progress.
      expect(queue.all.length).toBe(3);

      queue.delete('delete-me');

      // After deleting one item, two are in the queue and one is in progress.
      expect(queue.all.length).toBe(2);
    }, 10000);
  });

  describe('"deleteAll"', () => {
    it('deletes all queued Promises', () => {
      const promise = new Promise<void>(resolve => setTimeout(() => resolve(), 10000));

      queue = new PriorityQueue();
      void queue.add(() => promise);
      void queue.add(() => promise);
      void queue.add(() => promise);

      // When adding three items, two are in the queue and one is in progress.
      expect(queue.all.length).toBe(2);

      queue.deleteAll();

      expect(queue.all.length).toBe(0);
    }, 10000);
  });

  describe('"getGrowingDelay"', () => {
    it('delay is growing exponentially', () => {
      queue = new PriorityQueue({maxRetries: 3, retryDelay: 1000, retryGrowthFactor: 1.3});
      // first try
      expect(queue['getGrowingDelay'](0)).toBe(1000);
      // one try lef
      expect(queue['getGrowingDelay'](1)).toBe(1300);
      // last try
      expect(queue['getGrowingDelay'](2)).toBe(2600);
    });

    it('does not exceed maxRetryDelay', () => {
      const config = {
        maxRetries: 3,
        maxRetryDelay: Number.MAX_SAFE_INTEGER,
        retryDelay: Number.MAX_SAFE_INTEGER + 1,
        retryGrowthFactor: 1.3,
      };
      queue = new PriorityQueue(config);

      expect(queue['getGrowingDelay'](1)).toBe(config.maxRetryDelay);
    });
  });
});
