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

import {isNull, isSafeInteger} from '@sindresorhus/is';
import {task, type Task} from 'true-myth';

import {
  isMissingEntry,
  isValidAccountIdentifier,
  logFilenamePattern,
  type LogDirectory,
} from './createOriginPrivateFileSystemLogStore';
import {logDirectoryName} from './logPersistenceConfiguration';

type DeleteAccountBrowserLogsOptions = {
  readonly getDirectory: () => Promise<AccountLogDirectory>;
  readonly accountIdentifier: string;
};

export type AccountLogDirectory = Pick<LogDirectory, 'values' | 'removeEntry'> & {
  readonly getDirectoryHandle: (name: string, options: FileSystemGetDirectoryOptions) => Promise<AccountLogDirectory>;
};

type AccountLogDeletionFailure = 'invalid-account' | 'storage-unavailable' | 'partial-deletion';

function isOwnedAccountFile(entry: Pick<FileSystemHandle, 'kind' | 'name'>, accountIdentifier: string): boolean {
  if (entry.kind !== 'file') {
    return false;
  }
  const match = logFilenamePattern.exec(entry.name);
  if (isNull(match)) {
    return false;
  }

  const accountSuffixCaptureIndex = 4;

  return isSafeInteger(Number(match[1])) && match[accountSuffixCaptureIndex] === accountIdentifier;
}

export function deleteAccountBrowserLogs(
  options: DeleteAccountBrowserLogsOptions,
): Task<void, AccountLogDeletionFailure> {
  const {getDirectory, accountIdentifier} = options;
  if (!isValidAccountIdentifier(accountIdentifier)) {
    return task.reject('invalid-account');
  }

  return task
    .tryOr<boolean, AccountLogDeletionFailure>('storage-unavailable', async (): Promise<boolean> => {
      let directory: AccountLogDirectory;
      try {
        const root = await getDirectory();
        directory = await root.getDirectoryHandle(logDirectoryName, {create: false});
      } catch (error: unknown) {
        if (isMissingEntry(error)) {
          return false;
        }

        throw error;
      }

      let removalFailed = false;
      for await (const entry of directory.values()) {
        if (!isOwnedAccountFile(entry, accountIdentifier)) {
          continue;
        }
        try {
          await directory.removeEntry(entry.name);
        } catch (error: unknown) {
          if (!isMissingEntry(error)) {
            removalFailed = true;
          }
        }
      }

      return removalFailed;
    })
    .andThen(removalFailed => {
      return removalFailed ? task.reject('partial-deletion') : task.resolve(undefined);
    });
}
