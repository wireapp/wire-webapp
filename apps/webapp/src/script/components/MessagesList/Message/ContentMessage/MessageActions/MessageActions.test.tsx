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

import {render, fireEvent} from '@testing-library/react';
import ko from 'knockout';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {t} from 'Util/LocalizerUtil';
import {createUuid} from 'Util/uuid';

import {MessageActionsMenu, MessageActionsMenuProps} from './MessageActions';
const defaultProps: MessageActionsMenuProps = {
  isMsgWithHeader: true,
  message: new ContentMessage(createUuid()),
  contextMenu: {entries: ko.observable([{label: 'option1', text: 'option1'}])},
  isMessageFocused: true,
  handleActionMenuVisibility: jest.fn(),
  handleReactionClick: jest.fn(),
  reactionsTotalCount: 0,
  isRemovedFromConversation: false,
};

describe('MessageActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('renders the message actions menu', () => {
    const {getByLabelText} = render(<MessageActionsMenu {...defaultProps} />);
    const messageActionsMenu = getByLabelText(t('accessibility.messageActionsMenuLabel'));
    expect(messageActionsMenu).toBeDefined();
  });

  test('renders the message actions buttons', () => {
    const {getByLabelText} = render(<MessageActionsMenu {...defaultProps} />);
    const thumbsUpButton = getByLabelText(t('accessibility.messageActionsMenuThumbsUp'));
    const likeButton = getByLabelText(t('accessibility.messageActionsMenuLike'));
    const emojiButton = getByLabelText(t('accessibility.messageActionsMenuEmoji'));
    const optionsButton = getByLabelText(t('accessibility.conversationContextMenuOpenLabel'));
    expect(thumbsUpButton).toBeDefined();
    expect(likeButton).toBeDefined();
    expect(emojiButton).toBeDefined();
    expect(optionsButton).toBeDefined();
  });

  test('displays the context menu on options button click', () => {
    const {getByLabelText, getByText, queryByText} = render(<MessageActionsMenu {...defaultProps} />);
    const optionsButton = getByLabelText(t('accessibility.conversationContextMenuOpenLabel'));
    fireEvent.click(optionsButton);
    expect(getByText('option1')).toBeDefined();
    expect(queryByText('option2')).toBeNull();
  });

  test('keeps the message actions menu open when context menu is open', () => {
    const {getByLabelText, getByText} = render(<MessageActionsMenu {...defaultProps} />);
    const optionsButton = getByLabelText(t('accessibility.conversationContextMenuOpenLabel'));
    fireEvent.click(optionsButton);
    expect(getByText('option1')).toBeDefined();
  });

  test('toggles the active message action on click of any action button', () => {
    const {getByLabelText} = render(<MessageActionsMenu {...defaultProps} />);
    const thumbsUpButton = getByLabelText(t('accessibility.messageActionsMenuThumbsUp'));
    const likeButton = getByLabelText(t('accessibility.messageActionsMenuLike'));

    fireEvent.click(thumbsUpButton);
    expect(thumbsUpButton.getAttribute('aria-pressed')).toBe('true');
    expect(likeButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(likeButton);
    expect(thumbsUpButton.getAttribute('aria-pressed')).toBe('false');
    expect(likeButton.getAttribute('aria-pressed')).toBe('true');
  });
});
