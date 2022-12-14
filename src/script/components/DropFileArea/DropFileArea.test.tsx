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

import {DropFileArea} from './DropFileArea';

const getDefaultProps = () => ({
  onFileDropped: jest.fn(),
});

const pngFileName = 'chucknorris.png';
const pngFile = new File(['(⌐□_□)'], pngFileName, {type: 'image/png'});

const jpegFileName = 'eminem.jpg';
const jpegFile = new File(['(⌐□_□)'], jpegFileName, {type: 'image/jpeg'});

describe('DropFileArea', () => {
  it('triggers passed upload function after dropping a file', async () => {
    const props = getDefaultProps();

    const {getByTestId} = render(
      <DropFileArea data-uie-name="dropzone" {...props}>
        <p>drop file here</p>
      </DropFileArea>,
    );

    const dropZone = getByTestId('dropzone');

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [pngFile],
      },
    });

    //this is shallow comparison (we could pass any 2 files), that's why we are checking file names also
    expect(props.onFileDropped).toHaveBeenCalledWith([pngFile]);
    expect(props.onFileDropped.mock.calls[0][0][0].name).toEqual(pngFileName);
  });

  it('triggers passed upload function after dropping multiple files', async () => {
    const props = getDefaultProps();

    const {getByTestId} = render(
      <DropFileArea data-uie-name="dropzone" {...props}>
        <p>drop file here</p>
      </DropFileArea>,
    );

    const dropZone = getByTestId('dropzone');

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [pngFile, jpegFile],
      },
    });

    expect(props.onFileDropped).toHaveBeenCalledWith([pngFile, jpegFile]);

    expect(props.onFileDropped.mock.calls[0][0][0].name).toEqual(pngFileName);
    expect(props.onFileDropped.mock.calls[0][0][1].name).toEqual(jpegFileName);
  });
});
