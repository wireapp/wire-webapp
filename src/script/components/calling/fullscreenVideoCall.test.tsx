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

import ko from 'knockout';

import {Call} from 'src/script/calling/Call';
import {Participant} from 'src/script/calling/Participant';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import FullscreenVideoCall, {FullscreenVideoCallProps} from './FullscreenVideoCall';
import {Grid} from 'src/script/calling/videoGridHandler';
import {MediaDevicesHandler} from 'src/script/media/MediaDevicesHandler';
import {render, waitFor, act} from '@testing-library/react';

describe('fullscreenVideoCall', () => {
  const createProps = (): FullscreenVideoCallProps => {
    const conversation = new Conversation();
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUser = new User('', null);
    selfUser.isMe = true;
    const call = new Call({domain: '', id: ''}, {domain: '', id: ''}, 0, new Participant(selfUser, ''), 0, {
      currentAvailableDeviceId: {
        audioOutput: ko.pureComputed(() => 'test'),
      },
    } as MediaDevicesHandler);
    const props: Partial<FullscreenVideoCallProps> = {
      call,
      canShareScreen: false,
      conversation: conversation,
      isChoosingScreen: false,
      isMuted: false,
      mediaDevicesHandler: {
        availableDevices: {
          audioInput: ko.observableArray(),
          videoInput: ko.observableArray(),
        },
        currentDeviceId: {
          audioInput: ko.observable(''),
          audioOutput: ko.observable(''),
          screenInput: ko.observable(''),
          videoInput: ko.observable(''),
        },
      } as MediaDevicesHandler,
      multitasking: {isMinimized: ko.observable(false)},
      videoGrid: {grid: [], thumbnail: null} as Grid,
    };
    return props as FullscreenVideoCallProps;
  };

  beforeEach(() => {
    jest.useFakeTimers('modern');
  });

  afterEach(() => jest.useRealTimers());

  it('shows the available screens', () => {
    const props = createProps();

    const {queryByText} = render(<FullscreenVideoCall {...props} />);

    expect(queryByText('videoCallOverlayConversations')).not.toBe(null);
  });

  it('shows the calling timer', async () => {
    const props = createProps();

    const {getByText} = render(<FullscreenVideoCall {...props} />);
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
    const {queryByText} = render(<FullscreenVideoCall {...props} />);

    expect(queryByText('videoSpeakersTabSpeakers')).toBeNull();
  });

  it('resets the maximized participant on active speaker switch', async () => {
    const setMaximizedSpy = jasmine.createSpy();
    const props = createProps();
    props.setMaximizedParticipant = setMaximizedSpy;
    props.setActiveCallViewTab = () => {};
    props.call.addParticipant(new Participant(new User('a', null), 'a'));
    props.call.addParticipant(new Participant(new User('b', null), 'b'));
    props.call.addParticipant(new Participant(new User('c', null), 'd'));
    props.call.addParticipant(new Participant(new User('e', null), 'f'));

    const {getByText} = render(<FullscreenVideoCall {...props} />);
    const speakersButtonLabel = 'videoSpeakersTabSpeakers'.toUpperCase();
    await waitFor(() => getByText(speakersButtonLabel));

    getByText(speakersButtonLabel).click();

    expect(setMaximizedSpy).toHaveBeenCalledWith(props.call, null);
  });
});
