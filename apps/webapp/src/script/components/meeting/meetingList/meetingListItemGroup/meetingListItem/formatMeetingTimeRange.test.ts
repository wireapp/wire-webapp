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

import {formatMeetingTimeRange} from './formatMeetingTimeRange';

describe('formatMeetingTimeRange', () => {
  it('places the meridiem once for a same-period range', () => {
    expect(formatMeetingTimeRange(new Date(2026, 5, 15, 7, 30), new Date(2026, 5, 15, 7, 40))).toBe('07:30 - 07:40 AM');
    expect(formatMeetingTimeRange(new Date(2026, 5, 15, 14), new Date(2026, 5, 15, 15, 15))).toBe('02:00 - 03:15 PM');
  });

  it('places the meridiem on both times when the range crosses from AM to PM', () => {
    expect(formatMeetingTimeRange(new Date(2026, 5, 15, 11, 30), new Date(2026, 5, 15, 13, 15))).toBe(
      '11:30 AM - 01:15 PM',
    );
  });
});
