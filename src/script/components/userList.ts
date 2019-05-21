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

import ko from 'knockout';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {User} from '../entity/User';
import {SearchRepository} from '../search/SearchRepository';
import {TeamRepository} from '../team/TeamRepository';
import {validateHandle} from '../user/UserHandleGenerator';

export enum UserlistMode {
  COMPACT = 'UserlistMode.COMPACT',
  DEFAULT = 'UserlistMode.DEFAULT',
  OTHERS = 'UserlistMode.OTHERS',
}

interface UserListParams {
  click: (userEntity: User, event: MouseEvent) => void;
  filter: ko.Observable<string>;
  selected: ko.ObservableArray<User>;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  conversationRepository: ConversationRepository;
  user: ko.Observable<User[]>;
  infos: Record<string, string>;
  highlightedUsers: () => User[];
  noUnderline: boolean;
  arrow: boolean;
  mode: UserlistMode;
}

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
  viewModel: function({
    click,
    filter,
    selected: selectedUsers,
    searchRepository,
    teamRepository,
    conversationRepository,
    user: userEntities,
    infos,
    highlightedUsers = () => [],
    noUnderline = false,
    arrow = false,
    mode = UserlistMode.DEFAULT,
  }: UserListParams): void {
    this.filter = filter;
    this.mode = mode;
    this.teamRepository = teamRepository;
    this.userEntities = userEntities;
    this.infos = infos;
    this.highlightedUserIds = highlightedUsers().map(user => user.id);
    this.isSelectEnabled = typeof selectedUsers === 'function';
    this.noUnderline = noUnderline;
    this.arrow = arrow;

    const isCompactMode = mode === UserlistMode.COMPACT;

    this.cssClasses = ko.pureComputed(() => (isCompactMode ? 'search-list-sm' : 'search-list-lg'));

    this.onUserClick = (userEntity: User, event: MouseEvent) => {
      if (this.isSelectEnabled) {
        if (this.isSelected(userEntity)) {
          selectedUsers.remove(userEntity);
        } else {
          selectedUsers.push(userEntity);
        }
      }
      if (typeof click === 'function') {
        click(userEntity, event);
      }
    };

    // Filter all list items if a filter is provided
    this.filteredUserEntities = ko.pureComputed(() => {
      const connectedUsers = conversationRepository.connectedUsers();
      let resultUsers = [];
      if (typeof filter === 'function') {
        const normalizedQuery = SearchRepository.normalizeQuery(filter());
        if (normalizedQuery) {
          const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
          const trimmedQuery = filter().trim();
          const isHandle = trimmedQuery.startsWith('@') && validateHandle(normalizedQuery);
          const properties = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;
          const searchResults = searchRepository.searchUserInSet(normalizedQuery, userEntities(), properties);
          resultUsers = searchResults.filter(user => {
            return (
              connectedUsers.includes(user) ||
              teamRepository.isSelfConnectedTo(user.id) ||
              user.username() === normalizedQuery
            );
          });
        }
      }
      resultUsers = userEntities().filter(user => {
        return connectedUsers.includes(user) || teamRepository.isSelfConnectedTo(user.id);
      });

      // make sure the self user is the first one in the list
      const selfUser = resultUsers.filter(user => user.is_me);
      const otherUsers = resultUsers.filter(user => !user.is_me);
      return selfUser.concat(otherUsers);
    });

    this.isSelected = (userEntity: User) => {
      if (this.isSelectEnabled) {
        return selectedUsers().includes(userEntity);
      }
      return false;
    };
  },
});
