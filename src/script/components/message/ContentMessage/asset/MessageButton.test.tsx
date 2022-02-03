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
import {CompositeMessage} from 'src/script/entity/message/CompositeMessage';
import TestPage from 'Util/test/TestPage';
import MessageButton, {MessageButtonProps} from './MessageButton';

class MessageButtonPage extends TestPage<MessageButtonProps> {
  constructor(props?: MessageButtonProps) {
    super(MessageButton, props);
  }

  getButtonWithId = (id: string) => this.get(`button[data-uie-uid="${id}"]`);
  getError = () => this.get('div[data-uie-name="message-button-error"]');
  getLoadingIcon = () => this.get('svg[data-uie-name="message-button-loading-icon"]');

  clickButtonWithId = (id: string) => this.click(this.getButtonWithId(id));
}

describe('MessageButton', () => {
  it('shows error message', async () => {
    const messageId = 'id';
    const messageError = 'error';
    const message: Partial<CompositeMessage> = {
      errorButtonId: ko.observable(messageId),
      errorMessage: ko.observable(messageError),
      selectedButtonId: ko.observable(''),
      waitingButtonId: ko.observable(''),
    };
    const messageButton = new MessageButtonPage({
      id: messageId,
      label: 'buttonLabel',
      message: message as CompositeMessage,
    });

    expect(messageButton.getError().exists()).toBe(true);
    expect(messageButton.getError().text()).toBe(messageError);
  });

  it('renders selected button', async () => {
    const messageId = 'id';
    const message: Partial<CompositeMessage> = {
      errorButtonId: ko.observable(''),
      errorMessage: ko.observable(''),
      selectedButtonId: ko.observable(messageId),
      waitingButtonId: ko.observable(''),
    };
    const messageButton = new MessageButtonPage({
      id: messageId,
      label: 'buttonLabel',
      message: message as CompositeMessage,
    });

    expect(messageButton.getError().exists()).toBe(false);
    expect((messageButton.getButtonWithId(messageId).props() as any)['data-uie-selected']).toBe(true);
  });
});
