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
      CONVERSATION_PARTICIPANTS: 'PanelViewModel.STATE.CONVERSATION_PARTICIPANTS',
      GROUP_PARTICIPANT_SERVICE: 'PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE',
      GROUP_PARTICIPANT_USER: 'PanelViewModel.STATE.GROUP_PARTICIPANT_USER',
      GUEST_OPTIONS: 'PanelViewModel.STATE.GUEST_OPTIONS',
      PARTICIPANT_DEVICES: 'PanelViewModel.STATE.DEVICES',
      TIMED_MESSAGES: 'PanelViewModel.STATE.TIMED_MESSAGES',
    };
  }

  buildSubViews() {
    const viewModels = {
      [PanelViewModel.STATE.ADD_PARTICIPANTS]: z.viewModel.panel.AddParticipantsViewModel,
      [PanelViewModel.STATE.CONVERSATION_DETAILS]: z.viewModel.panel.ConversationDetailsViewModel,
      [PanelViewModel.STATE.CONVERSATION_PARTICIPANTS]: z.viewModel.panel.ConversationParticipantsViewModel,
      [PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE]: z.viewModel.panel.GroupParticipantServiceViewModel,
      [PanelViewModel.STATE.GROUP_PARTICIPANT_USER]: z.viewModel.panel.GroupParticipantUserViewModel,
      [PanelViewModel.STATE.GUEST_OPTIONS]: z.viewModel.panel.GuestOptionsViewModel,
      [PanelViewModel.STATE.PARTICIPANT_DEVICES]: z.viewModel.panel.ParticipantDevicesViewModel,
      [PanelViewModel.STATE.TIMED_MESSAGES]: z.viewModel.panel.TimedMessagesViewModel,
    };

    return Object.entries(viewModels).reduce((subViews, [state, viewModel]) => {
      subViews[state] = new viewModel({
        isVisible: ko.pureComputed(this._isStateVisible.bind(this, state)),
        mainViewModel: this.mainViewModel,
        navigateTo: this.navigateTo.bind(this),
        onClose: this.closePanel.bind(this),
        onGoBack: this._goBack.bind(this),
        repositories: this.repositories,
      });
      return subViews;
    }, {});
  }

  /**
   * View model for the details column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, repositories) {
    this.elementId = 'right-column';
    this.repositories = repositories;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.mainViewModel = mainViewModel;

    this.conversationEntity = repositories.conversation.active_conversation;
    this.enableIntegrations = this.integrationRepository.enableIntegrations;
    this.stateHistory = [];

    this.isAnimating = ko.observable(false);
    this.isVisible = ko.observable(false);
    this.exitingState = ko.observable(undefined);
    this.state = ko.observable(PanelViewModel.STATE.CONVERSATION_DETAILS);
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

    this.conversationEntity.subscribe(this.closePanelOnChange.bind(this), null, 'beforeChange');
    this.subViews = this.buildSubViews();

    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this.switchContent.bind(this));
    amplify.subscribe(z.event.WebApp.PEOPLE.TOGGLE, this.togglePanel.bind(this));
    amplify.subscribe(z.event.WebApp.PEOPLE.SHOW, this.showParticipant.bind(this));
    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _isStateVisible(state) {
    const isStateActive = this.state() === state;
    const isStateExiting = this.exitingState() === state;
    return (isStateExiting || isStateActive) && this.isVisible();
  }

  navigateTo(newState, params) {
    this.switchState(newState, this.state(), params);
    this.stateHistory.push({params, state: newState});
  }

  _goBack(overrideParams) {
    this.stateHistory.pop();
    const toHistory = this.stateHistory[this.stateHistory.length - 1];
    const toState = toHistory.state;
    const params = overrideParams !== undefined ? overrideParams : toHistory.params;
    this.switchState(toState, this.state(), params, true);
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

  showParticipant(userEntity) {
    userEntity = ko.unwrap(userEntity);
    const isSingleModeConversation = this.conversationEntity().is_one2one() || this.conversationEntity().is_request();

    if (this.isVisible()) {
      const isStateGroupParticipant = this.state() === PanelViewModel.STATE.GROUP_PARTICIPANT_USER;
      const isStateConversationDetails = this.state() === PanelViewModel.STATE.CONVERSATION_DETAILS;

      if (isSingleModeConversation) {
        const isAlreadyShowingMe = isStateGroupParticipant && userEntity.is_me;
        const isAlreadyShowingRemote = isStateConversationDetails && !userEntity.is_me;
        if (isAlreadyShowingMe || isAlreadyShowingRemote) {
          return this.closePanel();
        }
      }

      const participantViewStates = [
        PanelViewModel.STATE.GROUP_PARTICIPANT_USER,
        PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE,
      ];

      const isAlreadyShowingUser = participantViewStates.some(viewState => {
        return this.state() === viewState && this.subViews[viewState].getEntityId() === userEntity.id;
      });

      if (isAlreadyShowingUser) {
        return this.closePanel();
      }
    }

    if (isSingleModeConversation && !userEntity.is_me) {
      return this._openPanel(PanelViewModel.STATE.CONVERSATION_DETAILS);
    }
    if (userEntity.isBot) {
      this._openPanel(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {service: userEntity});
    } else {
      this._openPanel(PanelViewModel.STATE.GROUP_PARTICIPANT_USER, userEntity);
    }
  }

  switchContent(newContentState) {
    const stateIsCollection = newContentState === z.viewModel.ContentViewModel.STATE.COLLECTION;
    if (stateIsCollection) {
      this.closePanelOnChange();
    }
  }

  switchState(toState, fromState, params, fromLeft = false) {
    const toViewModel = this.subViews[toState];
    const fromViewModel = this.subViews[fromState];
    toViewModel.initView(params);

    if (!this.isVisible()) {
      return this._openPanel(toState, params);
    }

    const isSameState = fromState === toState;
    if (isSameState) {
      return;
    }

    if (!fromViewModel) {
      return this._showPanel(toState);
    }

    const skipTransition = fromViewModel.shouldSkipTransition() || toViewModel.shouldSkipTransition();

    if (skipTransition) {
      this._hidePanel(fromState);
      this._showPanel(toState);
      return;
    }

    this.exitingState(fromState);

    const fromPanel = $(`#${fromViewModel.getElementId()}`);
    const toPanel = this._showPanel(toState);

    toPanel.addClass(`panel__page--move-in${fromLeft ? '--left' : '--right'}`);
    fromPanel.addClass(`panel__page--move-out${fromLeft ? '--left' : '--right'}`);

    window.setTimeout(() => {
      toPanel.removeClass('panel__page--move-in--left panel__page--move-in--right');
      this._hidePanel(fromState);
    }, z.motion.MotionDuration.MEDIUM);
  }

  togglePanel(addPeople = false) {
    const canAddPeople = this.conversationEntity() && this.conversationEntity().isActiveParticipant();
    if (addPeople && canAddPeople) {
      if (this._isStateVisible(PanelViewModel.STATE.ADD_PARTICIPANTS)) {
        return this.closePanel();
      }

      return this.conversationEntity().is_group()
        ? this._openPanel(PanelViewModel.STATE.ADD_PARTICIPANTS)
        : this.conversationDetails.clickOnCreateGroup();
    }

    if (this._isStateVisible(PanelViewModel.STATE.CONVERSATION_DETAILS)) {
      return this.closePanel();
    }

    return this._openPanel(PanelViewModel.STATE.CONVERSATION_DETAILS);
  }

  _hidePanel(state) {
    this.exitingState(undefined);

    const panelStateElementId = this.subViews[state].getElementId();
    const exitPanel = $(`#${panelStateElementId}`);
    exitPanel.removeClass('panel__page--visible panel__page--move-out--left panel__page--move-out--right');
  }

  _openPanel(newState, params) {
    if (!this.isAnimating()) {
      this._hidePanel(this.state());
      const rootState = PanelViewModel.STATE.CONVERSATION_DETAILS;
      this.stateHistory = [{state: rootState}, {params, state: newState}];
      this.isAnimating(true);
      this.exitingState(undefined);
      this.isVisible(true);
      this.switchState(newState, null, params, true);
      this.mainViewModel.openPanel().then(() => this.isAnimating(false));
    }
  }

  _showPanel(newPanelState) {
    this.state(newPanelState);

    const panelStateElementId = this.subViews[newPanelState].getElementId();
    if (panelStateElementId) {
      return $(`#${panelStateElementId}`).addClass('panel__page--visible');
    }
  }
};
