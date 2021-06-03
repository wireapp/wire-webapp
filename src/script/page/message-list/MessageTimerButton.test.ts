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
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import MessageTimerButton, {MessageTimerButtonProps} from './MessageTimerButton';
import type {Conversation} from '../../entity/Conversation';

class MessageTimerButtonPage extends TestPage<MessageTimerButtonProps> {
  constructor(props?: MessageTimerButtonProps) {
    super(MessageTimerButton, props);
  }

  getMessageTimerButton = () => this.get('.message-timer-button');
  getMessageTimerIcon = () => this.get('[data-uie-name="message-timer-icon"]');
  getMessageTimerButtonSymbol = () => this.get('.message-timer-button .message-timer-button-unit');
  getMessageTimerButtonValue = () => this.get('.message-timer-button .full-screen');
}

describe('MessageTimerButton', () => {
  it('shows the inactive message timer button', () => {
    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => 0),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
    });

    expect(messageTimerButtonPage.getMessageTimerButton().exists()).toBe(false);
    expect(messageTimerButtonPage.getMessageTimerIcon().exists()).toBe(true);
  });

  it('shows the active message timer button', () => {
    const minutes = 5;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => duration),
    };

    const messageTimerButtonPage = new MessageTimerButtonPage({
      conversation: conversation as Conversation,
    });

    expect(messageTimerButtonPage.getMessageTimerButton().exists()).toBe(true);
    expect(messageTimerButtonPage.getMessageTimerIcon().exists()).toBe(false);
    expect(messageTimerButtonPage.getMessageTimerButtonValue().text()).toBe(minutes.toString());
    expect(messageTimerButtonPage.getMessageTimerButtonSymbol().text()).toBe('m');
  });
});
