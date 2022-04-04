/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {act} from 'react-dom/test-utils';
import ko from 'knockout';
import {STATE as CALL_STATE, CALL_TYPE} from '@wireapp/avs';

import {createRandomUuid} from 'Util/util';
import TestPage from 'Util/test/TestPage';

import {Call} from 'src/script/calling/Call';
import {Participant} from 'src/script/calling/Participant';
import {Conversation} from 'src/script/entity/Conversation';
import ConversationListCallingCell, {CallingCellProps} from './ConversationListCallingCell';
import {User} from 'src/script/entity/User';
import {MediaDevicesHandler} from 'src/script/media/MediaDevicesHandler';
import {CallActions} from 'src/script/view_model/CallingViewModel';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {TeamState} from 'src/script/team/TeamState';

class ConversationListCallingCellPage extends TestPage<CallingCellProps> {
  constructor(props?: CallingCellProps) {
    super(ConversationListCallingCell, props);
  }

  getAcceptButton = () => this.get('[data-uie-name="do-call-controls-call-accept"]');
  getDeclineButton = () => this.get('[data-uie-name="do-call-controls-call-decline"]');
  getOutgoingLabel = () => this.get('[data-uie-name="call-label-outgoing"]');
  getConnectingLabel = () => this.get('[data-uie-name="call-label-connecting"]');
  getCallDuration = () => this.get('[data-uie-name="call-duration"]');
}

const createCall = (
  state: CALL_STATE,
  selfUser = new User(createRandomUuid(), null),
  selfClientId = createRandomUuid(),
) => {
  const selfParticipant = new Participant(selfUser, selfClientId);
  const call = new Call({domain: '', id: ''}, {domain: '', id: ''}, 0, selfParticipant, CALL_TYPE.NORMAL, {
    currentAvailableDeviceId: {
      audioOutput: ko.pureComputed(() => 'test'),
    },
  } as MediaDevicesHandler);
  call.state(state);
  return call;
};

const createProps = async () => {
  const mockCallingRepository: Partial<CallingRepository> = {
    sendModeratorMute: jest.fn(),
    supportsScreenSharing: true,
  };

  const mockTeamState = new TeamState();
  jest.spyOn(mockTeamState, 'isExternal').mockReturnValue(false);

  const conversation = new Conversation();
  conversation.participating_user_ets([new User('id', null)]);
  return {
    call: createCall(CALL_STATE.MEDIA_ESTAB),
    callActions: {} as CallActions,
    callingRepository: mockCallingRepository,
    conversation,
    hasAccessToCamera: true,
    isSelfVerified: true,
    multitasking: {isMinimized: ko.observable(false)},
    teamState: mockTeamState,
    videoGrid: {grid: [], thumbnail: undefined},
  } as CallingCellProps;
};

describe('ConversationListCallingCell', () => {
  it('displays an incoming ringing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.INCOMING);
    const callingCellPage = new ConversationListCallingCellPage(props);

    expect(callingCellPage.getAcceptButton().exists()).toBe(true);
    expect(callingCellPage.getDeclineButton().exists()).toBe(true);
  });

  it('displays an outgoing ringing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.OUTGOING);
    const callingCellPage = new ConversationListCallingCellPage(props);

    expect(callingCellPage.getOutgoingLabel().exists()).toBe(true);
  });

  it('displays a call that is connecting', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.ANSWERED);
    const callingCellPage = new ConversationListCallingCellPage(props);

    expect(callingCellPage.getConnectingLabel().exists()).toBe(true);
  });

  it('displays the running time of an ongoing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.MEDIA_ESTAB);
    const callingCellPage = new ConversationListCallingCellPage(props);
    jest.useFakeTimers('modern');
    const now = Date.now();
    jest.setSystemTime(now);
    act(() => {
      props.call.startedAt(now);
    });
    callingCellPage.setProps(props);

    expect(callingCellPage.getCallDuration().text()).toBe('00:00');
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(callingCellPage.getCallDuration().text()).toBe('00:10');
    jest.useRealTimers();
  });
});
