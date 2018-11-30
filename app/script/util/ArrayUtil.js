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

import _ from 'underscore';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.ArrayUtil = {
  chunk: (array, size) => {
    const chunks = [];
    for (let index = 0, length = array.length; index < length; index += size) {
      chunks.push(array.slice(index, index + size));
    }
    return chunks;
  },

  /**
   * Gets all the values that are in array2 which are not in array1.
   *
   * @param {Array} array1 - the base array
   * @param {Array} array2 - the array to compare with
   * @returns {Array} - the array containing values in array2 that are not in array1
   */
  getDifference: (array1, array2) => {
    return array2.filter(element => !array1.includes(element));
  },

  getNextItem: (array, currentItem) => {
    const currentIndex = array.indexOf(currentItem);

    // couldn't find the item
    if (currentIndex === -1) {
      return undefined;
    }

    const nextIndex = currentIndex + 1;

    // item is last item in the array
    if (nextIndex === array.length) {
      return currentIndex > 0 ? array[currentIndex - 1] : undefined;
    }

    return array[nextIndex];
  },

  /**
   * Interpolates an array of numbers using linear interpolation
   *
   * @param {Array<any>} array - source
   * @param {number} length - new length
   * @returns {Array<any>} new array with interpolated values
   */
  interpolate: (array, length) => {
    const newArray = [];
    const scale_factor = (array.length - 1) / (length - 1);

    newArray[0] = array[0];
    newArray[length - 1] = array[array.length - 1];

    for (let index = 1; index < length - 1; index++) {
      const original_index = index * scale_factor;
      const before = Math.floor(original_index).toFixed();
      const after = Math.ceil(original_index).toFixed();
      const point = original_index - before;
      newArray[index] = array[before] + (array[after] - array[before]) * point; // linear interpolation
    }

    return newArray;
  },

  isLastItem: (array, item) => array.indexOf(item) === array.length - 1,

  iterateIndex: (array, currentIndex, reverse = false) => {
    if (_.isArray(array) && array.length && _.isNumber(currentIndex)) {
      if (reverse) {
        const isZeroIndex = currentIndex === 0;
        return isZeroIndex ? array.length - 1 : (currentIndex - 1) % array.length;
      }

      return (currentIndex + 1) % array.length;
    }
  },

  iterateItem: (array, currentItem, reverse = false) => {
    if (_.isArray(array) && array.length) {
      const currentIndex = array.indexOf(currentItem);

      // If item could not be found
      const isNegativeIndex = currentIndex === -1;
      return isNegativeIndex ? undefined : array[z.util.ArrayUtil.iterateIndex(array, currentIndex, reverse)];
    }
  },

  /**
   * Returns random element
   * @param {Array} array - source
   * @returns {Object} random element
   */
  randomElement: (array = []) => array[Math.floor(Math.random() * array.length)],

  /**
   * Remove given element from array
   * @param {Array} array - source
   * @param {Object} element - Element which should be removed
   * @returns {Array|undefined} containing the removed element
   */
  removeElement: (array = [], element) => {
    const index = array.indexOf(element);
    if (index > -1) {
      return array.splice(index, 1);
    }
  },
};
