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
import {DeleteConversationMessage} from 'src/script/entity/message/DeleteConversationMessage';
import {MessageTimerUpdateMessage} from 'src/script/entity/message/MessageTimerUpdateMessage';
import {ReceiptModeUpdateMessage} from 'src/script/entity/message/ReceiptModeUpdateMessage';
import {RenameMessage} from 'src/script/entity/message/RenameMessage';
import {SystemMessageType} from 'src/script/message/SystemMessageType';
import TestPage from 'Util/test/TestPage';
import SystemMessage, {SystemMessageProps} from './SystemMessage';
import Icon from 'Components/Icon';

type SystemMessageUnion =
  | DeleteConversationMessage
  | MessageTimerUpdateMessage
  | ReceiptModeUpdateMessage
  | RenameMessage;

class SystemMessagePage extends TestPage<SystemMessageProps> {
  constructor(props?: SystemMessageProps) {
    super(SystemMessage, props);
  }

  getSystemMessage = () => this.get('[data-uie-name="element-message-system"]');
  getEditIcon = () => this.get(Icon.Edit);
  getTimerIcon = () => this.get(Icon.Timer);
  getReadIcon = () => this.get(Icon.Read);
}

const createSystemMessage = (partialSystemMessage: Partial<SystemMessageUnion>) => {
  const systemMessage: Partial<SystemMessageUnion> = {
    caption: ko.pureComputed(() => '') as any,
    timestamp: ko.observable(Date.now()),
    unsafeSenderName: ko.pureComputed(() => ''),
    ...partialSystemMessage,
  };
  return systemMessage as SystemMessageUnion;
};

describe('SystemMessage', () => {
  it('shows edit icon for RenameMessage', async () => {
    const systemMessagePage = new SystemMessagePage({
      message: createSystemMessage({
        system_message_type: SystemMessageType.CONVERSATION_RENAME,
      }),
    });

    expect(systemMessagePage.getSystemMessage().exists()).toBe(true);
    expect(systemMessagePage.getEditIcon().exists()).toBe(true);
  });

  it('shows timer icon for MessageTimerUpdateMessage', async () => {
    const systemMessagePage = new SystemMessagePage({
      message: createSystemMessage({
        system_message_type: SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE,
      }),
    });

    expect(systemMessagePage.getSystemMessage().exists()).toBe(true);
    expect(systemMessagePage.getTimerIcon().exists()).toBe(true);
  });

  it('shows read icon for ReceiptModeUpdateMessage', async () => {
    const systemMessagePage = new SystemMessagePage({
      message: createSystemMessage({
        system_message_type: SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE,
      }),
    });

    expect(systemMessagePage.getSystemMessage().exists()).toBe(true);
    expect(systemMessagePage.getReadIcon().exists()).toBe(true);
  });
});
