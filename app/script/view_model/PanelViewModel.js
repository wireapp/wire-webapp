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
      ADD_SERVICE: 'PanelViewModel.STATE.ADD_SERVICE',
      CONVERSATION_DETAILS: 'PanelViewModel.STATE.CONVERSATION_DETAILS',
      CONVERSATION_PARTICIPANTS: 'PanelViewModel.STATE.CONVERSATION_PARTICIPANTS',
      GROUP_PARTICIPANT_SERVICE: 'PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE',
      GROUP_PARTICIPANT_USER: 'PanelViewModel.STATE.GROUP_PARTICIPANT_USER',
      GUEST_OPTIONS: 'PanelViewModel.STATE.GUEST_OPTIONS',
      PARTICIPANT_DEVICES: 'PanelViewModel.STATE.DEVICES',
      TIMED_MESSAGES: 'PanelViewModel.STATE.TIMED_MESSAGES',
    };
  }

  /**
   * View model for the details column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, repositories) {
    this.closePanelOnChange = this.closePanelOnChange.bind(this);
    this.showParticipant = this.showParticipant.bind(this);
    this.switchContent = this.switchContent.bind(this);
    this.togglePanel = this.togglePanel.bind(this);

    this.elementId = 'right-column';
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.mainViewModel = mainViewModel;
    this.logger = new z.util.Logger('z.viewModel.PanelViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = repositories.conversation.active_conversation;
    this.enableIntegrations = this.integrationRepository.enableIntegrations;

    this.isAnimating = ko.observable(false);
    this.isVisible = ko.observable(false);
    this.exitingState = ko.observable(undefined);
    this.state = ko.observable(PanelViewModel.STATE.CONVERSATION_DETAILS);
    this.previousState = ko.observable();

    this.addParticipantsVisible = ko.pureComputed(() => this._isStateVisible(PanelViewModel.STATE.ADD_PARTICIPANTS));
    this.conversationDetailsVisible = ko.pureComputed(() => {
      return this._isStateVisible(PanelViewModel.STATE.CONVERSATION_DETAILS);
    });
    this.groupParticipantUserVisible = ko.pureComputed(() => {
      return this._isStateVisible(PanelViewModel.STATE.GROUP_PARTICIPANT_USER);
    });
    this.groupParticipantServiceVisible = ko.pureComputed(() => {
      return (
        this._isStateVisible(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE) ||
        this._isStateVisible(PanelViewModel.STATE.ADD_SERVICE)
      );
    });
    this.guestOptionsVisible = ko.pureComputed(() => this._isStateVisible(PanelViewModel.STATE.GUEST_OPTIONS));
    this.participantDevicesVisible = ko.pureComputed(() => {
      return this._isStateVisible(PanelViewModel.STATE.PARTICIPANT_DEVICES);
    });
    this.timedMessagesVisible = ko.pureComputed(() => this._isStateVisible(PanelViewModel.STATE.TIMED_MESSAGES));
    this.conversationParticipantsVisible = ko.pureComputed(() =>
      this._isStateVisible(PanelViewModel.STATE.CONVERSATION_PARTICIPANTS)
    );
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

    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this.switchContent);
    amplify.subscribe(z.event.WebApp.PEOPLE.TOGGLE, this.togglePanel);
    amplify.subscribe(z.event.WebApp.PEOPLE.SHOW, this.showParticipant);

    // Nested view models
    this.addParticipants = new z.viewModel.panel.AddParticipantsViewModel(mainViewModel, this, repositories);
    this.conversationDetails = new z.viewModel.panel.ConversationDetailsViewModel(mainViewModel, this, repositories);
    this.groupParticipantUser = new z.viewModel.panel.GroupParticipantUserViewModel(mainViewModel, this, repositories);
    this.groupParticipantService = new z.viewModel.panel.GroupParticipantServiceViewModel(
      mainViewModel,
      this,
      repositories
    );
    this.guestOptions = new z.viewModel.panel.GuestOptionsViewModel(mainViewModel, this, repositories);
    this.conversationParticipants = new z.viewModel.panel.ConversationParticipantsViewModel(this, repositories);
    this.participantDevices = new z.viewModel.panel.ParticipantDevicesViewModel(mainViewModel, this, repositories);
    this.timedMessages = new z.viewModel.panel.TimedMessagesViewModel(mainViewModel, this, repositories);

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _isStateVisible(state) {
    const isStateVisible = this.state() === state;
    const isStateExiting = this.exitingState() === state;
    return (isStateExiting || isStateVisible) && this.isVisible();
  }

  closePanel() {
    if (this.isAnimating()) {
      return Promise.resolve(false);
    }

    this.isAnimating(true);
    return this.mainViewModel.closePanel().then(() => {
      this.isAnimating(false);
      this.isVisible(false);
      return true;
    });
  }

  closePanelOnChange() {
    if (this.isVisible()) {
      this.mainViewModel.closePanelImmediatly();
      this.isVisible(false);
    }
  }

  showAddService(serviceEntity) {
    this.groupParticipantService.showGroupParticipant(serviceEntity);
    this.switchState(PanelViewModel.STATE.ADD_SERVICE);
  }

  showGroupParticipantUser(userEntity) {
    this.groupParticipantUser.showGroupParticipant(userEntity);
    this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT_USER);
  }

  showGroupParticipantService(serviceEntity) {
    this.groupParticipantService.showGroupParticipant(serviceEntity);
    this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE);
  }

  showParticipant(userEntity, fromLeft = false) {
    userEntity = ko.unwrap(userEntity);
    const isSingleModeConversation = this.conversationEntity().is_one2one() || this.conversationEntity().is_request();

    if (this.isVisible()) {
      if (isSingleModeConversation) {
        if (userEntity.is_me) {
          const isStateGroupParticipant = this.state() === PanelViewModel.STATE.GROUP_PARTICIPANT_USER;
          if (isStateGroupParticipant) {
            return this.closePanel();
          }
        } else {
          const isStateConversationDetails = this.state() === PanelViewModel.STATE.CONVERSATION_DETAILS;
          if (isStateConversationDetails) {
            return this.closePanel();
          }
        }
      }

      const selectedGroupParticipant =
        this.groupParticipantUser.selectedParticipant() || this.groupParticipantService.selectedParticipant();
      if (selectedGroupParticipant) {
        const isVisibleGroupParticipant = userEntity.id === selectedGroupParticipant.id;
        if (isVisibleGroupParticipant) {
          return this.closePanel();
        }
      }
    }

    if (isSingleModeConversation && !userEntity.is_me) {
      return this.switchState(PanelViewModel.STATE.CONVERSATION_DETAILS, true);
    }

    if (userEntity.isBot) {
      this.groupParticipantService.showGroupParticipant(userEntity);
      this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, false);
    } else {
      this.groupParticipantUser.showGroupParticipant(userEntity);
      this.switchState(PanelViewModel.STATE.GROUP_PARTICIPANT_USER, fromLeft);
    }
  }

  showParticipantDevices(userEntity) {
    this.participantDevices.showParticipantDevices(userEntity);
    this.switchState(PanelViewModel.STATE.PARTICIPANT_DEVICES);
  }

  switchContent(newContentState) {
    const stateIsCollection = newContentState === z.viewModel.ContentViewModel.STATE.COLLECTION;
    if (stateIsCollection) {
      this.closePanelOnChange();
    }
  }

  switchState(newState, fromLeft = false, skipTransition = false) {
    if (!this.isVisible()) {
      return this._openPanel(newState);
    }

    const isStateChange = newState !== this.state();
    if (!isStateChange) {
      return;
    }

    if (skipTransition) {
      this._hidePanel(this.state(), newState);
      this._showPanel(newState);
      return;
    }

    this.exitingState(this.state());

    const oldPanel = $(`#${this._getElementIdOfPanel(this.state())}`);
    const newPanel = this._showPanel(newState);

    newPanel.addClass(`panel__page--move-in${fromLeft ? '--left' : '--right'}`);
    oldPanel.addClass(`panel__page--move-out${fromLeft ? '--left' : '--right'}`);

    window.setTimeout(() => {
      newPanel.removeClass('panel__page--move-in--left panel__page--move-in--right');
      this._hidePanel(this.exitingState(), newState);
    }, z.motion.MotionDuration.MEDIUM);
  }

  togglePanel(addPeople = false) {
    const canAddPeople = this.conversationEntity() && this.conversationEntity().isActiveParticipant();
    if (addPeople && canAddPeople) {
      if (this.addParticipantsVisible()) {
        return this.closePanel();
      }

      return this.conversationEntity().is_group()
        ? this._openPanel(PanelViewModel.STATE.ADD_PARTICIPANTS)
        : this.conversationDetails.clickOnCreateGroup();
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
      case PanelViewModel.STATE.CONVERSATION_PARTICIPANTS:
        return 'conversation-participants';
      case PanelViewModel.STATE.ADD_SERVICE:
      case PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE:
        return 'group-participant-service';
      case PanelViewModel.STATE.GROUP_PARTICIPANT_USER:
        return 'group-participant-user';
      case PanelViewModel.STATE.GUEST_OPTIONS:
        return 'guest-options';
      case PanelViewModel.STATE.PARTICIPANT_DEVICES:
        return 'participant-devices';
      case PanelViewModel.STATE.TIMED_MESSAGES:
        return 'timed-messages';
      default:
        return 'conversation-details';
    }
  }

  _hidePanel(state, newState) {
    switch (state) {
      case PanelViewModel.STATE.ADD_PARTICIPANTS: {
        const isStateAddService = newState === PanelViewModel.STATE.ADD_SERVICE;
        if (!isStateAddService) {
          this.addParticipants.resetView();
        }
        break;
      }

      case PanelViewModel.STATE.CONVERSATION_PARTICIPANTS: {
        this.conversationParticipants.resetView();
        break;
      }

      case PanelViewModel.STATE.GROUP_PARTICIPANT_USER: {
        this.groupParticipantUser.resetView();
        break;
      }

      case PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE: {
        this.groupParticipantService.resetView();
        break;
      }

      case PanelViewModel.STATE.PARTICIPANT_DEVICES: {
        this.participantDevices.resetView();
        break;
      }

      default:
        break;
    }

    this.previousState(state);
    this.exitingState(undefined);

    const panelStateElementId = this._getElementIdOfPanel(state);
    const exitPanel = $(`#${panelStateElementId}`);
    exitPanel.removeClass('panel__page--visible panel__page--move-out--left panel__page--move-out--right');
  }

  _openPanel(newState) {
    if (!this.isAnimating()) {
      const wasVisible = this.isVisible();
      this.isAnimating(true);
      this.exitingState(undefined);
      this.isVisible(true);
      this.switchState(newState, true, !wasVisible);
      this.mainViewModel.openPanel().then(() => this.isAnimating(false));
    }
  }

  _showPanel(newPanelState) {
    this.state(newPanelState);

    const panelStateElementId = this._getElementIdOfPanel(newPanelState);
    if (panelStateElementId) {
      return $(`#${panelStateElementId}`).addClass('panel__page--visible');
    }
  }
};
