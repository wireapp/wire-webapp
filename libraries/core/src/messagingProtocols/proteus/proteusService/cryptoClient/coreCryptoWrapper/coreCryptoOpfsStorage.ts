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

/** OPFS directory in which the CoreCrypto browser build keeps all of its SQLite databases. */
const coreCryptoOpfsDirectoryName = 'core-crypto';

/** SQLite files that can exist next to a database file. */
const sqliteCompanionFileSuffixes = ['', '-wal', '-journal', '-shm'];

const hexadecimalRadix = 16;
const hexDigitsPerByte = 2;

/** Lowercase hex encoding of the UTF-8 bytes of `value`. */
const toHex = (value: string): string => {
  return Array.from(new TextEncoder().encode(value), byte => {
    return byte.toString(hexadecimalRadix).padStart(hexDigitsPerByte, '0');
  }).join('');
};

/**
 * Names of the OPFS files that back the CoreCrypto database opened at `databaseLocation`.
 *
 * The CoreCrypto browser build stores each SQLite file as `f-<hex-encoded file path>` inside its OPFS directory,
 * where the file path is the database location followed by SQLite's suffix (such as `-wal`). This mirrors an
 * internal detail of CoreCrypto, which does not offer an API to delete a database.
 */
export const getCoreCryptoDatabaseFileNames = (databaseLocation: string): string[] => {
  return sqliteCompanionFileSuffixes.map(suffix => {
    return `f-${toHex(`${databaseLocation}${suffix}`)}`;
  });
};

const isNotFoundError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'NotFoundError';
};

/**
 * Removes the OPFS files of the CoreCrypto database opened at `databaseLocation`.
 *
 * Files that do not exist are skipped. The files of a database that is still open in this page, or whose
 * handles were destroyed but not yet garbage collected, cannot be removed: those failures are reported in the
 * returned error after every file has been tried.
 */
export const removeCoreCryptoDatabaseFiles = async (
  opfsRoot: OpfsDirectoryHandle,
  databaseLocation: string,
): Promise<Result<void, Error>> => {
  let coreCryptoDirectory: OpfsDirectoryHandle;
  try {
    coreCryptoDirectory = await opfsRoot.getDirectoryHandle(coreCryptoOpfsDirectoryName);
  } catch (error) {
    return isNotFoundError(error)
      ? result.ok(undefined)
      : result.err(new Error('Failed to open the CoreCrypto OPFS directory', {cause: error}));
  }

  const failures: unknown[] = [];
  for (const fileName of getCoreCryptoDatabaseFileNames(databaseLocation)) {
    try {
      await coreCryptoDirectory.removeEntry(fileName);
    } catch (error) {
      if (!isNotFoundError(error)) {
        failures.push(error);
      }
    }
  }

  return failures.length === 0
    ? result.ok(undefined)
    : result.err(new AggregateError(failures, `Failed to remove ${failures.length} CoreCrypto database file(s)`));
};
