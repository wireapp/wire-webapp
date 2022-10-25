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
import {AssetUploadButton} from './AssetUploadButton';

jest.mock('../../Config', () => ({
  Config: {
    getConfig: () => ({
      ALLOWED_IMAGE_TYPES: ['image/gif', 'image/avif'],
      FEATURE: {ALLOWED_FILE_UPLOAD_EXTENSIONS: ['*']},
    }),
  },
}));

const pngFile = new File(['(⌐□_□)'], 'chucknorris.png', {type: 'image/png'});

describe('AssetUploadButton', () => {
  it('Does call onSelectFiles with uploaded file', async () => {
    const onSelectFiles = jest.fn();

    const {getByTestId} = render(<AssetUploadButton onSelectFiles={onSelectFiles} />);

    const fileInput = getByTestId('conversation-input-bar-files') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {files: [pngFile]},
    });

    expect(onSelectFiles).toHaveBeenCalledWith([pngFile]);
  });

  it('Does reset file input after upload', async () => {
    const onSelectFiles = jest.fn();

    const {getByTestId} = render(<AssetUploadButton onSelectFiles={onSelectFiles} />);

    const getFileInput = () => getByTestId('conversation-input-bar-files') as HTMLInputElement;
    let fileInput = getFileInput();

    fireEvent.change(fileInput, {
      target: {files: [pngFile]},
    });

    expect(fileInput.files?.[0].name).toEqual(pngFile.name);
    expect(onSelectFiles).toHaveBeenCalledWith([pngFile]);

    //input did reset we grab new reference
    fileInput = getFileInput();
    expect(fileInput.files).toHaveLength(0);
  });
});
