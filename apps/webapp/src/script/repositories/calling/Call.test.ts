/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {generateConversation} from 'test/helper/ConversationGenerator';

import {CALL_TYPE, CONV_TYPE, Wcall} from '@wireapp/avs';

import {Call} from './Call';
import {CallingRepository} from './CallingRepository';
import {Participant} from './Participant';

import {TestFactory} from '../../../../test/helper/TestFactory';

const createSelfParticipant = () => {
  const selfUser = new User();
  selfUser.isMe = true;
  return new Participant(selfUser, 'client1');
};

const createParticipant = (name: string) => {
  const user = new User();
  user.name(name);
  return new Participant(user, `client-${name}`);
};

const mediaDevices = {
  audioinput: ko.pureComputed(() => 'test'),
  audiooutput: ko.pureComputed(() => 'test'),
  screeninput: ko.pureComputed(() => 'test'),
  videoinput: ko.pureComputed(() => 'test'),
};

const buildMediaDevicesHandler = () => {
  return {
    currentAvailableDeviceId: mediaDevices,
    setOnMediaDevicesRefreshHandler: jest.fn(),
  } as unknown as MediaDevicesHandler;
};

describe('Call', () => {
  const testFactory = new TestFactory();
  let call: Call;
  let callingRepository: CallingRepository;
  let selfParticipant: Participant;
  let firstParticipant: Participant;
  let secondParticipant: Participant;
  let thirdParticipant: Participant;
  let fourthParticipant: Participant;
  let fifthParticipant: Participant;
  let conv: Conversation;
  let wCall: Wcall;
  let wUser: number;

  beforeAll(() => {
    return testFactory.exposeCallingActors().then(injectedCallingRepository => {
      callingRepository = injectedCallingRepository;
      // return callingRepository.initAvs(selfUser, clientId).then(avsApi => {
      //   wCall = avsApi.wCall;
      //   wUser = avsApi.wUser;
      // });
    });
  });

  beforeEach(() => {
    selfParticipant = createSelfParticipant();

    firstParticipant = createParticipant('A-first');
    secondParticipant = createParticipant('B-second');
    thirdParticipant = createParticipant('C-third');
    fourthParticipant = createParticipant('D-fourth');
    fifthParticipant = createParticipant('E-fifth');

    conv = generateConversation();
    call = new Call(
      {domain: '', id: ''},
      conv,
      CONV_TYPE.CONFERENCE,
      selfParticipant,
      CALL_TYPE.NORMAL,
      buildMediaDevicesHandler(),
    );

    // Add participant in not alphabetic order
    call.addParticipant(fourthParticipant);
    call.addParticipant(fifthParticipant);
    call.addParticipant(secondParticipant);
    call.addParticipant(firstParticipant);
    call.addParticipant(thirdParticipant);
  });

  afterEach(() => {
    callingRepository['callState'].calls([]);
    callingRepository['conversationState'].conversations([]);
    callingRepository.destroy();
    jest.clearAllMocks();
  });

  afterAll(() => {
    return wCall && wCall.destroy(wUser);
  });

  describe('update pages', () => {
    it('everyone is muted then sort alphabetically', async () => {
      call.updatePages();
      const pages = call.pages.pop();
      expect(pages.map(p => p.user.name())).toEqual([
        selfParticipant.user.name(),
        firstParticipant.user.name(),
        secondParticipant.user.name(),
        thirdParticipant.user.name(),
        fourthParticipant.user.name(),
        fifthParticipant.user.name(),
      ]);
    });

    it('participants who send videos are sorted to the front', async () => {
      thirdParticipant.videoState(4);
      fourthParticipant.videoState(4);
      call.updatePages();
      const pages = call.pages.pop();
      expect(pages.map(p => p.user.name())).toEqual([
        selfParticipant.user.name(),
        thirdParticipant.user.name(),
        fourthParticipant.user.name(),
        firstParticipant.user.name(),
        secondParticipant.user.name(),
        fifthParticipant.user.name(),
      ]);
    });

    it('participants who send screen share are sorted to the front', async () => {
      secondParticipant.videoState(1);
      thirdParticipant.videoState(1);
      call.updatePages();
      const pages = call.pages.pop();
      expect(pages.map(p => p.user.name())).toEqual([
        selfParticipant.user.name(),
        secondParticipant.user.name(),
        thirdParticipant.user.name(),
        firstParticipant.user.name(),
        fourthParticipant.user.name(),
        fifthParticipant.user.name(),
      ]);
    });

    it('sort the participant with screen share first then videos then muted', async () => {
      fourthParticipant.videoState(4);
      thirdParticipant.videoState(1);
      fifthParticipant.videoState(1);

      call.updatePages();
      const pages = call.pages.pop();
      expect(pages.map(p => p.user.name())).toEqual([
        selfParticipant.user.name(),
        fourthParticipant.user.name(),
        thirdParticipant.user.name(),
        fifthParticipant.user.name(),
        firstParticipant.user.name(),
        secondParticipant.user.name(),
      ]);
    });

    it('adjust sorting when participant is changed from screen share to video', async () => {
      fourthParticipant.videoState(4);
      thirdParticipant.videoState(1);
      fifthParticipant.videoState(1);

      call.updatePages();

      fourthParticipant.videoState(1);

      call.updatePages();

      const pages = call.pages.pop();
      expect(pages.map(p => p.user.name())).toEqual([
        selfParticipant.user.name(),
        thirdParticipant.user.name(),
        fourthParticipant.user.name(),
        fifthParticipant.user.name(),
        firstParticipant.user.name(),
        secondParticipant.user.name(),
      ]);
    });

    it('adjust sorting when participant is changed from video to screen share', async () => {
      fourthParticipant.videoState(4);
      thirdParticipant.videoState(1);
      fifthParticipant.videoState(1);

      call.updatePages();

      fifthParticipant.videoState(4);

      call.updatePages();

      const pages = call.pages.pop();
      expect(pages.map(p => p.user.name())).toEqual([
        selfParticipant.user.name(),
        fourthParticipant.user.name(),
        fifthParticipant.user.name(),
        thirdParticipant.user.name(),
        firstParticipant.user.name(),
        secondParticipant.user.name(),
      ]);
    });
  });
});
