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

import MentionSuggestionList from './MentionSuggestions';

import {render, fireEvent, screen} from '@testing-library/react';

import {User} from '../../../entity/User';
import {createRandomUuid} from 'Util/util';

//text field's id
const targetInputId = 'test';
const targetInputSelector = `#${targetInputId}`;

// mocked data
const first = generateUser('patryktest1', 'patryktest1');
const second = generateUser('patryktest2', 'patryktest2');
const third = generateUser('patrykjozwik', 'Patryk Jozwik');
const fourth = generateUser('patrykarjita', 'Patryk Arjita');
const sortedSuggestions = [first, second, third, fourth];
const suggestions = [third, first, fourth, second];

const onSelectionValidated = jest.fn();

beforeAll(() => {
  //component uses textArea element by accessing it via querySelector, we need to insert it to the DOM
  const input = document.createElement('textarea');
  input.id = targetInputId;
  document.body.appendChild(input);
  Element.prototype.scrollIntoView = jest.fn();
});

describe('MentionSuggestionList', () => {
  it("properly selects mentioned user when only array's order changes", async () => {
    const {rerender} = render(
      <MentionSuggestionList
        onSelectionValidated={onSelectionValidated}
        suggestions={sortedSuggestions}
        targetInputSelector={targetInputSelector}
      />,
    );

    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.keyDown(input, {code: 'Tab', key: 'Tab'});
    expect(onSelectionValidated).toHaveBeenCalledWith(first, input);

    //suggestions prop changed, component rerenders (
    rerender(
      <MentionSuggestionList
        onSelectionValidated={onSelectionValidated}
        suggestions={suggestions}
        targetInputSelector={targetInputSelector}
      />,
    );

    fireEvent.keyDown(input, {code: 'Tab', key: 'Tab'});
    expect(onSelectionValidated).toHaveBeenCalledWith(third, input);
  });
});

function generateUser(username: string, name: string) {
  const user = new User();
  user.username(username);
  user.name(name);
  user.id = createRandomUuid();
  return user;
}
