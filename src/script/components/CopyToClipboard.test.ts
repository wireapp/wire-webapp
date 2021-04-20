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

import TestPage from 'Util/test/TestPage';
import CopyToClipboard, {CopyToClipboardProps} from './CopyToClipboard';

class CopyToClipboardPage extends TestPage<CopyToClipboardProps> {
  constructor(props?: CopyToClipboardProps) {
    super(CopyToClipboard, props);
  }

  getTextField = () => this.get('[data-uie-name="copy-to-clipboard"]');
}

describe('CopyToClipboard', () => {
  it('displays the given text', () => {
    const text = 'please copy this';
    const ClipboardPage = new CopyToClipboardPage({text});

    expect(ClipboardPage.getTextField().text()).toEqual(text);
  });

  it('selects the whole text when clicked', () => {
    const selectionMock = window.getSelection();
    selectionMock['removeAllRanges'] = jest.fn();
    selectionMock['addRange'] = jest.fn();
    window['getSelection'] = jest.fn(() => selectionMock);

    const text = 'please copy this';
    const ClipboardPage = new CopyToClipboardPage({text});
    const element = ClipboardPage.getTextField();
    ClipboardPage.click(element);

    expect(selectionMock['removeAllRanges']).toHaveBeenCalled();
    expect(selectionMock['addRange']).toHaveBeenCalled();
  });
});
