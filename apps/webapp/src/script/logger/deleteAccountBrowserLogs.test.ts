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

import {Result} from 'true-myth';

import {deleteAccountBrowserLogs} from './deleteAccountBrowserLogs';
import type {LogDirectory} from './createOriginPrivateFileSystemLogStore';
import {logDirectoryEntryFactory, logDirectoryFactory} from './test/logDeletionTestFactories';

const accountIdentifier = 'a'.repeat(64);
const sessionIdentifier = '12345678-1234-1234-1234-123456789abc';
const firstFilename = `log-1-${sessionIdentifier}-1-${accountIdentifier}.jsonl`;
const secondFilename = `log-1700000000000-${'b'.repeat(36)}-2-${accountIdentifier}.jsonl`;

function createDirectory(entries: readonly Pick<FileSystemHandle, 'name' | 'kind'>[]): {
  readonly root: LogDirectory;
  readonly remainingEntries: Map<string, Pick<FileSystemHandle, 'name' | 'kind'>>;
  readonly removeEntry: jest.Mock<Promise<void>, [string]>;
} {
  const remainingEntries = new Map(
    entries.map(entry => {
      return [entry.name, entry];
    }),
  );
  const removeEntry = jest.fn(async (name: string): Promise<void> => {
    remainingEntries.delete(name);
  });
  const directory: LogDirectory = logDirectoryFactory.build({
    async getDirectoryHandle(name, options) {
      expect(name).toBe('wire-logs-v1');
      expect(options).toEqual({create: false});

      return directory;
    },
    async *values() {
      yield* remainingEntries.values();
    },
    removeEntry,
  });

  return {root: directory, remainingEntries, removeEntry};
}

describe('account browser log deletion', () => {
  it('deletes exact owned account files across sessions/dates and preserves all other entries', async () => {
    const preservedFilenames = [
      `log-1-${sessionIdentifier}-1-${'b'.repeat(64)}.jsonl`,
      `log-1-${sessionIdentifier}-1.jsonl`,
      `log-v2-1-${sessionIdentifier}-1-${accountIdentifier}.jsonl`,
      `${firstFilename}.bak`,
      `prefix-${firstFilename}`,
      `log-9007199254740992-${sessionIdentifier}-1-${accountIdentifier}.jsonl`,
      `log-1-invalid-session-1-${accountIdentifier}.jsonl`,
      'unrelated.txt',
    ];
    const entries: Pick<FileSystemHandle, 'name' | 'kind'>[] = [
      ...[firstFilename, secondFilename, ...preservedFilenames].map(name => {
        return logDirectoryEntryFactory.build({name});
      }),
      logDirectoryEntryFactory.build({
        name: `log-2-${sessionIdentifier}-1-${accountIdentifier}.jsonl`,
        kind: 'directory',
      }),
      logDirectoryEntryFactory.build({name: 'wire-logs-v2', kind: 'directory'}),
    ];
    const {root, remainingEntries} = createDirectory(entries);

    expect(
      await deleteAccountBrowserLogs({
        getDirectory: async () => {
          return root;
        },
        accountIdentifier,
      }),
    ).toEqual(Result.ok(undefined));
    expect([...remainingEntries.keys()]).toEqual([
      ...preservedFilenames,
      ...entries.slice(-2).map(entry => {
        return entry.name;
      }),
    ]);
  });

  it.each(['', 'raw-account-id', 'A'.repeat(64), 'a'.repeat(63)])(
    'rejects invalid identity without accessing storage: %s',
    async invalidIdentifier => {
      const getDirectory = jest.fn();
      expect(await deleteAccountBrowserLogs({getDirectory, accountIdentifier: invalidIdentifier})).toEqual(
        Result.err('invalid-account'),
      );
      expect(getDirectory).not.toHaveBeenCalled();
    },
  );

  it('treats a missing directory as success without creating it', async () => {
    const {root} = createDirectory([]);
    const getDirectoryHandle = jest.fn(async (): Promise<never> => {
      throw {name: 'NotFoundError'};
    });
    expect(
      await deleteAccountBrowserLogs({
        getDirectory: async () => {
          return {...root, getDirectoryHandle};
        },
        accountIdentifier,
      }),
    ).toEqual(Result.ok(undefined));
    expect(getDirectoryHandle).toHaveBeenCalledWith('wire-logs-v1', {create: false});
  });

  it('continues after a failed removal and reports partial deletion without storage details', async () => {
    const {root, remainingEntries, removeEntry} = createDirectory(
      [firstFilename, secondFilename].map(name => {
        return logDirectoryEntryFactory.build({name});
      }),
    );
    removeEntry.mockRejectedValueOnce(new Error(`Sensitive ${accountIdentifier}`));
    const reportedFailures: string[] = [];
    const deletion = deleteAccountBrowserLogs({
      getDirectory: async () => {
        return root;
      },
      accountIdentifier,
    }).inspectRejected(failure => {
      reportedFailures.push(failure);
    });
    expect(await deletion).toEqual(Result.err('partial-deletion'));
    expect(reportedFailures).toEqual(['partial-deletion']);
    expect([...remainingEntries.keys()]).toEqual([firstFilename]);
    expect(removeEntry).toHaveBeenCalledTimes(2);
  });

  it('reports unavailable storage and failed enumeration', async () => {
    const getDirectory = jest.fn(async (): Promise<never> => {
      throw new Error('Storage denied');
    });
    expect(await deleteAccountBrowserLogs({getDirectory, accountIdentifier})).toEqual(
      Result.err('storage-unavailable'),
    );
    const {root} = createDirectory([]);
    async function* failedEnumeration(): AsyncGenerator<never> {
      throw new Error('Enumeration failed');
    }
    const failingDirectory: LogDirectory = {
      ...root,
      values: failedEnumeration,
      async getDirectoryHandle() {
        return failingDirectory;
      },
    };
    expect(
      await deleteAccountBrowserLogs({
        getDirectory: async () => {
          return failingDirectory;
        },
        accountIdentifier,
      }),
    ).toEqual(Result.err('storage-unavailable'));
  });
});
