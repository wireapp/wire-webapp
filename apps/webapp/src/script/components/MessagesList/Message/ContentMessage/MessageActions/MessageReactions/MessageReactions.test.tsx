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

import {render, act, fireEvent, waitFor} from '@testing-library/react';

import {t} from 'Util/LocalizerUtil';

import {MessageReactions, MessageReactionsProps} from './MessageReactions';

import {MessageActionsId} from '../MessageActions';

const thumbsUpEmoji = '👍';
const likeEmoji = '❤️';
const wrapperRef = React.createRef<HTMLDivElement>();
const defaultProps: MessageReactionsProps = {
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

  test('outside click should close the emoji picker', async () => {
    let currentMsgActionName = defaultProps.currentMsgActionName; // preserve initial value

    const MessageReactionsComponent = (props: MessageReactionsProps) => {
      return (
        <div ref={wrapperRef}>
          <MessageReactions {...props} />
        </div>
      );
    };
    const {getByLabelText, getByTestId, queryByTestId, rerender} = render(
      <MessageReactionsComponent {...defaultProps} />,
    );

    const emojiButton = getByLabelText(t('accessibility.messageActionsMenuEmoji'));

    act(() => {
      fireEvent.click(emojiButton);
      currentMsgActionName = MessageActionsId.EMOJI; // Update the value
      rerender(<MessageReactionsComponent {...defaultProps} currentMsgActionName={currentMsgActionName} />);
    });

    const emojiPickerDialogId = 'emoji-picker-dialog';
    await waitFor(() => {
      expect(getByTestId(emojiPickerDialogId)).toBeDefined();
    });

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
