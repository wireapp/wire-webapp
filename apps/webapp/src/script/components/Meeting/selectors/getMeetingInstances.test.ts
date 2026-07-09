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

import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import {getMeetingInstances} from './getMeetingInstances';

const createSeries = (id: string, recurrence: MeetingSeries['recurrence'], seriesStartDate: string): MeetingSeries => ({
  series_start_date: seriesStartDate,
  series_end_date: seriesStartDate.replace('T10:', 'T11:'),
  duration_ms: 3_600_000,
  recurrence,
  conversation_id: 'conversation-id',
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_id: {id, domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  title: id,
});

describe('getMeetingInstances', () => {
  it('returns a flat list sorted by instance start', () => {
    const from = new Date('2026-06-15T00:00:00.000Z');
    const to = new Date('2026-06-29T00:00:00.000Z');
    const meetingSeries = [
      createSeries('weekly-sync', 'weekly', '2026-06-01T10:00:00.000Z'),
      createSeries('future-one-off', 'doesNotRepeat', '2026-06-20T14:00:00.000Z'),
    ];

    const meetingInstances = getMeetingInstances(meetingSeries, from, to);

    expect(
      meetingInstances.map(meetingInstance => ({
        title: meetingInstance.meetingSeries.title,
        start: meetingInstance.start.toISOString(),
      })),
    ).toEqual([
      {title: 'weekly-sync', start: '2026-06-15T10:00:00.000Z'},
      {title: 'future-one-off', start: '2026-06-20T14:00:00.000Z'},
      {title: 'weekly-sync', start: '2026-06-22T10:00:00.000Z'},
    ]);
  });
});
