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

z.viewModel.panel.GroupParticipantViewModel = class GroupParticipantViewModel {
  constructor(mainViewModel, panelViewModel, repositories) {
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.panel.GroupParticipantViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;

    // Selected group participant
    this.selectedParticipant = ko.observable(undefined);
    this.selectedService = ko.observable(undefined);

    this.selectedIsInConversation = ko.pureComputed(() => {
      if (this.selectedParticipant()) {
        return this.conversationEntity.participating_user_ids().some(id => this.selectedParticipant().id === id);
      }
      return false;
    });

    this.showServiceStates = ko.pureComputed(() => this.activeServiceState() && this.selectedService());
    this.showUserState = ko.pureComputed(() => this.stateParticipants() && this.selectedParticipant());
    this.showParticipantProfile = ko.pureComputed(() => this.showServiceStates() || this.showUserState());
  }

  clickOnSelfProfile() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  clickOnMemberBack() {
    this.resetView();
  }

  clickOnServiceBack() {
    this.state(this.previousState());
    this.selectedParticipant(undefined);
    this.selectedService(undefined);
    $('.participants-search').addClass('participants-search-show');
  }

  clickOnPending(userEntity) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => this.userRepository.accept_connection_request(userEntity, true),
      secondary: () => this.userRepository.ignore_connection_request(userEntity),
      text: {
        action: z.l10n.text(z.string.modalConnectAcceptAction),
        message: z.l10n.text(z.string.modalConnectAcceptMessage, userEntity.first_name()),
        secondary: z.l10n.text(z.string.modalConnectAcceptSecondary),
        title: z.l10n.text(z.string.modalConnectAcceptHeadline),
      },
      warning: false,
    });
  }

  clickToBlock(userEntity) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => {
        const nextConversationEntity = this.conversationRepository.get_next_conversation(this.conversationEntity());
        this.userRepository.block_user(userEntity, nextConversationEntity);
      },
      text: {
        action: z.l10n.text(z.string.modalUserBlockAction),
        message: z.l10n.text(z.string.modalUserBlockMessage, userEntity.first_name()),
        title: z.l10n.text(z.string.modalUserBlockHeadline),
      },
    });
  }

  clickToRemoveMember(userEntity) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => this.conversationRepository.removeMember(this.conversationEntity(), userEntity.id),
      text: {
        action: z.l10n.text(z.string.modalConversationRemoveAction),
        message: z.l10n.text(z.string.modalConversationRemoveMessage, userEntity.first_name()),
        title: z.l10n.text(z.string.modalConversationRemoveHeadline),
      },
    });
  }

  clickToRemoveService() {
    this.integrationRepository.removeService(this.conversationEntity(), this.selectedParticipant());
  }

  clickToUnblock(userEntity) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => {
        this.userRepository
          .unblock_user(userEntity)
          .then(() => this.conversationRepository.get_1to1_conversation(userEntity))
          .then(conversationEntity => this.conversationRepository.update_participating_user_ets(conversationEntity));
      },
      text: {
        action: z.l10n.text(z.string.modalUserUnblockAction),
        message: z.l10n.text(z.string.modalUserUnblockMessage, userEntity.first_name()),
        title: z.l10n.text(z.string.modalUserUnblockHeadline),
      },
    });
  }

  showGroupParticipant(userEntity) {
    if (userEntity) {
      if (userEntity.isBot) {
        this.showService(userEntity);
      } else {
        this.selectedParticipant(userEntity);
      }
    }
  }

  showService(userEntity) {
    this.selectedParticipant(userEntity);
    const {providerId, serviceId} = userEntity;

    this.integrationRepository
      .getServiceById(providerId, serviceId)
      .then(serviceEntity => {
        this.selectedService(serviceEntity);
        return this.integrationRepository.getProviderById(providerId);
      })
      .then(providerEntity => this.selectedService().providerName(providerEntity.name));
  }
};
