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
import {task} from 'true-myth';

import type {JoinMeetingCallDeps} from 'Components/meeting/joinMeetingCall';
import {joinPreparedMeeting} from 'Components/meeting/meetingPrep/joinPreparedMeeting';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import {createConversation} from 'src/script/auth/util/test/testUtil';
import type {CallingViewModel} from 'src/script/view_model/CallingViewModel';
import {translateForTest} from 'Util/test/translateForTest';

const qualifiedConversationId = {domain: 'example.com', id: 'meeting-conversation-id'};
const media = {cameraEnabled: false, microphoneEnabled: true};

const callNotEstablishedCopy = {
  description: 'offline',
  descriptionPoints: ['one', 'two', 'three'] as [string, string, string],
  title: 'not established',
  translate: translateForTest,
};

const createDeps = (startAudio: jest.Mock): JoinMeetingCallDeps => {
  const conversation = createConversation(
    CONVERSATION_TYPE.REGULAR,
    CONVERSATION_PROTOCOL.MLS,
    qualifiedConversationId,
    'meeting-group-id',
  );

  return {
    conversationState: {findConversation: () => conversation} as unknown as ConversationState,
    conversationRepository: {
      safeGetConversationById: () => task.reject('not found'),
      safeEnsureConversationExists: () => task.resolve(undefined),
    } as unknown as ConversationRepository,
    callingRepository: {findCall: () => undefined} as unknown as CallingRepository,
    callingViewModel: {
      callActions: {answer: jest.fn(), startAudio},
    } as unknown as CallingViewModel,
  };
};

describe('joinPreparedMeeting', () => {
  it('starts the call with the chosen camera and microphone', async () => {
    const startAudio = jest.fn().mockResolvedValue(undefined);

    const joined = await joinPreparedMeeting({
      deps: createDeps(startAudio),
      qualifiedConversationId,
      media,
      guardCall: startCall => startCall(),
      translate: translateForTest,
      callNotEstablishedCopy,
    });

    expect(joined).toBe(true);
    expect(startAudio).toHaveBeenCalledWith(expect.anything(), media);
  });

  it('does not start the call when the internet guard blocks it', async () => {
    const startAudio = jest.fn();

    const joined = await joinPreparedMeeting({
      deps: createDeps(startAudio),
      qualifiedConversationId,
      media,
      guardCall: () => undefined,
      translate: translateForTest,
      callNotEstablishedCopy,
    });

    expect(joined).toBe(false);
    expect(startAudio).not.toHaveBeenCalled();
  });
});
