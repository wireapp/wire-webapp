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
import ko from 'knockout';
import {PingMessage as PingMessageEntity} from 'Repositories/entity/message/PingMessage';
import {ReadReceipt} from 'Repositories/storage';

import {PingMessage} from './PingMessage';

const createPingMessage = (partialPingMessage: Partial<PingMessageEntity>) => {
  const callMessage: Partial<PingMessageEntity> = {
    caption: ko.pureComputed(() => ''),
    readReceipts: ko.observableArray([] as ReadReceipt[]),
    timestamp: ko.observable(Date.now()),
    unsafeSenderName: ko.pureComputed(() => ''),
    ...partialPingMessage,
  };
  return callMessage as PingMessageEntity;
};

describe('PingMessage', () => {
  it('shows sender name and caption', async () => {
    const caption = 'caption';
    const sender = 'sender';

    const props = {
      isMessageFocused: true,
      is1to1Conversation: false,
      isLastDeliveredMessage: false,
      onClickDetails: jest.fn(),
      message: createPingMessage({
        caption: ko.pureComputed(() => 'caption'),
        unsafeSenderName: ko.pureComputed(() => 'sender'),
      }),
    };

    const {queryByTestId, getByTestId} = render(<PingMessage {...props} />);

    expect(queryByTestId('element-message-ping')).not.toBeNull();
    expect(getByTestId('element-message-ping-text').textContent).toBe(`${sender}${caption}`);
  });
});
