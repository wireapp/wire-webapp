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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {act, render, screen} from '@testing-library/react';

import enUS from 'src/i18n/en-US.json';
import {createMLSResetMessage} from 'Repositories/entity/message/mlsResetMessage';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {SystemMessage} from './systemMessage';

describe('SystemMessage MLS reset messages', () => {
  it('shows the resetting user and the recovery explanation as a system message', () => {
    const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 1_700_000_000_000});
    const message = createMLSResetMessage(key => enUS[key]);
    message.timestamp(wallClock.currentTimestampInMilliseconds);
    const user = new User('resetting-user-id', 'staging.zinfra.io', translateForTest);
    user.name('User X');
    message.user(user);

    render(<SystemMessage message={message} />);

    expect(screen.getByTestId('element-message-system')).toHaveTextContent(
      'User X was unable to decrypt some of your messages but has solved the issue. This affected all conversations you share together.',
    );
  });

  it('shows the success caption without a sender name once the resetting user resolves to self', () => {
    const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 1_700_000_000_000});
    const message = createMLSResetMessage(key => enUS[key]);
    message.timestamp(wallClock.currentTimestampInMilliseconds);
    render(<SystemMessage message={message} />);

    const user = new User('self-user-id', 'staging.zinfra.io', translateForTest);
    user.name('My Name');
    user.isMe = true;
    act(() => message.user(user));

    expect(screen.getByText('Session successfully reset')).toBeVisible();
    expect(screen.queryByText('My Name')).not.toBeInTheDocument();
    expect(screen.queryByText(/was unable to decrypt/)).not.toBeInTheDocument();
  });
});
