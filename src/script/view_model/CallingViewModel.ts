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
import {Logger, getLogger} from 'Util/Logger';
import {AudioType} from '../audio/AudioType';
import {Call} from '../calling/Call';
import {CallingRepository} from '../calling/CallingRepository';
import {Grid, getGrid} from '../calling/videoGridHandler';
import {MediaDevicesHandler} from '../media/MediaDevicesHandler';
import {MediaStreamHandler} from '../media/MediaStreamHandler';
import {PermissionState} from '../notification/PermissionState';

import '../components/calling/chooseScreen';

declare global {
  interface HTMLAudioElement {
    setSinkId: (sinkId: string) => Promise<void>;
  }
}

export class CallingViewModel {
  public readonly audioRepository: any;
  public readonly callingRepository: CallingRepository;
  public readonly conversationRepository: any;
  public readonly mediaDevicesHandler: MediaDevicesHandler;
  public readonly mediaStreamHandler: MediaStreamHandler;
  public readonly permissionRepository: any;
  public readonly activeCalls: ko.PureComputed<Call[]>;
  public readonly multitasking: any;
  public readonly callActions: any;
  public readonly selectableScreens: ko.Observable<any[]>;
  public readonly isChoosingScreen: ko.PureComputed<boolean>;
  private onChooseScreen: (deviceId: string) => void;
  private readonly logger: Logger;

  constructor(
    callingRepository: CallingRepository,
    conversationRepository: any,
    audioRepository: any,
    mediaDevicesHandler: MediaDevicesHandler,
    mediaStreamHandler: MediaStreamHandler,
    permissionRepository: any,
    multitasking: any,
  ) {
    this.logger = getLogger('CallingViewModel');
    this.callingRepository = callingRepository;
    this.conversationRepository = conversationRepository;
    this.mediaDevicesHandler = mediaDevicesHandler;
    this.mediaStreamHandler = mediaStreamHandler;
    this.permissionRepository = permissionRepository;
    this.activeCalls = ko.pureComputed(() =>
      callingRepository.activeCalls().filter(call => call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE),
    );
    this.selectableScreens = ko.observable([]);
    this.isChoosingScreen = ko.pureComputed(() => this.selectableScreens().length > 0);
    this.multitasking = multitasking;

    this.onChooseScreen = () => {};

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
        this.callingRepository.answerCall(call, callType);
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
        this.mediaDevicesHandler.currentDeviceId.videoInput(deviceId);
      },
      toggleCamera: (call: Call) => {
        this.callingRepository.toggleCamera(call);
      },
      toggleMute: (call: Call, muteState: boolean) => {
        this.callingRepository.muteCall(call.conversationId, muteState);
      },
      toggleScreenshare: (call: Call) => {
        if (call.selfParticipant.sharesScreen()) {
          return this.callingRepository.toggleScreenshare(call);
        }
        const showScreenSelection = (): Promise<void> => {
          return new Promise(resolve => {
            this.onChooseScreen = (deviceId: string): void => {
              this.mediaDevicesHandler.currentDeviceId.screenInput(deviceId);
              this.selectableScreens([]);
              resolve();
            };
            this.mediaDevicesHandler.getScreenSources().then((sources: any[]) => {
              if (sources.length === 1) {
                return this.onChooseScreen(sources[0].id);
              }
              this.selectableScreens(sources);
            });
          });
        };

        this.mediaStreamHandler.selectScreenToShare(showScreenSelection).then(() => {
          return this.callingRepository.toggleScreenshare(call);
        });
      },
    };

    const currentCall = ko.pureComputed(() => {
      return this.activeCalls()[0];
    });
    let currentCallSubscription: ko.Computed | undefined;

    const participantsAudioElement: Record<string, HTMLAudioElement> = {};
    let activeAudioOutput = this.mediaDevicesHandler.currentAvailableDeviceId.audioOutput();

    this.mediaDevicesHandler.currentAvailableDeviceId.audioOutput.subscribe((newActiveAudioOutput: string) => {
      activeAudioOutput = newActiveAudioOutput;
      const activeAudioElements = Object.values(participantsAudioElement);
      this.logger.debug(`Switching audio output for ${activeAudioElements.length} call participants`);
      activeAudioElements.forEach(audioElement => {
        if (audioElement.setSinkId) {
          audioElement.setSinkId(activeAudioOutput);
        }
      });
    });
    ko.computed(() => {
      const call = this.callingRepository.joinedCall();
      if (call) {
        call.participants().forEach(participant => {
          const stream = participant.audioStream();
          if (!stream) {
            return;
          }
          const audioId = `${participant.userId}-${stream.id}`;
          if (
            participantsAudioElement[audioId] &&
            (participantsAudioElement[audioId].srcObject as MediaStream).active
          ) {
            return;
          }
          const audioElement = new Audio();
          audioElement.srcObject = stream;
          audioElement.play();
          if (activeAudioOutput && audioElement.setSinkId) {
            audioElement.setSinkId(activeAudioOutput);
          }
          participantsAudioElement[audioId] = audioElement;
        });
      } else {
        Object.keys(participantsAudioElement).forEach(userId => {
          delete participantsAudioElement[userId];
        });
      }
    });

    let nbParticipants = 0;
    ko.computed(() => {
      const call = currentCall();
      if (currentCallSubscription) {
        currentCallSubscription.dispose();
      }
      if (!call) {
        return;
      }
      currentCallSubscription = ko.computed(() => {
        if (call.state() === CALL_STATE.TERM_LOCAL) {
          return audioRepository.play(AudioType.TALK_LATER);
        }
        if (call.state() !== CALL_STATE.MEDIA_ESTAB) {
          return;
        }
        const newNbParticipants = call.participants().filter(participant => !!participant.audioStream()).length;
        if (nbParticipants < newNbParticipants) {
          audioRepository.play(AudioType.READY_TO_TALK);
        }
        if (nbParticipants > newNbParticipants) {
          audioRepository.play(AudioType.TALK_LATER);
        }
        nbParticipants = newNbParticipants;
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

  hasAccessToCamera(): boolean {
    return this.permissionRepository.permissionState.camera() === PermissionState.GRANTED;
  }

  onCancelScreenSelection = () => {
    this.selectableScreens([]);
  };
}
