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
window.z.viewModel.list = z.viewModel.list || {};

z.viewModel.list.ArchiveViewModel = class ArchiveViewModel {
  /**
   * View model for the archive.
   *
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.clickOnConversation = this.clickOnConversation.bind(this);
    this.clickOnClose = this.clickOnClose.bind(this);
    this.updateList = this.updateList.bind(this);

    this.listViewModel = listViewModel;
    this.conversationRepository = repositories.conversation;
    this.logger = new z.util.Logger('z.viewModel.list.ArchiveViewModel', z.config.LOGGER.OPTIONS);

    this.archivedConversations = this.conversationRepository.conversations_archived;

    this.shouldUpdateScrollbar = ko
      .computed(() => this.listViewModel.lastUpdate())
      .extend({notify: 'always', rateLimit: 500});
  }

  clickOnConversation(conversationEntity) {
    this.conversationRepository.unarchiveConversation(conversationEntity, 'opened conversation from archive');
    this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.CONVERSATIONS);
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
  }

  clickOnClose() {
    this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.CONVERSATIONS);
  }

  updateList() {
    this.conversationRepository.updateArchivedConversations();
  }
};
