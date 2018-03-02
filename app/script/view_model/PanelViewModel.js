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

  static get CODE_STATES() {
    return [z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS, z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS];
  }

  /**
   * View model for the details column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, repositories) {
    this.closePanelOnChange = this.closePanelOnChange.bind(this);

    this.elementId = 'right-column';
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.mainViewModel = mainViewModel;
    this.logger = new z.util.Logger('z.viewModel.PanelViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = repositories.conversation.active_conversation;
    this.enableIntegrations = this.integrationRepository.enableIntegrations;

    this.isVisible = ko.observable(false);
    this.state = ko.observable(PanelViewModel.STATE.CONVERSATION_DETAILS);
    this.previousState = undefined;

    this.addParticipantsVisible = ko.pureComputed(() => this._isStateVisible(PanelViewModel.STATE.ADD_PARTICIPANTS));
    this.conversationDetailsVisible = ko.pureComputed(() => {
      return this._isStateVisible(PanelViewModel.STATE.CONVERSATION_DETAILS);
    });
    this.groupParticipantVisible = ko.pureComputed(() => this._isStateVisible(PanelViewModel.STATE.GROUP_PARTICIPANT));
    this.guestOptionsVisible = ko.pureComputed(() => this._isStateVisible(PanelViewModel.STATE.GUEST_OPTIONS));
    this.participantDevicesVisible = ko.pureComputed(() => {
      return this._isStateVisible(PanelViewModel.STATE.PARTICIPANT_DEVICES);
    });

    this.isGuestRoom = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity().isGuestRoom());
    this.isTeamOnly = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity().isTeamOnly());

    this.showIntegrations = ko.pureComputed(() => {
      if (this.conversationEntity()) {
        const firstUserEntity = this.conversationEntity().firstUserEntity();
        const hasBotUser = firstUserEntity && firstUserEntity.isBot;
        const allowIntegrations = this.conversationEntity().is_group() || hasBotUser;
        return this.enableIntegrations() && allowIntegrations && !this.isTeamOnly();
      }
    });

    this.conversationEntity.subscribe(this.closePanelOnChange, null, 'beforeChange');

    amplify.subscribe(z.event.WebApp.PEOPLE.TOGGLE, this.togglePanel.bind(this));
    amplify.subscribe(z.event.WebApp.PEOPLE.SHOW, this.showParticipant);

    // Nested view models
    this.addParticipants = new z.viewModel.panel.AppParticipantsViewModel(mainViewModel, this, repositories);
    this.conversationDetails = new z.viewModel.panel.ConversationDetailsViewModel(mainViewModel, this, repositories);
    this.groupParticipant = new z.viewModel.panel.GroupParticipantViewModel(mainViewModel, this, repositories);
    this.guestOptions = new z.viewModel.panel.GuestOptionsViewModel(mainViewModel, this, repositories);
    this.participantDevices = new z.viewModel.panel.ParticipantDevicesViewModel(mainViewModel, this, repositories);

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _isStateVisible(state) {
    const isStateVisible = this.state() === state;
    return isStateVisible && this.isVisible();
  }

  closePanel() {
    return this.mainViewModel.closePanel().then(() => this.isVisible(false));
  }

  closePanelOnChange() {
    if (this.isVisible()) {
      this.mainViewModel.closePanelImmediatly();
      this.isVisible(false);
    }
  }

  showGroupParticipant(userEntity) {
    this.groupParticipant.showGroupParticipant(userEntity);
    this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT);
  }

  showParticipant(userEntity) {
    if (this.isVisible()) {
      if (this.conversationEntity().is_one2one()) {
        if (userEntity.is_me) {
        }
      }
    }

    this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT);
  }

  showParticipantDevices(userEntity) {
    this.participantDevices.showParticipantDevices(userEntity);
    this.switchState(PanelViewModel.STATE.PARTICIPANT_DEVICES);
  }

  switchState(newState) {
    const stateUnchanged = newState === this.state();
    if (!stateUnchanged) {
      this._hidePanel();
      this._showPanel(newState);
    }
  }

  togglePanel(addPeople = false) {
    const conversationEntity = this.conversationEntity();
    const canAddPeople = conversationEntity
      ? !conversationEntity.is_guest() && !conversationEntity.removed_from_conversation()
      : false;

    if (addPeople && canAddPeople) {
      if (this.addParticipantsVisible()) {
        return this.closePanel();
      }

      if (conversationEntity.is_group()) {
        return this._openPanel(PanelViewModel.STATE.ADD_PARTICIPANTS);
      }
      return this.conversationDetails.clickOnCreateGroup();
    }

    if (this.conversationDetailsVisible()) {
      return this.closePanel();
    }

    return this._openPanel(PanelViewModel.STATE.CONVERSATION_DETAILS);
  }

  _getElementIdOfPanel(panelState) {
    switch (panelState) {
      case PanelViewModel.STATE.ADD_PARTICIPANTS:
        return 'add-participants';
      case PanelViewModel.STATE.GROUP_PARTICIPANT:
        return 'group-participant';
      case PanelViewModel.STATE.GUEST_OPTIONS:
        return 'guest-options';
      case PanelViewModel.STATE.PARTICIPANT_DEVICES:
        return 'participant-devices';
      default:
        return 'conversation-details';
    }
  }

  _hidePanel() {
    this.previousState = this.state();

    const panelStateElementId = this._getElementIdOfPanel(this.state());
    $(`#${panelStateElementId}`).removeClass('panel__page--visible');
  }

  _openPanel(newState) {
    this.switchState(newState);
    this.isVisible(true);
    this.mainViewModel.openPanel();
  }

  _showPanel(newPanelState) {
    this.state(newPanelState);

    const panelStateElementId = this._getElementIdOfPanel(newPanelState);
    if (panelStateElementId) {
      $(`#${panelStateElementId}`).addClass('panel__page--visible');
    }
  }
};
