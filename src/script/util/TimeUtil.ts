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

import moment from 'moment';

import {t} from './LocalizerUtil';
import {zeroPadding} from './util';

interface DiscreteTimeUnit {
  longUnit: string;
  symbol: string;
  value: number;
}

interface DurationUnit {
  text: string;
  symbol: string;
  value: number;
}

export enum TIME_IN_MILLIS {
  SECOND = 1000,
  MINUTE = SECOND * 60,
  HOUR = MINUTE * 60,
  DAY = HOUR * 24,
  WEEK = DAY * 7,
  YEAR = DAY * 365,
}

const durationUnits = () => [
  {
    plural: t('ephemeralUnitsYears'),
    singular: t('ephemeralUnitsYear'),
    symbol: 'y',
    value: TIME_IN_MILLIS.YEAR,
  },
  {
    plural: t('ephemeralUnitsWeeks'),
    singular: t('ephemeralUnitsWeek'),
    symbol: 'w',
    value: TIME_IN_MILLIS.WEEK,
  },
  {
    plural: t('ephemeralUnitsDays'),
    singular: t('ephemeralUnitsDay'),
    symbol: 'd',
    value: TIME_IN_MILLIS.DAY,
  },
  {
    plural: t('ephemeralUnitsHours'),
    singular: t('ephemeralUnitsHour'),
    symbol: 'h',
    value: TIME_IN_MILLIS.HOUR,
  },
  {
    plural: t('ephemeralUnitsMinutes'),
    singular: t('ephemeralUnitsMinute'),
    symbol: 'm',
    value: TIME_IN_MILLIS.MINUTE,
  },
  {
    plural: t('ephemeralUnitsSeconds'),
    singular: t('ephemeralUnitsSecond'),
    symbol: 's',
    value: TIME_IN_MILLIS.SECOND,
  },
];

/**
 * Calculate the discrete time units (years, weeks, days, hours, minutes, seconds) for a given duration
 * @note Implementation based on: https://gist.github.com/deanrobertcook/7168b38150c303a2b4196216913d34c1
 * @param duration duration in milliseconds
 * @param rounded should the units be rounded as opposed to floored
 * @returns calculated time units
 */
const mapUnits = (duration: number, rounded: boolean): DiscreteTimeUnit[] => {
  const mappedUnits = durationUnits().map((unit, index, units) => {
    let value = duration;
    if (index > 0) {
      value %= units[index - 1].value;
    }
    value /= unit.value;
    value = rounded && value >= 1 ? Math.round(value) : Math.floor(value);
    const longUnit = value === 1 ? unit.singular : unit.plural;
    return {
      longUnit,
      symbol: unit.symbol,
      value,
    };
  });
  return mappedUnits;
};

/**
 * Format milliseconds into 15s, 2m.
 * @param duration Duration to format in milliseconds
 * @returns Unit, value and localized string
 */
export const formatDuration = (duration: number): DurationUnit => {
  const mappedUnits = mapUnits(duration, true);
  const firstNonZeroUnit = mappedUnits.find(unit => unit.value > 0);
  return {
    symbol: firstNonZeroUnit.symbol,
    text: `${firstNonZeroUnit.value} ${firstNonZeroUnit.longUnit}`,
    value: firstNonZeroUnit.value,
  };
};

/**
 * Generate a human readable string of the remaining time
 * @param duration the remaining time in milliseconds
 * @returns readable representation of the remaining time
 */
export const formatDurationCaption = (duration: number): string => {
  const mappedUnits = mapUnits(duration, false);
  const hours = mappedUnits.find(unit => unit.symbol === 'h');
  const minutes = mappedUnits.find(unit => unit.symbol === 'm');
  const hasHours = hours.value > 0;
  const validUnitStrings = [];
  for (let index = 0; index < mappedUnits.length; index++) {
    const unit = mappedUnits[index];
    if (unit === hours && hasHours) {
      validUnitStrings.push(`${zeroPadding(hours.value)}:${zeroPadding(minutes.value)}`);
      break;
    }
    if (unit.value > 0) {
      validUnitStrings.push(`${unit.value} ${unit.longUnit}`);
    }
    if (validUnitStrings.length === 2) {
      break;
    }
    const nextUnit = mappedUnits[index + 1];
    if (validUnitStrings.length > 0 && nextUnit?.value === 0) {
      break;
    }
  }
  const joiner = ` ${t('and')} `;
  return `${validUnitStrings.join(joiner)} ${t('ephemeralRemaining')}`;
};

/**
 * Format seconds into hh:mm:ss.
 * @param duration duration to format in seconds
 * @returns Formatted string
 */
export const formatSeconds = (duration: number): string => {
  duration = Math.round(duration || 0);

  const hours = Math.floor(duration / (60 * 60));

  const divisorForMinutes = duration % (60 * 60);
  const minutes = Math.floor(divisorForMinutes / 60);

  const divisor_for_seconds = divisorForMinutes % 60;
  const seconds = Math.ceil(divisor_for_seconds);

  const components = [zeroPadding(minutes), zeroPadding(seconds)];

  if (hours > 0) {
    components.unshift(hours.toString());
  }

  return components.join(':');
};

/**
 * Human readable format of a timestamp.
 * @note: Not testable due to timezones :(
 * @param timestamp Timestamp
 * @param longFormat `true`, if output should have leading numbers
 * @returns Human readable format of a timestamp.
 */
export const formatTimestamp = (timestamp: number | string, longFormat: boolean = true): string => {
  const time = moment(timestamp);
  let format = 'L (HH:mm:ss)';

  if (longFormat) {
    format = moment().year() === time.year() ? 'ddd D MMM, HH:mm' : 'ddd D MMM YYYY, HH:mm';
  }

  return time.format(format);
};

export const getCurrentDate = () => new Date().toISOString().substring(0, 10);

export const getUnixTimestamp = () => Math.floor(Date.now() / TIME_IN_MILLIS.SECOND);
