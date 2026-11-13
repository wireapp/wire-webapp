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
import {isNull, isObject, isSafeInteger} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {logDirectoryName, type LogPersistenceConfiguration} from './logPersistenceConfiguration';

export type LogFileHandle = {
  readonly getFile: () => Promise<{readonly size: number}>;
  readonly createSyncAccessHandle: () => Promise<LogAccessHandle>;
};

export type LogAccessHandle = {
  readonly getSize: () => number;
  readonly read: (buffer: Uint8Array, options: {readonly at: number}) => number;
  readonly write: (buffer: Uint8Array, options: {readonly at: number}) => number;
  readonly truncate: (sizeBytes: number) => void;
  readonly flush: () => void;
  readonly close: () => void;
};

export type LogDirectory = {
  readonly getDirectoryHandle: (name: string, options: FileSystemGetDirectoryOptions) => Promise<LogDirectory>;
  readonly getFileHandle: (name: string, options?: FileSystemGetFileOptions) => Promise<LogFileHandle>;
  readonly values: () => AsyncIterable<Pick<FileSystemHandle, 'name' | 'kind'>>;
  readonly removeEntry: (name: string) => Promise<void>;
};

export type OriginPrivateFileSystemLogStoreOptions = {
  readonly getDirectory: () => Promise<LogDirectory>;
  readonly clock: Pick<Clock, 'currentUnixEpochMilliseconds'>;
  readonly sessionIdentifier: string;
  readonly configuration: LogPersistenceConfiguration;
};

type StoredLogFile = {
  readonly name: string;
  readonly createdAtMilliseconds: number;
  readonly sizeBytes: number;
};

export type LogStore = {
  readonly append: (lines: readonly string[]) => Promise<void>;
};

type LogFileRetentionOptions = {
  readonly file: StoredLogFile;
  readonly currentTimeMilliseconds: number;
  readonly totalStoredBytes: number;
  readonly incomingBatchBytes: number;
  readonly configuration: LogPersistenceConfiguration;
};

const newlineByte = 10;

// Only files owned by this version participate in retention. Never recurse into directories.
const logFilenamePattern = /^log-(\d+)-([a-f0-9-]{36})-(\d+)\.jsonl$/u;

function shouldRemoveLogFile(options: LogFileRetentionOptions): boolean {
  const {file, currentTimeMilliseconds, totalStoredBytes, incomingBatchBytes, configuration} = options;
  const expired = currentTimeMilliseconds - file.createdAtMilliseconds >= configuration.maximumAgeMilliseconds;

  return (
    expired ||
    file.sizeBytes === 0 ||
    file.sizeBytes > configuration.maximumFileBytes ||
    totalStoredBytes + incomingBatchBytes > configuration.maximumTotalBytes
  );
}

function isLogFileAppendable(access: LogAccessHandle, expectedSizeBytes: number): boolean {
  const sizeBytes = access.getSize();
  if (sizeBytes !== expectedSizeBytes) {
    return false;
  }

  if (sizeBytes === 0) {
    return true;
  }

  const finalByte = new Uint8Array(1);

  return access.read(finalByte, {at: sizeBytes - 1}) === 1 && finalByte.at(0) === newlineByte;
}

function writeCompleteBatch(access: LogAccessHandle, bytes: Uint8Array): void {
  const originalSizeBytes = access.getSize();
  let writtenBytes = 0;
  while (writtenBytes < bytes.byteLength) {
    const remainingBytes = bytes.subarray(writtenBytes);
    const appendedBytes = access.write(remainingBytes, {at: originalSizeBytes + writtenBytes});
    if (!isValidWriteCount(appendedBytes, remainingBytes.byteLength)) {
      throw new Error('Incomplete log file write');
    }

    writtenBytes += appendedBytes;
  }
  access.flush();
}

function isValidWriteCount(writtenBytes: number, remainingBytes: number): boolean {
  return isSafeInteger(writtenBytes) && writtenBytes > 0 && writtenBytes <= remainingBytes;
}

function isMissingEntry(error: unknown): boolean {
  return isObject(error) && 'name' in error && error.name === 'NotFoundError';
}

async function listLogFiles(directory: LogDirectory): Promise<readonly StoredLogFile[]> {
  const files: StoredLogFile[] = [];
  for await (const entry of directory.values()) {
    const match = logFilenamePattern.exec(entry.name);
    if (entry.kind !== 'file' || isNull(match)) {
      continue;
    }

    const createdAtMilliseconds = Number(match[1]);
    if (!isSafeInteger(createdAtMilliseconds)) {
      continue;
    }

    try {
      const file = await (await directory.getFileHandle(entry.name)).getFile();
      files.push({name: entry.name, createdAtMilliseconds, sizeBytes: file.size});
    } catch (error: unknown) {
      if (!isMissingEntry(error)) {
        throw error;
      }
    }
  }

  return files.toSorted((left, right) => {
    const ageDifference = left.createdAtMilliseconds - right.createdAtMilliseconds;

    return ageDifference === 0 ? left.name.localeCompare(right.name) : ageDifference;
  });
}

export function createOriginPrivateFileSystemLogStore(options: OriginPrivateFileSystemLogStoreOptions): LogStore {
  const {getDirectory, clock, sessionIdentifier, configuration} = options;
  if (!/^[a-f0-9-]{36}$/u.test(sessionIdentifier)) {
    throw new Error('Invalid log session identifier');
  }

  let activeFilename: Maybe<string> = Maybe.nothing();
  let sequence = 0;

  async function closeAccessHandle(access: LogAccessHandle): Promise<void> {
    try {
      // Modern close() is synchronous; awaiting also releases a legacy asynchronous handle safely.
      await access.close();
    } catch (error: unknown) {
      // A failed close has an uncertain commit; use a new file without replaying the batch.
      activeFilename = Maybe.nothing();

      throw error;
    }
  }

  async function append(lines: readonly string[]): Promise<void> {
    // The worker serializes commands. Closing once per batch releases idle locks during reload/shutdown.
    const root = await getDirectory();
    const directory = await root.getDirectoryHandle(logDirectoryName, {create: true});
    const batch = lines.join('');
    const encodedBatch = new TextEncoder().encode(batch);
    const batchBytes = encodedBatch.byteLength;
    if (batchBytes > configuration.maximumFileBytes || batchBytes > configuration.maximumTotalBytes) {
      throw new Error('Log batch exceeds storage limits');
    }

    const nowMilliseconds = clock.currentUnixEpochMilliseconds;
    // The budget assumes single-instance operation; overlapping startup scans are not atomic.
    const files = await listLogFiles(directory);
    let totalBytes = files.reduce((total, file) => {
      return total + file.sizeBytes;
    }, 0);
    let activeFile: Maybe<StoredLogFile> = Maybe.nothing();
    for (const file of files) {
      if (
        shouldRemoveLogFile({
          file,
          currentTimeMilliseconds: nowMilliseconds,
          totalStoredBytes: totalBytes,
          incomingBatchBytes: batchBytes,
          configuration,
        })
      ) {
        try {
          await directory.removeEntry(file.name);
        } catch (error: unknown) {
          if (!isMissingEntry(error)) {
            // Startup can briefly overlap the single-instance guard; locked cleanup must fail closed.
            throw error;
          }
        }
        totalBytes -= file.sizeBytes;
      } else if (activeFilename.isJust && file.name === activeFilename.value) {
        activeFile = Maybe.just(file);
      }
    }
    if (batchBytes === 0) {
      return;
    }

    if (activeFile.isNothing || activeFile.value.sizeBytes + batchBytes > configuration.maximumFileBytes) {
      // Previous sessions may end with interrupted bytes; never reopen them for appending.
      sequence += 1;
      activeFilename = Maybe.just(`log-${nowMilliseconds}-${sessionIdentifier}-${sequence}.jsonl`);
      activeFile = Maybe.nothing();
    }

    const filename = activeFilename;
    if (filename.isNothing) {
      throw new Error('Missing active log filename');
    }

    const fileHandle = await directory.getFileHandle(filename.value, {create: true});
    const access = await fileHandle.createSyncAccessHandle();
    let removeDamagedFile = false;
    try {
      const originalSizeBytes: unknown = access.getSize();
      if (!isSafeInteger(originalSizeBytes)) {
        // Older implementations returned a promise. Consume it without writing, then close and disable.
        await originalSizeBytes;

        throw new Error('Synchronous access handles are unsupported');
      }

      const expectedSizeBytes = activeFile
        .map(file => {
          return file.sizeBytes;
        })
        .unwrapOr(0);
      if (!isLogFileAppendable(access, expectedSizeBytes)) {
        throw new Error('Unexpected log file contents');
      }

      try {
        writeCompleteBatch(access, encodedBatch);
      } catch (error: unknown) {
        try {
          // Roll back the whole batch so partial writes do not leave a deliberately incomplete record.
          access.truncate(originalSizeBytes);
          access.flush();
        } catch {
          removeDamagedFile = true;
        }

        throw error;
      }
    } catch (error: unknown) {
      activeFilename = Maybe.nothing();

      throw error;
    } finally {
      try {
        await closeAccessHandle(access);
      } finally {
        if (removeDamagedFile) {
          await directory.removeEntry(filename.value);
        }
      }
    }
  }

  return {append};
}
