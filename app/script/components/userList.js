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
   */
  constructor(params) {
    this.click = params.click;
    this.filter = params.filter;
    this.selectedUsers = params.selected;
    this.mode = params.mode || UserList.MODE.DEFAULT;
    this.userEntities = params.user;
    this.isSelectEnabled = typeof params.selected === 'function';

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
      if (typeof this.filter === 'function') {
        const normalizedQuery = z.search.SearchRepository.normalizeQuery(this.filter());
        if (normalizedQuery) {
          const trimmedQuery = this.filter().trim();
          const isHandle = trimmedQuery.startsWith('@') && z.user.UserHandleGenerator.validate_handle(normalizedQuery);
          const excludedEmojis = Array.from(normalizedQuery).filter(char => EMOJI_UNICODE_RANGES.includes(char));
          return this.userEntities().filter(userEntity => {
            return userEntity.matches(normalizedQuery, isHandle, excludedEmojis);
          });
        }
      }
      return this.userEntities();
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
    <div class="search-list" data-bind="css: cssClasses(), foreach: {data: filteredUserEntities}">
      <div class="search-list-item" data-bind="click: $parent.onUserClick, attr: {'data-uie-uid': $data.id, 'data-uie-value': $data.name(), 'data-uie-status': $data.connection().status()}" data-uie-name="item-user">
        <!-- ko if: $parent.isCompactMode -->
          <div class="search-list-item-image">
            <participant-avatar params="participant: $data, selected: $parent.isSelected($data), size: z.components.ParticipantAvatar.SIZE.LARGE"></participant-avatar>
            <!-- ko if: $data.is_guest() -->
              <div class="search-list-item-image-guest-indicator-badge" data-bind="l10n_text: z.string.conversationGuestIndicator" data-uie-name="status-guest"></div>
            <!-- /ko -->
          </div>

          <div class="search-list-item-content">
            <!-- ko if: $parent.selfUser().is_team_member() -->
              <availability-state class="search-list-item-content-availability search-list-item-content-name"
                data-uie-name="status-availability-item"
                params="availability: availability, label: first_name"></availability-state>
            <!-- /ko -->

            <!-- ko ifnot: $parent.selfUser().is_team_member() -->
              <div class="search-list-item-content-name" data-bind="text: first_name"></div>
            <!-- /ko -->
          </div>
        <!-- /ko -->

        <!-- ko ifnot: $parent.isCompactMode -->
          <div class="search-list-item-image">
            <participant-avatar params="participant: $data, size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
            <div class="search-list-item-image-overlay">
              <div class="background"></div>
              <div class="checkmark icon-check"></div>
            </div>
          </div>

          <div class="search-list-item-content">
            <!-- ko if: $parent.selfUser().is_team_member() -->
              <availability-state class="search-list-item-content-availability search-list-item-content-name"
                data-uie-name="status-availability"
                params="availability: availability, label: name"></availability-state>
            <!-- /ko -->

            <!-- ko ifnot: $parent.selfUser().is_team_member() -->
              <div class="search-list-item-content-name" data-bind="text: name"></div>
            <!-- /ko -->
            <div class="search-list-item-content-info">
              <!-- ko if: $data.username() -->
                <span class="search-list-item-content-username label-username label-username-notext" data-bind="text: $data.username"></span>
              <!-- /ko -->
            </div>
          </div>

          <!-- ko if: !$parent.isOthersMode && $data.is_guest() -->
            <div class="search-list-item-guest-indicator" data-uie-name="status-guest">
              <div class="search-list-item-guest-indicator-badge" data-bind="l10n_text: z.string.conversationGuestIndicator"></div>
            </div>
          <!-- /ko -->
          <!-- ko if: $parent.isSelectEnabled -->
            <div class="search-list-item-select icon-check" data-bind="css: {'selected': $parent.isSelected($data)}" data-uie-name="status-selected"></div>
          <!-- /ko -->
        <!-- /ko -->
      </div>
    </div>

    <!-- ko if: typeof filter === 'function' -->
      <!-- ko if: userEntities().length === 0 -->
        <div class="no-results" data-bind="l10n_text: z.string.peopleEveryoneParticipates"></div>
      <!-- /ko -->

      <!-- ko if: userEntities().length > 0 && filteredUserEntities().length === 0 -->
        <div class="no-results" data-bind="l10n_text: z.string.peopleNoMatches" data-uie-name="status-no-matches"></div>
      <!-- /ko -->
    <!-- /ko -->
  `,
  viewModel: z.components.UserList,
});
