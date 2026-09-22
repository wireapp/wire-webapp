/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {Option} from '../select';

export const TIME_INTERVAL_MINUTES = 15;
export const TIME_OPTIONS_COUNT = 96;

const HOURS_PER_HALF_DAY = 12;
const MINUTES_PER_HOUR = 60;
const TIME_LABEL_DIGITS = 2;
const TIME_LABEL_REFERENCE_YEAR = 2026;

const timeFormatterOptions: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

const getTimeFormatter = (locale: string = navigator.language): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(locale, timeFormatterOptions);

export const parseTimeLabel = (value: string | number): {hour24: number; minutes: number} => {
  const [timePart, periodPart] = `${value}`.trim().split(/\s+/);
  const [hourPart, minutePart] = (Boolean(timePart) ? timePart : '').split(':');
  const hour = Number(hourPart);
  const minutes = Number(minutePart);
  const isPm = (Boolean(periodPart) ? periodPart : '').toUpperCase() === 'PM';
  let hour24 = 0;
  if (Number.isFinite(hour)) {
    if (Boolean(periodPart)) {
      hour24 = isPm ? (hour % HOURS_PER_HALF_DAY) + HOURS_PER_HALF_DAY : hour % HOURS_PER_HALF_DAY;
    } else {
      hour24 = hour;
    }
  }
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;

  return {hour24, minutes: safeMinutes};
};

export const formatTimeLabel = (hour24: number, minutes: number, locale?: string): string => {
  const date = new Date(TIME_LABEL_REFERENCE_YEAR, 0, 1, hour24, minutes);
  return getTimeFormatter(locale)
    .format(date)
    .replace(/[\u00a0\u202f]/g, ' ');
};

export const buildTimeOptions = (locale?: string): Option[] =>
  Array.from({length: TIME_OPTIONS_COUNT}, (_value, index) => {
    const totalMinutes = index * TIME_INTERVAL_MINUTES;
    const hour24 = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    const value = `${String(hour24).padStart(TIME_LABEL_DIGITS, '0')}:${String(minutes).padStart(TIME_LABEL_DIGITS, '0')}`;
    return {value, label: formatTimeLabel(hour24, minutes, locale)};
  });

export const getTimeOptionTotalMinutes = (option: Option): number => {
  const {hour24, minutes} = parseTimeLabel(option.value);
  return hour24 * MINUTES_PER_HOUR + minutes;
};

export const filterTimeOptionsAfter = (options: Option[], minTime: Date): Option[] => {
  const minTotalMinutes = minTime.getHours() * MINUTES_PER_HOUR + minTime.getMinutes();

  return options.filter(option => getTimeOptionTotalMinutes(option) > minTotalMinutes);
};

export const timeOptionFromDate = (date: Date, locale?: string): Option => {
  const hour24 = date.getHours();
  const minutes = date.getMinutes();
  const value = `${String(hour24).padStart(TIME_LABEL_DIGITS, '0')}:${String(minutes).padStart(TIME_LABEL_DIGITS, '0')}`;
  return {value, label: formatTimeLabel(hour24, minutes, locale)};
};

export const nearestTimeOptionFromDate = (date: Date, locale?: string): Option => {
  const totalMinutes = date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
  const roundedMinutes = Math.round(totalMinutes / TIME_INTERVAL_MINUTES) * TIME_INTERVAL_MINUTES;
  const normalizedMinutes = Math.min(roundedMinutes, (TIME_OPTIONS_COUNT - 1) * TIME_INTERVAL_MINUTES);
  const hour24 = Math.floor(normalizedMinutes / MINUTES_PER_HOUR);
  const minutes = normalizedMinutes % MINUTES_PER_HOUR;
  const value = `${String(hour24).padStart(TIME_LABEL_DIGITS, '0')}:${String(minutes).padStart(TIME_LABEL_DIGITS, '0')}`;
  return {value, label: formatTimeLabel(hour24, minutes, locale)};
};
