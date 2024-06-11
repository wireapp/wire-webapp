/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {DeliveredIndicator} from './DeliveredIndicator';

describe('DeliveredIndicator', () => {
  it('should have displayName', () => {
    expect(DeliveredIndicator.displayName).toBe('DeliveredIndicator');
  });

  it('shows "delivered" when it is the last delivered message, no height provided', () => {
    const {getByTestId} = render(<DeliveredIndicator isLastDeliveredMessage />);

    expect(getByTestId('status-message-read-receipt-delivered')).toBeTruthy();
  });

  it('hides "delivered" when it is not the last delivered message, height provided', () => {
    const {queryByTestId} = render(<DeliveredIndicator isLastDeliveredMessage={false} />);

    expect(queryByTestId('status-message-read-receipt-delivered')).toBeNull();
  });
});
