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

import {render, fireEvent} from '@testing-library/react';

import {CopyToClipboard} from './CopyToClipboard';

const selectionMock = window.getSelection() || ({} as Selection);
selectionMock.removeAllRanges = jest.fn();
selectionMock.addRange = jest.fn();
window.getSelection = jest.fn(() => selectionMock);

describe('CopyToClipboard', () => {
  it('displays the given text', () => {
    const text = 'please copy this';

    const {getByText} = render(<CopyToClipboard text={text} />);

    expect(getByText(text)).not.toBeNull();
  });

  it('selects the whole text when clicked', () => {
    const text = 'please copy this';

    const {getByTestId} = render(<CopyToClipboard text={text} />);

    const textField = getByTestId('copy-to-clipboard');

    fireEvent.click(textField);

    expect(selectionMock.removeAllRanges).toHaveBeenCalled();
    expect(selectionMock.addRange).toHaveBeenCalled();
  });
});
