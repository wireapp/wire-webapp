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
  RemoveRetryOptions,
} from './coreCryptoOpfsStorage';

const databaseLocation = 'corecrypto-wire@staging@9d1c4a7e-0000-4000-8000-000000000000@permanent';
// File names CoreCrypto 11.0.0-pre.4 created in Chromium for a database opened at `databaseLocation`.
const observedDatabaseFileName = databaseLocation;
const observedWriteAheadLogFileName = `${databaseLocation}-wal`;
const otherDatabaseFileName = 'corecrypto-other';

const domException = (name: string): DOMException => {
  return new DOMException(name, name);
};

type FakeOpfs = {
  readonly root: OpfsDirectoryHandle;
  readonly files: Set<string>;
};

function createFakeOpfs({
  files,
  hasCoreCryptoDirectory = true,
  heldOpenFor = {},
  failingFiles = {},
}: {
  files: string[];
  hasCoreCryptoDirectory?: boolean;
  /** Number of removal attempts per file that fail because CoreCrypto still holds the file open. */
  heldOpenFor?: Record<string, number>;
  /** Files whose removal always fails with the given exception name. */
  failingFiles?: Record<string, string>;
}): FakeOpfs {
  const storedFiles = new Set(files);
  const remainingHeldOpenAttempts = new Map(Object.entries(heldOpenFor));
  const coreCryptoDirectory: OpfsDirectoryHandle = {
    getDirectoryHandle: async () => {
      throw domException('NotFoundError');
    },
    removeEntry: async name => {
      if (failingFiles[name] !== undefined) {
        throw domException(failingFiles[name]);
      }
      const heldOpenAttempts = remainingHeldOpenAttempts.get(name) ?? 0;
      if (heldOpenAttempts > 0) {
        remainingHeldOpenAttempts.set(name, heldOpenAttempts - 1);
        throw domException('NoModificationAllowedError');
      }
      if (!storedFiles.delete(name)) {
        throw domException('NotFoundError');
      }
    },
  };
  const root: OpfsDirectoryHandle = {
    getDirectoryHandle: async name => {
      if (name === 'core-crypto' && hasCoreCryptoDirectory) {
        return coreCryptoDirectory;
      }
      throw domException('NotFoundError');
    },
    removeEntry: async () => {
      throw domException('NotFoundError');
    },
  };
  return {root, files: storedFiles};
}

function createRetryOptions(retryDelaysInMilliseconds: number[]): RemoveRetryOptions & {waits: number[]} {
  const waits: number[] = [];
  return {
    retryDelaysInMilliseconds,
    waits,
    wait: async milliseconds => {
      waits.push(milliseconds);
    },
  };
}

describe('getCoreCryptoDatabaseFileNames', () => {
  it('names the database file and its SQLite companion files as CoreCrypto creates them', () => {
    const fileNames = getCoreCryptoDatabaseFileNames(databaseLocation);

    expect(fileNames).toContain(observedDatabaseFileName);
    expect(fileNames).toContain(observedWriteAheadLogFileName);
  });
});

describe('removeCoreCryptoDatabaseFiles', () => {
  it('removes the files of the given database and leaves other databases alone', async () => {
    const opfs = createFakeOpfs({
      files: [observedDatabaseFileName, observedWriteAheadLogFileName, otherDatabaseFileName],
    });

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, databaseLocation, createRetryOptions([]));

    expect(result.isOk(removeResult)).toBe(true);
    expect([...opfs.files]).toEqual([otherDatabaseFileName]);
  });

  it('succeeds when the database has no files', async () => {
    const opfs = createFakeOpfs({files: [otherDatabaseFileName]});

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, databaseLocation, createRetryOptions([]));

    expect(result.isOk(removeResult)).toBe(true);
    expect([...opfs.files]).toEqual([otherDatabaseFileName]);
  });

  it('succeeds when CoreCrypto never created its OPFS directory', async () => {
    const opfs = createFakeOpfs({files: [], hasCoreCryptoDirectory: false});

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, databaseLocation, createRetryOptions([]));

    expect(result.isOk(removeResult)).toBe(true);
  });

  it('waits for CoreCrypto to release files that it still holds open', async () => {
    const opfs = createFakeOpfs({
      files: [observedDatabaseFileName, observedWriteAheadLogFileName],
      heldOpenFor: {[observedDatabaseFileName]: 2},
    });
    const retryOptions = createRetryOptions([10, 20, 40]);

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, databaseLocation, retryOptions);

    expect(result.isOk(removeResult)).toBe(true);
    expect([...opfs.files]).toEqual([]);
    expect(retryOptions.waits).toEqual([10, 20]);
  });

  it('gives up on a file that stays held open and still removes the others', async () => {
    const opfs = createFakeOpfs({
      files: [observedDatabaseFileName, observedWriteAheadLogFileName],
      heldOpenFor: {[observedDatabaseFileName]: 5},
    });
    const retryOptions = createRetryOptions([10, 20]);

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, databaseLocation, retryOptions);

    expect(result.isErr(removeResult)).toBe(true);
    expect([...opfs.files]).toEqual([observedDatabaseFileName]);
    expect(retryOptions.waits).toEqual([10, 20]);
  });

  it('does not retry other failures', async () => {
    const opfs = createFakeOpfs({
      files: [observedDatabaseFileName],
      failingFiles: {[observedDatabaseFileName]: 'SecurityError'},
    });
    const retryOptions = createRetryOptions([10, 20]);

    const removeResult = await removeCoreCryptoDatabaseFiles(opfs.root, databaseLocation, retryOptions);

    expect(result.isErr(removeResult)).toBe(true);
    expect(retryOptions.waits).toEqual([]);
  });
});
