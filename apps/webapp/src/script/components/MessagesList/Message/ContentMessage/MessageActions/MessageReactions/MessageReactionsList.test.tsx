/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {render, fireEvent, within} from '@testing-library/react';
import {User} from 'Repositories/entity/User';
import {ReactionMap} from 'Repositories/storage';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {generateQualifiedId} from 'test/helper/UserGenerator';

import {MessageReactionsList, MessageReactionsListProps} from './MessageReactionsList';

const user1 = new User();
const user2 = new User();
const user3 = new User();
const reactions: ReactionMap = [
  ['😇', [user1.qualifiedId, user2.qualifiedId, user3.qualifiedId]],
  ['😊', [user1.qualifiedId, user2.qualifiedId]],
  ['👍', [user2.qualifiedId]],
  ['😉', [user2.qualifiedId]],
];

const defaultProps: MessageReactionsListProps = {
  reactions: reactions,
  handleReactionClick: jest.fn(),
  onTooltipReactionCountClick: jest.fn(),
  isMessageFocused: false,
  onLastReactionKeyEvent: jest.fn(),
  isRemovedFromConversation: false,
  selfUserId: generateQualifiedId(),
  users: [user1, user2, user3],
};

describe('MessageReactionsList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders a button for each reaction and user count', () => {
    const {getAllByTitle} = render(withTheme(<MessageReactionsList {...defaultProps} />));

    const winkButton = getAllByTitle('wink');
    const smileyFace1 = getAllByTitle('innocent');
    const thumbsUpButton = getAllByTitle('+1');
    const smileyFace2 = getAllByTitle('blush');

    expect(smileyFace1).toHaveLength(1);
    expect(smileyFace2).toHaveLength(1);
    expect(winkButton).toHaveLength(1);
    expect(thumbsUpButton).toHaveLength(1);

    const smileyFaceCount = within(smileyFace1[0]).getByText('3');
    expect(smileyFaceCount).toBeDefined();

    const winkFaceCount = within(winkButton[0]).getByText('1');
    expect(winkFaceCount).toBeDefined();

    const thumbsUpButtonCount = within(winkButton[0]).getByText('1');
    expect(thumbsUpButtonCount).toBeDefined();

    const smileyFace2Count = within(winkButton[0]).getByText('1');
    expect(smileyFace2Count).toBeDefined();
  });

  test('handles click on reaction button', () => {
    const {getByTitle} = render(withTheme(<MessageReactionsList {...defaultProps} />));

    fireEvent.click(getByTitle('+1'));
    const {handleReactionClick} = defaultProps;
    expect(handleReactionClick).toHaveBeenCalled();
    expect(handleReactionClick).toHaveBeenCalledWith('👍');
  });
});
