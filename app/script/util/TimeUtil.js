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

//@ts-check

import moment from 'moment';

/**
 * @typedef {object} DiscreteTimeUnit
 * @property {string} longUnit
 * @property {string} symbol
 * @property {number} value
 */

/**
 * @typedef {object} DurationUnit
 * @property {string} text
 * @property {string} symbol
 * @property {number} value
 */

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

  durationUnits: () => {
    return [
      {
        plural: 'ephemeralUnitsYears',
        singular: 'ephemeralUnitsYear',
        symbol: 'y',
        value: z.util.TimeUtil.UNITS_IN_MILLIS.YEAR,
      },
      {
        plural: 'ephemeralUnitsWeeks',
        singular: 'ephemeralUnitsWeek',
        symbol: 'w',
        value: z.util.TimeUtil.UNITS_IN_MILLIS.WEEK,
      },
      {
        plural: 'ephemeralUnitsDays',
        singular: 'ephemeralUnitsDay',
        symbol: 'd',
        value: z.util.TimeUtil.UNITS_IN_MILLIS.DAY,
      },
      {
        plural: 'ephemeralUnitsHours',
        singular: 'ephemeralUnitsHour',
        symbol: 'h',
        value: z.util.TimeUtil.UNITS_IN_MILLIS.HOUR,
      },
      {
        plural: 'ephemeralUnitsMinutes',
        singular: 'ephemeralUnitsMinute',
        symbol: 'm',
        value: z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE,
      },
      {
        plural: 'ephemeralUnitsSeconds',
        singular: 'ephemeralUnitsSecond',
        symbol: 's',
        value: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      },
    ];
  },

  /**
   * Format milliseconds into 15s, 2m.
   * @param {number} duration - Duration to format in milliseconds
   * @returns {DurationUnit} Unit, value and localized string
   */
  formatDuration: duration => {
    const mappedUnits = z.util.TimeUtil.mapUnits(duration, true);
    const firstNonZeroUnit = mappedUnits.find(unit => unit.value > 0);
    return {
      symbol: firstNonZeroUnit.symbol,
      text: `${firstNonZeroUnit.value} ${z.l10n.text(firstNonZeroUnit.longUnit)}`,
      value: firstNonZeroUnit.value,
    };
  },

  /**
   * Generate a human readable string of the remaining time
   * @param {number} duration - the remaining time in milliseconds
   * @returns {string} readable representation of the remaining time
   */
  formatDurationCaption: duration => {
    const mappedUnits = z.util.TimeUtil.mapUnits(duration, false);
    const hours = mappedUnits.find(unit => unit.symbol === 'h');
    const minutes = mappedUnits.find(unit => unit.symbol === 'm');
    const hasHours = hours.value > 0;
    const validUnitStrings = [];
    for (let index = 0; index < mappedUnits.length; index++) {
      const unit = mappedUnits[index];
      if (unit === hours && hasHours) {
        validUnitStrings.push(`${z.util.zeroPadding(hours.value)}:${z.util.zeroPadding(minutes.value)}`);
        break;
      }
      if (unit.value > 0) {
        validUnitStrings.push(`${unit.value} ${unit.longUnit}`);
      }
      if (validUnitStrings.length === 2) {
        break;
      }
      const nextUnit = mappedUnits[index + 1];
      if (validUnitStrings.length > 0 && nextUnit && nextUnit.value === 0) {
        break;
      }
    }
    const joiner = ` ${z.l10n.text(z.string.and)} `;
    return `${validUnitStrings.join(joiner)} ${z.l10n.text(z.string.ephemeralRemaining)}`;
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

  /**
   * Calculate the discrete time units (years, weeks, days, hours, minutes, seconds) for a given duration
   * @note Implementation based on: https://gist.github.com/deanrobertcook/7168b38150c303a2b4196216913d34c1
   * @param {number} duration - duration in milliseconds
   * @param {boolean} rounded - should the units be rounded as opposed to floored
   * @returns {DiscreteTimeUnit[]} calculated time units
   */
  mapUnits: (duration, rounded) => {
    const mappedUnits = z.util.TimeUtil.durationUnits().map((unit, index, units) => {
      let value = duration;
      if (index > 0) {
        value %= units[index - 1].value;
      }
      value /= unit.value;
      value = rounded && value >= 1 ? Math.round(value) : Math.floor(value);
      const longUnit = z.string[value === 1 ? unit.singular : unit.plural];
      return {
        longUnit,
        symbol: unit.symbol,
        value,
      };
    });
    return mappedUnits;
  },
};
