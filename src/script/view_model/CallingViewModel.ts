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

import {CALL_TYPE, CONV_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import ko from 'knockout';
import {AudioType} from '../audio/AudioType';
import {Call} from '../calling/Call';
import {CallingRepository} from '../calling/CallingRepository';
import {Grid, getGrid} from '../calling/videoGridHandler';
import {PermissionState} from '../notification/PermissionState';

export class CallingViewModel {
  public readonly audioRepository: any;
  public readonly callingRepository: CallingRepository;
  public readonly conversationRepository: any;
  public readonly mediaDevicesHandler: any;
  public readonly permissionRepository: any;
  public readonly activeCalls: ko.PureComputed<Call[]>;
  public readonly multitasking: any;
  public readonly callActions: any;

  constructor(
    callingRepository: CallingRepository,
    conversationRepository: any,
    audioRepository: any,
    mediaDevicesHandler: any,
    permissionRepository: any,
    multitasking: any
  ) {
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
    this.mediaDevicesHandler = mediaDevicesHandler;
    this.permissionRepository = permissionRepository;
    this.activeCalls = ko.pureComputed(() =>
      callingRepository.activeCalls().filter(call => call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE)
    );
    this.multitasking = multitasking;

    const ring = (call: Call): void => {
      const sounds: any = {
        [CALL_STATE.INCOMING]: AudioType.INCOMING_CALL,
        [CALL_STATE.OUTGOING]: AudioType.OUTGOING_CALL,
      };
      const initialCallState = call.state();
      const soundId = sounds[initialCallState];
      if (!soundId) {
        return;
      }

      audioRepository.loop(soundId).then(() => {
        const stateSubscription = ko.computed(() => {
          if (call.state() !== initialCallState || call.reason() !== undefined) {
            window.setTimeout(() => {
              audioRepository.stop(soundId);
              stateSubscription.dispose();
            });
          }
        });
      });
    };

    const startCall = (conversationEntity: any, callType: CALL_TYPE): void => {
      const convType = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
      this.callingRepository.startCall(conversationEntity.id, convType, callType).then(call => {
        if (!call) {
          return;
        }
        ring(call);
      });
    };

    this.callingRepository.onIncomingCall(ring);

    this.callActions = {
      answer: (call: Call) => {
        const callType = call.selfParticipant.sharesCamera() ? call.initialType : CALL_TYPE.NORMAL;
        this.callingRepository.answerCall(call.conversationId, callType);
      },
      leave: (call: Call) => {
        this.callingRepository.leaveCall(call.conversationId);
      },
      reject: (call: Call) => {
        this.callingRepository.rejectCall(call.conversationId);
      },
      startAudio: (conversationEntity: any): void => {
        startCall(conversationEntity, CALL_TYPE.NORMAL);
      },
      startVideo(conversationEntity: any): void {
        startCall(conversationEntity, CALL_TYPE.VIDEO);
      },
      switchCameraInput: (call: Call, deviceId: string) => {
        this.callingRepository.switchCameraInput(call.conversationId, deviceId);
      },
      toggleCamera: (call: Call) => {
        this.callingRepository.toggleCamera(call);
      },
      toggleMute: (call: Call, muteState: boolean) => {
        this.callingRepository.muteCall(call.conversationId, muteState);
      },
      toggleScreenshare: (call: Call) => {
        this.callingRepository.toggleScreenshare(call);
      },
    };

    const currentCall = ko.pureComputed(() => {
      return this.activeCalls()[0];
    });
    let currentCallSubscription: ko.Subscription | undefined;

    const participantsAudioElement: Record<string, HTMLAudioElement> = {};
    ko.computed(() => {
      const call = this.callingRepository.joinedCall();
      if (call) {
        call.participants().forEach(participant => {
          if (!participantsAudioElement[participant.userId]) {
            const audioElement = new Audio();
            audioElement.srcObject = participant.audioStream();
            audioElement.play();
            participantsAudioElement[participant.userId] = audioElement;
          }
        });
      } else {
        Object.keys(participantsAudioElement).forEach(userId => {
          delete participantsAudioElement[userId];
        });
      }
    });

    ko.computed(() => {
      const call = currentCall();
      if (currentCallSubscription) {
        currentCallSubscription.dispose();
      }
      if (!call) {
        return;
      }
      currentCallSubscription = call.participants.subscribe(
        participantChanges => {
          const memberJoined = participantChanges.find(({status}) => status === 'added');
          const memberLeft = participantChanges.find(({status}) => status === 'deleted');

          if (memberJoined) {
            audioRepository.play(AudioType.READY_TO_TALK);
          }
          if (memberLeft) {
            audioRepository.play(AudioType.TALK_LATER);
          }
        },
        null,
        'arrayChange'
      );
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

  hasAccessToCamera(): boolean {
    return this.permissionRepository.permissionState.camera() === PermissionState.GRANTED;
  }
}
