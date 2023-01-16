/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {renderHook} from '@testing-library/react';

import {Conversation} from 'src/script/entity/Conversation';
import {Message} from 'src/script/entity/message/Message';
import {createRandomUuid} from 'Util/uuid';

import {useReadReceiptSender} from './useReadReceipt';

describe('useReadReceipt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('batches the read receipt sending per conversation', async () => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => useReadReceiptSender({sendReadReceipt}));
    const conversation1 = new Conversation(createRandomUuid());
    const conversation2 = new Conversation(createRandomUuid());

    const sender = createRandomUuid();

    const firstBatch = [
      [conversation1, sender],
      [conversation1, sender],
      [conversation2, sender],
    ] as const;

    firstBatch.forEach(([conversation, sender]) => {
      const message = new Message(createRandomUuid());
      message.from = sender;
      result.current.addReadReceiptToBatch(conversation, message);
    });

    expect(sendReadReceipt).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(sendReadReceipt).toHaveBeenCalledTimes(2);

    result.current.addReadReceiptToBatch(conversation1, new Message(createRandomUuid()));
    expect(sendReadReceipt).toHaveBeenCalledTimes(2);
    jest.runAllTimers();
    expect(sendReadReceipt).toHaveBeenCalledTimes(3);
  });

  it('batches the read receipt sending per sender', async () => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => useReadReceiptSender({sendReadReceipt}));
    const conversation = new Conversation(createRandomUuid());

    const sender1 = createRandomUuid();
    const sender2 = createRandomUuid();

    const firstBatch = [
      [conversation, sender1],
      [conversation, sender1],
      [conversation, sender2],
      [conversation, sender2],
    ] as const;

    firstBatch.forEach(([conversation, sender]) => {
      const message = new Message(createRandomUuid());
      message.from = sender;
      result.current.addReadReceiptToBatch(conversation, message);
    });

    expect(sendReadReceipt).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(sendReadReceipt).toHaveBeenCalledTimes(2);
  });

  it('does not add the same message multiple times', async () => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => useReadReceiptSender({sendReadReceipt}));
    const conversation = new Conversation(createRandomUuid());

    const message = new Message(createRandomUuid());
    message.from = createRandomUuid();

    const firstBatch = [
      [conversation, message],
      [conversation, message],
      [conversation, message],
      [conversation, message],
    ] as const;

    firstBatch.forEach(([conversation, message]) => {
      result.current.addReadReceiptToBatch(conversation, message);
    });

    expect(sendReadReceipt).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(sendReadReceipt).toHaveBeenCalledTimes(1);
    expect(sendReadReceipt).toHaveBeenCalledWith(conversation, message, []);
  });
});
