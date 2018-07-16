declare const moment: any;

interface DiscreteTimeUnit {
  longUnit: string;
  symbol: string;
  value: number;
}

interface DurationUnit {
  plural: string,
  singular: string,
  symbol: string,
  value: number,
}

interface LocalizedDurationUnit {
  symbol: string,
  text: string,
  value: number,
}

interface Window {
  z: any;
}

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
  adjustCurrentTimestamp: function (timeOffset: number): number {
    timeOffset = (typeof timeOffset === 'number') ? timeOffset : 0;
    return Date.now() - timeOffset;
  },
  durationUnits: (): DurationUnit[] => {
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
  formatDuration: (duration: number): LocalizedDurationUnit => {
    const mappedUnits = window.z.util.TimeUtil.mapUnits(duration, true);
    const firstNonZeroUnit = mappedUnits.find((unit: DiscreteTimeUnit) => {
      return unit.value > 0;
    });
    return {
      symbol: firstNonZeroUnit.symbol,
      text: `${firstNonZeroUnit.value} ${window.z.l10n.text(firstNonZeroUnit.longUnit)}`,
      value: firstNonZeroUnit.value,
    };
  },
  // Generate a human readable string of the remaining time
  formatDurationCaption: (duration: number): string => {
    const mappedUnits = window.z.util.TimeUtil.mapUnits(duration, false);
    const hours = mappedUnits.find((unit: DiscreteTimeUnit) => unit.symbol === 'h');
    const minutes = mappedUnits.find((unit: DiscreteTimeUnit) => unit.symbol === 'm');
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
  // Format seconds into hh:mm:ss.
  formatSeconds: (duration: number): string => {
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
  formatTimestamp: (timestamp: number, longFormat: boolean = true): string => {
    const time = moment(timestamp);
    let format = 'DD.MM.YYYY (HH:mm:ss)';

    if (longFormat) {
      format = moment().year() === time.year() ? 'ddd D MMM, HH:mm' : 'ddd D MMM YYYY, HH:mm';
    }

    return time.format(format);
  },

  getCurrentDate: (): string => new Date().toISOString().substring(0, 10),

  getUnixTimestamp: (): number => Math.floor(Date.now() / window.z.util.TimeUtil.UNITS_IN_MILLIS.SECOND),

  /**
   * Calculate the discrete time units (years, weeks, days, hours, minutes, seconds) for a given duration
   * @note Implementation based on: https://gist.github.com/deanrobertcook/7168b38150c303a2b4196216913d34c1
   */
  mapUnits: (duration: number, rounded: boolean): DiscreteTimeUnit[] => {
    const mappedUnits = window.z.util.TimeUtil.durationUnits().map((unit: DurationUnit, index: number, units: DurationUnit[]) => {
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
