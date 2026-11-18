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
import {noop} from 'noop-esm';

import {CALL_TYPE, CONV_TYPE, Wcall} from '@wireapp/avs';

import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {MediaDevicesHandler} from '../media/MediaDevicesHandler';
import {generateConversation} from '../../../../test/helper/ConversationGenerator';

import {Call} from './Call';
import {CallingRepository} from './CallingRepository';
import {Participant} from './Participant';

import {TestFactory} from '../../../../test/helper/TestFactory';
import {translateForTest} from '../../util/test/translateForTest';

const createSelfParticipant = (): Participant => {
  const selfUser = new User('', '', translateForTest);
  selfUser.isMe = true;
  return new Participant(selfUser, 'client1');
};

const createParticipant = (name: string): Participant => {
  const user = new User('', '', translateForTest);
  user.name(name);
  return new Participant(user, `client-${name}`);
};

const mediaDevices = {
  audioinput: ko.pureComputed(() => {
    return 'test';
  }),
  audiooutput: ko.pureComputed(() => {
    return 'test';
  }),
  screeninput: ko.pureComputed(() => {
    return 'test';
  }),
  videoinput: ko.pureComputed(() => {
    return 'test';
  }),
};

const buildMediaDevicesHandler = (): MediaDevicesHandler => {
  return {
    currentAvailableDeviceId: mediaDevices,
    setOnMediaDevicesRefreshHandler: jest.fn(),
  } as unknown as MediaDevicesHandler;
};

describe('Call', () => {
  afterAll(() => {
    testFactory.dispose();
  });

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
  let wCall: Wcall | undefined;
  let wUser: number | undefined;

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

  it('updates stream sender metadata without replacing the playing audio element', () => {
    const stream = new MediaStream([new window.RTCAudioSource().createTrack()]);
    const findCall = jest.spyOn(callingRepository, 'findCall').mockReturnValue(call);
    const play = jest.spyOn(call, 'playAudioStreams').mockImplementation(noop);
    const identity = jest.spyOn(call, 'setNoteTakerAudioIdentity');
    try {
      callingRepository['updateCallAudioStreams']('conversation', 'receiver', [stream]);
      const audio = call['audios']['receiver'];
      const element = document.createElement('audio');
      audio.audioElement = element;
      callingRepository['updateCallAudioStreams']('conversation', 'receiver', [stream], {
        trackId: 'track',
        userId: 'alice@wire.test',
        clientId: 'alice-client',
      });
      expect(identity).toHaveBeenLastCalledWith('track', {id: 'alice', domain: 'wire.test'}, 'alice-client');
      callingRepository['updateCallAudioStreams']('conversation', 'receiver', [stream], {
        trackId: 'track',
        userId: 'bob@wire.test',
        clientId: 'bob-client',
      });
      expect(identity).toHaveBeenLastCalledWith('track', {id: 'bob', domain: 'wire.test'}, 'bob-client');
      expect(call['audios']['receiver'].audioElement).toBe(element);
      expect(call['audios']['receiver']).toBe(audio);
    } finally {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      findCall.mockRestore();
      play.mockRestore();
      identity.mockRestore();
    }
  });

  it('maps AVS receiver tracks to participant identity and handles a sender switch', () => {
    call.setNoteTakerAudioIdentity('receiver-1', firstParticipant.user.qualifiedId, firstParticipant.clientId);
    expect(call.getNoteTakerAudioParticipant('receiver-1')).toBe(firstParticipant);
    call.setNoteTakerAudioIdentity('receiver-1', secondParticipant.user.qualifiedId, secondParticipant.clientId);
    expect(call.getNoteTakerAudioParticipant('receiver-1')).toBe(secondParticipant);
    expect(call.getNoteTakerAudioParticipant('unknown')).toBeUndefined();
  });

  afterEach(() => {
    callingRepository['callState'].calls([]);
    callingRepository['conversationState'].conversations([]);
    callingRepository.destroy();
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (wCall !== undefined && wUser !== undefined) {
      wCall.destroy(wUser);
    }
  });

  describe('update pages', () => {
    it('everyone is muted then sort alphabetically', async () => {
      call.updatePages();
      const pages = call.pages.pop();
      expect(
        pages.map(p => {
          return p.user.name();
        }),
      ).toEqual([
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
      expect(
        pages.map(p => {
          return p.user.name();
        }),
      ).toEqual([
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
      expect(
        pages.map(p => {
          return p.user.name();
        }),
      ).toEqual([
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
      expect(
        pages.map(p => {
          return p.user.name();
        }),
      ).toEqual([
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
      expect(
        pages.map(p => {
          return p.user.name();
        }),
      ).toEqual([
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
      expect(
        pages.map(p => {
          return p.user.name();
        }),
      ).toEqual([
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
