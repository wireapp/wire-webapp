/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {JumpToLastMessageButton} from 'Components/MessagesList/JumpToLastMessageButton';

import {generateConversation} from '../../../../test/helper/ConversationGenerator';
import {withTheme} from '../../auth/util/test/TestUtil';

describe('JumpToLastMessageButton', () => {
  const conversation = generateConversation();

  it('visible when last message is not shown', () => {
    conversation.isLastMessageVisible(false);
    const {getByTestId} = render(
      withTheme(<JumpToLastMessageButton onGoToLastMessage={jest.fn()} conversation={conversation} />),
    );

    expect(getByTestId('jump-to-last-message-button')).toBeTruthy();
  });

  it('hidden when last message is shown', () => {
    conversation.isLastMessageVisible(true);
    const {queryByTestId} = render(
      withTheme(<JumpToLastMessageButton onGoToLastMessage={jest.fn()} conversation={conversation} />),
    );

    expect(queryByTestId('jump-to-last-message-button')).toBeNull();
  });
});
