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
import {Availability} from '@wireapp/protocol-messaging';
import {amplify} from 'amplify';
import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';
import {container} from 'tsyringe';

import 'Components/calling/ChooseScreen';
import {replaceLink, t} from 'Util/LocalizerUtil';

import {AudioType} from '../audio/AudioType';
import type {Call} from '../calling/Call';
import type {CallingRepository} from '../calling/CallingRepository';
import type {User} from '../entity/User';
import type {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../media/MediaDevicesHandler';
import type {MediaStreamHandler} from '../media/MediaStreamHandler';
import type {AudioRepository} from '../audio/AudioRepository';
import type {Conversation} from '../entity/Conversation';
import type {PermissionRepository} from '../permission/PermissionRepository';
import {PermissionStatusState} from '../permission/PermissionStatusState';
import type {Multitasking} from '../notification/NotificationRepository';
import type {TeamRepository} from '../team/TeamRepository';
import {ModalsViewModel} from './ModalsViewModel';
import {ConversationState} from '../conversation/ConversationState';
import {CallState} from '../calling/CallState';
import {ButtonGroupTab} from 'Components/calling/ButtonGroup';
import {TeamState} from '../team/TeamState';
import {Config} from '../Config';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {ROLE} from '../user/UserPermission';

export interface CallActions {
  answer: (call: Call) => void;
  changePage: (newPage: number, call: Call) => void;
  leave: (call: Call) => void;
  reject: (call: Call) => void;
  startAudio: (conversationEntity: Conversation) => void;
  startVideo: (conversationEntity: Conversation) => void;
  switchCameraInput: (call: Call, deviceId: string) => void;
  switchScreenInput: (call: Call, deviceId: string) => void;
  toggleCamera: (call: Call) => void;
  toggleMute: (call: Call, muteState: boolean) => void;
  toggleScreenshare: (call: Call) => void;
}

export enum CallViewTab {
  ALL = 'all',
  SPEAKERS = 'speakers',
}

export const CallViewTabs: ButtonGroupTab[] = [
  {getText: () => t('videoSpeakersTabSpeakers'), value: CallViewTab.SPEAKERS},
  {getText: substitute => t('videoSpeakersTabAll', substitute), value: CallViewTab.ALL},
];

declare global {
  interface HTMLAudioElement {
    setSinkId: (sinkId: string) => Promise<void>;
  }
}

export class CallingViewModel {
  readonly activeCalls: ko.PureComputed<Call[]>;
  readonly callActions: CallActions;
  readonly isSelfVerified: ko.Computed<boolean>;
  readonly activeCallViewTab: ko.Observable<string>;

  constructor(
    readonly callingRepository: CallingRepository,
    audioRepository: AudioRepository,
    readonly mediaDevicesHandler: MediaDevicesHandler,
    readonly mediaStreamHandler: MediaStreamHandler,
    readonly permissionRepository: PermissionRepository,
    readonly teamRepository: TeamRepository,
    private readonly selfUser: ko.Observable<User>,
    readonly multitasking: Multitasking,
    private readonly conversationState = container.resolve(ConversationState),
    readonly callState = container.resolve(CallState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.isSelfVerified = ko.pureComputed(() => selfUser().is_verified());
    this.activeCalls = ko.pureComputed(() =>
      this.callState.activeCalls().filter(call => {
        const conversation = this.conversationState.findConversation(call.conversationId);
        if (!conversation || conversation.removed_from_conversation()) {
          return false;
        }

        return call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE;
      }),
    );

    const ring = (call: Call): void => {
      const sounds: Partial<Record<CALL_STATE, AudioType>> = {
        [CALL_STATE.INCOMING]: AudioType.INCOMING_CALL,
        [CALL_STATE.OUTGOING]: AudioType.OUTGOING_CALL,
      };
      const initialCallState = call.state();
      const soundId = sounds[initialCallState];
      if (!soundId || typeof call.reason() !== 'undefined') {
        return;
      }

      audioRepository.loop(soundId).then(() => {
        const stateSubscription = ko.computed(() => {
          if (call.state() !== initialCallState || typeof call.reason() !== 'undefined') {
            window.setTimeout(() => {
              audioRepository.stop(soundId);
              stateSubscription.dispose();
            });
          }
        });
      });
    };

    const startCall = (conversationEntity: Conversation, callType: CALL_TYPE): void => {
      const convType = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
      this.callingRepository.startCall(conversationEntity.id, convType, callType).then(call => {
        if (!call) {
          return;
        }
        ring(call);
      });
    };

    this.callingRepository.onIncomingCall((call: Call) => {
      const shouldRing = this.selfUser().availability() !== Availability.Type.AWAY;
      if (shouldRing) {
        ring(call);
      }
    });

    this.callActions = {
      answer: (call: Call) => {
        if (call.conversationType === CONV_TYPE.CONFERENCE && !this.callingRepository.supportsConferenceCalling) {
          amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
            primaryAction: {
              action: () => {
                this.callingRepository.rejectCall(call.conversationId);
              },
            },
            text: {
              message: `${t('modalConferenceCallNotSupportedMessage')} ${t(
                'modalConferenceCallNotSupportedJoinMessage',
              )}`,
              title: t('modalConferenceCallNotSupportedHeadline'),
            },
          });
        } else {
          this.callingRepository.answerCall(call);
        }
      },
      changePage: (newPage, call) => {
        this.callingRepository.changeCallPage(newPage, call);
      },
      leave: (call: Call) => {
        this.callingRepository.leaveCall(call.conversationId);
        callState.activeCallViewTab(CallViewTab.ALL);
      },
      reject: (call: Call) => {
        this.callingRepository.rejectCall(call.conversationId);
      },
      startAudio: (conversationEntity: Conversation): void => {
        if (conversationEntity.isGroup() && !this.teamState.isConferenceCallingEnabled()) {
          this.showRestrictedConferenceCallingModal();
        } else {
          startCall(conversationEntity, CALL_TYPE.NORMAL);
        }
      },
      startVideo: (conversationEntity: Conversation): void => {
        if (conversationEntity.isGroup() && !this.teamState.isConferenceCallingEnabled()) {
          this.showRestrictedConferenceCallingModal();
        } else {
          startCall(conversationEntity, CALL_TYPE.VIDEO);
        }
      },
      switchCameraInput: (call: Call, deviceId: string) => {
        this.mediaDevicesHandler.currentDeviceId.videoInput(deviceId);
      },
      switchScreenInput: (call: Call, deviceId: string) => {
        this.mediaDevicesHandler.currentDeviceId.screenInput(deviceId);
      },
      toggleCamera: (call: Call) => {
        this.callingRepository.toggleCamera(call);
      },
      toggleMute: (call: Call, muteState: boolean) => {
        this.callingRepository.muteCall(call, muteState);
      },
      toggleScreenshare: async (call: Call): Promise<void> => {
        if (call.getSelfParticipant().sharesScreen()) {
          return this.callingRepository.toggleScreenshare(call);
        }
        const showScreenSelection = (): Promise<void> => {
          return new Promise(resolve => {
            this.callingRepository.onChooseScreen = (deviceId: string): void => {
              this.mediaDevicesHandler.currentDeviceId.screenInput(deviceId);
              this.callState.selectableScreens([]);
              this.callState.selectableWindows([]);
              resolve();
            };
            this.mediaDevicesHandler.getScreenSources().then((sources: ElectronDesktopCapturerSource[]) => {
              if (sources.length === 1) {
                return this.callingRepository.onChooseScreen(sources[0].id);
              }
              this.callState.selectableScreens(sources.filter(source => source.id.startsWith('screen')));
              this.callState.selectableWindows(sources.filter(source => source.id.startsWith('window')));
            });
          });
        };

        this.mediaStreamHandler.selectScreenToShare(showScreenSelection).then(() => {
          const isAudioCall = [CALL_TYPE.NORMAL, CALL_TYPE.FORCED_AUDIO].includes(call.initialType);
          const isFullScreenVideoCall = call.initialType === CALL_TYPE.VIDEO && !this.multitasking.isMinimized();
          if (isAudioCall || isFullScreenVideoCall) {
            this.multitasking.isMinimized(true);
          }
          return this.callingRepository.toggleScreenshare(call);
        });
      },
    };
  }

  private showRestrictedConferenceCallingModal() {
    if (this.selfUser().inTeam()) {
      if (this.selfUser().teamRole() === ROLE.OWNER) {
        const replaceEnterprise = replaceLink(
          Config.getConfig().URL.PRICING,
          'modal__text__read-more',
          'read-more-pricing',
        );
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              safeWindowOpen(Config.getConfig().URL.TEAMS_BILLING);
            },
            text: t('callingRestrictedConferenceCallOwnerModalUpgradeButton'),
          },
          text: {
            htmlMessage: t(
              'callingRestrictedConferenceCallOwnerModalDescription',
              {brandName: Config.getConfig().BRAND_NAME},
              replaceEnterprise,
            ),
            title: t('callingRestrictedConferenceCallOwnerModalTitle'),
          },
        });
      } else {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            htmlMessage: t('callingRestrictedConferenceCallTeamMemberModalDescription'),
            title: t('callingRestrictedConferenceCallTeamMemberModalTitle'),
          },
        });
      }
    } else {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          htmlMessage: t('callingRestrictedConferenceCallPersonalModalDescription', {
            brandName: Config.getConfig().BRAND_NAME,
          }),
          title: t('callingRestrictedConferenceCallPersonalModalTitle'),
        },
      });
    }
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

  getConversationById(conversationId: string): Conversation {
    return this.conversationState.findConversation(conversationId);
  }

  hasAccessToCamera(): boolean {
    return this.permissionRepository.permissionState.camera() === PermissionStatusState.GRANTED;
  }

  readonly onCancelScreenSelection = () => {
    this.callState.selectableScreens([]);
    this.callState.selectableWindows([]);
  };
}
