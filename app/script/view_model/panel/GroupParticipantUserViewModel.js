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
window.z.viewModel.panel = z.viewModel.panel || {};

z.viewModel.panel.GroupParticipantUserViewModel = class GroupParticipantUserViewModel extends z.viewModel.panel
  .BasePanelViewModel {
  constructor(params) {
    super(params);

    const {mainViewModel, repositories} = params;

    this.userRepository = repositories.user;
    this.actionsViewModel = mainViewModel.actions;

    this.logger = new z.util.Logger('z.viewModel.panel.GroupParticipantUserViewModel', z.config.LOGGER.OPTIONS);

    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.selectedParticipant = ko.observable(undefined);

    this.selectedIsConnected = ko.pureComputed(() => {
      return this.selectedParticipant().isConnected() || this.selectedParticipant().isTeamMember();
    });
    this.selectedIsInConversation = ko.pureComputed(() => {
      if (this.isVisible()) {
        const participatingUserIds = this.activeConversation().participating_user_ids();
        return participatingUserIds.some(id => this.selectedParticipant().id === id);
      }
    });

    this.selfIsActiveParticipant = ko.pureComputed(() => {
      return this.isVisible() ? this.activeConversation().isActiveParticipant() : false;
    });

    this.showActionsIncomingRequest = ko.pureComputed(() => this.selectedParticipant().isIncomingRequest());
    this.showActionsOutgoingRequest = ko.pureComputed(() => this.selectedParticipant().isOutgoingRequest());

    this.showActionBlock = ko.pureComputed(() => {
      return this.selectedParticipant().isConnected() || this.selectedParticipant().isRequest();
    });
    this.showActionDevices = ko.pureComputed(() => !this.selectedParticipant().is_me);
    this.showActionOpenConversation = ko.pureComputed(() => {
      return this.selectedIsConnected() && !this.selectedParticipant().is_me;
    });
    this.showActionRemove = ko.pureComputed(() => this.selfIsActiveParticipant() && this.selectedIsInConversation());
    this.showActionSelfProfile = ko.pureComputed(() => this.selectedParticipant().is_me);
    this.showActionSendRequest = ko.pureComputed(() => {
      const isNotConnectedUser = this.selectedParticipant().isCanceled() || this.selectedParticipant().isUnknown();
      const canConnect = !this.selectedParticipant().isTeamMember() && !this.selectedParticipant().isTemporaryGuest();
      return isNotConnectedUser && canConnect;
    });
    this.showActionLeave = ko.pureComputed(() => {
      const isActiveParticipant = this.activeConversation() && !this.activeConversation().removed_from_conversation();
      return this.selectedParticipant().is_me && isActiveParticipant;
    });
    this.showActionUnblock = ko.pureComputed(() => this.selectedParticipant().isBlocked());

    this.shouldUpdateScrollbar = ko
      .computed(() => this.selectedParticipant() && this.isVisible())
      .extend({notify: 'always', rateLimit: 500});
  }

  getElementId() {
    return 'group-participant-user';
  }

  getEntityId() {
    return this.selectedParticipant().id;
  }

  clickOnDevices() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: this.selectedParticipant()});
  }

  clickOnShowProfile() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  clickOnOpenConversation() {
    this.actionsViewModel.open1to1Conversation(this.selectedParticipant());
  }

  clickToAcceptRequest() {
    this.actionsViewModel.acceptConnectionRequest(this.selectedParticipant(), true);
  }

  clickToBlock() {
    this.actionsViewModel.blockUser(this.selectedParticipant());
  }

  clickToCancelRequest() {
    this.actionsViewModel.cancelConnectionRequest(this.selectedParticipant());
  }

  clickToIgnoreRequest() {
    this.actionsViewModel.ignoreConnectionRequest(this.selectedParticipant());
  }

  clickToLeave() {
    this.actionsViewModel.leaveConversation(this.activeConversation());
  }

  clickToRemove() {
    this.actionsViewModel
      .removeFromConversation(this.activeConversation(), this.selectedParticipant())
      .then(this.onGoBack);
  }

  clickToSendRequest() {
    this.actionsViewModel.sendConnectionRequest(this.selectedParticipant());
  }

  clickToUnblock() {
    this.actionsViewModel.unblockUser(this.selectedParticipant(), false);
  }

  initView({entity: user}) {
    const userEntity = user;
    this.selectedParticipant(userEntity);

    if (userEntity.isTemporaryGuest()) {
      userEntity.checkGuestExpiration();
    }
  }
};
