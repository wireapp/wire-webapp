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

import {DeliveredMessage} from './DeliveredMessage';

import {withTheme} from '../../../../auth/util/test/TestUtil';
import {ReadReceipt} from '../../../../storage';

describe('DeliveredMessage', () => {
  it('should render null if isLastDeliveredMessage is false', () => {
    const {queryByTestId} = render(withTheme(<DeliveredMessage isLastDeliveredMessage={false} />));
    expect(queryByTestId('status-message-read-receipt-delivered')).toBeNull();
  });

  it('should render null if readReceipts is not empty', () => {
    const readReceipts = [{time: '123', userId: 'userId-1'}] as ReadReceipt[];
    const {queryByTestId} = render(
      withTheme(<DeliveredMessage isLastDeliveredMessage={true} readReceipts={readReceipts} />),
    );
    expect(queryByTestId('status-message-read-receipt-delivered')).toBeNull();
  });

  it('should render the delivered message icon if isLastDeliveredMessage is true and readReceipts is empty', () => {
    const {queryByTestId} = render(withTheme(<DeliveredMessage isLastDeliveredMessage={true} readReceipts={[]} />));
    expect(queryByTestId('status-message-read-receipt-delivered')).not.toBeNull();
  });
});
