/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';
import {container} from 'tsyringe';

import {CALL_TYPE, CONV_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {Availability} from '@wireapp/protocol-messaging';

import {ButtonGroupTab} from 'Components/calling/ButtonGroup';
import 'Components/calling/ChooseScreen';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import type {AudioRepository} from '../audio/AudioRepository';
import {AudioType} from '../audio/AudioType';
import type {Call} from '../calling/Call';
import {CallingRepository} from '../calling/CallingRepository';
import {CallState} from '../calling/CallState';
import {LEAVE_CALL_REASON} from '../calling/enum/LeaveCallReason';
import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {Config} from '../Config';
import {ConversationState} from '../conversation/ConversationState';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import type {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../media/MediaDevicesHandler';
import type {MediaStreamHandler} from '../media/MediaStreamHandler';
import type {Multitasking} from '../notification/NotificationRepository';
import type {PermissionRepository} from '../permission/PermissionRepository';
import {PermissionStatusState} from '../permission/PermissionStatusState';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';
import type {TeamRepository} from '../team/TeamRepository';
import {TeamState} from '../team/TeamState';
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
  {getText: () => t('videoSpeakersTabSpeakers').toUpperCase(), value: CallViewTab.SPEAKERS},
  {getText: substitute => t('videoSpeakersTabAll', substitute), value: CallViewTab.ALL},
];

declare global {
  interface HTMLAudioElement {
    setSinkId?: (sinkId: string) => Promise<void>;
  }
}

export class CallingViewModel {
  readonly activeCalls: ko.PureComputed<Call[]>;
  readonly callActions: CallActions;
  readonly isSelfVerified: ko.Computed<boolean>;
  readonly activeCallViewTab: ko.Observable<string>;

  constructor(
    readonly callingRepository: CallingRepository,
    readonly audioRepository: AudioRepository,
    readonly mediaDevicesHandler: MediaDevicesHandler,
    readonly mediaStreamHandler: MediaStreamHandler,
    readonly permissionRepository: PermissionRepository,
    readonly teamRepository: TeamRepository,
    readonly propertiesRepository: PropertiesRepository,
    private readonly selfUser: ko.Observable<User>,
    readonly multitasking: Multitasking,
    private readonly conversationState = container.resolve(ConversationState),
    readonly callState = container.resolve(CallState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.isSelfVerified = ko.pureComputed(() => selfUser().is_verified());
    this.activeCalls = ko.pureComputed(() =>
      this.callState.calls().filter(call => {
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

    const startCall = async (conversation: Conversation, callType: CALL_TYPE) => {
      const convType = conversation.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
      const canStart = await this.initiateCallStart(conversation.qualifiedId);
      if (!canStart) {
        return;
      }
      const call = await this.callingRepository.startCall(conversation.qualifiedId, convType, callType);
      if (!call) {
        return;
      }
      ring(call);
    };

    const hasSoundlessCallsEnabled = (): boolean => {
      return this.propertiesRepository.getPreference(PROPERTIES_TYPE.CALL.ENABLE_SOUNDLESS_INCOMING_CALLS);
    };

    const hasJoinedCall = (): boolean => {
      return !!this.callState.joinedCall();
    };

    this.callingRepository.onIncomingCall((call: Call) => {
      const shouldRing = this.selfUser().availability() !== Availability.Type.AWAY;
      if (shouldRing && (!hasSoundlessCallsEnabled() || !hasJoinedCall())) {
        ring(call);
      }
    });

    this.callActions = {
      answer: async (call: Call) => {
        const canAnwer = await this.initiateCallAnswer(call.conversationId);
        if (!canAnwer) {
          return;
        }

        if (call.conversationType === CONV_TYPE.CONFERENCE && !this.callingRepository.supportsConferenceCalling) {
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
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
        this.callingRepository.changeCallPage(call, newPage);
      },
      leave: (call: Call) => {
        this.callingRepository.leaveCall(call.conversationId, LEAVE_CALL_REASON.MANUAL_LEAVE_BY_UI_CLICK);
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
        this.callingRepository.refreshVideoInput();
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

  /**
   * Find active calls that are not related to the given conversation
   * @param conversationId - the conversation to ignore
   */
  private findOtherActiveCall(conversationId: QualifiedId): Call | undefined {
    const idleCallStates = [CALL_STATE.INCOMING, CALL_STATE.NONE, CALL_STATE.UNKNOWN];
    return this.callState
      .calls()
      .find(call => !matchQualifiedIds(call.conversationId, conversationId) && !idleCallStates.includes(call.state()));
  }

  /**
   * Will reject or leave the call depending on the state of the call.
   * @param activeCall - the call to gracefully tear down
   */
  private async gracefullyTeardownCall(activeCall: Call): Promise<void> {
    if (activeCall.state() === CALL_STATE.INCOMING) {
      this.callingRepository.rejectCall(activeCall.conversationId);
    } else {
      this.callingRepository.leaveCall(activeCall.conversationId, LEAVE_CALL_REASON.MANUAL_LEAVE_TO_JOIN_ANOTHER_CALL);
    }
    // We want to wait a bit to be sure the call have been tear down properly
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Will make sure everything is ready for a call to start in the given conversation.
   * If there is another ongoing call, the user will be asked to first leave that other call before starting a new call.
   * @param conversationId
   * @returns
   */
  private initiateCallStart(conversationId: QualifiedId): Promise<boolean> {
    const otherActiveCall = this.findOtherActiveCall(conversationId);
    if (!otherActiveCall) {
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: async () => {
            await this.gracefullyTeardownCall(otherActiveCall);
            resolve(true);
          },
          text: t('modalCallSecondOutgoingAction'),
        },
        secondaryAction: {
          action: () => resolve(false),
        },
        text: {
          message: t('modalCallSecondOutgoingMessage'),
          title: t('modalCallSecondOutgoingHeadline'),
        },
      });
    });
  }

  /**
   * Will make sure everything is ready for a call to be answered in the given conversation.
   * If there is another ongoing call, the user will be asked to first leave that other call before starting a new call.
   *
   * @param conversationId
   * @returns
   */
  private initiateCallAnswer(conversationId: QualifiedId): Promise<boolean> {
    const otherActiveCall = this.findOtherActiveCall(conversationId);
    if (!otherActiveCall) {
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: async () => {
            await this.gracefullyTeardownCall(otherActiveCall);
            resolve(true);
          },
          text: t('modalCallSecondIncomingAction'),
        },
        secondaryAction: {
          action: () => resolve(false),
        },
        text: {
          message: t('modalCallSecondIncomingMessage'),
          title: t('modalCallSecondIncomingHeadline'),
        },
      });
    });
  }

  private showRestrictedConferenceCallingModal() {
    if (this.selfUser().inTeam()) {
      if (this.selfUser().teamRole() === ROLE.OWNER) {
        const replaceEnterprise = replaceLink(
          Config.getConfig().URL.PRICING,
          'modal__text__read-more',
          'read-more-pricing',
        );
        PrimaryModal.show(PrimaryModal.type.CONFIRM, {
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
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            htmlMessage: t('callingRestrictedConferenceCallTeamMemberModalDescription'),
            title: t('callingRestrictedConferenceCallTeamMemberModalTitle'),
          },
        });
      }
    } else {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
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

  getConversationById(conversationId: QualifiedId): Conversation {
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
