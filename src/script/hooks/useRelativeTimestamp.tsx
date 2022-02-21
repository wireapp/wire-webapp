import {t} from 'Util/LocalizerUtil';
import {
  TIME_IN_MILLIS,
  fromUnixTime,
  isYoungerThan2Minutes,
  isYoungerThan1Hour,
  isToday,
  isYesterday,
  formatTimeShort,
  isYoungerThan7Days,
  fromNowLocale,
  formatLocale,
  formatDayMonth,
  isThisYear,
} from 'Util/TimeUtil';
import {useEffect, useState} from 'react';

export function useRelativeTimestamp(timestamp: number, asDay?: boolean) {
  const calculateTimestamp = (ts: number, isDay: boolean) => {
    const date = fromUnixTime(ts / TIME_IN_MILLIS.SECOND);
    if (isYoungerThan2Minutes(date)) {
      return t('conversationJustNow');
    }

    if (isYoungerThan1Hour(date)) {
      return fromNowLocale(date);
    }

    if (isToday(date)) {
      const time = formatTimeShort(date);
      return isDay ? `${t('conversationToday')} ${time}` : time;
    }

    if (isYesterday(date)) {
      return `${t('conversationYesterday')} ${formatTimeShort(date)}`;
    }
    if (isYoungerThan7Days(date)) {
      return formatLocale(date, 'EEEE p');
    }

    const weekDay = formatLocale(date, 'EEEE');
    const dayMonth = formatDayMonth(date);
    const year = isThisYear(date) ? '' : ` ${date.getFullYear()}`;
    const time = formatTimeShort(date);
    return isDay ? `${weekDay}, ${dayMonth}${year}, ${time}` : `${dayMonth}${year}, ${time}`;
  };
  const [timeago, setTimeago] = useState<string>(calculateTimestamp(timestamp, asDay));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeago(calculateTimestamp(timestamp, asDay));
    }, TIME_IN_MILLIS.MINUTE);
    return () => clearInterval(interval);
  });
  return timeago;
}
