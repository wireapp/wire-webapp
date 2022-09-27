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
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import InputBarControls from './InputBarControls';

const mockConfig = {
  ALLOWED_IMAGE_TYPES: ['image/gif', 'image/avif'],
  FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*']},
};

jest.mock('../../../Config', () => ({
  Config: {getConfig: () => mockConfig},
}));

type PropsType = React.ComponentProps<typeof InputBarControls>;
const defaultParams: PropsType = {
  conversation: undefined,
  input: '',

  onCancelEditing: jest.fn(),
  onClickGif: jest.fn(),
  onClickPing: jest.fn(),
  onSelectFiles: jest.fn(),
  onSelectImages: jest.fn(),
  onSend: jest.fn(),
};

const allButtonTitles = [
  'tooltipConversationPing',
  'tooltipConversationAddImage',
  'tooltipConversationFile',
  'extensionsBubbleButtonGif',
  'tooltipConversationSendMessage',
  'tooltipConversationPing',
];

describe('InputBarControls', () => {
  it.each<[Partial<PropsType>, string[]]>([
    [{disableFilesharing: true}, ['tooltipConversationSendMessage']],
    [{isEditing: true}, ['tooltipConversationSendMessage']],
  ])('renders the right buttons depending on props (%s)', (overrides, buttonTitles) => {
    const params = {...defaultParams, ...overrides};
    const {getByTitle, queryByTitle} = render(<InputBarControls {...params} />);
    // check that the relevant buttons are present
    buttonTitles.forEach(button => expect(getByTitle(button)).not.toBe(null));

    // check that the relevant buttons are hidden
    allButtonTitles
      .filter(button => !buttonTitles.includes(button))
      .forEach(button => expect(queryByTitle(button)).toBe(null));
  });

  it.each<[string, string[]]>([
    ['', allButtonTitles.filter(button => button != 'extensionsBubbleButtonGif')],
    ['hello', ['tooltipConversationSendMessage', 'extensionsBubbleButtonGif']],
  ])('Shows the right buttons depending on the input (input: %s)', (input, buttonTitles) => {
    const params = {...defaultParams, ...{input}};
    const {getByTitle, queryByTitle} = render(withTheme(<InputBarControls {...params} />));

    // check that the relevant buttons are present
    buttonTitles.forEach(button => expect(getByTitle(button)).not.toBe(null));

    // check that the relevant buttons are hidden
    allButtonTitles
      .filter(button => !buttonTitles.includes(button))
      .forEach(button => expect(queryByTitle(button)).toBe(null));
  });
});
