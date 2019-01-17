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

z.components.GuestModeToggle = class GuestModeToggle {
  constructor(params) {
    this.isChecked = params.isChecked;
    this.onToggle = params.onToggle;
    this.isDisabled = params.isDisabled;
    this.infoText = params.extendedInfo ? z.string.guestRoomToggleInfoExtended : z.string.guestRoomToggleInfo;
  }
};

ko.components.register('guest-mode-toggle', {
  template: `
    <div class="info-toggle__row">
      <div data-bind="text: z.string.guestRoomToggleName"></div>
      <div class="slider" data-bind="css: {'disabled': isDisabled}">
        <input class="slider-input" type="checkbox" name="toggle" id="toggle" data-bind="checked: isChecked">
        <label class="button-label" for="toggle" data-bind="click: onToggle, attr: {'data-uie-value': isChecked() ? 'checked': 'unchecked'}" data-uie-name="do-allow-guests" ></label>
      </div>
    </div>
    <div class="info-toggle__details" data-bind="text: infoText" data-uie-name="status-guest-toggle"></div>
  `,
  viewModel: z.components.GuestModeToggle,
});
