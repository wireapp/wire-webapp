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

z.viewModel.PanelViewModel = class PanelViewModel {
  static get STATE() {
    return {
      ADD_PARTICIPANTS: 'PanelViewModel.STATE.ADD_PARTICIPANTS',
      CONVERSATION_DETAILS: 'PanelViewModel.STATE.CONVERSATION_DETAILS',
      EMPTY: 'PanelViewModel.STATE.EMPTY',
      GROUP_PARTICIPANT: 'PanelViewModel.STATE.GROUP_PARTICIPANT',
      GUEST_OPTIONS: 'PanelViewModel.STATE.GUEST_OPTIONS',
      PARTICIPANT_DEVICES: 'PanelViewModel.STATE.DEVICES',
    };
  }

  static get CODE_STATES() {
    return [z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS, z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS];
  }

  /**
   * View model for the details column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, repositories) {
    this.elementId = 'right-column';
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.mainViewModel = mainViewModel;
    this.logger = new z.util.Logger('z.viewModel.PanelViewModel', z.config.LOGGER.OPTIONS);

    this.state = ko.observable(PanelViewModel.STATE.EMPTY);

    this.conversationEntity = repositories.conversation.active_conversation;
    this.conversationEntity.subscribe(() => {
      if (this.mainViewModel.isPanelOpen()) {
        this.mainViewModel.closePanel();
      }
    });

    this.isTeamOnly = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity.isTeamOnly());

    this.enableIntegrations = this.integrationRepository.enableIntegrations;
    this.showIntegrations = ko.pureComputed(() => {
      const firstUserEntity = this.conversationEntity().firstUserEntity();
      const hasBotUser = firstUserEntity && firstUserEntity.isBot;
      const allowIntegrations = this.conversationEntity().is_group() || hasBotUser;
      return this.enableIntegrations() && allowIntegrations && !this.isTeamOnly();
    });

    amplify.subscribe(z.event.WebApp.PEOPLE.TOGGLE, this.togglePanel.bind(this));
    amplify.subscribe(z.event.WebApp.PEOPLE.SHOW, this.showParticipant);

    // Nested view models
    this.addParticipants = new z.viewModel.panel.AppParticipantsViewModel(mainViewModel, this, repositories);
    this.conversationDetails = new z.viewModel.panel.ConversationDetailsViewModel(mainViewModel, this, repositories);
    this.groupParticipant = new z.viewModel.panel.GroupParticipantViewModel(mainViewModel, this, repositories);
    this.guestOptions = new z.viewModel.panel.GuestOptionsViewModel(mainViewModel, this, repositories);

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  showGroupParticipant(userEntity) {
    this.groupParticipant.showGroupParticipant(userEntity);
    this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT);
  }

  showParticipant(userEntity) {
    if (this.mainViewModel.isPanelOpen()) {
      if (this.conversationEntity().is_one2one()) {
        if (userEntity.is_me) {
        }
      }
    }

    this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT);
  }

  switchState(newState) {
    const stateUnchanged = newState === this.state();
    if (!stateUnchanged) {
      this.state(newState);
    }
  }

  togglePanel(addPeople = false) {
    if (addPeople && !this.conversationEntity().is_guest()) {
      const isStateAddParticipants = this.state() === PanelViewModel.STATE.ADD_PARTICIPANTS;
      if (isStateAddParticipants && this.mainViewModel.isPanelOpen()) {
        return this._closePanel();
      }

      return this._openPanel(PanelViewModel.STATE.ADD_PARTICIPANTS);
    }

    const isStateConversationDetails = this.state() === PanelViewModel.STATE.CONVERSATION_DETAILS;
    if (isStateConversationDetails && this.mainViewModel.isPanelOpen()) {
      return this._closePanel();
    }

    return this._openPanel(PanelViewModel.STATE.CONVERSATION_DETAILS);
  }

  _closePanel() {
    this.mainViewModel.closePanel().then(() => this.switchState(PanelViewModel.STATE.EMPTY));
  }

  _openPanel(newState) {
    this.switchState(newState);
    this.mainViewModel.openPanel();
  }
};
