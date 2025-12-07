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

import {TextMessageRenderer} from './TextMessageRenderer';

describe('TextMessageRenderer', () => {
  it('renders a text message', () => {
    const onClickElement = jest.fn();
    const txtMsg = 'simple message';
    const {getByText} = render(<TextMessageRenderer text={txtMsg} onMessageClick={onClickElement} isFocusable />);
    const txtMsgElement = getByText(txtMsg);
    expect(txtMsgElement).not.toBe(null);

    txtMsgElement.focus();
    fireEvent.keyDown(txtMsgElement);

    // plain text message is not interactive
    expect(onClickElement).not.toHaveBeenCalled();
  });

  it('renders and trigger click/keydown event of mention message correcly', () => {
    const onClickElement = jest.fn();
    const text = `<div class="message-mention" role="buttton" data-uie-name="label-other-mention" data-user-id="1fc1e32d-084b-49be-a392-85377f7208f3" data-user-domain="staging.zinfra.io"><span class="mention-at-sign">@</span>jj</div> yes it is`;
    const {getByTestId} = render(<TextMessageRenderer text={text} onMessageClick={onClickElement} isFocusable />);
    const mention = getByTestId('label-other-mention');
    fireEvent.click(mention);
    expect(onClickElement).toHaveBeenCalled();

    fireEvent.keyDown(mention);
    expect(onClickElement).toHaveBeenCalled();
  });

  it('renders a link message and should trigger click/keydown event', () => {
    const onClickElement = jest.fn();

    const linkTxt = 'this is a link';
    const text = `<a href="https://link.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">${linkTxt}</a>`;

    const {getByText} = render(<TextMessageRenderer text={text} onMessageClick={onClickElement} isFocusable />);
    const linkElem = getByText(linkTxt);
    expect(linkElem).not.toBe(null);

    fireEvent.click(linkElem);
    expect(onClickElement).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(linkElem, {key: 'Enter'});
    expect(onClickElement).toHaveBeenCalledTimes(2);
  });

  it('should not trigger a key event if the message is not focused', () => {
    const onClickElement = jest.fn();

    const linkTxt = 'this is a link';
    const text = `<a href="https://link.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">${linkTxt}</a>`;

    const {getByText} = render(<TextMessageRenderer text={text} onMessageClick={onClickElement} isFocusable={false} />);
    const linkElem = getByText(linkTxt);
    expect(linkElem).not.toBe(null);

    fireEvent.keyDown(linkElem);
    expect(onClickElement).not.toHaveBeenCalled();
  });

  it('collapses long text when asked to', () => {
    const onClickElement = jest.fn();

    const text = 'this is a link<br>multiline text';

    Object.defineProperty(HTMLParagraphElement.prototype, 'clientHeight', {get: () => 100});
    Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {get: () => 200});

    const {getByText} = render(
      <TextMessageRenderer text={text} onMessageClick={onClickElement} isFocusable={false} collapse />,
    );
    const showMoreButton = getByText('replyQuoteShowMore');
    expect(showMoreButton).not.toBe(null);

    fireEvent.click(showMoreButton);
    const showLessButton = getByText('replyQuoteShowLess');
    expect(showLessButton).not.toBe(null);
  });
});
