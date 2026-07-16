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
import {GROUP_CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {maybe, task} from 'true-myth';

import type {MeetingStoreDeps} from 'Components/Meeting/meetingStore/meetingStoreDeps';
import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrapErr} from 'Util/test/resultTestSupport';

import {scheduleMeeting, updateMeeting} from './scheduleMeetingService';
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
const groupId = 'group-id';

const createUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  return user;
};

const createConversation = (epoch = 0) => {
  const conversation = new Conversation(
    qualifiedConversation.id,
    qualifiedConversation.domain,
    CONVERSATION_PROTOCOL.MLS,
    translateForTest,
  );
  conversation.groupId = groupId;
  conversation.epoch = epoch;
  return conversation;
};

const meetingConversationResponse = {
  qualified_id: qualifiedConversation,
  creator: 'creator-id',
  type: 0,
  access: ['invite', 'private'],
  access_role: 'activated',
  name: 'Weekly sync',
  group_conv_type: GROUP_CONVERSATION_TYPE.MEETING,
  protocol: CONVERSATION_PROTOCOL.MLS,
  group_id: groupId,
  epoch: 0,
  cells_state: 'ready',
  add_permission: 'admins',
  members: {
    self: {
      id: 'creator-id',
      conversation_role: 'wire_admin',
      hidden: false,
      hidden_ref: null,
      otr_archived: false,
      otr_archived_ref: null,
      otr_muted_ref: null,
      otr_muted_status: null,
      service: null,
      status_ref: '0.0',
      status_time: '1970-01-01T00:00:00.000Z',
    },
    others: [],
  },
};

describe('scheduleMeeting', () => {
  const createDeps = ({
    createMeetingMock = jest.fn().mockReturnValue(
      task.resolve({
        qualified_conversation: qualifiedConversation,
        qualified_id: meetingId,
        conversation: meetingConversationResponse,
      }),
    ),
    saveMeetingConversationFromBackend = jest.fn().mockReturnValue(task.resolve(undefined)),
    safeGetConversationById = jest.fn().mockReturnValue(task.resolve(createConversation())),
    establishMeetingConversation = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    safeAddUsers = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
  }: {
    createMeetingMock?: jest.Mock;
    saveMeetingConversationFromBackend?: jest.Mock;
    safeGetConversationById?: jest.Mock;
    establishMeetingConversation?: jest.Mock;
    safeAddUsers?: jest.Mock;
  } = {}): {
    deps: MeetingStoreDeps;
    createMeetingMock: jest.Mock;
    establishMeetingConversation: jest.Mock;
    saveMeetingConversationFromBackend: jest.Mock;
  } => {
    const meetingsRepository = {
      createMeeting: createMeetingMock,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    const conversationRepository = {
      saveMeetingConversationFromBackend,
      safeGetConversationById,
      establishMeetingConversation,
      safeAddUsers,
    } as unknown as ConversationRepository;

    return {
      deps: {meetingsRepository, conversationRepository, wallClock},
      createMeetingMock,
      establishMeetingConversation,
      saveMeetingConversationFromBackend,
    };
  };

  it('creates a meeting and establishes the MLS conversation without participants', async () => {
    const {deps, createMeetingMock, establishMeetingConversation, saveMeetingConversationFromBackend} = createDeps();

    const result = await scheduleMeeting(formState, deps);

    expect(result.isOk).toBe(true);
    expect(result.match({Ok: value => value.failedToAdd, Err: () => null})).toEqual([]);
    expect(createMeetingMock).toHaveBeenCalledWith({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
    });
    expect(saveMeetingConversationFromBackend).toHaveBeenCalledWith(meetingConversationResponse);
    expect(establishMeetingConversation).toHaveBeenCalledWith({
      groupId,
      userIdsToAdd: [],
      conversationQualifiedId: qualifiedConversation,
    });
  });

  it('establishes the meeting conversation with selected users on create', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const {deps, establishMeetingConversation} = createDeps();

    const result = await scheduleMeeting(
      {
        ...formState,
        selectedUsers: [alice, bob],
      },
      deps,
    );

    expect(result.isOk).toBe(true);
    expect(establishMeetingConversation).toHaveBeenCalledWith({
      groupId,
      userIdsToAdd: [alice.qualifiedId, bob.qualifiedId],
      conversationQualifiedId: qualifiedConversation,
    });
  });

  it('returns addParticipantsFailed when MLS establishment fails after create', async () => {
    const {deps} = createDeps({
      establishMeetingConversation: jest.fn().mockReturnValue(task.reject(new Error('establish failed'))),
    });

    const result = await scheduleMeeting(formState, deps);

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.addParticipantsFailed);
  });

  it('returns missingTimes and does not call API', async () => {
    const {deps, createMeetingMock} = createDeps();

    const result = await scheduleMeeting(
      {
        ...formState,
        start: maybe.nothing(),
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
    expect(createMeetingMock).not.toHaveBeenCalled();
  });

  it('returns createFailed when API fails', async () => {
    const {deps} = createDeps({
      createMeetingMock: jest.fn().mockReturnValue(task.reject(new Error('network'))),
    });

    const result = await scheduleMeeting(formState, deps);

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.createFailed);
  });
});

describe('updateMeeting', () => {
  const createDeps = ({
    updateMeetingMock = jest.fn().mockReturnValue(
      task.resolve({
        qualified_conversation: qualifiedConversation,
        qualified_id: meetingId,
        conversation: meetingConversationResponse,
      }),
    ),
    saveMeetingConversationFromBackend = jest.fn().mockReturnValue(task.resolve(undefined)),
    safeGetConversationById = jest.fn().mockReturnValue(task.resolve(createConversation(1))),
    safeAddUsers = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    safeRemoveMembers = jest.fn().mockReturnValue(task.resolve(undefined)),
    establishMeetingConversation = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
  }: {
    updateMeetingMock?: jest.Mock;
    saveMeetingConversationFromBackend?: jest.Mock;
    safeGetConversationById?: jest.Mock;
    safeAddUsers?: jest.Mock;
    safeRemoveMembers?: jest.Mock;
    establishMeetingConversation?: jest.Mock;
  } = {}) => {
    const meetingsRepository = {
      updateMeeting: updateMeetingMock,
      getMeetingsList: jest.fn(),
    } as unknown as MeetingsRepository;

    const conversationRepository = {
      saveMeetingConversationFromBackend,
      safeGetConversationById,
      safeAddUsers,
      safeRemoveMembers,
      establishMeetingConversation,
    } as unknown as ConversationRepository;

    return {
      deps: {meetingsRepository, conversationRepository, wallClock},
      updateMeetingMock,
      saveMeetingConversationFromBackend,
      safeGetConversationById,
      safeAddUsers,
      safeRemoveMembers,
      establishMeetingConversation,
    };
  };

  it('updates metadata, applies participant diff, and returns failedToAdd', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const charlie = createUser('3');
    const establishedConversation = createConversation(1);
    const {deps, updateMeetingMock, saveMeetingConversationFromBackend, safeRemoveMembers, safeAddUsers} = createDeps({
      safeGetConversationById: jest.fn().mockReturnValue(task.resolve(establishedConversation)),
    });

    const result = await updateMeeting(
      {
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [bob, charlie],
        },
        qualifiedConversation: maybe.just(qualifiedConversation),
        originalRecurrence: 'doesNotRepeat',
        originalSelectedUsers: [alice, bob],
      },
      deps,
    );

    expect(result.isOk).toBe(true);
    expect(updateMeetingMock).toHaveBeenCalledWith(meetingId, {
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
    });
    expect(saveMeetingConversationFromBackend).toHaveBeenCalledWith(meetingConversationResponse);
    expect(safeRemoveMembers).toHaveBeenCalledWith(establishedConversation, [alice.qualifiedId]);
    expect(safeAddUsers).toHaveBeenCalledWith(establishedConversation, [charlie]);
  });

  it('does not sync participants when the selection is unchanged', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const {deps, updateMeetingMock, safeGetConversationById, safeAddUsers, safeRemoveMembers} = createDeps();

    const result = await updateMeeting(
      {
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [alice, bob],
        },
        qualifiedConversation: maybe.just(qualifiedConversation),
        originalRecurrence: 'doesNotRepeat',
        originalSelectedUsers: [alice, bob],
      },
      deps,
    );

    expect(result.isOk).toBe(true);
    expect(updateMeetingMock).toHaveBeenCalled();
    expect(safeGetConversationById).not.toHaveBeenCalled();
    expect(safeRemoveMembers).not.toHaveBeenCalled();
    expect(safeAddUsers).not.toHaveBeenCalled();
  });

  it('returns missingTimes and does not call API', async () => {
    const {deps, updateMeetingMock} = createDeps();

    const result = await updateMeeting(
      {
        meetingId,
        formState: {
          ...formState,
          end: maybe.nothing(),
        },
        qualifiedConversation: maybe.just(qualifiedConversation),
        originalRecurrence: 'doesNotRepeat',
        originalSelectedUsers: [],
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
    expect(updateMeetingMock).not.toHaveBeenCalled();
  });

  it('returns updateFailed when updateMeeting fails', async () => {
    const {deps} = createDeps({
      updateMeetingMock: jest.fn().mockReturnValue(task.reject(new Error('network'))),
    });

    const result = await updateMeeting(
      {
        meetingId,
        formState,
        qualifiedConversation: maybe.just(qualifiedConversation),
        originalRecurrence: 'doesNotRepeat',
        originalSelectedUsers: [],
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.updateFailed);
  });

  it('returns removeParticipantsFailed when removeMembers fails', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const {deps, safeRemoveMembers} = createDeps({
      safeRemoveMembers: jest.fn().mockReturnValue(task.reject(new Error('remove failed'))),
    });

    const result = await updateMeeting(
      {
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [bob],
        },
        qualifiedConversation: maybe.just(qualifiedConversation),
        originalRecurrence: 'doesNotRepeat',
        originalSelectedUsers: [alice, bob],
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.removeParticipantsFailed);
    expect(safeRemoveMembers).toHaveBeenCalled();
  });

  it('returns addParticipantsFailed when addUsers fails', async () => {
    const alice = createUser('1');
    const charlie = createUser('3');
    const {deps, safeAddUsers} = createDeps({
      safeAddUsers: jest.fn().mockReturnValue(task.reject(new Error('add failed'))),
    });

    const result = await updateMeeting(
      {
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [alice, charlie],
        },
        qualifiedConversation: maybe.just(qualifiedConversation),
        originalRecurrence: 'doesNotRepeat',
        originalSelectedUsers: [alice],
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.addParticipantsFailed);
    expect(safeAddUsers).toHaveBeenCalled();
  });

  it('returns addParticipantsFailed when the conversation id is missing after metadata update', async () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const {deps, updateMeetingMock, safeGetConversationById} = createDeps();

    const result = await updateMeeting(
      {
        meetingId,
        formState: {
          ...formState,
          selectedUsers: [bob],
        },
        qualifiedConversation: maybe.nothing(),
        originalRecurrence: 'doesNotRepeat',
        originalSelectedUsers: [alice],
      },
      deps,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.addParticipantsFailed);
    expect(updateMeetingMock).toHaveBeenCalled();
    expect(safeGetConversationById).not.toHaveBeenCalled();
  });
});
