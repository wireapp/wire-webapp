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

ko.components.register('read-receipt-toggle', {
  template: `
  <div class="panel__action-item">
    <read-icon class="panel__action-item__icon"></read-icon>
    <div class="panel__action-item__summary">
      <div class="panel__action-item__text" data-bind="l10n_text: z.string.receiptToggleLabel"></div>
    </div>
    <input class="slider-input" type="checkbox" name="preferences_device_verification_toggle" data-bind="checked: conversation.receiptMode, event: {change: updateValue}" id="receipt-toggle-input"></input>
    <label for="receipt-toggle-input" data-uie-name="do-toggle-receipt-mode" data-bind="attr: {'data-uie-receipt-status': conversation.receiptMode}"></label>
  </div>
  <div class="panel__info-text panel__info-text--margin" data-bind="l10n_text: z.string.receiptToggleInfo" data-uie-name="status-info-toggle-receipt-mode"></div>
  `,

  viewModel: function(params) {
    this.conversation = params.conversation();

    this.updateValue = (data, event) => {
      const intValue = event.target.checked ? 1 : 0;
      this.conversation.receiptMode(intValue);
      params.onReceiptModeChanged(this.conversation, intValue);
    };
  },
});
