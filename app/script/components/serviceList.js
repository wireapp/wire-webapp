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

z.components.ServiceList = class ServiceList {
  static get MODE() {
    return {
      COMPACT: 'ServiceList.MODE.COMPACT',
      DEFAULT: 'ServiceList.MODE.DEFAULT',
    };
  }

  constructor(params) {
    this.isSearching = params.isSearching || z.util.noop;
    this.mode = params.mode || ServiceList.MODE.DEFAULT;
    this.onClick = params.click;
    this.services = params.services;

    this.isCompactMode = this.mode === ServiceList.MODE.COMPACT;
    this.isDefaultMode = this.mode === ServiceList.MODE.DEFAULT;

    this.avatarSize = this.isCompactMode
      ? z.components.ParticipantAvatar.SIZE.LARGE
      : z.components.ParticipantAvatar.SIZE.SMALL;

    this.cssClasses = ko.pureComputed(() => (this.isCompactMode ? 'search-list-sm' : 'search-list-lg'));
  }
};

ko.components.register('service-list', {
  template: `
    <div class="search-list" data-bind="css: cssClasses(), foreach: services">
      <div class="search-list-item" data-uie-name="item-service" data-bind="click: $parent.onClick">
        <div class="search-list-item-image">
          <participant-avatar params="participant: $data, size: $parent.avatarSize"></participant-avatar>
        </div>
        <div class="search-list-item-content">
          <div class="search-list-item-content-name" data-bind="text: name" data-uie-name="status-content-name"></div>
          <!-- ko ifnot: $parent.isCompactMode -->
            <div class="search-list-item-content-info" data-uie-name="status-content-info">
              <span class="search-list-item-content-username" data-bind="text: summary"></span>
            </div>
          <!-- /ko -->
        </div>
      </div>
    </div>
    <!-- ko if: isSearching() && !services().length -->
      <div class="no-results" data-bind="l10n_text: z.string.peopleNoMatches"></div>
    <!-- /ko -->
  `,
  viewModel: z.components.ServiceList,
});
