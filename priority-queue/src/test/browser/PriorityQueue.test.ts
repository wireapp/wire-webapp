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

import {Item, Priority, PriorityQueue} from '@wireapp/priority-queue';

beforeAll(() => jest.setTimeout(10000));

describe('PriorityQueue', () => {
  describe('"constructor"', () => {
    it('supports a custom retry delay of 3 seconds', done => {
      let isLocked = true;

      const businessLogic = () => {
        return new Promise((resolve, reject) => {
          if (isLocked) {
            reject(new Error('Promise is locked.'));
          } else {
            resolve('Promise successfully executed.');
            done();
          }
        });
      };

      setTimeout(() => (isLocked = false), 1500);
      const queue = new PriorityQueue({maxRetries: Infinity, retryDelay: 3000});
      void queue.add(businessLogic);
    });

    it('supports limiting the amount of retries', async () => {
      const businessLogic = jest.fn().mockReturnValue(Promise.reject(new Error('Error')));
      const queue = new PriorityQueue({maxRetries: 1});
      try {
        await queue.add(businessLogic);
      } catch (error) {
      } finally {
        expect(queue.size).toBe(0);
        expect(businessLogic).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('"add"', () => {
    it('adds objects', () => {
      const queue = new PriorityQueue();

      void queue.add(() => 'ape');
      void queue.add(() => 'cat');
      void queue.add(() => 'dog');
      void queue.add(() => 'zebra');

      // When adding four items, three are in the queue and one is in progress.
      expect(queue.size).toBe(3);
    });

    it('adds objects with priorities', async () => {
      const queue = new PriorityQueue();

      void queue.add(() => 'ape');
      void queue.add(() => 'cat', Priority.LOW);
      void queue.add(() => 'dog', Priority.HIGH);
      void queue.add(() => 'zebra');

      const dog = await queue.first.fn();
      expect(dog).toBe('dog');
      const cat = await queue.last.fn();
      expect(cat).toBe('cat');
    });

    it('works with thunked Promises', async () => {
      const queue = new PriorityQueue();

      const results = await Promise.all([
        queue.add(() => Promise.resolve('ape')),
        queue.add(() => Promise.resolve('cat')),
        queue.add(() => Promise.resolve('dog')),
        queue.add(() => Promise.resolve('zebra')),
      ]);

      expect(results[0]).toBe('ape');
      expect(results[1]).toBe('cat');
      expect(results[2]).toBe('dog');
      expect(results[3]).toBe('zebra');
    });
  });

  describe('"run"', () => {
    it('executes an item from the queue', done => {
      const queue = new PriorityQueue();
      const ape = () => Promise.resolve('ape').then(done());

      void queue.add(ape);
      void queue.add(() => 'cat');
      void queue.add(() => 'dog');
      void queue.add(() => 'zebra');
    });

    it('executes an item from the queue with different priorities', done => {
      expect.assertions(3);
      const queue = new PriorityQueue();

      const promise1 = () =>
        Promise.resolve('one').then(item => {
          expect(item).toBe('one');
          return 'one';
        });

      const promise2 = () =>
        Promise.resolve('two').then(item => {
          expect(item).toBe('two');
          return 'two';
        });

      const promise3 = () =>
        Promise.resolve('three').then(item => {
          expect(item).toBe('three');
          done();
        });

      void queue.add(promise1, Priority.HIGH);
      void queue.add(promise2, Priority.MEDIUM);
      void queue.add(promise3, Priority.LOW);
    });

    it('retries on error until the error gets resolved', done => {
      let isLocked = true;

      const businessLogic = () => {
        return new Promise((resolve, reject) => {
          if (isLocked) {
            reject(new Error('Promise is locked.'));
          } else {
            resolve('Promise successfully executed.');
            done();
          }
        });
      };

      const unlock = () => {
        return new Promise<void>(resolve => {
          isLocked = false;
          resolve();
        });
      };

      const queue = new PriorityQueue({maxRetries: Infinity});
      void queue.add(businessLogic);
      setTimeout(() => queue.add(unlock, Priority.HIGH), 200);
    });

    it('works with error-catching Promises', done => {
      const queue = new PriorityQueue();
      expect.assertions(2);

      function businessLogic(param: any) {
        return new Promise((resolve, reject) => {
          if (isNaN(param)) {
            reject(new TypeError('Not a Number'));
          } else {
            resolve(param);
          }
        });
      }

      const promise1 = () =>
        businessLogic('A')
          .catch(() => businessLogic(42))
          .then(item => expect(item).toBe(42));
      const promise2 = () => Promise.resolve('two').then(item => expect(item).toBe('two'));
      const promise3 = () => Promise.resolve('three').then(() => done());

      void queue.add(promise1, Priority.HIGH);
      void queue.add(promise2, Priority.MEDIUM);
      void queue.add(promise3, Priority.LOW);
    });

    it('executes a high priority element prior to other running elements', done => {
      const queue = new PriorityQueue({maxRetries: Infinity});

      let shouldReject = true;

      const promise1 = () => Promise.resolve('one');
      const promise2 = () => {
        return shouldReject ? Promise.reject(new Error()) : Promise.resolve('two');
      };
      const promise3 = () => {
        shouldReject = false;
        done();
      };

      void queue.add(promise1);
      void queue.add(promise2);
      void queue.add(promise3, Priority.HIGH);
    });
  });

  describe('"size"', () => {
    it('returns the size of the items left after Promise execution', done => {
      let isLocked = true;

      const businessLogic = () => {
        return new Promise((resolve, reject) => {
          if (isLocked) {
            reject(new Error('Promise is locked.'));
          } else {
            resolve('Promise successfully executed.');
          }
        });
      };

      const unlock = () => {
        return new Promise<void>(resolve => {
          isLocked = false;
          resolve();
        });
      };

      const queue = new PriorityQueue({maxRetries: Infinity, retryDelay: 100});
      setTimeout(() => queue.add(unlock, Priority.HIGH), 1000);
      void queue.add(businessLogic).then(() => {
        expect(queue.size).toBe(0);
        done();
      });
    });
  });

  describe('"comparator"', () => {
    it('uses a descending priority order by default', async () => {
      const queue = new PriorityQueue();
      // prevents item processing
      queue['isRunning'] = true;

      void queue.add(() => 'ape', Priority.HIGH);
      void queue.add(() => 'cat');
      void queue.add(() => 'dog');
      void queue.add(() => 'zebra', Priority.LOW);

      const zebra = await queue.last.fn();
      expect(zebra).toBe('zebra');
      const ape = await queue.first.fn();
      expect(ape).toBe('ape');
    });

    it('supports a custom comparator', async () => {
      const ascendingPriority = (first: Item, second: Item) => first.priority - second.priority;
      const queue = new PriorityQueue({comparator: ascendingPriority});
      // prevents item processing
      queue['isRunning'] = true;

      void queue.add(() => 'ape', Priority.HIGH);
      void queue.add(() => 'cat');
      void queue.add(() => 'dog');
      void queue.add(() => 'zebra', Priority.LOW);

      const zebra = await queue.first.fn();
      expect(zebra).toBe('zebra');
      const ape = await queue.last.fn();
      expect(ape).toBe('ape');
    });

    it('continues after the maximum amount of retries', done => {
      const queue = new PriorityQueue({maxRetries: 3});

      const promise1 = () =>
        Promise.resolve('one').then(item => {
          expect(item).toBe('one');
          return 'one';
        });

      const promise2 = () => Promise.reject(new Error('two'));

      const promise3 = () =>
        Promise.resolve('three').then(item => {
          expect(item).toBe('three');
          done();
        });

      void queue.add(promise1);
      void queue.add(promise2).catch(() => {});
      void queue.add(promise3);
    });
  });
});
