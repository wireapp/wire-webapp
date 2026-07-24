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
import {
  canDeleteMeeting,
  canDeleteMeetingForAll,
  canDeleteMeetingForMe,
} from 'Components/Meeting/utils/canDeleteMeeting';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

const fixedFutureNow = new Date('2026-06-15T13:00:00.000Z');
const fixedOngoingNow = new Date('2026-06-15T14:30:00.000Z');
const fixedPastNow = new Date('2026-06-15T16:00:00.000Z');

const futureWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: fixedFutureNow.getTime(),
});
const ongoingWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: fixedOngoingNow.getTime(),
});
const pastWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: fixedPastNow.getTime(),
});

const createSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => ({
  series_start_date: '2026-06-15T14:00:00.000Z',
  series_end_date: '2026-06-15T15:00:00.000Z',
  duration_ms: 3_600_000,
  recurrence: 'weekly',
  conversation_id: 'conv-id',
  title: 'Weekly sync',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'host-id', domain: 'example.com'},
  qualified_conversation: {id: 'conv-id', domain: 'example.com'},
  ...overrides,
});

const createMeetingInstance = (overrides: Partial<MeetingSeries> = {}): MeetingInstance => {
  const meetingSeries = createSeries(overrides);

  return {
    meetingSeries,
    start: new Date(meetingSeries.series_start_date),
    end: new Date(meetingSeries.series_end_date),
  };
};

const createSelfUser = (id = 'host-id') => {
  const user = new User(id, 'example.com', translateForTest);
  user.name('Host');
  return user;
};

describe('canDeleteMeeting', () => {
  it('allows delete for upcoming and ongoing meetings', () => {
    const meetingInstance = createMeetingInstance();

    expect(canDeleteMeeting(meetingInstance, futureWallClock.currentTimestampInMilliseconds)).toBe(true);
    expect(canDeleteMeeting(meetingInstance, ongoingWallClock.currentTimestampInMilliseconds)).toBe(true);
  });

  it('disallows delete for past meetings', () => {
    const meetingInstance = createMeetingInstance();

    expect(canDeleteMeeting(meetingInstance, pastWallClock.currentTimestampInMilliseconds)).toBe(false);
  });
});

describe('canDeleteMeetingForAll', () => {
  it('allows host delete when the meeting is not past', () => {
    const meetingInstance = createMeetingInstance();

    expect(
      canDeleteMeetingForAll(meetingInstance, createSelfUser(), futureWallClock.currentTimestampInMilliseconds),
    ).toBe(true);
  });

  it('disallows delete for non-host users', () => {
    const meetingInstance = createMeetingInstance();

    expect(
      canDeleteMeetingForAll(
        meetingInstance,
        createSelfUser('invitee-id'),
        futureWallClock.currentTimestampInMilliseconds,
      ),
    ).toBe(false);
  });
});

describe('canDeleteMeetingForMe', () => {
  it('allows participant delete when the meeting is not past', () => {
    const meetingInstance = createMeetingInstance();

    expect(
      canDeleteMeetingForMe(
        meetingInstance,
        createSelfUser('invitee-id'),
        futureWallClock.currentTimestampInMilliseconds,
      ),
    ).toBe(true);
  });

  it('disallows delete for the host', () => {
    const meetingInstance = createMeetingInstance();

    expect(
      canDeleteMeetingForMe(meetingInstance, createSelfUser(), futureWallClock.currentTimestampInMilliseconds),
    ).toBe(false);
  });
});
