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

import {getRegionalDateLocale} from 'Util/timeUtil';

const timeFormatterOptions: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

const getTimeParts = (date: Date): Intl.DateTimeFormatPart[] =>
  new Intl.DateTimeFormat(getRegionalDateLocale(), timeFormatterOptions).formatToParts(date);

const formatTime = (parts: Intl.DateTimeFormatPart[], includeDayPeriod: boolean): string =>
  parts
    .filter(({type}) => includeDayPeriod || type !== 'dayPeriod')
    .map(({value}) => value)
    .join('')
    .trim()
    .replace(/[\u00a0\u202f]/g, ' ');

export const formatMeetingTimeRange = (start: Date, end: Date): string => {
  const startParts = getTimeParts(start);
  const endParts = getTimeParts(end);
  const startDayPeriod = startParts.find(({type}) => type === 'dayPeriod')?.value;
  const endDayPeriod = endParts.find(({type}) => type === 'dayPeriod')?.value;
  const sameDayPeriod = startDayPeriod === endDayPeriod;

  return `${formatTime(startParts, !sameDayPeriod)} - ${formatTime(endParts, true)}`;
};
