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

ko.components.register('extended-action', {
  template: `
    <!-- ko if: firstAction -->
      <div class="panel__action-item" data-bind="click: firstAction.click, attr: {'data-uie-name': firstAction.uie}">
        <div data-bind="component: firstAction.icon" class="panel__action-item__icon"></div>
        <div class="panel__action-item__text" data-bind="text: firstAction.label"></div>
        <!-- ko if: contextActions.length -->
          <ellipsis-icon class="panel__action-item__context" data-bind="click: openContext" data-uie-name="do-open-extended-action-context"></ellipsis-icon>
        <!-- /ko -->
      </div>
    <!-- /ko -->
  `,
  viewModel: class {
    constructor({items = []}) {
      const actionItems = ko.unwrap(items);
      this.firstAction = actionItems[0];
      this.contextActions = actionItems.slice(1);
    }

    openContext(data, event) {
      z.ui.Context.from(event, this.contextActions, 'extended-action-menu');
    }
  },
});
