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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

// Parent: z.viewModel.ContentViewModel
z.viewModel.content.TitleBarViewModel = class TitleBarViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this.addedToView = this.addedToView.bind(this);

    this.callingRepository = repositories.calling;
    this.conversationRepository = repositories.conversation;
    this.multitasking = contentViewModel.multitasking;
    this.logger = new z.util.Logger('z.viewModel.content.TitleBarViewModel', z.config.LOGGER.OPTIONS);

    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => $('.titlebar').remove(), 1000);

    this.conversationEntity = this.conversationRepository.active_conversation;

    this.joinedCall = this.callingRepository.joinedCall;
    this.remoteMediaStreams = this.callingRepository.remoteMediaStreams;
    this.selfStreamState = this.callingRepository.selfStreamState;

    this.hasCall = ko.pureComputed(() => {
      const hasEntities = this.conversationEntity() && this.joinedCall();
      return hasEntities ? this.conversationEntity().id === this.joinedCall().id : false;
    });

    this.hasOngoingCall = ko.computed(() => {
      return this.hasCall() ? this.joinedCall().state() === z.calling.enum.CALL_STATE.ONGOING : false;
    });

    this.showMaximizeControl = ko.pureComputed(() => {
      if (!this.joinedCall()) {
        return false;
      }

      const hasLocalVideo = this.selfStreamState.videoSend() || this.selfStreamState.screenSend();
      const hasRemoteVideoSetting = this.joinedCall().isRemoteScreenSend() || this.joinedCall().isRemoteVideoSend();
      const hasRemoteVideo = hasRemoteVideoSetting && this.remoteMediaStreams.video();
      return this.hasOngoingCall() && this.multitasking.isMinimized() && hasLocalVideo && !hasRemoteVideo;
    });

    this.showCallControls = ko.computed(() => {
      if (!this.conversationEntity()) {
        return false;
      }

      const isSupportedConversation = this.conversationEntity().is_group() || this.conversationEntity().is_one2one();
      const hasParticipants = !!this.conversationEntity().participating_user_ids().length;
      const isActiveConversation = hasParticipants && !this.conversationEntity().removed_from_conversation();
      return !this.hasCall() && isSupportedConversation && isActiveConversation;
    });

    const shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.PEOPLE);
    this.peopleTooltip = z.l10n.text(z.string.tooltipConversationPeople, shortcut);
  }

  addedToView() {
    window.setTimeout(() => {
      amplify.subscribe(z.event.WebApp.SHORTCUT.PEOPLE, () => this.showDetails());
      amplify.subscribe(z.event.WebApp.SHORTCUT.ADD_PEOPLE, () => this.showDetails(true));
    }, 50);
  }

  removedFromView() {
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.PEOPLE);
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.ADD_PEOPLE);
  }

  clickOnCallButton() {
    amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO);
  }

  clickOnMaximize() {
    this.multitasking.autoMinimize(false);
    this.multitasking.isMinimized(false);
    this.logger.info(`Maximizing call '${this.joinedCall().id}' on user click`);
  }

  clickOnDetails() {
    this.showDetails();
  }

  clickOnVideoButton() {
    amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO_VIDEO);
  }

  clickOnCollectionButton() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.COLLECTION);
  }

  showDetails(addPeople) {
    amplify.publish(z.event.WebApp.PEOPLE.TOGGLE, addPeople);
  }
};
