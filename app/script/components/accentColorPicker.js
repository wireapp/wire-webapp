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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.AccentColorPicker = class AccentColorPicker {
  /**
   * Construct a audio seek bar that renders audio levels.
   *
   * @param {Object} params - Component parameters
   * @param {z.entity.User} params.user - User entity
   * @param {z.entity.File} params.asset - Asset file
   * @param {ko.observable} params.selected - Selected accent collor
   */
  constructor(params) {
    this.user = ko.unwrap(params.user);

    this.accent_color_ids = [1, 2, 4, 5, 6, 7];

    this.on_select = function(id) {
      params.selected(id);
      return true;
    };
  }
};

// Knockout registration of the accent color picker component.
ko.components.register('accent-color-picker', {
  template: `
    <!-- ko foreach: accent_color_ids -->
      <input type="radio" name="accent"
             data-bind="attr: {'id': 'accent' + $data, 'checked': $parent.user.accent_id() === $data}, click: $parent.on_select">
      <label data-bind="attr: {'for': 'accent' + $data},css: 'accent-color-' + $data"></label>
    <!-- /ko -->
  `,
  viewModel: z.components.AccentColorPicker,
});
