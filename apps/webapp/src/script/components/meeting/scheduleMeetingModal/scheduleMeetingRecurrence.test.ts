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
 */

import {MeetingRecurrenceFrequency} from '@wireapp/api-client/lib/meetings/meetingRecurrence';

import {mapMeetingRecurrenceToOption, mapRecurrenceOptionToMeetingRecurrence} from './scheduleMeetingRecurrence';

describe('meeting recurrence mapping', () => {
  it('maps two-week and four-week options to weekly intervals', () => {
    expect(mapRecurrenceOptionToMeetingRecurrence('everyTwoWeeks')).toEqual({
      frequency: MeetingRecurrenceFrequency.WEEKLY,
      interval: 2,
    });
    expect(mapRecurrenceOptionToMeetingRecurrence('everyFourWeeks')).toEqual({
      frequency: MeetingRecurrenceFrequency.WEEKLY,
      interval: 4,
    });
  });

  it('maps weekly intervals to their recurrence options', () => {
    expect(mapMeetingRecurrenceToOption({frequency: MeetingRecurrenceFrequency.WEEKLY, interval: 2})).toBe(
      'everyTwoWeeks',
    );
    expect(mapMeetingRecurrenceToOption({frequency: MeetingRecurrenceFrequency.WEEKLY, interval: 4})).toBe(
      'everyFourWeeks',
    );
  });

  it('keeps legacy monthly recurrence records compatible', () => {
    expect(mapMeetingRecurrenceToOption({frequency: MeetingRecurrenceFrequency.MONTHLY})).toBe('everyFourWeeks');
  });
});
