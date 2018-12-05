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
  <div data-bind="text: conversation.receiptMode() ? 'yes' : 'no'"></div>
  <label><input type="checkbox" data-uie-name="do-toggle-receipt-mode" data-bind="checked: conversation.receiptMode, event: {change: updateValue}"> receipt mode</label>
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
