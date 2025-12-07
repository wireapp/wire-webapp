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

import {render, fireEvent} from '@testing-library/react';
import ko from 'knockout';
import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {ReadReceipt} from 'Repositories/storage';
import {formatTimeShort} from 'Util/TimeUtil';

import {ReadReceiptStatus} from './ReadReceiptStatus';

const createReadReceiptMessage = (partialReadReceiptStatus: Partial<MessageEntity>) => {
  const readReceiptMessage: Partial<MessageEntity> = {
    expectsReadConfirmation: true,
    readReceipts: ko.observableArray([] as ReadReceipt[]),
    ...partialReadReceiptStatus,
  };
  return readReceiptMessage as MessageEntity;
};

describe('ReadReceiptStatus', () => {
  it('shows the read icon', () => {
    const props = {
      isMessageFocused: true,
      is1to1Conversation: false,
      message: createReadReceiptMessage({
        readReceipts: ko.observableArray([{} as ReadReceipt]),
      }),
    };

    const {queryByTestId} = render(<ReadReceiptStatus {...props} />);

    expect(queryByTestId('status-message-read-receipts')).not.toBeNull();
    expect(queryByTestId('status-message-read-receipts')).not.toBeNull();
  });

  describe('1to1 conversation', () => {
    it('has no click handler', () => {
      const onClickDetailsSpy = jest.fn();
      const readReceiptTime = new Date().toISOString();
      const props = {
        isMessageFocused: true,
        is1to1Conversation: true,
        message: createReadReceiptMessage({
          readReceipts: ko.observableArray([{time: readReceiptTime} as ReadReceipt]),
        }),
        onClickDetails: onClickDetailsSpy,
      };

      const {getByTestId} = render(<ReadReceiptStatus {...props} />);

      const readReceiptStatus = getByTestId('status-message-read-receipts');
      fireEvent.click(readReceiptStatus);
      expect(onClickDetailsSpy).toHaveBeenCalledTimes(0);
    });

    it('shows timestamp instead of read count', () => {
      const readReceiptTime = new Date().toISOString();
      const props = {
        isMessageFocused: true,
        is1to1Conversation: true,
        message: createReadReceiptMessage({
          readReceipts: ko.observableArray([{time: readReceiptTime} as ReadReceipt]),
        }),
      };

      const {queryByTestId, queryByText} = render(<ReadReceiptStatus {...props} />);

      expect(queryByTestId('status-message-read-receipts')).not.toBeNull();
      expect(queryByText(formatTimeShort(readReceiptTime))).not.toBeNull();
    });
  });

  describe('group conversation', () => {
    it('shows read count', async () => {
      const props = {
        isMessageFocused: true,
        is1to1Conversation: false,
        message: createReadReceiptMessage({
          readReceipts: ko.observableArray([{} as ReadReceipt, {} as ReadReceipt]),
        }),
      };

      const {getByText, queryByTestId} = render(<ReadReceiptStatus {...props} />);

      expect(queryByTestId('status-message-read-receipts')).not.toBeNull();
      expect(getByText('2')).not.toBeNull();
    });
  });
});
