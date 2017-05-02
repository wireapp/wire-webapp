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
  get_next_item(array, item, filter) {
    const index = array.indexOf(item);
    const next_index = index + 1;

    // couldn't find the item
    if (index === -1) {
      return null;
    }

    // item is last item in the array
    if ((next_index === array.length) && (index > 0)) {
      return array[index - 1];
    }

    if (next_index >= array.length) {
      return undefined;
    }

    for (let idx = next_index; idx <= array.length; idx++) {
      const current_item = array[idx];
      if ((typeof filter !== 'function') || !!filter(current_item)) {
        return current_item;
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
  iterate_index(array, current_index) {
    if (!_.isArray(array) || !_.isNumber(current_index)) {
      return undefined;
    }

    if (!array.length) {
      return undefined;
    }

    return (current_index + 1) % array.length;
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
