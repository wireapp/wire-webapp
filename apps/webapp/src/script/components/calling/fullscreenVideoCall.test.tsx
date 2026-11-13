/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {act, render, waitFor} from '@testing-library/react';

import {QUERY} from '../../uiKit/utils/mediaQueries';
import {useMatchMedia} from '../../uiKit/layout/matchMedia/matchMedia';
import {noop} from 'noop-esm';

import {Call} from '../../repositories/calling/Call';
import {Participant} from '../../repositories/calling/Participant';
import {Grid} from '../../repositories/calling/videoGridHandler';
import {Conversation} from '../../repositories/entity/Conversation';
import {User} from '../../repositories/entity/User';
import {PropertiesRepository} from '../../repositories/properties/propertiesRepository';
import {PropertiesService} from '../../repositories/properties/propertiesService';
import {SelfService} from '../../repositories/self/SelfService';
import {
  buildCallingRepository,
  buildMediaDevicesHandler,
  withTheme,
  withThemeAndRootContext,
} from '../../auth/util/test/testUtil';
import {translateForTest} from '../../util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../page/testSupport/rootContextTestSupport';
import {translate} from '../../util/localizerUtil';
import {minimizeSelfViewFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';

import {FullscreenVideoCall, FullscreenVideoCallProps} from './FullscreenVideoCall';
import {useCallAlertState} from './useCallAlertState';
import {CallingViewMode, CallState} from '../../repositories/calling/CallState';
import {KEY} from '../../util/keyboardUtil';
import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';

const useMatchMediaMock = useMatchMedia as jest.Mock;

jest.mock('../../uiKit/layout/matchMedia/matchMedia', () => {
  return {
    ...jest.requireActual<typeof import('../../uiKit/layout/matchMedia/matchMedia')>(
      '../../uiKit/layout/matchMedia/matchMedia',
    ),
    useMatchMedia: jest.fn(),
  };
});

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('fullscreenVideoCall', () => {
  const createProps = (): FullscreenVideoCallProps => {
    const conversation = new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUser = new User('', '', translateForTest);
    selfUser.isMe = true;
    const call = new Call(
      {domain: '', id: ''},
      new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      0,
      new Participant(selfUser, ''),
      0,
      buildMediaDevicesHandler(),
    );
    const props: Partial<FullscreenVideoCallProps> = {
      call,
      canShareScreen: false,
      conversation: conversation,
      isChoosingScreen: false,
      isMuted: false,
      propertiesRepository: new PropertiesRepository({} as PropertiesService, {} as SelfService, translate),
      mediaDevicesHandler: buildMediaDevicesHandler(),
      callingRepository: buildCallingRepository(),
      videoGrid: {grid: [], thumbnail: null} as Grid,
    };
    return props as FullscreenVideoCallProps;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      useCallAlertState.setState({isGroupCall: false});
    });
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('always shows the security line in the timer', () => {
    const {getByTestId} = render(
      withThemeAndRootContext(<FullscreenVideoCall {...createProps()} />, rootProviderWrapper),
    );

    expect(getByTestId('video-timer').contains(getByTestId('call-security-line'))).toBe(true);
  });

  it('keeps the one-on-one self preview unchanged when minimization is disabled by default', () => {
    const props = createProps();
    props.videoGrid = {grid: [], thumbnail: props.call.getSelfParticipant()};

    const {container, queryByRole} = render(withTheme(<FullscreenVideoCall {...props} />), {
      wrapper: rootProviderWrapper,
    });

    expect(queryByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'})).toBeNull();
    expect(container.querySelector('[data-uie-name="self-preview-minimized-controls"]')).toBeNull();
    expect(container.querySelector('[data-uie-name="self-video-thumbnail-wrapper"]')).toBeInTheDocument();
  });

  it('keeps the remote group tile visible without self-preview controls by default', () => {
    const props = createProps();
    const remoteParticipant = new Participant(new User('remote', '', translateForTest), 'remote-client');
    props.videoGrid = {grid: [props.call.getSelfParticipant(), remoteParticipant], thumbnail: null};

    const {getByRole, queryByRole, container} = render(withTheme(<FullscreenVideoCall {...props} />), {
      wrapper: rootProviderWrapper,
    });

    expect(queryByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'})).toBeNull();
    expect(container.querySelector('[data-user-id="remote"]')).toBeInTheDocument();
    expect(container.querySelector('[data-uie-name="self-preview-minimized-controls"]')).toBeNull();
    expect(getByRole('button', {name: 'Focus video remote'})).toBeVisible();
  });

  it('shows the self-preview control when enabled even if the call alert state is stale', () => {
    act(() => {
      useCallAlertState.setState({isGroupCall: true});
    });
    const props = createProps();
    props.videoGrid = {grid: [], thumbnail: props.call.getSelfParticipant()};
    const featureEnabledWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: featureName => {
          return featureName === minimizeSelfViewFeatureToggleName;
        },
      }),
    );

    const {getByRole} = render(withThemeAndRootContext(<FullscreenVideoCall {...props} />, featureEnabledWrapper));

    expect(getByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'})).toBeInTheDocument();
  });

  it('shows the self-tile control without hiding the remote tile when enabled in a group call', () => {
    const props = createProps();
    const remoteParticipant = new Participant(new User('remote', '', translateForTest), 'remote-client');
    props.videoGrid = {grid: [props.call.getSelfParticipant(), remoteParticipant], thumbnail: null};
    const featureEnabledWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: featureName => {
          return featureName === minimizeSelfViewFeatureToggleName;
        },
      }),
    );

    const {getByRole} = render(withThemeAndRootContext(<FullscreenVideoCall {...props} />, featureEnabledWrapper));

    expect(getByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'})).toBeInTheDocument();
    expect(getByRole('button', {name: 'Focus video remote'})).toBeVisible();
  });

  it('has no active speaker toggle for calls with more less than 3 participants', () => {
    const props = createProps();
    const {queryByTestId} = render(withTheme(<FullscreenVideoCall {...props} />), {wrapper: rootProviderWrapper});

    expect(queryByTestId('do-call-controls-video-call-view')).toBeNull();
  });

  it('resets the maximized participant on active speaker switch', async () => {
    useMatchMediaMock.mockImplementation(mediaQuery => {
      return mediaQuery === QUERY.desktop;
    });
    const setMaximizedSpy = jasmine.createSpy();
    const props = createProps();
    props.setMaximizedParticipant = setMaximizedSpy;
    props.setActiveCallViewTab = noop;
    props.call.addParticipant(new Participant(new User('a', '', translateForTest), 'a'));
    props.call.addParticipant(new Participant(new User('b', '', translateForTest), 'b'));
    props.call.addParticipant(new Participant(new User('c', '', translateForTest), 'd'));
    props.call.addParticipant(new Participant(new User('e', '', translateForTest), 'f'));

    const {getByTestId, getByText} = render(withTheme(<FullscreenVideoCall {...props} />), {
      wrapper: rootProviderWrapper,
    });
    const callViewToggleButton = getByTestId('do-call-controls-video-call-view');

    act(() => {
      callViewToggleButton.click();
    });

    await waitFor(() => {
      return expect(getByText('videoCallOverlayViewModeLabel')).toBeDefined();
    });

    const viewModeAllSpeakersOption = getByText('videoCallOverlayViewModeSpeakers');
    act(() => {
      viewModeAllSpeakersOption.click();
    });

    expect(setMaximizedSpy).toHaveBeenCalledWith(props.call, null);
  });

  it('traps focus when Tab key is pressed', () => {
    const props = createProps();
    const callState = new CallState();
    callState.viewMode(CallingViewMode.FULL_SCREEN);
    props.callState = callState;

    render(withTheme(<FullscreenVideoCall {...props} />), {wrapper: rootProviderWrapper});

    const wrapper = document.querySelector('[data-uie-name="fullscreen-video-call"]') as HTMLElement;

    const event = new KeyboardEvent('keydown', {
      key: KEY.TAB,
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

    act(() => {
      wrapper.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('does not trap focus when pressed key is not Tab', () => {
    const props = createProps();
    const callState = new CallState();
    callState.viewMode(CallingViewMode.FULL_SCREEN);
    props.callState = callState;

    render(withTheme(<FullscreenVideoCall {...props} />), {wrapper: rootProviderWrapper});

    const wrapper = document.querySelector('[data-uie-name="fullscreen-video-call"]') as HTMLElement;

    const event = new KeyboardEvent('keydown', {
      key: KEY.SPACE,
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

    act(() => {
      wrapper.dispatchEvent(event);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(stopPropagationSpy).not.toHaveBeenCalled();
  });
});
