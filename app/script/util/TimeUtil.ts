interface Window {
  z: any;
}

declare const moment: any;

window.z = window.z || {};
window.z.util = window.z.util || {};

window.z.util.TimeUtil = {
  UNITS_IN_MILLIS: {
    DAY: 1000 * 60 * 60 * 24,
    HOUR: 1000 * 60 * 60,
    MINUTE: 1000 * 60,
    SECOND: 1000,
    WEEK: 1000 * 60 * 60 * 24 * 7,
    YEAR: 1000 * 60 * 60 * 24 * 365,
  },
  adjustCurrentTimestamp: function (timeOffset: number) {
    timeOffset = (typeof timeOffset === 'number') ? timeOffset : 0;
    return Date.now() - timeOffset;
  },
  durationUnits: () => {
    return [
      {
        plural: 'ephemeralUnitsYears',
        singular: 'ephemeralUnitsYear',
        symbol: 'y',
        value: window.z.util.TimeUtil.UNITS_IN_MILLIS.YEAR,
      },
      {
        plural: 'ephemeralUnitsWeeks',
        singular: 'ephemeralUnitsWeek',
        symbol: 'w',
        value: window.z.util.TimeUtil.UNITS_IN_MILLIS.WEEK,
      },
      {
        plural: 'ephemeralUnitsDays',
        singular: 'ephemeralUnitsDay',
        symbol: 'd',
        value: window.z.util.TimeUtil.UNITS_IN_MILLIS.DAY,
      },
      {
        plural: 'ephemeralUnitsHours',
        singular: 'ephemeralUnitsHour',
        symbol: 'h',
        value: window.z.util.TimeUtil.UNITS_IN_MILLIS.HOUR,
      },
      {
        plural: 'ephemeralUnitsMinutes',
        singular: 'ephemeralUnitsMinute',
        symbol: 'm',
        value: window.z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE,
      },
      {
        plural: 'ephemeralUnitsSeconds',
        singular: 'ephemeralUnitsSecond',
        symbol: 's',
        value: window.z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      },
    ];
  },
  /**
   * Format milliseconds into 15s, 2m.
   * @param {number} duration - Duration to format in milliseconds
   * @returns {DurationUnit} Unit, value and localized string
   */
  formatDuration: (duration: number) => {
    const mappedUnits = window.z.util.TimeUtil.mapUnits(duration, true);
    const firstNonZeroUnit = mappedUnits.find(unit => unit.value > 0);
    return {
      symbol: firstNonZeroUnit.symbol,
      text: `${firstNonZeroUnit.value} ${window.z.l10n.text(firstNonZeroUnit.longUnit)}`,
      value: firstNonZeroUnit.value,
    };
  },
  /**
   * Generate a human readable string of the remaining time
   * @param {number} duration - the remaining time in milliseconds
   * @returns {string} readable representation of the remaining time
   */
  formatDurationCaption: duration => {
    const mappedUnits = window.z.util.TimeUtil.mapUnits(duration, false);
    const hours = mappedUnits.find(unit => unit.symbol === 'h');
    const minutes = mappedUnits.find(unit => unit.symbol === 'm');
    const hasHours = hours.value > 0;
    const validUnitStrings = [];
    for (let index = 0; index < mappedUnits.length; index++) {
      const unit = mappedUnits[index];
      if (unit === hours && hasHours) {
        validUnitStrings.push(`${window.z.util.zeroPadding(hours.value)}:${window.z.util.zeroPadding(minutes.value)}`);
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
    const joiner = ` ${window.z.l10n.text(window.z.string.and)} `;
    return `${validUnitStrings.join(joiner)} ${window.z.l10n.text(window.z.string.ephemeralRemaining)}`;
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

    const components = [window.z.util.zeroPadding(minutes), window.z.util.zeroPadding(seconds)];

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

  getUnixTimestamp: () => Math.floor(Date.now() / window.z.util.TimeUtil.UNITS_IN_MILLIS.SECOND),

  /**
   * Calculate the discrete time units (years, weeks, days, hours, minutes, seconds) for a given duration
   * @note Implementation based on: https://gist.github.com/deanrobertcook/7168b38150c303a2b4196216913d34c1
   * @param {number} duration - duration in milliseconds
   * @param {boolean} rounded - should the units be rounded as opposed to floored
   * @returns {DiscreteTimeUnit[]} calculated time units
   */
  mapUnits: (duration: number, rounded: boolean) => {
    const mappedUnits = window.z.util.TimeUtil.durationUnits().map((unit, index: number, units) => {
      let value = duration;
      if (index > 0) {
        value %= units[index - 1].value;
      }
      value /= unit.value;
      value = rounded && value >= 1 ? Math.round(value) : Math.floor(value);
      const longUnit = window.z.string[value === 1 ? unit.singular : unit.plural];
      return {
        longUnit,
        symbol: unit.symbol,
        value,
      };
    });
    return mappedUnits;
  },
};
