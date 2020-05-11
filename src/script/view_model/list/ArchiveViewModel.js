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

import {WebAppEvents} from '@wireapp/webapp-events';

export class ArchiveViewModel {
  /**
   * View model for the archive.
   *
   * @param {z.viewModel.ListViewModel} listViewModel List view model
   * @param {ConversationRepository} conversationRepository Repository responsible for conversations
   * @param {Function} onJoinCall Callback called when the user wants to join a call
   */
  constructor(listViewModel, conversationRepository, onJoinCall) {
    this.clickOnConversation = this.clickOnConversation.bind(this);
    this.clickOnClose = this.clickOnClose.bind(this);
    this.updateList = this.updateList.bind(this);

    this.listViewModel = listViewModel;
    this.conversationRepository = conversationRepository;
    this.logger = getLogger('ArchiveViewModel');

    this.archivedConversations = this.conversationRepository.conversations_archived;

    this.shouldUpdateScrollbar = ko
      .computed(() => this.listViewModel.lastUpdate())
      .extend({notify: 'always', rateLimit: 500});

    this.onJoinCall = onJoinCall;
  }

  clickOnConversation(conversationEntity) {
    this.conversationRepository.unarchiveConversation(conversationEntity, 'opened conversation from archive');
    this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.CONVERSATIONS);
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
  }

  clickOnClose() {
    this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.CONVERSATIONS);
  }

  updateList() {
    this.conversationRepository.updateArchivedConversations();
  }
}
