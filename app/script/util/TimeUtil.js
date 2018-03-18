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

z.util.TimeUtil = {
  adjustCurrentTimestamp: function(timeOffset) {
    timeOffset = _.isNumber(timeOffset) ? timeOffset : 0;
    return Date.now() - timeOffset;
  },

  /**
   * Format seconds into 15s, 2m.
   * @param {number} duration - Duration to format in seconds
   * @returns {Object} Unit and value
   */
  formatMilliseconds: duration => {
    const seconds = Math.floor(duration / 1000);

    switch (false) {
      case !(seconds < 60):
        return {unit: 's', value: seconds};
      case !(seconds < 60 * 60):
        return {unit: 'm', value: Math.floor(seconds / 60)};
      case !(seconds < 60 * 60 * 24):
        return {unit: 'h', value: Math.floor(seconds / 60 / 60)};
      default:
        return {unit: 'd', value: Math.floor(seconds / 60 / 60 / 24)};
    }
  },
};
