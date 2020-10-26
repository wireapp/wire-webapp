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

import ko from 'knockout';

import {CALL_TYPE, REASON as CALL_REASON, STATE as CALL_STATE, CONV_TYPE} from '@wireapp/avs';

import {t} from 'Util/LocalizerUtil';
import {formatSeconds} from 'Util/TimeUtil';
import {afterRender} from 'Util/util';
import {sortUsersByPriority} from 'Util/StringUtil';

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {generateConversationUrl} from '../../router/routeGenerator';

import 'Components/calling/fullscreenVideoCall';
import 'Components/groupVideoGrid';
import 'Components/list/participantItem';
import type {Call} from '../../calling/Call';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import type {User} from '../../entity/User';
import type {CallActions} from '../../view_model/CallingViewModel';
import type {Multitasking} from '../../notification/NotificationRepository';
import type {TeamRepository} from 'src/script/team/TeamRepository';
import {Participant} from '../../calling/Participant';

interface ComponentParams {
  call: Call;
  callActions: CallActions;
  callingRepository: CallingRepository;
  conversation: ko.PureComputed<Conversation>;
  hasAccessToCamera: ko.Observable<boolean>;
  isSelfVerified: ko.Subscribable<boolean>;
  multitasking: Multitasking;
  teamRepository: TeamRepository;
  temporaryUserStyle?: boolean;
  videoGrid: ko.PureComputed<Grid>;
}

class ConversationListCallingCell {
  readonly call: Call;
  readonly callActions: CallActions;
  readonly callDuration: ko.Observable<string>;
  readonly callingRepository: CallingRepository;
  readonly conversation: ko.PureComputed<Conversation>;
  readonly conversationParticipants: ko.PureComputed<User[]>;
  readonly conversationUrl: string;
  readonly disableScreenButton: boolean;
  readonly disableVideoButton: ko.PureComputed<boolean>;
  readonly dispose: () => void;
  readonly isConnecting: ko.PureComputed<boolean>;
  readonly isDeclined: ko.PureComputed<boolean>;
  readonly isStillOngoing: ko.PureComputed<boolean>;
  readonly isIdle: ko.PureComputed<boolean>;
  readonly isIncoming: ko.PureComputed<boolean>;
  readonly isMuted: ko.Observable<boolean>;
  readonly isOngoing: ko.PureComputed<boolean>;
  readonly isOutgoing: ko.PureComputed<boolean>;
  readonly multitasking: Multitasking;
  readonly AVATAR_SIZE: typeof AVATAR_SIZE;
  readonly participantsButtonLabel: ko.PureComputed<string>;
  readonly showMaximize: ko.PureComputed<boolean>;
  readonly showNoCameraPreview: ko.Computed<boolean>;
  readonly showParticipants: ko.Observable<boolean>;
  readonly showParticipantsButton: ko.PureComputed<boolean>;
  readonly showVideoButton: ko.PureComputed<boolean>;
  readonly showJoinButton: ko.PureComputed<boolean>;
  readonly showVideoGrid: ko.PureComputed<boolean>;
  readonly temporaryUserStyle: boolean;
  readonly videoGrid: ko.PureComputed<Grid>;
  readonly isSelfVerified: ko.Subscribable<boolean>;
  readonly participants: ko.PureComputed<Participant[]>;
  readonly selfParticipant: Participant;
  readonly teamRepository: TeamRepository;

  constructor({
    call,
    conversation,
    videoGrid,
    callingRepository,
    temporaryUserStyle = false,
    multitasking,
    callActions,
    teamRepository,
    hasAccessToCamera,
    isSelfVerified = ko.observable(false),
  }: ComponentParams) {
    this.call = call;
    this.conversation = conversation;
    this.callingRepository = callingRepository;
    this.teamRepository = teamRepository;
    this.temporaryUserStyle = temporaryUserStyle;
    this.multitasking = multitasking;
    this.callActions = callActions;
    this.AVATAR_SIZE = AVATAR_SIZE;
    this.isSelfVerified = isSelfVerified;

    this.conversationUrl = generateConversationUrl(conversation().id);
    this.multitasking.isMinimized(false); // reset multitasking default value, the call will be fullscreen if there are some remote videos

    this.videoGrid = videoGrid;
    this.conversationParticipants = ko.pureComputed(
      () =>
        this.conversation() && this.conversation().participating_user_ets().concat([this.conversation().selfUser()]),
    );

    const isState = (state: CALL_STATE) => () => call.state() === state;
    this.isIdle = ko.pureComputed(isState(CALL_STATE.NONE));
    this.isOutgoing = ko.pureComputed(isState(CALL_STATE.OUTGOING));
    this.isConnecting = ko.pureComputed(isState(CALL_STATE.ANSWERED));
    this.isIncoming = ko.pureComputed(isState(CALL_STATE.INCOMING));
    this.isOngoing = ko.pureComputed(isState(CALL_STATE.MEDIA_ESTAB));

    this.isDeclined = ko.pureComputed(() =>
      [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(call.reason()),
    );

    this.isStillOngoing = ko.pureComputed(() => [CALL_REASON.STILL_ONGOING].includes(call.reason()));

    this.isMuted = callingRepository.isMuted;

    this.callDuration = ko.observable();
    let callDurationUpdateInterval: number;
    const startedAtSubscription = call.startedAt.subscribe(startedAt => {
      if (startedAt) {
        const updateTimer = () => {
          const time = Math.floor((Date.now() - startedAt) / 1000);
          this.callDuration(formatSeconds(time));
        };
        updateTimer();
        callDurationUpdateInterval = window.setInterval(updateTimer, 1000);
      }
    });

    this.showParticipants = ko.observable(false);
    this.showParticipantsButton = ko.pureComputed(() => this.isOngoing() && this.conversation().isGroup());
    this.participantsButtonLabel = ko.pureComputed(() => {
      return t('callParticipants', this.participants().length);
    });
    this.showMaximize = ko.pureComputed(() => this.multitasking.isMinimized() && this.isOngoing());

    const hasVideoGrid = () => {
      const grid = this.videoGrid();
      return grid.grid.filter(participant => !!participant).length > 0 || grid.thumbnail;
    };
    this.showVideoGrid = ko.pureComputed(() => {
      return hasVideoGrid() && (this.multitasking.isMinimized() || !this.isOngoing());
    });

    this.showVideoButton = ko.pureComputed(() => call.initialType === CALL_TYPE.VIDEO || this.isOngoing());
    this.showJoinButton = ko.pureComputed(() => conversation() && this.isStillOngoing() && temporaryUserStyle);
    this.disableScreenButton = !this.callingRepository.supportsScreenSharing;
    this.disableVideoButton = ko.pureComputed(() => {
      const selfParticipant = call.getSelfParticipant();
      const isOutgoingVideoCall = this.isOutgoing() && selfParticipant?.sharesCamera();
      const isVideoUnsupported =
        !selfParticipant?.sharesCamera() &&
        !conversation().supportsVideoCall(call.conversationType === CONV_TYPE.CONFERENCE);
      return isOutgoingVideoCall || isVideoUnsupported;
    });

    this.showNoCameraPreview = ko.computed(() => {
      return !hasAccessToCamera() && call.initialType === CALL_TYPE.VIDEO && !this.showVideoGrid() && !this.isOngoing();
    });

    this.participants = ko.pureComputed(() =>
      call
        .participants()
        .slice()
        .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user)),
    );

    this.selfParticipant = call.getSelfParticipant();

    this.dispose = () => {
      window.clearInterval(callDurationUpdateInterval);
      startedAtSubscription.dispose();
      this.showNoCameraPreview.dispose();
    };
  }

  endCall(call: Call): void {
    return this.isIncoming() ? this.callActions.reject(call) : this.callActions.leave(call);
  }

  joinCall(call: Call) {
    this.callActions.answer(call);
  }

  showFullscreenVideoGrid(): void {
    this.multitasking.autoMinimize(false);
    this.multitasking.isMinimized(false);
  }

  toggleShowParticipants(): void {
    this.showParticipants(!this.showParticipants());

    // TODO: this is a very hacky way to get antiscroll to recalculate the height of the conversationlist.
    // Once there is a new solution to this, this needs to go.
    afterRender(() => window.dispatchEvent(new Event('resize')));
  }
}

ko.components.register('conversation-list-calling-cell', {
  template: `
   <!-- ko if: showJoinButton() -->
     <div class="call-ui__button call-ui__button--green call-ui__button--join" style="margin: 40px 16px 0px 16px;" data-bind="click: () => joinCall(call), text: t('callJoin')" data-uie-name="do-call-controls-call-join"></div>
   <!-- /ko -->
   <!-- ko if: conversation() && !isDeclined() -->
    <div class="conversation-list-calling-cell-background">
      <div class="conversation-list-calling-cell conversation-list-cell">
        <!-- ko ifnot: temporaryUserStyle -->
          <div class="conversation-list-cell-left" data-bind="link_to: conversationUrl">
            <!-- ko if: conversation().isGroup() -->
              <group-avatar class="conversation-list-cell-avatar-arrow call-ui__avatar" params="users: conversationParticipants(), conversation: conversation"></group-avatar>
            <!-- /ko -->
            <!-- ko if: !conversation().isGroup() && conversationParticipants().length -->
              <participant-avatar params="participant: conversationParticipants()[0], size: AVATAR_SIZE.SMALL"></participant-avatar>
            <!-- /ko -->
          </div>
        <!-- /ko -->

        <div class="conversation-list-cell-center" data-bind="link_to: conversationUrl, css: {'conversation-list-cell-center-no-left': temporaryUserStyle}">
          <span class="conversation-list-cell-name" data-bind="text: conversation().display_name()"></span>
          <!-- ko if: isIncoming() -->
            <!-- ko if: call.isGroup -->
              <span class="conversation-list-cell-description" data-bind="text: t('callStateIncomingGroup', call.creatingUser.name())" data-uie-name="call-label-incoming"></span>
            <!-- /ko -->
            <!-- ko ifnot: call.isGroup -->
              <span class="conversation-list-cell-description" data-bind="text: t('callStateIncoming')" data-uie-name="call-label-incoming"></span>
            <!-- /ko -->
          <!-- /ko -->
          <!-- ko if: isOutgoing() -->
            <span class="conversation-list-cell-description" data-bind="text: t('callStateOutgoing')" data-uie-name="call-label-outgoing"></span>
          <!-- /ko -->
          <!-- ko if: isConnecting() -->
            <span class="conversation-list-cell-description" data-bind="text: t('callStateConnecting')" data-uie-name="call-label-connecting"></span>
          <!-- /ko -->
          <!-- ko if: callDuration() -->
            <div class="conversation-list-info-wrapper">
              <span class="conversation-list-cell-description" data-bind="text: callDuration()" data-uie-name="call-duration"></span>
              <!-- ko if: call.isCbrEnabled -->
                <span class="conversation-list-cell-description" data-bind="text: t('callStateCbr')" data-uie-name="call-cbr"></span>
              <!-- /ko -->
            </div>
          <!-- /ko -->
        </div>

        <div class="conversation-list-cell-right">
          <!-- ko if: isConnecting() || isOngoing() -->
            <div class="call-ui__button call-ui__button--red" data-bind="click: () => callActions.leave(call), attr: {'title': t('videoCallOverlayHangUp')}" data-uie-name="do-call-controls-call-leave">
              <hangup-icon class="small-icon"></hangup-icon>
            </div>
          <!-- /ko -->
        </div>
      </div>

      <!-- ko if: showVideoGrid() -->
        <div class="group-video__minimized-wrapper" data-bind="click: showFullscreenVideoGrid">
          <group-video-grid params="minimized: true, grid: videoGrid, selfParticipant: selfParticipant"></group-video-grid>
          <!-- ko if: showMaximize() -->
            <div class="group-video__minimized-wrapper__overlay" data-uie-name="do-maximize-call">
              <fullscreen-icon></fullscreen-icon>
            </div>
          <!-- /ko -->
        </div>
      <!-- /ko -->

      <!-- ko if: showNoCameraPreview() -->
        <div class="group-video__minimized-wrapper group-video__minimized-wrapper--no-camera-access" data-bind="text: t('callNoCameraAccess')" data-uie-name="label-no-camera-access-preview"></div>
      <!-- /ko -->

      <!-- ko if: !isDeclined() -->
        <div class="conversation-list-calling-cell-controls">
          <div class="conversation-list-calling-cell-controls-left">
            <button class="call-ui__button" data-bind="click: () => callActions.toggleMute(call, !isMuted()), css: {'call-ui__button--active': isMuted()}, attr: {'data-uie-value': !isMuted() ? 'inactive' : 'active', 'title': t('videoCallOverlayMute')}" data-uie-name="do-toggle-mute">
              <mic-off-icon class="small-icon"></mic-off-icon>
            </button>
            <!-- ko if: showVideoButton() -->
              <button class="call-ui__button" data-bind="click: () => callActions.toggleCamera(call), css: {'call-ui__button--active': selfParticipant.sharesCamera()}, disable: disableVideoButton(), attr: {'data-uie-value': selfParticipant.sharesCamera() ? 'active' : 'inactive', 'title': t('videoCallOverlayVideo')}" data-uie-name="do-toggle-video">
                <camera-icon class="small-icon"></camera-icon>
              </button>
            <!-- /ko -->
            <!-- ko if: isOngoing() -->
              <div class="call-ui__button"
                data-bind="tooltip: {text: t('videoCallScreenShareNotSupported'),
                  disabled: !disableScreenButton, position: 'bottom'},
                  click: () => callActions.toggleScreenshare(call),
                  css: {'call-ui__button--active': selfParticipant.sharesScreen(), 'call-ui__button--disabled': disableScreenButton},
                  attr: {'data-uie-value': selfParticipant.sharesScreen() ? 'active' : 'inactive', 'data-uie-enabled': disableScreenButton ? 'false' : 'true', title: t('videoCallOverlayShareScreen')}"
                data-uie-name="do-call-controls-toggle-screenshare">
                <screenshare-icon class="small-icon"></screenshare-icon>
              </div>
            <!-- /ko -->
          </div>

          <div class="conversation-list-calling-cell-controls-right">
            <!-- ko if: showParticipantsButton() -->
              <div class="call-ui__button call-ui__button--participants" data-bind="click: toggleShowParticipants, css: {'call-ui__button--active': showParticipants()}" data-uie-name="do-toggle-participants">
                <span data-bind="text: participantsButtonLabel"></span><chevron-icon></chevron-icon>
              </div>
            <!-- /ko -->
            <!-- ko if: isIncoming() || isOutgoing() -->
              <div class="call-ui__button call-ui__button--red call-ui__button--large" data-bind="click: () => endCall(call), attr: {'title': t('videoCallOverlayHangUp')}" data-uie-name="do-call-controls-call-decline">
                <hangup-icon class="small-icon"></hangup-icon>
              </div>
            <!-- /ko -->
            <!-- ko if: isIncoming() && !isDeclined() -->
              <div class="call-ui__button call-ui__button--green call-ui__button--large" data-bind="click: () => callActions.answer(call)" data-uie-name="do-call-controls-call-accept">
                <pickup-icon class="small-icon"></pickup-icon>
              </div>
            <!-- /ko -->
          </div>
        </div>

        <div class="call-ui__participant-list__wrapper" data-bind="css: {'call-ui__participant-list__wrapper--active': showParticipants}">
          <div class="call-ui__participant-list" data-bind="foreach: {data: participants, as: 'participant', noChildContext: true}, fadingscrollbar" data-uie-name="list-call-ui-participants">
            <participant-item params="participant: participant.user, hideInfo: true, callParticipant: participant, selfInTeam: $parent.selfInTeam, isSelfVerified: isSelfVerified, external: teamRepository.isExternal(participant.user.id)" data-bind="css: {'no-underline': true}"></participant-item>
          </div>
        </div>

      <!-- /ko -->
    </div>
  <!-- /ko -->
  `,
  viewModel: ConversationListCallingCell,
});
