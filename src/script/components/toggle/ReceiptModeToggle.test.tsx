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

import {render} from '@testing-library/react';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';

import {ReceiptModeToggle} from './ReceiptModeToggle';

describe('ReceiptModeToggle', () => {
  it('checks the checkbox when receipts are turned on', () => {
    const props = {
      onReceiptModeChanged: () => {},
      receiptMode: RECEIPT_MODE.OFF,
    };

    const {getByTestId} = render(<ReceiptModeToggle {...props} />);

    const checkbox = getByTestId('toggle-receipt-mode-checkbox');
    expect(checkbox.getAttribute('checked')).toBe(null);
  });

  it('unchecks the checkbox when receipts are turned off', () => {
    const props = {
      onReceiptModeChanged: () => {},
      receiptMode: RECEIPT_MODE.ON,
    };

    const {getByTestId} = render(<ReceiptModeToggle {...props} />);

    const checkbox = getByTestId('toggle-receipt-mode-checkbox');
    expect(checkbox.getAttribute('checked')).toBe('');
  });
});
