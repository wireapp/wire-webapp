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

const formatWeekdayMonthDay = (date: FnDate | string | number) => formatLocale(date, 'EEEE, MMMM d');

export const getTodayTomorrowLabels = () => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  return {
    today: formatWeekdayMonthDay(today),
    tomorrow: formatWeekdayMonthDay(tomorrow),
  };
};

export const groupByStartHour = (meetings: Meeting[]) => {
  const groupedMeetings: Record<number, Meeting[]> = {};
  for (const meeting of meetings) {
    const hour = new Date(meeting.start_date).getHours();
    (groupedMeetings[hour] ??= []).push(meeting);
  }
  return groupedMeetings;
};
