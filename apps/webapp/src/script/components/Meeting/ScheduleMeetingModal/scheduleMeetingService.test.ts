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

import {MeetingsRepository} from 'Repositories/meetings';
import {User} from 'Repositories/entity/User';

import {tryScheduleMeeting} from './scheduleMeetingService';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

const formState: ScheduleMeetingFormState = {
  title: 'Weekly sync',
  start: new Date('2026-06-15T10:00:00.000Z'),
  end: new Date('2026-06-15T11:00:00.000Z'),
  recurrence: 'doesNotRepeat',
  selectedUsers: [],
  participantsFilter: '',
};

describe('tryScheduleMeeting', () => {
  const createDeps = ({
    createMeeting = jest.fn().mockResolvedValue({}),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
  }: {
    createMeeting?: jest.Mock;
    fetchMeetings?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      createMeeting,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    return {
      deps: {meetingsRepository, fetchMeetings},
      createMeeting,
      fetchMeetings,
    };
  };

  it('creates a meeting and refreshes the list', async () => {
    const {deps, createMeeting, fetchMeetings} = createDeps();

    await expect(tryScheduleMeeting(formState, deps)).resolves.toEqual({status: 'success'});

    expect(createMeeting).toHaveBeenCalledWith({
      title: 'Weekly sync',
      start_time: '2026-06-15T10:00:00.000Z',
      end_time: '2026-06-15T11:00:00.000Z',
    });
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('returns participantMissingEmail and does not call API', async () => {
    const user = new User('1', 'example.com');
    user.name('Alice');
    const {deps, createMeeting} = createDeps();

    await expect(
      tryScheduleMeeting(
        {
          ...formState,
          selectedUsers: [user],
        },
        deps,
      ),
    ).resolves.toEqual({status: 'participantMissingEmail'});

    expect(createMeeting).not.toHaveBeenCalled();
  });

  it('returns createFailed when API fails', async () => {
    const {deps, fetchMeetings} = createDeps({
      createMeeting: jest.fn().mockRejectedValue(new Error('network')),
    });

    await expect(tryScheduleMeeting(formState, deps)).resolves.toEqual({status: 'createFailed'});

    expect(fetchMeetings).not.toHaveBeenCalled();
  });
});
