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
window.z.viewModel.list = z.viewModel.list || {};

z.viewModel.list.TakeoverViewModel = class TakeoverViewModel {
  /**
   * View model for the username takeover screen.
   *
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.list.TakeoverViewModel', z.config.LOGGER.OPTIONS);

    this.selfUser = this.userRepository.self;

    this.name = ko.pureComputed(() => (this.selfUser() ? this.selfUser().name() : ''));
    this.username = ko.pureComputed(() => (this.selfUser() ? this.selfUser().username() : ''));
  }

  chooseUsername() {
    amplify.publish(z.event.WebApp.TAKEOVER.DISMISS);
    window.requestAnimationFrame(() => amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT));
  }

  keepUsername() {
    this.userRepository
      .changeUsername(this.username())
      .then(() => {
        const conversationEntity = this.conversationRepository.getMostRecentConversation();
        if (conversationEntity) {
          return amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
        }

        if (this.userRepository.connect_requests().length) {
          amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
        }
      })
      .catch(() => amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT))
      .then(() => amplify.publish(z.event.WebApp.TAKEOVER.DISMISS));
  }
};
