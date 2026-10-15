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

import {validateFiles} from './fileValidation';

const translate = (key: string) => {
  return key;
};

describe('validateFiles', () => {
  it.each(['.hidden.png', 'file/with-slash.png', 'file\\with-slash.png', 'file"name.png'])(
    'rejects an invalid file name: %s',
    fileName => {
      const file = new File(['content'], fileName);

      expect(
        validateFiles({
          newFiles: [file],
          currentFiles: [],
          maxSize: 1024,
          maxFiles: 10,
          translate,
        }),
      ).toEqual({
        isValid: false,
        error: {
          title: 'conversationFileUploadFailedHeading',
          message: 'cells.nodeName.invalidCharactersError',
        },
        invalidFiles: [file],
      });
    },
  );

  it('rejects an invalid segment in a folder upload path', () => {
    const file = new File(['content'], 'document.txt');
    Object.defineProperty(file, 'webkitRelativePath', {value: 'Reports/.private/document.txt'});

    expect(
      validateFiles({
        newFiles: [file],
        currentFiles: [],
        maxSize: 1024,
        maxFiles: 10,
        translate,
      }),
    ).toEqual(
      expect.objectContaining({
        isValid: false,
        invalidFiles: [file],
      }),
    );
  });

  it('accepts a valid file and relative folder path', () => {
    const file = new File(['content'], 'document.txt');
    Object.defineProperty(file, 'webkitRelativePath', {value: 'Reports/2026/document.txt'});

    expect(
      validateFiles({
        newFiles: [file],
        currentFiles: [],
        maxSize: 1024,
        maxFiles: 10,
        translate,
      }),
    ).toEqual({isValid: true});
  });
});
