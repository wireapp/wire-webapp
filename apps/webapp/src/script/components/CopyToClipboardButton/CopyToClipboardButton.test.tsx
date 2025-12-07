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

import {render, waitFor, act} from '@testing-library/react';

import {CopyToClipboardButton} from './CopyToClipboardButton';

import {withTheme} from '../../auth/util/test/TestUtil';

jest.mock('Util/ClipboardUtil', () => ({
  copyText: jest.fn(),
}));

describe('CopyToClipboardButton', () => {
  const textToCopy = 'some text';
  const displayText = 'Copy to Clipboard';
  const copySuccessText = 'Copied!';
  const onCopySuccess = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders the button with the correct text', () => {
    const {getByText} = render(
      withTheme(
        <CopyToClipboardButton textToCopy={textToCopy} displayText={displayText} copySuccessText={copySuccessText} />,
      ),
    );
    expect(getByText(displayText)).toBeTruthy();
  });

  it('copies text to clipboard and displays success message', async () => {
    const {getByText} = render(
      withTheme(
        <CopyToClipboardButton
          textToCopy={textToCopy}
          displayText={displayText}
          copySuccessText={copySuccessText}
          onCopySuccess={onCopySuccess}
        />,
      ),
    );

    const button = getByText(displayText);

    act(() => {
      button.click();
    });

    await waitFor(() => {
      expect(onCopySuccess).toHaveBeenCalledTimes(1);
      expect(getByText(copySuccessText)).toBeTruthy();
    });
  });
});
