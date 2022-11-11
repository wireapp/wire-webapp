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

import {TypingIndicator, TypingIndicatorProps} from './TypingIndicator';
import {useTypingIndicatorState} from './TypingIndicator.state';

import {User} from '../../../entity/User';

describe('TypingIndicator', () => {
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

    addTypingUser({conversationId: 'test-conversation-id', user: new User('test-id-1')});
    addTypingUser({conversationId: 'test-conversation-id', user: new User('test-id-2')});
    addTypingUser({conversationId: 'test-conversation-id', user: new User('test-id-3')});

    const {container} = render(<TypingIndicator {...props} />);

    expect(container.querySelectorAll('[data-uie-name="element-avatar-user"]').length).toBe(3);
  });

  it('does render new users when there start typing', async () => {
    const props: TypingIndicatorProps = {
      conversationId: 'test-conversation-id',
    };

    const {container} = render(<TypingIndicator {...props} />);

    expect(container.innerHTML).toEqual('');

    const {addTypingUser} = useTypingIndicatorState.getState();

    act(() => {
      addTypingUser({conversationId: 'test-conversation-id', user: new User('test-id-1')});
      addTypingUser({conversationId: 'test-conversation-id', user: new User('test-id-2')});
      addTypingUser({conversationId: 'test-conversation-id', user: new User('test-id-3')});
    });

    expect(container.querySelectorAll('[data-uie-name="element-avatar-user"]').length).toBe(3);
  });
});
