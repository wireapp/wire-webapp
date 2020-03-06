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

import {instantiateComponent} from '../../helper/knockoutHelpers';

import {Conversation} from 'src/script/entity/Conversation';
import 'src/script/components/receiptModeToggle';

describe('read-receipt-toggle', () => {
  it('renders the toggle according to the conversation read receipt mode', () => {
    const viewModel = {conversation: new Conversation()};
    return instantiateComponent('read-receipt-toggle', viewModel).then(domContainer => {
      const toggle = domContainer.querySelector('.slider-input');

      expect(toggle.checked).toBe(false);

      viewModel.conversation.receiptMode(1);

      expect(toggle.checked).toBe(true);
    });
  });

  it('updates the conversation receipt mode when toggle is clicked', () => {
    const viewModel = {conversation: new Conversation(), onReceiptModeChanged: () => {}};
    spyOn(viewModel, 'onReceiptModeChanged');

    return instantiateComponent('read-receipt-toggle', viewModel).then(domContainer => {
      const toggle = domContainer.querySelector('.slider-input');

      expect(toggle.checked).toBe(false);

      toggle.click();

      expect(toggle.checked).toBe(true);
      expect(viewModel.conversation.receiptMode()).toBe(1);
      expect(viewModel.onReceiptModeChanged).toHaveBeenCalledWith(viewModel.conversation, {receipt_mode: 1});

      toggle.click();

      expect(toggle.checked).toBe(false);
      expect(viewModel.conversation.receiptMode()).toBe(0);
      expect(viewModel.onReceiptModeChanged).toHaveBeenCalledWith(viewModel.conversation, {receipt_mode: 0});
    });
  });
});
