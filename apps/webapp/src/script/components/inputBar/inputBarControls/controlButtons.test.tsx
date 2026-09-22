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

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';

import {Conversation} from 'Repositories/entity/Conversation';
import {Config} from 'src/script/Config';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {withTheme} from 'src/script/auth/util/test/testUtil';

import {ControlButtons} from './controlButtons';

type PropsType = React.ComponentProps<typeof ControlButtons>;
const defaultParams: PropsType = {
  conversation: undefined as unknown as Conversation,
  input: '',
  onCancelEditing: jest.fn(),
  onClickPing: jest.fn(),
  onGifClick: jest.fn(),
  onSelectFiles: jest.fn(),
  onSelectImages: jest.fn(),
  showGiphyButton: true,
  showFormatButton: true,
  showEmojiButton: true,
  isFormatActive: true,
  isEmojiActive: true,
  onFormatClick: jest.fn(),
  onEmojiClick: jest.fn(),
  onCellImageUpload: jest.fn(),
  onCellAssetUpload: jest.fn(),
};

const allButtonTitles = [
  'tooltipConversationPing',
  'tooltipConversationAddImage',
  'tooltipConversationFile',
  'extensionsBubbleButtonGif',
];

const rootContextValue = createRootContextValueForTest({translate: translateForTest});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

describe('ControlButtons', () => {
  it.each<[Partial<PropsType>, string[]]>([
    [{disableFilesharing: true}, ['tooltipConversationPing']],
    [{isEditing: true}, []],
  ])('renders the right buttons depending on props (%s)', (overrides, buttonTitles) => {
    const params = {...defaultParams, ...overrides};
    const {getByTitle, queryByTitle} = render(withTheme(<ControlButtons {...params} />), {
      wrapper: rootProviderWrapper,
    });
    // check that the relevant buttons are present
    buttonTitles.forEach(button => expect(getByTitle(button)).not.toBe(null));

    // check that the relevant buttons are hidden
    allButtonTitles
      .filter(button => !buttonTitles.includes(button))
      .forEach(button => expect(queryByTitle(button)).toBe(null));
  });
  it.each(['', 'message'])('hides cells upload buttons when cells uploads are disallowed (input: %s)', input => {
    spyOn(Config, 'getConfig').and.returnValue({
      FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*'], ENABLE_CELLS: true},
    });
    const conversation = {cellsState: () => CONVERSATION_CELLS_STATE.READY} as Conversation;

    const {getByTitle, queryByTitle} = render(
      withTheme(
        <ControlButtons
          {...defaultParams}
          conversation={conversation}
          input={input}
          isCellsFeatureEnabled
          isCellsUploadAllowed={false}
        />,
      ),
      {wrapper: rootProviderWrapper},
    );

    if (input.length === 0) {
      expect(getByTitle('tooltipConversationPing')).not.toBe(null);
    }
    expect(queryByTitle('tooltipConversationAddImage')).toBe(null);
    expect(queryByTitle('tooltipConversationFile')).toBe(null);
  });

  const renderCellsControls = (cellsState: CONVERSATION_CELLS_STATE) => {
    spyOn(Config, 'getConfig').and.returnValue({
      FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*'], ENABLE_CELLS: true},
    });
    const conversation = {cellsState: () => cellsState} as Conversation;

    return render(
      withTheme(
        <ControlButtons
          {...defaultParams}
          conversation={conversation}
          input="message"
          isCellsFeatureEnabled
          isCellsUploadAllowed
        />,
      ),
      {wrapper: rootProviderWrapper},
    );
  };

  it('shows cells upload buttons when input has content in a cells conversation', () => {
    const {getByTitle} = renderCellsControls(CONVERSATION_CELLS_STATE.READY);

    expect(getByTitle('tooltipConversationAddImage')).toBeInTheDocument();
    expect(getByTitle('tooltipConversationFile')).toBeInTheDocument();
  });

  it('hides cells upload buttons when input has content outside a cells conversation', () => {
    const {queryByTitle} = renderCellsControls(CONVERSATION_CELLS_STATE.DISABLED);

    expect(queryByTitle('tooltipConversationAddImage')).not.toBeInTheDocument();
    expect(queryByTitle('tooltipConversationFile')).not.toBeInTheDocument();
  });

  it.each<[string, string[]]>([
    ['', allButtonTitles.filter(button => button != 'extensionsBubbleButtonGif')],
    ['hello', ['extensionsBubbleButtonGif']],
  ])('Shows the right buttons depending on the input (input: %s)', (input, buttonTitles) => {
    const params = {...defaultParams, ...{input}};
    const {getByTitle, queryByTitle} = render(withTheme(<ControlButtons {...params} />), {
      wrapper: rootProviderWrapper,
    });

    // check that the relevant buttons are present
    buttonTitles.forEach(button => expect(getByTitle(button)).not.toBe(null));

    // check that the relevant buttons are hidden
    allButtonTitles
      .filter(button => !buttonTitles.includes(button))
      .forEach(button => expect(queryByTitle(button)).toBe(null));
  });
});
