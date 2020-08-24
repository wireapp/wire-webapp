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

import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';

import {TIME_IN_MILLIS, formatSeconds} from 'Util/TimeUtil';
import type {Call} from '../../calling/Call';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import type {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../../media/MediaDevicesHandler';
import type {CallActions} from '../../view_model/CallingViewModel';
import type {Multitasking} from '../../notification/NotificationRepository';

import 'Components/calling/deviceToggleButton';

interface Params {
  call: Call;
  callActions: CallActions;
  canShareScreen: boolean;
  conversation: ko.Observable<Conversation>;
  isChoosingScreen: ko.Observable<boolean>;
  isMuted: ko.Observable<boolean>;
  mediaDevicesHandler: MediaDevicesHandler;
  multitasking: Multitasking;
  videoGrid: ko.Observable<Grid>;
}

export class FullscreenVideoCalling {
  public videoGrid: ko.Observable<Grid>;
  public call: Call;
  public conversation: ko.Observable<Conversation>;
  public mediaDevicesHandler: MediaDevicesHandler;
  public multitasking: Multitasking;
  public canShareScreen: boolean;
  public callActions: CallActions;
  public isMuted: ko.Observable<boolean>;
  public isChoosingScreen: ko.Observable<boolean>;

  public selfSharesScreen: () => boolean;
  public selfSharesCamera: () => boolean;
  public currentCameraDevice: ko.Observable<string>;
  public currentScreenDevice: ko.Observable<string>;

  public availableCameras: ko.PureComputed<string[]>;
  public availableScreens: ko.PureComputed<string[]>;
  public showSwitchCamera: ko.PureComputed<boolean>;

  public hasUnreadMessages: ko.Observable<boolean>;

  public showToggleVideo: ko.PureComputed<boolean>;
  public callDuration: ko.Observable<string>;

  public HIDE_CONTROLS_TIMEOUT: number;
  public dispose: () => void;

  static get CONFIG() {
    return {
      AUTO_MINIMIZE_TIMEOUT: TIME_IN_MILLIS.SECOND * 4,
      HIDE_CONTROLS_TIMEOUT: TIME_IN_MILLIS.SECOND * 4,
    };
  }

  constructor({
    videoGrid,
    call,
    conversation,
    mediaDevicesHandler,
    multitasking,
    canShareScreen,
    callActions,
    isMuted,
    isChoosingScreen,
  }: Params) {
    this.call = call;
    this.conversation = conversation;
    this.videoGrid = videoGrid;
    this.multitasking = multitasking;
    this.isMuted = isMuted;
    this.callActions = callActions;
    this.mediaDevicesHandler = mediaDevicesHandler;
    this.isChoosingScreen = isChoosingScreen;

    this.HIDE_CONTROLS_TIMEOUT = FullscreenVideoCalling.CONFIG.HIDE_CONTROLS_TIMEOUT;

    this.canShareScreen = canShareScreen;
    this.selfSharesScreen = call.getSelfParticipant().sharesScreen;
    this.selfSharesCamera = call.getSelfParticipant().sharesCamera;
    this.currentCameraDevice = mediaDevicesHandler.currentDeviceId.videoInput;
    this.currentScreenDevice = mediaDevicesHandler.currentDeviceId.screenInput;

    this.availableCameras = ko.pureComputed(() =>
      mediaDevicesHandler.availableDevices
        .videoInput()
        .map(device => (device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id),
    );
    this.availableScreens = ko.pureComputed(() =>
      mediaDevicesHandler.availableDevices
        .screenInput()
        .map(device => (device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id),
    );
    this.showSwitchCamera = ko.pureComputed(() => {
      return this.selfSharesCamera() && this.availableCameras().length > 1;
    });

    this.showToggleVideo = ko.pureComputed(() => {
      return (
        this.call.initialType === CALL_TYPE.VIDEO ||
        conversation().supportsVideoCall(call.conversationType === CONV_TYPE.CONFERENCE)
      );
    });

    this.callDuration = ko.observable();
    let callDurationUpdateInterval: number;
    const startedAtSubscription = ko.computed(() => {
      const startedAt = call.startedAt();
      if (startedAt) {
        const updateTimer = () => {
          const time = Math.floor((Date.now() - startedAt) / 1000);
          this.callDuration(formatSeconds(time));
        };
        updateTimer();
        callDurationUpdateInterval = window.setInterval(updateTimer, 1000);
      }
    });

    let minimizeTimeout: number;
    const gridSubscription = ko.computed(() => {
      const grid = this.videoGrid();
      window.clearTimeout(minimizeTimeout);
      minimizeTimeout = undefined;
      if (!grid.hasRemoteVideo) {
        if (this.multitasking.autoMinimize()) {
          minimizeTimeout = window.setTimeout(() => {
            if (!this.isChoosingScreen()) {
              this.multitasking.isMinimized(true);
            }
          }, FullscreenVideoCalling.CONFIG.AUTO_MINIMIZE_TIMEOUT);
        }
      }
    });

    const updateUnreadCount = (unreadCount: number) => this.hasUnreadMessages(unreadCount > 0);

    this.hasUnreadMessages = ko.observable(false);
    amplify.subscribe(WebAppEvents.LIFECYCLE.UNREAD_COUNT, updateUnreadCount);

    this.dispose = () => {
      amplify.unsubscribe(WebAppEvents.LIFECYCLE.UNREAD_COUNT, updateUnreadCount);
      window.clearInterval(callDurationUpdateInterval);
      startedAtSubscription.dispose();
      gridSubscription.dispose();
    };
  }

  switchCameraSource = (call: Call, deviceId: string) => {
    this.callActions.switchCameraInput(call, deviceId);
  };

  switchScreenSource = (call: Call, deviceId: string) => {
    this.callActions.switchScreenInput(call, deviceId);
  };

  minimize(): void {
    this.multitasking.isMinimized(true);
  }
}

ko.components.register('fullscreen-video-call', {
  template: `
<div id="video-calling" data-bind="hide_controls: {timeout: HIDE_CONTROLS_TIMEOUT, skipClass: 'video-controls__button'}" class="video-calling">
  <div id="video-element-remote" class="video-element-remote">
    <group-video-grid params="grid: videoGrid, muted: isMuted, selfParticipant: call.getSelfParticipant()"></group-video-grid>
  </div>

  <!-- ko if: !isChoosingScreen() -->
    <div class="video-element-overlay hide-controls-hidden"></div>
  <!-- /ko -->

  <div id="video-title" class="video-title hide-controls-hidden">
    <div class="video-remote-name" data-bind="text: conversation().display_name()"></div>
    <div class="video-timer label-xs" data-bind="text: callDuration()"></div>
  </div>


  <!-- ko ifnot: isChoosingScreen() -->
    <div id="video-controls" class="video-controls hide-controls-hidden">
      <div class="video-controls__fit-info" data-bind="text: t('videoCallOverlayFitVideoLabel')" data-uie-name="label-fit-fill-info"></div>
      <div class="video-controls__wrapper">

        <div class="video-controls__button" data-bind="click: minimize" data-uie-name="do-call-controls-video-minimize">
          <!-- ko if: hasUnreadMessages() -->
            <message-unread-icon></message-unread-icon>
          <!-- /ko -->
          <!-- ko ifnot: hasUnreadMessages() -->
            <message-icon></message-icon>
          <!-- /ko -->
          <div class="video-controls__button__label" data-bind="text: t('videoCallOverlayConversations')"></div>
        </div>

        <div class="video-controls__button"
            data-bind="click: () => callActions.toggleMute(call, !isMuted()), css: {'video-controls__button--active': isMuted()}, attr: {'data-uie-value': !isMuted() ? 'inactive' : 'active'}"
            data-uie-name="do-call-controls-video-call-mute">
          <mic-off-icon></mic-off-icon>
          <div class="video-controls__button__label" data-bind="text: t('videoCallOverlayMute')"></div>
        </div>

        <!-- ko if: showToggleVideo() -->
          <div class="video-controls__button"
              data-bind="click: () => callActions.toggleCamera(call), css: {'video-controls__button--active': selfSharesCamera()}, attr: {'data-uie-value': selfSharesCamera() ? 'active' : 'inactive'}"
              data-uie-name="do-call-controls-toggle-video">
            <camera-icon></camera-icon>
            <!-- ko if: showSwitchCamera() -->
              <device-toggle-button params="currentDevice: currentCameraDevice, devices: availableCameras, onChooseDevice: deviceId => switchCameraSource(call, deviceId)">
              </device-toggle-button>
            <!-- /ko -->
            <!-- ko ifnot: showSwitchCamera() -->
              <div class="video-controls__button__label" data-bind="text: t('videoCallOverlayVideo')"></div>
            <!-- /ko -->
          </div>
        <!-- /ko -->

        <div class="video-controls__button"
            data-bind="
              tooltip: {text: t('videoCallScreenShareNotSupported'), disabled: canShareScreen},
              click: () => callActions.toggleScreenshare(call),
              css: {'video-controls__button--active': selfSharesScreen(), 'video-controls__button--disabled': !canShareScreen},
              attr: {'data-uie-value': selfSharesScreen() ? 'active' : 'inactive', 'data-uie-enabled': canShareScreen ? 'true' : 'false'}"
            data-uie-name="do-toggle-screen">
          <screenshare-icon></screenshare-icon>
          <div class="video-controls__button__label" data-bind="text: t('videoCallOverlayShareScreen')"></div>
        </div>

        <div class="video-controls__button video-controls__button--red" data-bind="click: () => callActions.leave(call)" data-uie-name="do-call-controls-video-call-cancel">
          <hangup-icon></hangup-icon>
          <div class="video-controls__button__label" data-bind="text: t('videoCallOverlayHangUp')"></div>
        </div>
     </div>
   </div>
 <!-- /ko -->

</div>
  `,
  viewModel: FullscreenVideoCalling,
});
