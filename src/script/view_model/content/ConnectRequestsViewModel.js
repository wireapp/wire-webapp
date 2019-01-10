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

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.ConnectRequestsViewModel = class ConnectRequestsViewModel {
  /**
   * View model for connection requests.
   *
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ContentViewModel} contentViewModel - Content view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, contentViewModel, repositories) {
    this.afterRender = this.afterRender.bind(this);
    this.clickOnAccept = this.clickOnAccept.bind(this);
    this.clickOnIgnore = this.clickOnIgnore.bind(this);

    this.mainViewModel = mainViewModel;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.content.ConnectRequestsViewModel', z.config.LOGGER.OPTIONS);

    this.actionsViewModel = this.mainViewModel.actions;
    this.connectRequests = this.userRepository.connect_requests;

    this.shouldUpdateScrollbar = ko.computed(() => this.connectRequests()).extend({notify: 'always', rateLimit: 500});
  }

  /**
   * Called after each connection request is rendered.
   * @param {Object} elements - rendered objects
   * @param {z.entity.User} request - Rendered connection request
   * @returns {undefined} No return value
   */
  afterRender(elements, request) {
    if (z.util.ArrayUtil.isLastItem(this.connectRequests(), request)) {
      window.requestAnimationFrame(() => $('.connect-requests').scrollToBottom());
    }
  }

  /**
   * Click on accept.
   * @param {z.entity.User} userEntity - User to accept connection request from
   * @returns {undefined} No return value
   */
  clickOnAccept(userEntity) {
    const showConversation = this.connectRequests().length === 1;
    this.actionsViewModel.acceptConnectionRequest(userEntity, showConversation);
  }

  /**
   * Click on ignore.
   * @param {z.entity.User} userEntity - User to ignore connection request from
   * @returns {undefined} No return value
   */
  clickOnIgnore(userEntity) {
    this.actionsViewModel.ignoreConnectionRequest(userEntity);
  }
};
