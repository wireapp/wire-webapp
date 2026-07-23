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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {maybe} from 'true-myth';

import {unwrapErr} from 'Util/test/resultTestSupport';

import {mapScheduleFormToUpdateMeetingCommand} from './mapScheduleFormToUpdateMeetingCommand';
import type {ScheduleMeetingFormState} from './ScheduleMeetingModal/scheduleMeetingTypes';

const fixedNow = new Date('2026-06-23T14:30:00.000Z');
const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const meetingId = {id: 'meeting-id', domain: 'example.com'};
const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});

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
      originalRecurrence: 'doesNotRepeat',
      originalSelectedUsers: [],
      wallClock,
    });

    expect(result.isOk).toBe(true);
    expect(result.match({Ok: value => value, Err: () => null})).toEqual({
      meetingId,
      title: 'Weekly sync',
      start: futureStartDate,
      end: futureEndDate,
      recurrence: 'weekly',
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
      originalRecurrence: 'weekly',
      originalSelectedUsers: [],
      wallClock,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
  });
});
