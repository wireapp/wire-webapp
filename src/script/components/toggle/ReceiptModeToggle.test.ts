/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {Confirmation} from '@wireapp/protocol-messaging';

import TestPage from 'Util/test/TestPage';

import ReceiptModeToggle, {ReceiptModeToggleProps} from './ReceiptModeToggle';

class ReceiptModeTogglePage extends TestPage<ReceiptModeToggleProps> {
  constructor(props?: ReceiptModeToggleProps) {
    super(ReceiptModeToggle, props);
  }

  getCheckbox = () => this.get('input[data-uie-name="toggle-receipt-mode-checkbox"]');
  checkCheckbox = () => this.changeValue(this.getCheckbox(), {checked: true});
  uncheckCheckbox = () => this.changeValue(this.getCheckbox(), {checked: false});
}

describe('ReceiptModeToggle', () => {
  it('checks the checkbox when receipts are turned on', () => {
    const receiptModeToggle = new ReceiptModeTogglePage({
      onReceiptModeChanged: () => {},
      receiptMode: Confirmation.Type.DELIVERED,
    });

    const checkBox = receiptModeToggle.getCheckbox();

    expect(checkBox.props().checked).toBe(false);
  });

  it('unchecks the checkbox when receipts are turned off', () => {
    const receiptModeToggle = new ReceiptModeTogglePage({
      onReceiptModeChanged: () => {},
      receiptMode: Confirmation.Type.READ,
    });

    const checkBox = receiptModeToggle.getCheckbox();

    expect(checkBox.props().checked).toBe(true);
  });
});
