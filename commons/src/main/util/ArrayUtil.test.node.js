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

const {ArrayUtil} = require('@wireapp/commons');

describe('ArrayUtil', () => {
  describe('"getDifference"', () => {
    it('returns items which are different in the source array.', () => {
      const source = ['Tick', 'Trick', 'Track'];
      const comparative = ['Flic', 'Flac', 'Track'];
      expect(ArrayUtil.getDifference(source, comparative)).toEqual(['Tick', 'Trick']);
    });
  });

  describe('"getIntersection"', () => {
    it('returns items which two arrays have in common.', () => {
      const array1 = ['Ape', 'Bear', 'Dodo'];
      const array2 = ['Antelope', 'Bear', 'Chameleon', 'Dodo'];
      expect(ArrayUtil.getIntersection(array1, array2)).toEqual(['Bear', 'Dodo']);
    });

    it('returns an empty array when there is no intersection.', () => {
      const array1 = ['Ape', 'Bear', 'Dodo'];
      const array2 = ['San Francisco', 'London'];
      expect(ArrayUtil.getIntersection(array1, array2)).toEqual([]);
    });

    it('works with arrays of numbers.', () => {
      const array1 = [1, 3, 3, 7];
      const array2 = [1, 4, 4, 7];
      expect(ArrayUtil.getIntersection(array1, array2)).toEqual([1, 7]);
    });

    it('breaks if being used with non-array types.', () => {
      const array = [1, 3, 3, 7];
      const notAnArray = 1447;
      expect(() => ArrayUtil.getIntersection(array, notAnArray)).toThrowError(Error);
    });
  });

  describe('"getDeduplicatedUnion"', () => {
    it('returns deduplicated items from the union of two arrays.', () => {
      const array1 = ['Tick', 'Trick', 'Track'];
      const array2 = ['Flic', 'Flac', 'Track'];
      expect(ArrayUtil.getDeduplicatedUnion(array1, array2)).toEqual(['Tick', 'Trick', 'Track', 'Flic', 'Flac']);
    });
  });

  describe('"removeDuplicates"', () => {
    it('removes duplicated items from an array.', () => {
      const array = ['A', 'B', 'B', 'A'];
      expect(ArrayUtil.removeDuplicates(array)).toEqual(['A', 'B']);
    });

    it('works with arrays of numbers.', () => {
      const array = [1, 3, 3, 7];
      expect(ArrayUtil.removeDuplicates(array)).toEqual([1, 3, 7]);
    });

    it('works with strings.', () => {
      const string = 'Houdini';
      expect(ArrayUtil.removeDuplicates(string)).toEqual(['H', 'o', 'u', 'd', 'i', 'n']);
    });

    it('is case sensitive.', () => {
      const array = ['T', 'o', 't', 'o'];
      expect(ArrayUtil.removeDuplicates(array)).toEqual(['T', 'o', 't']);
    });
  });
});
