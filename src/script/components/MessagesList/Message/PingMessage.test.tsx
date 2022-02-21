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
import {PingMessage as PingMessageEntity} from 'src/script/entity/message/PingMessage';
import PingMessage, {PingMessageProps} from './PingMessage';

class PingMessagePage extends TestPage<PingMessageProps> {
  constructor(props?: PingMessageProps) {
    super(PingMessage, props);
  }

  getPingMessage = () => this.get('[data-uie-name="element-message-ping"]');
  getPingMessageText = () => this.get('[data-uie-name="element-message-ping-text"]');
}

const createPingMessage = (partialPingMessage: Partial<PingMessageEntity>) => {
  const callMessage: Partial<PingMessageEntity> = {
    caption: ko.pureComputed(() => ''),
    readReceipts: ko.observableArray([]),
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
    const pingMessagePage = new PingMessagePage({
      is1to1Conversation: false,
      isLastDeliveredMessage: false,
      message: createPingMessage({
        caption: ko.pureComputed(() => 'caption'),
        unsafeSenderName: ko.pureComputed(() => 'sender'),
      }),
    });

    expect(pingMessagePage.getPingMessage().exists()).toBe(true);
    expect(pingMessagePage.getPingMessageText().text()).toBe(`${sender}${caption}`);
  });
});
