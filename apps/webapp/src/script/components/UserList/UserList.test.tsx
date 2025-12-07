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

import React from 'react';

import {fireEvent, render} from '@testing-library/react';
import {UserList} from 'Components/UserList/UserList';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';

import {TestFactory} from '../../../../test/helper/TestFactory';
import {withTheme} from '../../auth/util/test/TestUtil';

const testFactory = new TestFactory();
let conversationRepository: ConversationRepository;

beforeAll(() => {
  testFactory.exposeConversationActors().then(factory => {
    conversationRepository = factory;
    return conversationRepository;
  });
});

describe('UserList', () => {
  it('lists all selected users', () => {
    const user = new User('test-id');
    user.isMe = true;

    const users = ['1', '2', '3', '4'].map(id => new User(id));
    const props = {
      conversationRepository,
      onSelectUser: (user: User) => jest.fn(),
      selfUser: user,
      selectedUsers: users,
      users,
      isSelectable: true,
    };

    const {getByTestId} = render(withTheme(<UserList {...props} />));
    const selectedSearchList = getByTestId('selected-search-list');
    expect(selectedSearchList.getAttribute('data-uie-value')).toEqual('4');
  });

  it('select user', async () => {
    const user = new User('test-id');
    user.isMe = true;

    const setStateMock = jest.fn();
    const useStateMock: any = (useState: any) => [useState, setStateMock];
    jest.spyOn(React, 'useState').mockImplementation(useStateMock);

    const [selectedUsers, setSelectedUsers] = useStateMock([]);

    const mockOnSelectUser = jest.fn((user: User) => setSelectedUsers(user));

    const users = ['1', '2', '3', '4'].map(id => new User(id));
    const props = {
      conversationRepository,
      onSelectUser: mockOnSelectUser,
      selfUser: user,
      selectedUsers,
      users,
      isSelectable: true,
    };

    const {getAllByTestId} = render(withTheme(<UserList {...props} />));
    const contactsList = getAllByTestId('item-user');

    expect(contactsList).toHaveLength(4);
    fireEvent.click(contactsList[0]);
    expect(mockOnSelectUser).toHaveBeenCalledWith(users[0]);
  });
});
