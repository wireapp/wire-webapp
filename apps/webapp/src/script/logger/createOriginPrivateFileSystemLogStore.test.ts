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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {Maybe} from 'true-myth';

import {createOriginPrivateFileSystemLogStore, type LogDirectory} from './createOriginPrivateFileSystemLogStore';
import {
  logDirectoryName,
  logPersistenceConfiguration,
  type LogPersistenceConfiguration,
} from './logPersistenceConfiguration';

const firstSessionIdentifier = '00000000-0000-4000-8000-000000000001';
const secondSessionIdentifier = '00000000-0000-4000-8000-000000000002';

function encode(contents: string): Uint8Array {
  return new TextEncoder().encode(contents);
}

function createTestDirectory(): {
  readonly directory: LogDirectory;
  readonly files: Map<string, Uint8Array>;
  readonly state: {
    failure: 'none' | 'open' | 'read' | 'write' | 'flush' | 'close' | 'remove' | 'size' | 'missing';
    rollbackFails: boolean;
    legacySize: boolean;
    writing: boolean;
    maximumWriteBytes: number;
    flushCount: number;
    closeCount: number;
  };
} {
  const files = new Map<string, Uint8Array>();
  const state = {
    failure: 'none' as 'none' | 'open' | 'read' | 'write' | 'flush' | 'close' | 'remove' | 'size' | 'missing',
    rollbackFails: false,
    legacySize: false,
    writing: false,
    maximumWriteBytes: Number.POSITIVE_INFINITY,
    flushCount: 0,
    closeCount: 0,
  };
  const directory: LogDirectory = {
    async getDirectoryHandle(name) {
      expect(name).toBe(logDirectoryName);

      return directory;
    },
    async *values() {
      for (const name of files.keys()) {
        yield {name, kind: 'file'};
      }
      yield {name: 'unrelated-directory', kind: 'directory'};
    },
    async removeEntry(name) {
      expect(state.writing).toBe(false);
      if (state.failure === 'remove') {
        throw Object.assign(new Error('Cannot remove file'), {name: 'NoModificationAllowedError'});
      }

      files.delete(name);
    },
    async getFileHandle(name, options) {
      if (state.failure === 'missing' && options?.create !== true) {
        files.delete(name);

        throw Object.assign(new Error('File missing'), {name: 'NotFoundError'});
      }

      if (files.has(name) === false) {
        if (options?.create !== true) {
          throw Object.assign(new Error('File missing'), {name: 'NotFoundError'});
        }

        files.set(name, new Uint8Array());
      }

      function getContents(): Uint8Array {
        return Maybe.of(files.get(name)).unwrapOrElse(() => {
          throw Object.assign(new Error('File missing'), {name: 'NotFoundError'});
        });
      }

      return {
        async getFile() {
          return {size: getContents().byteLength};
        },
        async createSyncAccessHandle() {
          expect(state.writing).toBe(false);
          if (state.failure === 'open') {
            throw Object.assign(new Error('Log file is still in use'), {name: 'NoModificationAllowedError'});
          }

          state.writing = true;

          return {
            getSize() {
              if (state.legacySize) {
                // Model the historical browser API returning a promise despite the modern signature.
                return Promise.resolve(getContents().byteLength) as unknown as number;
              }

              if (state.failure === 'size') {
                throw new Error('Cannot read size');
              }

              return getContents().byteLength;
            },
            read(buffer, options) {
              if (state.failure === 'read') {
                throw new Error('Cannot read file');
              }

              const bytes = getContents().subarray(options.at, options.at + buffer.byteLength);
              buffer.set(bytes);

              return bytes.byteLength;
            },
            write(buffer, options) {
              const count = Math.min(buffer.byteLength, state.maximumWriteBytes);
              const previous = getContents();
              const next = new Uint8Array(Math.max(previous.byteLength, options.at + count));
              next.set(previous);
              next.set(buffer.subarray(0, count), options.at);
              files.set(name, next);
              if (state.failure === 'write') {
                throw Object.assign(new Error('Storage full'), {name: 'QuotaExceededError'});
              }

              return count;
            },
            truncate(sizeBytes) {
              if (state.rollbackFails) {
                throw new Error('Rollback failed');
              }

              files.set(name, getContents().slice(0, sizeBytes));
            },
            flush() {
              state.flushCount += 1;
              if (state.failure === 'flush') {
                throw new Error('Flush failed');
              }
            },
            close() {
              state.closeCount += 1;
              state.writing = false;
              if (state.failure === 'close') {
                throw new Error('Close failed');
              }
            },
          };
        },
      };
    },
  };

  return {directory, files, state};
}

function readLogFileContents(storage: ReturnType<typeof createTestDirectory>): readonly string[] {
  return [...storage.files.values()].map(bytes => {
    return new TextDecoder().decode(bytes);
  });
}

function createTestClock(): ReturnType<typeof createDeterministicClock> {
  return createDeterministicClock({initialUnixEpochMicroseconds: 1_000_000_000n});
}

type TestStoreOptions = {
  readonly storage: ReturnType<typeof createTestDirectory>;
  readonly configuration?: LogPersistenceConfiguration;
  readonly sessionIdentifier?: string;
  readonly clock?: ReturnType<typeof createTestClock>;
};

function createStoreForTest(options: TestStoreOptions): ReturnType<typeof createOriginPrivateFileSystemLogStore> {
  const {
    storage,
    configuration = logPersistenceConfiguration,
    sessionIdentifier = firstSessionIdentifier,
    clock = createTestClock(),
  } = options;

  return createOriginPrivateFileSystemLogStore({
    async getDirectory() {
      return storage.directory;
    },
    clock,
    sessionIdentifier,
    configuration,
  });
}

describe('worker synchronous Origin Private File System log store', () => {
  it('writes exact JSONL, flushes once per batch, closes handles, and survives reinitialization', async () => {
    const storage = createTestDirectory();
    const firstWriter = createStoreForTest({storage});
    const line = '{"msg":"[REDACTED]","escaped":"\\u0025","unicode":"€"}\n';
    await firstWriter.append([line, '{"second":true}\n']);
    expect(storage.state.flushCount).toBe(1);
    expect(storage.state.closeCount).toBe(1);
    const secondWriter = createStoreForTest({storage, sessionIdentifier: secondSessionIdentifier});
    await secondWriter.append(['{"third":true}\n']);

    expect(readLogFileContents(storage)).toEqual([`${line}{"second":true}\n`, '{"third":true}\n']);
    expect(storage.state.writing).toBe(false);
  });

  it('handles short synchronous writes without splitting or changing multibyte records', async () => {
    const storage = createTestDirectory();
    storage.state.maximumWriteBytes = 1;
    const writer = createStoreForTest({storage});
    await writer.append(['"€"\n']);

    expect(readLogFileContents(storage)).toEqual(['"€"\n']);
    expect(storage.state.flushCount).toBe(1);
  });

  it('starts a new file after restart without appending to an interrupted previous file', async () => {
    const storage = createTestDirectory();
    const interruptedContents = '{"interrupted":';
    storage.files.set(`log-1000000-${firstSessionIdentifier}-1.jsonl`, encode(interruptedContents));
    const writer = createStoreForTest({storage, sessionIdentifier: secondSessionIdentifier});
    await writer.append(['{}\n']);

    expect(readLogFileContents(storage)).toEqual([interruptedContents, '{}\n']);
    expect(storage.state.writing).toBe(false);
  });

  it('fails safely instead of looping if a synchronous write makes no progress', async () => {
    const storage = createTestDirectory();
    storage.state.maximumWriteBytes = 0;
    const writer = createStoreForTest({storage});
    await expect(writer.append(['{}\n'])).rejects.toThrow('Incomplete log file write');

    expect(storage.state.writing).toBe(false);
    expect(readLogFileContents(storage)).toEqual(['']);
  });

  it('rejects legacy asynchronous access methods before writing and releases the handle', async () => {
    const storage = createTestDirectory();
    storage.state.legacySize = true;
    const writer = createStoreForTest({storage});
    await expect(writer.append(['{}\n'])).rejects.toThrow('Synchronous access handles are unsupported');

    expect(readLogFileContents(storage)).toEqual(['']);
    expect(storage.state.closeCount).toBe(1);
    expect(storage.state.flushCount).toBe(0);
    expect(storage.state.writing).toBe(false);
  });

  it('rotates at the file limit and removes the oldest files before exceeding the storage budget', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({
      storage,
      configuration: {...logPersistenceConfiguration, maximumFileBytes: 6, maximumTotalBytes: 9},
    });
    await writer.append(['{}\n', '{}\n']);
    await writer.append(['[]\n']);
    expect(readLogFileContents(storage)).toEqual(['{}\n{}\n', '[]\n']);
    await writer.append(['[]\n']);

    expect(readLogFileContents(storage)).toEqual(['[]\n[]\n']);
  });

  it('cleans expired, empty and oversized owned files without touching unrelated files or directories', async () => {
    const storage = createTestDirectory();
    storage.files.set(`log-0-${firstSessionIdentifier}-1.jsonl`, encode('{}\n'));
    storage.files.set(`log-1000000-${firstSessionIdentifier}-2.jsonl`, encode(''));
    storage.files.set(`log-1000000-${firstSessionIdentifier}-3.jsonl`, encode('{}\n{}\n'));
    storage.files.set('private-user-file.jsonl', encode('keep this'));
    storage.files.set('log-malformed.jsonl', encode('keep this too'));
    const clock = createTestClock();
    const writer = createStoreForTest({
      storage,
      clock,
      configuration: {...logPersistenceConfiguration, maximumFileBytes: 3, maximumAgeMilliseconds: 1000},
    });
    await writer.append([]);

    expect(readLogFileContents(storage)).toEqual(['keep this', 'keep this too']);
    expect(storage.state.closeCount).toBe(0);
  });

  it('expires an active file and starts a new one for later records', async () => {
    const storage = createTestDirectory();
    const clock = createTestClock();
    const writer = createStoreForTest({storage, clock});
    await writer.append(['{}\n']);
    clock.advanceByMilliseconds(logPersistenceConfiguration.maximumAgeMilliseconds);
    await writer.append(['[]\n']);

    expect(readLogFileContents(storage)).toEqual(['[]\n']);
  });

  it('recovers when the formerly active file is unexpectedly deleted', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage});
    await writer.append(['{}\n']);
    storage.files.clear();
    await writer.append(['[]\n']);

    expect(readLogFileContents(storage)).toEqual(['[]\n']);
  });

  it('recovers when a listed file disappears before it can be read', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage});
    await writer.append(['{}\n']);
    storage.state.failure = 'missing';
    await writer.append(['[]\n']);

    expect(readLogFileContents(storage)).toEqual(['[]\n']);
    expect(storage.state.writing).toBe(false);
  });

  it.each(['write', 'flush'] as const)('rolls back a failed %s and can recover into a new file', async failure => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage});
    await writer.append(['{}\n']);
    storage.state.failure = failure;
    await expect(writer.append(['[]\n'])).rejects.toThrow();
    expect(storage.state.writing).toBe(false);
    if (failure === 'write') {
      expect(readLogFileContents(storage)).toEqual(['{}\n']);
    } else {
      // Both flush attempts failed; remove the file rather than retain an uncertain partial commit.
      expect(storage.files.size).toBe(0);
    }

    storage.state.failure = 'none';
    await writer.append(['{"recovered":true}\n']);
    expect(readLogFileContents(storage)).toContain('{"recovered":true}\n');
  });

  it('removes a partially written file when rollback cannot restore whole records', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage});
    await writer.append(['{}\n']);
    storage.state.failure = 'write';
    storage.state.maximumWriteBytes = 1;
    storage.state.rollbackFails = true;
    await expect(writer.append(['[]\n'])).rejects.toThrow();

    expect(storage.files.size).toBe(0);
    expect(storage.state.writing).toBe(false);
  });

  it.each(['read', 'size', 'close'] as const)('closes handles and can recover after failed %s', async failure => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage});
    await writer.append(['{}\n']);
    storage.state.failure = failure;
    await expect(writer.append(['[]\n'])).rejects.toThrow();
    expect(storage.state.writing).toBe(false);
    storage.state.failure = 'none';
    await writer.append(['{"recovered":true}\n']);

    expect(readLogFileContents(storage).join('')).toContain('{"recovered":true}\n');
  });

  it('refuses to append to an interrupted record', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage});
    await writer.append(['{}\n']);
    for (const filename of storage.files.keys()) {
      storage.files.set(filename, encode('{"interrupted":'));
    }
    await expect(writer.append(['[]\n'])).rejects.toThrow('Unexpected log file contents');
    await writer.append(['[]\n']);

    expect(readLogFileContents(storage)).toEqual(['{"interrupted":', '[]\n']);
  });

  it('fails closed on a cleanup access conflict and recovers when the file is available', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage, configuration: {...logPersistenceConfiguration, maximumTotalBytes: 3}});
    await writer.append(['{}\n']);
    storage.state.failure = 'remove';
    await expect(writer.append(['[]\n'])).rejects.toThrow('Cannot remove file');

    expect(readLogFileContents(storage)).toEqual(['{}\n']);
    storage.state.failure = 'none';
    await writer.append(['[]\n']);

    expect(readLogFileContents(storage)).toEqual(['[]\n']);
  });

  it('rejects oversized batches', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage, configuration: {...logPersistenceConfiguration, maximumFileBytes: 3}});
    await expect(writer.append(['{}\n{}\n'])).rejects.toThrow('Log batch exceeds storage limits');

    expect(storage.files.size).toBe(0);
  });

  it('preserves committed logs after a file access conflict and recovers when access is available', async () => {
    const storage = createTestDirectory();
    const writer = createStoreForTest({storage});
    await writer.append(['{}\n']);
    storage.state.failure = 'open';
    await expect(writer.append(['[]\n'])).rejects.toMatchObject({name: 'NoModificationAllowedError'});
    expect(readLogFileContents(storage)).toEqual(['{}\n']);
    expect(storage.state.closeCount).toBe(1);
    storage.state.failure = 'none';
    await writer.append(['{"recovered":true}\n']);

    expect(readLogFileContents(storage)).toEqual(['{}\n{"recovered":true}\n']);
    expect(storage.state.closeCount).toBe(2);
    expect(storage.state.writing).toBe(false);
  });
});
