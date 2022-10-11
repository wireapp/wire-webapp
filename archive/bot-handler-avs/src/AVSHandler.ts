/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle} from '@wireapp/core/src/main/conversation/';
import {
  CALL_TYPE,
  CONV_TYPE,
  ENV as AVS_ENV,
  getAvsInstance,
  LOG_LEVEL,
  REASON,
  Wcall,
  WcallClient,
  WcallParticipantChangedHandler,
} from '@wireapp/avs';
import axios from 'axios';
import {CallMessage} from '@wireapp/core/src/main/conversation/message/OtrMessage';

import {Call} from './Call';

const wrtc = require('@koush/wrtc');

declare global {
  namespace NodeJS {
    interface Global {
      MediaStream: MediaStream;
      MediaStreamTrack: MediaStreamTrack;
      navigator: Navigator;
      nonstandard: {
        i420ToRgba: unknown;
        rgbaToI420: unknown;
        RTCAudioSink: unknown;
        RTCAudioSource: unknown;
        RTCVideoSink: unknown;
        RTCVideoSource: unknown;
      };
      RTCDataChannel: RTCDataChannel;
      RTCDataChannelEvent: RTCDataChannelEvent;
      RTCDtlsTransport: RTCDtlsTransport;
      RTCIceCandidate: unknown;
      RTCIceTransport: RTCIceTransport;
      RTCPeerConnection: RTCPeerConnection;
      RTCPeerConnectionIceEvent: RTCPeerConnectionIceEvent;
      RTCRtpReceiver: RTCRtpReceiver;
      RTCRtpSender: RTCRtpSender;
      RTCRtpTransceiver: RTCRtpTransceiver;
      RTCSctpTransport: RTCSctpTransport;
      RTCSessionDescription: unknown;
    }
  }
}

global.RTCPeerConnection = wrtc.RTCPeerConnection;
global.MediaStream = wrtc.MediaStream;
global.MediaStreamTrack = wrtc.MediaStreamTrack;
global.RTCRtpSender = wrtc.RTCRtpSender;
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    ...(global.navigator || {}).mediaDevices,
    getUserMedia: wrtc.getUserMedia,
  },
};

interface InitOptions {
  callParticipantChangedHandler?: WcallParticipantChangedHandler;
}

interface SendMessageTarget {
  clients: WcallClient[];
}

export class AVSHandler extends MessageHandler {
  private wCall?: Wcall;
  private wUser?: number;
  private activeCalls: Record<string, Call> = {};
  private readonly mediaStream: MediaStream = new MediaStream();

  async handleEvent(payload: PayloadBundle): Promise<void> {}

  async init(options: InitOptions = {}): Promise<void> {
    if (!this.account) {
      throw new Error(`No account found. Please login first.`);
    }
    const {clientId, userId} = this.account;
    const callingInstance = await getAvsInstance();
    const wCall = this.configureCallingApi(callingInstance);
    const wUser = this.createWUser(wCall, userId, clientId, options.callParticipantChangedHandler);
    this.wUser = wUser;
    this.wCall = wCall;
  }

  onIncomingCallMessage = (callMessage: CallMessage): void => {
    const callContent = callMessage.content;

    if (!callMessage.fromClientId) {
      throw new Error('callMessage.fromClientId not found');
    }

    const avsResult = this.wCall!.recvMsg(
      this.wUser!,
      callContent,
      callContent.length,
      new Date().getSeconds(),
      new Date(callMessage.timestamp).getSeconds(),
      callMessage.conversation,
      callMessage.from,
      callMessage.fromClientId,
    );

    if (avsResult !== 0) {
      throw new Error(`recvMsg failed with code "${avsResult}"`);
    }

    this.answerCall(callMessage);
  };

  startCall = (conversationId: string, conversationType: CONV_TYPE, callType: CALL_TYPE): void => {
    this.wCall!.start(this.wUser!, conversationId, callType, conversationType, 0);
  };

  leaveCall = (conversationId: string): void => {
    this.wCall!.end(this.wUser!, conversationId);
  };

  private readonly answerCall = (call: CallMessage) => {
    this.wCall!.answer(this.wUser!, call.conversation, CALL_TYPE.NORMAL, 0);
  };

  private readonly configureCallingApi = (wCall: Wcall): Wcall => {
    wCall.setLogHandler((level: LOG_LEVEL, message: string) => {
      console.info(`${level}: ${message}`);
    });

    const avsEnv = AVS_ENV.DEFAULT;
    wCall.init(avsEnv);
    wCall.setUserMediaHandler(this.mediaHandler);
    wCall.setMediaStreamHandler(() => {});
    setInterval(() => wCall.poll(), 500);
    return wCall;
  };

  private readonly mediaHandler = async (): Promise<MediaStream> => {
    return this.mediaStream;
  };

  private readonly createWUser = (
    wCall: Wcall,
    selfUserId: string,
    selfClientId: string,
    callParticipantChangedHandler?: WcallParticipantChangedHandler,
  ): number => {
    /* cspell:disable */
    const wUser = wCall.create(
      selfUserId,
      selfClientId,
      () => {}, // readyh
      this.onSendCallMessage, // sendh
      this.sendSFTRequest, // sfth
      this.onIncomingCall, // incomingh
      () => {}, // missedh
      () => {}, // answerh
      () => {}, // estabh
      this.callClosed, // closeh
      () => {}, // metricsh
      this.callConfigRequestHandler, // cfg_reqh
      () => {}, // acbrh
      () => {}, // vstateh
    );

    if (callParticipantChangedHandler) {
      wCall.setParticipantChangedHandler(wUser, callParticipantChangedHandler);
    }

    return wUser;
  };

  private readonly callConfigRequestHandler = (): number => {
    this.account!.service!.account.getCallConfig()
      .then(config => {
        this.wCall!.configUpdate(this.wUser!, 0, JSON.stringify(config));
      })
      .catch(_ => {
        this.wCall!.configUpdate(this.wUser!, 1, '');
      });

    return 0;
  };

  private readonly sendSFTRequest = (
    context: number,
    url: string,
    data: string,
    dataLength: number,
    _: number,
  ): number => {
    void (async () => {
      try {
        const response = await axios.post(url, data);
        const {status, data: axiosData} = response;
        const jsonData = JSON.stringify(axiosData);
        this.wCall!.sftResp(this.wUser!, status, jsonData, jsonData.length, context);
      } catch (error) {
        console.warn('Failed to send SFT request', error);
      }
    })();
    return 0;
  };

  private readonly onSendCallMessage = (
    context: number,
    conversationId: string,
    userId: string,
    clientId: string,
    targets: string | null,
    unused: string | null,
    payload: string,
  ): number => {
    const userIds: string[] = [];

    if (typeof targets === 'string') {
      const parsedTargets: SendMessageTarget = JSON.parse(targets);
      for (const target of parsedTargets.clients) {
        userIds.push(target.userid);
      }
    }

    void (async () => {
      try {
        await this.sendCall(conversationId, payload, userIds);
      } catch (error) {
        console.error('Failed to send targeted message', error);
      }
    })();

    return 0;
  };

  private readonly onIncomingCall = (
    conversationId: string,
    timestamp: number,
    userId: string,
    clientId: string,
    hasVideo: number,
    shouldRing: number,
  ) => {
    const call: Call = {
      clientId,
      conversationId,
      hasVideo,
      shouldRing,
      timestamp,
      userId,
    };
    this.storeCall(call);
  };

  private readonly callClosed = (reason: REASON, conversationId: string): void => {
    this.removeCall(conversationId);
  };

  private readonly storeCall = (call: Call): void => {
    this.activeCalls[call.conversationId] = call;
  };

  private readonly removeCall = (conversationId: string): void => {
    delete this.activeCalls[conversationId];
  };
}
