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
import {MessageTimerUpdateMessage} from 'Repositories/entity/message/MessageTimerUpdateMessage';
import {ReceiptModeUpdateMessage} from 'Repositories/entity/message/ReceiptModeUpdateMessage';
import {RenameMessage} from 'Repositories/entity/message/RenameMessage';

import {SystemMessage} from './SystemMessage';

jest.mock('Components/Icon', () => ({
  EditIcon: () => {
    return <span data-uie-name="editicon" className="editicon"></span>;
  },
  ReadIcon: () => {
    return <span data-uie-name="readicon" className="readicon"></span>;
  },
  TimerIcon: () => {
    return <span data-uie-name="timericon" className="timericon"></span>;
  },
  __esModule: true,
}));

describe('SystemMessage', () => {
  it('shows edit icon for RenameMessage', async () => {
    const message = new RenameMessage('new name');

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('editicon')).not.toBeNull();
  });

  it('shows timer icon for MessageTimerUpdateMessage', async () => {
    const message = new MessageTimerUpdateMessage(0);

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('timericon')).not.toBeNull();
  });

  it('shows read icon for ReceiptModeUpdateMessage', async () => {
    const message = new ReceiptModeUpdateMessage(true);

    render(<SystemMessage message={message} />);

    expect(screen.queryByTestId('element-message-system')).not.toBeNull();
    expect(screen.queryByTestId('readicon')).not.toBeNull();
  });
});
