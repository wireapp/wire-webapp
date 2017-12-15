/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

z.components.UserListMode = {
  COMPACT: 'compact',
  DEFAULT: 'default',
  OTHERS: 'others',
};

z.components.UserListViewModel = class UserListViewModel {
  /**
   * Displays a list of user_ets
   *
   * @param {Object} params - Component parameters
   * @param {ko.observableArray} params.user - User data source
   * @param {ko.observable} params.filter - Filter list items
   * @param {Function} params.click - Called when a list item is selected
   * @param {Function} params.connect - Called when the connect button is clicked
   * @param {ko.observableArray} params.selected - Populated will all the selected items
   * @param {Function} params.selected_filter - Determines if the user can be selected
   */
  constructor(params) {
    // parameter list
    this.user_ets = params.user;
    this.user_click = params.click;
    this.user_connect = params.connect;
    this.user_filter = params.filter;
    this.user_selected = params.selected;
    this.user_selected_filter = params.selectable;
    this.mode = params.mode || z.components.UserListMode.DEFAULT;

    this.css_classes = ko.pureComputed(() => {
      if (this.mode === z.components.UserListMode.COMPACT) {
        return 'search-list-sm';
      }
      return 'search-list-lg';
    });

    this.show_buttons = () => {
      return this.user_connect !== undefined;
    };

    this.filtered_user_ets = this.user_ets;
    this.is_selected = () => false;
    this.is_selectable = () => true;

    this.on_select = (user_et, event) => {
      if (typeof this.user_click === 'function') {
        this.user_click(user_et, event);
      }
    };
    this.on_connect = (user_et, event) => {
      event.stopPropagation();
      if (typeof this.user_connect === 'function') {
        this.user_connect(user_et, event);
      }
    };

    // Filter all list items if a filter is provided
    if (this.user_filter) {
      this.filtered_user_ets = ko.pureComputed(() => {
        const normalized_query = z.search.SearchRepository.normalize_query(this.user_filter());
        return this.user_ets().filter(user_et => {
          const is_username = this.user_filter()
            .trim()
            .startsWith('@');

          return user_et.matches(normalized_query, is_username);
        });
      });
    }

    // check every list item before selection if selected_filter is provided
    if (this.user_selected_filter) {
      this.is_selectable = this.user_selected_filter;
    }

    // List will be selectable if select is provided
    if (this.user_selected) {
      this.on_select = user_et => {
        const is_selected = this.is_selected(user_et);
        if (is_selected) {
          this.user_selected.remove(user_et);
        } else if (this.is_selectable(user_et)) {
          this.user_selected.push(user_et);
        }

        if (typeof this.user_click === 'function') {
          this.user_click(user_et, !is_selected);
        }
      };

      this.is_selected = user_et => {
        return this.user_selected().includes(user_et);
      };
    }

    this.self = window.wire.app.repository.user.self;
  }
};

ko.components.register('user-list', {
  template: `
    <div class="search-list" data-bind="css: css_classes(), foreach: {data: filtered_user_ets}">
      <div class="search-list-item" data-bind="click: $parent.on_select, css: {'search-list-item-selected': $parent.is_selected($data)}, attr: {'data-uie-uid': $data.id, 'data-uie-value': $data.name(), 'data-uie-status': $data.connection().status()}" data-uie-name="item-user">
        <!-- ko if: $parent.mode === z.components.UserListMode.COMPACT -->
          <div class="search-list-item-image">
            <user-avatar class="user-avatar-md" params="user: $data, selected: $parent.is_selected($data)"></user-avatar>
            <!-- ko if: $data.is_guest() -->
              <div class="search-list-item-image-guest-indicator-badge" data-bind="l10n_text: z.string.conversation_guest_indicator" data-uie-name="status-guest"></div>
            <!-- /ko -->
          </div>
          <div class="search-list-item-content">
            <!-- ko if: $parent.self().is_team_member() -->
              <availability-state class="search-list-item-content-availability search-list-item-content-name"
                data-uie-name="status-availability-item"
                params="availability: availability, label: first_name"></availability-state>
            <!-- /ko -->
            <!-- ko ifnot: $parent.self().is_team_member() -->
              <div class="search-list-item-content-name" data-bind="text: first_name"></div>
            <!-- /ko -->
          </div>
        <!-- /ko -->
        <!-- ko ifnot: $parent.mode === z.components.UserListMode.COMPACT -->
          <div class="search-list-item-image">
            <user-avatar class="user-avatar-sm" params="user: $data, selected: $parent.is_selected($data)"></user-avatar>
            <div class="search-list-item-image-overlay">
              <div class="background"></div>
              <div class="checkmark icon-check"></div>
            </div>
          </div>
          <div class="search-list-item-content">
            <!-- ko if: $parent.self().is_team_member() -->
              <availability-state class="search-list-item-content-availability search-list-item-content-name"
                data-uie-name="status-availability"
                params="availability: availability, label: name"></availability-state>
            <!-- /ko -->
            <!-- ko ifnot: $parent.self().is_team_member() -->
              <div class="search-list-item-content-name" data-bind="text: name"></div>
            <!-- /ko -->
            <div class="search-list-item-content-info">
              <!-- ko if: $data.username() -->
                <span class="search-list-item-content-username label-username" data-bind="text: $data.username"></span>
              <!-- /ko -->
            </div>
          </div>
          <!-- ko if: $parent.mode !== z.components.UserListMode.OTHERS && $data.is_guest() -->
            <div class="search-list-item-guest-indicator" data-uie-name="status-guest">
              <div class="search-list-item-guest-indicator-badge" data-bind="l10n_text: z.string.conversation_guest_indicator"></div>
            </div>
          <!-- /ko -->
        <!-- /ko -->
      </div>
    </div>
    <!-- ko if: user_filter != null -->
      <!-- ko if: user_ets().length === 0 -->
        <div class="no-results" data-bind="l10n_text: z.string.people_everyone_participates"></div>
      <!-- /ko -->
      <!-- ko if: user_ets().length > 0 && filtered_user_ets().length === 0 -->
        <div class="no-results" data-bind="l10n_text: z.string.people_no_matches"></div>
      <!-- /ko -->
    <!-- /ko -->
  `,
  viewModel: z.components.UserListViewModel,
});
