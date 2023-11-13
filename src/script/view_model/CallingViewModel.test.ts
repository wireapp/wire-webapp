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

import {CALL_TYPE, STATE} from '@wireapp/avs';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {createUuid} from 'Util/uuid';

import {buildCall, buildCallingViewModel, callState, mockCallingRepository} from './CallingViewModel.mocks';

import {LEAVE_CALL_REASON} from '../calling/enum/LeaveCallReason';
import {Conversation} from '../entity/Conversation';

describe('CallingViewModel', () => {
  afterEach(() => {
    callState.calls.removeAll();
    jest.clearAllMocks();
  });

  describe('answerCall', () => {
    it('answers a call directly if no call is ongoing', async () => {
      const [callingViewModel] = buildCallingViewModel();
      const call = buildCall({id: 'conversation1', domain: ''});
      await callingViewModel.callActions.answer(call);
      expect(mockCallingRepository.answerCall).toHaveBeenCalledWith(call);
    });

    it('lets the user leave previous call before answering a new one', async () => {
      jest.useFakeTimers();
      const [callingViewModel] = buildCallingViewModel();
      const joinedCall = buildCall({id: 'conversation1', domain: ''});
      joinedCall.state(STATE.MEDIA_ESTAB);
      callState.calls.push(joinedCall);

      jest.spyOn(PrimaryModal, 'show').mockImplementation((_, payload) => payload.primaryAction?.action?.());
      const newCall = buildCall({id: 'conversation2', domain: ''});
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
      const [callingViewModel] = buildCallingViewModel();
      const conversation = new Conversation(createUuid());
      await callingViewModel.callActions.startAudio(conversation);
      expect(mockCallingRepository.startCall).toHaveBeenCalledWith(conversation, CALL_TYPE.NORMAL);
    });

    it('lets the user leave previous call before starting a new one', async () => {
      jest.useFakeTimers();
      const [callingViewModel] = buildCallingViewModel();
      const joinedCall = buildCall({id: 'conversation1', domain: ''});
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

  describe('MLS conference call', () => {
    beforeAll(() => {
      jest.useRealTimers();
    });
  });
});
