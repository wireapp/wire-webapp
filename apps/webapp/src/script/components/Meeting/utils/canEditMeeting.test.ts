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

import {canEditMeeting} from './canEditMeeting';

const FUTURE_MEETING_TIMESTAMP = Date.parse('2026-06-15T13:00:00.000Z');
const ONGOING_MEETING_TIMESTAMP = Date.parse('2026-06-15T14:30:00.000Z');
const PAST_MEETING_TIMESTAMP = Date.parse('2026-06-15T16:00:00.000Z');

const createSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => ({
  series_start_date: '2026-06-15T14:00:00.000Z',
  series_end_date: '2026-06-15T15:00:00.000Z',
  duration_ms: 3_600_000,
  recurrence: 'doesNotRepeat',
  conversation_id: 'conv-id',
  title: 'Weekly sync',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'host-id', domain: 'example.com'},
  qualified_conversation: {id: 'conv-id', domain: 'example.com'},
  ...overrides,
});

const createMeetingInstance = (
  seriesOverrides: Partial<MeetingSeries> = {},
  start = '2026-06-15T14:00:00.000Z',
  end = '2026-06-15T15:00:00.000Z',
): MeetingInstance => {
  const meetingSeries = createSeries(seriesOverrides);

  return {
    meetingSeries,
    start: new Date(start),
    end: new Date(end),
  };
};

const createSelfUser = (id = 'host-id') => {
  const user = new User(id, 'example.com', translateForTest);
  user.name('Host');
  return user;
};

describe('canEditMeeting', () => {
  it('returns true for the host of an upcoming instance', () => {
    const meetingInstance = createMeetingInstance();
    const selfUser = createSelfUser();

    expect(canEditMeeting(meetingInstance, selfUser, FUTURE_MEETING_TIMESTAMP)).toBe(true);
  });

  it('returns false for a non-host', () => {
    const meetingInstance = createMeetingInstance();
    const selfUser = createSelfUser('other-user');

    expect(canEditMeeting(meetingInstance, selfUser, FUTURE_MEETING_TIMESTAMP)).toBe(false);
  });

  it('returns false when the instance has started', () => {
    const meetingInstance = createMeetingInstance();
    const selfUser = createSelfUser();

    expect(canEditMeeting(meetingInstance, selfUser, ONGOING_MEETING_TIMESTAMP)).toBe(false);
  });

  it('returns false when the instance is in the past', () => {
    const meetingInstance = createMeetingInstance();
    const selfUser = createSelfUser();

    expect(canEditMeeting(meetingInstance, selfUser, PAST_MEETING_TIMESTAMP)).toBe(false);
  });

  it('returns true for a recurring series whose anchor has started when the instance is upcoming', () => {
    const meetingInstance = createMeetingInstance(
      {
        series_start_date: '2026-06-01T10:00:00.000Z',
        series_end_date: '2026-06-01T11:00:00.000Z',
        recurrence: 'weekly',
      },
      '2026-06-22T10:00:00.000Z',
      '2026-06-22T11:00:00.000Z',
    );
    const selfUser = createSelfUser();

    expect(canEditMeeting(meetingInstance, selfUser, FUTURE_MEETING_TIMESTAMP)).toBe(true);
  });
});
