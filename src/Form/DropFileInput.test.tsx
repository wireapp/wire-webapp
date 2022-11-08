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

import {fireEvent, render} from '@testing-library/react';

import {DropFileInput, DropFileInputProps} from './DropFileInput';

import {StyledApp, THEME_ID} from '../Layout';
import {matchComponent} from '../test/testUtil';

//note: we don't have to test file type validation using native file upload,
// it won't allow to pick different type thant expected
interface GetDefaultPropsType {
  accept?: string;
  multiple?: boolean;
}

const getDefaultProps = ({accept, multiple}: GetDefaultPropsType) => ({
  accept,
  multiple,
  onInvalidFilesDropError: jest.fn(),
  onFilesUploaded: jest.fn(),
  headingText: 'Drag & Drop an image \nor',
  labelText: 'select one from your device',
  description: 'Image (JPG/PNG) size up to 1 MB, minimum 200 x 600 px',
});

const ThemedDropFileInput = (props: DropFileInputProps) => (
  <StyledApp themeId={THEME_ID.LIGHT}>
    <DropFileInput {...props} />
  </StyledApp>
);

const pngFile = new File(['(⌐□_□)'], 'chucknorris.png', {type: 'image/png'});
const jpegFile = new File(['(⌐□_□)'], 'chucknorris.jpg', {type: 'image/jpeg'});
const xlsxFile = new File(['(⌐□_□)'], 'chucknorris.xlsx', {type: '.xlsx'});

/* eslint-disable jest/expect-expect */

describe('"DropFileInput"', () => {
  it('matches snapshot', () =>
    matchComponent(<ThemedDropFileInput {...getDefaultProps({accept: 'image/png, image/jpeg'})} />));

  it('returns file on native file upload', () => {
    const props = getDefaultProps({});

    const {getByTestId} = render(<ThemedDropFileInput {...props} />);
    const fileInput = getByTestId('file-input');

    // i have to do this because `input.files =[file]` is not allowed
    Object.defineProperty(fileInput, 'files', {
      value: [pngFile],
    });
    fireEvent.change(fileInput);

    expect(props.onFilesUploaded).toHaveBeenCalledWith([pngFile]);
  });

  it('allows to upload different types of files when "accept" attribute not specified', () => {
    const props = getDefaultProps({});

    const {getByTestId} = render(<ThemedDropFileInput {...props} />);
    const dropZone = getByTestId('dropzone');

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [pngFile],
      },
    });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [xlsxFile],
      },
    });

    expect(props.onFilesUploaded).toHaveBeenCalledTimes(2);
  });

  it('allows to upload only file types specified in "accept" attribute', () => {
    const props = getDefaultProps({accept: 'image/png'});

    const {getByTestId} = render(<ThemedDropFileInput {...props} />);
    const dropZone = getByTestId('dropzone');

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [pngFile],
      },
    });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [jpegFile],
      },
    });

    expect(props.onFilesUploaded).toHaveBeenCalledTimes(1);
    expect(props.onInvalidFilesDropError).toHaveBeenCalled();
  });

  it('returns first file when "multiple" attribute not specified', () => {
    const props = getDefaultProps({
      accept: 'image/png, image/jpeg',
    });

    const {getByTestId} = render(<ThemedDropFileInput {...props} />);
    const dropZone = getByTestId('dropzone');

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [pngFile, jpegFile],
      },
    });

    expect(props.onFilesUploaded).toHaveBeenCalledWith([pngFile]);
  });

  it('returns all files when "multiple" attribute specified', () => {
    const props = getDefaultProps({
      accept: 'image/png, image/jpeg',
      multiple: true,
    });

    const {getByTestId} = render(<ThemedDropFileInput {...props} />);
    const dropZone = getByTestId('dropzone');

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [pngFile, jpegFile],
      },
    });

    expect(props.onFilesUploaded).toHaveBeenCalledWith([pngFile, jpegFile]);
  });
});
