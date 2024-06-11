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

import {renderHook, act, fireEvent} from '@testing-library/react';

import {useFilePaste} from './useFilePaste';

describe('useFilePaste', () => {
  it('Calls the onFilePasted callback when a file is pasted', async () => {
    const onFilePasted = jest.fn();
    renderHook(() => useFilePaste(onFilePasted));
    const files = [new File([''], 'test.jpg', {type: 'image/jpeg'})];

    act(() => {
      fireEvent.paste(document, {clipboardData: {types: ['image/jpeg'], files}});
    });
    expect(onFilePasted).toHaveBeenCalledWith(files);
  });

  it('Ignores paste that are plain text', async () => {
    const onFilePasted = jest.fn();
    renderHook(() => useFilePaste(onFilePasted));

    act(() => {
      fireEvent.paste(document, {clipboardData: {types: ['text/plain']}});
    });
    expect(onFilePasted).not.toHaveBeenCalled();
  });
});
