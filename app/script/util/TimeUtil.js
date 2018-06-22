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
   * Format milliseconds into 15s, 2m.
   * @param {number} duration - Duration to format in milliseconds
   * @param {number} maximumUnits - Maximum number of units shown in the textual representation
   * @returns {Object} Unit, value and localized string
   */
  formatDuration: (duration, maximumUnits = 1) => {
    const momentDuration = moment.duration(duration);
    const units = [
      {
        plural: z.string.ephemeralUnitsYears,
        singular: z.string.ephemeralUnitsYear,
        unit: 'y',
        value: momentDuration.years(),
      },
      {
        plural: z.string.ephemeralUnitsMonths,
        singular: z.string.ephemeralUnitsMonth,
        unit: 'M',
        value: momentDuration.months(),
      },
      {
        plural: z.string.ephemeralUnitsWeeks,
        singular: z.string.ephemeralUnitsWeek,
        unit: 'w',
        value: momentDuration.weeks(),
      },
      {
        plural: z.string.ephemeralUnitsDays,
        singular: z.string.ephemeralUnitsDay,
        unit: 'd',
        value: momentDuration.days() % 7,
      },
      {
        plural: z.string.ephemeralUnitsHours,
        singular: z.string.ephemeralUnitsHour,
        unit: 'h',
        value: momentDuration.hours(),
      },
      {
        plural: z.string.ephemeralUnitsMinutes,
        singular: z.string.ephemeralUnitsMinute,
        unit: 'm',
        value: momentDuration.minutes(),
      },
      {
        plural: z.string.ephemeralUnitsSeconds,
        singular: z.string.ephemeralUnitsSecond,
        unit: 's',
        value: momentDuration.seconds(),
      },
    ];
    const validUnits = units.filter(unit => unit.value > 0).slice(0, maximumUnits);

    const longText = validUnits
      .map(unit => {
        const isSingular = unit.value === 1;
        return isSingular ? `1 ${z.l10n.text(unit.singular)}` : `${unit.value} ${z.l10n.text(unit.plural)}`;
      })
      .join(', ');

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

  getUnixTimestamp: () => Math.floor(Date.now() / 1000),
};
