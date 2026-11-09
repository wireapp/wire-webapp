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

import type {Clock} from '@enormora/clock/clock';
import {task, type Task} from 'true-myth';

const coreCryptoOpfsDirectoryName = 'core-crypto';

/**
 * CoreCrypto 11 stores browser databases as SQLite files in the `core-crypto`
 * OPFS directory. Its public migration guide recommends deleting a database's
 * parent directory, but the flat location retained for the V9 IndexedDB import
 * has no private parent directory. Keep the companion-file knowledge isolated
 * here until CoreCrypto exposes a supported database deletion API.
 *
 * The suffixes match the SQLite files cleaned up by CoreCrypto's own stable
 * V11 JavaScript test utilities.
 */
export const coreCryptoSqliteFileSuffixes = ['', '-journal', '-shm', '-wal'] as const;

/* eslint-disable @typescript-eslint/no-magic-numbers -- The sequence documents the complete bounded retry schedule. */
export const coreCryptoOpfsRemovalRetryDelaysInMilliseconds = [50, 100, 200, 400, 800, 1_600] as const;
/* eslint-enable @typescript-eslint/no-magic-numbers */

export type CoreCryptoOpfsDirectory = Pick<FileSystemDirectoryHandle, 'getDirectoryHandle' | 'removeEntry'>;

const wait = (clock: Clock, delayInMilliseconds: number): Task<void, Error> => {
  return task.tryOrElse(
    cause => {
      return new Error('Failed to schedule a CoreCrypto OPFS deletion retry', {cause});
    },
    () => {
      return new Promise<void>(resolve => {
        clock.setTimeout(() => {
          return resolve();
        }, delayInMilliseconds);
      });
    },
  );
};

const isDomException = (error: unknown, name: string): error is DOMException => {
  return error instanceof DOMException && error.name === name;
};

const removeEntryWithRetry = (
  directory: CoreCryptoOpfsDirectory,
  entryName: string,
  clock: Clock,
  retryDelays: readonly number[],
): Task<void, unknown> => {
  return task
    .tryOrElse(
      reason => {
        return reason;
      },
      () => {
        return directory.removeEntry(entryName);
      },
    )
    .orElse(error => {
      if (isDomException(error, 'NotFoundError')) {
        return task.resolve(undefined);
      }

      const [retryDelay, ...remainingRetryDelays] = retryDelays;
      if (isDomException(error, 'NoModificationAllowedError') && retryDelay !== undefined) {
        return wait(clock, retryDelay).andThen(() => {
          return removeEntryWithRetry(directory, entryName, clock, remainingRetryDelays);
        });
      }

      return task.reject(error);
    });
};

/**
 * Remove a flat CoreCrypto V11 database and its SQLite companion files from
 * OPFS. Missing files or a missing CoreCrypto directory already represent the
 * desired state and are treated as success.
 */
export const removeCoreCryptoOpfsDatabase = (
  opfsRoot: CoreCryptoOpfsDirectory,
  databaseLocation: string,
  clock: Clock,
): Task<void, Error> => {
  return task
    .tryOrElse(
      reason => {
        return reason;
      },
      () => {
        return opfsRoot.getDirectoryHandle(coreCryptoOpfsDirectoryName);
      },
    )
    .andThen(coreCryptoDirectory => {
      const removals = coreCryptoSqliteFileSuffixes.map(suffix => {
        return removeEntryWithRetry(
          coreCryptoDirectory,
          `${databaseLocation}${suffix}`,
          clock,
          coreCryptoOpfsRemovalRetryDelaysInMilliseconds,
        );
      });

      return task.all(removals).map(() => {
        return undefined;
      });
    })
    .orElse(error => {
      return isDomException(error, 'NotFoundError') ? task.resolve(undefined) : task.reject(error);
    })
    .mapRejected(reason => {
      return new Error(`Failed to remove CoreCrypto OPFS database "${databaseLocation}"`, {cause: reason});
    });
};
