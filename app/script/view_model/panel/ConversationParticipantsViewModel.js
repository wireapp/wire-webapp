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
window.z.viewModel.panel = z.viewModel.panel || {};

z.viewModel.panel.ConversationParticipantsViewModel = class ConversationParticipantsViewModel {
  constructor(panelViewModel, repositories) {
    this.panelViewModel = panelViewModel;
    this.isVisible = this.panelViewModel.conversationParticipantsVisible;
    const activeConversation = repositories.conversation.active_conversation;
    this.participants = ko.pureComputed(() => {
      if (activeConversation()) {
        return activeConversation()
          .participating_user_ets()
          .filter(userEntity => !userEntity.isBot);
      }
      return [];
    });
    this.searchInput = ko.observable('');
    this.shouldUpdateScrollbar = ko
      .computed(() => (this.participants() || this.searchInput()) && this.isVisible())
      .extend({notify: 'always', rateLimit: 500});

    this.clickOnShowUser = this.clickOnShowUser.bind(this);
  }

  clickOnBack() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS, true);
  }

  clickOnClose() {
    this.panelViewModel.closePanel();
  }

  clickOnShowUser(userEntity) {
    this.panelViewModel.showGroupParticipantUser(userEntity);
  }

  resetView() {
    this.searchInput('');
  }
};
