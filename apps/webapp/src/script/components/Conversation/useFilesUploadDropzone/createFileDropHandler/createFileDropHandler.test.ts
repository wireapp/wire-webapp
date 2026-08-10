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

import {createFileDropHandler} from './createFileDropHandler';

const file = new File(['content'], 'document.txt', {type: 'text/plain'});

describe('createFileDropHandler', () => {
  it('processes dropped files when uploads are allowed', () => {
    const onFileDrop = jest.fn();
    const handleFileDrop = createFileDropHandler({isFileDropAllowed: true, onFileDrop});

    handleFileDrop([file], []);

    expect(onFileDrop).toHaveBeenCalledWith([file], []);
  });

  it('ignores dropped files when uploads are restricted', () => {
    const onFileDrop = jest.fn();
    const handleFileDrop = createFileDropHandler({isFileDropAllowed: false, onFileDrop});

    handleFileDrop([file], []);

    expect(onFileDrop).not.toHaveBeenCalled();
  });
});
