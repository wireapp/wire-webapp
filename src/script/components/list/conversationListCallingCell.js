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

import {formatSeconds} from 'Util/TimeUtil';
import {afterRender} from 'Util/util';
import {t} from 'Util/LocalizerUtil';

//import {PermissionState} from '../../notification/PermissionState';
import {STATE as CALL_STATE, REASON as CALL_REASON, CALL_TYPE} from '@wireapp/avs';

import 'Components/list/participantItem';
import 'Components/calling/fullscreenVideoCall';
import 'Components/groupVideoGrid';

class ConversationListCallingCell {
  constructor({
    call,
    conversation,
    videoGrid,
    callingRepository,
    temporaryUserStyle = false,
    multitasking,
    callActions,
    hasAccessToCamera,
  }) {
    this.call = call;
    this.conversation = conversation;
    this.callingRepository = callingRepository;
    this.temporaryUserStyle = temporaryUserStyle;
    this.multitasking = multitasking;
    this.callActions = callActions;

    this.multitasking.isMinimized(false); // reset multitasking default value, the call will be fullscreen if there are some remote videos

    this.videoGrid = videoGrid;
    this.conversationParticipants = ko.pureComputed(
      () => this.conversation() && this.conversation().participating_user_ets(),
    );

    const isState = state => () => call.state() === state;
    this.isIdle = ko.pureComputed(isState(CALL_STATE.NONE));
    this.isOutgoing = ko.pureComputed(isState(CALL_STATE.OUTGOING));
    this.isConnecting = ko.pureComputed(isState(CALL_STATE.ANSWERED));
    this.isIncoming = ko.pureComputed(isState(CALL_STATE.INCOMING));
    this.isOngoing = ko.pureComputed(isState(CALL_STATE.MEDIA_ESTAB));

    this.isDeclined = ko.pureComputed(() =>
      [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(call.reason()),
    );

    this.isMuted = callingRepository.isMuted;

    this.callDuration = ko.observable();
    let callDurationUpdateInterval;
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
      return t('callParticipants', this.call.participants().length);
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
    this.disableScreenButton = !this.callingRepository.supportsScreenSharing;
    this.disableVideoButton = ko.pureComputed(() => {
      const isOutgoingVideoCall = this.isOutgoing() && call.selfParticipant.sharesCamera();
      const isVideoUnsupported = !call.selfParticipant.sharesCamera() && !conversation().supportsVideoCall(true);
      return isOutgoingVideoCall || isVideoUnsupported;
    });

    this.showNoCameraPreview = ko.computed(() => {
      return !hasAccessToCamera() && call.initialType === CALL_TYPE.VIDEO && !this.showVideoGrid() && !this.isOngoing();
    });

    this.dispose = () => {
      window.clearInterval(callDurationUpdateInterval);
      startedAtSubscription.dispose();
    };
  }

  endCall(call) {
    return this.isIncoming() ? this.callActions.reject(call) : this.callActions.leave(call);
  }

  showFullscreenVideoGrid() {
    this.multitasking.autoMinimize(false);
    this.multitasking.isMinimized(false);
  }

  toggleShowParticipants() {
    this.showParticipants(!this.showParticipants());

    // TODO: this is a very hacky way to get antiscroll to recalculate the height of the conversationlist.
    // Once there is a new solution to this, this needs to go.
    afterRender(() => window.dispatchEvent(new Event('resize')));
  }

  findUser(userId) {
    return this.conversationParticipants().find(user => user.id === userId);
  }
}

ko.components.register('conversation-list-calling-cell', {
  template: `
   <!-- ko if: conversation() && !isDeclined() -->
    <div class="conversation-list-calling-cell conversation-list-cell">
      <!-- ko ifnot: temporaryUserStyle -->
        <div class="conversation-list-cell-left">
          <!-- ko if: conversation().isGroup() -->
            <group-avatar class="conversation-list-cell-avatar-arrow call-ui__avatar" params="users: conversationParticipants(), conversation: conversation"></group-avatar>
          <!-- /ko -->
          <!-- ko if: !conversation().isGroup() && conversationParticipants().length -->
            <participant-avatar params="participant: conversationParticipants()[0], size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
          <!-- /ko -->
        </div>
      <!-- /ko -->

      <div class="conversation-list-cell-center" data-bind="css: {'conversation-list-cell-center-no-left': temporaryUserStyle}">
        <span class="conversation-list-cell-name" data-bind="text: conversation().display_name()"></span>
        <!-- ko if: isIncoming() -->
          <!-- ko if: call.isGroup -->
            <span class="conversation-list-cell-description" data-bind="text: t('callStateIncomingGroup', call.creatingUser.first_name())" data-uie-name="call-label-incoming"></span>
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
          <span class="conversation-list-cell-description" data-bind="text: callDuration()" data-uie-name="call-duration"></span>
        <!-- /ko -->
      </div>

      <div class="conversation-list-cell-right">
        <!-- ko if: isConnecting() || isOngoing() -->
          <div class="call-ui__button call-ui__button--red" data-bind="click: () => callActions.leave(call)" data-uie-name="do-call-controls-call-leave">
            <hangup-icon class="small-icon"></hangup-icon>
          </div>
        <!-- /ko -->
      </div>
    </div>

    <!-- ko if: showVideoGrid() -->
      <div class="group-video__minimized-wrapper" data-bind="click: showFullscreenVideoGrid">
        <group-video-grid params="minimized: true, grid: videoGrid, selfUserId: call.selfParticipant.userId"></group-video-grid>
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
          <div class="call-ui__button" data-bind="click: () => callActions.toggleMute(call, !isMuted()), css: {'call-ui__button--active': isMuted()}, attr: {'data-uie-value': !isMuted() ? 'inactive' : 'active'}" data-uie-name="do-toggle-mute">
            <micoff-icon class="small-icon"></micoff-icon>
          </div>
          <!-- ko if: showVideoButton() -->
            <button class="call-ui__button" data-bind="click: () => callActions.toggleCamera(call), css: {'call-ui__button--active': call.selfParticipant.sharesCamera()}, disable: disableVideoButton(), attr: {'data-uie-value': call.selfParticipant.sharesCamera() ? 'active' : 'inactive'}" data-uie-name="do-toggle-video">
              <camera-icon class="small-icon"></camera-icon>
            </button>
          <!-- /ko -->
          <!-- ko if: isOngoing() -->
            <div class="call-ui__button"
              data-bind="tooltip: {text: t('videoCallScreenShareNotSupported'),
                disabled: !disableScreenButton, position: 'bottom'},
                click: () => callActions.toggleScreenshare(call),
                css: {'call-ui__button--active': call.selfParticipant.sharesScreen(), 'call-ui__button--disabled': disableScreenButton},
                attr: {'data-uie-value': call.selfParticipant.sharesScreen() ? 'active' : 'inactive', 'data-uie-enabled': disableScreenButton ? 'false' : 'true'}"
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
            <div class="call-ui__button call-ui__button--red call-ui__button--large" data-bind="click: () => endCall(call)" data-uie-name="do-call-controls-call-decline">
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
        <div class="call-ui__participant-list" data-bind="foreach: {data: call.participants(), as: 'participant', noChildContext: true}, fadingscrollbar" data-uie-name="list-call-ui-participants">
            <participant-item params="participant: findUser(participant.userId), hideInfo: true, showCamera: participant.hasActiveVideo(), selfInTeam: $parent.selfInTeam" data-bind="css: {'no-underline': true}"></participant-item>
        </div>
      </div>

    <!-- /ko -->
  <!-- /ko -->
  `,
  viewModel: ConversationListCallingCell,
});
