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

import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  format,
  formatDistanceToNow,
  fromUnixTime,
  isBefore,
  isSameDay,
  isSameMonth,
  isThisYear,
  isToday,
  isYesterday,
  startOfToday,
} from 'date-fns';
import {
  cs,
  da,
  de,
  el,
  enUS,
  es,
  et,
  fi,
  fr,
  hr,
  hu,
  it,
  lt,
  nl,
  pl,
  pt,
  ro,
  ru,
  sk,
  sl,
  tr,
  uk,
} from 'date-fns/locale';

import {t} from './LocalizerUtil';
import {zeroPadding} from './util';

export type FnDate = number | Date;

interface DiscreteTimeUnit {
  longUnit: string;
  symbol: string;
  value: number;
}

export interface DurationUnit {
  symbol: string;
  text: string;
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
const locales = {cs, da, de, el, es, et, fi, fr, hr, hu, it, lt, nl, pl, pt, ro, ru, sk, sl, tr, uk};
const defaultLocale = enUS;
let locale = defaultLocale;
export type LocaleType = keyof typeof locales;
export const setDateLocale = (newLocale: LocaleType) => (locale = locales[newLocale] || defaultLocale);

export const formatLocale = (date: FnDate | string | number, formatString: string) =>
  format(new Date(date), formatString, {locale});

/**
 * Format the time as `12:00 AM`.
 * This is equivalent to momentjs' `LT` formatting
 */
export const formatTimeShort = (date: FnDate | string | number) => formatLocale(date, 'p');

/**
 * Format the date as `May 29, 2020`.
 * This is equivalent to momentjs' `LL` formatting
 */
export const formatDateShort = (date: FnDate | string | number) => formatLocale(date, 'PP');
export const formatDayMonth = (date: FnDate | string | number) =>
  formatDateShort(date)
    .replace(/[0-9]{4}/g, '')
    .replace(locale === de ? /^\s*|\s*$/g : /^\W|\W$|\W\W/, '');

/**
 * Format the date as `05/29/2020`.
 * This is equivalent to momentjs' `L` formatting
 */
export const formatDateNumeral = (date: FnDate | string | number) => formatLocale(date, 'P');
export const formatDayMonthNumeral = (date: FnDate | string | number) =>
  formatDateNumeral(date)
    .replace(/[0-9]{4}/g, '')
    .replace(locale === de ? /^\s*|\s*$/g : /^\W|\W$|\W\W/, '');

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

  if (!firstNonZeroUnit) {
    const seconds = durationUnits().pop();

    return {
      symbol: seconds.symbol,
      text: `0 ${seconds.plural}`,
      value: 0,
    };
  }

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
  return validUnitStrings.join(joiner);
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
  const time = new Date(timestamp);
  let format = 'P (HH:mm:ss)';

  if (longFormat) {
    format = isThisYear(new Date(timestamp)) ? 'eee dd MMM, HH:mm' : 'eee dd MMM yyyy, HH:mm';
  }

  return formatLocale(time, format);
};

export const getCurrentDate = () => new Date().toISOString().substring(0, 10);
export const getUnixTimestamp = () => Math.floor(Date.now() / TIME_IN_MILLIS.SECOND);
export const isBeforeToday = (date: FnDate): boolean => isBefore(date, startOfToday());
export const isYoungerThan2Minutes = (date: FnDate): boolean => differenceInMinutes(new Date(), date) < 2;
export const isYoungerThan1Hour = (date: FnDate) => differenceInHours(new Date(), date) < 1;
export const isYoungerThan7Days = (date: FnDate) => differenceInDays(new Date(), date) < 7;

export const fromNowLocale = (date: FnDate) => formatDistanceToNow(date, {addSuffix: true, locale});

export {isToday, fromUnixTime, isYesterday, isSameDay, isSameMonth, isThisYear, differenceInHours, differenceInMinutes};
