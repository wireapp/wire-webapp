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
import {translateForTest} from 'Util/test/translateForTest';
import {maybe, task} from 'true-myth';

import {tryScheduleMeeting, tryUpdateMeeting} from './scheduleMeetingService';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

const formState: ScheduleMeetingFormState = {
  title: 'Weekly sync',
  start: maybe.just(new Date('2026-06-15T10:00:00.000Z')),
  end: maybe.just(new Date('2026-06-15T11:00:00.000Z')),
  recurrence: 'doesNotRepeat',
  selectedUsers: [],
  participantsFilter: '',
};

const meetingId = {id: 'meeting-id', domain: 'example.com'};

describe('tryScheduleMeeting', () => {
  const createDeps = ({
    createMeeting = jest.fn().mockReturnValue(task.resolve({})),
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
    const user = new User('1', 'example.com', translateForTest);
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

  it('returns missingTimes and does not call API', async () => {
    const {deps, createMeeting} = createDeps();

    await expect(
      tryScheduleMeeting(
        {
          ...formState,
          start: maybe.nothing(),
        },
        deps,
      ),
    ).resolves.toEqual({status: 'missingTimes'});

    expect(createMeeting).not.toHaveBeenCalled();
  });

  it('returns createFailed when API fails', async () => {
    const {deps, fetchMeetings} = createDeps({
      createMeeting: jest.fn().mockReturnValue(task.reject(new Error('network'))),
    });

    await expect(tryScheduleMeeting(formState, deps)).resolves.toEqual({status: 'createFailed'});

    expect(fetchMeetings).not.toHaveBeenCalled();
  });
});

describe('tryUpdateMeeting', () => {
  const createUser = (id: string, email: string) => {
    const user = new User(id, 'example.com', translateForTest);
    user.name(`User ${id}`);
    user.email(email);
    return user;
  };

  const createDeps = ({
    updateMeeting = jest.fn().mockReturnValue(task.resolve({})),
    addMeetingInvitation = jest.fn().mockReturnValue(task.resolve(undefined)),
    removeMeetingInvitation = jest.fn().mockReturnValue(task.resolve(undefined)),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
  }: {
    updateMeeting?: jest.Mock;
    addMeetingInvitation?: jest.Mock;
    removeMeetingInvitation?: jest.Mock;
    fetchMeetings?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      updateMeeting,
      addMeetingInvitation,
      removeMeetingInvitation,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    return {
      deps: {meetingsRepository, fetchMeetings},
      updateMeeting,
      addMeetingInvitation,
      removeMeetingInvitation,
      fetchMeetings,
    };
  };

  it('updates a meeting, applies invitation diff, and refreshes the list', async () => {
    const {deps, updateMeeting, addMeetingInvitation, removeMeetingInvitation, fetchMeetings} = createDeps();

    await expect(
      tryUpdateMeeting({
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [createUser('1', 'alice@wire.com'), createUser('3', 'charlie@wire.com')],
        },
        originalInvitedEmails: ['alice@wire.com', 'bob@wire.com'],
        dependencies: deps,
      }),
    ).resolves.toEqual({status: 'success'});

    expect(updateMeeting).toHaveBeenCalledWith(meetingId, {
      title: 'Weekly sync',
      start_time: '2026-06-15T10:00:00.000Z',
      end_time: '2026-06-15T11:00:00.000Z',
    });
    expect(removeMeetingInvitation).toHaveBeenCalledWith(meetingId, ['bob@wire.com']);
    expect(addMeetingInvitation).toHaveBeenCalledWith(meetingId, ['charlie@wire.com']);
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('returns participantMissingEmail and does not call API', async () => {
    const user = new User('1', 'example.com', translateForTest);
    user.name('Alice');
    const {deps, updateMeeting} = createDeps();

    await expect(
      tryUpdateMeeting({
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [user],
        },
        originalInvitedEmails: [],
        dependencies: deps,
      }),
    ).resolves.toEqual({status: 'participantMissingEmail'});

    expect(updateMeeting).not.toHaveBeenCalled();
  });

  it('returns missingTimes and does not call API', async () => {
    const {deps, updateMeeting} = createDeps();

    await expect(
      tryUpdateMeeting({
        meetingId,
        formState: {
          ...formState,
          end: maybe.nothing(),
        },
        originalInvitedEmails: [],
        dependencies: deps,
      }),
    ).resolves.toEqual({status: 'missingTimes'});

    expect(updateMeeting).not.toHaveBeenCalled();
  });

  it('returns updateFailed when updateMeeting fails', async () => {
    const {deps, fetchMeetings} = createDeps({
      updateMeeting: jest.fn().mockReturnValue(task.reject(new Error('network'))),
    });

    await expect(
      tryUpdateMeeting({meetingId, formState, originalInvitedEmails: [], dependencies: deps}),
    ).resolves.toEqual({status: 'updateFailed'});

    expect(fetchMeetings).not.toHaveBeenCalled();
  });

  it('refreshes the list when invitation changes fail after updateMeeting succeeds', async () => {
    const {deps, fetchMeetings} = createDeps({
      addMeetingInvitation: jest.fn().mockReturnValue(task.reject(new Error('invitation failed'))),
    });

    await expect(
      tryUpdateMeeting({
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [createUser('1', 'alice@wire.com')],
        },
        originalInvitedEmails: [],
        dependencies: deps,
      }),
    ).resolves.toEqual({status: 'updateFailed'});

    expect(fetchMeetings).toHaveBeenCalled();
  });
});
