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

import {getNextHourDateTime} from './CellsShareExpirationFields';

describe('getNextHourDateTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns exactly +1 hour preserving minutes when at start of hour', () => {
    // Set current time to 2:00:00 PM
    jest.setSystemTime(new Date(2025, 0, 21, 14, 0, 0, 0));

    const result = getNextHourDateTime();

    expect(result.getHours()).toBe(15); // 3:00 PM
    expect(result.getMinutes()).toBe(0); // Minutes preserved
  });

  it('returns exactly +1 hour preserving minutes when mid-hour', () => {
    // Set current time to 2:45:30 PM
    jest.setSystemTime(new Date(2025, 0, 21, 14, 45, 30, 500));

    const result = getNextHourDateTime();

    expect(result.getHours()).toBe(15); // 3:45 PM
    expect(result.getMinutes()).toBe(45); // Minutes preserved
    expect(result.getSeconds()).toBe(30); // Seconds preserved
  });

  it('advances to the next day when current time is 23:30', () => {
    // Set current time to 23:30 on January 21st (day 1)
    jest.setSystemTime(new Date(2025, 0, 21, 23, 30, 0, 0));

    const result = getNextHourDateTime();

    // Should be 00:30 on January 22nd (day 2)
    expect(result.getDate()).toBe(22); // January 22nd
    expect(result.getHours()).toBe(0); // 00:30
    expect(result.getMinutes()).toBe(30); // Minutes preserved
  });

  it('handles end of month correctly', () => {
    // Set current time to 23:30 on January 31st
    jest.setSystemTime(new Date(2025, 0, 31, 23, 30, 0, 0));

    const result = getNextHourDateTime();

    // Should be 00:30 on February 1st
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(30); // Minutes preserved
  });

  it('handles end of year correctly', () => {
    // Set current time to 23:45 on December 31st
    jest.setSystemTime(new Date(2025, 11, 31, 23, 45, 0, 0));

    const result = getNextHourDateTime();

    // Should be 00:45 on January 1st, 2026
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(45); // Minutes preserved
  });

  it('returns exactly +1 hour when current time is at 59 minutes', () => {
    // Set current time to 2:59:59 PM
    jest.setSystemTime(new Date(2025, 0, 21, 14, 59, 59, 999));

    const result = getNextHourDateTime();

    expect(result.getHours()).toBe(15); // 3:59 PM
    expect(result.getMinutes()).toBe(59); // Minutes preserved
    expect(result.getSeconds()).toBe(59); // Seconds preserved
  });
});
