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
 *
 */

import {act, fireEvent, renderHook} from '@testing-library/react';

import {translateForTest} from 'Util/test/translateForTest';

import {useFileHandling} from './useFileHandling';

describe('useFileHandling', () => {
  it('does not send a pasted file after upload permission is revoked, then allows it again', () => {
    const uploadDroppedFiles = jest.fn();
    const uploadImages = jest.fn();
    const {result, rerender} = renderHook(
      ({isFileUploadAllowed}) => {
        return useFileHandling({uploadDroppedFiles, uploadImages, isFileUploadAllowed, translate: translateForTest});
      },
      {initialProps: {isFileUploadAllowed: true}},
    );

    act(() => {
      fireEvent.paste(document, {
        clipboardData: {
          files: [new File(['image'], 'image.png', {type: 'image/png', lastModified: 1})],
          types: ['image/png'],
        },
      });
    });
    expect(result.current.pastedFile).not.toBeNull();

    rerender({isFileUploadAllowed: false});
    act(() => {
      result.current.sendPastedFile();
      fireEvent.keyDown(window, {key: 'Enter'});
    });
    expect(uploadDroppedFiles).not.toHaveBeenCalled();

    rerender({isFileUploadAllowed: true});
    act(() => {
      result.current.sendPastedFile();
    });
    expect(uploadDroppedFiles).toHaveBeenCalledTimes(1);
  });
});
