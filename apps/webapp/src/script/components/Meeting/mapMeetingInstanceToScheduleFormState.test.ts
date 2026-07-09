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

import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {mapMeetingInstanceToScheduleFormState} from './mapMeetingInstanceToScheduleFormState';

const createUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  return user;
};

const createMeetingInstance = (
  seriesOverrides: Partial<MeetingSeries> = {},
  start = '2026-06-15T10:00:00.000Z',
  end = '2026-06-15T11:00:00.000Z',
): MeetingInstance => ({
  meetingSeries: {
    series_start_date: '2026-06-01T10:00:00.000Z',
    series_end_date: '2026-06-01T11:00:00.000Z',
    duration_ms: 3_600_000,
    recurrence: 'weekly',
    conversation_id: 'conv-id',
    qualified_conversation: {id: 'conv-id', domain: 'example.com'},
    title: 'Weekly sync',
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    ...seriesOverrides,
  },
  start: new Date(start),
  end: new Date(end),
});

describe('mapMeetingInstanceToScheduleFormState', () => {
  it('maps the selected instance start/end to schedule form state', () => {
    const selectedUsers = [createUser('1'), createUser('2')];
    const meetingInstance = createMeetingInstance({}, '2026-06-22T10:00:00.000Z', '2026-06-22T11:00:00.000Z');

    const result = mapMeetingInstanceToScheduleFormState(meetingInstance, selectedUsers);

    expect(result.title).toBe('Weekly sync');
    expect(result.start.isJust).toBe(true);
    expect(result.start.unwrapOr(new Date(0))).toEqual(new Date('2026-06-22T10:00:00.000Z'));
    expect(result.end.isJust).toBe(true);
    expect(result.end.unwrapOr(new Date(0))).toEqual(new Date('2026-06-22T11:00:00.000Z'));
    expect(result.recurrence).toBe('weekly');
    expect(result.participantsFilter).toBe('');
    expect(result.selectedUsers).toBe(selectedUsers);
  });

  it('uses instance times rather than the series anchor for recurring meetings', () => {
    const meetingInstance = createMeetingInstance(
      {
        series_start_date: '2026-06-01T10:00:00.000Z',
        series_end_date: '2026-06-01T11:00:00.000Z',
      },
      '2026-06-29T10:00:00.000Z',
      '2026-06-29T11:00:00.000Z',
    );

    const result = mapMeetingInstanceToScheduleFormState(meetingInstance, []);

    expect(result.start.unwrapOr(new Date(0))).toEqual(new Date('2026-06-29T10:00:00.000Z'));
    expect(result.end.unwrapOr(new Date(0))).toEqual(new Date('2026-06-29T11:00:00.000Z'));
  });

  it('uses selectedUsers passed by the caller', () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const selectedUsers = [alice, bob];

    const result = mapMeetingInstanceToScheduleFormState(createMeetingInstance(), selectedUsers);

    expect(result.selectedUsers).toHaveLength(2);
    expect(result.selectedUsers[0]).toBe(alice);
    expect(result.selectedUsers[1]).toBe(bob);
  });
});
