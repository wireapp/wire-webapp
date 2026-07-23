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
import {maybe} from 'true-myth';

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {mapUpdateCommandToUpdateMeeting} from './mapUpdateCommandToUpdateMeeting';
import type {UpdateMeetingCommand} from './shared/types/meetingCommandTypes';

const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const futureStartIso = futureStartDate.toISOString();
const futureEndIso = futureEndDate.toISOString();
const meetingId = {id: 'meeting-id', domain: 'example.com'};
const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

const createUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  return user;
};

const baseUpdateCommand = (overrides: Partial<UpdateMeetingCommand> = {}): UpdateMeetingCommand => ({
  meetingId,
  title: 'Weekly sync',
  start: futureStartDate,
  end: futureEndDate,
  recurrence: 'weekly',
  originalRecurrence: 'doesNotRepeat',
  selectedUsers: [],
  originalSelectedUsers: [],
  qualifiedConversation: maybe.just(qualifiedConversation),
  ...overrides,
});

describe('mapUpdateCommandToUpdateMeeting', () => {
  it('maps title, times, and changed recurrence metadata', () => {
    expect(
      mapUpdateCommandToUpdateMeeting(
        baseUpdateCommand({
          selectedUsers: [createUser('1'), createUser('3')],
        }),
      ),
    ).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
    });
  });

  it('omits recurrence when unchanged for non-repeating meetings', () => {
    expect(
      mapUpdateCommandToUpdateMeeting(
        baseUpdateCommand({
          recurrence: 'doesNotRepeat',
          originalRecurrence: 'doesNotRepeat',
        }),
      ),
    ).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
    });
  });

  it('includes recurrence when unchanged for repeating meetings', () => {
    expect(
      mapUpdateCommandToUpdateMeeting(
        baseUpdateCommand({
          originalRecurrence: 'weekly',
        }),
      ),
    ).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
    });
  });

  it('clears recurrence when changed to doesNotRepeat', () => {
    expect(
      mapUpdateCommandToUpdateMeeting(
        baseUpdateCommand({
          recurrence: 'doesNotRepeat',
          originalRecurrence: 'weekly',
        }),
      ),
    ).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: null,
    });
  });
});
