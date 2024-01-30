/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {fromUnixTime, TIME_IN_MILLIS} from 'Util/TimeUtil';

/**
 * Determines whether a message should be grouped with a previous one based on timestamp,
 * a message should be grouped if it's sent within the same minute on the clock than the first message in the group
 * or if it's sent within a timeframe (30 seconds) of the previous one
 * @param firstMessageTimestamp unix timestamp of the first message in the group
 * @param previousMessageTimestamp timestamp of the previous message
 * @param currentMessageTimestamp timestamp of the current message
 */
export function shouldGroupMessagesByTimestamp(
  firstMessageTimestamp: number,
  previousMessageTimestamp: number,
  currentMessageTimestamp: number,
) {
  // Interval in seconds, within which messages are grouped together
  const GROUPED_MESSAGE_INTERVAL = 30 * TIME_IN_MILLIS.SECOND;

  const currentMessageDate = fromUnixTime(currentMessageTimestamp / TIME_IN_MILLIS.SECOND);
  const firstMessageDate = fromUnixTime(firstMessageTimestamp / TIME_IN_MILLIS.SECOND);

  const currentMinute = currentMessageDate.getMinutes();
  const previousMinute = firstMessageDate.getMinutes();

  const isSentWithinTheSameMinute = currentMinute === previousMinute;
  const isSentWithinTimeInterval = currentMessageTimestamp - previousMessageTimestamp <= GROUPED_MESSAGE_INTERVAL;

  if (isSentWithinTheSameMinute || isSentWithinTimeInterval) {
    return true;
  }
  return false;
}
