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

import {result, type Result} from 'true-myth';

/**
 * The parts of `FileSystemDirectoryHandle` needed to remove a CoreCrypto database.
 */
export type OpfsDirectoryHandle = {
  getDirectoryHandle: (name: string) => Promise<OpfsDirectoryHandle>;
  removeEntry: (name: string) => Promise<void>;
};

/** OPFS directory in which the CoreCrypto browser build keeps its SQLite databases. */
const coreCryptoOpfsDirectoryName = 'core-crypto';

/** SQLite files that can exist next to a database file. */
const sqliteCompanionFileSuffixes = ['', '-wal', '-journal', '-shm'];

/**
 * Names of the files, relative to the CoreCrypto OPFS directory, that back the database opened at
 * `databaseLocation`: the database file itself and the SQLite files next to it (such as `-wal`).
 */
export const getCoreCryptoDatabaseFileNames = (databaseLocation: string): string[] => {
  return sqliteCompanionFileSuffixes.map(suffix => {
    return `${databaseLocation}${suffix}`;
  });
};

export type RemoveRetryOptions = {
  /** Delays between attempts to remove a file that CoreCrypto still holds open. */
  readonly retryDelaysInMilliseconds: readonly number[];
  readonly wait: (milliseconds: number) => Promise<void>;
};

const firstRetryDelayInMilliseconds = 50;
const retryBackoffFactor = 2;
const retryCount = 6;

/**
 * After the CoreCrypto handles are destroyed, its OPFS worker releases the files asynchronously, and nothing
 * signals when that has happened. In Chromium this took between 50 and 500 milliseconds; these delays add up to
 * about three seconds.
 */
export const defaultRemoveRetryOptions: RemoveRetryOptions = {
  retryDelaysInMilliseconds: Array.from({length: retryCount}, (_unused, attempt) => {
    return firstRetryDelayInMilliseconds * retryBackoffFactor ** attempt;
  }),
  wait: milliseconds => {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  },
};

const isDomExceptionNamed = (error: unknown, name: string): boolean => {
  return error instanceof DOMException && error.name === name;
};

/** Removes a file, waiting for CoreCrypto to release it if necessary. A missing file counts as removed. */
const removeFile = async (
  directory: OpfsDirectoryHandle,
  fileName: string,
  {retryDelaysInMilliseconds, wait}: RemoveRetryOptions,
): Promise<Result<void, unknown>> => {
  const delays = [...retryDelaysInMilliseconds];
  for (;;) {
    try {
      await directory.removeEntry(fileName);
      return result.ok(undefined);
    } catch (error) {
      if (isDomExceptionNamed(error, 'NotFoundError')) {
        return result.ok(undefined);
      }
      const delay = delays.shift();
      if (!isDomExceptionNamed(error, 'NoModificationAllowedError') || delay === undefined) {
        return result.err(error);
      }
      await wait(delay);
    }
  }
};

/**
 * Removes the OPFS files of the CoreCrypto database opened at `databaseLocation`.
 *
 * All CoreCrypto handles on the database must have been destroyed (see `destroyCoreCryptoHandles`). Files that
 * do not exist are skipped, and files that are still held open are retried until CoreCrypto releases them.
 * Failures are reported in the returned error after every file has been tried.
 */
export const removeCoreCryptoDatabaseFiles = async (
  opfsRoot: OpfsDirectoryHandle,
  databaseLocation: string,
  retryOptions: RemoveRetryOptions = defaultRemoveRetryOptions,
): Promise<Result<void, Error>> => {
  let coreCryptoDirectory: OpfsDirectoryHandle;
  try {
    coreCryptoDirectory = await opfsRoot.getDirectoryHandle(coreCryptoOpfsDirectoryName);
  } catch (error) {
    return isDomExceptionNamed(error, 'NotFoundError')
      ? result.ok(undefined)
      : result.err(new Error('Failed to open the CoreCrypto OPFS directory', {cause: error}));
  }

  const failures: unknown[] = [];
  for (const fileName of getCoreCryptoDatabaseFileNames(databaseLocation)) {
    const removeResult = await removeFile(coreCryptoDirectory, fileName, retryOptions);
    if (result.isErr(removeResult)) {
      failures.push(removeResult.error);
    }
  }

  return failures.length === 0
    ? result.ok(undefined)
    : result.err(new AggregateError(failures, `Failed to remove ${failures.length} CoreCrypto database file(s)`));
};
