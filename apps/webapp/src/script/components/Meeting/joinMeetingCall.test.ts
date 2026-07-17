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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {STATE as CALL_STATE, CALL_TYPE, CONV_TYPE} from '@wireapp/avs';
import {task} from 'true-myth';

import {buildMediaDevicesHandler, createConversation, createSelfParticipant} from 'src/script/auth/util/test/testUtil';
import {joinMeetingCall, joinMeetingCallErrors, type JoinMeetingCallDeps} from 'Components/Meeting/joinMeetingCall';
import {unwrapErr} from 'Util/test/resultTestSupport';
import {Call} from 'Repositories/calling/Call';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {CallingViewModel} from 'src/script/view_model/CallingViewModel';

const qualifiedConversationId = {domain: 'example.com', id: 'meeting-conversation-id'};

const createMeetingConversation = (): Conversation =>
  createConversation(CONVERSATION_TYPE.REGULAR, CONVERSATION_PROTOCOL.MLS, qualifiedConversationId, 'meeting-group-id');

const createIncomingCall = (conversation: Conversation): Call => {
  const selfParticipant = createSelfParticipant();
  const call = new Call(
    {domain: 'caller.com', id: 'caller-id'},
    conversation,
    CONV_TYPE.CONFERENCE_MLS,
    selfParticipant,
    CALL_TYPE.NORMAL,
    buildMediaDevicesHandler(),
  );
  call.state(CALL_STATE.INCOMING);
  return call;
};

const createDeps = (overrides: Partial<JoinMeetingCallDeps> = {}): JoinMeetingCallDeps => {
  const conversation = createMeetingConversation();

  const conversationState = {
    findConversation: () => conversation,
  } as unknown as ConversationState;

  const conversationRepository = {
    safeGetConversationById: () => task.reject('not found'),
  } as unknown as ConversationRepository;

  const callingRepository = {
    findCall: () => undefined,
  } as unknown as CallingRepository;

  const callingViewModel = {
    callActions: {
      answer: async () => {},
      startAudio: async () => {},
    },
  } as unknown as CallingViewModel;

  return {
    conversationState,
    conversationRepository,
    callingRepository,
    callingViewModel,
    ...overrides,
  };
};

describe('joinMeetingCall', () => {
  it('starts an outgoing call when the meeting conversation is found locally and no incoming call exists', async () => {
    const startAudio = jest.fn(async () => {});
    const answer = jest.fn(async () => {});
    const deps = createDeps({
      callingViewModel: {
        callActions: {answer, startAudio},
      } as unknown as CallingViewModel,
    });

    const result = await joinMeetingCall(deps, qualifiedConversationId);

    expect(result.isOk).toBe(true);
    expect(startAudio).toHaveBeenCalledTimes(1);
    expect(answer).not.toHaveBeenCalled();
  });

  it('answers an incoming call when one exists in the meeting conversation', async () => {
    const conversation = createMeetingConversation();
    const incomingCall = createIncomingCall(conversation);
    const startAudio = jest.fn(async () => {});
    const answer = jest.fn(async () => {});

    const deps = createDeps({
      conversationState: {
        findConversation: () => conversation,
      } as unknown as ConversationState,
      callingRepository: {
        findCall: () => incomingCall,
      } as unknown as CallingRepository,
      callingViewModel: {
        callActions: {answer, startAudio},
      } as unknown as CallingViewModel,
    });

    const result = await joinMeetingCall(deps, qualifiedConversationId);

    expect(result.isOk).toBe(true);
    expect(answer).toHaveBeenCalledWith(incomingCall);
    expect(startAudio).not.toHaveBeenCalled();
  });

  it('fetches the conversation when it is not available locally', async () => {
    const conversation = createMeetingConversation();
    const startAudio = jest.fn(async () => {});
    const findConversation = jest.fn(() => undefined);
    const safeGetConversationById = jest.fn(() => task.resolve(conversation));

    const deps = createDeps({
      conversationState: {
        findConversation,
      } as unknown as ConversationState,
      conversationRepository: {
        safeGetConversationById,
      } as unknown as ConversationRepository,
      callingViewModel: {
        callActions: {answer: jest.fn(), startAudio},
      } as unknown as CallingViewModel,
    });

    const result = await joinMeetingCall(deps, qualifiedConversationId);

    expect(result.isOk).toBe(true);
    expect(findConversation).toHaveBeenCalledWith(qualifiedConversationId);
    expect(safeGetConversationById).toHaveBeenCalledWith(qualifiedConversationId);
    expect(startAudio).toHaveBeenCalledWith(conversation);
  });

  it('returns conversationNotFound when the conversation cannot be resolved', async () => {
    const deps = createDeps({
      conversationState: {
        findConversation: () => undefined,
      } as unknown as ConversationState,
      conversationRepository: {
        safeGetConversationById: () => task.reject('not found'),
      } as unknown as ConversationRepository,
    });

    const result = await joinMeetingCall(deps, qualifiedConversationId);

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(joinMeetingCallErrors.conversationNotFound);
  });

  it('returns joinFailed when startAudio rejects', async () => {
    const deps = createDeps({
      callingViewModel: {
        callActions: {
          answer: jest.fn(),
          startAudio: jest.fn(async () => {
            throw new Error('start failed');
          }),
        },
      } as unknown as CallingViewModel,
    });

    const result = await joinMeetingCall(deps, qualifiedConversationId);

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(joinMeetingCallErrors.joinFailed);
  });

  it('returns joinFailed when answer rejects', async () => {
    const conversation = createMeetingConversation();
    const incomingCall = createIncomingCall(conversation);

    const deps = createDeps({
      callingRepository: {
        findCall: () => incomingCall,
      } as unknown as CallingRepository,
      callingViewModel: {
        callActions: {
          answer: jest.fn(async () => {
            throw new Error('answer failed');
          }),
          startAudio: jest.fn(),
        },
      } as unknown as CallingViewModel,
    });

    const result = await joinMeetingCall(deps, qualifiedConversationId);

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(joinMeetingCallErrors.joinFailed);
  });
});
