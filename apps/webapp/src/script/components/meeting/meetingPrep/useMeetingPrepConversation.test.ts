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

import {act, renderHook} from '@testing-library/react';
import {CALL_TYPE, CONV_TYPE, STATE as CALL_STATE} from '@wireapp/avs';
import {Maybe} from 'true-myth';
import {container} from 'tsyringe';

import {useMeetingPrepConversation} from './useMeetingPrepConversation';

import {CONVERSATION_PROTOCOL} from '../../../apiClient/team/feature/featureList.types';
import {buildMediaDevicesHandler} from '../../../auth/util/test/testUtil';
import {Call} from '../../../repositories/calling/Call';
import {CallState} from '../../../repositories/calling/CallState';
import {Participant} from '../../../repositories/calling/Participant';
import {ConversationState} from '../../../repositories/conversation/ConversationState';
import {Conversation} from '../../../repositories/entity/Conversation';
import {User} from '../../../repositories/entity/User';
import {UserState} from '../../../repositories/user/userState';
import {translateForTest} from '../../../util/test/translateForTest';

const meetingConversationId = {id: 'meeting-conversation', domain: 'wire.test'};

const createUser = (id: string): User => {
  return new User(id, 'wire.test', translateForTest);
};

const createMeetingConversation = (participants: readonly User[]): Conversation => {
  const conversation = new Conversation(
    meetingConversationId.id,
    meetingConversationId.domain,
    CONVERSATION_PROTOCOL.PROTEUS,
    translateForTest,
  );
  conversation.participating_user_ets([...participants]);
  return conversation;
};

const createCall = (conversation: Conversation): Call => {
  return new Call(
    {id: 'caller', domain: 'wire.test'},
    conversation,
    CONV_TYPE.CONFERENCE,
    new Participant(createUser('self'), 'self-device'),
    CALL_TYPE.NORMAL,
    buildMediaDevicesHandler(),
  );
};

describe('useMeetingPrepConversation', () => {
  const conversationState = container.resolve(ConversationState);
  const callState = container.resolve(CallState);
  const userState = container.resolve(UserState);
  const selfUser = createUser('self');

  beforeEach(() => {
    userState.self(selfUser);
    selfUser.isTemporaryGuest(false);
  });

  afterEach(() => {
    conversationState.conversations.removeAll();
    callState.calls.removeAll();
  });

  it('lists the user first, then the other participants', () => {
    const ada = createUser('ada');
    conversationState.conversations.push(createMeetingConversation([ada]));

    const {result} = renderHook(() => {
      return useMeetingPrepConversation(Maybe.just(meetingConversationId));
    });

    expect(result.current.invitees).toEqual([selfUser, ada]);
    expect(result.current.isCallInProgress).toBe(false);
  });

  it('picks up the conversation when it arrives after the green room opened', () => {
    const conversationIdentifier = Maybe.just(meetingConversationId);
    const {result} = renderHook(() => {
      return useMeetingPrepConversation(conversationIdentifier);
    });
    expect(result.current.invitees).toEqual([]);

    const ada = createUser('ada');
    act(() => {
      conversationState.conversations.push(createMeetingConversation([ada]));
    });

    expect(result.current.invitees).toEqual([selfUser, ada]);
  });

  it('follows participants who join the conversation later', () => {
    const conversation = createMeetingConversation([]);
    conversationState.conversations.push(conversation);
    const conversationIdentifier = Maybe.just(meetingConversationId);
    const {result} = renderHook(() => {
      return useMeetingPrepConversation(conversationIdentifier);
    });

    const bo = createUser('bo');
    act(() => {
      conversation.participating_user_ets.push(bo);
    });

    expect(result.current.invitees).toEqual([selfUser, bo]);
  });

  it('shows no invitees to a temporary guest', () => {
    selfUser.isTemporaryGuest(true);
    conversationState.conversations.push(createMeetingConversation([createUser('ada')]));

    const {result} = renderHook(() => {
      return useMeetingPrepConversation(Maybe.just(meetingConversationId));
    });

    expect(result.current.invitees).toEqual([]);
  });

  it('shows nothing while no meeting is open', () => {
    conversationState.conversations.push(createMeetingConversation([createUser('ada')]));

    const {result} = renderHook(() => {
      return useMeetingPrepConversation(Maybe.nothing());
    });

    expect(result.current).toEqual({isCallInProgress: false, invitees: []});
  });

  it('follows the meeting call as it starts and ends', () => {
    const conversation = createMeetingConversation([]);
    conversationState.conversations.push(conversation);
    const {result} = renderHook(() => {
      return useMeetingPrepConversation(Maybe.just(meetingConversationId));
    });
    expect(result.current.isCallInProgress).toBe(false);

    const call = createCall(conversation);
    act(() => {
      call.state(CALL_STATE.INCOMING);
      callState.calls.push(call);
    });
    expect(result.current.isCallInProgress).toBe(true);

    act(() => {
      call.state(CALL_STATE.TERM_REMOTE);
    });
    expect(result.current.isCallInProgress).toBe(false);
  });

  it('settles when the caller builds a new Maybe on every render', () => {
    conversationState.conversations.push(createMeetingConversation([createUser('ada')]));
    let renders = 0;

    renderHook(() => {
      renders++;
      return useMeetingPrepConversation(Maybe.just({...meetingConversationId}));
    });

    expect(renders).toBeLessThan(5);
  });
});
