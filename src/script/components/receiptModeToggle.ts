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
import {Confirmation} from '@wireapp/protocol-messaging';

import type {Conversation} from '../entity/Conversation';

interface ReceiptModeToggleParams {
  conversation: ko.Observable<Conversation>;
  onReceiptModeChanged: (conversation: Conversation, receiptMode: Confirmation.Type) => void;
}

class ReceiptModeToggle {
  conversation: Conversation;
  updateValue: (_data: unknown, _event: Event) => void;
  constructor(params: ReceiptModeToggleParams) {
    this.conversation = ko.unwrap(params.conversation);
    this.updateValue = (_data: unknown, event: Event) => {
      const receiptMode = (event.target as HTMLInputElement).checked
        ? Confirmation.Type.READ
        : Confirmation.Type.DELIVERED;
      this.conversation.receiptMode(receiptMode);
      params.onReceiptModeChanged(this.conversation, receiptMode);
    };
  }
}

ko.components.register('read-receipt-toggle', {
  template: `
  <div class="panel__action-item">
    <read-icon class="panel__action-item__icon"></read-icon>
    <div class="panel__action-item__summary">
      <div class="panel__action-item__text" data-bind="text: t('receiptToggleLabel')"></div>
    </div>
    <input class="slider-input" type="checkbox" name="preferences_device_verification_toggle" data-bind="checked: conversation.receiptMode, event: {change: updateValue}" id="receipt-toggle-input"></input>
    <label for="receipt-toggle-input" data-uie-name="do-toggle-receipt-mode" data-bind="attr: {'data-uie-receipt-status': conversation.receiptMode}"></label>
  </div>
  <div class="panel__info-text panel__info-text--margin" data-bind="text: t('receiptToggleInfo')" data-uie-name="status-info-toggle-receipt-mode"></div>
  `,

  viewModel: ReceiptModeToggle,
});
