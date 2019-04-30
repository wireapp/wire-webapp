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

import {validateHandle} from '../user/UserHandleGenerator';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.UserList = class UserList {
  static get MODE() {
    return {
      COMPACT: 'UserList.MODE.COMPACT',
      DEFAULT: 'UserList.MODE.DEFAULT',
      OTHERS: 'UserList.MODE.OTHERS',
    };
  }

  /**
   * Displays a list of user_ets
   *
   * @param {Object} params - Component parameters
   * @param {ko.observableArray} params.user - User data source
   * @param {ko.observable} params.filter - Filter list items
   * @param {Function} params.click - Called when a list item is selected
   * @param {ko.observableArray} params.selected - Populated will all the selected items
   * @param {Array} params.highlightedUsers - List of highlighted items
   */
  constructor(params) {
    this.click = params.click;
    this.filter = params.filter;
    this.selectedUsers = params.selected;
    this.mode = params.mode || UserList.MODE.DEFAULT;
    this.searchRepository = params.searchRepository;
    this.teamRepository = params.teamRepository;
    this.conversationRepository = params.conversationRepository;
    this.userEntities = params.user;
    this.infos = params.infos;
    const highlightedUsers = params.highlightedUsers ? params.highlightedUsers() : [];
    this.highlightedUserIds = highlightedUsers.map(user => user.id);
    this.isSelectEnabled = typeof params.selected === 'function';
    this.noUnderline = params.noUnderline;
    this.arrow = params.arrow;

    this.isCompactMode = this.mode === UserList.MODE.COMPACT;
    this.isDefaultMode = this.mode === UserList.MODE.DEFAULT;
    this.isOthersMode = this.mode === UserList.MODE.OTHERS;

    this.cssClasses = ko.pureComputed(() => (this.isCompactMode ? 'search-list-sm' : 'search-list-lg'));

    this.onUserClick = (userEntity, event) => {
      if (this.isSelectEnabled) {
        if (this.isSelected(userEntity)) {
          this.selectedUsers.remove(userEntity);
        } else {
          this.selectedUsers.push(userEntity);
        }
      }
      if (typeof this.click === 'function') {
        this.click(userEntity, event);
      }
    };

    // Filter all list items if a filter is provided
    this.filteredUserEntities = ko.pureComputed(() => {
      const connectedUsers = this.conversationRepository.connectedUsers();
      if (typeof this.filter === 'function') {
        const normalizedQuery = z.search.SearchRepository.normalizeQuery(this.filter());
        if (normalizedQuery) {
          const SEARCHABLE_FIELDS = z.search.SearchRepository.CONFIG.SEARCHABLE_FIELDS;
          const trimmedQuery = this.filter().trim();
          const isHandle = trimmedQuery.startsWith('@') && validateHandle(normalizedQuery);
          const properties = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;
          const searchResults = this.searchRepository.searchUserInSet(normalizedQuery, this.userEntities(), properties);
          const filteredResults = searchResults.filter(user => {
            return (
              connectedUsers.includes(user) ||
              this.teamRepository.isSelfConnectedTo(user.id) ||
              user.username() === normalizedQuery
            );
          });
          return filteredResults;
        }
      }
      return this.userEntities().filter(user => {
        return connectedUsers.includes(user) || this.teamRepository.isSelfConnectedTo(user.id);
      });
    });

    this.isSelected = userEntity => {
      if (this.isSelectEnabled) {
        return this.selectedUsers().includes(userEntity);
      }
    };

    this.selfUser = window.wire.app.repository.user.self;
  }
};

ko.components.register('user-list', {
  template: `
    <div class="search-list" data-bind="css: cssClasses(), foreach: {data: filteredUserEntities(), as: 'user', noChildContext: true }">
      <participant-item 
        params="participant: user, customInfo: infos && infos()[user.id], canSelect: isSelectEnabled, isSelected: isSelected(user), mode: mode, badge: teamRepository.getRoleBadge(user.id)" 
        data-bind="click: (viewmodel, event) => onUserClick(user, event), css: {'no-underline': noUnderline, 'show-arrow': arrow, 'highlighted': highlightedUserIds.includes(user.id)}">
      </participant-item>
    </div>

    <!-- ko if: typeof filter === 'function' -->
      <!-- ko if: userEntities().length === 0 -->
        <div class="no-results" data-bind="text: t('searchListEveryoneParticipates')"></div>
      <!-- /ko -->

      <!-- ko if: userEntities().length > 0 && filteredUserEntities().length === 0 -->
        <div class="no-results" data-bind="text: t('searchListNoMatches')" data-uie-name="status-no-matches"></div>
      <!-- /ko -->
    <!-- /ko -->
  `,
  viewModel: z.components.UserList,
});
