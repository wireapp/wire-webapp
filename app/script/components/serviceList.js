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
    this.onClick = params.click;
  }
};

ko.components.register('service-list', {
  template: `
    <div class="search-list search-list-lg" data-bind="foreach: services">
      <div class="search-list-item" data-bind="click: $parent.onClick">
        <div class="search-list-item-image">
          <service-avatar class="service-avatar-sm" params="service: $data"></service-avatar>
        </div>
        <div class="search-list-item-content">
          <div class="search-list-item-content-name" data-bind="text: name"></div>
          <div class="search-list-item-content-info">
            <span class="search-list-item-content-username" data-bind="text: description"></span>
          </div>
        </div>
      </div>
    </div>
  `,
  viewModel: z.components.ServiceListViewModel,
});
