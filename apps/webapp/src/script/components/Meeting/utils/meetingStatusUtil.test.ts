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

import {
  getMeetingTemporalStatusAt,
  isMeetingListItemOngoing,
  MeetingTemporalStatuses,
} from 'Components/Meeting/utils/meetingStatusUtil';

describe('meetingStatusUtil', () => {
  const start = new Date('2026-07-15T10:00:00.000Z');
  const end = new Date('2026-07-15T11:00:00.000Z');

  it('returns upcoming before the scheduled start', () => {
    expect(getMeetingTemporalStatusAt(new Date('2026-07-15T09:59:59.999Z'), start, end)).toBe(
      MeetingTemporalStatuses.UPCOMING,
    );
  });

  it('returns on_going at the scheduled start and end', () => {
    expect(getMeetingTemporalStatusAt(start, start, end)).toBe(MeetingTemporalStatuses.ON_GOING);
    expect(getMeetingTemporalStatusAt(end, start, end)).toBe(MeetingTemporalStatuses.ON_GOING);
  });

  it('returns past after the scheduled end', () => {
    expect(getMeetingTemporalStatusAt(new Date('2026-07-15T11:00:00.001Z'), start, end)).toBe(
      MeetingTemporalStatuses.PAST,
    );
  });

  it('treats active calls as ongoing regardless of the scheduled interval', () => {
    expect(isMeetingListItemOngoing(MeetingTemporalStatuses.UPCOMING, true)).toBe(true);
    expect(isMeetingListItemOngoing(MeetingTemporalStatuses.PAST, true)).toBe(true);
    expect(isMeetingListItemOngoing(MeetingTemporalStatuses.ON_GOING, false)).toBe(true);
    expect(isMeetingListItemOngoing(MeetingTemporalStatuses.UPCOMING, false)).toBe(false);
  });
});
