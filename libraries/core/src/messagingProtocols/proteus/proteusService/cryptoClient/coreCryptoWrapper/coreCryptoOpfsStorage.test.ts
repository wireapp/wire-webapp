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

import {result} from 'true-myth';

import {
  getCoreCryptoDatabaseFileNames,
  OpfsDirectoryHandle,
  removeCoreCryptoDatabaseFiles,
} from './coreCryptoOpfsStorage';

// File names CoreCrypto 11.0.0-pre.2 created in Chromium for a database opened at `corecrypto-flat`.
const observedDatabaseFileName = 'f-636f726563727970746f2d666c6174';
const observedWriteAheadLogFileName = 'f-636f726563727970746f2d666c61742d77616c';

const notFoundError = (): DOMException => {
  return new DOMException('not found', 'NotFoundError');
};

type FakeOpfs = {
  readonly root: OpfsDirectoryHandle;
  readonly files: Set<string>;
};

function createFakeOpfs({
  files,
  hasCoreCryptoDirectory = true,
  lockedFiles = [],
}: {
  files: string[];
  hasCoreCryptoDirectory?: boolean;
  lockedFiles?: string[];
}): FakeOpfs {
  const storedFiles = new Set(files);
  const coreCryptoDirectory: OpfsDirectoryHandle = {
    getDirectoryHandle: async () => {
      throw notFoundError();
    },
    removeEntry: async name => {
      if (lockedFiles.includes(name)) {
        throw new DOMException('locked', 'NoModificationAllowedError');
      }
      if (!storedFiles.delete(name)) {
        throw notFoundError();
      }
    },
  };
  const root: OpfsDirectoryHandle = {
    getDirectoryHandle: async name => {
      if (name === 'core-crypto' && hasCoreCryptoDirectory) {
        return coreCryptoDirectory;
      }
      throw notFoundError();
    },
    removeEntry: async () => {
      throw notFoundError();
    },
  };
  return {root, files: storedFiles};
}

describe('getCoreCryptoDatabaseFileNames', () => {
  it('derives the file names CoreCrypto uses for a database and its SQLite companion files', () => {
    const fileNames = getCoreCryptoDatabaseFileNames('corecrypto-flat');

    expect(fileNames).toContain(observedDatabaseFileName);
    expect(fileNames).toContain(observedWriteAheadLogFileName);
  });
});

describe('removeCoreCryptoDatabaseFiles', () => {
  const otherDatabaseFileName = getCoreCryptoDatabaseFileNames('corecrypto-other')[0];

  it('removes the files of the given database and leaves other databases alone', async () => {
    const opfs = createFakeOpfs({
      files: [observedDatabaseFileName, observedWriteAheadLogFileName, otherDatabaseFileName],
    });

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, 'corecrypto-flat');

    expect(result.isOk(removeResult)).toBe(true);
    expect([...opfs.files]).toEqual([otherDatabaseFileName]);
  });

  it('succeeds when the database has no files', async () => {
    const opfs = createFakeOpfs({files: [otherDatabaseFileName]});

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, 'corecrypto-flat');

    expect(result.isOk(removeResult)).toBe(true);
    expect([...opfs.files]).toEqual([otherDatabaseFileName]);
  });

  it('succeeds when CoreCrypto never created its OPFS directory', async () => {
    const opfs = createFakeOpfs({files: [], hasCoreCryptoDirectory: false});

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, 'corecrypto-flat');

    expect(result.isOk(removeResult)).toBe(true);
  });

  it('removes what it can and reports files that are still in use', async () => {
    const opfs = createFakeOpfs({
      files: [observedDatabaseFileName, observedWriteAheadLogFileName],
      lockedFiles: [observedDatabaseFileName],
    });

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, 'corecrypto-flat');

    expect(result.isErr(removeResult)).toBe(true);
    expect([...opfs.files]).toEqual([observedDatabaseFileName]);
  });
});
