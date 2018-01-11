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

z.components.ServiceListViewModel = class ServiceListViewModel {
  constructor(params) {
    this.services = params.services;
    this.onSelect = params.select;
  }
};

ko.components.register('service-list', {
  template: `
  <div class="search-list" data-bind="css: css_classes(), foreach: {data: services}">
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
  viewModel: z.components.ServiceListViewModel,
});
