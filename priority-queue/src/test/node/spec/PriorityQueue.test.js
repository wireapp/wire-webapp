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

/* eslint-disable no-magic-numbers */

const {PriorityQueue} = require('@wireapp/priority-queue');

beforeAll(() => (jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000));

describe('PriorityQueue', () => {
  let queue = undefined;

  afterEach(() => {
    if (queue) {
      queue.deleteAll();
    }
  });

  describe('"constructor"', () => {
    it('allows a configuration with zero retries', () => {
      const promise = new Promise(resolve => setTimeout(() => resolve(), Number.MAX_SAFE_INTEGER));
      queue = new PriorityQueue({maxRetries: 0});
      expect(queue.config.maxRetries).toBe(0);
      queue.add(promise);
      expect(queue.first.retry).toBe(0);
    });

    it('does not apply negative retries', () => {
      const promise = new Promise(resolve => setTimeout(() => resolve(), Number.MAX_SAFE_INTEGER));
      queue = new PriorityQueue({maxRetries: -12});
      queue.add(promise);
      expect(queue.first.retry).toBe(Infinity);
    });
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

      queue = new PriorityQueue();
      try {
        await queue.add(() => notHappyFn());
        fail();
      } catch (error) {
        expect(error.message).toBe('not so happy');
      }
    });

    it('supports adding a label', () => {
      const promise = new Promise(resolve => setTimeout(() => resolve(), Number.MAX_SAFE_INTEGER));

      queue = new PriorityQueue();
      queue.add(promise, 1, 'get request');
      queue.add(promise, 1, 'put request');
      queue.add(promise, 5, 'access token refresh');
      queue.add(promise, 1, 'another get request');

      const promisesByPriority = queue.all;
      expect(promisesByPriority[0].label).toBe('access token refresh');
    });
  });

  describe('"delete"', () => {
    it("deletes a Promise from the queue by it's UUID", () => {
      const promise = new Promise(resolve => setTimeout(() => resolve(), Number.MAX_SAFE_INTEGER));

      queue = new PriorityQueue();
      queue.add(promise, 1);
      queue.add(promise, 1);
      queue.add(promise, 1, 'delete-me');
      queue.add(promise, 1);

      expect(queue.all.length).toBe(4);

      queue.delete('delete-me');

      expect(queue.all.length).toBe(3);
    });
  });

  describe('"deleteAll"', () => {
    it('deletes all queued Promises', () => {
      const promise = new Promise(resolve => setTimeout(() => resolve(), Number.MAX_SAFE_INTEGER));

      queue = new PriorityQueue();
      queue.add(promise);
      queue.add(promise);
      queue.add(promise);

      expect(queue.all.length).toBe(3);

      queue.deleteAll();

      expect(queue.all.length).toBe(0);
    });
  });
});
