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

import {readPreviewBlob} from './readPreviewBlob';

describe('readPreviewBlob', () => {
  it('returns the original bytes', async () => {
    const bytes = new Uint8Array([0, 127, 128, 255]);

    const buffer = await readPreviewBlob(new Blob([bytes]));

    expect(new Uint8Array(buffer)).toEqual(bytes);
  });

  it('rejects when the browser cannot read the blob', async () => {
    const read = jest.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function (this: FileReader) {
      this.dispatchEvent(new ProgressEvent('error'));
    });

    try {
      await expect(readPreviewBlob(new Blob(['unreadable']))).rejects.toThrow('Unable to read preview bytes');
    } finally {
      read.mockRestore();
    }
  });
});
