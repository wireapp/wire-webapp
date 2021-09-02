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
import {DeleteMessage as DeleteMessageEntity} from 'src/script/entity/message/DeleteMessage';
import DeleteMessage, {DeleteMessageProps} from './DeleteMessage';
import {User} from 'src/script/entity/User';

class DeleteMessagePage extends TestPage<DeleteMessageProps> {
  constructor(props?: DeleteMessageProps) {
    super(DeleteMessage, props);
  }

  getDeleteMessage = () => this.get('[data-uie-name="element-message-delete"]');
  getDeleteMessageSenderName = () => this.get('[data-uie-name="element-message-delete-sender-name"]');
}

const createDeleteMessage = (partialDeleteMessage: Partial<DeleteMessageEntity>) => {
  const DeleteMessage: Partial<DeleteMessageEntity> = {
    deleted_timestamp: Date.now(),
    displayTimestampLong: () => '',
    displayTimestampShort: () => '',
    timestamp: ko.observable(Date.now()),
    unsafeSenderName: ko.pureComputed(() => ''),
    user: ko.observable(new User('userId', null)),
    ...partialDeleteMessage,
  };
  return DeleteMessage as DeleteMessageEntity;
};

describe('DeleteMessage', () => {
  it('shows sender name', async () => {
    const senderName = 'name';
    const deleteMessagePage = new DeleteMessagePage({
      message: createDeleteMessage({
        unsafeSenderName: ko.pureComputed(() => senderName),
      }),
      onClickAvatar: jest.fn(),
    });

    expect(deleteMessagePage.getDeleteMessage().exists()).toBe(true);
    expect(deleteMessagePage.getDeleteMessageSenderName().text()).toBe(senderName);
  });
});
