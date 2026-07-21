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
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {task} from 'true-myth';

import type {MeetingServiceDeps} from 'Components/Meeting/meetingStore/meetingStoreDeps';
import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrapErr} from 'Util/test/resultTestSupport';

import {deleteMeetingForAll, deleteMeetingForMe} from './deleteMeeting';

const meetingId = {id: 'meeting-id', domain: 'example.com'};
const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};
const command = {meetingId, qualifiedConversation};

const wallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: Date.parse('2026-06-15T13:00:00.000Z'),
});

const createUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  return user;
};

const hostUser = createUser('host-id');
const inviteeUser = createUser('invitee-id');

const createConversation = () => {
  const conversation = new Conversation(
    qualifiedConversation.id,
    qualifiedConversation.domain,
    CONVERSATION_PROTOCOL.MLS,
    translateForTest,
  );
  conversation.groupId = 'group-id';
  conversation.participating_user_ets([hostUser, inviteeUser]);
  return conversation;
};

const createDeps = ({
  safeGetConversationById = jest.fn().mockReturnValue(task.resolve(createConversation())),
  safeRemoveMembers = jest.fn().mockReturnValue(task.resolve(undefined)),
  leaveConversation = jest.fn().mockResolvedValue(undefined),
  deleteConversationLocally = jest.fn().mockResolvedValue(undefined),
  deleteMeeting = jest.fn().mockReturnValue(task.resolve(undefined)),
  findCall = jest.fn().mockReturnValue(undefined),
  leaveCall = jest.fn(),
}: {
  safeGetConversationById?: jest.Mock;
  safeRemoveMembers?: jest.Mock;
  leaveConversation?: jest.Mock;
  deleteConversationLocally?: jest.Mock;
  deleteMeeting?: jest.Mock;
  findCall?: jest.Mock;
  leaveCall?: jest.Mock;
} = {}): {
  deps: MeetingServiceDeps;
  leaveCall: jest.Mock;
  leaveConversation: jest.Mock;
  deleteConversationLocally: jest.Mock;
  safeRemoveMembers: jest.Mock;
  deleteMeeting: jest.Mock;
} => {
  const conversationRepository = {
    safeGetConversationById,
    safeRemoveMembers,
    leaveConversation,
    deleteConversationLocally,
  } as unknown as ConversationRepository;

  const callingRepository = {
    findCall,
    leaveCall,
  } as unknown as CallingRepository;

  const meetingsRepository = {
    deleteMeeting,
  } as unknown as MeetingsRepository;

  return {
    deps: {conversationRepository, callingRepository, meetingsRepository, wallClock},
    leaveCall,
    leaveConversation,
    deleteConversationLocally,
    safeRemoveMembers,
    deleteMeeting,
  };
};

describe('deleteMeetingForMe', () => {
  it('leaves the call before leaving the conversation when in a call', async () => {
    const leaveConversation = jest.fn().mockResolvedValue(undefined);
    const leaveCall = jest.fn();
    const callOrder: string[] = [];

    leaveCall.mockImplementation(() => {
      callOrder.push('leaveCall');
    });
    leaveConversation.mockImplementation(async () => {
      callOrder.push('leaveConversation');
    });

    const {deps} = createDeps({
      findCall: jest.fn().mockReturnValue({}),
      leaveCall,
      leaveConversation,
    });

    const result = await deleteMeetingForMe(command, deps);

    expect(result.isOk).toBe(true);
    expect(callOrder).toEqual(['leaveCall', 'leaveConversation']);
  });

  it('skips leaveCall when not in a call', async () => {
    const leaveCall = jest.fn();
    const {deps} = createDeps({leaveCall});

    const result = await deleteMeetingForMe(command, deps);

    expect(result.isOk).toBe(true);
    expect(leaveCall).not.toHaveBeenCalled();
  });
});

describe('deleteMeetingForAll', () => {
  it('removes other participants, deletes the meeting, then removes the conversation locally', async () => {
    const {deps, safeRemoveMembers, deleteConversationLocally, deleteMeeting} = createDeps();

    const result = await deleteMeetingForAll(command, hostUser, deps);

    expect(result.isOk).toBe(true);
    expect(safeRemoveMembers).toHaveBeenCalledWith(expect.any(Conversation), [inviteeUser.qualifiedId]);
    expect(deleteMeeting).toHaveBeenCalledWith(meetingId);
    expect(deleteConversationLocally).toHaveBeenCalledWith(qualifiedConversation, true);
  });

  it('leaves the call before deleting when in a call', async () => {
    const leaveCall = jest.fn();
    const callOrder: string[] = [];
    const deleteMeeting = jest.fn().mockImplementation(() => {
      callOrder.push('deleteMeeting');
      return task.resolve(undefined);
    });
    leaveCall.mockImplementation(() => {
      callOrder.push('leaveCall');
    });

    const {deps} = createDeps({
      findCall: jest.fn().mockReturnValue({}),
      leaveCall,
      deleteMeeting,
    });

    const result = await deleteMeetingForAll(command, hostUser, deps);

    expect(result.isOk).toBe(true);
    expect(callOrder).toEqual(['leaveCall', 'deleteMeeting']);
  });

  it('calls deleteMeeting before removing the conversation locally', async () => {
    const callOrder: string[] = [];
    const deleteMeeting = jest.fn().mockImplementation(() => {
      callOrder.push('deleteMeeting');
      return task.resolve(undefined);
    });
    const deleteConversationLocally = jest.fn().mockImplementation(async () => {
      callOrder.push('deleteConversationLocally');
    });

    const {deps} = createDeps({deleteMeeting, deleteConversationLocally});

    const result = await deleteMeetingForAll(command, hostUser, deps);

    expect(result.isOk).toBe(true);
    expect(callOrder).toEqual(['deleteMeeting', 'deleteConversationLocally']);
  });

  it('returns removeParticipantsFailed when removing invitees fails', async () => {
    const {deps} = createDeps({
      safeRemoveMembers: jest.fn().mockReturnValue(task.reject(new Error('remove failed'))),
    });

    const result = await deleteMeetingForAll(command, hostUser, deps);

    expect(unwrapErr(result)).toBe(meetingSubmitErrors.removeParticipantsFailed);
  });

  it('does not remove the conversation locally when deleteMeeting fails', async () => {
    const deleteConversationLocally = jest.fn().mockResolvedValue(undefined);
    const {deps} = createDeps({
      deleteConversationLocally,
      deleteMeeting: jest.fn().mockReturnValue(task.reject(new Error('delete failed'))),
    });

    const result = await deleteMeetingForAll(command, hostUser, deps);

    expect(unwrapErr(result)).toBe(meetingSubmitErrors.deleteFailed);
    expect(deleteConversationLocally).not.toHaveBeenCalled();
  });
});
