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

import {act, fireEvent, render, waitFor, within} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import {ReactionMap} from 'Repositories/storage';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {generateQualifiedId} from 'test/helper/UserGenerator';
import type {Translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {MessageReactionsList, MessageReactionsListProps} from './MessageReactionsList';

const user1 = new User('', '', translateForTest);
const user2 = new User('', '', translateForTest);
const user3 = new User('', '', translateForTest);
user1.name('User One');
user2.name('User Two');
user3.name('User Three');
const reactions: ReactionMap = [
  ['😇', [user1.qualifiedId, user2.qualifiedId, user3.qualifiedId]],
  ['😊', [user1.qualifiedId, user2.qualifiedId]],
  ['👍', [user2.qualifiedId]],
  ['😉', [user2.qualifiedId]],
];

const defaultProps: MessageReactionsListProps = {
  translate: translateForTest,
  reactions: reactions,
  handleReactionClick: jest.fn(),
  onTooltipReactionCountClick: jest.fn(),
  isMessageFocused: false,
  onLastReactionKeyEvent: jest.fn(),
  isRemovedFromConversation: false,
  selfUserId: generateQualifiedId(),
  users: [user1, user2, user3],
  loadUsersByIdsFromDb: jest.fn().mockResolvedValue([]),
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

  test('counts reactions from users who are no longer conversation members', () => {
    const departedUserId = generateQualifiedId();
    const reactionsWithDepartedUser: ReactionMap = [
      ['❤️', [user1.qualifiedId, user2.qualifiedId, user3.qualifiedId, departedUserId]],
    ];

    const {getByTitle} = render(
      withTheme(<MessageReactionsList {...defaultProps} reactions={reactionsWithDepartedUser} />),
    );

    expect(within(getByTitle('heart')).getByText('4')).toBeDefined();
  });

  test('loads missing reactor names from the local database when the tooltip is opened', async () => {
    const departedUser = new User('departed-user', 'test.wire.link', translateForTest);
    departedUser.name('Former Member');
    const loadUsersByIdsFromDb = jest.fn().mockResolvedValue([departedUser]);
    const translate: Translate = (identifier, substitutions): string => {
      if (identifier === 'conversationLikesCaptionPlural') {
        return `${substitutions?.firstUser}, ${substitutions?.secondUser}`;
      }

      return translateForTest(identifier);
    };
    const reactionsWithDepartedUser: ReactionMap = [['❤️', [departedUser.qualifiedId, user1.qualifiedId]]];

    const {getByTitle} = render(
      withTheme(
        <div id="wire-app">
          <MessageReactionsList
            {...defaultProps}
            translate={translate}
            reactions={reactionsWithDepartedUser}
            users={[user1]}
            loadUsersByIdsFromDb={loadUsersByIdsFromDb}
          />
        </div>,
      ),
    );

    expect(loadUsersByIdsFromDb).not.toHaveBeenCalled();
    fireEvent.focus(getByTitle('heart'));

    await waitFor(() => expect(loadUsersByIdsFromDb).toHaveBeenCalledWith([departedUser.qualifiedId]));
    await waitFor(() => expect(within(document.body).getByRole('tooltip')).toHaveTextContent('Former Member'));
  });

  test('loads only the first two missing reactor names in stored reaction order', async () => {
    const firstDepartedUser = new User('first-departed-user', 'test.wire.link', translateForTest);
    const secondDepartedUser = new User('second-departed-user', 'test.wire.link', translateForTest);
    const thirdDepartedUser = new User('third-departed-user', 'test.wire.link', translateForTest);
    firstDepartedUser.name('First Former Member');
    secondDepartedUser.name('Second Former Member');
    thirdDepartedUser.name('Third Former Member');
    const loadUsersByIdsFromDb = jest.fn().mockResolvedValue([secondDepartedUser, firstDepartedUser]);
    const translate: Translate = (identifier, substitutions): string => {
      if (identifier === 'conversationLikesCaptionPluralMoreThan2') {
        return String(substitutions?.userNames ?? '');
      }

      return translateForTest(identifier);
    };
    const reactionsWithThreeDepartedUsers: ReactionMap = [
      ['❤️', [secondDepartedUser.qualifiedId, firstDepartedUser.qualifiedId, thirdDepartedUser.qualifiedId]],
    ];

    const {getByTitle} = render(
      withTheme(
        <div id="wire-app">
          <MessageReactionsList
            {...defaultProps}
            translate={translate}
            reactions={reactionsWithThreeDepartedUsers}
            users={[]}
            loadUsersByIdsFromDb={loadUsersByIdsFromDb}
          />
        </div>,
      ),
    );

    fireEvent.mouseEnter(getByTitle('heart'));

    await waitFor(() =>
      expect(loadUsersByIdsFromDb).toHaveBeenCalledWith([
        secondDepartedUser.qualifiedId,
        firstDepartedUser.qualifiedId,
      ]),
    );
    await waitFor(() => {
      expect(within(document.body).getByRole('tooltip')).toHaveTextContent('Second Former Member, First Former Member');
    });
  });

  test('does not repeat a local lookup after successfully resolving tooltip names', async () => {
    const departedUser = new User('departed-user', 'test.wire.link', translateForTest);
    departedUser.name('Former Member');
    const loadUsersByIdsFromDb = jest.fn().mockResolvedValue([departedUser]);
    const reactionsWithDepartedUser: ReactionMap = [['❤️', [departedUser.qualifiedId]]];
    const {getByTitle} = render(
      withTheme(
        <div id="wire-app">
          <MessageReactionsList
            {...defaultProps}
            reactions={reactionsWithDepartedUser}
            users={[]}
            loadUsersByIdsFromDb={loadUsersByIdsFromDb}
          />
        </div>,
      ),
    );

    fireEvent.focus(getByTitle('heart'));
    fireEvent.mouseEnter(getByTitle('heart'));

    await waitFor(() => expect(loadUsersByIdsFromDb).toHaveBeenCalledTimes(1));
  });

  test('allows a later tooltip interaction to retry a failed local lookup', async () => {
    const departedUser = new User('departed-user', 'test.wire.link', translateForTest);
    departedUser.name('Former Member');
    let rejectFirstLookup: ((error: Error) => void) | undefined;
    const firstLookup = new Promise<User[]>((_, reject): void => {
      rejectFirstLookup = reject;
    });
    const loadUsersByIdsFromDb = jest.fn().mockReturnValueOnce(firstLookup).mockResolvedValueOnce([departedUser]);
    const translate: Translate = (identifier, substitutions): string => {
      if (identifier === 'conversationLikesCaptionSingular') {
        return String(substitutions?.userName ?? '');
      }

      return translateForTest(identifier);
    };
    const reactionsWithDepartedUser: ReactionMap = [['❤️', [departedUser.qualifiedId]]];
    const {getByTitle} = render(
      withTheme(
        <div id="wire-app">
          <MessageReactionsList
            {...defaultProps}
            translate={translate}
            reactions={reactionsWithDepartedUser}
            users={[]}
            loadUsersByIdsFromDb={loadUsersByIdsFromDb}
          />
        </div>,
      ),
    );

    fireEvent.focus(getByTitle('heart'));
    await waitFor(() => expect(loadUsersByIdsFromDb).toHaveBeenCalledTimes(1));

    const rejectLookup = rejectFirstLookup;
    if (typeof rejectLookup !== 'function') {
      throw new Error('The first lookup rejector was not initialized');
    }

    await act(async (): Promise<void> => {
      rejectLookup(new Error('IndexedDB unavailable'));
      try {
        await firstLookup;
      } catch {
        // The rejected lookup is expected; the component handles the failure.
      }
    });

    fireEvent.mouseEnter(getByTitle('heart'));

    await waitFor(() => expect(loadUsersByIdsFromDb).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(document.body).getByRole('tooltip')).toHaveTextContent('Former Member'));
  });

  test('handles click on reaction button', () => {
    const {getByTitle} = render(withTheme(<MessageReactionsList {...defaultProps} />));

    fireEvent.click(getByTitle('+1'));
    const {handleReactionClick} = defaultProps;
    expect(handleReactionClick).toHaveBeenCalled();
    expect(handleReactionClick).toHaveBeenCalledWith('👍');
  });
});
