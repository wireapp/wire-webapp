/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';

import {formatDateNumeral, formatTimeShort, fromUnixTime, TIME_IN_MILLIS} from 'Util/TimeUtil';

interface MessageTimeProps {
  timestamp: number;
  children?: React.ReactNode;
  className?: string;
}

const MessageTime = ({timestamp, children, ...props}: MessageTimeProps) => {
  const date = fromUnixTime(timestamp / TIME_IN_MILLIS.SECOND);
  const formattedTime = formatTimeShort(date);
  const formattedDate = formatDateNumeral(date);
  const dateTimeFormat = new Date(date).toISOString();

  // Equivalent for `ko.bindingHandlers.showAllTimestamps`
  const showAllTimestamps = (show: boolean) => {
    const times = document.querySelectorAll('.time');
    times.forEach(time => time.classList.toggle('show-timestamp', show));
  };

  return (
    <time
      className="time with-tooltip with-tooltip--top with-tooltip--time"
      onMouseEnter={() => showAllTimestamps(true)}
      onMouseLeave={() => showAllTimestamps(false)}
      dateTime={dateTimeFormat}
      data-timestamp={timestamp}
      data-tooltip={formattedDate}
      {...props}
    >
      {children ? children : formattedTime}
    </time>
  );
};

export {MessageTime};
