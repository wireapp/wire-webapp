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

import {render, waitFor, act} from '@testing-library/react';
import ko from 'knockout';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {Call} from 'src/script/calling/Call';
import {Participant} from 'src/script/calling/Participant';
import {Grid} from 'src/script/calling/videoGridHandler';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {MediaDevicesHandler} from 'src/script/media/MediaDevicesHandler';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {PropertiesService} from 'src/script/properties/PropertiesService';
import {SelfService} from 'src/script/self/SelfService';

import {FullscreenVideoCall, FullscreenVideoCallProps} from './FullscreenVideoCall';

jest.mock('@wireapp/react-ui-kit', () => ({
  ...(jest.requireActual('@wireapp/react-ui-kit') as any),
  useMatchMedia: jest.fn(),
}));

describe('fullscreenVideoCall', () => {
  const createProps = (): FullscreenVideoCallProps => {
    const conversation = new Conversation();
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUser = new User('');
    selfUser.isMe = true;
    const call = new Call({domain: '', id: ''}, new Conversation('', ''), 0, new Participant(selfUser, ''), 0, {
      currentAvailableDeviceId: {
        audiooutput: ko.pureComputed(() => 'test'),
      },
    } as MediaDevicesHandler);
    const props: Partial<FullscreenVideoCallProps> = {
      call,
      canShareScreen: false,
      conversation: conversation,
      isChoosingScreen: false,
      isMuted: false,
      propertiesRepository: new PropertiesRepository({} as PropertiesService, {} as SelfService),
      mediaDevicesHandler: {
        availableDevices: {
          audioinput: ko.observableArray(),
          videoinput: ko.observableArray(),
          audiooutput: ko.observableArray(),
        },
        currentDeviceId: {
          audioinput: ko.observable(''),
          audiooutput: ko.observable(''),
          screeninput: ko.observable(''),
          videoinput: ko.observable(''),
        },
      } as MediaDevicesHandler,
      videoGrid: {grid: [], thumbnail: null} as Grid,
    };
    return props as FullscreenVideoCallProps;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('shows the calling timer', async () => {
    const props = createProps();

    const {getByText} = render(withTheme(withTheme(<FullscreenVideoCall {...props} />)));
    const now = Date.now();

    jest.setSystemTime(now);
    act(() => {
      props.call.startedAt(Date.now());
    });

    await waitFor(() => expect(getByText('00:00')).toBeDefined());

    act(() => {
      jest.advanceTimersByTime(1001);
    });

    await waitFor(() => expect(getByText('00:01')).toBeDefined());
  });

  it('has no active speaker toggle for calls with more less than 3 participants', () => {
    const props = createProps();
    const {queryByTestId} = render(withTheme(<FullscreenVideoCall {...props} />));

    expect(queryByTestId('do-call-controls-video-call-view')).toBeNull();
  });

  it('resets the maximized participant on active speaker switch', async () => {
    const setMaximizedSpy = jasmine.createSpy();
    const props = createProps();
    props.setMaximizedParticipant = setMaximizedSpy;
    props.setActiveCallViewTab = () => {};
    props.call.addParticipant(new Participant(new User('a'), 'a'));
    props.call.addParticipant(new Participant(new User('b'), 'b'));
    props.call.addParticipant(new Participant(new User('c'), 'd'));
    props.call.addParticipant(new Participant(new User('e'), 'f'));

    const {getByTestId, getByText} = render(withTheme(<FullscreenVideoCall {...props} />));
    const callViewToggleButton = getByTestId('do-call-controls-video-call-view');

    callViewToggleButton.click();

    await waitFor(() => expect(getByText('videoCallOverlayViewModeLabel')).toBeDefined());

    const viewModeAllSpeakersOption = getByText('videoCallOverlayViewModeSpeakers');
    viewModeAllSpeakersOption.click();

    expect(setMaximizedSpy).toHaveBeenCalledWith(props.call, null);
  });
});
