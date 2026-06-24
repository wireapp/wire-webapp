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
import {createDeterministicWallClock} from 'src/script/clock/deterministicWallClock';
import {unwrapErr} from 'Util/test/resultTestSupport';

import {createParticipantMissingEmailError} from '../ScheduleFormErrors';
import {meetingSubmitErrors} from '../MeetingSubmitErrors';

import {tryScheduleMeeting, tryUpdateMeeting, performMeetingSubmit} from './scheduleMeetingService';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

const fixedNow = new Date('2026-06-23T14:30:00.000Z');
const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const futureStartIso = futureStartDate.toISOString();
const futureEndIso = futureEndDate.toISOString();

const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});

const formState: ScheduleMeetingFormState = {
  title: 'Weekly sync',
  start: maybe.just(futureStartDate),
  end: maybe.just(futureEndDate),
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
      deps: {meetingsRepository, fetchMeetings, wallClock},
      createMeeting,
      fetchMeetings,
    };
  };

  it('creates a meeting and refreshes the list', async () => {
    const {deps, createMeeting, fetchMeetings} = createDeps();

    const result = await tryScheduleMeeting(formState, deps);

    expect(result.isOk).toBe(true);
    expect(createMeeting).toHaveBeenCalledWith({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
    });
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('returns participantMissingEmail and does not call API', async () => {
    const user = new User('1', 'example.com', translateForTest);
    user.name('Alice');
    const {deps, createMeeting} = createDeps();

    const result = await tryScheduleMeeting(
      {
        ...formState,
        selectedUsers: [user],
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toEqual(createParticipantMissingEmailError(['Alice']));
    expect(createMeeting).not.toHaveBeenCalled();
  });

  it('returns missingTimes and does not call API', async () => {
    const {deps, createMeeting} = createDeps();

    const result = await tryScheduleMeeting(
      {
        ...formState,
        start: maybe.nothing(),
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
    expect(createMeeting).not.toHaveBeenCalled();
  });

  it('returns createFailed when API fails', async () => {
    const {deps, fetchMeetings} = createDeps({
      createMeeting: jest.fn().mockReturnValue(task.reject(new Error('network'))),
    });

    const result = await tryScheduleMeeting(formState, deps);

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.createFailed);
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
      deps: {meetingsRepository, fetchMeetings, wallClock},
      updateMeeting,
      addMeetingInvitation,
      removeMeetingInvitation,
      fetchMeetings,
    };
  };

  it('updates a meeting, applies invitation diff, and refreshes the list', async () => {
    const {deps, updateMeeting, addMeetingInvitation, removeMeetingInvitation, fetchMeetings} = createDeps();

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [createUser('1', 'alice@wire.com'), createUser('3', 'charlie@wire.com')],
      },
      originalInvitedParticipantEmails: ['alice@wire.com', 'bob@wire.com'],
      dependencies: deps,
    });

    expect(result.isOk).toBe(true);
    expect(updateMeeting).toHaveBeenCalledWith(meetingId, {
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: null,
    });
    expect(removeMeetingInvitation).toHaveBeenCalledWith(meetingId, ['bob@wire.com']);
    expect(addMeetingInvitation).toHaveBeenCalledWith(meetingId, ['charlie@wire.com']);
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('does not remove unmatched backend invites when saving without participant changes', async () => {
    const alice = createUser('1', 'alice@wire.com');
    const bob = createUser('2', 'bob@wire.com');
    const {deps, updateMeeting, addMeetingInvitation, removeMeetingInvitation} = createDeps();

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [alice, bob],
      },
      // Baseline matches resolved form participants only — excludes unknown@example.com from backend.
      originalInvitedParticipantEmails: ['alice@wire.com', 'bob@wire.com'],
      dependencies: deps,
    });

    expect(result.isOk).toBe(true);
    expect(updateMeeting).toHaveBeenCalled();
    expect(removeMeetingInvitation).not.toHaveBeenCalled();
    expect(addMeetingInvitation).not.toHaveBeenCalled();
  });

  it('returns participantMissingEmail and does not call API', async () => {
    const user = new User('1', 'example.com', translateForTest);
    user.name('Alice');
    const {deps, updateMeeting} = createDeps();

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [user],
      },
      originalInvitedParticipantEmails: [],
      dependencies: deps,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toEqual(createParticipantMissingEmailError(['Alice']));
    expect(updateMeeting).not.toHaveBeenCalled();
  });

  it('returns missingTimes and does not call API', async () => {
    const {deps, updateMeeting} = createDeps();

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        end: maybe.nothing(),
      },
      originalInvitedParticipantEmails: [],
      dependencies: deps,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
    expect(updateMeeting).not.toHaveBeenCalled();
  });

  it('returns updateFailed when updateMeeting fails', async () => {
    const {deps, fetchMeetings} = createDeps({
      updateMeeting: jest.fn().mockReturnValue(task.reject(new Error('network'))),
    });

    const result = await tryUpdateMeeting({meetingId, formState, originalInvitedParticipantEmails: [], dependencies: deps});

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.updateFailed);
    expect(fetchMeetings).not.toHaveBeenCalled();
  });

  it('returns removeInvitationFailed and refreshes the list when removeMeetingInvitation fails', async () => {
    const {deps, fetchMeetings} = createDeps({
      removeMeetingInvitation: jest.fn().mockReturnValue(task.reject(new Error('invitation failed'))),
    });

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [createUser('1', 'alice@wire.com')],
      },
      originalInvitedParticipantEmails: ['alice@wire.com', 'bob@wire.com'],
      dependencies: deps,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.removeInvitationFailed);
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('returns addInvitationFailed and refreshes the list when addMeetingInvitation fails', async () => {
    const {deps, fetchMeetings} = createDeps({
      addMeetingInvitation: jest.fn().mockReturnValue(task.reject(new Error('invitation failed'))),
    });

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [createUser('1', 'alice@wire.com')],
      },
      originalInvitedParticipantEmails: [],
      dependencies: deps,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.addInvitationFailed);
    expect(fetchMeetings).toHaveBeenCalled();
  });
});

describe('performMeetingSubmit', () => {
  const createDeps = ({
    createMeeting = jest.fn().mockReturnValue(task.resolve({})),
    updateMeeting = jest.fn().mockReturnValue(task.resolve({})),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
  }: {
    createMeeting?: jest.Mock;
    updateMeeting?: jest.Mock;
    fetchMeetings?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      createMeeting,
      updateMeeting,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    return {
      dependencies: {meetingsRepository, fetchMeetings, wallClock},
      createMeeting,
      updateMeeting,
      fetchMeetings,
    };
  };

  it('creates a meeting in create mode', async () => {
    const {dependencies, createMeeting, updateMeeting} = createDeps();

    const result = await performMeetingSubmit({
      mode: 'create',
      editingMeetingId: maybe.nothing(),
      formState,
      originalInvitedParticipantEmails: [],
      dependencies,
    });

    expect(result.isOk).toBe(true);
    expect(createMeeting).toHaveBeenCalled();
    expect(updateMeeting).not.toHaveBeenCalled();
  });

  it('updates a meeting in edit mode when the meeting id is present', async () => {
    const {dependencies, createMeeting, updateMeeting} = createDeps();

    const result = await performMeetingSubmit({
      mode: 'edit',
      editingMeetingId: maybe.just(meetingId),
      formState,
      originalInvitedParticipantEmails: [],
      dependencies,
    });

    expect(result.isOk).toBe(true);
    expect(updateMeeting).toHaveBeenCalledWith(meetingId, expect.any(Object));
    expect(createMeeting).not.toHaveBeenCalled();
  });

  it('returns editMeetingIdMissing in edit mode when the meeting id is missing', async () => {
    const {dependencies, createMeeting, updateMeeting} = createDeps();

    const result = await performMeetingSubmit({
      mode: 'edit',
      editingMeetingId: maybe.nothing(),
      formState,
      originalInvitedParticipantEmails: [],
      dependencies,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.editMeetingIdMissing);
    expect(createMeeting).not.toHaveBeenCalled();
    expect(updateMeeting).not.toHaveBeenCalled();
  });
});
