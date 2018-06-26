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
  UNITS_IN_MILLIS: {
    DAY: 1000 * 60 * 60 * 24,
    HOUR: 1000 * 60 * 60,
    MINUTE: 1000 * 60,
    SECOND: 1000,
    WEEK: 1000 * 60 * 60 * 24 * 7,
    YEAR: 1000 * 60 * 60 * 24 * 365,
  },

  adjustCurrentTimestamp: function(timeOffset) {
    timeOffset = _.isNumber(timeOffset) ? timeOffset : 0;
    return Date.now() - timeOffset;
  },

  durationUnits: [
    {
      plural: 'ephemeralUnitsYears',
      singular: 'ephemeralUnitsYear',
      unit: 'y',
      value: z.util.TimeUtil.UNITS_IN_MILLIS.YEAR,
    },
    {
      plural: 'ephemeralUnitsWeeks',
      singular: 'ephemeralUnitsWeek',
      unit: 'w',
      value: z.util.TimeUtil.UNITS_IN_MILLIS.WEEK,
    },
    {
      plural: 'ephemeralUnitsDays',
      singular: 'ephemeralUnitsDay',
      unit: 'd',
      value: z.util.TimeUtil.UNITS_IN_MILLIS.DAY,
    },
    {
      plural: 'ephemeralUnitsHours',
      singular: 'ephemeralUnitsHour',
      unit: 'h',
      value: z.util.TimeUtil.UNITS_IN_MILLIS.HOUR,
    },
    {
      plural: 'ephemeralUnitsMinutes',
      singular: 'ephemeralUnitsMinute',
      unit: 'm',
      value: z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE,
    },
    {
      plural: 'ephemeralUnitsSeconds',
      singular: 'ephemeralUnitsSecond',
      unit: 's',
      value: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
    },
  ],

  /**
   * Format milliseconds into 15s, 2m.
   * @note Implementation based on: https://gist.github.com/deanrobertcook/7168b38150c303a2b4196216913d34c1
   * @param {number} duration - Duration to format in milliseconds
   * @param {boolean} rounded - Enables rounding of numbers
   * @param {number} maximumUnits - Maximum number of units shown in the textual representation
   * @returns {Object} Unit, value and localized string
   */
  formatDuration: (duration, rounded = true, maximumUnits = 1) => {
    const mappedUnits = z.util.TimeUtil.durationUnits.map((unit, index) => {
      let value = duration;
      if (index > 0) {
        value %= z.util.TimeUtil.durationUnits[index - 1].value;
      }
      value /= unit.value;
      value = rounded && value >= 1 ? Math.round(value) : Math.floor(value);
      const longUnit = z.string[value === 1 ? unit.singular : unit.plural];
      return {
        longUnit,
        unit: unit.unit,
        value,
      };
    });

    const firstNonZeroUnit = mappedUnits.find(unit => unit.value > 0);
    const startIndex = mappedUnits.indexOf(firstNonZeroUnit);
    const validUnits = mappedUnits.slice(startIndex, startIndex + maximumUnits);
    const longText = validUnits.map(unit => `${unit.value} ${z.l10n.text(unit.longUnit)}`).join(', ');
    const upperUnit = validUnits[0] || {};

    return {
      text: longText,
      unit: upperUnit.unit,
      value: upperUnit.value,
    };
  },

  /**
   * Format seconds into hh:mm:ss.
   * @param {number} duration - duration to format in seconds
   * @returns {string} Formatted string
   */
  formatSeconds: duration => {
    duration = Math.round(duration || 0);

    const hours = Math.floor(duration / (60 * 60));

    const divisorForMinutes = duration % (60 * 60);
    const minutes = Math.floor(divisorForMinutes / 60);

    const divisor_for_seconds = divisorForMinutes % 60;
    const seconds = Math.ceil(divisor_for_seconds);

    const components = [z.util.zeroPadding(minutes), z.util.zeroPadding(seconds)];

    if (hours > 0) {
      components.unshift(hours);
    }

    return components.join(':');
  },

  /**
   * Human readable format of a timestamp.
   * @note: Not testable due to timezones :(
   * @param {number} timestamp - Timestamp
   * @param {boolean} longFormat - True, if output should have leading numbers
   * @returns {string} Human readable format of a timestamp.
   */
  formatTimestamp: (timestamp, longFormat = true) => {
    const time = moment(timestamp);
    let format = 'DD.MM.YYYY (HH:mm:ss)';

    if (longFormat) {
      format = moment().year() === time.year() ? 'ddd D MMM, HH:mm' : 'ddd D MMM YYYY, HH:mm';
    }

    return time.format(format);
  },

  getCurrentDate: () => new Date().toISOString().substring(0, 10),

  getUnixTimestamp: () => Math.floor(Date.now() / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND),
};
