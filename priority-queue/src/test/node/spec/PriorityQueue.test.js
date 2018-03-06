/* eslint-disable no-magic-numbers */
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

const {PriorityQueue} = require('@wireapp/priority-queue');

beforeAll(() => (jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000));

describe('PriorityQueue', () => {
  describe('"add"', () => {
    it('works with thunked Promises', done => {
      const queue = new PriorityQueue();

      Promise.all([
        queue.add(() => Promise.resolve('ape')),
        queue.add(() => Promise.resolve('bear')),
        queue.add(() => Promise.resolve('cat')),
        queue.add(() => Promise.resolve('dog')),
        queue.add(() => Promise.resolve('eagle')),
        queue.add(() => Promise.resolve('falcon')),
      ]).then(results => {
        expect(results[0]).toBe('ape');
        expect(results[1]).toBe('bear');
        expect(results[2]).toBe('cat');
        expect(results[3]).toBe('dog');
        expect(results[4]).toBe('eagle');
        expect(results[5]).toBe('falcon');
        done();
      });
    });

    it('works with thunked functions', done => {
      function happyFn() {
        return 'happy';
      }

      const queue = new PriorityQueue();
      queue.add(() => happyFn()).then(value => {
        expect(value).toBe('happy');
        done();
      });
    });

    it('works with thunked primitive values', done => {
      const queue = new PriorityQueue();

      Promise.all([
        queue.add(() => 'ape'),
        queue.add(() => 'cat'),
        queue.add(() => 'dog'),
        queue.add(() => 'zebra'),
      ]).then(results => {
        expect(results[0]).toBe('ape');
        expect(results[1]).toBe('cat');
        expect(results[2]).toBe('dog');
        expect(results[3]).toBe('zebra');
        done();
      });
    });

    it('catches throwing thunked functions', done => {
      function notHappyFn() {
        throw Error('not so happy');
      }

      const queue = new PriorityQueue();
      queue.add(() => notHappyFn()).catch(error => {
        expect(error.message).toBe('not so happy');
        done();
      });
    });
  });
});
