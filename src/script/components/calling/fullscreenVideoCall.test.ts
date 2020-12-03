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

import {Call} from 'src/script/calling/Call';
import {Participant} from 'src/script/calling/Participant';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import FullscreenVideoCall, {FullscreenVideoCallProps} from './FullscreenVideoCall';
import TestPage from 'Util/test/TestPage';
import {Grid} from 'src/script/calling/videoGridHandler';

class FullscreenVideoCallPage extends TestPage<FullscreenVideoCallProps> {
  constructor(props?: FullscreenVideoCallProps) {
    super(FullscreenVideoCall, props);
  }

  getVideoControls = () => this.get('.video-controls__button');
  getVideoTimer = () => this.get('div[data-uie-name="video-timer"]');
}

describe('fullscreenVideoCall', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
  });

  afterEach(() => jest.useRealTimers());

  it('shows the available screens', () => {
    const conversation = new Conversation();
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUser = new User();
    selfUser.isMe = true;
    const call = new Call('', '', 0, new Participant(selfUser, ''), 0);
    const props = {
      call,
      callActions: {},
      canShareScreen: false,
      conversation: conversation,
      isChoosingScreen: false,
      isMuted: false,
      mediaDevicesHandler: {
        currentDeviceId: {
          audioInput: () => '',
          videoInput: () => '',
        },
      },
      multitasking: {autoMinimize: () => false},
      videoGrid: {grid: [], hasRemoteVideo: false, thumbnail: null} as Grid,
      videoInput: [],
    } as FullscreenVideoCallProps;

    const fullscreenVideoCall = new FullscreenVideoCallPage(props);

    expect(fullscreenVideoCall.getVideoControls()).not.toBe(null);
  });

  it('shows the calling timer', async () => {
    const conversation = new Conversation();
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUser = new User();
    selfUser.isMe = true;
    const call = new Call('', '', 0, new Participant(selfUser, ''), 0);
    const props = {
      call,
      callActions: {},
      canShareScreen: false,
      conversation: conversation,
      isChoosingScreen: false,
      isMuted: false,
      mediaDevicesHandler: {
        currentDeviceId: {
          audioInput: () => '',
          videoInput: () => '',
        },
      },
      multitasking: {autoMinimize: () => false},
      videoGrid: {grid: [], hasRemoteVideo: false, thumbnail: null} as Grid,
      videoInput: [],
    } as FullscreenVideoCallProps;

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
});
