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

import {chunk, getNextItem, interpolate, isLastItem, iterateIndex, uniquify, flatten, partition} from 'Util/ArrayUtil';

describe('ArrayUtil', () => {
  describe('chunk', () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('returns one chunk with all items when the size is bigger than the array', () => {
      const actual = chunk(array, 10);

      expect(actual.length).toBe(1);
      expect(actual[0].length).toBe(10);
      expect(actual[0][0]).toBe(1);
      expect(actual[0][9]).toBe(10);
    });

    it('returns the correct chunks', () => {
      const actual = chunk(array, 3);

      expect(actual.length).toBe(4);
      expect(actual[0].length).toBe(3);
      expect(actual[1].length).toBe(3);
      expect(actual[2].length).toBe(3);
      expect(actual[3].length).toBe(1);
    });

    it('does not effect the original array', () => {
      const actual = chunk(array, 3);

      expect(actual.length).toBe(4);
      expect(actual[0].length).toBe(3);
      expect(actual[1].length).toBe(3);
      expect(actual[2].length).toBe(3);
      expect(actual[3].length).toBe(1);
      expect(array.length).toBe(10);
    });
  });

  describe('getNextItem', () => {
    const firstItem = 'a';
    const secondItem = 'b';
    const thirdItem = 'c';
    const unknownItem = 'd';
    const array = [firstItem, secondItem, thirdItem];

    it('returns the second item when first item was given', () => {
      expect(getNextItem(array, firstItem)).toEqual(secondItem);
    });

    it('returns the second item when last item was given', () => {
      expect(getNextItem(array, thirdItem)).toEqual(secondItem);
    });

    it('returns undefined when item is not in the array', () => {
      expect(getNextItem(array, unknownItem)).toBeUndefined();
    });
  });

  describe('interpolate', () => {
    it('interpolates arrays with bigger lengths', () => {
      expect(interpolate([1, 5, 3], 5)).toEqual([1, 3, 5, 4, 3]);
      expect(interpolate([1, 3, 5, 4, 3], 3)).toEqual([1, 5, 3]);
    });

    it('keeps the first and the last value', () => {
      const interpolated_array = interpolate([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);

      expect(interpolated_array[0]).toEqual(0);
      expect(interpolated_array[interpolated_array.length - 1]).toEqual(9);
    });
  });

  describe('isLastItem', () => {
    const firstItem = 'a';
    const secondItem = 'b';
    const thirdItem = 'c';
    const unknownItem = 'd';
    const array = [firstItem, secondItem, thirdItem];

    it('returns true for the last item', () => {
      expect(isLastItem(array, thirdItem)).toBeTruthy();
    });

    it('returns false for any item that is not the last', () => {
      expect(isLastItem(array, firstItem)).toBeFalsy();
      expect(isLastItem(array, secondItem)).toBeFalsy();
    });

    it('returns false for an item that is not in the array', () => {
      expect(isLastItem(array, unknownItem)).toBeFalsy();
    });
  });

  describe('iterateIndex', () => {
    it('returns undefined in case of wrong input parameters', () => {
      expect(iterateIndex('Test', 0)).toBe(undefined);
      expect(iterateIndex([1, 2, 3], 'Test')).toBe(undefined);
      expect(iterateIndex([], 0)).toBe(undefined);
    });

    it('iterates through the array index', () => {
      const array = [1, 2, 3, 4, 5];

      expect(iterateIndex(array, 0)).toBe(1);
      expect(iterateIndex(array, 1)).toBe(2);
      expect(iterateIndex(array, 2)).toBe(3);
      expect(iterateIndex(array, 3)).toBe(4);
      expect(iterateIndex(array, 4)).toBe(0);
    });
  });

  describe('uniquify', () => {
    it('returns an array with unique elements of the input array', () => {
      const numberArray = [1, 2, 3, 1, 4, 5, 5, 6];
      const stringArray = ['abc', 'def', 'ghi', 'abc', 'jkl', 'mno', 'mno', 'pqr'];

      expect(uniquify(numberArray)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(uniquify(stringArray)).toEqual(['abc', 'def', 'ghi', 'jkl', 'mno', 'pqr']);
    });
  });

  describe('flatten', () => {
    it('returns a flattened array', () => {
      const arrays = [
        [1, 2, 3],
        [4, 5, 6],
      ];

      expect(flatten(arrays)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('partition', () => {
    it('returns a correctly partitioned array', () => {
      const array = [3, 6, 5, 1, 2, 4];
      const isOdd = input => input % 2 === 1;
      const isLessThanTen = input => input < 10;

      expect(partition(array, isOdd)).toEqual([
        [3, 5, 1],
        [6, 2, 4],
      ]);

      expect(partition(array, isLessThanTen)).toEqual([[3, 6, 5, 1, 2, 4], []]);
    });
  });
});
