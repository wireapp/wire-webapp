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

const pngFile = new File(['(⌐□_□)'], 'chucknorris.png', {type: 'image/png'});

describe('AssetUploadButton', () => {
  it('Does call onSelectFiles with uploaded file', () => {
    const onSelectFiles = jest.fn();

    const {container} = render(<AssetUploadButton onSelectFiles={onSelectFiles} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: {files: [pngFile]},
    });

    expect(onSelectFiles).toHaveBeenCalledWith([pngFile]);
  });

  it('Does reset a form with input after upload', () => {
    const onSelectFiles = jest.fn();

    const {container} = render(<AssetUploadButton onSelectFiles={onSelectFiles} />);

    const form = container.querySelector('form');
    jest.spyOn(form!, 'reset');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, {
      target: {files: [pngFile]},
    });

    expect(onSelectFiles).toHaveBeenCalledWith([pngFile]);
    expect(fileInput.files?.[0].name).toEqual(pngFile.name);
    expect(form!.reset).toHaveBeenCalled();
  });
});
