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

z.viewModel.panel.ParticipantsViewModel = class ParticipantsViewModel {
  static get CONFIG() {
    return {
      ADD_STATES: [ParticipantsViewModel.STATE.ADD_PEOPLE, ParticipantsViewModel.STATE.ADD_SERVICE],
      SERVICE_STATES: [ParticipantsViewModel.STATE.SERVICE_CONFIRMATION, ParticipantsViewModel.STATE.SERVICE_DETAILS],
    };
  }

  static get STATE() {
    return {
      ADD_PEOPLE: 'ParticipantsViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'ParticipantsViewModel.STATE.ADD_SERVICE',
      PARTICIPANTS: 'ParticipantsViewModel.STATE.PARTICIPANTS',
      SERVICE_CONFIRMATION: 'ParticipantsViewModel.STATE.SERVICE_CONFIRMATION',
      SERVICE_DETAILS: 'ParticipantsViewModel.STATE.SERVICE_DETAILS',
    };
  }

  constructor(mainViewModel, panelViewModel, repositories) {
    this.clickOnAddPeople = this.clickOnAddPeople.bind(this);
    this.clickOnPending = this.clickOnPending.bind(this);
    this.clickOnMemberBack = this.clickOnMemberBack.bind(this);
    this.clickOnSelectService = this.clickOnSelectService.bind(this);
    this.clickOnShowParticipant = this.clickOnShowParticipant.bind(this);
    this.clickToAddService = this.clickToAddService.bind(this);
    this.clickToBlock = this.clickToBlock.bind(this);
    this.clickToLeave = this.clickToLeave.bind(this);
    this.clickToRemoveMember = this.clickToRemoveMember.bind(this);
    this.clickToRemoveService = this.clickToRemoveService.bind(this);
    this.clickToUnblock = this.clickToUnblock.bind(this);
    this.showParticipant = this.showParticipant.bind(this);

    this.elementId = 'participants';
    this.mainViewModel = mainViewModel;

    this.userRepository = repositories.user;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.logger = new z.util.Logger('z.viewModel.details.ParticipantsViewModel', z.config.LOGGER.OPTIONS);

    this.state = ko.observable(ParticipantsViewModel.STATE.PARTICIPANTS);
    this.previousState = ko.observable(this.state());
    this.state.subscribe(oldState => this.previousState(oldState), null, 'beforeChange');

    this.activeAddState = ko.pureComputed(() => ParticipantsViewModel.CONFIG.ADD_STATES.includes(this.state()));
    this.activeServiceState = ko.pureComputed(() => {
      return ParticipantsViewModel.CONFIG.SERVICE_STATES.includes(this.state());
    });

    this.stateAddPeople = ko.pureComputed(() => this.state() === ParticipantsViewModel.STATE.ADD_PEOPLE);
    this.stateAddService = ko.pureComputed(() => this.state() === ParticipantsViewModel.STATE.ADD_SERVICE);
    this.stateParticipants = ko.pureComputed(() => this.state() === ParticipantsViewModel.STATE.PARTICIPANTS);
    this.stateServiceConfirmation = ko.pureComputed(() => {
      return this.state() === ParticipantsViewModel.STATE.SERVICE_CONFIRMATION;
    });
    this.stateServiceDetails = ko.pureComputed(() => {
      return this.state() === ParticipantsViewModel.STATE.SERVICE_DETAILS;
    });

    this.conversation = ko.observable(new z.entity.Conversation());
    this.conversation.subscribe(() => this.renderParticipants(false));

    this.isTeam = this.teamRepository.isTeam;
    this.team = this.teamRepository.team;
    this.teamUsers = this.teamRepository.teamUsers;

    this.renderParticipants = ko.observable(false);

    this.groupMode = ko.observable(false);

    this.participants = ko.observableArray();
    this.serviceParticipants = ko.observableArray();
    this.unverifiedParticipants = ko.observableArray();
    this.verifiedParticipants = ko.observableArray();

    this.services = this.integrationRepository.services;

    ko.computed(() => {
      const conversationEntity = this.conversation();
      const sortedUserEntities = []
        .concat(conversationEntity.participating_user_ets())
        .sort((userA, userB) => z.util.StringUtil.sort_by_priority(userA.first_name(), userB.first_name()));

      this.participants(sortedUserEntities);
      this.serviceParticipants.removeAll();
      this.verifiedParticipants.removeAll();
      this.unverifiedParticipants.removeAll();

      sortedUserEntities.map(userEntity => {
        if (userEntity.isBot) {
          return this.serviceParticipants.push(userEntity);
        }
        if (userEntity.is_verified()) {
          return this.verifiedParticipants.push(userEntity);
        }
        this.unverifiedParticipants.push(userEntity);
      });
    });

    this.enableIntegrations = this.integrationRepository.enableIntegrations;
    this.showIntegrations = ko.pureComputed(() => {
      const hasBotUser = this.conversation().firstUserEntity() && this.conversation().firstUserEntity().isBot;
      const allowIntegrations = this.conversation().is_group() || hasBotUser;
      return this.enableIntegrations() && allowIntegrations;
    });

    // Confirm dialog reference
    this.confirmDialog = undefined;

    // Selected group participant
    this.selectedParticipant = ko.observable(undefined);
    this.selectedService = ko.observable(undefined);

    // Switch between div and input field to edit the conversation name
    this.isEditable = ko.pureComputed(() => !this.conversation().removed_from_conversation());
    this.isEditing = ko.observable(false);
    this.isEditing.subscribe(value => {
      if (!value) {
        const name = $('.group-header .name span');
        return $('.group-header textarea').css('height', `${name.height()}px`);
      }
      $('.group-header textarea').val(this.conversation().display_name());
    });

    // @todo create a viewmodel search?
    this.addActionText = ko.pureComputed(() => {
      return this.showIntegrations() ? z.string.people_button_add : z.string.people_button_add_people;
    });

    this.searchInput = ko.observable('');
    this.searchInput.subscribe(searchInput => this.searchServices(searchInput));
    this.isSearching = ko.pureComputed(() => this.searchInput().length);

    this.selectedContacts = ko.observableArray([]);
    this.contacts = ko.pureComputed(() => {
      const userEntities = this.isTeam() ? this.teamUsers() : this.userRepository.connected_users();

      return userEntities
        .filter(userEntity => !this.participants().find(participant => userEntity.id === participant.id))
        .sort((userA, userB) => z.util.StringUtil.sort_by_priority(userA.first_name(), userB.first_name()));
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => this.services() && this.selectedContacts() && this.stateAddPeople() && this.stateAddService())
      .extend({notify: 'always', rateLimit: 500});

    const shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = ko.pureComputed(() => {
      const identifier = this.showIntegrations() ? z.string.tooltip_people_add : z.string.tooltip_people_add_people;
      return z.l10n.text(identifier, shortcut);
    });

    this.showServiceStates = ko.pureComputed(() => this.activeServiceState() && this.selectedService());
    this.showUserState = ko.pureComputed(() => this.stateParticipants() && this.selectedParticipant());
    this.showParticipantProfile = ko.pureComputed(() => this.showServiceStates() || this.showUserState());

    this.selectedIsInConversation = ko.pureComputed(() => {
      if (this.selectedParticipant()) {
        return this.participants().some(entity => entity.id === this.selectedParticipant().id);
      }
      return false;
    });
    this.showServiceRemove = ko.pureComputed(() => {
      return this.stateServiceDetails() && !this.conversation().is_guest() && this.selectedIsInConversation();
    });

    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this.switchContent.bind(this));
    amplify.subscribe(z.event.WebApp.PEOPLE.SHOW, this.showParticipant);
    amplify.subscribe(z.event.WebApp.PEOPLE.TOGGLE, this.toggleParticipantsSidebar.bind(this));
  }

  changeConversation(conversationEntity) {
    this.conversation(conversationEntity);
    this.resetView();
  }

  clickOnAddPeople() {
    if (this.conversation().is_group()) {
      this.state(ParticipantsViewModel.STATE.ADD_PEOPLE);
      return $('.participants-search').addClass('participants-search-show');
    }

    amplify.publish(z.event.WebApp.CONVERSATION.CREATE_GROUP, 'conversation_details', this.selectedParticipant());
  }

  clickOnAddService() {
    this.state(ParticipantsViewModel.STATE.ADD_SERVICE);
    this.searchServices(this.searchInput());
  }

  clickOnPending(userEntity) {
    this.confirmDialog = $('#participants').confirm({
      cancel: () => this.userRepository.ignore_connection_request(userEntity),
      confirm: () => this.userRepository.accept_connection_request(userEntity, true),
      data: {
        user: this.selectedParticipant(),
      },
      template: '#template-confirm-connect',
    });
  }

  clickOnCloseAdding() {
    this.resetView();
  }

  clickOnSelectService(serviceEntity) {
    this.groupMode(true);
    this.selectedService(serviceEntity);
    this.state(ParticipantsViewModel.STATE.SERVICE_CONFIRMATION);

    this.integrationRepository.getProviderNameForService(serviceEntity);
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

  clickOnShowParticipant(userEntity) {
    this.showParticipant(userEntity, true);
  }

  clickToAddMembers() {
    if (this.conversation().is_group()) {
      this.conversationRepository.addMembers(this.conversation(), this.selectedContacts());
    }
  }

  clickToAddService() {
    this.integrationRepository.addService(this.conversation(), this.selectedService(), 'conversation_details');
  }

  clickToBlock(userEntity) {
    amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);

    this.confirmDialog = $('#participants').confirm({
      confirm: () => {
        const nextConversationEntity = this.conversationRepository.get_next_conversation(this.conversation());
        this.userRepository.block_user(userEntity, nextConversationEntity);
      },
      data: {
        user: userEntity,
      },
      template: '#template-confirm-block',
    });
  }

  clickToEdit() {
    if (this.isEditable()) {
      this.isEditing(true);
    }
  }

  clickToLeave() {
    amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);

    this.confirmDialog = $('#participants').confirm({
      confirm: () => this.conversationRepository.removeMember(this.conversation(), this.userRepository.self().id),
      template: '#template-confirm-leave',
    });
  }

  clickToRemoveMember(userEntity) {
    amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);

    this.confirmDialog = $('#participants').confirm({
      confirm: () => {
        this.conversationRepository.removeMember(this.conversation(), userEntity.id).then(response => {
          if (response) {
            this.resetView();
          }
        });
      },
      data: {
        user: userEntity,
      },
      template: '#template-confirm-remove',
    });
  }

  clickToRemoveService() {
    this.integrationRepository.removeService(this.conversation(), this.selectedParticipant()).then(response => {
      if (response && this.groupMode()) {
        this.resetView();
      }
    });
  }

  clickToUnblock(userEntity) {
    this.confirmDialog = $('#participants').confirm({
      confirm: () => {
        this.userRepository
          .unblock_user(userEntity)
          .then(() => this.conversationRepository.get_1to1_conversation(userEntity))
          .then(conversationEntity => this.conversationRepository.update_participating_user_ets(conversationEntity));
      },
      data: {
        user: userEntity,
      },
      template: '#template-confirm-unblock',
    });
  }

  renameConversation(data, event) {
    const currentConversationName = this.conversation()
      .display_name()
      .trim();
    const newConversationName = z.util.StringUtil.remove_line_breaks(event.target.value.trim());

    if (newConversationName.length && newConversationName !== currentConversationName) {
      event.target.value = currentConversationName;
      this.isEditing(false);
      this.conversationRepository.rename_conversation(this.conversation(), newConversationName);
    }
  }

  resetView() {
    this.state(ParticipantsViewModel.STATE.PARTICIPANTS);
    this.selectedContacts.removeAll();
    this.searchInput('');
    if (this.confirmDialog) {
      this.confirmDialog.destroy();
    }
    this.selectedParticipant(undefined);
  }

  searchServices(query) {
    if (this.stateAddService()) {
      this.integrationRepository.searchForServices(query, this.searchInput);
    }
  }

  showParticipant(participantEntity, groupMode = false) {
    if (participantEntity) {
      this.groupMode(groupMode);
      if (participantEntity.isBot) {
        return this.showService(participantEntity);
      }
      this.selectedParticipant(participantEntity);
    }

    if (!this.mainViewModel.isPanelOpen()) {
      this.mainViewModel.openPanel();
    }
  }

  showService(userEntity) {
    this.selectedParticipant(userEntity);
    const {providerId, serviceId} = userEntity;

    this.integrationRepository
      .getServiceById(providerId, serviceId)
      .then(serviceEntity => {
        this.selectedService(serviceEntity);
        this.state(ParticipantsViewModel.STATE.SERVICE_DETAILS);
        return this.integrationRepository.getProviderById(providerId);
      })
      .then(providerEntity => this.selectedService().providerName(providerEntity.name));
  }

  switchContent(contentState) {
    const isConnectionRequests = contentState === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS;
    if (isConnectionRequests) {
      // todo: what to do?
    }
  }

  toggleParticipantsSidebar(addPeople = false) {
    if (!this.mainViewModel.isPanelOpen()) {
      this.resetView();

      const [userEntity] = this.participants();
      const initialUser = userEntity && this.conversation().is_one2one() ? userEntity : undefined;
      this.selectedParticipant(initialUser);

      this.renderParticipants(true);
    }

    if (addPeople && !this.conversation().is_guest()) {
      if (!this.mainViewModel.isPanelOpen()) {
        this.mainViewModel.openPanel();
        return this.clickOnAddPeople();
      }

      const isConfirmingAction = this.confirmDialog && this.confirmDialog.is_visible();
      if (this.stateAddPeople() || isConfirmingAction) {
        return this.mainViewModel.closePanel();
      }

      return this.clickOnAddPeople();
    }

    this.mainViewModel.togglePanel();
  }
};
