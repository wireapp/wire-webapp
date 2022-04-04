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

import ko from 'knockout';
import TestPage from 'Util/test/TestPage';
import Icon from 'Components/Icon';
import {Message as MessageEntity} from 'src/script/entity/message/Message';
import ReadReceiptStatus, {ReadReceiptStatusProps} from './ReadReceiptStatus';
import {ReadReceipt} from 'src/script/storage';
import {formatTimeShort} from 'Util/TimeUtil';

class ReadReceiptStatusPage extends TestPage<ReadReceiptStatusProps> {
  constructor(props?: ReadReceiptStatusProps) {
    super(ReadReceiptStatus, props);
  }

  getReadReceiptStatus = () => this.get('span[data-uie-name="status-message-read-receipts"]');
  getReadReceiptStatusCount = () => this.get('span[data-uie-name="status-message-read-receipt-count"]');
  getReadReceiptStatusDelivered = () => this.get('span[data-uie-name="status-message-read-receipt-delivered"]');
  getReadIcon = () => this.get(Icon.Read);

  clickReadReceiptStatus = () => this.click(this.getReadReceiptStatus());
}

const createReadReceiptMessage = (partialReadReceiptStatus: Partial<MessageEntity>) => {
  const readReceiptMessage: Partial<MessageEntity> = {
    expectsReadConfirmation: true,
    readReceipts: ko.observableArray([]),
    ...partialReadReceiptStatus,
  };
  return readReceiptMessage as MessageEntity;
};

describe('ReadReceiptStatus', () => {
  it('is not shown when message is not last delivered message', () => {
    const readReceiptStatusPage = new ReadReceiptStatusPage({
      is1to1Conversation: false,
      isLastDeliveredMessage: false,
      message: createReadReceiptMessage({
        readReceipts: ko.observableArray([]),
      }),
      onClickReceipts: jest.fn(),
    });

    expect(readReceiptStatusPage.getReadReceiptStatusDelivered().exists()).toBe(false);
  });

  it('shows "delivered" when noone read the message', () => {
    const readReceiptStatusPage = new ReadReceiptStatusPage({
      is1to1Conversation: false,
      isLastDeliveredMessage: true,
      message: createReadReceiptMessage({
        readReceipts: ko.observableArray([]),
      }),
      onClickReceipts: jest.fn(),
    });

    expect(readReceiptStatusPage.getReadReceiptStatusDelivered().exists()).toBe(true);
    expect(readReceiptStatusPage.getReadIcon().exists()).toBe(false);
  });

  it('shows the read icon', () => {
    const readReceiptStatusPage = new ReadReceiptStatusPage({
      is1to1Conversation: false,
      isLastDeliveredMessage: true,
      message: createReadReceiptMessage({
        readReceipts: ko.observableArray([{} as ReadReceipt]),
      }),
      onClickReceipts: jest.fn(),
    });

    expect(readReceiptStatusPage.getReadReceiptStatus().exists()).toBe(true);
    expect(readReceiptStatusPage.getReadIcon().exists()).toBe(true);
  });

  describe('1to1 conversation', () => {
    it('has no click handler', () => {
      const onClickReceiptsSpy = jest.fn();
      const readReceiptTime = new Date().toISOString();
      const readReceiptStatusPage = new ReadReceiptStatusPage({
        is1to1Conversation: true,
        isLastDeliveredMessage: true,
        message: createReadReceiptMessage({
          readReceipts: ko.observableArray([{time: readReceiptTime} as ReadReceipt]),
        }),
        onClickReceipts: onClickReceiptsSpy,
      });

      expect(readReceiptStatusPage.getReadReceiptStatus().exists()).toBe(true);

      readReceiptStatusPage.clickReadReceiptStatus();
      expect(onClickReceiptsSpy).toHaveBeenCalledTimes(0);
    });

    it('shows timestamp instead of read count', () => {
      const readReceiptTime = new Date().toISOString();
      const readReceiptStatusPage = new ReadReceiptStatusPage({
        is1to1Conversation: true,
        isLastDeliveredMessage: true,
        message: createReadReceiptMessage({
          readReceipts: ko.observableArray([{time: readReceiptTime} as ReadReceipt]),
        }),
      });

      expect(readReceiptStatusPage.getReadReceiptStatus().exists()).toBe(true);
      expect(readReceiptStatusPage.getReadReceiptStatusCount().exists()).toBe(true);
      expect(readReceiptStatusPage.getReadReceiptStatusCount().text()).toBe(formatTimeShort(readReceiptTime));
    });
  });

  describe('group conversation', () => {
    it('has a click handler', () => {
      const onClickReceiptsSpy = jest.fn();
      const readReceiptTime = new Date().toISOString();
      const readReceiptStatusPage = new ReadReceiptStatusPage({
        is1to1Conversation: false,
        isLastDeliveredMessage: true,
        message: createReadReceiptMessage({
          readReceipts: ko.observableArray([{time: readReceiptTime} as ReadReceipt]),
        }),
        onClickReceipts: onClickReceiptsSpy,
      });

      expect(readReceiptStatusPage.getReadReceiptStatus().exists()).toBe(true);

      readReceiptStatusPage.clickReadReceiptStatus();
      expect(onClickReceiptsSpy).toHaveBeenCalledTimes(1);
    });

    it('shows read count', async () => {
      const readReceiptStatusPage = new ReadReceiptStatusPage({
        is1to1Conversation: false,
        isLastDeliveredMessage: true,
        message: createReadReceiptMessage({
          readReceipts: ko.observableArray([{} as ReadReceipt, {} as ReadReceipt]),
        }),
        onClickReceipts: null,
      });

      expect(readReceiptStatusPage.getReadReceiptStatus().exists()).toBe(true);
      expect(readReceiptStatusPage.getReadReceiptStatusCount().exists()).toBe(true);
      expect(readReceiptStatusPage.getReadReceiptStatusCount().text()).toEqual('2');
    });
  });
});
