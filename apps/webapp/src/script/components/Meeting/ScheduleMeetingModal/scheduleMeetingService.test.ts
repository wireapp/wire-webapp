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
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {translateForTest} from 'Util/test/translateForTest';
import {maybe, task} from 'true-myth';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {unwrapErr} from 'Util/test/resultTestSupport';

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
const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

const createUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  return user;
};

const mockConversation = {} as Conversation;

describe('tryScheduleMeeting', () => {
  const createDeps = ({
    createMeeting = jest.fn().mockReturnValue(
      task.resolve({
        qualified_conversation: qualifiedConversation,
        qualified_id: meetingId,
      }),
    ),
    getConversationById = jest.fn().mockResolvedValue(mockConversation),
    addUsers = jest.fn().mockResolvedValue(undefined),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
  }: {
    createMeeting?: jest.Mock;
    getConversationById?: jest.Mock;
    addUsers?: jest.Mock;
    fetchMeetings?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      createMeeting,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    const conversationRepository = {
      getConversationById,
      addUsers,
    } as unknown as ConversationRepository;

    return {
      deps: {meetingsRepository, conversationRepository, fetchMeetings, wallClock},
      createMeeting,
      getConversationById,
      addUsers,
      fetchMeetings,
    };
  };

  it('creates a meeting without invited_emails and refreshes the list', async () => {
    const {deps, createMeeting, fetchMeetings, getConversationById, addUsers} = createDeps();

    const result = await tryScheduleMeeting(formState, deps);

    expect(result.isOk).toBe(true);
    expect(createMeeting).toHaveBeenCalledWith({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
    });
    expect(getConversationById).not.toHaveBeenCalled();
    expect(addUsers).not.toHaveBeenCalled();
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('adds selected users to the meeting conversation after create', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const {deps, createMeeting, getConversationById, addUsers} = createDeps();

    const result = await tryScheduleMeeting(
      {
        ...formState,
        selectedUsers: [alice, bob],
      },
      deps,
    );

    expect(result.isOk).toBe(true);
    expect(createMeeting).toHaveBeenCalledWith({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
    });
    expect(getConversationById).toHaveBeenCalledWith(qualifiedConversation);
    expect(addUsers).toHaveBeenCalledWith(mockConversation, [alice, bob]);
  });

  it('returns addParticipantsFailed and refreshes the list when addUsers fails after create', async () => {
    const alice = createUser('1');
    const {deps, fetchMeetings, addUsers} = createDeps({
      addUsers: jest.fn().mockRejectedValue(new Error('add failed')),
    });

    const result = await tryScheduleMeeting(
      {
        ...formState,
        selectedUsers: [alice],
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.addParticipantsFailed);
    expect(addUsers).toHaveBeenCalled();
    expect(fetchMeetings).toHaveBeenCalled();
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
  const createDeps = ({
    updateMeeting = jest.fn().mockReturnValue(task.resolve({})),
    getConversationById = jest.fn().mockResolvedValue(mockConversation),
    addUsers = jest.fn().mockResolvedValue(undefined),
    removeMembers = jest.fn().mockResolvedValue(undefined),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
  }: {
    updateMeeting?: jest.Mock;
    getConversationById?: jest.Mock;
    addUsers?: jest.Mock;
    removeMembers?: jest.Mock;
    fetchMeetings?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      updateMeeting,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    const conversationRepository = {
      getConversationById,
      addUsers,
      removeMembers,
    } as unknown as ConversationRepository;

    return {
      deps: {meetingsRepository, conversationRepository, fetchMeetings, wallClock},
      updateMeeting,
      getConversationById,
      addUsers,
      removeMembers,
      fetchMeetings,
    };
  };

  it('updates metadata, applies participant diff, and refreshes the list', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const charlie = createUser('3');
    const {deps, updateMeeting, getConversationById, removeMembers, addUsers, fetchMeetings} = createDeps();

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [bob, charlie],
      },
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [alice, bob],
      dependencies: deps,
    });

    expect(result.isOk).toBe(true);
    expect(updateMeeting).toHaveBeenCalledWith(meetingId, {
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: null,
    });
    expect(getConversationById).toHaveBeenCalledWith(qualifiedConversation);
    expect(removeMembers).toHaveBeenCalledWith(mockConversation, [alice.qualifiedId]);
    expect(addUsers).toHaveBeenCalledWith(mockConversation, [charlie]);
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('does not sync participants when the selection is unchanged', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const {deps, updateMeeting, getConversationById, addUsers, removeMembers} = createDeps();

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [alice, bob],
      },
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [alice, bob],
      dependencies: deps,
    });

    expect(result.isOk).toBe(true);
    expect(updateMeeting).toHaveBeenCalled();
    expect(getConversationById).not.toHaveBeenCalled();
    expect(removeMembers).not.toHaveBeenCalled();
    expect(addUsers).not.toHaveBeenCalled();
  });

  it('returns missingTimes and does not call API', async () => {
    const {deps, updateMeeting} = createDeps();

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        end: maybe.nothing(),
      },
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [],
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

    const result = await tryUpdateMeeting({
      meetingId,
      formState,
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [],
      dependencies: deps,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.updateFailed);
    expect(fetchMeetings).not.toHaveBeenCalled();
  });

  it('returns removeParticipantsFailed and refreshes the list when removeMembers fails', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const {deps, fetchMeetings, removeMembers} = createDeps({
      removeMembers: jest.fn().mockRejectedValue(new Error('remove failed')),
    });

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [bob],
      },
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [alice, bob],
      dependencies: deps,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.removeParticipantsFailed);
    expect(removeMembers).toHaveBeenCalled();
    expect(fetchMeetings).toHaveBeenCalled();
  });

  it('returns addParticipantsFailed and refreshes the list when addUsers fails', async () => {
    const alice = createUser('1');
    const charlie = createUser('3');
    const {deps, fetchMeetings, addUsers} = createDeps({
      addUsers: jest.fn().mockRejectedValue(new Error('add failed')),
    });

    const result = await tryUpdateMeeting({
      meetingId,
      formState: {
        ...formState,
        selectedUsers: [alice, charlie],
      },
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [alice],
      dependencies: deps,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.addParticipantsFailed);
    expect(addUsers).toHaveBeenCalled();
    expect(fetchMeetings).toHaveBeenCalled();
  });
});

describe('performMeetingSubmit', () => {
  const createDeps = ({
    createMeeting = jest.fn().mockReturnValue(
      task.resolve({
        qualified_conversation: qualifiedConversation,
        qualified_id: meetingId,
      }),
    ),
    updateMeeting = jest.fn().mockReturnValue(task.resolve({})),
    getConversationById = jest.fn().mockResolvedValue(mockConversation),
    addUsers = jest.fn().mockResolvedValue(undefined),
    removeMembers = jest.fn().mockResolvedValue(undefined),
    fetchMeetings = jest.fn().mockResolvedValue(undefined),
  }: {
    createMeeting?: jest.Mock;
    updateMeeting?: jest.Mock;
    getConversationById?: jest.Mock;
    addUsers?: jest.Mock;
    removeMembers?: jest.Mock;
    fetchMeetings?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      createMeeting,
      updateMeeting,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    const conversationRepository = {
      getConversationById,
      addUsers,
      removeMembers,
    } as unknown as ConversationRepository;

    return {
      dependencies: {meetingsRepository, conversationRepository, fetchMeetings, wallClock},
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
      qualifiedConversation: maybe.nothing(),
      originalSelectedUsers: [],
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
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [],
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
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalSelectedUsers: [],
      dependencies,
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.editMeetingIdMissing);
    expect(createMeeting).not.toHaveBeenCalled();
    expect(updateMeeting).not.toHaveBeenCalled();
  });
});
