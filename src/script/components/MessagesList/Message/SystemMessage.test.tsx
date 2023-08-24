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

import {render, screen} from '@testing-library/react';
import ko from 'knockout';

import {DeleteConversationMessage} from 'src/script/entity/message/DeleteConversationMessage';
import {MessageTimerUpdateMessage} from 'src/script/entity/message/MessageTimerUpdateMessage';
import {ReceiptModeUpdateMessage} from 'src/script/entity/message/ReceiptModeUpdateMessage';
import {RenameMessage} from 'src/script/entity/message/RenameMessage';
import {SystemMessageIcon, SystemMessageType} from 'src/script/message/SystemMessageType';

import {SystemMessage} from './SystemMessage';

jest.mock('Components/Icon', () => ({
  Icon: {
    Edit: () => {
      return <span data-uie-name="editicon" className="editicon"></span>;
    },
    Read: () => {
      return <span data-uie-name="readicon" className="readicon"></span>;
    },
    Timer: () => {
      return <span data-uie-name="timericon" className="timericon"></span>;
    },
  },
  __esModule: true,
}));

type SystemMessageUnion =
  | DeleteConversationMessage
  | MessageTimerUpdateMessage
  | ReceiptModeUpdateMessage
  | RenameMessage;

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
    const message = createSystemMessage({
      system_message_type: SystemMessageType.CONVERSATION_RENAME,
      icon: SystemMessageIcon.EDIT,
    });

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('editicon')).not.toBeNull();
  });

  it('shows timer icon for MessageTimerUpdateMessage', async () => {
    const message = createSystemMessage({
      system_message_type: SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE,
      icon: SystemMessageIcon.TIMER,
    });

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('timericon')).not.toBeNull();
  });

  it('shows read icon for ReceiptModeUpdateMessage', async () => {
    const message = createSystemMessage({
      system_message_type: SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE,
      icon: SystemMessageIcon.READ,
    });

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('readicon')).not.toBeNull();
  });

  it('does not include message sender name by default', async () => {
    const senderName = 'Cool User';
    const message = createSystemMessage({
      system_message_type: SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE,
      icon: SystemMessageIcon.READ,
      unsafeSenderName: ko.pureComputed(() => senderName),
    });

    const {getByTestId, queryByText} = render(<SystemMessage message={message} />);

    expect(getByTestId('element-message-system')).not.toBeNull();
    expect(getByTestId('readicon')).not.toBeNull();
    expect(queryByText(senderName)).toBeNull();
  });

  it('includes message sender name with includeSenderName', async () => {
    const senderName = 'Cool User';
    const message = createSystemMessage({
      system_message_type: SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE,
      icon: SystemMessageIcon.READ,
      unsafeSenderName: ko.pureComputed(() => senderName),
      includeSenderName: true,
    });

    const {getByTestId, getByText} = render(<SystemMessage message={message} />);

    expect(getByTestId('element-message-system')).not.toBeNull();
    expect(getByTestId('readicon')).not.toBeNull();
    expect(getByText(senderName)).not.toBeNull();
  });

  it('renders extra info via children prop', async () => {
    const extraTextToRender = 'Hello, extra text!';

    const extraComponent = <p data-testid="extra-component">{extraTextToRender}</p>;

    const message = createSystemMessage({
      system_message_type: SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE,
      icon: SystemMessageIcon.READ,
    });

    const {getByText} = render(<SystemMessage message={message}>{extraComponent}</SystemMessage>);

    expect(getByText(extraTextToRender)).not.toBeNull();
  });
});
