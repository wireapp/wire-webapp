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

import {DateValue, getLocalTimeZone, today} from '@internationalized/date';

import {Option} from '../Select';
import {nearestTimeOptionFromDate, parseTimeLabel, timeOptionFromDate} from '../TimePickerField/timePickerUtils';

export const dateValueFromDate = (date: Date): DateValue => {
  const tz = getLocalTimeZone();
  return today(tz).set({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
};

export const isSameLocalCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const combineDateAndTime = (date: DateValue | null, time: Option | null): Date | null => {
  if (date === null || time === null || typeof time.value !== 'string' || time.value.length === 0) {
    return null;
  }

  const {hour24, minutes} = parseTimeLabel(time.value);
  const datePart = date.toDate(getLocalTimeZone());
  return new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), hour24, minutes, 0, 0);
};

export const splitDateTime = (dateTime: Date): {date: DateValue; time: Option} => ({
  date: dateValueFromDate(dateTime),
  time: timeOptionFromDate(dateTime),
});

export const getNextHourDateTime = (): Date => {
  const now = new Date();
  const plusOneHour = new Date(now);
  plusOneHour.setHours(plusOneHour.getHours() + 1);
  return plusOneHour;
};

export const getDefaultDateTimeSelection = (dateTime?: Date | null): {date: DateValue; time: Option} => {
  const effectiveDateTime = dateTime ?? getNextHourDateTime();
  return {
    date: dateValueFromDate(effectiveDateTime),
    time: nearestTimeOptionFromDate(effectiveDateTime),
  };
};
