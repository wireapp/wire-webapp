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

import {act} from 'react-dom/test-utils';
import ko from 'knockout';

import {Call} from 'src/script/calling/Call';
import {Participant} from 'src/script/calling/Participant';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import FullscreenVideoCall, {FullscreenVideoCallProps} from './FullscreenVideoCall';
import TestPage from 'Util/test/TestPage';
import {Grid} from 'src/script/calling/videoGridHandler';
import {MediaDevicesHandler} from 'src/script/media/MediaDevicesHandler';
import {CallActions} from 'src/script/view_model/CallingViewModel';

class FullscreenVideoCallPage extends TestPage<FullscreenVideoCallProps> {
  constructor(props?: FullscreenVideoCallProps) {
    super(FullscreenVideoCall, props);
  }

  getVideoControls = () => this.get('.video-controls__button');
  getVideoTimer = () => this.get('div[data-uie-name="video-timer"]');
  getActiveSpeakerToggle = () => this.get('ButtonGroup');
  clickInactiveButton = () => this.click(this.get('ButtonGroup > [data-uie-value="inactive"]'));
}

describe('fullscreenVideoCall', () => {
  const createProps = (): FullscreenVideoCallProps => {
    const conversation = new Conversation();
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUser = new User();
    selfUser.isMe = true;
    const call = new Call('', '', 0, new Participant(selfUser, ''), 0, {
      currentAvailableDeviceId: {
        audioOutput: ko.pureComputed(() => 'test'),
      },
    } as MediaDevicesHandler);
    const props: Partial<FullscreenVideoCallProps> = {
      call,
      callActions: {} as CallActions,
      canShareScreen: false,
      conversation: conversation,
      isChoosingScreen: false,
      isMuted: false,
      mediaDevicesHandler: {
        currentDeviceId: {
          audioInput: ko.observable(''),
          audioOutput: ko.observable(''),
          screenInput: ko.observable(''),
          videoInput: ko.observable(''),
        },
      } as MediaDevicesHandler,
      multitasking: {autoMinimize: ko.observable(false), isMinimized: ko.observable(false)},
      videoGrid: {grid: [], hasRemoteVideo: false, thumbnail: null} as Grid,
      videoInput: [],
    };
    return props as FullscreenVideoCallProps;
  };

  beforeEach(() => {
    jest.useFakeTimers('modern');
  });

  afterEach(() => jest.useRealTimers());

  it('shows the available screens', () => {
    const props = createProps();

    const fullscreenVideoCall = new FullscreenVideoCallPage(props);

    expect(fullscreenVideoCall.getVideoControls().exists()).toBe(true);
  });

  it('shows the calling timer', async () => {
    const props = createProps();

    const fullscreenVideoCall = new FullscreenVideoCallPage(props);
    const now = Date.now();

    jest.setSystemTime(now);
    props.call.startedAt(Date.now());
    fullscreenVideoCall.setProps(props);

    expect(fullscreenVideoCall.getVideoTimer().text()).toEqual('00:00');

    act(() => {
      jest.advanceTimersByTime(1001);
      fullscreenVideoCall.update();
    });

    expect(fullscreenVideoCall.getVideoTimer().text()).toEqual('00:01');
  });

  it('has no active speaker toggle for calls with more less than 3 participants', () => {
    const props = createProps();
    const fullscreenVideoCall = new FullscreenVideoCallPage(props);

    expect(fullscreenVideoCall.getActiveSpeakerToggle().exists()).toBe(false);
  });

  it('resets the maximized participant on active speaker switch', () => {
    const setMaximizedSpy = jasmine.createSpy();
    const props = createProps();
    props.callActions.setMaximizedTileVideoParticipant = setMaximizedSpy;
    props.callActions.setVideoSpeakersActiveTab = () => {};
    props.call.participants([
      new Participant(new User('a'), 'a'),
      new Participant(new User('b'), 'b'),
      new Participant(new User('c'), 'c'),
    ]);
    const fullscreenVideoCall = new FullscreenVideoCallPage(props);
    const activeSpeakerToggle = fullscreenVideoCall.getActiveSpeakerToggle();

    expect(activeSpeakerToggle.exists()).toBe(true);

    const inactiveButton = activeSpeakerToggle.find('[data-uie-value="inactive"]');
    fullscreenVideoCall.click(inactiveButton.first());

    expect(setMaximizedSpy).toHaveBeenCalledWith(null);
  });
});
