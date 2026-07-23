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

import {MeetingRecurrenceFrequency} from '@wireapp/api-client/lib/meetings/meetingRecurrence';

import {mapScheduleCommandToCreateMeeting} from './mapScheduleCommandToCreateMeeting';

const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const futureStartIso = futureStartDate.toISOString();
const futureEndIso = futureEndDate.toISOString();

describe('mapScheduleCommandToCreateMeeting', () => {
  it('maps title, times, and recurrence metadata only', () => {
    const result = mapScheduleCommandToCreateMeeting({
      title: 'Weekly sync',
      start: futureStartDate,
      end: futureEndDate,
      recurrence: 'weekly',
      selectedUsers: [],
    });

    expect(result).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
    });
  });
});
