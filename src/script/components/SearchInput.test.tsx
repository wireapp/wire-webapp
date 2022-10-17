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

import {fireEvent, render} from '@testing-library/react';
import ko from 'knockout';

import {SearchInput} from 'Components/SearchInput';
import {KEY} from 'Util/KeyboardUtil';

import {User} from '../entity/User';

describe('SearchInput', () => {
  it('lists all selected users', async () => {
    const props = {
      enter: () => {},
      input: '',
      placeholder: '',
      selectedUsers: ['1', '2', '3', '4'].map(id => new User(id)),
      setInput: ko.observable(''),
      setSelectedUsers: ko.observableArray([]),
    };

    const {getAllByTestId} = render(<SearchInput {...props} />);

    expect(getAllByTestId('item-selected')).toHaveLength(4);
  });

  it('allows to deselect a user when pressing "backspace"', async () => {
    const selectedUsers = ko.observableArray(['1', '2', '3', '4'].map(id => new User(id)));

    const props = {
      enter: () => {},
      input: '',
      placeholder: '',
      selectedUsers: ko.unwrap(selectedUsers),
      setInput: ko.observable(''),
      setSelectedUsers: selectedUsers,
    };

    const {getByTestId, getAllByTestId, rerender} = render(<SearchInput {...props} />);

    expect(getAllByTestId('item-selected')).toHaveLength(4);

    const inputElement = getByTestId('enter-users');

    fireEvent.keyDown(inputElement, {code: KEY.BACKSPACE, key: KEY.BACKSPACE});

    props.selectedUsers = ko.unwrap(selectedUsers);
    rerender(<SearchInput {...props} />);

    expect(getAllByTestId('item-selected')).toHaveLength(3);
  });
});
