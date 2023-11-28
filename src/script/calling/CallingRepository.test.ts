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

import {ConversationProtocol, CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import 'jsdom-worker';
import ko, {Subscription} from 'knockout';
import {container} from 'tsyringe';

import {CONV_TYPE, CALL_TYPE, STATE as CALL_STATE, REASON, Wcall} from '@wireapp/avs';
import {Runtime} from '@wireapp/commons';

import {Call} from 'src/script/calling/Call';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {CallState} from 'src/script/calling/CallState';
import {Participant} from 'src/script/calling/Participant';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {EventRepository} from 'src/script/event/EventRepository';
import {MediaType} from 'src/script/media/MediaType';
import {serverTimeHandler} from 'src/script/time/serverTimeHandler';
import {TestFactory} from 'test/helper/TestFactory';
import {createUuid} from 'Util/uuid';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import {LEAVE_CALL_REASON} from './enum/LeaveCallReason';

import {CALL} from '../event/Client';
import {MediaDevicesHandler} from '../media/MediaDevicesHandler';
import {Core} from '../service/CoreSingleton';
import {UserRepository} from '../user/UserRepository';

const createSelfParticipant = () => {
  const selfUser = new User();
  selfUser.isMe = true;
  return new Participant(selfUser, 'client1');
};

const createConversation = (
  type: CONVERSATION_TYPE = CONVERSATION_TYPE.ONE_TO_ONE,
  protocol: ConversationProtocol = ConversationProtocol.PROTEUS,
  conversationId: QualifiedId = {id: createUuid(), domain: ''},
  groupId = 'group-id',
) => {
  const conversation = new Conversation(conversationId.id, conversationId.domain, protocol);
  conversation.participating_user_ets.push(new User(createUuid()));
  conversation.type(type);
  if (protocol === ConversationProtocol.MLS) {
    conversation.groupId = groupId;
  }
  return conversation;
};

describe('CallingRepository', () => {
  const testFactory = new TestFactory();
  let callingRepository: CallingRepository;
  let wCall: Wcall;
  let wUser: number;
  const selfUser = new User(createUuid());
  selfUser.isMe = true;
  const clientId = createUuid();

  const mediaDevices = {
    audioinput: ko.pureComputed(() => 'test'),
    audiooutput: ko.pureComputed(() => 'test'),
    screeninput: ko.pureComputed(() => 'test'),
    videoinput: ko.pureComputed(() => 'test'),
  };

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
    callingRepository['callState'].calls([]);
    callingRepository['conversationState'].conversations([]);
    callingRepository.destroy();
    jest.clearAllMocks();
  });

  afterAll(() => {
    return wCall && wCall.destroy(wUser);
  });

  describe('startCall', () => {
    it.each([ConversationProtocol.PROTEUS, ConversationProtocol.MLS])(
      'starts a ONEONONE call for proteus or MLS 1:1 conversation',
      async protocol => {
        const conversation = createConversation(CONVERSATION_TYPE.ONE_TO_ONE, protocol);
        const callType = CALL_TYPE.NORMAL;
        spyOn(wCall, 'start');
        await callingRepository.startCall(conversation, callType);
        expect(wCall.start).toHaveBeenCalledWith(wUser, conversation.id, callType, CONV_TYPE.ONEONONE, 0);
      },
    );

    it('starts a conference call in a group conversation for proteus', async () => {
      jest.spyOn(Runtime, 'isSupportingConferenceCalling').mockReturnValue(true);
      const conversation = createConversation(CONVERSATION_TYPE.REGULAR, ConversationProtocol.PROTEUS);
      const callType = CALL_TYPE.NORMAL;
      spyOn(wCall, 'start');
      await callingRepository.startCall(conversation, callType);
      expect(wCall.start).toHaveBeenCalledWith(wUser, conversation.id, callType, CONV_TYPE.CONFERENCE, 0);
    });

    it('starts a MLS conference call in a group conversation for MLS', async () => {
      jest.spyOn(Runtime, 'isSupportingConferenceCalling').mockReturnValue(true);
      const conversation = createConversation(CONVERSATION_TYPE.REGULAR, ConversationProtocol.MLS);
      const callType = CALL_TYPE.NORMAL;
      spyOn(wCall, 'start');
      await callingRepository.startCall(conversation, callType);
      expect(wCall.start).toHaveBeenCalledWith(wUser, conversation.id, callType, CONV_TYPE.CONFERENCE_MLS, 0);
    });

    it('subscribes to epoch updates after initiating a mls conference call', async () => {
      const conversationId = {domain: 'example.com', id: 'conversation1'};

      const groupId = 'groupId';
      const mlsConversation = createConversation(
        CONVERSATION_TYPE.REGULAR,
        ConversationProtocol.MLS,
        conversationId,
        groupId,
      );

      await callingRepository.startCall(mlsConversation, CALL_TYPE.NORMAL);

      expect(container.resolve(Core).service?.subconversation.subscribeToEpochUpdates).toHaveBeenCalledWith(
        conversationId,
        groupId,
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('does not subscribe to epoch updates after initiating a call in 1:1 mls conversation', async () => {
      const conversationId = {domain: 'example.com', id: 'conversation1'};

      const groupId = 'groupId';
      const mlsConversation = createConversation(
        CONVERSATION_TYPE.ONE_TO_ONE,
        ConversationProtocol.MLS,
        conversationId,
        groupId,
      );

      await callingRepository.startCall(mlsConversation, CALL_TYPE.NORMAL);

      expect(container.resolve(Core).service?.subconversation.subscribeToEpochUpdates).not.toHaveBeenCalled();
    });
  });

  describe('answerCall', () => {
    it('subscribes to epoch updates after answering a mls conference call', async () => {
      const conversationId = {domain: 'example.com', id: 'conversation2'};
      const selfParticipant = createSelfParticipant();
      const userId = {domain: '', id: ''};

      const groupId = 'groupId';
      const mlsConversation = createConversation(
        CONVERSATION_TYPE.REGULAR,
        ConversationProtocol.MLS,
        conversationId,
        groupId,
      );

      const incomingCall = new Call(
        userId,
        mlsConversation.qualifiedId,
        CONV_TYPE.CONFERENCE_MLS,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );

      jest.spyOn(callingRepository, 'pushClients').mockResolvedValueOnce(true);
      callingRepository['conversationState'].conversations.push(mlsConversation);

      await callingRepository.answerCall(incomingCall);

      expect(container.resolve(Core).service?.subconversation.subscribeToEpochUpdates).toHaveBeenCalledWith(
        conversationId,
        groupId,
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('does not subscribe to epoch updates after answering a call in mls 1:1 conversation', async () => {
      const conversationId = {domain: 'example.com', id: 'conversation2'};
      const selfParticipant = createSelfParticipant();
      const userId = {domain: '', id: ''};

      const groupId = 'groupId';
      const mlsConversation = createConversation(
        CONVERSATION_TYPE.ONE_TO_ONE,
        ConversationProtocol.MLS,
        conversationId,
        groupId,
      );

      const incomingCall = new Call(
        userId,
        mlsConversation.qualifiedId,
        CONV_TYPE.ONEONONE,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );

      jest.spyOn(callingRepository, 'pushClients').mockResolvedValueOnce(true);
      callingRepository['conversationState'].conversations.push(mlsConversation);

      await callingRepository.answerCall(incomingCall);

      expect(container.resolve(Core).service?.subconversation.subscribeToEpochUpdates).not.toHaveBeenCalled();
    });
  });

  describe('joinedCall', () => {
    it('only exposes the current active call', () => {
      const selfParticipant = createSelfParticipant();
      const userId = {domain: '', id: ''};
      const incomingCall = new Call(
        userId,
        createConversation().qualifiedId,
        CONV_TYPE.CONFERENCE,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );
      incomingCall.state(CALL_STATE.INCOMING);

      const activeCall = new Call(
        userId,
        createConversation().qualifiedId,
        CONV_TYPE.CONFERENCE,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );
      activeCall.state(CALL_STATE.MEDIA_ESTAB);

      const declinedCall = new Call(
        userId,
        createConversation().qualifiedId,
        CONV_TYPE.CONFERENCE,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );
      declinedCall.state(CALL_STATE.INCOMING);
      declinedCall.reason(REASON.STILL_ONGOING);

      callingRepository['callState'].calls([incomingCall, activeCall, declinedCall]);

      expect(callingRepository['callState'].joinedCall()).toBe(activeCall);
    });
  });

  describe('getCallMediaStream', () => {
    it('returns cached mediastream for self user if set', () => {
      const selfParticipant = createSelfParticipant();
      const userId = {domain: '', id: ''};
      const call = new Call(
        userId,
        createConversation().qualifiedId,
        CONV_TYPE.CONFERENCE,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );
      const source = new window.RTCAudioSource();
      const audioTrack = source.createTrack();
      const selfMediaStream = new MediaStream([audioTrack]);
      selfParticipant.audioStream(selfMediaStream);
      spyOn(selfParticipant, 'getMediaStream').and.callThrough();
      spyOn(callingRepository, 'findCall').and.returnValue(call);

      const queries = [1, 2, 3, 4].map(() => {
        return callingRepository['getCallMediaStream']('', true, false, false).then(mediaStream => {
          expect(mediaStream.getAudioTracks()[0]).toBe(audioTrack);
        });
      });
      return Promise.all(queries).then(() => {
        expect(selfParticipant.getMediaStream).toHaveBeenCalledTimes(queries.length);
        audioTrack.stop();
      });
    });

    it('asks only once for mediastream when queried multiple times', () => {
      const selfParticipant = createSelfParticipant();
      const call = new Call(
        {domain: '', id: ''},
        createConversation().qualifiedId,
        CONV_TYPE.CONFERENCE,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );
      const source = new window.RTCAudioSource();
      const audioTrack = source.createTrack();
      const selfMediaStream = new MediaStream([audioTrack]);
      spyOn(callingRepository['mediaStreamHandler'], 'requestMediaStream').and.returnValue(
        Promise.resolve(selfMediaStream),
      );
      spyOn(callingRepository, 'findCall').and.returnValue(call);

      const queries = [1, 2, 3, 4].map(() => {
        return callingRepository['getCallMediaStream']('', true, false, false).then(mediaStream => {
          expect(mediaStream.getAudioTracks()[0]).toBe(audioTrack);
        });
      });
      return Promise.all(queries).then(() => {
        expect(callingRepository['mediaStreamHandler'].requestMediaStream).toHaveBeenCalledTimes(1);
        audioTrack.stop();
      });
    });
  });

  describe('stopMediaSource', () => {
    it('releases media streams', () => {
      const selfParticipant = createSelfParticipant();
      spyOn(selfParticipant, 'releaseAudioStream');
      spyOn(selfParticipant, 'releaseVideoStream');

      const call = new Call(
        {domain: '', id: ''},
        createConversation().qualifiedId,
        0,
        selfParticipant,
        CALL_TYPE.NORMAL,
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler,
      );
      spyOn(callingRepository['callState'], 'joinedCall').and.returnValue(call);
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
  const mediaDevices = {
    audioinput: ko.pureComputed(() => 'test'),
    audiooutput: ko.pureComputed(() => 'test'),
    screeninput: ko.pureComputed(() => 'test'),
    videoinput: ko.pureComputed(() => 'test'),
  };
  describe('incoming call', () => {
    let avsUser: number;
    let avsCall: Wcall;

    afterEach(() => {
      return avsCall && avsCall.destroy(avsUser);
    });

    it('creates and stores a new call when an incoming call arrives', async () => {
      const selfUser = new User(createUuid());
      selfUser.isMe = true;

      const conversation = new Conversation(createUuid());

      const callingRepo = new CallingRepository(
        {
          grantMessage: jest.fn(),
        } as any, // MessageRepository
        {
          injectEvent: jest.fn(),
        } as any, // EventRepository
        {} as any, // UserRepository
        {} as any, // MediaStreamHandler
        {
          currentAvailableDeviceId: mediaDevices,
        } as unknown as MediaDevicesHandler, // mediaDevicesHandler
        {
          toServerTimestamp: jest.fn().mockImplementation(() => Date.now()),
        } as any, // ServerTimeHandler
        {} as any, // APIClient
        {
          findConversation: jest.fn().mockImplementation(() => conversation),
          participating_user_ets: jest.fn(),
        } as any, // ConversationState
        new CallState(),
      );

      const avs = await callingRepo.initAvs(selfUser, createUuid());
      // provide global handle for cleanup
      avsUser = avs.wUser;
      avsCall = avs.wCall;

      const event: any = {
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
          type: CALL_MESSAGE_TYPE.SETUP,
          version: '3.0',
        },
        conversation: conversation.id,
        from: 'fdbbf5e8-b1e8-474f-b63c-f007df2b4338',
        id: '89fb35d3-01c4-45f3-9a5b-7fbde558b6b2',
        sender: 'dddb4f5068e8c98b',
        time: new Date().toISOString(),
        type: CALL.E_CALL,
      };

      expect(callingRepo['callState'].calls().length).toBe(0);

      callingRepo.onIncomingCall(call => {
        expect(callingRepo['callState'].calls().length).toBe(1);

        return Promise.resolve();
      });
      await callingRepo.onCallEvent(event, '');
    });
  });
});

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('E2E audio call', () => {
  const messageRepository = {
    grantMessage: () => Promise.resolve(true),
  } as any;
  const eventRepository = {injectEvent: () => {}} as any;

  const client = new CallingRepository(
    messageRepository,
    eventRepository,
    {} as UserRepository,
    serverTimeHandler as any,
    {} as any,
    {} as any,
  );
  const user = new User('user-1');
  let remoteWuser: number;
  let wCall: Wcall;

  beforeAll(() => {
    spyOn(client, 'fetchConfig').and.returnValue(Promise.resolve({ice_servers: []}));
    spyOn<any>(client, 'getCallMediaStream').and.returnValue(
      Promise.resolve(new MediaStream([new window.RTCAudioSource().createTrack()])),
    );
    spyOn<any>(client, 'getMediaStream').and.returnValue(
      Promise.resolve(new MediaStream([new window.RTCAudioSource().createTrack()])),
    );
    spyOn(client, 'onCallEvent').and.callThrough();
    spyOn<any>(client, 'updateParticipantStream').and.callThrough();
    spyOn<any>(client, 'incomingCallCallback').and.callFake(call => {
      client.answerCall(call, CALL_TYPE.NORMAL);
    });
    spyOn<any>(client, 'checkConcurrentJoinedCall').and.returnValue(Promise.resolve(true));
    spyOn<any>(client, 'sendMessage').and.callFake(
      (context, convId, userId, clientid, destUserId, destDeviceId, payload) => {
        wCall.recvMsg(
          remoteWuser,
          payload,
          payload.length,
          Date.now(),
          Date.now(),
          convId,
          userId,
          clientid,
          CONV_TYPE.CONFERENCE,
        );
      },
    );
    return client.initAvs(user, 'device').then(({wCall: wCallInstance, wUser}) => {
      remoteWuser = createAutoAnsweringWuser(wCallInstance, client);
      wCall = wCallInstance;
    });
  });

  let joinedCallSub: Subscription;
  let activeCallsSub: Subscription;
  let onCallClosed = () => {};
  let onCallConnected = () => {};
  beforeEach(() => {
    joinedCallSub = client['callState'].joinedCall.subscribe(call => {
      if (call) {
        const audioFlowingInterval = setInterval(() => {
          /* Wait for audio to start flowing before calling the onCallConnected callback.
           * To achieve this, we check every couple of ms that the stats contain audio and that there are bytes flowing there
           * Jasmine will eventually timeout if the audio is not flowing after 5s
           */
          client
            .getStats(call.conversationId)
            ?.then(extractAudioStats)
            .then(audioStats => {
              if (audioStats.length > 0) {
                onCallConnected();
                clearInterval(audioFlowingInterval);
              }
            });
        }, 30);
      }
    });
    activeCallsSub = client['callState'].calls.subscribe(calls => {
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
    const conversation = createConversation();
    onCallConnected = () => {
      expect(client['sendMessage']).toHaveBeenCalledTimes(1);
      expect(client.onCallEvent).toHaveBeenCalledTimes(1);
      client
        .getStats(conversation.qualifiedId)
        ?.then(extractAudioStats)
        .then(audioStats => {
          expect(audioStats.length).toBeGreaterThan(0);
          audioStats.forEach(stats => {
            expect(stats.bytesFlowing).toBeGreaterThan(0);
          });

          expect(client['callState'].joinedCall()).toBeDefined();
          client.leaveCall(conversation.qualifiedId, LEAVE_CALL_REASON.MANUAL_LEAVE_BY_UI_CLICK);
        })
        .catch(done.fail);
    };
    client.startCall(conversation, CALL_TYPE.NORMAL).catch(done.fail);
  });

  it('answers an incoming call and connect with the remote peer', done => {
    onCallClosed = done;
    const conversationId = createConversation().qualifiedId;
    onCallConnected = () => {
      expect(client.onCallEvent).toHaveBeenCalled();
      expect(client['incomingCallCallback']).toHaveBeenCalled();
      client
        .getStats(conversationId)
        ?.then(extractAudioStats)
        .then(audioStats => {
          expect(audioStats.length).toBeGreaterThan(0);
          audioStats.forEach(stats => {
            expect(stats.bytesFlowing).toBeGreaterThan(0);
          });
          client.leaveCall(conversationId, LEAVE_CALL_REASON.MANUAL_LEAVE_BY_UI_CLICK);
        })
        .catch(done.fail);
    };
    wCall.start(remoteWuser, conversationId.id, CALL_TYPE.NORMAL, CONV_TYPE.ONEONONE, 0);
  });
});

function extractAudioStats(stats: any) {
  const audioStats: any[] = [];
  stats.forEach((userStats: any) => {
    userStats.stats.forEach((data: any) => {
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

function createAutoAnsweringWuser(wCall: Wcall, remoteCallingRepository: CallingRepository) {
  const selfUserId = createUuid();
  const selfClientId = createUuid();
  const sendMsg = (
    _context: number,
    conversationId: string,
    userId: string,
    clientId: string,
    targets: string | null,
    _unused: string | null,
    payload: string,
  ) => {
    const event = {
      content: JSON.parse(payload),
      conversation: conversationId,
      from: userId,
      sender: clientId,
      time: Date.now(),
    } as any;
    remoteCallingRepository.onCallEvent(event, EventRepository.SOURCE.WEB_SOCKET);
    return 0;
  };

  const incoming = (conversationId: string) => wCall.answer(wUser, conversationId, CALL_TYPE.NORMAL, 0);

  const requestConfig = () => {
    setTimeout(() => {
      wCall.configUpdate(wUser, 0, JSON.stringify({ice_servers: []}));
    });
    return 0;
  };

  const wUser = wCall.create(
    selfUserId,
    selfClientId,
    () => {}, // `readyh`,
    sendMsg, // `sendh`,
    () => 0, // `sfth`
    incoming, // `incomingh`,
    () => {}, // `missedh`,
    () => {}, // `answerh`,
    () => {}, // `estabh`,
    () => {}, // `closeh`,
    () => {}, // `metricsh`,
    requestConfig, // `cfg_reqh`,
    (() => {}) as any, // `acbrh`,
    () => {}, // `vstateh`,
    0,
  );
  return wUser;
}
