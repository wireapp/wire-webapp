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

import {CALL_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from 'avs-web';
import ko from 'knockout';
import {AudioType} from '../audio/AudioType';
import {Call} from '../calling/Call';
import {CallingRepository} from '../calling/CallingRepository';
import {Grid, getGrid} from '../calling/videoGridHandler';

export class CallingViewModel {
  public readonly audioRepository: any;
  public readonly callingRepository: CallingRepository;
  public readonly conversationRepository: any;
  public readonly activeCalls: ko.ObservableArray<Call>;
  public readonly multitasking: any;
  public readonly callActions: any;

  constructor(
    callingRepository: CallingRepository,
    conversationRepository: any,
    audioRepository: any,
    multitasking: any
  ) {
    this.audioRepository = audioRepository;
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
    this.activeCalls = callingRepository.activeCalls;
    this.multitasking = multitasking;

    this.callActions = {
      answer: (call: Call) => this.callingRepository.answerCall(call.conversationId, CALL_TYPE.NORMAL),
      leave: (call: Call) => this.callingRepository.leaveCall(call.conversationId),
      reject: (call: Call) => this.callingRepository.rejectCall(call.conversationId),
      start: (call: Call) =>
        this.callingRepository.startCall(call.conversationId, call.conversationType, CALL_TYPE.NORMAL),
      toggleMute: (call: Call, muteState: boolean) => this.callingRepository.muteCall(call.conversationId, muteState),
    };

    ko.computed(() => {
      this.activeCalls().forEach(call => {
        const isOutgoing = this.isOutgoing(call);
        const isIncoming = this.isIncoming(call);
        const isDeclined = call.reason() === CALL_REASON.STILL_ONGOING;
        if (!isDeclined && (isOutgoing || isIncoming)) {
          const audioId = isIncoming ? AudioType.INCOMING_CALL : AudioType.OUTGOING_CALL;
          audioRepository.loop(audioId);
        } else {
          audioRepository.stop(AudioType.INCOMING_CALL);
          audioRepository.stop(AudioType.OUTGOING_CALL);
        }
      });
    });
  }

  getVideoGrid(call: Call): ko.PureComputed<Grid> {
    return getGrid(call.participants, call.selfParticipant);
  }

  hasVideos(call: Call): boolean {
    const callParticipants = call.participants().concat(call.selfParticipant);
    return !!callParticipants.find(participant => participant.hasActiveVideo());
  }

  isIdle(call: Call): boolean {
    return call.state() === CALL_STATE.NONE;
  }

  isOutgoing(call: Call): boolean {
    return call.state() === CALL_STATE.OUTGOING;
  }

  isConnecting(call: Call): boolean {
    return call.state() === CALL_STATE.ANSWERED;
  }

  isIncoming(call: Call): boolean {
    return call.state() === CALL_STATE.INCOMING;
  }

  isOngoing(call: Call): boolean {
    return call.state() === CALL_STATE.MEDIA_ESTAB;
  }

  getConversationById(conversationId: string): ko.Observable<any> {
    return this.conversationRepository.find_conversation_by_id(conversationId);
  }
}
