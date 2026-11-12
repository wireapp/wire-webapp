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

import {act, ReactNode} from 'react';

import {render, waitFor} from '@testing-library/react';

import {CALL_TYPE, STATE as CALL_STATE} from '@wireapp/avs';

import {Call} from '../../../repositories/calling/Call';
import {CallingRepository} from '../../../repositories/calling/CallingRepository';
import {Participant} from '../../../repositories/calling/Participant';
import {Conversation} from '../../../repositories/entity/Conversation';
import {User} from '../../../repositories/entity/User';
import {PropertiesRepository} from '../../../repositories/properties/propertiesRepository';
import {TeamState} from '../../../repositories/team/TeamState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
  requireValueForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {CallActions} from '../../../view_model/CallingViewModel';
import {createUuid} from '../../../util/uuid';

import {CallingCell, CallingCellProps} from './CallingCell';

import {buildMediaDevicesHandler} from '../../../auth/util/test/testUtil';
import {translateForTest} from '../../../util/test/translateForTest';
import {CONVERSATION_PROTOCOL} from '../../../apiClient/team/feature/featureList.types';

const mockCallAlertState = {
  clearShowAlert: jest.fn(),
  showAlert: false,
};

jest.mock('../useCallAlertState', () => {
  return {
    useCallAlertState: jest.fn(() => {
      return mockCallAlertState;
    }),
  };
});

jest.mock('../../inViewport', () => {
  return {
    InViewport: ({onVisible, children}: {onVisible: () => void; children: ReactNode}) => {
      require('react').useEffect(() => {
        onVisible();
      }, [onVisible]);

      return <div>{children}</div>;
    },
    __esModule: true,
  };
});

const createCall = (
  state: CALL_STATE,
  selfUser = new User(createUuid(), '', translateForTest),
  selfClientId = createUuid(),
): Call => {
  const selfParticipant = new Participant(selfUser, selfClientId);
  const call = new Call(
    {domain: '', id: ''},
    new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
    0,
    selfParticipant,
    CALL_TYPE.NORMAL,
    buildMediaDevicesHandler(),
  );
  call.state(state);
  return call;
};

const createProps = async (): Promise<CallingCellProps> => {
  const mockCallingRepository: Partial<CallingRepository> = {
    sendModeratorMute: jest.fn(),
    supportsScreenSharing: true,
  };

  const mockTeamState = new TeamState();
  jest.spyOn(mockTeamState, 'isExternal').mockReturnValue(false);

  const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  conversation.participating_user_ets([new User('id', '', translateForTest)]);
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
  const rootContextValue = createRootContextValueForTest({translate: translateForTest});
  const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

  beforeEach(() => {
    mockCallAlertState.clearShowAlert.mockClear();
  });

  it('displays an incoming ringing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.INCOMING);
    const {container} = render(<CallingCell {...props} />, {wrapper: rootProviderWrapper});

    const acceptButton = container.querySelector('[data-uie-name="do-call-controls-call-accept"]');
    const declineButton = container.querySelector('[data-uie-name="do-call-controls-call-decline"]');

    expect(acceptButton).not.toBeNull();
    expect(declineButton).not.toBeNull();
  });

  it('displays an outgoing ringing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.OUTGOING);

    const {getByTestId} = render(<CallingCell {...props} />, {wrapper: rootProviderWrapper});

    expect(getByTestId('call-label-outgoing')).not.toBeNull();
  });

  it('displays a call that is connecting', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.ANSWERED);

    const {container} = render(<CallingCell {...props} />, {wrapper: rootProviderWrapper});

    const connectingLabel = container.querySelector('[data-uie-name="call-label-connecting"]');
    expect(connectingLabel).not.toBeNull();
  });

  it('displays the running time of an ongoing call', async () => {
    const props = await createProps();
    props.call.state(CALL_STATE.MEDIA_ESTAB);

    const {getByText, rerender, container} = render(<CallingCell {...props} />, {wrapper: rootProviderWrapper});

    jest.useFakeTimers();
    const now = Date.now();
    jest.setSystemTime(now);
    act(() => {
      props.call.startedAt(now);
      rerender(<CallingCell {...props} />);
    });

    await waitFor(() => {
      return getByText('00:00');
    });

    const callDuration = container.querySelector('[data-uie-name="call-duration"]');

    expect(callDuration).not.toBeNull();
    const callDurationElement = requireValueForTest(callDuration);
    expect(callDurationElement.textContent).toBe('00:00');
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(callDurationElement.textContent).toBe('00:10');
    jest.useRealTimers();
  });
});
