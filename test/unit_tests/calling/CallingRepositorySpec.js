/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import 'jsdom-worker';

import {WebAppEvents} from '@wireapp/webapp-events';
import {CONV_TYPE, CALL_TYPE, STATE as CALL_STATE, REASON} from '@wireapp/avs';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {EventRepository} from 'src/script/event/EventRepository';
import {Participant} from 'src/script/calling/Participant';
import {Call} from 'src/script/calling/Call';
import {CallState} from 'src/script/calling/CallState';
import {User} from 'src/script/entity/User';
import {MediaType} from 'src/script/media/MediaType';
import {Conversation} from 'src/script/entity/Conversation';
import {ModalsViewModel} from 'src/script/view_model/ModalsViewModel';
import {serverTimeHandler} from 'src/script/time/serverTimeHandler';
import {TestFactory} from '../../helper/TestFactory';
import {createRandomUuid} from 'Util/util';

const createSelfParticipant = () => {
  const selfUser = new User();
  selfUser.isMe = true;
  return new Participant(selfUser);
};

describe('CallingRepository', () => {
  const testFactory = new TestFactory();
  let callingRepository;
  let wCall;
  let wUser;
  const selfUser = new User(createRandomUuid());
  const clientId = createRandomUuid();

  beforeAll(() => {
    return testFactory.exposeCallingActors().then(injectedCallingRepository => {
      callingRepository = injectedCallingRepository;
      return callingRepository.initAvs(selfUser, clientId).then(avsApi => {
        wCall = avsApi.wCall;
        wUser = avsApi.wUser;
      });
    });
  });

  afterEach(() => {
    callingRepository.callState.activeCalls([]);
  });

  afterAll(() => {
    return wCall && wCall.destroy(wUser);
  });

  describe('startCall', () => {
    it('warns the user that there is an ongoing call before starting a new one', done => {
      const activeCall = new Call(selfUser.id, createRandomUuid(), CONV_TYPE.ONEONONE, new Participant(), 0, {
        currentAvailableDeviceId: {
          audioOutput: ko.pureComputed(() => 'test'),
        },
      });
      activeCall.state(CALL_STATE.MEDIA_ESTAB);
      spyOn(callingRepository.callState, 'activeCalls').and.returnValue([activeCall]);
      spyOn(amplify, 'publish').and.returnValue(undefined);
      const conversationId = createRandomUuid();
      const conversationType = CONV_TYPE.ONEONONE;
      const callType = CALL_TYPE.NORMAL;
      spyOn(wCall, 'start');
      callingRepository.startCall(conversationId, conversationType, callType).catch(done);
      setTimeout(() => {
        expect(amplify.publish).toHaveBeenCalledWith(
          WebAppEvents.WARNING.MODAL,
          ModalsViewModel.TYPE.CONFIRM,
          jasmine.any(Object),
        );

        expect(wCall.start).not.toHaveBeenCalled();
        done();
      }, 10);
    });

    it('starts a normal call in a 1:1 conversation', () => {
      const conversationId = createRandomUuid();
      const conversationType = CONV_TYPE.ONEONONE;
      const callType = CALL_TYPE.NORMAL;
      spyOn(wCall, 'start');
      return callingRepository.startCall(conversationId, conversationType, callType).then(() => {
        expect(wCall.start).toHaveBeenCalledWith(wUser, conversationId, conversationType, callType, 0);
      });
    });
  });

  describe('joinedCall', () => {
    it('only exposes the current active call', () => {
      const selfParticipant = createSelfParticipant();
      const incomingCall = new Call('', '', undefined, selfParticipant, CALL_TYPE.NORMAL, {
        currentAvailableDeviceId: {
          audioOutput: ko.pureComputed(() => 'test'),
        },
      });
      incomingCall.state(CALL_STATE.INCOMING);

      const activeCall = new Call('', '', undefined, selfParticipant, CALL_TYPE.NORMAL, {
        currentAvailableDeviceId: {
          audioOutput: ko.pureComputed(() => 'test'),
        },
      });
      activeCall.state(CALL_STATE.MEDIA_ESTAB);

      const declinedCall = new Call('', '', undefined, selfParticipant, CALL_TYPE.NORMAL, {
        currentAvailableDeviceId: {
          audioOutput: ko.pureComputed(() => 'test'),
        },
      });
      declinedCall.state(CALL_STATE.INCOMING);
      declinedCall.reason(REASON.STILL_ONGOING);

      callingRepository.callState.activeCalls([incomingCall, activeCall, declinedCall]);

      expect(callingRepository.callState.joinedCall()).toBe(activeCall);
    });
  });

  describe('getCallMediaStream', () => {
    it('returns cached mediastream for self user if set', () => {
      const selfParticipant = createSelfParticipant();
      const call = new Call('', '', undefined, selfParticipant, CALL_TYPE.NORMAL, {
        currentAvailableDeviceId: {
          audioOutput: ko.pureComputed(() => 'test'),
        },
      });
      const source = new RTCAudioSource();
      const audioTrack = source.createTrack();
      const selfMediaStream = new MediaStream([audioTrack]);
      selfParticipant.audioStream(selfMediaStream);
      spyOn(selfParticipant, 'getMediaStream').and.callThrough();
      spyOn(callingRepository, 'findCall').and.returnValue(call);

      const queries = [1, 2, 3, 4].map(() => {
        return callingRepository.getCallMediaStream('', true, false, false).then(mediaStream => {
          expect(mediaStream.getAudioTracks()[0]).toBe(audioTrack);
        });
      });
      return Promise.all(queries).then(() => {
        expect(selfParticipant.getMediaStream).toHaveBeenCalledTimes(queries.length);
      });
    });

    it('asks only once for mediastream when queried multiple times', () => {
      const selfParticipant = createSelfParticipant();
      const call = new Call('', '', undefined, selfParticipant, CALL_TYPE.NORMAL, {
        currentAvailableDeviceId: {
          audioOutput: ko.pureComputed(() => 'test'),
        },
      });
      const source = new RTCAudioSource();
      const audioTrack = source.createTrack();
      const selfMediaStream = new MediaStream([audioTrack]);
      spyOn(callingRepository.mediaStreamHandler, 'requestMediaStream').and.returnValue(
        Promise.resolve(selfMediaStream),
      );
      spyOn(callingRepository, 'findCall').and.returnValue(call);

      const queries = [1, 2, 3, 4].map(() => {
        return callingRepository.getCallMediaStream('', true, false, false).then(mediaStream => {
          expect(mediaStream.getAudioTracks()[0]).toBe(audioTrack);
        });
      });
      return Promise.all(queries).then(() => {
        expect(callingRepository.mediaStreamHandler.requestMediaStream).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('stopMediaSource', () => {
    it('releases media streams', () => {
      const selfParticipant = createSelfParticipant();
      spyOn(selfParticipant, 'releaseAudioStream');
      spyOn(selfParticipant, 'releaseVideoStream');

      const call = new Call('', '', 0, selfParticipant, CALL_TYPE.NORMAL, {
        currentAvailableDeviceId: {
          audioOutput: ko.pureComputed(() => 'test'),
        },
      });
      spyOn(callingRepository.callState, 'joinedCall').and.returnValue(call);
      callingRepository.stopMediaSource(MediaType.AUDIO);

      expect(selfParticipant.releaseAudioStream).toHaveBeenCalledTimes(1);
      expect(selfParticipant.releaseVideoStream).not.toHaveBeenCalled();

      callingRepository.stopMediaSource(MediaType.VIDEO);

      expect(selfParticipant.releaseAudioStream).toHaveBeenCalledTimes(1);
      expect(selfParticipant.releaseVideoStream).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CallingRepository ISO', () => {
  describe('incoming call', () => {
    let avsUser;
    let avsCall;

    afterEach(() => {
      return avsCall && avsCall.destroy(avsUser);
    });

    it('creates and stores a new call when an incoming call arrives', async done => {
      const selfUser = new User(createRandomUuid());
      selfUser.isMe = true;
      selfUser.clientId = createRandomUuid();

      const conversation = new Conversation(createRandomUuid());

      const callingRepo = new CallingRepository(
        {
          grantMessage: jest.fn(),
        }, // MessageRepository
        {
          injectEvent: jest.fn(),
        }, // EventRepository
        {}, // UserRepository
        {}, // MediaStreamHandler
        {
          currentAvailableDeviceId: {
            audioOutput: ko.pureComputed(() => 'test'),
          },
        }, // mediaDevicesHandler
        {
          toServerTimestamp: jest.fn().mockImplementation(() => Date.now()),
        }, // ServerTimeHandler
        {}, // APIClient
        {
          findConversation: jest.fn().mockImplementation(() => conversation),
          participating_user_ets: jest.fn(),
        }, // ConversationState
        new CallState(),
      );

      const avs = await callingRepo.initAvs(selfUser, selfUser.clientId);
      // provide global handle for cleanup
      avsUser = avs.wUser;
      avsCall = avs.wCall;

      const event = {
        content: {
          props: {
            audiocbr: 'false',
            videosend: 'false',
          },
          resp: false,
          sdp:
            'v=0\r\n' +
            'o=- 3219012230 175353000 IN IP4 192.168.121.208\r\n' +
            's=-\r\n' +
            'c=IN IP4 192.168.121.208\r\n' +
            't=0 0\r\n' +
            'a=tool:avs 4.9.9 (arm/linux)\r\n' +
            'a=ice-options:trickle\r\n' +
            'a=x-OFFER\r\n' +
            'a=group:BUNDLE audio video data\r\n' +
            'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' +
            'b=AS:50\r\n' +
            'a=rtpmap:111 opus/48000/2\r\n' +
            'a=fmtp:111 stereo=0;sprop-stereo=0;useinbandfec=1\r\n' +
            'a=rtcp:9\r\n' +
            'a=sendrecv\r\n' +
            'a=mid:audio\r\n' +
            'a=ssrc:2640746628 cname:p5CtZYSnfvxMinp\r\n' +
            'a=rtcp-mux\r\n' +
            'a=ice-ufrag:cnLOdLEowwh6PnM\r\n' +
            'a=ice-pwd:li7K4QBbAX9RUKrTDNSBUcIRCIxEDHP\r\n' +
            'a=fingerprint:sha-256 69:75:F9:77:B2:00:5B:3F:E6:90:FB:FF:BA:39:82:AC:34:C8:08:4E:BF:69:5D:44:C2:FD:4E:E8:A0:7A:A9:12\r\n' +
            'a=x-KASEv1:q15D6p9nxIR37JjnOiXVyPqIXUZF9uASOlJ9Itye9B8=\r\n' +
            'a=setup:actpass\r\n' +
            'a=candidate:c0a879d0 1 UDP 2114126591 192.168.121.208 40416 typ host\r\n' +
            'a=candidate:3e60942d 1 UDP 1677722623 62.96.148.44 41175 typ srflx raddr 192.168.121.208 rport 9\r\n' +
            'a=candidate:12c37439 1 UDP 1023 18.195.116.58 36555 typ relay raddr 62.96.148.44 rport 41175\r\n' +
            'a=end-of-candidates\r\n' +
            'm=video 9 UDP/TLS/RTP/SAVPF 100 96\r\n' +
            'b=AS:800\r\n' +
            'a=rtpmap:100 VP8/90000\r\n' +
            'a=rtcp-fb:100 ccm fir\r\n' +
            'a=rtcp-fb:100 nack\r\n' +
            'a=rtcp-fb:100 nack pli\r\n' +
            'a=rtcp-fb:100 goog-remb\r\n' +
            'a=extmap:1 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n' +
            'a=extmap:2 urn:3gpp:video-orientation\r\n' +
            'a=rtpmap:96 rtx/90000\r\n' +
            'a=fmtp:96 apt=100\r\n' +
            'a=rtcp:9\r\n' +
            'a=sendrecv\r\n' +
            'a=mid:video\r\n' +
            'a=rtcp-mux\r\n' +
            'a=ice-ufrag:cnLOdLEowwh6PnM\r\n' +
            'a=ice-pwd:li7K4QBbAX9RUKrTDNSBUcIRCIxEDHP\r\n' +
            'a=fingerprint:sha-256 69:75:F9:77:B2:00:5B:3F:E6:90:FB:FF:BA:39:82:AC:34:C8:08:4E:BF:69:5D:44:C2:FD:4E:E8:A0:7A:A9:12\r\n' +
            'a=setup:actpass\r\n' +
            'a=ssrc-group:FID 4068473288 2807269560\r\n' +
            'a=ssrc:4068473288 cname:p5CtZYSnfvxMinp\r\n' +
            'a=ssrc:4068473288 msid:U7GC2rpv2vK5m163DdYPHfZG7TwekvApvrB 3ff0fc9b-c15f-9bee-eed8-94b42625795e\r\n' +
            'a=ssrc:4068473288 mslabel:U7GC2rpv2vK5m163DdYPHfZG7TwekvApvrB\r\n' +
            'a=ssrc:4068473288 label:3ff0fc9b-c15f-9bee-eed8-94b42625795e\r\n' +
            'a=ssrc:2807269560 cname:p5CtZYSnfvxMinp\r\n' +
            'a=ssrc:2807269560 msid:U7GC2rpv2vK5m163DdYPHfZG7TwekvApvrB 3ff0fc9b-c15f-9bee-eed8-94b42625795e\r\n' +
            'a=ssrc:2807269560 mslabel:U7GC2rpv2vK5m163DdYPHfZG7TwekvApvrB\r\n' +
            'a=ssrc:2807269560 label:3ff0fc9b-c15f-9bee-eed8-94b42625795e\r\n' +
            'm=application 9 DTLS/SCTP 5000\r\n' +
            'a=sendrecv\r\n' +
            'a=mid:data\r\n' +
            'a=ice-ufrag:cnLOdLEowwh6PnM\r\n' +
            'a=ice-pwd:li7K4QBbAX9RUKrTDNSBUcIRCIxEDHP\r\n' +
            'a=fingerprint:sha-256 69:75:F9:77:B2:00:5B:3F:E6:90:FB:FF:BA:39:82:AC:34:C8:08:4E:BF:69:5D:44:C2:FD:4E:E8:A0:7A:A9:12\r\n' +
            'a=setup:actpass\r\n' +
            'a=sctpmap:5000 webrtc-datachannel 16\r\n' +
            '',
          sessid: 'jEcO',
          type: 'SETUP',
          version: '3.0',
        },
        conversation: conversation.id,
        from: 'fdbbf5e8-b1e8-474f-b63c-f007df2b4338',
        id: '89fb35d3-01c4-45f3-9a5b-7fbde558b6b2',
        sender: 'dddb4f5068e8c98b',
        time: new Date().toISOString(),
        type: 'call.e-call',
      };

      expect(callingRepo.callState.activeCalls().length).toBe(0);

      callingRepo.onIncomingCall(call => {
        expect(callingRepo.callState.activeCalls().length).toBe(1);

        done();
      });
      await callingRepo.onCallEvent(event);
    });
  });
});

describe.skip('E2E audio call', () => {
  const conversationRepository = {
    find_conversation_by_id: () => new Conversation(),
  };
  const messageRepository = {
    grantMessage: () => Promise.resolve(true),
  };
  const eventRepository = {injectEvent: () => {}};

  const client = new CallingRepository(
    conversationRepository,
    messageRepository,
    eventRepository,
    undefined,
    serverTimeHandler,
  );
  const user = new User('user-1');
  let remoteWuser;
  let wCall;

  beforeAll(() => {
    spyOn(client, 'fetchConfig').and.returnValue(Promise.resolve({ice_servers: []}));
    spyOn(client, 'getCallMediaStream').and.returnValue(
      Promise.resolve(new MediaStream([new RTCAudioSource().createTrack()])),
    );
    spyOn(client, 'getMediaStream').and.returnValue(
      Promise.resolve(new MediaStream([new RTCAudioSource().createTrack()])),
    );
    spyOn(client, 'onCallEvent').and.callThrough();
    spyOn(client, 'updateParticipantStream').and.callThrough();
    spyOn(client, 'incomingCallCallback').and.callFake(call => {
      client.answerCall(call, CALL_TYPE.AUDIO);
    });
    spyOn(client, 'checkConcurrentJoinedCall').and.returnValue(Promise.resolve(true));
    spyOn(client, 'sendMessage').and.callFake(
      (context, convId, userId, clientid, destUserId, destDeviceId, payload) => {
        wCall.recvMsg(remoteWuser, payload, payload.length, Date.now(), Date.now(), convId, userId, clientid);
      },
    );
    return client.initAvs(user, 'device').then(({wCall: wCallInstance, wUser}) => {
      remoteWuser = createAutoAnsweringWuser(wCallInstance, client);
      wCall = wCallInstance;
    });
  });

  let joinedCallSub;
  let activeCallsSub;
  let onCallClosed = () => {};
  let onCallConnected = () => {};
  beforeEach(() => {
    joinedCallSub = client.joinedCall.subscribe(call => {
      if (call) {
        const audioFlowingInterval = setInterval(() => {
          /* Wait for audio to start flowing before calling the onCallConnected callback.
           * To achieve this, we check every couple of ms that the stats contain audio and that there are bytes flowing there
           * Jasmine will eventually timeout if the audio is not flowing after 5s
           */
          client
            .getStats(call.conversationId)
            .then(extractAudioStats)
            .then(audioStats => {
              if (audioStats.length > 0) {
                onCallConnected();
                clearInterval(audioFlowingInterval);
              }
            });
        }, 30);
      }
    });
    activeCallsSub = client.activeCalls.subscribe(calls => {
      if (calls.length === 0) {
        onCallClosed();
      }
    });
  });

  afterEach(() => {
    joinedCallSub.dispose();
    activeCallsSub.dispose();
  });

  it('calls and connect with the remote user', done => {
    onCallClosed = done;
    onCallConnected = () => {
      expect(client.sendMessage).toHaveBeenCalledTimes(1);
      expect(client.onCallEvent).toHaveBeenCalledTimes(1);
      expect(client.updateParticipantStream).toHaveBeenCalled();
      client
        .getStats('conv-1')
        .then(extractAudioStats)
        .then(audioStats => {
          expect(audioStats.length).toBeGreaterThan(0);
          audioStats.forEach(stats => {
            expect(stats.bytesFlowing).toBeGreaterThan(0);
          });

          expect(client.joinedCall()).toBeDefined();
          client.leaveCall('conv-1');
        })
        .catch(done.fail);
    };
    client.startCall('conv-1', CONV_TYPE.ONEONONE, CALL_TYPE.AUDIO).catch(done.fail);
  });

  it('answers an incoming call and connect with the remote peer', done => {
    onCallClosed = done;
    onCallConnected = () => {
      expect(client.onCallEvent).toHaveBeenCalled();
      expect(client.incomingCallCallback).toHaveBeenCalled();
      client
        .getStats('conv-1')
        .then(extractAudioStats)
        .then(audioStats => {
          expect(audioStats.length).toBeGreaterThan(0);
          audioStats.forEach(stats => {
            expect(stats.bytesFlowing).toBeGreaterThan(0);
          });
          client.leaveCall('conv-1');
        })
        .catch(done.fail);
    };
    wCall.start(remoteWuser, 'conv-1', CALL_TYPE.AUDIO, CONV_TYPE.ONEONONE, 0);
  });
});

function extractAudioStats(stats) {
  const audioStats = [];
  stats.forEach(userStats => {
    userStats.stats.forEach(data => {
      if (data.kind === 'audio' || data.mediaType === 'audio') {
        const bytesFlowing = data.bytesReceived || data.bytesSent;
        if (bytesFlowing !== undefined && bytesFlowing > 0) {
          audioStats.push({bytesFlowing, id: data.id});
        }
      }
    });
  });
  return audioStats;
}

function createAutoAnsweringWuser(wCall, remoteCallingRepository) {
  const selfUserId = createRandomUuid();
  const selfClientId = createRandomUuid();
  const sendMsg = (context, conversationId, userId, clientId, destinationUserId, destinationClientId, payload) => {
    const event = {
      content: JSON.parse(payload),
      conversation: conversationId,
      from: userId,
      sender: clientId,
      time: Date.now(),
    };
    remoteCallingRepository.onCallEvent(event, EventRepository.SOURCE.WEB_SOCKET);
  };

  const incoming = conversationId => wCall.answer(wUser, conversationId, CALL_TYPE.AUDIO, 0);

  const requestConfig = () => {
    setTimeout(() => {
      wCall.configUpdate(wUser, 0, JSON.stringify({ice_servers: []}));
    });
  };

  const wUser = wCall.create(
    selfUserId,
    selfClientId,
    () => {}, // `readyh`,
    sendMsg, // `sendh`,
    incoming, // `incomingh`,
    () => {}, // `missedh`,
    () => {}, // `answerh`,
    () => {}, // `estabh`,
    () => {}, // `closeh`,
    () => {}, // `metricsh`,
    requestConfig, // `cfg_reqh`,
    () => {}, // `acbrh`,
    () => {}, // `vstateh`,
    0,
  );
  return wUser;
}
