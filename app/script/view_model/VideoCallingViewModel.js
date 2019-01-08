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

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};

z.viewModel.VideoCallingViewModel = class VideoCallingViewModel {
  static get CONFIG() {
    return {
      AUTO_MINIMIZE_TIMEOUT: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 4,
      HIDE_CONTROLS_TIMEOUT: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 4,
    };
  }

  constructor(mainViewModel, repositories) {
    this.clickedOnCancelScreen = this.clickedOnCancelScreen.bind(this);
    this.clickedOnChooseScreen = this.clickedOnChooseScreen.bind(this);
    this.chooseSharedScreen = this.chooseSharedScreen.bind(this);

    this.elementId = 'video-calling';

    this.callingRepository = repositories.calling;
    this.conversationRepository = repositories.conversation;
    this.mediaRepository = repositories.media;
    this.userRepository = repositories.user;
    this.videoGridRepository = repositories.videoGrid;

    this.contentViewModel = mainViewModel.content;
    this.multitasking = this.contentViewModel.multitasking;
    this.logger = new z.util.Logger('z.viewModel.VideoCallingViewModel', z.config.LOGGER.OPTIONS);

    this.devicesHandler = this.mediaRepository.devicesHandler;
    this.streamHandler = this.mediaRepository.streamHandler;

    this.availableDevices = this.devicesHandler.availableDevices;
    this.currentDeviceId = this.devicesHandler.currentDeviceId;
    this.currentDeviceIndex = this.devicesHandler.currentDeviceIndex;

    this.hasSelfVideo = this.streamHandler.hasActiveVideo;
    this.selfStreamState = this.streamHandler.selfStreamState;
    this.localVideoStream = this.streamHandler.localMediaStream;
    this.remoteVideoStreamsInfo = this.streamHandler.remoteMediaStreamInfoIndex.video;

    this.isChoosingScreen = ko.observable(false);

    this.minimizeTimeout = undefined;

    this.calls = this.callingRepository.calls;
    this.joinedCall = this.callingRepository.joinedCall;

    this.videodCall = ko.pureComputed(() => {
      for (const callEntity of this.calls()) {
        const selfScreenSend = callEntity.selfClientJoined() && this.selfStreamState.screenSend();
        const selfVideoSend = selfScreenSend || this.selfStreamState.videoSend();
        const remoteVideoSend = callEntity.isRemoteVideoCall() && !callEntity.isOngoingOnAnotherClient();
        const isVideoCall = selfVideoSend || remoteVideoSend || this.isChoosingScreen();

        if (callEntity.isActiveState() && isVideoCall) {
          return callEntity;
        }
      }
    });

    this.isCallOngoing = ko.pureComputed(() => {
      if (this.joinedCall()) {
        const isSendingVideo = this.localVideoStream() && this.hasSelfVideo();
        const isVideoCall = isSendingVideo || this.joinedCall().isRemoteVideoCall();
        return this.joinedCall().isOngoing() && isVideoCall;
      }
    });

    this.showFullscreen = ko.pureComputed(() => {
      const isFullScreenState = this.isCallOngoing() || this.isChoosingScreen();
      return isFullScreenState && !this.multitasking.isMinimized() && !!this.videodCall();
    });

    this.remoteUser = ko.pureComputed(() => {
      const [participantEntity] = this.joinedCall() ? this.joinedCall().participants() : [];

      if (participantEntity) {
        return participantEntity.user;
      }
    });

    this.showRemoteParticipant = ko.pureComputed(() => {
      const showRemoteParticipant = this.remoteUser() && !this.multitasking.isMinimized() && !this.isChoosingScreen();
      return showRemoteParticipant && this.isCallOngoing() && !this.showRemoteVideo();
    });

    this.showRemoteVideo = ko.pureComputed(() => {
      if (this.isCallOngoing()) {
        const remoteVideoState = this.joinedCall() && this.joinedCall().isRemoteVideoCall();
        return remoteVideoState && this.remoteVideoStreamsInfo().length;
      }
    });

    this.showSwitchCamera = ko.pureComputed(() => {
      const hasMultipleCameras = this.availableDevices.videoInput().length > 1;
      const isVisible = hasMultipleCameras && this.localVideoStream() && this.selfStreamState.videoSend();
      return this.isCallOngoing() && isVisible;
    });
    this.showSwitchScreen = ko.pureComputed(() => {
      const hasMultipleScreens = this.availableDevices.screenInput().length > 1;
      const isVisible = hasMultipleScreens && this.localVideoStream() && this.selfStreamState.screenSend();
      return this.isCallOngoing() && isVisible;
    });

    this.showControls = ko.pureComputed(() => {
      const isFullscreenEnabled = this.showRemoteParticipant() && !this.multitasking.isMinimized();
      const isVisible = this.showRemoteVideo() || isFullscreenEnabled;
      return this.isCallOngoing() && isVisible;
    });
    this.showToggleVideo = ko.pureComputed(() => {
      return this.joinedCall() ? this.joinedCall().conversationEntity.supportsVideoCall(false) : false;
    });
    this.disableToggleScreen = ko.pureComputed(() => !z.calling.CallingRepository.supportsScreenSharing);

    this.visibleCallId = undefined;
    this.joinedCall.subscribe(callEntity => {
      if (callEntity) {
        const isVisibleId = this.visibleCallId === callEntity.id;
        if (!isVisibleId) {
          this.visibleCallId = callEntity.id;

          // FIXME find a better condition to actually minimize/maximize the call
          // we should do this when we check that everything is alright with audio calls also
          if (this.showRemoteVideo()) {
            this.multitasking.isMinimized(false);
            return this.logger.info(`Maximizing video call '${callEntity.id}' to full-screen`, callEntity);
          }

          //this.multitasking.isMinimized(true);
          this.logger.info(`Minimizing audio call '${callEntity.id}' from full-screen`, callEntity);
        }
      } else {
        this.visibleCallId = undefined;
        this.multitasking.autoMinimize(true);
        this.multitasking.isMinimized(false);
        this.logger.info('Resetting full-screen calling to maximize');
      }
    });

    this.showRemoteParticipant.subscribe(showRemoteParticipant => {
      if (this.minimizeTimeout) {
        window.clearTimeout(this.minimizeTimeout);
        this.minimizeTimeout = undefined;
      }

      const isVideoCall = showRemoteParticipant && this.videodCall();
      const shouldAutoMinimize = isVideoCall && this.multitasking.autoMinimize() && !this.isChoosingScreen();
      if (shouldAutoMinimize) {
        const remoteUserName = this.remoteUser() ? this.remoteUser().name() : '';

        const callId = this.videodCall().id;
        const logMessage = `Scheduled minimizing call '${callId}' as remote user '${remoteUserName}' is not videod`;
        this.logger.info(logMessage);
        this.minimizeTimeout = window.setTimeout(() => {
          if (!this.isChoosingScreen()) {
            this.multitasking.isMinimized(true);
          }
          const message = `Minimizing call '${callId}' on timeout as remote user '${remoteUserName}' is not videod`;
          this.logger.info(message);
        }, VideoCallingViewModel.CONFIG.AUTO_MINIMIZE_TIMEOUT);
      }
    });

    this.hasUnreadMessages = ko.observable(false);

    amplify.subscribe(z.event.WebApp.CALL.MEDIA.CHOOSE_SCREEN, this.chooseSharedScreen);
    amplify.subscribe(z.event.WebApp.LIFECYCLE.UNREAD_COUNT, unreadCount => this.hasUnreadMessages(unreadCount > 0));

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  chooseSharedScreen(conversationId) {
    if (!this.disableToggleScreen()) {
      const skipScreenSelection = this.selfStreamState.screenSend() || z.util.Environment.browser.firefox;
      if (skipScreenSelection) {
        amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, conversationId, z.media.MediaType.SCREEN);
        return;
      }

      if (z.util.Environment.desktop) {
        this.mediaRepository.devicesHandler
          .getScreenSources()
          .then(screenSources => {
            const conversationEntity = this.joinedCall().conversationEntity;

            const attributes = {
              conversation_type: z.tracking.helpers.getConversationType(conversationEntity),
              kind_of_call_when_sharing: this.joinedCall().isRemoteVideoSend() ? 'video' : 'audio',
              num_screens: screenSources.length,
            };

            const isTeamConversation = !!conversationEntity.team_id;
            if (isTeamConversation) {
              Object.assign(attributes, z.tracking.helpers.getGuestAttributes(conversationEntity));
            }

            amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.SHARED_SCREEN, attributes);

            const hasMultipleScreens = screenSources.length > 1;
            if (hasMultipleScreens) {
              this.isChoosingScreen(true);
              if (this.multitasking.isMinimized()) {
                this.multitasking.resetMinimize(true);
                this.multitasking.isMinimized(false);
              }
            } else {
              amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, conversationId, z.media.MediaType.SCREEN);
            }
          })
          .catch(error => {
            this.logger.error('Unable to get screens sources for sharing', error);
          });
      }
    }
  }

  clickedOnCancelScreen() {
    this.isChoosingScreen(false);
  }

  clickedOnLeaveCall() {
    if (this.joinedCall()) {
      const reason = z.calling.enum.TERMINATION_REASON.SELF_USER;
      amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.joinedCall().id, reason);
    }
  }

  clickedOnMuteAudio() {
    if (this.joinedCall()) {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.joinedCall().id, z.media.MediaType.AUDIO);
    }
  }

  clickedOnShareScreen() {
    if (!this.disableToggleScreen() && this.joinedCall()) {
      this.chooseSharedScreen(this.joinedCall().id);
    }
  }

  clickedOnChooseScreen(screenSource) {
    this.currentDeviceId.screenInput('');

    this.logger.info(`Selected '${screenSource.name}' for screen sharing`, screenSource);
    this.isChoosingScreen(false);
    this.currentDeviceId.screenInput(screenSource.id);
    amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.joinedCall().id, z.media.MediaType.SCREEN);

    if (this.multitasking.resetMinimize()) {
      this.multitasking.isMinimized(true);
      this.multitasking.resetMinimize(false);
      this.logger.info(`Minimizing call '${this.joinedCall().id}' on screen selection to return to previous state`);
    }
  }

  clickedOnStopVideo() {
    if (this.joinedCall()) {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.joinedCall().id, z.media.MediaType.VIDEO);
    }
  }

  clickedOnToggleCamera() {
    this.mediaRepository.devicesHandler.toggleNextCamera();
  }

  clickedOnToggleScreen() {
    this.mediaRepository.devicesHandler.toggleNextScreen();
  }

  clickedOnMinimize() {
    this.multitasking.isMinimized(true);
    this.logger.info(`Minimizing call '${this.videodCall().id}' on user click`);
  }
};
