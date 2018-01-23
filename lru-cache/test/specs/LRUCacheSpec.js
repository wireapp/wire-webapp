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

/* eslint no-magic-numbers: "off" */

describe('LRUCache', () => {
  const LRUCache = require('../../dist/commonjs/LRUCache').default;

  describe('"delete"', () => {
    it('keeps the list order intact when deleting', () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      cache.delete('2');
      expect(cache.size()).toBe(2);
      expect(cache.keys()).toEqual(['3', '1']);
    });

    it('deletes a Node and continues with normal operation', () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      const success = cache.delete('1');
      expect(success).toBe(true);
      expect(cache.size()).toBe(2);
      cache.set('4', 'Plum');
      expect(cache.size()).toBe(3);
      cache.set('5', 'Banana');
      expect(cache.size()).toBe(3);
    });
  });

  describe('"oldest"', () => {
    it("returns the Node's value which was added first", () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      expect(cache.oldest()).toBe('Apple');
    });
  });

  describe('"keys"', () => {
    it('lists all keys of the cache starting with the latest item in the cache', () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      expect(cache.keys()).toEqual(['3', '2', '1']);
    });
  });

  describe('"latest"', () => {
    it("returns the Node's value which was added last", () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      expect(cache.latest()).toBe('Tomato');
    });
  });

  describe('"set"', () => {
    it('removes the oldest Node if no space available', () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      cache.get('1');
      cache.set('4', 'Plum');
      expect(cache.size()).toBe(3);
      expect(cache.keys()).toEqual(['4', '1', '3']);
    });

    it("returns the removed Node's value if no space available in the cache", () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Tomato');
      cache.set('3', 'Orange');
      const removedNode = cache.set('4', 'Plum');
      expect(removedNode).toBe('Apple');
    });
  });
});
