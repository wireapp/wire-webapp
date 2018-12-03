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

import UUID from 'uuidjs';

z.components.InfoToggle = class InfoToggle {
  constructor(params) {
    this.dataUieNameInfoText = `status-info-toggle-${params.dataUieName}`;
    this.dataUieNameLabelText = `do-allow-${params.dataUieName}`;
    this.info = params.info;
    this.inputId = UUID.genV4();
    this.isChecked = params.isChecked;
    this.isDisabled = params.isDisabled;
    this.name = params.name;
  }
};

ko.components.register('info-toggle', {
  template: `
    <div class="guest-mode-toggle-row">
      <div data-bind="l10n_text: name"></div>
      <div class="slider" data-bind="css: {'disabled': isDisabled}">
        <input 
          class="slider-input" 
          data-bind="attr: { id: inputId, name: inputId }, checked: isChecked" 
          type="checkbox">
        <label class="button-label" data-bind="attr: { for: inputId, 'data-uie-value': isChecked() ? 'checked': 'unchecked', 'data-uie-name': dataUieNameLabelText }"></label>
      </div>
    </div>
    <div class="panel__info-text" data-bind="attr: {'data-uie-name': dataUieNameInfoText }, l10n_text: info"></div>
  `,
  viewModel: z.components.InfoToggle,
});
