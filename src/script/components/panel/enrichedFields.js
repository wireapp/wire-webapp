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

ko.components.register('enriched-fields', {
  template: `
    <!-- ko if: fields() -->
      <div class="enriched-fields">
        <!-- ko foreach: fields() -->
          <div class="enriched-fields__entry">
            <div data-bind="text: $data[0]" class="enriched-fields__entry__key"></div>
            <div data-bind="text: $data[1]" class="enriched-fields__entry__value"></div>
          </div>
        <!-- /ko -->
      </div>
    <!-- /ko -->
  `,
  viewModel: function({participant}) {
    this.fields = ko.pureComputed(
      () => participant().extendedFields() && Object.entries(participant().extendedFields())
    );
  },
});
