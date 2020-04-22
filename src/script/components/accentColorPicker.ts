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
import {User} from '../entity/User';

interface AccentColorPickerParams {
  selected: (id: string) => void;
  user: ko.Observable<User>;
}

class AccentColorPicker {
  accentColorIds: number[];
  selected: (id: string) => void;
  user: User;

  constructor({user, selected}: AccentColorPickerParams) {
    this.selected = selected;
    this.user = ko.unwrap(user);

    this.accentColorIds = [1, 2, 4, 5, 6, 7];
  }

  onSelect = (id: string) => {
    this.selected(id);
    return true;
  };

  getId = (id: string): string => `accent${id}`;
  getClass = (id: string): string => `accent-color-${id}`;
}

// Knockout registration of the accent color picker component.
ko.components.register('accent-color-picker', {
  template: `
    <!-- ko foreach: {data: accentColorIds, as: 'id'} -->
      <input type="radio" name="accent"
             data-bind="attr: {id: $parent.getId(id), checked: $parent.user.accent_id() === id}, click: $parent.onSelect">
      <label data-bind="attr: {for: $parent.getId(id)}, css: $parent.getClass(id)"></label>
    <!-- /ko -->
  `,
  viewModel: AccentColorPicker,
});
