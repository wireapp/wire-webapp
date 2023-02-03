/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';

import {CALL_TYPE, CONV_TYPE, STATE} from '@wireapp/avs';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {createRandomUuid} from 'Util/util';

import {CallingViewModel} from './CallingViewModel';

import {Call} from '../calling/Call';
import {CallingRepository} from '../calling/CallingRepository';
import {CallState} from '../calling/CallState';
import {LEAVE_CALL_REASON} from '../calling/enum/LeaveCallReason';
import {Conversation} from '../entity/Conversation';

const mockCallingRepository = {
  startCall: jest.fn(),
  answerCall: jest.fn(),
  leaveCall: jest.fn(),
  onIncomingCall: jest.fn(),
  onRequestClientsCallback: jest.fn(),
  onLeaveCall: jest.fn(),
} as unknown as CallingRepository;

const callState = new CallState();

function buildCall(conversationId: string) {
  return new Call(
    {id: 'user1', domain: ''},
    {id: conversationId, domain: ''},
    CONV_TYPE.ONEONONE,
    {} as any,
    CALL_TYPE.NORMAL,
    {currentAvailableDeviceId: {audioOutput: ko.observable()}} as any,
  );
}

function buildCallingViewModel() {
  return new CallingViewModel(
    mockCallingRepository,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    undefined,
    callState,
  );
}

describe('CallingViewModel', () => {
  afterEach(() => {
    callState.calls.removeAll();
    jest.clearAllMocks();
  });

  describe('answerCall', () => {
    it('answers a call directly if no call is ongoing', async () => {
      const callingViewModel = buildCallingViewModel();
      const call = buildCall('conversation1');
      await callingViewModel.callActions.answer(call);
      expect(mockCallingRepository.answerCall).toHaveBeenCalledWith(call);
    });

    it('lets the user leave previous call before answering a new one', async () => {
      jest.useFakeTimers();
      const callingViewModel = buildCallingViewModel();
      const joinedCall = buildCall('conversation1');
      joinedCall.state(STATE.MEDIA_ESTAB);
      callState.calls.push(joinedCall);

      jest.spyOn(PrimaryModal, 'show').mockImplementation((_, payload) => payload.primaryAction?.action?.());
      const newCall = buildCall('conversation2');
      Promise.resolve().then(() => {
        jest.runAllTimers();
      });
      await callingViewModel.callActions.answer(newCall);
      expect(mockCallingRepository.leaveCall).toHaveBeenCalledWith(
        joinedCall.conversationId,
        LEAVE_CALL_REASON.MANUAL_LEAVE_TO_JOIN_ANOTHER_CALL,
      );
      expect(mockCallingRepository.answerCall).toHaveBeenCalledWith(newCall);
    });
  });

  describe('startCall', () => {
    it('starts a call directly if no call is ongoing', async () => {
      const callingViewModel = buildCallingViewModel();
      const conversation = new Conversation(createRandomUuid());
      await callingViewModel.callActions.startAudio(conversation);
      expect(mockCallingRepository.startCall).toHaveBeenCalledWith(conversation, CALL_TYPE.NORMAL);
    });

    it('lets the user leave previous call before starting a new one', async () => {
      jest.useFakeTimers();
      const callingViewModel = buildCallingViewModel();
      const joinedCall = buildCall('conversation1');
      joinedCall.state(STATE.MEDIA_ESTAB);
      callState.calls.push(joinedCall);

      jest.spyOn(PrimaryModal, 'show').mockImplementation((_, payload) => payload.primaryAction?.action?.());
      const conversation = new Conversation('conversation2');
      Promise.resolve().then(() => {
        jest.runAllTimers();
      });
      await callingViewModel.callActions.startAudio(conversation);
      expect(mockCallingRepository.leaveCall).toHaveBeenCalledWith(
        joinedCall.conversationId,
        LEAVE_CALL_REASON.MANUAL_LEAVE_TO_JOIN_ANOTHER_CALL,
      );
      expect(mockCallingRepository.startCall).toHaveBeenCalledWith(conversation, CALL_TYPE.NORMAL);
    });
  });
});
