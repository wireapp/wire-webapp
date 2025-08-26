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

import {render, waitFor} from '@testing-library/react';
import ko from 'knockout';
import {act} from 'react-dom/test-utils';

import {CALL_TYPE, STATE as CALL_STATE} from '@wireapp/avs';

import {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {Participant} from 'Repositories/calling/Participant';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {CallActions} from 'src/script/view_model/CallingViewModel';
import {createUuid} from 'Util/uuid';

import {CallingCell, CallingCellProps} from './CallingCell';

jest.mock('@wireapp/api-client/lib/team');

jest.mock('Components/InViewport', () => ({
  InViewport: ({onVisible, children}: {onVisible: () => void; children: any}) => {
    setTimeout(onVisible);
    return <div>{children}</div>;
  },
  __esModule: true,
}));

const createCall = (state: CALL_STATE, selfUser = new User(createUuid()), selfClientId = createUuid()) => {
  const selfParticipant = new Participant(selfUser, selfClientId);
  const call = new Call({domain: '', id: ''}, new Conversation('', ''), 0, selfParticipant, CALL_TYPE.NORMAL, {
    currentAvailableDeviceId: {
      audiooutput: ko.pureComputed(() => 'test'),
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
  conversation.participating_user_ets([new User('id')]);
  return {
    call: createCall(CALL_STATE.MEDIA_ESTAB),
    callActions: {} as CallActions,
    callingRepository: mockCallingRepository as CallingRepository,
    propertiesRepository: {
      getPreference: jest.fn(),
    } as unknown as PropertiesRepository,
    conversation,
    hasAccessToCamera: true,
    teamState: mockTeamState,
    videoGrid: {grid: [], thumbnail: undefined},
  } as CallingCellProps;
};

describe('ConversationListCallingCell', () => {
  it('displays an incoming ringing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.INCOMING);
    const {container} = render(<CallingCell {...props} />);

    const acceptButton = container.querySelector('[data-uie-name="do-call-controls-call-accept"]');
    const declineButton = container.querySelector('[data-uie-name="do-call-controls-call-decline"]');

    expect(acceptButton).not.toBeNull();
    expect(declineButton).not.toBeNull();
  });

  it('displays an outgoing ringing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.OUTGOING);

    const {getByTestId} = render(<CallingCell {...props} />);

    expect(getByTestId('call-label-outgoing')).not.toBeNull();
  });

  it('displays a call that is connecting', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.ANSWERED);

    const {container} = render(<CallingCell {...props} />);

    const connectingLabel = container.querySelector('[data-uie-name="call-label-connecting"]');
    expect(connectingLabel).not.toBeNull();
  });

  it('displays the running time of an ongoing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.MEDIA_ESTAB);

    const {getByText, rerender, container} = render(<CallingCell {...props} />);

    jest.useFakeTimers();
    const now = Date.now();
    jest.setSystemTime(now);
    act(() => {
      props.call.startedAt(now);
      rerender(<CallingCell {...props} />);
    });

    await waitFor(() => getByText('00:00'));

    const callDuration = container.querySelector('[data-uie-name="call-duration"]');

    expect(callDuration).not.toBeNull();
    expect(callDuration!.textContent).toBe('00:00');
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(callDuration!.textContent).toBe('00:10');
    jest.useRealTimers();
  });
});
