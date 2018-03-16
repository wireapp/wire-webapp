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

z.viewModel.panel.GroupParticipantServiceViewModel = class GroupParticipantServiceViewModel {
  constructor(mainViewModel, panelViewModel, repositories) {
    this.mainViewModel = mainViewModel;
    this.panelViewModel = panelViewModel;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.panel.GroupParticipantServiceViewModel', z.config.LOGGER.OPTIONS);

    this.actionsViewModel = this.mainViewModel.actions;
    this.conversationEntity = this.conversationRepository.active_conversation;

    this.selectedParticipant = ko.observable(undefined);
    this.selectedService = ko.observable(undefined);

    this.isVisible = ko.pureComputed(() => {
      return this.panelViewModel.groupParticipantServiceVisible() && this.selectedParticipant();
    });

    this.isAddMode = ko.pureComputed(() => {
      return this.panelViewModel._isStateVisible(z.viewModel.PanelViewModel.STATE.ADD_SERVICE);
    });

    this.selectedIsInConversation = ko.pureComputed(() => {
      if (this.isVisible()) {
        const participatingUserIds = this.conversationEntity().participating_user_ids();
        return participatingUserIds.some(id => this.selectedParticipant().id === id);
      }
    });

    this.selfIsActiveMember = ko.pureComputed(() => {
      if (this.isVisible()) {
        return !this.conversationEntity().removed_from_conversation() && !this.conversationEntity().is_guest();
      }
    });
    this.showActionRemove = ko.pureComputed(() => this.selfIsActiveMember() && this.selectedIsInConversation());
    this.showGroupParticipant = this.showGroupParticipant.bind(this);
    this.shouldUpdateScrollbar = ko
      .computed(() => this.selectedService() && this.isVisible())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});
  }

  clickOnBack() {
    const newState = this.isAddMode()
      ? z.viewModel.PanelViewModel.STATE.ADD_PARTICIPANTS
      : z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS;
    this.panelViewModel.switchState(newState, true);
  }

  clickOnClose() {
    this.panelViewModel.closePanel().then(() => this.resetView());
  }

  clickOnAdd() {
    this.panelViewModel.addParticipants.clickToAddParticipants();
    this.clickOnBack();
  }

  clickToRemove() {
    this.actionsViewModel
      .removeFromConversation(this.conversationEntity(), this.selectedParticipant())
      .then(() => this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS));
  }

  resetView() {
    this.selectedParticipant(undefined);
    this.selectedService(undefined);
  }

  showGroupParticipant(serviceEntity) {
    this.selectedParticipant(ko.unwrap(serviceEntity));
    this._showService(this.selectedParticipant());
  }

  _showService(entity) {
    if (entity instanceof z.integration.ServiceEntity) {
      this.selectedService(entity);
      this.integrationRepository
        .getProviderById(entity.providerId)
        .then(providerEntity => this.selectedService().providerName(providerEntity.name));
      return;
    }

    const {providerId, serviceId} = entity;

    this.integrationRepository
      .getServiceById(providerId, serviceId)
      .then(serviceEntity => {
        this.selectedService(serviceEntity);
        return this.integrationRepository.getProviderById(providerId);
      })
      .then(providerEntity => this.selectedService().providerName(providerEntity.name));
  }
};
