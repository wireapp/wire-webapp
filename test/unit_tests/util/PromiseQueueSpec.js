/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:util/PromiseQueue

'use strict';

describe('PromiseQueue', function() {
  describe('push', function() {
    it('should process promises', function(done) {
      let counter = 0;
      const result = [];

      const promise_fn = function() {
        result.push(counter++);
        return Promise.resolve();
      };

      const queue = new z.util.PromiseQueue();
      queue.push(promise_fn);
      queue.push(promise_fn);
      queue
        .push(promise_fn)
        .then(function() {
          expect(result).toEqual([0, 1, 2]);
          done();
        })
        .catch(done.fail);
    });

    it('should process promises that are added during execution', function(done) {
      let counter = 0;
      const result = [];

      const promise = {
        fn() {
          return new Promise(function(resolve) {
            window.setTimeout(function() {
              result.push(counter++);
              return resolve();
            }, 50);
          });
        },
      };

      spyOn(promise, 'fn').and.callThrough();

      const queue = new z.util.PromiseQueue();
      queue.push(promise.fn);

      window.setTimeout(function() {
        queue
          .push(promise.fn)
          .then(function() {
            expect(promise.fn.calls.count()).toEqual(2);
            expect(result).toEqual([0, 1]);
            done();
          })
          .catch(done.fail);
      }, 25);
    });

    it('should process promises even when one of them rejects', function(done) {
      const resolving_promise = () => Promise.resolve();

      const rejecting_promise = () => Promise.reject(new Error('Unit test error'));

      const queue = new z.util.PromiseQueue();
      queue.push(rejecting_promise);
      queue.push(resolving_promise).then(done).catch(done.fail);
    });

    it('should process promises even when one of them times out (with retries)', function(done) {
      let counter = 0;

      const resolving_promise = () => Promise.resolve(counter++);

      const timeout_promise = function() {
        return new Promise(function(resolve) {
          if (counter++ === 3) {
            resolve();
          }
        });
      };

      const queue = new z.util.PromiseQueue({timeout: 100});
      queue.push(timeout_promise);
      queue.push(resolving_promise).then(done).catch(done.fail);
    });
  });
});
