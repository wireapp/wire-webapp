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
      GROUP_PARTICIPANT: 'PanelViewModel.STATE.GROUP_PARTICIPANT',
      GUEST_OPTIONS: 'PanelViewModel.STATE.GUEST_OPTIONS',
      PARTICIPANT_DEVICES: 'PanelViewModel.STATE.DEVICES',
    };
  }

  /**
   * View model for the details column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, repositories) {
    this.elementId = 'right-column';
    this.conversationRepository = repositories.conversation;
    this.mainViewModel = mainViewModel;
    this.logger = new z.util.Logger('z.viewModel.PanelViewModel', z.config.LOGGER.OPTIONS);

    this.state = ko.observable(PanelViewModel.STATE.CONVERSATION_DETAILS);

    // Nested view models
    this.addParticipants = new z.viewModel.panel.AppParticipantsViewModel(mainViewModel, this, repositories);
    this.conversationDetails = new z.viewModel.panel.ConversationDetailsViewModel(mainViewModel, this, repositories);
    this.groupParticipant = new z.viewModel.panel.GroupParticipantViewModel(mainViewModel, this, repositories);
    this.guestOptions = new z.viewModel.panel.GuestOptionsViewModel(mainViewModel, this, repositories);

    this.conversationEntity = repositories.conversation.active_conversation;
    this.conversationEntity.subscribe(() => {
      if (this.mainViewModel.isPanelOpen()) {
        this.mainViewModel.closePanel();
      }
    });

    amplify.subscribe(z.event.WebApp.PEOPLE.TOGGLE, this.togglePanel.bind(this));
    amplify.subscribe(z.event.WebApp.PEOPLE.SHOW, this.showParticipant);

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
        return this.mainViewModel.closePanel();
      }

      this.switchState(PanelViewModel.STATE.ADD_PARTICIPANTS);
      return this.mainViewModel.openPanel();
    }

    const isStateConversationDetails = this.state() === PanelViewModel.STATE.CONVERSATION_DETAILS;
    if (isStateConversationDetails && this.mainViewModel.isPanelOpen()) {
      return this.mainViewModel.closePanel();
    }

    this.switchState(PanelViewModel.STATE.CONVERSATION_DETAILS);
    return this.mainViewModel.openPanel();
  }
};
