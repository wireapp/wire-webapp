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

import BasePanelViewModel from './BasePanelViewModel';

export default class ConversationParticipantsViewModel extends BasePanelViewModel {
  constructor(params) {
    super(params);
    this.clickOnShowUser = this.clickOnShowUser.bind(this);

    const repositories = params.repositories;
    this.searchRepository = repositories.search;

    this.participants = ko.pureComputed(() => {
      if (this.activeConversation()) {
        return this.activeConversation()
          .participating_user_ets()
          .filter(userEntity => !userEntity.isService);
      }
      return [];
    });

    this.highlightedUsers = ko.observable([]);

    this.searchInput = ko.observable('');

    this.shouldUpdateScrollbar = ko
      .computed(() => (this.participants() || this.searchInput()) && this.isVisible())
      .extend({notify: 'always', rateLimit: 500});
  }

  getElementId() {
    return 'conversation-participants';
  }

  clickOnShowUser(userEntity) {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_USER, {entity: userEntity});
  }

  initView(highlightedUsers = []) {
    this.searchInput('');
    this.highlightedUsers(highlightedUsers);
  }
}
