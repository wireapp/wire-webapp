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

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {shouldGroupMessagesByTimestamp} from './MessagesGroupingUtil';

describe('shouldGroupMessagesByTimestamp', () => {
  it('should return true for 2 messages sent within the same minute, 58 seconds appart', () => {
    const firstMessageTimestamp = 1 * TIME_IN_MILLIS.SECOND; // Happy new year 1970!
    const previousMessageTimestamp = 1 * TIME_IN_MILLIS.SECOND;
    const currentMessageTimestamp = firstMessageTimestamp + 58 * TIME_IN_MILLIS.SECOND; // 58 seconds later

    const result = shouldGroupMessagesByTimestamp(
      firstMessageTimestamp,
      previousMessageTimestamp,
      currentMessageTimestamp,
    );
    expect(result).toBe(true);
  });

  it('should return false for messages sent in different minutes and more than 30 seconds apart', () => {
    const firstMessageTimestamp = 1 * TIME_IN_MILLIS.SECOND; // clock shows 0 min 1 sec
    const previousMessageTimestamp = 25 * TIME_IN_MILLIS.SECOND; // clock shows 0 min 25 sec
    const currentMessageTimestamp = firstMessageTimestamp + 59 * TIME_IN_MILLIS.SECOND; // clock shows 1 min 00 sec

    const result = shouldGroupMessagesByTimestamp(
      firstMessageTimestamp,
      previousMessageTimestamp,
      currentMessageTimestamp,
    );
    expect(result).toBe(false);
  });

  it('should return true for messages sent in different minutes and less than 30 seconds apart', () => {
    const firstMessageTimestamp = 1 * TIME_IN_MILLIS.SECOND; // clock shows 0 min 1 sec
    const previousMessageTimestamp = 40 * TIME_IN_MILLIS.SECOND; // clock shows 0 min 40 sec
    const currentMessageTimestamp = 60 * TIME_IN_MILLIS.SECOND; // clock shows 1 min 00 sec

    const result = shouldGroupMessagesByTimestamp(
      firstMessageTimestamp,
      previousMessageTimestamp,
      currentMessageTimestamp,
    );
    expect(result).toBe(true);
  });
});
