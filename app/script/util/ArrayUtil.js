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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.ArrayUtil = {
  chunk(array, size) {
    const chunks = [];
    const temp_array = Array.from(array);
    while (temp_array.length) {
      chunks.push(temp_array.splice(0, size));
    }
    return chunks;
  },
  find_closest(array, value) {
    let closest = array[0];

    array.forEach(function(current) {
      if (value >= current) {
        closest = current;
      }
    });

    return closest;
  },
  get_next_item(array, current_item, filter) {
    const current_index = array.indexOf(current_item);

    // couldn't find the item
    if (current_index === -1) {
      return null;
    }

    const next_index = current_index + 1;

    // item is last item in the array
    if ((next_index === array.length) && (current_index > 0)) {
      return array[current_index - 1];
    }

    if (next_index >= array.length) {
      return undefined;
    }

    for (let index = next_index; index <= array.length; index++) {
      const next_item = array[index];
      if ((typeof filter !== 'function') || !!filter(next_item)) {
        return next_item;
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
  interpolate(array, length) {
    const new_array = [];
    const scale_factor = (array.length - 1) / (length - 1);

    new_array[0] = array[0];
    new_array[length - 1] = array[array.length - 1];

    for (let index = 1; index < length - 1; index++) {
      const original_index = index * scale_factor;
      const before = Math.floor(original_index).toFixed();
      const after = Math.ceil(original_index).toFixed();
      const point = original_index - before;
      new_array[index] = array[before] + ((array[after] - array[before]) * point); // linear interpolation
    }

    return new_array;
  },
  is_last_item(array, item) {
    return array.indexOf(item) === (array.length - 1);
  },
  iterate_index(array, current_index, reverse = false) {
    if (_.isArray(array) && array.length && _.isNumber(current_index)) {
      if (reverse) {
        if (current_index === 0) {
          return array.length - 1;
        }

        return (current_index - 1) % array.length;
      }

      return (current_index + 1) % array.length;
    }
  },
  iterate_item(array, current_item, reverse = false) {
    if (_.isArray(array) && array.length) {
      const current_index = array.indexOf(current_item);

      // If item could not be found
      if (current_index === -1) {
        return;
      }

      return array[z.util.ArrayUtil.iterate_index(array, current_index, reverse)];
    }
  },
  /**
   * Returns random element
   * @param {Array} array - source
   * @returns {Object} random element
   */
  random_element(array = []) {
    return array[Math.floor(Math.random() * array.length)];
  },
  /**
   * Remove given element from array
   * @param {Array} array - source
   * @param {Object} element - Element which should be removed
   * @returns {Array|undefined} containing the removed element
   */
  remove_element(array = [], element) {
    const index = array.indexOf(element);
    if (index > -1) {
      return array.splice(index, 1);
    }
  },
};
