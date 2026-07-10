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

import type {Option} from '../Select';

export const TIME_INTERVAL_MINUTES = 15;
export const TIME_OPTIONS_COUNT = 96;

export const parseTimeLabel = (value: string | number): {hour24: number; minutes: number} => {
  const [timePart, periodPart] = `${value}`.trim().split(' ');
  const [hourPart, minutePart] = (Boolean(timePart) ? timePart : '').split(':');
  const hour = Number(hourPart);
  const minutes = Number(minutePart);
  const isPm = (Boolean(periodPart) ? periodPart : '').toUpperCase() === 'PM';
  let hour24 = 0;
  if (Number.isFinite(hour)) {
    hour24 = isPm ? (hour % 12) + 12 : hour % 12;
  }
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;

  return {hour24, minutes: safeMinutes};
};

export const formatTimeLabel = (hour24: number, minutes: number): string => {
  const hour12 = ((hour24 + 11) % 12) + 1;
  const period = hour24 < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const buildTimeOptions = (): Option[] =>
  Array.from({length: TIME_OPTIONS_COUNT}, (_, index) => {
    const totalMinutes = index * TIME_INTERVAL_MINUTES;
    const hour24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const label = formatTimeLabel(hour24, minutes);
    return {value: label, label};
  });

export const timeOptionFromDate = (date: Date): Option => {
  const label = formatTimeLabel(date.getHours(), date.getMinutes());
  return {value: label, label};
};

export const nearestTimeOptionFromDate = (date: Date): Option => {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const roundedMinutes = Math.round(totalMinutes / TIME_INTERVAL_MINUTES) * TIME_INTERVAL_MINUTES;
  const normalizedMinutes = Math.min(roundedMinutes, (TIME_OPTIONS_COUNT - 1) * TIME_INTERVAL_MINUTES);
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  const label = formatTimeLabel(hour24, minutes);
  return {value: label, label};
};
