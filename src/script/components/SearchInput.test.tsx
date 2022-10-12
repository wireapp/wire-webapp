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

import ko from 'knockout';

import {SearchInput, SearchInputProps} from 'Components/SearchInput';
import {KEY} from 'Util/KeyboardUtil';
import {TestPage} from 'Util/test/TestPage';

import {User} from '../entity/User';

class SearchInputPage extends TestPage<SearchInputProps> {
  constructor(props?: SearchInputProps) {
    super(SearchInput, props);
  }

  getInput = () => this.get('[data-uie-name="enter-users"]');
  getSelectedUsers = () => this.getAll('[data-uie-name="item-selected"]');
  pressBackSpace = () => this.keyDown(this.getInput(), KEY.BACKSPACE);
}

describe('SearchInput', () => {
  it('lists all selected users', async () => {
    const userInputPage = new SearchInputPage({
      enter: () => {},
      input: '',
      placeholder: '',
      selectedUsers: [new User('1', null), new User('2', null), new User('3', null), new User('4', null)],
      setInput: ko.observable(''),
      setSelectedUsers: ko.observableArray([]),
    });

    expect(userInputPage.getSelectedUsers().length).toBe(4);
  });

  it('allows to deselect a user when pressing "backspace"', () => {
    const selectedUsers = ko.observableArray([
      new User('1', null),
      new User('2', null),
      new User('3', null),
      new User('4', null),
    ]);

    const props = {
      enter: () => {},
      input: '',
      placeholder: '',
      selectedUsers: ko.unwrap(selectedUsers),
      setInput: ko.observable(''),
      setSelectedUsers: selectedUsers,
    };

    const userInputPage = new SearchInputPage(props);
    expect(userInputPage.getSelectedUsers().length).toBe(4);

    userInputPage.pressBackSpace();
    userInputPage.setProps({
      ...props,
      selectedUsers: ko.unwrap(selectedUsers),
    });

    expect(userInputPage.getSelectedUsers().length).toBe(3);
  });
});
