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

import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation/Subconversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {constructFullyQualifiedClientId} from '@wireapp/core/lib/util/fullyQualifiedClientIdUtils';
import {TaskScheduler} from '@wireapp/core/lib/util/TaskScheduler';
import ko from 'knockout';
import {container} from 'tsyringe';

import {AUDIO_STATE, CALL_TYPE, CONV_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {Availability} from '@wireapp/protocol-messaging';

import {ButtonGroupTab} from 'Components/calling/ButtonGroup';
import 'Components/calling/ChooseScreen';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import type {AudioRepository} from '../audio/AudioRepository';
import {AudioType} from '../audio/AudioType';
import type {Call} from '../calling/Call';
import {CallingRepository, QualifiedWcallMember} from '../calling/CallingRepository';
import {callingSubscriptions} from '../calling/callingSubscriptionsHandler';
import {CallState} from '../calling/CallState';
import {LEAVE_CALL_REASON} from '../calling/enum/LeaveCallReason';
import {getSubconversationEpochInfo, subscribeToEpochUpdates} from '../calling/mlsConference';
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
import {Core} from '../service/CoreSingleton';
import type {TeamRepository} from '../team/TeamRepository';
import {TeamState} from '../team/TeamState';
import {ROLE} from '../user/UserPermission';

export interface CallActions {
  answer: (call: Call) => Promise<void>;
  changePage: (newPage: number, call: Call) => void;
  leave: (call: Call) => void;
  reject: (call: Call) => void;
  startAudio: (conversationEntity: Conversation) => Promise<void>;
  startVideo: (conversationEntity: Conversation) => Promise<void>;
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
const maxGroupSize = 4;
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
    private readonly selfUser: ko.Subscribable<User>,
    readonly multitasking: Multitasking,
    private readonly conversationState = container.resolve(ConversationState),
    readonly callState = container.resolve(CallState),
    private readonly teamState = container.resolve(TeamState),
    private readonly core = container.resolve(Core),
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

    const startCall = async (conversation: Conversation, callType: CALL_TYPE): Promise<void> => {
      const canStart = await this.canInitiateCall(conversation.qualifiedId, {
        action: t('modalCallSecondOutgoingAction'),
        message: t('modalCallSecondOutgoingMessage'),
        title: t('modalCallSecondOutgoingHeadline'),
      });

      if (!canStart) {
        return;
      }

      const call = await this.callingRepository.startCall(conversation, callType);
      if (!call) {
        return;
      }

      if (conversation.isUsingMLSProtocol) {
        const unsubscribe = await subscribeToEpochUpdates(
          {mlsService: this.mlsService, conversationState: this.conversationState},
          conversation.qualifiedId,
          ({epoch, keyLength, secretKey, members}) => {
            this.callingRepository.setEpochInfo(conversation.qualifiedId, {epoch, keyLength, secretKey}, members);
          },
        );

        callingSubscriptions.addCall(call.conversationId, unsubscribe);
      }
      ring(call);
    };

    const joinOngoingMlsConference = async (call: Call) => {
      const unsubscribe = await subscribeToEpochUpdates(
        {mlsService: this.mlsService, conversationState: this.conversationState},
        call.conversationId,
        ({epoch, keyLength, secretKey, members}) => {
          this.callingRepository.setEpochInfo(call.conversationId, {epoch, keyLength, secretKey}, members);
        },
      );

      callingSubscriptions.addCall(call.conversationId, unsubscribe);
    };

    const answerCall = async (call: Call) => {
      const canAnswer = await this.canInitiateCall(call.conversationId, {
        action: t('modalCallSecondIncomingAction'),
        message: t('modalCallSecondIncomingMessage'),
        title: t('modalCallSecondIncomingHeadline'),
      });
      if (!canAnswer) {
        return;
      }

      await this.callingRepository.answerCall(call);

      if (call.conversationType === CONV_TYPE.CONFERENCE_MLS) {
        await joinOngoingMlsConference(call);
      }
    };

    const hasSoundlessCallsEnabled = (): boolean => {
      return this.propertiesRepository.getPreference(PROPERTIES_TYPE.CALL.ENABLE_SOUNDLESS_INCOMING_CALLS);
    };

    const hasJoinedCall = (): boolean => {
      return !!this.callState.joinedCall();
    };

    const updateEpochInfo = async (conversationId: QualifiedId, shouldAdvanceEpoch = false) => {
      const conversation = this.getConversationById(conversationId);
      if (!conversation?.isUsingMLSProtocol) {
        return;
      }

      const subconversationGroupId = await this.mlsService.getGroupIdFromConversationId(
        conversationId,
        SUBCONVERSATION_ID.CONFERENCE,
      );

      if (!subconversationGroupId) {
        return;
      }

      //we don't want to react to avs callbacks when conversation was not yet established
      const isMLSConversationEstablished = await this.mlsService.conversationExists(subconversationGroupId);
      if (!isMLSConversationEstablished) {
        return;
      }

      const {epoch, keyLength, secretKey, members} = await getSubconversationEpochInfo(
        {mlsService: this.mlsService},
        conversationId,
        shouldAdvanceEpoch,
      );
      this.callingRepository.setEpochInfo(conversationId, {epoch, keyLength, secretKey}, members);
    };

    const closeCall = async (conversationId: QualifiedId, conversationType: CONV_TYPE) => {
      // There's nothing we need to do for non-mls calls
      if (conversationType !== CONV_TYPE.CONFERENCE_MLS) {
        return;
      }

      await this.mlsService.leaveConferenceSubconversation(conversationId);
      callingSubscriptions.removeCall(conversationId);
    };

    this.callingRepository.onIncomingCall(async (call: Call) => {
      const shouldRing = this.selfUser().availability() !== Availability.Type.AWAY;
      if (shouldRing && (!hasSoundlessCallsEnabled() || !hasJoinedCall())) {
        ring(call);
      }
    });

    const removeStaleClient = async (
      conversationId: QualifiedId,
      memberToRemove: QualifiedWcallMember,
    ): Promise<void> => {
      const subconversationGroupId = await this.mlsService.getGroupIdFromConversationId(
        conversationId,
        SUBCONVERSATION_ID.CONFERENCE,
      );

      if (!subconversationGroupId) {
        return;
      }

      const isMLSConversationEstablished = await this.mlsService.conversationExists(subconversationGroupId);
      if (!isMLSConversationEstablished) {
        return;
      }

      const {
        userId: {id: userId, domain},
        clientid,
      } = memberToRemove;
      const clientToRemoveQualifiedId = constructFullyQualifiedClientId(userId, clientid, domain);

      const subconversationMembers = await this.mlsService.getClientIds(subconversationGroupId);

      const isSubconversationMember = subconversationMembers.some(
        ({userId, clientId, domain}) =>
          constructFullyQualifiedClientId(userId, clientId, domain) === clientToRemoveQualifiedId,
      );

      if (!isSubconversationMember) {
        return;
      }

      return void this.mlsService.removeClientsFromConversation(subconversationGroupId, [clientToRemoveQualifiedId]);
    };

    const handleCallParticipantChange = (conversationId: QualifiedId, members: QualifiedWcallMember[]) => {
      const conversation = this.getConversationById(conversationId);
      if (!conversation?.isUsingMLSProtocol) {
        return;
      }

      for (const member of members) {
        const isSelfClient = member.userId.id === this.core.userId && member.clientid === this.core.clientId;
        //no need to set a timer for selfClient (it will most likely leave or get dropped from the call before the timer could expire)
        if (isSelfClient) {
          continue;
        }

        const {id: userId, domain} = member.userId;
        const clientQualifiedId = constructFullyQualifiedClientId(userId, member.clientid, domain);

        const key = `mls-call-client-${conversation.id}-${clientQualifiedId}`;

        // audio state is established -> clear timer
        if (member.aestab === AUDIO_STATE.ESTABLISHED) {
          TaskScheduler.cancelTask(key);
          continue;
        }

        // otherwise, remove the client from subconversation if it won't establish their audio state in 3 mins timeout
        const firingDate = new Date().getTime() + TIME_IN_MILLIS.MINUTE * 3;

        TaskScheduler.addTask({
          firingDate,
          key,
          // if timer expires = client is stale -> remove client from the subconversation
          task: () => removeStaleClient(conversationId, member),
        });
      }
    };

    //update epoch info when AVS requests new epoch
    this.callingRepository.onRequestNewEpochCallback(conversationId => updateEpochInfo(conversationId, true));

    //once the call gets closed (eg. we leave a call or get dropped), we remove ourselfes from subconversation and unsubscribe from all the call events
    this.callingRepository.onCallClosed(closeCall);

    //handle participant change avs callback to detect stale clients in subconversations
    this.callingRepository.onCallParticipantChangedCallback(handleCallParticipantChange);

    this.callActions = {
      answer: async (call: Call) => {
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
          return answerCall(call);
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
      startAudio: async (conversationEntity: Conversation) => {
        if (conversationEntity.isGroup() && !this.teamState.isConferenceCallingEnabled()) {
          this.showRestrictedConferenceCallingModal();
        } else {
          const memberCount = conversationEntity.participating_user_ets().length;
          if (memberCount > maxGroupSize) {
            PrimaryModal.show(PrimaryModal.type.WITHOUT_TITLE, {
              preventClose: true,
              primaryAction: {
                action: async () => await startCall(conversationEntity, CALL_TYPE.NORMAL),
                text: t('groupCallModalPrimaryBtnName'),
              },
              secondaryAction: {
                text: t('modalConfirmSecondary'),
              },
              text: {
                message: t('groupCallConfirmationModalTitle', memberCount),
                closeBtnLabel: t('groupCallModalCloseBtnLabel'),
              },
            });
          } else {
            await startCall(conversationEntity, CALL_TYPE.NORMAL);
          }
        }
      },
      startVideo: async (conversationEntity: Conversation) => {
        if (conversationEntity.isGroup() && !this.teamState.isConferenceCallingEnabled()) {
          this.showRestrictedConferenceCallingModal();
        } else {
          await startCall(conversationEntity, CALL_TYPE.VIDEO);
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

  get mlsService() {
    const mlsService = this.core.service?.mls;
    if (!mlsService) {
      throw new Error('mls service was not initialised');
    }

    return mlsService;
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
      .find(call => !matchQualifiedIds(call.conversationId, conversationId) && !idleCallStates.includes(call.state()));
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
