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

z.util.Statistics = {
  /**
   * Calculates the average of all values within an array.
   * @param {Array<number>} values - Input values
   * @returns {number} Average value
   */
  average: function(values) {
    return (z.util.Statistics.sum(values) / values.length).toFixed(2);
  },
  /**
   * Calculates the standard deviation within an array.
   * @param {Array<number>} values - Input values
   * @param {number} [average] - Average value
   * @returns {undefined} Standard deviation
   */
  standardDeviation: function(values, average) {
    if (!average) {
      average = z.util.Statistics.average(values);
    }

    const squared_deviations = values.map(value => {
      const deviation = value - average;
      return deviation * deviation;
    });

    return Math.sqrt(z.util.Statistics.average(squared_deviations)).toFixed(2);
  },
  /**
   * Calculates the sum of all value within an array.
   * @param {Array<number>} values - Input values
   * @returns {number} Sum value
   */
  sum: function(values) {
    return values.reduce((sum, value) => {
      return sum + value;
    }, 0);
  },
};
