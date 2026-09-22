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

import {getSharedDriveDroppedFiles} from './getSharedDriveDroppedFiles';

interface TestFileEntry {
  readonly isDirectory: false;
  readonly isFile: true;
  readonly name: string;
  readonly fullPath: string;
  readonly file: (success: (file: File) => void, failure?: (error?: DOMException) => void) => void;
}

interface TestDirectoryEntry {
  readonly isDirectory: true;
  readonly isFile: false;
  readonly name: string;
  readonly fullPath: string;
  readonly createReader: () => {
    readonly readEntries: (
      success: (entries: TestEntry[]) => void,
      failure?: (error?: DOMException) => void,
    ) => void;
  };
}

type TestEntry = TestFileEntry | TestDirectoryEntry;

const createFileEntry = (file: File, fullPath: string): TestFileEntry => ({
  isDirectory: false,
  isFile: true,
  name: file.name,
  fullPath,
  file: success => success(file),
});

const createDirectoryEntry = (name: string, fullPath: string, batches: TestEntry[][]): TestDirectoryEntry => ({
  isDirectory: true,
  isFile: false,
  name,
  fullPath,
  createReader: () => {
    let batchIndex = 0;
    return {
      readEntries: success => {
        const batch = batches[batchIndex] ?? [];
        batchIndex += 1;
        success(batch);
      },
    };
  },
});

const createDataTransfer = (entries: TestEntry[], fallbackFiles: File[] = []): DataTransfer =>
  ({
    files: fallbackFiles,
    items: entries.map(entry => ({webkitGetAsEntry: () => entry})),
  }) as unknown as DataTransfer;

describe('getSharedDriveDroppedFiles', () => {
  it('recursively expands a dropped folder and preserves each file relative path', async () => {
    const brief = new File(['brief'], 'brief.txt', {type: 'text/plain'});
    const logo = new File(['logo'], 'logo.png', {type: 'image/png'});
    const assets = createDirectoryEntry('Assets', '/Marketing/Assets', [
      [createFileEntry(logo, '/Marketing/Assets/logo.png')],
      [],
    ]);
    const marketing = createDirectoryEntry('Marketing', '/Marketing', [
      [createFileEntry(brief, '/Marketing/brief.txt')],
      [assets],
      [],
    ]);

    const result = await getSharedDriveDroppedFiles(createDataTransfer([marketing]));
    const files = result.unwrapOr([]);

    expect(files).toHaveLength(2);
    expect(files.map(file => file.webkitRelativePath)).toEqual([
      'Marketing/brief.txt',
      'Marketing/Assets/logo.png',
    ]);
    expect(files.map(file => file.name)).toEqual(['brief.txt', 'logo.png']);
  });

  it('falls back to the regular file list when directory entries are unavailable', async () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const dataTransfer = {files: [file], items: []} as unknown as DataTransfer;

    const result = await getSharedDriveDroppedFiles(dataTransfer);

    expect(result.unwrapOr([])).toEqual([file]);
  });

  it('uses the regular file list without reading ordinary file entries', async () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const fileEntry = createFileEntry(file, '/document.txt');
    const readFile = jest.fn(fileEntry.file);
    const dataTransfer = createDataTransfer([{...fileEntry, file: readFile}], [file]);

    const result = await getSharedDriveDroppedFiles(dataTransfer);

    expect(result.unwrapOr([])).toEqual([file]);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('fails the complete discovery when a file inside a folder cannot be read', async () => {
    const unreadableFile: TestFileEntry = {
      isDirectory: false,
      isFile: true,
      name: 'unreadable.txt',
      fullPath: '/Marketing/unreadable.txt',
      file: (_success, failure) => failure?.(new DOMException('File unavailable', 'NotFoundError')),
    };
    const marketing = createDirectoryEntry('Marketing', '/Marketing', [[unreadableFile], []]);

    const result = await getSharedDriveDroppedFiles(createDataTransfer([marketing]));

    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error.path).toBe('/Marketing/unreadable.txt');
    }
  });

  it('fails the complete discovery when a later directory batch cannot be read', async () => {
    const firstFile = new File(['content'], 'first.txt', {type: 'text/plain'});
    const directory: TestDirectoryEntry = {
      isDirectory: true,
      isFile: false,
      name: 'Marketing',
      fullPath: '/Marketing',
      createReader: () => {
        let readCount = 0;
        return {
          readEntries: (success, failure) => {
            readCount += 1;
            if (readCount === 1) {
              success([createFileEntry(firstFile, '/Marketing/first.txt')]);
              return;
            }

            failure?.(new DOMException('Directory unavailable', 'NotFoundError'));
          },
        };
      },
    };

    const result = await getSharedDriveDroppedFiles(createDataTransfer([directory]));

    expect(result.isErr).toBe(true);
    if (result.isErr) {
      expect(result.error.path).toBe('/Marketing');
    }
  });
});
