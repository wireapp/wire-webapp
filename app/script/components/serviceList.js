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
    this.services = params.services;
    this.onClick = params.click;
    this.mode = params.mode || ServiceList.MODE.DEFAULT;

    this.isCompactMode = this.mode === ServiceList.MODE.COMPACT;
    this.isDefaultMode = this.mode === ServiceList.MODE.DEFAULT;

    this.css_classes = ko.pureComputed(() => {
      if (this.isCompactMode) {
        return 'search-list-sm';
      }
      return 'search-list-lg';
    });
  }
};

ko.components.register('service-list', {
  template: `
    <div class="search-list" data-bind="css: css_classes(), foreach: services">
      <div class="search-list-item" data-uie-name="item-service" data-bind="click: $parent.onClick">
        <!-- ko if: $parent.isCompactMode -->
          <div class="search-list-item-image">
            <participant-avatar params="participant: $data, size: z.components.ParticipantAvatar.SIZE.MEDIUM"></participant-avatar>
          </div>
          <div class="search-list-item-content">
            <div class="search-list-item-content-name" data-bind="text: name"></div>
          </div>
        <!-- /ko -->
        <!-- ko ifnot: $parent.isCompactMode -->
          <div class="search-list-item-image">
            <participant-avatar params="participant: $data, size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
          </div>
          <div class="search-list-item-content">
            <div class="search-list-item-content-name" data-uie-name="status-content-name" data-bind="text: name"></div>
            <div class="search-list-item-content-info" data-uie-name="status-content-info">
              <span class="search-list-item-content-username" data-bind="text: summary"></span>
            </div>
          </div>
        <!-- /ko -->
      </div>
    </div>
    <!-- ko ifnot: services().length -->
      <div class="no-results" data-bind="l10n_text: z.string.people_no_matches"></div>
    <!-- /ko -->
  `,
  viewModel: z.components.ServiceList,
});
