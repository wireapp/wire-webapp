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
      NOTIFICATIONS: 'PanelViewModel.STATE.NOTIFICATIONS',
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
      [PanelViewModel.STATE.GUEST_OPTIONS]: z.viewModel.panel.GuestsAndServicesViewModel,
      [PanelViewModel.STATE.NOTIFICATIONS]: z.viewModel.panel.NotificationsViewModel,
      [PanelViewModel.STATE.PARTICIPANT_DEVICES]: z.viewModel.panel.ParticipantDevicesViewModel,
      [PanelViewModel.STATE.TIMED_MESSAGES]: z.viewModel.panel.TimedMessagesViewModel,
    };

    return Object.entries(viewModels).reduce((subViews, [state, viewModel]) => {
      subViews[state] = new viewModel({
        isVisible: ko.pureComputed(this._isStateVisible.bind(this, state)),
        mainViewModel: this.mainViewModel,
        navigateTo: this._navigateTo.bind(this),
        onClose: this.closePanel.bind(this),
        onGoBack: this._goBack.bind(this),
        onGoToRoot: this._goToRoot.bind(this),
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
    this.mainViewModel = mainViewModel;

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.stateHistory = [];

    this.isAnimating = ko.observable(false);
    this.isVisible = ko.pureComputed(() => this.state() !== null);
    this.exitingState = ko.observable(undefined);
    this.state = ko.observable(null);

    this.conversationEntity.subscribe(this._forceClosePanel.bind(this), null, 'beforeChange');
    this.subViews = this.buildSubViews();

    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this._switchContent.bind(this));
    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  /**
   * Toggles (open/close) a panel.
   * If the state given is the one visible (and the parameters are the same), the panel closes.
   * Else the panels opens on the given state.
   *
   * Note: panels that are toggled are not counted in the state history.
   *
   * @param {string} state - the new state to navigate to.
   * @param {Object} params - params to give to the new view.
   * @returns {void} nothing returned
   */
  togglePanel(state, params) {
    const isStateChange = this.state() !== state;
    if (!isStateChange) {
      const currentInstance = this.subViews[state];
      const isNewParams = params && params.entity && params.entity.id !== currentInstance.getEntityId();
      if (!isNewParams) {
        return this.closePanel();
      }
    }
    this._openPanel(state, params);
  }

  /**
   * Graciously closes the current opened panel.
   *
   * @returns {void} nothing returned
   */
  closePanel() {
    if (this.isAnimating()) {
      return Promise.resolve(false);
    }

    this.isAnimating(true);
    return this.mainViewModel.closePanel().then(() => {
      this._resetState();
      return true;
    });
  }

  /**
   * Will navigate from the current state to the new state.
   *
   * @param {string} newState - the new state to navigate to.
   * @param {Object} params - params to give to the new view.
   * @returns {void} nothing returned.
   */
  _navigateTo(newState, params) {
    this._switchState(newState, this.state(), params);
    this.stateHistory.push({params, state: newState});
  }

  _forceClosePanel() {
    if (this.isVisible()) {
      this.mainViewModel.closePanelImmediatly();
      this._resetState();
    }
  }

  _resetState() {
    this.isAnimating(false);
    this._hidePanel(this.state());
    this.state(null);
    this.stateHistory = [];
  }

  _isStateVisible(state) {
    const isStateActive = this.state() === state;
    const isStateExiting = this.exitingState() === state;
    return (isStateExiting || isStateActive) && this.isVisible();
  }

  _goBack() {
    this.stateHistory.pop();
    const toHistory = this.stateHistory[this.stateHistory.length - 1];
    const {state, params} = toHistory;
    this._switchState(state, this.state(), params, true);
  }

  _goToRoot() {
    this._openPanel(PanelViewModel.STATE.CONVERSATION_DETAILS);
  }

  _switchContent(newContentState) {
    const stateIsCollection = newContentState === z.viewModel.ContentViewModel.STATE.COLLECTION;
    if (stateIsCollection) {
      this._forceClosePanel();
    }
  }

  _switchState(toState, fromState, params, fromLeft = false) {
    const toViewModel = this.subViews[toState];
    const fromViewModel = this.subViews[fromState];
    toViewModel.initView(params);

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

  _hidePanel(state) {
    if (!this.subViews[state]) {
      return;
    }
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
      this._switchState(newState, null, params, true);
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
