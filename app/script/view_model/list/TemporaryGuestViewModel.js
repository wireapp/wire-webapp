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

z.viewModel.list.TemporaryGuestViewModel = class TemporaryGuestViewModel {
  /**
   * View model for the temporary guest experience.
   *
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.list.TemporaryGuestViewModel', z.config.LOGGER.OPTIONS);

    this.callConversations = this.conversationRepository.conversations_calls;
    this.selfUser = this.userRepository.self;
  }

  clickOnPreferencesButton() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  clickToCreateAccount() {
    const path = `${z.l10n.text(z.string.urlWebsiteCreateTeam)}?pk_campaign=wireless&pk_kwd=desktop`;
    z.util.safe_window_open(z.util.URLUtil.build_url(z.util.URLUtil.TYPE.WEBSITE, path));
  }
};
