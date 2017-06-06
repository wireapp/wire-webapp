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

// grunt test_init && grunt test_run:util/ArrayUtil

'use strict';

describe('z.util.ArrayUtil', function() {
  describe('chunk', function() {
    let array = null;

    beforeEach(function() {
      array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    });

    it('returns one chunk with all items when the size is bigger than the array', function() {
      const actual = z.util.ArrayUtil.chunk(array, 10);
      expect(actual.length).toBe(1);
      expect(actual[0].length).toBe(10);
      expect(actual[0][0]).toBe(1);
      expect(actual[0][9]).toBe(10);
    });

    it('returns the correct chunks', function() {
      const actual = z.util.ArrayUtil.chunk(array, 3);
      expect(actual.length).toBe(4);
      expect(actual[0].length).toBe(3);
      expect(actual[1].length).toBe(3);
      expect(actual[2].length).toBe(3);
      expect(actual[3].length).toBe(1);
    });

    it('does not effect the original array', function() {
      const actual = z.util.ArrayUtil.chunk(array, 3);
      expect(actual.length).toBe(4);
      expect(actual[0].length).toBe(3);
      expect(actual[1].length).toBe(3);
      expect(actual[2].length).toBe(3);
      expect(actual[3].length).toBe(1);
      expect(array.length).toBe(10);
    });
  });

  describe('get_next_item', function() {
    const first_item = 'a';
    const second_item = 'b';
    const third_item = 'c';
    const unknown_item = 'd';
    const array = [first_item, second_item, third_item];
    const filter = item => item !== second_item;

    it('returns the second item when first item was given', function() {
      expect(z.util.ArrayUtil.get_next_item(array, first_item)).toEqual(
        second_item,
      );
    });

    it('returns the third item when first item was given and filter skips the second item', function() {
      expect(z.util.ArrayUtil.get_next_item(array, first_item, filter)).toEqual(
        third_item,
      );
    });

    it('returns the second item when last item was given', function() {
      expect(z.util.ArrayUtil.get_next_item(array, third_item)).toEqual(
        second_item,
      );
    });

    it('returns undefined when item is not in the array', function() {
      expect(
        z.util.ArrayUtil.get_next_item(array, unknown_item),
      ).toBeUndefined();
    });
  });

  describe('interpolate', function() {
    it('interpolates arrays with bigger lengths', function() {
      expect(z.util.ArrayUtil.interpolate([1, 5, 3], 5)).toEqual([
        1,
        3,
        5,
        4,
        3,
      ]);
      expect(z.util.ArrayUtil.interpolate([1, 3, 5, 4, 3], 3)).toEqual([
        1,
        5,
        3,
      ]);
    });

    it('keeps the first and the last value', function() {
      const interpolated_array = z.util.ArrayUtil.interpolate(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        5,
      );
      expect(interpolated_array[0]).toEqual(0);
      expect(interpolated_array[interpolated_array.length - 1]).toEqual(9);
    });
  });

  describe('is_last_item', function() {
    const first_item = 'a';
    const second_item = 'b';
    const third_item = 'c';
    const unknown_item = 'd';
    const array = [first_item, second_item, third_item];

    it('returns true for the last item', function() {
      expect(z.util.ArrayUtil.is_last_item(array, third_item)).toBeTruthy();
    });

    it('returns false for any item that is not the last', function() {
      expect(z.util.ArrayUtil.is_last_item(array, first_item)).toBeFalsy();
      expect(z.util.ArrayUtil.is_last_item(array, second_item)).toBeFalsy();
    });

    it('returns false for an item that is not in the array', function() {
      expect(z.util.ArrayUtil.is_last_item(array, unknown_item)).toBeFalsy();
    });
  });

  describe('iterate_index', function() {
    it('returns undefined in case of wrong input parameters', function() {
      expect(z.util.ArrayUtil.iterate_index('Test', 0)).toBe(undefined);
      expect(z.util.ArrayUtil.iterate_index([1, 2, 3], 'Test')).toBe(undefined);
      expect(z.util.ArrayUtil.iterate_index([], 0)).toBe(undefined);
    });

    it('iterates through the array index', function() {
      const array = [1, 2, 3, 4, 5];
      expect(z.util.ArrayUtil.iterate_index(array, 0)).toBe(1);
      expect(z.util.ArrayUtil.iterate_index(array, 1)).toBe(2);
      expect(z.util.ArrayUtil.iterate_index(array, 2)).toBe(3);
      expect(z.util.ArrayUtil.iterate_index(array, 3)).toBe(4);
      expect(z.util.ArrayUtil.iterate_index(array, 4)).toBe(0);
    });
  });
});
