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
      symbol: seconds?.symbol ?? 's',
      text: `0 ${seconds?.plural}`,
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
  const hasHours = hours?.value ?? 0 > 0;
  const validUnitStrings = [];
  for (let index = 0; index < mappedUnits.length; index++) {
    const unit = mappedUnits[index];
    if (unit === hours && hasHours) {
      validUnitStrings.push(`${zeroPadding(hours.value)}:${zeroPadding(minutes?.value ?? 0)}`);
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
export const isYoungerThanMinute = (date: FnDate): boolean => differenceInMinutes(new Date(), date) < 1;
export const isYoungerThan1Hour = (date: FnDate) => differenceInHours(new Date(), date) < 1;
export const isYoungerThan7Days = (date: FnDate) => differenceInDays(new Date(), date) < 7;

export const fromNowLocale = (date: FnDate) => formatDistanceToNow(date, {addSuffix: true, locale});

export {isToday, fromUnixTime, isYesterday, isSameDay, isSameMonth, isThisYear, differenceInHours, differenceInMinutes};

/**
 * Returns a number of weeks elapsed since the given date.
 * Should be read as passed less than 1 week ago, passed less than 2 weeks ago, etc.
 * @param date date to compare with
 * @returns number of weeks passed since the given date
 */
export const weeksPassedSinceDate = (date: Date): number => {
  const now = new Date();

  const diff = now.getTime() - date.getTime();
  const diffInWeeks = diff / TIME_IN_MILLIS.WEEK;

  return Math.max(1, Math.ceil(diffInWeeks));
};

export const formatDelayTime = (delayTimeInMS: number): string => {
  if (delayTimeInMS >= TIME_IN_MILLIS.WEEK) {
    const weeks = Math.floor(delayTimeInMS / TIME_IN_MILLIS.WEEK);
    return `${weeks} ${t(`ephemeralUnitsWeek${weeks === 1 ? '' : 's'}`)}`;
  } else if (delayTimeInMS >= TIME_IN_MILLIS.DAY) {
    const days = Math.floor(delayTimeInMS / TIME_IN_MILLIS.DAY);
    return `${days} ${t(`ephemeralUnitsDay${days === 1 ? '' : 's'}`)}`;
  } else if (delayTimeInMS >= TIME_IN_MILLIS.HOUR) {
    const hours = Math.floor(delayTimeInMS / TIME_IN_MILLIS.HOUR);
    return `${hours} ${t(`ephemeralUnitsHour${hours === 1 ? '' : 's'}`)}`;
  } else if (delayTimeInMS >= TIME_IN_MILLIS.MINUTE) {
    const minutes = Math.floor(delayTimeInMS / TIME_IN_MILLIS.MINUTE);
    return `${minutes} ${t(`ephemeralUnitsMinute${minutes === 1 ? '' : 's'}`)}`;
  }

  const seconds = Math.floor(delayTimeInMS / TIME_IN_MILLIS.SECOND);
  return `${seconds} ${t(`ephemeralUnitsSecond${seconds === 1 ? '' : 's'}`)}`;
};

/**
 * Format duration into a coarse, human-readable unit:
 * update the comments:
 * - > 1 day   → "Loading messages from the last X days"
 * - > 24H     → "Loading messages from the last 1 day"
 * - > 1 hour  → "Loading messages from the last X hours"
 * - > 60 min  → "Loading messages from the last 1 hour"
 * - > 1 min   → "Loading messages from the last X minutes"
 * - > 60 sec  → "Loading messages from the last 1 minute"
 *
 * @param duration - Duration in milliseconds
 * @returns Localized string of the coarsest applicable unit
 */
export const formatCoarseDuration = (duration: number) => {
  if (duration >= TIME_IN_MILLIS.DAY) {
    const days = Math.floor(duration / TIME_IN_MILLIS.DAY);
    return t(`initProgressDays${days === 1 ? 'Singular' : 'Plural'}`, {time: days});
  }

  if (duration >= TIME_IN_MILLIS.HOUR) {
    const hours = Math.floor(duration / TIME_IN_MILLIS.HOUR);
    return t(`initProgressHours${hours === 1 ? 'Singular' : 'Plural'}`, {time: hours});
  }

  const minutes = Math.max(1, Math.floor(duration / TIME_IN_MILLIS.MINUTE));
  return t(`initProgressMinutes${minutes === 1 ? 'Singular' : 'Plural'}`, {time: minutes});
};

/**
 * Returns the duration in milliseconds from the given date to the current time.
 *
 * @example
 * ```ts
 * const startedAt = "2025-06-01T00:00:00Z";
 * const elapsed = durationFrom(startedAt); // e.g. 2592000000 (30 days in ms)
 * formatDuration(elapsed);                // e.g. "1 month"
 * ```
 *
 * @param date - The past date to compare (Date or timestamp).
 * @returns Duration in milliseconds between now and the given date.
 */
export const durationFrom = (date: Date | number | string) => Date.now() - new Date(date).getTime();

/**
 * Calculate the number of days between two dates
 */
export const calculateDaysDifference = (date1: Date, date2: Date): number => {
  const day1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const day2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((day1.getTime() - day2.getTime()) / TIME_IN_MILLIS.DAY);
};

/**
 * Get the day prefix for a version based on days difference
 */
export const getDayPrefix = (daysDiff: number, timestamp: number): string => {
  if (daysDiff === 0) {
    return t('fileHistoryModal.today');
  }
  if (daysDiff === 1) {
    return t('fileHistoryModal.yesterday');
  }
  return new Intl.DateTimeFormat(navigator.language, {
    weekday: 'long',
  }).format(timestamp);
};

/**
 * Format a date key for grouping file versions
 */
export const formatDateKey = (timestamp: number, dayPrefix: string): string => {
  const formattedDate = new Intl.DateTimeFormat(navigator.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(timestamp);
  return `${dayPrefix}, ${formattedDate}`;
};

/**
 * Format time from timestamp
 */
export const formatTime = (timestamp: number): string => {
  return new Intl.DateTimeFormat(navigator.language, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
};
