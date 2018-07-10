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

z.viewModel.panel.GroupParticipantServiceViewModel = class GroupParticipantServiceViewModel extends z.viewModel.panel
  .BasePanelViewModel {
  constructor(params) {
    super(params);
    this.conversationRepository = this.repositories.conversation;
    this.integrationRepository = this.repositories.integration;
    this.userRepository = this.repositories.user;
    this.logger = new z.util.Logger('z.viewModel.panel.GroupParticipantServiceViewModel', z.config.LOGGER.OPTIONS);

    this.selectedParticipant = ko.observable(undefined);
    this.selectedService = ko.observable(undefined);

    this.isAddMode = ko.observable(false);

    this.selectedIsInConversation = ko.pureComputed(() => {
      if (this.isVisible()) {
        const participatingUserIds = this.activeConversation().participating_user_ids();
        return participatingUserIds.some(id => this.selectedParticipant().id === id);
      }
    });

    this.selfIsActiveParticipant = ko.pureComputed(() => {
      return this.isVisible() ? this.activeConversation().isActiveParticipant() : false;
    });
    this.showActionRemove = ko.pureComputed(() => this.selfIsActiveParticipant() && this.selectedIsInConversation());
    this.shouldUpdateScrollbar = ko
      .computed(() => this.selectedService() && this.isVisible())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});
  }

  getElementId() {
    return 'group-participant-service';
  }

  getEntityId() {
    return this.selectedParticipant().id;
  }

  clickOnAdd() {
    this.integrationRepository.addService(this.activeConversation(), this.selectedService(), 'conversation_details');
    this.onGoToRoot();
  }

  clickToRemove() {
    this.actionsViewModel
      .removeFromConversation(this.activeConversation(), this.selectedParticipant())
      .then(this.onGoBack);
  }

  initView({entity: service, addMode = false}) {
    const serviceEntity = ko.unwrap(service);
    this.selectedParticipant(serviceEntity);
    this.selectedService(undefined);
    this.isAddMode(addMode);
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
