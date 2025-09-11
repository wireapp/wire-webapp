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
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {ButtonGroupTab} from 'Components/calling/ButtonGroup';
import 'Components/calling/ChooseScreen';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {AudioRepository} from 'Repositories/audio/AudioRepository';
import {AudioType} from 'Repositories/audio/AudioType';
import type {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallState, DesktopScreenShareMenu} from 'Repositories/calling/CallState';
import {LEAVE_CALL_REASON} from 'Repositories/calling/enum/LeaveCallReason';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {ConversationVerificationState} from 'Repositories/conversation/ConversationVerificationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import type {ElectronDesktopCapturerSource, MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import type {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import type {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {PermissionStatusState} from 'Repositories/permission/PermissionStatusState';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {ROLE} from 'Repositories/user/UserPermission';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import {Config} from '../Config';

export interface CallActions {
  answer: (call: Call) => Promise<void>;
  changePage: (newPage: number, call: Call) => void;
  leave: (call: Call) => void;
  reject: (call: Call) => void;
  startAudio: (conversationEntity: Conversation) => Promise<void>;
  switchCameraInput: (deviceId: string) => void;
  switchScreenInput: (deviceId: string) => void;
  toggleCamera: (call: Call) => void;
  toggleMute: (call: Call, muteState: boolean) => void;
  toggleScreenshare: (call: Call, desktopScreenShareMenu: DesktopScreenShareMenu) => void;
}

export enum CallViewTab {
  ALL = 'all',
  SPEAKERS = 'speakers',
}

export const CallViewTabs: ButtonGroupTab[] = [
  {getText: () => t('videoSpeakersTabSpeakers').toUpperCase(), value: CallViewTab.SPEAKERS},
  {getText: substitute => t('videoSpeakersTabAll', substitute as unknown as {count: number}), value: CallViewTab.ALL},
];

declare global {
  interface HTMLAudioElement {
    setSinkId?: (sinkId: string) => Promise<void>;
  }
}
const MAX_USERS_TO_CALL_WITHOUT_CONFIRM = Config.getConfig().FEATURE.MAX_USERS_TO_PING_WITHOUT_ALERT;

export class CallingViewModel {
  readonly activeCalls: ko.PureComputed<Call[]>;
  readonly callActions: CallActions;
  readonly isSelfVerified: ko.Computed<boolean>;

  constructor(
    readonly callingRepository: CallingRepository,
    readonly audioRepository: AudioRepository,
    readonly mediaDevicesHandler: MediaDevicesHandler,
    readonly mediaStreamHandler: MediaStreamHandler,
    readonly permissionRepository: PermissionRepository,
    readonly teamRepository: TeamRepository,
    readonly propertiesRepository: PropertiesRepository,
    private readonly selfUser: ko.Observable<User>,
    private readonly conversationState = container.resolve(ConversationState),
    readonly callState = container.resolve(CallState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    const {setVideoInputDeviceId, setScreenInputDeviceId} = mediaDevicesStore.getState();
    this.isSelfVerified = ko.pureComputed(() => selfUser().is_verified());
    this.activeCalls = ko.pureComputed(() =>
      this.callState.calls().filter(call => {
        const {conversation} = call;
        if (!conversation || conversation.isSelfUserRemoved()) {
          return false;
        }

        return call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE;
      }),
    );

    const toggleState = async (): Promise<void> => {
      const conversation = this.conversationState.activeConversation();
      if (conversation) {
        const isActiveCall = this.callingRepository.findCall(conversation.qualifiedId);

        if (isActiveCall) {
          this.callingRepository.leaveCall(conversation.qualifiedId, LEAVE_CALL_REASON.ELECTRON_TRAY_MENU_MESSAGE);
          return;
        }

        await handleCallAction(conversation);
      }
    };

    amplify.subscribe(WebAppEvents.CALL.STATE.TOGGLE, toggleState); // This event needs to be kept, it is sent by the wrapper

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

    const startCall = async (conversation: Conversation): Promise<void> => {
      const canStart = await this.canInitiateCall(conversation.qualifiedId, {
        action: t('modalCallSecondOutgoingAction'),
        message: t('modalCallSecondOutgoingMessage'),
        title: t('modalCallSecondOutgoingHeadline'),
      });

      if (!canStart) {
        return;
      }

      const call = await this.callingRepository.startCall(conversation);
      if (!call) {
        return;
      }

      ring(call);
    };

    const answerCall = async (call: Call) => {
      const canAnswer = await this.canInitiateCall(call.conversation.qualifiedId, {
        action: t('modalCallSecondIncomingAction'),
        message: t('modalCallSecondIncomingMessage'),
        title: t('modalCallSecondIncomingHeadline'),
      });
      if (!canAnswer) {
        return;
      }

      await this.callingRepository.answerCall(call);
    };

    const hasSoundlessCallsEnabled = (): boolean => {
      return this.propertiesRepository.getPreference(PROPERTIES_TYPE.CALL.ENABLE_SOUNDLESS_INCOMING_CALLS);
    };

    const hasJoinedCall = (): boolean => {
      return !!this.callState.joinedCall();
    };

    this.callingRepository.onIncomingCall(async (call: Call) => {
      const shouldRing = this.selfUser().availability() !== Availability.Type.AWAY;
      if (shouldRing && (!hasSoundlessCallsEnabled() || !hasJoinedCall())) {
        ring(call);
      }
    });

    const showE2EICallModal = (conversationEntity: Conversation) => {
      const memberCount = conversationEntity.participating_user_ets().length;

      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: async () => {
            conversationEntity.mlsVerificationState(ConversationVerificationState.UNVERIFIED);

            if (memberCount > MAX_USERS_TO_CALL_WITHOUT_CONFIRM) {
              showMaxUsersToCallModalWithoutConfirm(conversationEntity);
            } else {
              await startCall(conversationEntity);
            }
          },
          text: t('conversation.E2EICallAnyway'),
        },
        secondaryAction: {
          action: () => {},
          text: t('conversation.E2EICancel'),
        },
        text: {
          message: t('conversation.E2EIDegradedInitiateCall'),
          title: t('conversation.E2EIConversationNoLongerVerified'),
        },
      });
    };

    const showMaxUsersToCallModalWithoutConfirm = (conversationEntity: Conversation) => {
      const memberCount = conversationEntity.participating_user_ets().length;

      PrimaryModal.show(PrimaryModal.type.WITHOUT_TITLE, {
        preventClose: true,
        primaryAction: {
          action: async () => await startCall(conversationEntity),
          text: t('groupCallModalPrimaryBtnName'),
        },
        secondaryAction: {
          text: t('modalConfirmSecondary'),
        },
        text: {
          htmlMessage: `<div class="modal-description">
            ${t('groupCallConfirmationModalTitle', {memberCount})}
          </div>`,
          closeBtnLabel: t('groupCallModalCloseBtnLabel'),
        },
      });
    };

    const handleCallAction = async (conversationEntity: Conversation): Promise<void> => {
      const memberCount = conversationEntity.participating_user_ets().length;
      const isE2EIDegraded = conversationEntity.mlsVerificationState() === ConversationVerificationState.DEGRADED;

      if (isE2EIDegraded) {
        showE2EICallModal(conversationEntity);
      } else if (memberCount > MAX_USERS_TO_CALL_WITHOUT_CONFIRM) {
        showMaxUsersToCallModalWithoutConfirm(conversationEntity);
      } else {
        await startCall(conversationEntity);
      }
    };

    this.callActions = {
      answer: async (call: Call) => {
        if (call.isConference && !this.callingRepository.supportsConferenceCalling) {
          PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
            primaryAction: {
              action: () => {
                this.callingRepository.rejectCall(call.conversation.qualifiedId);
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
          return answerCall(call);
        }
      },
      changePage: (newPage, call) => {
        this.callingRepository.changeCallPage(call, newPage);
      },
      leave: ({conversation}: Call) => {
        this.callingRepository.leaveCall(conversation.qualifiedId, LEAVE_CALL_REASON.MANUAL_LEAVE_BY_UI_CLICK);
        callState.activeCallViewTab(CallViewTab.ALL);
      },
      reject: ({conversation}: Call) => {
        this.callingRepository.rejectCall(conversation.qualifiedId);
      },
      startAudio: async (conversationEntity: Conversation) => {
        if (conversationEntity.isGroupOrChannel() && !this.teamState.isConferenceCallingEnabled()) {
          this.showRestrictedConferenceCallingModal();
        } else {
          await handleCallAction(conversationEntity);
        }
      },
      switchCameraInput: (deviceId: string) => {
        setVideoInputDeviceId(deviceId);
        this.callingRepository.refreshVideoInput();
      },
      switchScreenInput: (deviceId: string) => {
        setScreenInputDeviceId(deviceId);
      },
      toggleCamera: (call: Call) => {
        this.callingRepository.toggleCamera(call);
      },
      toggleMute: (call: Call, muteState: boolean) => {
        this.callingRepository.muteCall(call, muteState);
      },
      toggleScreenshare: async (call, desktopScreenShareMenu): Promise<void> => {
        if (call.getSelfParticipant().sharesScreen()) {
          return this.callingRepository.toggleScreenshare(call);
        }
        const showScreenSelection = (): Promise<void> => {
          this.callState.desktopScreenShareMenu(desktopScreenShareMenu);
          return new Promise(resolve => {
            this.callingRepository.onChooseScreen = (deviceId: string): void => {
              setScreenInputDeviceId(deviceId);
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

        this.mediaStreamHandler
          .selectScreenToShare(showScreenSelection)
          .then(() => this.callingRepository.toggleScreenshare(call));
      },
    };
  }

  /**
   * Will reject or leave the call depending on the state of the call.
   * @param activeCall - the call to gracefully tear down
   */
  private async gracefullyTeardownCall(activeCall: Call): Promise<void> {
    const {conversation} = activeCall;
    if (activeCall.state() === CALL_STATE.INCOMING) {
      this.callingRepository.rejectCall(conversation.qualifiedId);
    } else {
      this.callingRepository.leaveCall(conversation.qualifiedId, LEAVE_CALL_REASON.MANUAL_LEAVE_TO_JOIN_ANOTHER_CALL);
    }
    // We want to wait a bit to be sure the call have been tear down properly
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Will make sure everything is ready for a call to start/be joined in the given conversation.
   * If there is another ongoing call, the user will be asked to first leave that other call before starting a new call.
   *
   * @param conversationId - the conversation in which the call should be started/joined
   * @param warningStrings - the strings to display in case there is already an active call
   * @returns true if the call can be started, false otherwise
   */
  private canInitiateCall(
    conversationId: QualifiedId,
    warningStrings: {action: string; message: string; title: string},
  ): Promise<boolean> {
    const idleCallStates = [CALL_STATE.INCOMING, CALL_STATE.NONE, CALL_STATE.UNKNOWN];
    const otherActiveCall = this.callState
      .calls()
      .find(
        call =>
          !matchQualifiedIds(call.conversation.qualifiedId, conversationId) && !idleCallStates.includes(call.state()),
      );
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
          text: warningStrings.action,
        },
        secondaryAction: {
          action: () => resolve(false),
        },
        text: {
          message: warningStrings.message,
          title: warningStrings.title,
        },
      });
    });
  }

  private showRestrictedConferenceCallingModal() {
    if (this.teamState.isInTeam(this.selfUser())) {
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
            message: t('callingRestrictedConferenceCallTeamMemberModalDescription'),
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

  getConversationById(conversationId: QualifiedId): Conversation | undefined {
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
