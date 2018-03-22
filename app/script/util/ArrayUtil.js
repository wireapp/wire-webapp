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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.ArrayUtil = {
  chunk: (array, size) => {
    const chunks = [];
    const temporaryArray = Array.from(array);
    while (temporaryArray.length) {
      chunks.push(temporaryArray.splice(0, size));
    }
    return chunks;
  },

  findClosest: (array, value) => {
    let [closest] = array;

    array.forEach(current => {
      if (value >= current) {
        closest = current;
      }
    });

    return closest;
  },

  getNextItem: (array, currentItem, filter) => {
    const currentIndex = array.indexOf(currentItem);

    // couldn't find the item
    if (currentIndex === -1) {
      return undefined;
    }

    const nextIndex = currentIndex + 1;

    // item is last item in the array
    if (nextIndex === array.length && currentIndex > 0) {
      return array[currentIndex - 1];
    }

    if (nextIndex >= array.length) {
      return undefined;
    }

    for (let index = nextIndex; index <= array.length; index++) {
      const nextItem = array[index];
      if (typeof filter !== 'function' || !!filter(nextItem)) {
        return nextItem;
      }
    }
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
