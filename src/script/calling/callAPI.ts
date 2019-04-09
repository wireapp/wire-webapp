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

import {SDPMapper} from './SDPMapper';

enum CALL_MESSAGE_TYPE {
  CANCEL = 'CANCEL',
  GROUP_CHECK = 'GROUPCHECK',
  GROUP_LEAVE = 'GROUPLEAVE',
  GROUP_SETUP = 'GROUPSETUP',
  GROUP_START = 'GROUPSTART',
  HANGUP = 'HANGUP',
  PROP_SYNC = 'PROPSYNC',
  REJECT = 'REJECT',
  SETUP = 'SETUP',
  UPDATE = 'UPDATE',
}

export enum CALL_TYPE {
  NORMAL = 0,
  VIDEO = 1,
  FORCED_AUDIO = 2,
}

export enum CONVERSATION_TYPE {
  ONEONONE = 0,
  GROUP = 1,
  CONFERENCE = 2,
}

export enum CALL_STATE {
  NONE = 0 /* There is no call */,
  OUTGOING = 1 /* Outgoing call is pending */,
  INCOMING = 2 /* Incoming call is pending */,
  ANSWERED = 3 /* Call has been answered, but no media */,
  MEDIA_ESTAB = 4 /* Call has been answered, with media */,
  TERM_LOCAL = 6 /* Call was locally terminated */,
  TERM_REMOTE = 7 /* Call was remotely terminated */,
  UNKNOWN = 8 /* Unknown */,
}

interface WCallCallbacks {
  sendMessage: (
    context: any,
    conversationId: string,
    userId: string,
    clientId: string,
    destUserId: string | undefined,
    destUserClient: string | undefined,
    data: string,
    size: number
  ) => number;
  requestConfig: () => number;
}

class WCall {
  conversationId: string;
  state: CALL_STATE;
  callType: CALL_TYPE;
  conversationType: CONVERSATION_TYPE;
  audioCbr: boolean;
  sessionId: string;
  peerConnection: RTCPeerConnection;
  mediaStream: MediaStream;

  constructor(
    callType: CALL_TYPE,
    conversationId: string,
    conversationType: CONVERSATION_TYPE,
    sessionId: string,
    peerConnection: RTCPeerConnection,
    audioCbr: boolean
  ) {
    this.conversationId = conversationId;
    this.conversationType = conversationType;
    this.callType = callType;
    this.sessionId = sessionId;
    this.peerConnection = peerConnection;
    this.audioCbr = audioCbr;
  }
}

class WUser {
  userId: string;
  clientId: string;
  callbacks: WCallCallbacks;
  constructor(userId: string, clientId: string, callbacks: WCallCallbacks) {
    this.userId = userId;
    this.clientId = clientId;
    const logProxy = (fnName: string, fn: Function) => (...args) => {
      console.log('felix', fnName, args);
      fn(...args);
    };
    this.callbacks = Object.entries(callbacks).reduce((acc, [key, value]) => {
      return Object.assign({}, acc, {[key]: logProxy(key, value)});
    }, {});
  }
}

interface ActiveCalls {
  [callId: string]: WCall;
}

interface CallState {
  callConfig: any;
  activeCalls: ActiveCalls;
  callStateHandler: (conversationId: string, state: CALL_STATE) => void;
}
const state: CallState = {
  callConfig: {},
  activeCalls: {},
  callStateHandler: () => {},
};

export function callCreate(userId: string, clientId: string, callbacks: WCallCallbacks): WUser {
  const wUser = new WUser(userId, clientId, callbacks);
  wUser.callbacks.requestConfig();
  return wUser;
}

// statefull (will add a call to the list of ongoing calls)
export function callStart(
  wUser: WUser,
  conversationId: string,
  callType: CALL_TYPE,
  conversationType: CONVERSATION_TYPE,
  audioCbr: boolean
): boolean {
  const activeCall = findCallInstance(wUser, conversationId);
  if (activeCall) {
    //Do Stuff
  }
  const wCall = new WCall(
    callType,
    conversationId,
    conversationType,
    generateSessionId(),
    initPeerConnection(wUser, conversationId),
    audioCbr
  );
  wCall.state = CALL_STATE.OUTGOING;

  // add the call to the state
  storeCallInstance(wUser, conversationId, wCall);

  navigator.mediaDevices
    .getUserMedia({audio: true})
    .then(stream => {
      wCall.mediaStream = stream;
      stream.getTracks().forEach(function(track) {
        wCall.peerConnection.addTrack(track, stream);
      });
    })
    .then(() => {
      state.callStateHandler(conversationId, CALL_STATE.OUTGOING);
      wCall.peerConnection
        .createOffer({iceRestart: false, voiceActivityDetection: true})
        .then((sessionDescription: RTCSessionDescription) => {
          wCall.peerConnection.setLocalDescription(sessionDescription);
          window.setTimeout(() => {
            const transformedSdp = SDPMapper.rewriteSdp(wCall.peerConnection.localDescription, {
              isGroup: false,
              isIceRestart: false,
              isLocalSdp: true,
            });
            const message = buildMessagePayload(
              CALL_MESSAGE_TYPE.SETUP,
              wCall.sessionId,
              transformedSdp.sdp.sdp,
              false
            );
            wUser.callbacks.sendMessage(
              undefined,
              conversationId,
              wUser.userId,
              wUser.clientId,
              undefined,
              undefined,
              message,
              0
            );
          }, 500);
        });
    });
  return true;
}

export function setCallStateHandler(callStateHandler: (conversationId: string, state: CALL_STATE) => void): void {
  state.callStateHandler = callStateHandler;
}

export function callEnd(wUser: WUser, conversationId: string): void {
  const wCall = findCallInstance(wUser, conversationId);
  releaseCall(wCall);
  // TODO if connected => HANGUP on datachannel
  // is !connected => OTR CANCEL message
  const message = buildMessagePayload(CALL_MESSAGE_TYPE.HANGUP, wCall.sessionId, undefined, false);
  state.callStateHandler(conversationId, CALL_STATE.TERM_LOCAL);
  wUser.callbacks.sendMessage(
    undefined,
    conversationId,
    wUser.userId,
    wUser.clientId,
    undefined,
    undefined,
    message,
    0
  );
}

function releaseCall(wCall: WCall): void {
  wCall.peerConnection.close();
  wCall.mediaStream.getTracks().forEach(track => track.stop());
}

export function callConfigUpdate(config: any) {
  state.callConfig = config;
}

export function callReceiveMessage(
  wUser: WUser,
  message: string,
  length: number,
  currentTime: number,
  messageTime: number,
  conversationId: string,
  userId: string,
  clientId: string
): number {
  const content = JSON.parse(message);
  console.log('felix received msg', content);
  switch (content.type) {
    case CALL_MESSAGE_TYPE.SETUP:
      const sessionDescription = SDPMapper.mapMessageContentToRTCSessionDescription(content);
      const transformedSdp = SDPMapper.rewriteSdp(sessionDescription, {
        isGroup: false,
        isIceRestart: false,
        isLocalSdp: false,
      });

      if (content.resp) {
        const callInstance = findCallInstance(wUser, conversationId);
        callInstance.peerConnection.setRemoteDescription(transformedSdp.sdp);
        state.callStateHandler(conversationId, CALL_STATE.ANSWERED);
      } else {
        const peerConnection = initPeerConnection(wUser, conversationId);
        const conversationType = CONVERSATION_TYPE.ONEONONE;
        const wCall = new WCall(
          CALL_TYPE.FORCED_AUDIO,
          conversationId,
          conversationType,
          content.sessid,
          peerConnection,
          false
        );
        storeCallInstance(wUser, conversationId, wCall);
        peerConnection.setRemoteDescription(transformedSdp.sdp);

        navigator.mediaDevices
          .getUserMedia({audio: true})
          .then(stream => {
            wCall.mediaStream = stream;
            stream.getTracks().forEach(track => {
              peerConnection.addTrack(track, stream);
            });
          })
          .then(() => {
            return peerConnection
              .createAnswer({iceRestart: false, voiceActivityDetection: true})
              .then((sessionDescription: RTCSessionDescription) => {
                peerConnection.setLocalDescription(sessionDescription);
                return peerConnection;
              });
          })
          .then(peerConnection => {
            setTimeout(() => {
              const transformedSdp = SDPMapper.rewriteSdp(peerConnection.localDescription, {
                isGroup: false,
                isIceRestart: false,
                isLocalSdp: true,
              });
              const message = buildMessagePayload(
                CALL_MESSAGE_TYPE.SETUP,
                generateSessionId(),
                transformedSdp.sdp.sdp,
                true
              );
              wUser.callbacks.sendMessage(
                undefined,
                conversationId,
                wUser.userId,
                wUser.clientId,
                undefined,
                undefined,
                message,
                0
              );
            }, 500);
          });
      }
      break;

    case CALL_MESSAGE_TYPE.CANCEL:
    case CALL_MESSAGE_TYPE.HANGUP:
      const callInstance = findCallInstance(wUser, conversationId);
      releaseCall(callInstance);
      state.callStateHandler(conversationId, CALL_STATE.TERM_REMOTE);
      break;
  }
  return 0;
}

function initPeerConnection(wUser: WUser, conversationId: string): RTCPeerConnection {
  const peerConnection = new window.RTCPeerConnection(state.callConfig);

  const datachannel = peerConnection.createDataChannel('calling-3.0', {ordered: true});
  datachannel.onmessage = ({data}: {data: string}) => {
    callReceiveMessage(wUser, data, data.length, Date.now(), Date.now(), conversationId, null, null);
  };
  peerConnection.ontrack = () => {
    state.callStateHandler(conversationId, CALL_STATE.MEDIA_ESTAB);
  };
  /*
  peerConnection.onaddstream = console.log.bind(console, 'felix onaddstream ');
  peerConnection.onicecandidate = console.log.bind(console, 'felix onicecandidate ');
  peerConnection.oniceconnectionstatechange = console.log.bind(console, 'felix oniceconnectionstatechange ');
  peerConnection.onremovestream = console.log.bind(console, 'felix onremovestream ');
  peerConnection.onsignalingstatechange = console.log.bind(console, 'felix onsignalingstatechange ');
  */

  return peerConnection;
}

export function callGetState(wUser: WUser, conversationId: string): CALL_STATE {
  const callIdentifier = generateCallId(wUser, conversationId);
  const foundCall = state.activeCalls[callIdentifier];
  return foundCall ? foundCall.state : CALL_STATE.UNKNOWN;
}

function buildMessagePayload(type: CALL_MESSAGE_TYPE, sessid: string, sdp: string, isReponse: boolean): string {
  return JSON.stringify({
    resp: isReponse,
    type,
    version: '3.0',
    props: {audiosend: 'true', screensend: 'false', videosend: 'false'},
    sdp,
    sessid,
  });
}

function findCallInstance(wUser: WUser, conversationId: string): WCall | undefined {
  const callIdentifier = generateCallId(wUser, conversationId);
  return state.activeCalls[callIdentifier];
}

function storeCallInstance(wUser: WUser, conversationId: string, wCall: WCall): void {
  const callIdentifier = generateCallId(wUser, conversationId);
  state.activeCalls[callIdentifier] = wCall;
}

function generateCallId(call: WUser, conversationId: string): string {
  return call.userId + call.clientId + conversationId;
}

function generateSessionId(): string {
  const sessionIdSize = 4;
  return Math.random()
    .toString(36)
    .substring(sessionIdSize);
}
