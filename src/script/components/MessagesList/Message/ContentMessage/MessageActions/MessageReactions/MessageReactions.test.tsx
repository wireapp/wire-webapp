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

import React from 'react';

import {render, fireEvent, act} from '@testing-library/react';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {t} from 'Util/LocalizerUtil';

import {MessageReactions, MessageReactionsProps} from './MessageReactions';

const thumbsUpEmoji = '👍';
const likeEmoji = '❤️';
const wrapperRef = React.createRef<HTMLDivElement>();
const defaultProps: MessageReactionsProps = {
  message: new ContentMessage(),
  handleReactionClick: jest.fn(),
  messageFocusedTabIndex: 0,
  currentMsgActionName: '',
  toggleActiveMenu: jest.fn(),
  handleKeyDown: jest.fn(),
  handleCurrentMsgAction: jest.fn(),
  resetActionMenuStates: jest.fn(),
  wrapperRef: wrapperRef,
};
describe('MessageReactions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('outside click should close the emoji picker', () => {
    const {getByLabelText, getByTestId, queryByTestId} = render(
      <div ref={wrapperRef}>
        <MessageReactions {...defaultProps} />
      </div>,
    );

    const emojiButton = getByLabelText(t('accessibility.messageActionsMenuEmoji'));
    fireEvent.click(emojiButton);

    const emojiPickerDialogId = 'emoji-picker-dialog';
    expect(getByTestId(emojiPickerDialogId)).toBeDefined();

    act(() => {
      fireEvent.click(document);
    });

    expect(queryByTestId(emojiPickerDialogId)).toBeNull();
  });

  test('should call handleReactionClick on reaction click', () => {
    const {getByLabelText} = render(<MessageReactions {...defaultProps} />);

    const thumbsUpButton = getByLabelText(t('accessibility.messageActionsMenuThumbsUp'));
    const likeButton = getByLabelText(t('accessibility.messageActionsMenuLike'));

    fireEvent.click(thumbsUpButton);
    fireEvent.click(likeButton);

    expect(defaultProps.handleReactionClick).toHaveBeenCalledTimes(2);
    expect(defaultProps.handleReactionClick).toHaveBeenCalledWith(thumbsUpEmoji);
    expect(defaultProps.handleReactionClick).toHaveBeenCalledWith(likeEmoji);
  });
});
