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

import {getLogger} from 'Util/Logger';
import {scrollToBottom} from 'Util/scroll-helpers';
import {isLastItem} from 'Util/ArrayUtil';

import {ParticipantAvatar} from 'Components/participantAvatar';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.ConnectRequestsViewModel = class ConnectRequestsViewModel {
  /**
   * View model for connection requests.
   *
   * @param {MainViewModel} mainViewModel Main view model
   * @param {ContentViewModel} contentViewModel Content view model
   * @param {Object} repositories Object containing all repositories
   */
  constructor(mainViewModel, contentViewModel, repositories) {
    this.afterRender = this.afterRender.bind(this);
    this.clickOnAccept = this.clickOnAccept.bind(this);
    this.clickOnIgnore = this.clickOnIgnore.bind(this);

    this.mainViewModel = mainViewModel;
    this.userRepository = repositories.user;
    this.logger = getLogger('z.viewModel.content.ConnectRequestsViewModel');

    this.actionsViewModel = this.mainViewModel.actions;
    this.connectRequests = this.userRepository.connect_requests;
    this.ParticipantAvatar = ParticipantAvatar;

    this.shouldUpdateScrollbar = ko.computed(() => this.connectRequests()).extend({notify: 'always', rateLimit: 500});
  }

  /**
   * Called after each connection request is rendered.
   * @param {Object} elements rendered objects
   * @param {User} request Rendered connection request
   * @returns {undefined} No return value
   */
  afterRender(elements, request) {
    if (isLastItem(this.connectRequests(), request)) {
      window.requestAnimationFrame(() => scrollToBottom(document.querySelector('.connect-requests')));
    }
  }

  /**
   * Click on accept.
   * @param {User} userEntity User to accept connection request from
   * @returns {undefined} No return value
   */
  clickOnAccept(userEntity) {
    const showConversation = this.connectRequests().length === 1;
    this.actionsViewModel.acceptConnectionRequest(userEntity, showConversation);
  }

  /**
   * Click on ignore.
   * @param {User} userEntity User to ignore connection request from
   * @returns {undefined} No return value
   */
  clickOnIgnore(userEntity) {
    this.actionsViewModel.ignoreConnectionRequest(userEntity);
  }
};
