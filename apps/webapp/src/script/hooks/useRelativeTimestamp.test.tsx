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

import {renderHook, act} from '@testing-library/react';
import {formatLocale, formatTimeShort} from 'Util/TimeUtil';

import {useRelativeTimestamp} from './useRelativeTimestamp';

describe('useRelativeTimestamp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  it('updates the timestamp as time passes on', async () => {
    jest.setSystemTime(0);
    const timestamp = Date.now();
    const {result} = renderHook(() => useRelativeTimestamp(timestamp));
    expect(result.current).toBe('conversationJustNow');

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1001);
    });
    expect(result.current).toBe('5 minutes ago');

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 60 * 1001);
    });
    expect(result.current).toEqual(formatTimeShort(timestamp));
  });

  it.each([
    [24 * 60 * 60 * 1001, 'conversationYesterday 12:00 AM'],
    [5 * 24 * 60 * 60 * 1001, formatLocale(0, 'EEEE p')],
    [10 * 24 * 60 * 60 * 1001, 'Thursday, Jan 1, 12:00 AM'],
    [366 * 24 * 60 * 60 * 1001, 'Thursday, Jan 1 1970, 12:00 AM'],
  ])('computes the right time according to the given timestamp', async (currentTime, expected) => {
    jest.setSystemTime(currentTime);
    const {result} = renderHook(() => useRelativeTimestamp(0, true));
    expect(result.current).toEqual(expected);
  });
});
