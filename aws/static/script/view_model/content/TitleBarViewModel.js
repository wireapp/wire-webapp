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
    this.userRepository = repositories.user;
    this.multitasking = contentViewModel.multitasking;
    this.logger = new z.util.Logger('z.viewModel.content.TitleBarViewModel', z.config.LOGGER.OPTIONS);

    this.panelViewModel = mainViewModel.panel;

    this.panelIsVisible = this.panelViewModel.isVisible;

    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => $('.titlebar').remove(), z.util.TimeUtil.UNITS_IN_MILLIS.SECOND);

    this.conversationEntity = this.conversationRepository.active_conversation;

    this.joinedCall = this.callingRepository.joinedCall;
    this.selfStreamState = this.callingRepository.selfStreamState;
    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.hasCall = ko.pureComputed(() => {
      const hasEntities = this.conversationEntity() && this.joinedCall();
      return hasEntities ? this.conversationEntity().id === this.joinedCall().id : false;
    });

    this.badgeLabelCopy = ko.pureComputed(() => {
      let stringId;

      if (this.conversationEntity().hasGuest()) {
        stringId = this.conversationEntity().hasService()
          ? z.string.guestRoomConversationBadgeGuestAndService
          : z.string.guestRoomConversationBadge;
      } else if (this.conversationEntity().hasService()) {
        stringId = z.string.guestRoomConversationBadgeService;
      }

      return stringId ? z.l10n.text(stringId) : '';
    });

    this.hasOngoingCall = ko.computed(() => {
      return this.hasCall() && this.joinedCall() ? this.joinedCall().isOngoing() : false;
    });

    this.showCallControls = ko.pureComputed(() => {
      if (!this.conversationEntity()) {
        return false;
      }

      const isSupportedConversation = this.conversationEntity().isGroup() || this.conversationEntity().is1to1();
      const hasParticipants = !!this.conversationEntity().participating_user_ids().length;
      const isActiveConversation = hasParticipants && !this.conversationEntity().removed_from_conversation();
      return !this.hasCall() && isSupportedConversation && isActiveConversation;
    });

    this.supportsVideoCall = ko.pureComputed(() => {
      return this.conversationEntity() && this.conversationEntity().supportsVideoCall(true);
    });

    const shortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.PEOPLE);
    this.peopleTooltip = z.l10n.text(z.string.tooltipConversationPeople, shortcut);
  }

  addedToView() {
    window.setTimeout(() => {
      amplify.subscribe(z.event.WebApp.SHORTCUT.PEOPLE, () => this.showDetails());
      amplify.subscribe(z.event.WebApp.SHORTCUT.ADD_PEOPLE, () => {
        if (this.isActivatedAccount()) {
          this.showAddParticipant();
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

  clickOnVideoButton() {
    amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO_VIDEO);
  }

  clickOnCollectionButton() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.COLLECTION);
  }

  showAddParticipant() {
    const canAddPeople = this.conversationEntity() && this.conversationEntity().isActiveParticipant();

    if (!canAddPeople) {
      return this.showDetails();
    }

    return this.conversationEntity().isGroup()
      ? this.showDetails(true)
      : amplify.publish(
          z.event.WebApp.CONVERSATION.CREATE_GROUP,
          'conversation_details',
          this.conversationEntity().firstUserEntity()
        );
  }

  showDetails(addParticipants) {
    const panelId = addParticipants
      ? z.viewModel.PanelViewModel.STATE.ADD_PARTICIPANTS
      : z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS;

    this.panelViewModel.togglePanel(panelId);
  }
};
