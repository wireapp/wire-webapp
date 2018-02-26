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
  /**
   * View model for the details column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, repositories) {
    this.elementId = 'right-column';
    this.logger = new z.util.Logger('z.viewModel.PanelViewModel', z.config.LOGGER.OPTIONS);

    this.mainViewModel = mainViewModel;

    // Nested view models
    this.participants = new z.viewModel.panel.ParticipantsViewModel(mainViewModel, this, repositories);
    this.guestOptions = new z.viewModel.panel.GuestOptionsViewModel(mainViewModel, this, repositories);

    this.conversationEntity = repositories.conversation.active_conversation;
    this.conversationEntity.subscribe(() => {
      if (this.mainViewModel.isPanelOpen()) {
        this.mainViewModel.closePanel();
      }
    });

    ko.applyBindings(this, document.getElementById(this.elementId));
  }
};
