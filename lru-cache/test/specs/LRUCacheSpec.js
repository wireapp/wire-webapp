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
  const {LRUCache} = require('../../dist/commonjs/LRUCache');

  describe('"constructor"', () => {
    it('sets a default capacity', () => {
      const cache = new LRUCache();
      expect(cache.capacity).toBe(100);
    });
  });

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

    it('does not do anything when the key is not found', () => {
      const cache = new LRUCache(3);
      expect(cache.delete('invalid-key')).toBe(false);
    });
  });

  describe('"deleteAll"', () => {
    it('deletes all keys', () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      cache.deleteAll();
      expect(cache.size()).toBe(0);
      expect(cache.keys()).toEqual([]);
    });

    it('deletes a Node and continues with normal operation', () => {
      const cache = new LRUCache(3);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      cache.deleteAll();
      expect(cache.size()).toBe(0);
      cache.set('4', 'Plum');
      expect(cache.size()).toBe(1);
      cache.set('5', 'Banana');
      expect(cache.size()).toBe(2);
    });
  });

  describe('"get"', () => {
    it('returns "undefined" if a value is not available', () => {
      const cache = new LRUCache(3);
      const value = cache.get('not-existing');
      expect(value).toBe(undefined);
    });
  });

  describe('"getAll"', () => {
    it('gets all nodes', () => {
      const cache = new LRUCache(4);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      expect(cache.getAll()).toEqual({'1': 'Apple', '2': 'Orange'});
    });

    it('iterates over the keys', () => {
      const cache = new LRUCache(4);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      cache.set('4', 'Plum');

      const nodes = cache.getAll();

      for (const key in nodes) {
        expect(key).toBeDefined();
      }
    });
  });

  describe('"iterator"', () => {
    it('iterates over the values', () => {
      const cache = new LRUCache(4);
      cache.set('1', 'Apple');
      cache.set('2', 'Orange');
      cache.set('3', 'Tomato');
      cache.set('4', 'Plum');

      for (const value of cache) {
        expect(value).toBeDefined();
      }

      expect([...cache].length).toBe(4);
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

    it('does not do anything when the key is not found', () => {
      const cache = new LRUCache(3);
      expect(cache.latest()).toBeNull();
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

    it('does not do anything when the key is not found', () => {
      const cache = new LRUCache(3);
      expect(cache.oldest()).toBeNull();
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
      const removedValue = cache.set('4', 'Plum');
      expect(removedValue).toBe('Apple');
    });

    it('overrides existing values', () => {
      const cache = new LRUCache(3);
      const key = 'lang';
      cache.set(key, 'Java');
      const removedValue = cache.set(key, 'JavaScript');
      expect(removedValue).toBe('Java');
      expect(cache.size()).toBe(1);
    });

    it('properly sets head and tail when overriding values', () => {
      const cache = new LRUCache(5);
      cache.set('A', 'Apple');
      cache.set('B', 'Banana');
      cache.set('C', 'Citron');
      cache.set('D', 'Durian');
      cache.set('E', 'Elderberry');

      expect(cache.size()).toBe(5);
      expect(cache.latest()).toBe('Elderberry');

      const removedValue = cache.set('C', 'Cucumber');

      expect(removedValue).toBe('Citron');
      expect(cache.size()).toBe(5);
      expect(cache.latest()).toBe('Cucumber');
      expect(cache.oldest()).toBe('Apple');
    });

    it('assigns head and tail properly if there is only one node', () => {
      const value = 'Apple';
      const cache = new LRUCache(1);
      cache.set('A', value);
      expect(cache.size()).toBe(1);
      expect(cache.latest()).toBe(value);
      expect(cache.oldest()).toBe(value);
    });

    it('handles states where there is no capacity', () => {
      const cache = new LRUCache(0);
      cache.set('A', 'Apple');
      expect(cache.size()).toBe(0);
    });
  });

  describe('"toString"', () => {
    it('returns a printable text', () => {
      const cache = new LRUCache(3);
      cache.set('A', 'Apple');
      cache.set('B', 'Banana');
      cache.set('C', 'Citron');
      const text = cache.toString();
      const expected = '(newest) C:Citron > B:Banana > A:Apple (oldest)';
      expect(text).toBe(expected);
    });
  });
});
