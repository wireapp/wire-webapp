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
import {instantiateComponent} from '../../../../test/helper/knockoutHelpers';
import './fullscreenVideoCall';

describe('fullscreenVideoCall', () => {
  let domContainer: Element;
  let call: Call;
  beforeEach(() => {
    jasmine.clock().install();
    const conversation = new Conversation();
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUser = new User();
    selfUser.isMe = true;
    call = new Call('', '', 0, new Participant(selfUser, ''), 0);
    const params = {
      call,
      callActions: {},
      canShareScreen: false,
      conversation: ko.observable(conversation),
      isChoosingScreen: ko.observable(false),
      isMuted: ko.observable(false),
      mediaDevicesHandler: {
        currentDeviceId: {
          audioInput: () => '',
          videoInput: () => '',
        },
      },
      multitasking: {autoMinimize: () => false},
      videoGrid: ko.observable({grid: [], hasRemoteVideo: false, thumbnail: null}),
    };

    return instantiateComponent('fullscreen-video-call', params).then((container: Element) => {
      domContainer = container;
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('shows the available screens', () => {
    expect(domContainer.querySelector('.video-controls__button')).not.toBe(null);
  });

  it('shows the calling timer', () => {
    call.startedAt(Date.now());

    expect((domContainer.querySelector('.video-timer') as HTMLElement).innerText).toBe('00:00');
    jasmine.clock().mockDate();
    jasmine.clock().tick(1001);

    expect((domContainer.querySelector('.video-timer') as HTMLElement).innerText).toBe('00:01');
  });
});
