/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {
  TIME_IN_MILLIS,
  fromUnixTime,
  isYoungerThan1Hour,
  isToday,
  isYesterday,
  formatTimeShort,
  isYoungerThan7Days,
  fromNowLocale,
  formatLocale,
  formatDayMonth,
  isThisYear,
  isYoungerThanMinute,
} from 'Util/timeUtil';

export interface RelativeTimestampLabels {
  justNow: string;
  today: string;
  yesterday: string;
}

export type RelativeTimestampFormatter = (timestamp: number, isDay: boolean) => string;

function calculateTimestamp(ts: number, isDay: boolean, relativeTimestampLabels: RelativeTimestampLabels) {
  const date = fromUnixTime(ts / TIME_IN_MILLIS.SECOND);
  if (isYoungerThanMinute(date)) {
    return relativeTimestampLabels.justNow;
  }

  if (isYoungerThan1Hour(date)) {
    return fromNowLocale(date);
  }

  if (isToday(date)) {
    const time = formatTimeShort(date);
    return isDay ? `${relativeTimestampLabels.today} ${time}` : time;
  }

  if (isYesterday(date)) {
    return `${relativeTimestampLabels.yesterday} ${formatTimeShort(date)}`;
  }

  if (isYoungerThan7Days(date)) {
    return formatLocale(date, 'EEEE p');
  }

  const weekDay = formatLocale(date, 'EEEE');
  const dayMonth = formatDayMonth(date);
  const year = isThisYear(date) ? '' : ` ${date.getFullYear()}`;
  const time = formatTimeShort(date);
  return isDay ? `${weekDay}, ${dayMonth}${year}, ${time}` : `${dayMonth}${year}, ${time}`;
}

export const createRelativeTimestampFormatter = (
  relativeTimestampLabels: RelativeTimestampLabels,
): RelativeTimestampFormatter => {
  return (timestamp: number, isDay: boolean) => {
    return calculateTimestamp(timestamp, isDay, relativeTimestampLabels);
  };
};

export const useRelativeTimestamp = (
  timestamp: number,
  asDay = false,
  getMessagesGroupLabelCallBack: RelativeTimestampFormatter,
) => {
  const [timeago, setTimeago] = useState<string>(getMessagesGroupLabelCallBack(timestamp, asDay));

  useEffect(() => {
    setTimeago(getMessagesGroupLabelCallBack(timestamp, asDay));

    const interval = setInterval(() => {
      setTimeago(getMessagesGroupLabelCallBack(timestamp, asDay));
    }, TIME_IN_MILLIS.MINUTE);

    return () => {
      clearInterval(interval);
    };
  }, [asDay, getMessagesGroupLabelCallBack, timestamp]);
  return timeago;
};
