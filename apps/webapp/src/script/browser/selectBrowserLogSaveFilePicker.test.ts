/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {Maybe} from 'true-myth';

import {selectBrowserLogSaveFilePicker, type BrowserLogSaveFilePicker} from './selectBrowserLogSaveFilePicker';

describe('browser log save picker capability', () => {
  it.each([undefined, null, false, {}, 'unsupported'])('rejects a non-callable picker capability: %p', picker => {
    const browserWindow = {showSaveFilePicker: picker as BrowserLogSaveFilePicker | undefined};
    const selectedPicker = selectBrowserLogSaveFilePicker({isElectron: false, browserWindow});

    expect(selectedPicker).toEqual(Maybe.nothing());
  });

  it('does not access the browser picker capability in Electron', () => {
    const readPickerCapability = jest.fn(() => {
      throw new Error('Electron must use native logging');
    });
    const browserWindow = {
      get showSaveFilePicker(): never {
        return readPickerCapability();
      },
    };
    const selectedPicker = selectBrowserLogSaveFilePicker({isElectron: true, browserWindow});

    expect(selectedPicker).toEqual(Maybe.nothing());
    expect(readPickerCapability).not.toHaveBeenCalled();
  });

  it('contains a throwing capability getter', () => {
    const browserWindow = {
      get showSaveFilePicker(): never {
        throw new Error('Picker access denied');
      },
    };
    const selectedPicker = selectBrowserLogSaveFilePicker({isElectron: false, browserWindow});

    expect(selectedPicker).toEqual(Maybe.nothing());
  });

  it('reads the picker capability once and preserves its receiver when called', async () => {
    let pickerPropertyReadCount = 0;
    let pickerReceiver: unknown;
    const browserWindow = {
      get showSaveFilePicker(): BrowserLogSaveFilePicker {
        pickerPropertyReadCount += 1;

        return async function showSaveFilePicker(this: unknown): Promise<FileSystemFileHandle> {
          pickerReceiver = this;

          throw new DOMException('Synthetic cancellation', 'AbortError');
        };
      },
    };
    const selectedPicker = selectBrowserLogSaveFilePicker({isElectron: false, browserWindow});
    const picker = selectedPicker.unwrapOrElse(() => {
      throw new Error('Expected the picker capability');
    });
    const pickerOptions: SaveFilePickerOptions = {
      suggestedName: 'wire-logs-2026-11-17-09-05Z.zip',
      types: [{description: 'ZIP archive', accept: {'application/zip': ['.zip']}}],
    };

    await expect(picker(pickerOptions)).rejects.toThrow('Synthetic cancellation');
    expect(pickerPropertyReadCount).toBe(1);
    expect(pickerReceiver).toBe(browserWindow);
  });
});
