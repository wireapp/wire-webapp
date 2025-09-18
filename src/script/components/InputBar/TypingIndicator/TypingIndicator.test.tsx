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

import {render} from '@testing-library/react';
import {act} from 'react-dom/test-utils';

import {User} from 'Repositories/entity/User';

import {TypingIndicator, TypingIndicatorProps} from './TypingIndicator';
import {useTypingIndicatorState} from './useTypingIndicatorState/useTypingIndicatorState';

function createUser(id: string, name: string): User {
  const user = new User(id);
  user.name(name);
  return user;
}

describe('TypingIndicator', () => {
  afterEach(() => {
    act(() => {
      const {clearTypingUsers} = useTypingIndicatorState.getState();
      clearTypingUsers();
    });
  });

  it('does not render anything if there are no actively typing users', async () => {
    const props: TypingIndicatorProps = {
      conversationId: 'test-conversation-id',
    };

    const {container} = render(<TypingIndicator {...props} />);

    expect(container.innerHTML).toEqual('');
  });

  it('does render users when there are actively typing users', async () => {
    const props: TypingIndicatorProps = {
      conversationId: 'test-conversation-id',
    };

    const {addTypingUser} = useTypingIndicatorState.getState();

    addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-1', 'user1'), timerId: 0});
    addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-2', 'user2'), timerId: 0});
    addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-3', 'user3'), timerId: 0});

    const {getAllByTestId} = render(<TypingIndicator {...props} />);

    expect(getAllByTestId('element-avatar-user')).toHaveLength(3);
  });

  it('does render new users when there start typing', async () => {
    const props: TypingIndicatorProps = {
      conversationId: 'test-conversation-id',
    };

    const {container, getAllByTestId} = render(<TypingIndicator {...props} />);

    expect(container.innerHTML).toEqual('');

    const {addTypingUser} = useTypingIndicatorState.getState();

    act(() => {
      addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-1', 'u1'), timerId: 0});
      addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-2', 'u2'), timerId: 0});
      addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-3', 'u2'), timerId: 0});
    });

    expect(getAllByTestId('element-avatar-user')).toHaveLength(3);
  });

  it('does render less users when a user stops typing', async () => {
    const props: TypingIndicatorProps = {
      conversationId: 'test-conversation-id',
    };

    const {container, getAllByTestId} = render(<TypingIndicator {...props} />);

    expect(container.innerHTML).toEqual('');

    const {addTypingUser, removeTypingUser} = useTypingIndicatorState.getState();

    act(() => {
      addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-1', 'u1'), timerId: 0});
      addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-2', 'u2'), timerId: 0});
      addTypingUser({conversationId: 'test-conversation-id', user: createUser('test-id-3', 'u3'), timerId: 0});
    });

    expect(getAllByTestId('element-avatar-user')).toHaveLength(3);

    act(() => {
      removeTypingUser(new User('test-id-3'), 'test-conversation-id');
    });

    expect(getAllByTestId('element-avatar-user')).toHaveLength(2);
  });
});
