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

import {PromiseQueue} from 'Util/PromiseQueue';

describe('PromiseQueue', () => {
  describe('push', () => {
    it('processes promises', async () => {
      let counter = 0;
      const result = [];

      const promiseFn = function () {
        result.push(counter++);
        return Promise.resolve();
      };

      const queue = new PromiseQueue({name: 'TestQueue'});
      queue.push(promiseFn);
      queue.push(promiseFn);

      await queue.push(promiseFn);

      expect(result).toEqual([0, 1, 2]);
    });

    it('processes promises that are added during execution', done => {
      let counter = 0;
      const result = [];

      const promise = {
        fn() {
          return new Promise(resolve => {
            window.setTimeout(() => {
              result.push(counter++);
              return resolve();
            }, 50);
          });
        },
      };

      spyOn(promise, 'fn').and.callThrough();

      const queue = new PromiseQueue({name: 'TestQueue'});
      queue.push(promise.fn);

      window.setTimeout(() => {
        queue
          .push(promise.fn)
          .then(() => {
            expect(promise.fn.calls.count()).toEqual(2);
            expect(result).toEqual([0, 1]);
            done();
          })
          .catch(done.fail);
      }, 25);
    });

    it('processes promises even when one of them rejects', () => {
      const resolvingPromise = () => Promise.resolve();

      const rejectingPromise = () => Promise.reject(new Error('Unit test error'));

      const queue = new PromiseQueue({name: 'TestQueue'});
      queue.push(rejectingPromise);
      return queue.push(resolvingPromise);
    });

    it('processes promises even when one of them times out (with retries)', () => {
      let counter = 0;

      const resolvingPromise = () => Promise.resolve(counter++);

      const timeout_promise = function () {
        return new Promise(resolve => {
          if (counter++ === 3) {
            resolve();
          }
        });
      };

      const queue = new PromiseQueue({name: 'TestQueue', timeout: 100});
      queue.push(timeout_promise);
      return queue.push(resolvingPromise);
    });
  });
});
