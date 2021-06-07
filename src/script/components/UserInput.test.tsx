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

import TestPage from 'Util/test/TestPage';
import UserInput, {UserInputProps} from 'Components/UserInput';
import ko from 'knockout';
import {User} from '../entity/User';

class UserInputPage extends TestPage<UserInputProps> {
  constructor(props?: UserInputProps) {
    super(UserInput, props);
  }

  getSelectedUsers = () => this.get('[data-uie-name="item-selected"]');
}

describe('UserInput', () => {
  it('lists all selected users', async () => {
    const userInputPage = new UserInputPage({
      enter: () => {},
      input: '',
      placeholder: '',
      selectedUsers: [new User('1'), new User('2'), new User('3'), new User('4')],
      setInput: ko.observable(''),
      setSelectedUsers: ko.observableArray([]),
    });

    expect(userInputPage.getSelectedUsers().length).toBe(4);
  });
});
