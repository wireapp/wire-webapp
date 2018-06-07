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
  static get CONFIG() {
    return {
      DRAG_THRESHOLD: 2,
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.addedToView = this.addedToView.bind(this);

    this.callingRepository = repositories.calling;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.multitasking = contentViewModel.multitasking;
    this.logger = new z.util.Logger('z.viewModel.content.TitleBarViewModel', z.config.LOGGER.OPTIONS);

    this.isActivatedAccount = mainViewModel.isActivatedAccount;

    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => $('.titlebar').remove(), 1000);

    this.conversationEntity = this.conversationRepository.active_conversation;

    this.joinedCall = this.callingRepository.joinedCall;
    this.selfStreamState = this.callingRepository.selfStreamState;
    this.isActivatedAccount = mainViewModel.isActivatedAccount;

    this.hasCall = ko.pureComputed(() => {
      const hasEntities = this.conversationEntity() && this.joinedCall();
      return hasEntities ? this.conversationEntity().id === this.joinedCall().id : false;
    });

    this.hasGuests = ko.pureComputed(() =>
      this.conversationEntity()
        .participating_user_ets()
        .some(userEntity => userEntity.isGuest())
    );

    this.hasOngoingCall = ko.computed(() => {
      return this.hasCall() && this.joinedCall()
        ? this.joinedCall().state() === z.calling.enum.CALL_STATE.ONGOING
        : false;
    });

    this.showCallControls = ko.pureComputed(() => {
      if (!this.conversationEntity()) {
        return false;
      }

      const isSupportedConversation = this.conversationEntity().is_group() || this.conversationEntity().is_one2one();
      const hasParticipants = !!this.conversationEntity().participating_user_ids().length;
      const isActiveConversation = hasParticipants && !this.conversationEntity().removed_from_conversation();
      return !this.hasCall() && isSupportedConversation && isActiveConversation;
    });

    this.supportsVideoCall = ko.pureComputed(() => {
      return this.conversationEntity() && this.conversationEntity().supportsVideoCall(true);
    });

    const shortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.PEOPLE);
    this.peopleTooltip = z.l10n.text(z.string.tooltipConversationPeople, shortcut);

    this.isMacDesktop = z.util.Environment.electron && z.util.Environment.os.mac;
    this.isDragged = false;
    this.startX = 0;
    this.startY = 0;
    this.isMoved = false;
    this.preventPanelOpen = false;
  }

  addedToView() {
    window.setTimeout(() => {
      amplify.subscribe(z.event.WebApp.SHORTCUT.PEOPLE, () => this.showDetails());
      amplify.subscribe(z.event.WebApp.SHORTCUT.ADD_PEOPLE, () => {
        if (this.isActivatedAccount()) {
          this.showDetails(true);
        }
      });
    }, 50);
  }

  removedFromView() {
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.PEOPLE);
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.ADD_PEOPLE);
  }

  clickOnCallButton() {
    amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO);
  }

  clickOnDetails() {
    this.showDetails();
  }

  onMouseDown(_, event) {
    if (this.isMacDesktop) {
      this.isDragged = true;
      this.startX = event.screenX;
      this.startY = event.screenY;
    }
  }

  onMouseMove(_, event) {
    if (this.isDragged && !this.isMoved) {
      const distanceX = Math.abs(event.screenX - this.startX);
      const distanceY = Math.abs(event.screenY - this.startY);
      this.isMoved =
        distanceX > TitleBarViewModel.CONFIG.DRAG_THRESHOLD || distanceY > TitleBarViewModel.CONFIG.DRAG_THRESHOLD;
    }
  }

  onMouseUp() {
    this.preventPanelOpen = this.isMoved;
    this.isMoved = false;
    this.isDragged = false;
  }

  clickOnVideoButton() {
    amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO_VIDEO);
  }

  clickOnCollectionButton() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.COLLECTION);
  }

  showDetails(addPeople) {
    if (!this.preventPanelOpen) {
      amplify.publish(z.event.WebApp.PEOPLE.TOGGLE, addPeople);
    }
  }
};
