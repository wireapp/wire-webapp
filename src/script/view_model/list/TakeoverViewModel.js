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

import {Config} from '../../Config';
import {getSupportUsernameUrl} from '../../externalRoute';
import {WebAppEvents} from '../../event/WebApp';
import {ContentViewModel} from '../ContentViewModel';

class TakeoverViewModel {
  /**
   * View model for the username takeover screen.
   *
   * @param {MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.listViewModel = listViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = getLogger('TakeoverViewModel');

    this.selfUser = this.userRepository.self;

    this.name = ko.pureComputed(() => (this.selfUser() ? this.selfUser().name() : ''));
    this.username = ko.pureComputed(() => (this.selfUser() ? this.selfUser().username() : ''));
    this.supportUsernameUrl = getSupportUsernameUrl();
    this.brandName = Config.BRAND_NAME;
  }

  chooseUsername() {
    this.listViewModel.dismissModal();
    window.requestAnimationFrame(() => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT));
  }

  keepUsername() {
    this.userRepository
      .change_username(this.username())
      .then(() => {
        const conversationEntity = this.conversationRepository.getMostRecentConversation();
        if (conversationEntity) {
          return amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
        }

        if (this.userRepository.connect_requests().length) {
          amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.CONNECTION_REQUESTS);
        }
      })
      .catch(() => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT))
      .then(() => this.listViewModel.dismissModal());
  }
}

export {TakeoverViewModel};
