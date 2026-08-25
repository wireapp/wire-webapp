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

import {maybe} from 'true-myth';

import {unwrap, unwrapErr} from 'Util/test/resultTestSupport';

import {mapScheduleFormToUpdateMeetingCommand} from './mapScheduleFormToUpdateMeetingCommand';
import type {ScheduleMeetingFormState} from 'Components/meeting/scheduleMeetingModal/scheduleMeetingTypes';

const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const meetingId = {id: 'meeting-id', domain: 'example.com'};
const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

const baseFormState = (): ScheduleMeetingFormState => ({
  title: 'Weekly sync',
  start: maybe.just(futureStartDate),
  end: maybe.just(futureEndDate),
  recurrence: 'weekly',
  selectedUsers: [],
  participantsFilter: '',
});

describe('mapScheduleFormToUpdateMeetingCommand', () => {
  it('maps form state and edit context to an update command', () => {
    const result = mapScheduleFormToUpdateMeetingCommand({
      formState: baseFormState(),
      meetingId,
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalTitle: 'Weekly sync',
      originalStart: futureStartDate,
      originalEnd: futureEndDate,
      originalRecurrence: 'doesNotRepeat',
      originalSelectedUsers: [],
    });

    expect(result.isOk).toBe(true);
    expect(unwrap(result)).toEqual({
      meetingId,
      title: 'Weekly sync',
      start: futureStartDate,
      end: futureEndDate,
      recurrence: 'weekly',
      originalTitle: 'Weekly sync',
      originalStart: futureStartDate,
      originalEnd: futureEndDate,
      originalRecurrence: 'doesNotRepeat',
      selectedUsers: [],
      originalSelectedUsers: [],
      qualifiedConversation: maybe.just(qualifiedConversation),
    });
  });

  it('returns missingTimes when start or end is missing', () => {
    const result = mapScheduleFormToUpdateMeetingCommand({
      formState: {
        ...baseFormState(),
        end: maybe.nothing(),
      },
      meetingId,
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalTitle: 'Weekly sync',
      originalStart: futureStartDate,
      originalEnd: futureEndDate,
      originalRecurrence: 'weekly',
      originalSelectedUsers: [],
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
  });

  it('maps past start and end times for an ongoing meeting edit', () => {
    const pastStartDate = new Date('2026-06-23T10:00:00.000Z');
    const pastEndDate = new Date('2026-06-23T11:00:00.000Z');
    const result = mapScheduleFormToUpdateMeetingCommand({
      formState: {
        ...baseFormState(),
        start: maybe.just(pastStartDate),
        end: maybe.just(pastEndDate),
      },
      meetingId,
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalTitle: 'Weekly sync',
      originalStart: pastStartDate,
      originalEnd: pastEndDate,
      originalRecurrence: 'weekly',
      originalSelectedUsers: [],
    });

    expect(result.isOk).toBe(true);
    expect(unwrap(result)).toMatchObject({
      start: pastStartDate,
      end: pastEndDate,
    });
  });
});
