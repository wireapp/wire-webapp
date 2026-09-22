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

import {STATE} from '@wireapp/avs';
import {GROUP_CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {LEAVE_CALL_REASON} from 'Repositories/calling/enum/LeaveCallReason';
import {Conversation} from 'Repositories/entity/Conversation';
import {type Translate} from 'Util/localizerUtil';
import {createUuid} from 'Util/uuid';

import {
  buildCall,
  buildCallingViewModel,
  callState,
  mockAudioRepository,
  mockCallingRepository,
} from './CallingViewModel.mocks';
import {AudioType} from 'Repositories/audio/audioType';
import {translateForTest} from 'Util/test/translateForTest';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

describe('CallingViewModel', () => {
  const originalPrimaryModalShow = PrimaryModal.show;

  afterEach(() => {
    callState.calls.removeAll();
    PrimaryModal.show = originalPrimaryModalShow;
    (mockCallingRepository.startCall as jest.Mock).mockReset();
    (mockAudioRepository.loop as jest.Mock).mockClear();
    jest.clearAllMocks();
  });

  describe('answerCall', () => {
    it('answers a call directly if no call is ongoing', async () => {
      const [callingViewModel] = buildCallingViewModel(translateForTest);
      const conversation = new Conversation('conversation1', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
      const call = buildCall(conversation);
      await callingViewModel.callActions.answer(call);
      expect(mockCallingRepository.answerCall).toHaveBeenCalledWith(call);
    });

    it('lets the user leave previous call before answering a new one', async () => {
      jest.useFakeTimers();
      const [callingViewModel] = buildCallingViewModel(translateForTest);
      const joinedCall = buildCall(
        new Conversation('conversation1', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      );
      joinedCall.state(STATE.MEDIA_ESTAB);
      callState.calls.push(joinedCall);

      jest.spyOn(PrimaryModal, 'show').mockImplementation((_, payload) => payload.primaryAction?.action?.());
      const newCall = buildCall(new Conversation('conversation2', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest));
      Promise.resolve().then(() => {
        jest.runAllTimers();
      });
      await callingViewModel.callActions.answer(newCall);
      expect(mockCallingRepository.leaveCall).toHaveBeenCalledWith(
        joinedCall.conversation.qualifiedId,
        LEAVE_CALL_REASON.MANUAL_LEAVE_TO_JOIN_ANOTHER_CALL,
      );
      expect(mockCallingRepository.answerCall).toHaveBeenCalledWith(newCall);
    });
  });

  describe('startCall', () => {
    it('starts a call directly if no call is ongoing', async () => {
      const [callingViewModel] = buildCallingViewModel(translateForTest);
      const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
      await callingViewModel.callActions.startAudio(conversation);
      expect(mockCallingRepository.startCall).toHaveBeenCalledWith(conversation);
    });

    it('does not ring for a scheduled meeting call', async () => {
      const [callingViewModel] = buildCallingViewModel(translateForTest);
      const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.MLS, translateForTest);
      conversation.groupConversationType(GROUP_CONVERSATION_TYPE.MEETING);
      const call = buildCall(conversation);
      (mockCallingRepository.startCall as jest.Mock).mockResolvedValue(call);

      await callingViewModel.callActions.startAudio(conversation);

      expect(mockAudioRepository.loop).not.toHaveBeenCalled();
    });

    it('rings for a regular call', async () => {
      const [callingViewModel] = buildCallingViewModel(translateForTest);
      const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
      const call = buildCall(conversation);
      call.state(STATE.OUTGOING);
      (mockCallingRepository.startCall as jest.Mock).mockResolvedValue(call);

      await callingViewModel.callActions.startAudio(conversation);

      expect(mockAudioRepository.loop).toHaveBeenCalledWith(AudioType.OUTGOING_CALL);
    });

    it('lets the user leave previous call before starting a new one', async () => {
      jest.useFakeTimers();
      const [callingViewModel] = buildCallingViewModel(translateForTest);
      const joinedCall = buildCall(
        new Conversation('conversation1', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      );
      joinedCall.state(STATE.MEDIA_ESTAB);
      callState.calls.push(joinedCall);

      jest.spyOn(PrimaryModal, 'show').mockImplementation((_, payload) => payload.primaryAction?.action?.());
      const conversation = new Conversation('conversation2', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
      Promise.resolve().then(() => {
        jest.runAllTimers();
      });
      await callingViewModel.callActions.startAudio(conversation);
      expect(mockCallingRepository.leaveCall).toHaveBeenCalledWith(
        joinedCall.conversation.qualifiedId,
        LEAVE_CALL_REASON.MANUAL_LEAVE_TO_JOIN_ANOTHER_CALL,
      );
      expect(mockCallingRepository.startCall).toHaveBeenCalledWith(conversation);
    });
  });

  describe('MLS conference call', () => {
    beforeAll(() => {
      jest.useRealTimers();
    });

    it('uses the injected translate function for second-call warning copy', () => {
      const translate = jest.fn(
        (translationKey: Parameters<Translate>[0]) => `translated:${translationKey}`,
      ) as Translate;
      const [callingViewModel] = buildCallingViewModel(translate);
      const joinedCall = buildCall(
        new Conversation('conversation1', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      );
      const primaryModalShow = jest.fn();

      joinedCall.state(STATE.MEDIA_ESTAB);
      callState.calls.push(joinedCall);
      PrimaryModal.show = primaryModalShow;

      void callingViewModel.callActions.startAudio(
        new Conversation('conversation2', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      );

      expect(translate).toHaveBeenCalledWith('modalCallSecondOutgoingAction');
      expect(translate).toHaveBeenCalledWith('modalCallSecondOutgoingMessage');
      expect(translate).toHaveBeenCalledWith('modalCallSecondOutgoingHeadline');
      expect(primaryModalShow).toHaveBeenCalledWith(
        PrimaryModal.type.CONFIRM,
        expect.objectContaining({
          primaryAction: expect.objectContaining({text: 'translated:modalCallSecondOutgoingAction'}),
          text: expect.objectContaining({
            message: 'translated:modalCallSecondOutgoingMessage',
            title: 'translated:modalCallSecondOutgoingHeadline',
          }),
        }),
        undefined,
        translate,
      );
    });
  });
});
