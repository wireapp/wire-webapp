/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {FnDate, formatLocale} from 'Util/TimeUtil';

/**
 * Formats a given date into a string with the pattern "Weekday, Month Day".
 *
 * @param {FnDate | string | number} date - The date to format. Can be a `FnDate`, string, or timestamp.
 * @returns {string} - The formatted date string.
 */
const formatWeekdayMonthDay = (date: FnDate | string | number): string => formatLocale(date, 'EEEE, MMMM d');

/**
 * Generates labels for "today" and "tomorrow" with their respective formatted dates.
 *
 * @returns {{today: string, tomorrow: string}} - An object containing the formatted labels for today and tomorrow.
 */
export const getTodayTomorrowLabels = (): {today: string; tomorrow: string} => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return {
    today: formatWeekdayMonthDay(today),
    tomorrow: formatWeekdayMonthDay(tomorrow),
  };
};

/**
 * Groups a list of meetings by their start hour.
 *
 * @param {Meeting[]} meetings - The list of meetings to group.
 * @returns {Record<number, Meeting[]>} - An object where the keys are the start hours (0-23) and the values are arrays of meetings.
 */
export const groupByStartHour = (meetings: Meeting[]): Record<number, Meeting[]> => {
  const groupedMeetings: Record<number, Meeting[]> = {};
  for (const meeting of meetings) {
    const hour = new Date(meeting.start_date).getHours();
    (groupedMeetings[hour] ??= []).push(meeting);
  }
  return groupedMeetings;
};
