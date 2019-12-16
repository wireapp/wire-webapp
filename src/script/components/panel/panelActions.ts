/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

interface ComponentParams {
  items?: ko.Observable<MenuItem[]>;
}

export interface MenuItem {
  click: () => void;
  icon: string;
  identifier: string;
  label: string;
}

ko.components.register('panel-actions', {
  template: `
    <!-- ko foreach: items -->
      <div class="panel__action-item" data-bind="click: click, attr: {'data-uie-name': identifier}">
        <div data-bind="component: icon" class="panel__action-item__icon"></div>
        <div class="panel__action-item__text" data-bind="text: label"></div>
      </div>
    <!-- /ko -->
  `,
  viewModel: class {
    readonly items: ko.Observable<MenuItem[]>;

    constructor(params: ComponentParams) {
      this.items = params.items || ko.observable([]);
    }
  },
});
