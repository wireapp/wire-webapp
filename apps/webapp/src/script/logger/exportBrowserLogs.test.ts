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

import {Blob as NodeBlob} from 'node:buffer';
import {CompressionStream, DecompressionStream, ReadableStream, TransformStream, WritableStream} from 'node:stream/web';
import {Maybe, Result} from 'true-myth';

import {unwrap, unwrapErr} from '../util/test/resultTestSupport';

import {
  browserLogExportChunkBytes,
  exportBrowserLogs,
  maximumBrowserLogExportFiles,
  type BrowserLogExportDirectory,
  type BrowserLogExportFile,
} from './exportBrowserLogs';
import {logDirectoryName} from './logPersistenceConfiguration';

const firstFilename = 'log-1000-00000000-0000-4000-8000-000000000001-1.jsonl';
const secondFilename = 'log-2000-00000000-0000-4000-8000-000000000002-1.jsonl';
const primaryArchivePath = '1970-01-01/application.jsonl';
const firstRotatedArchivePath = '1970-01-01/application.old.1000-0.jsonl';
const sensitiveFailure = new Error('account-secret: private log contents');

// jsdom does not expose Web Streams. Install real streams before loading zip.js
// to exercise the production archive adapter and decode its output.
const originalStreamProperties = Object.getOwnPropertyDescriptors(globalThis);
let zipArchiveModule: typeof import('./createBrowserLogZipArchive');
let zipLibrary: typeof import('@zip.js/zip.js/index-native.js');

function createFile(contents: string): BrowserLogExportFile {
  const blob = new NodeBlob([contents]);

  return {
    size: blob.size,
    lastModified: 1000,
    slice(start, end) {
      return blob.slice(start, end) as Blob;
    },
  };
}

function missingFile(): Error {
  return Object.assign(new Error('private filename'), {name: 'NotFoundError'});
}

function createStorage(): {
  readonly directory: BrowserLogExportDirectory;
  readonly files: Map<string, BrowserLogExportFile>;
  readonly getDirectory: () => Promise<BrowserLogExportDirectory>;
} {
  const files = new Map<string, BrowserLogExportFile>();
  const directory: BrowserLogExportDirectory = {
    async getDirectoryHandle(name, options) {
      expect(name).toBe(logDirectoryName);
      expect(options).toEqual({create: false});

      return directory;
    },
    async *values() {
      // Stable enumeration only for deterministic tests; production does not promise a stable listing.
      for (const name of [...files.keys()]) {
        yield {kind: 'file', name};
      }
      yield {kind: 'directory', name: secondFilename};
    },
    async getFileHandle(name) {
      return {
        async getFile() {
          return Maybe.of(files.get(name)).unwrapOrElse(() => {
            throw missingFile();
          });
        },
      };
    },
  };

  return {
    files,
    directory,
    async getDirectory() {
      return directory;
    },
  };
}

function createDestination(): {
  readonly destination: globalThis.WritableStream<Uint8Array>;
  readonly chunks: Uint8Array[];
  readonly close: jest.Mock;
  readonly abort: jest.Mock;
} {
  const chunks: Uint8Array[] = [];
  const close = jest.fn();
  const abort = jest.fn();
  const destination = new globalThis.WritableStream<Uint8Array>({
    write(chunk) {
      chunks.push(chunk.slice());
    },
    close,
    abort,
  });

  return {destination, chunks, close, abort};
}

async function readArchive(chunks: readonly Uint8Array[]): Promise<ReadonlyMap<string, Uint8Array>> {
  const {ZipReader, Uint8ArrayReader, Uint8ArrayWriter} = zipLibrary;
  const archiveBytes = Buffer.concat(chunks);
  const reader = new ZipReader(new Uint8ArrayReader(archiveBytes), {checkCrc32: true, useWebWorkers: false});
  const files = new Map<string, Uint8Array>();
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) {
        throw new Error('Unexpected archived directory');
      }
      expect(files.has(entry.filename)).toBe(false);
      files.set(entry.filename, await entry.getData(new Uint8ArrayWriter()));
    }

    return files;
  } finally {
    await reader.close();
  }
}

describe('streaming browser log export', () => {
  beforeAll(async () => {
    Object.assign(globalThis, {
      ReadableStream,
      WritableStream,
      TransformStream,
      CompressionStream,
      DecompressionStream,
    });
    zipArchiveModule = await import('./createBrowserLogZipArchive');
    zipLibrary = await import('@zip.js/zip.js/index-native.js');
  });
  afterAll(() => {
    for (const propertyName of [
      'ReadableStream',
      'WritableStream',
      'TransformStream',
      'CompressionStream',
      'DecompressionStream',
    ]) {
      const descriptor = originalStreamProperties[propertyName];
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, propertyName);
      } else {
        Object.defineProperty(globalThis, propertyName, descriptor);
      }
    }
  });

  it('supports Task composition and resolves only after destination cleanup', async () => {
    const storage = createStorage();
    storage.files.set(firstFilename, createFile('{}\n'));
    const output = createDestination();
    const operation = exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });
    const exportedFiles = await operation
      .map(summary => {
        return summary.exportedFiles;
      })
      .match({
        Resolved(fileCount) {
          expect(output.close).toHaveBeenCalledTimes(1);
          expect(output.destination.locked).toBe(false);

          return fileCount;
        },
        Rejected() {
          throw new Error('Expected successful export');
        },
      });

    expect(exportedFiles).toBe(1);
  });

  it.each(['locked-destination', 'unavailable-storage'] as const)(
    'exposes %s through Task rejection composition',
    async failure => {
      const output = createDestination();
      const originalOwner = failure === 'locked-destination' ? output.destination.getWriter() : undefined;
      const operation = exportBrowserLogs({
        async getDirectory() {
          throw sensitiveFailure;
        },
        createArchive: zipArchiveModule.createBrowserLogZipArchive,
        destination: output.destination,
        signal: new AbortController().signal,
      });
      const failureDescription = await operation
        .mapRejected(exportFailure => {
          return `export-${exportFailure}`;
        })
        .match({
          Resolved() {
            return 'unexpected-success';
          },
          Rejected(description) {
            return description;
          },
        });

      expect(failureDescription).toBe('export-failed');
      originalOwner?.releaseLock();
      expect(output.destination.locked).toBe(false);
    },
  );

  it.each(['empty', 'missing-directory'] as const)('finishes a valid empty ZIP for %s', async collection => {
    const storage = createStorage();
    const output = createDestination();
    const result = await exportBrowserLogs({
      async getDirectory() {
        if (collection === 'missing-directory') {
          throw missingFile();
        }

        return storage.directory;
      },
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });
    const archive = await readArchive(output.chunks);

    expect(unwrap(result)).toEqual({exportedFiles: 0, missingFiles: 0});
    expect([...archive.keys()]).toEqual([]);
    expect(output.close).toHaveBeenCalledTimes(1);
    expect(output.abort).not.toHaveBeenCalled();
    expect(output.destination.locked).toBe(false);
  });

  it('includes every account and unattributed logs, preserving exact bytes and source files', async () => {
    const storage = createStorage();
    const firstAccountIdentifier = 'a'.repeat(64);
    const secondAccountIdentifier = 'b'.repeat(64);
    const legacyFile = {
      ...createFile(
        '{ "time": "1970-01-01T00:00:01.000Z", "message": "Grüße 🌍" }\r\n{"time":"1970-01-02T00:00:01.000Z"}\n{"incomplete":',
      ),
      lastModified: Date.UTC(1970, 0, 2, 0, 0, 1),
    };
    const firstAccountFile = createFile('{}\n[]\n');
    const secondAccountFile = createFile('');
    const olderAccountFile = createFile('{"older":true}\n');
    const nextDayFilename = secondFilename.replace('2000', String(Date.UTC(1970, 0, 2)));
    storage.files.set(firstFilename, legacyFile);
    storage.files.set(firstFilename.replace('.jsonl', `-${firstAccountIdentifier}.jsonl`), olderAccountFile);
    storage.files.set(secondFilename.replace('.jsonl', `-${firstAccountIdentifier}.jsonl`), firstAccountFile);
    storage.files.set(secondFilename.replace('.jsonl', `-${secondAccountIdentifier}.jsonl`), secondAccountFile);
    storage.files.set(nextDayFilename.replace('.jsonl', `-${secondAccountIdentifier}.jsonl`), secondAccountFile);
    const expectedFiles = new Map([
      [primaryArchivePath, legacyFile],
      [`1970-01-01/accounts/${firstAccountIdentifier}/application.jsonl`, firstAccountFile],
      [`1970-01-01/accounts/${firstAccountIdentifier}/application.old.1000-0.jsonl`, olderAccountFile],
      [`1970-01-01/accounts/${secondAccountIdentifier}/application.jsonl`, secondAccountFile],
      [`1970-01-02/accounts/${secondAccountIdentifier}/application.jsonl`, secondAccountFile],
    ]);
    storage.files.set('unrelated.jsonl', createFile('private unrelated contents'));
    storage.files.set('log-malformed.jsonl', createFile('unrelated'));
    storage.files.set(firstFilename.replace('1000', '99999999999999999999'), createFile('invalid timestamp'));
    const originalFiles = new Map(storage.files);
    const output = createDestination();

    const result = await exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });
    const archive = await readArchive(output.chunks);

    expect(unwrap(result)).toEqual({exportedFiles: 5, missingFiles: 0});
    expect([...archive.keys()].sort()).toEqual([...expectedFiles.keys()].sort());
    for (const [filename, file] of expectedFiles) {
      const actualContents = Maybe.of(archive.get(filename)).unwrapOrElse(() => {
        throw new Error('Missing archived file');
      });
      const expectedContents = new Uint8Array(await file.slice().arrayBuffer());
      expect(actualContents).toEqual(expectedContents);
    }
    expect(storage.files).toEqual(originalFiles);
  });

  it.each(['forward', 'reverse'] as const)('assigns stable names with %s discovery order', async order => {
    const storage = createStorage();
    const sources = [
      [firstFilename, 'old session 1, sequence 1\n'],
      [firstFilename.replace('-1.jsonl', '-2.jsonl'), 'old session 1, sequence 2\n'],
      [firstFilename.replace('000000000001', '000000000002'), 'old session 2\n'],
      [secondFilename, 'new session 2\n'],
      [secondFilename.replace('000000000002', '000000000003'), 'new session 3\n'],
    ] as const;
    for (const [filename, contents] of order === 'forward' ? sources : sources.toReversed()) {
      storage.files.set(filename, createFile(contents));
    }
    const output = createDestination();

    const result = await exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });
    const archive = await readArchive(output.chunks);
    const archivedLogs = [...archive].map(([path, bytes]) => {
      return [path, new TextDecoder().decode(bytes)];
    });
    const expectedLogs = [
      [primaryArchivePath, 'new session 2\n'],
      ['1970-01-01/application.old.2000-0.jsonl', 'new session 3\n'],
      [firstRotatedArchivePath, 'old session 1, sequence 1\n'],
      ['1970-01-01/application.old.1000-1.jsonl', 'old session 1, sequence 2\n'],
      ['1970-01-01/application.old.1000-2.jsonl', 'old session 2\n'],
    ];

    expect(unwrap(result)).toEqual({exportedFiles: 5, missingFiles: 0});
    expect(archivedLogs).toEqual(expectedLogs);
  });

  it.each(['handle', 'file'] as const)('skips a missing primary without renaming older files (%s)', async removal => {
    const storage = createStorage();
    storage.files.set(firstFilename, createFile('{}\n'));
    storage.files.set(secondFilename, createFile('[]\n'));
    const directory: BrowserLogExportDirectory = {
      ...storage.directory,
      async getDirectoryHandle() {
        return directory;
      },
      async getFileHandle(name) {
        if (name === secondFilename) {
          if (removal === 'handle') {
            throw missingFile();
          }
          storage.files.delete(name);
        }

        return storage.directory.getFileHandle(name);
      },
    };
    const output = createDestination();
    const result = await exportBrowserLogs({
      async getDirectory() {
        return directory;
      },
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });
    const archive = await readArchive(output.chunks);

    expect(unwrap(result)).toEqual({exportedFiles: 1, missingFiles: 1});
    expect([...archive.keys()]).toEqual([firstRotatedArchivePath]);
  });

  it.each(['append', 'truncate', 'delete', 'unreadable'] as const)(
    'aborts rather than committing a partial ZIP after concurrent %s',
    async change => {
      const storage = createStorage();
      const original = createFile('{}\n');
      storage.files.set(firstFilename, {
        ...original,
        slice(start, end) {
          if (change === 'unreadable') {
            throw sensitiveFailure;
          }
          if (change === 'delete') {
            storage.files.delete(firstFilename);
          } else {
            storage.files.set(firstFilename, createFile(change === 'append' ? '{}\n[]\n' : ''));
          }

          return original.slice(start, end);
        },
      });
      const output = createDestination();
      const result = await exportBrowserLogs({
        getDirectory: storage.getDirectory,
        createArchive: zipArchiveModule.createBrowserLogZipArchive,
        destination: output.destination,
        signal: new AbortController().signal,
      });

      expect(unwrapErr(result)).toBe('failed');
      expect(output.close).not.toHaveBeenCalled();
      expect(output.abort).toHaveBeenCalledTimes(1);
      expect(output.abort.mock.calls[0]).toEqual([new Error('Log export failed')]);
      expect(output.destination.locked).toBe(false);
    },
  );

  it('preserves exact contents across many input slices', async () => {
    const storage = createStorage();
    const contents = '{ "message": "Unicode 🌍", "value": 1 }\r\n'.repeat(20_000);
    storage.files.set(firstFilename, createFile(contents));
    const output = createDestination();
    const result = await exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });
    const archive = await readArchive(output.chunks);
    const archivedContents = Maybe.of(archive.get(primaryArchivePath)).unwrapOrElse(() => {
      throw new Error('Missing archived file');
    });

    expect(unwrap(result).exportedFiles).toBe(1);
    expect(new TextDecoder().decode(archivedContents)).toBe(contents);
  });

  it('allows logging to continue after a file has been exported without claiming a global snapshot', async () => {
    const storage = createStorage();
    storage.files.set(firstFilename, createFile('{}\n'));
    storage.files.set(secondFilename, createFile('[]\n'));
    const directory: BrowserLogExportDirectory = {
      ...storage.directory,
      async getDirectoryHandle() {
        return directory;
      },
      async getFileHandle(name) {
        if (name === firstFilename) {
          storage.files.set(secondFilename, createFile('[]\n{"later":true}\n'));
        }

        return storage.directory.getFileHandle(name);
      },
    };
    const output = createDestination();
    const result = await exportBrowserLogs({
      async getDirectory() {
        return directory;
      },
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });
    const archive = await readArchive(output.chunks);
    const archivedContents = Maybe.of(archive.get(primaryArchivePath)).unwrapOrElse(() => {
      throw new Error('Missing archived file');
    });

    expect(unwrap(result).exportedFiles).toBe(2);
    expect(new TextDecoder().decode(archivedContents)).toBe('[]\n');
    expect(storage.files.get(secondFilename)?.size).toBeGreaterThan(3);
  });

  it.each(['negative-size', 'invalid-modification-time', 'short-read'] as const)(
    'rejects invalid storage output: %s',
    async failure => {
      const storage = createStorage();
      const original = createFile('{}\n');
      storage.files.set(firstFilename, {
        ...original,
        size: failure === 'negative-size' ? -1 : original.size,
        lastModified: failure === 'invalid-modification-time' ? Number.NaN : original.lastModified,
        slice() {
          return new NodeBlob([]) as Blob;
        },
      });
      const output = createDestination();
      const result = await exportBrowserLogs({
        getDirectory: storage.getDirectory,
        createArchive: zipArchiveModule.createBrowserLogZipArchive,
        destination: output.destination,
        signal: new AbortController().signal,
      });

      expect(unwrapErr(result)).toBe('failed');
      expect(output.close).not.toHaveBeenCalled();
      expect(output.abort).toHaveBeenCalledTimes(1);
    },
  );

  it('leaves an already locked destination with its original owner', async () => {
    const storage = createStorage();
    const output = createDestination();
    const owner = output.destination.getWriter();
    const getDirectory = jest.fn(storage.getDirectory);
    const result = await exportBrowserLogs({
      getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });

    expect(unwrapErr(result)).toBe('failed');
    expect(getDirectory).not.toHaveBeenCalled();
    expect(output.abort).not.toHaveBeenCalled();
    expect(output.destination.locked).toBe(true);
    owner.releaseLock();
  });

  it.each(['root', 'enumeration', 'open', 'archive', 'finalization', 'write', 'close', 'abort'] as const)(
    'normalizes %s failures without exposing external errors',
    async failure => {
      const storage = createStorage();
      storage.files.set(firstFilename, createFile('{}\n'));
      const directory: BrowserLogExportDirectory = {
        ...storage.directory,
        async getDirectoryHandle() {
          return directory;
        },
        async *values() {
          if (failure === 'enumeration') {
            throw sensitiveFailure;
          }
          yield {kind: 'file', name: firstFilename};
        },
        async getFileHandle(name) {
          if (failure === 'open') {
            throw sensitiveFailure;
          }

          return storage.directory.getFileHandle(name);
        },
      };
      const abortReasons: unknown[] = [];
      let closed = false;
      const destination = new globalThis.WritableStream<Uint8Array>({
        write() {
          if (failure === 'write') {
            throw sensitiveFailure;
          }
        },
        close() {
          closed = true;
          if (failure === 'close') {
            throw sensitiveFailure;
          }
        },
        abort(reason: unknown) {
          abortReasons.push(reason);
          if (failure === 'abort') {
            throw sensitiveFailure;
          }
        },
      });
      const result = await exportBrowserLogs({
        async getDirectory() {
          if (failure === 'root') {
            throw sensitiveFailure;
          }

          return directory;
        },
        createArchive(options) {
          if (failure === 'archive') {
            throw sensitiveFailure;
          }
          const archive = zipArchiveModule.createBrowserLogZipArchive(options);

          return {
            addFile: archive.addFile,
            async close() {
              const shouldFailFinalization = failure === 'finalization' || failure === 'abort';
              if (shouldFailFinalization) {
                throw sensitiveFailure;
              }
              await archive.close();
            },
          };
        },
        destination,
        signal: new AbortController().signal,
      });

      expect(unwrapErr(result)).toBe('failed');
      expect(closed).toBe(failure === 'close');
      const destinationAlreadyErrored = ['write', 'close'].includes(failure);
      expect(abortReasons).toHaveLength(destinationAlreadyErrored ? 0 : 1);
      expect(
        abortReasons.every(reason => {
          return reason instanceof Error && reason.message === 'Log export failed';
        }),
      ).toBe(true);
      expect(destination.locked).toBe(false);
      expect(storage.files.size).toBe(1);
    },
  );

  it.each(['before-start', 'during-read', 'during-finalization'] as const)(
    'cancels %s and aborts output',
    async timing => {
      const storage = createStorage();
      const cancellation = new AbortController();
      const original = createFile('{}\n');
      storage.files.set(firstFilename, {
        ...original,
        slice(start, end) {
          if (timing === 'during-read') {
            cancellation.abort(sensitiveFailure);
          }

          return original.slice(start, end);
        },
      });
      if (timing === 'before-start') {
        cancellation.abort(sensitiveFailure);
      }
      const output = createDestination();
      const result = await exportBrowserLogs({
        getDirectory: storage.getDirectory,
        createArchive(options) {
          const archive = zipArchiveModule.createBrowserLogZipArchive(options);

          return {
            addFile: archive.addFile,
            async close() {
              if (timing === 'during-finalization') {
                cancellation.abort(sensitiveFailure);
              }
              await archive.close();
            },
          };
        },
        destination: output.destination,
        signal: cancellation.signal,
      });

      expect(unwrapErr(result)).toBe('cancelled');
      expect(output.abort.mock.calls).toEqual([[new Error('Log export failed')]]);
      expect(output.close).not.toHaveBeenCalled();
      expect(output.destination.locked).toBe(false);
    },
  );

  it('bounds reads and stops consuming large input while output is backpressured', async () => {
    const storage = createStorage();
    const totalChunks = 512;
    const cancellation = new AbortController();
    const outputBlocked = Promise.withResolvers<'output-blocked'>();
    const resumeOutput = Promise.withResolvers<void>();
    const abort = jest.fn();
    let readChunks = 0;
    let readsAtBlockedWrite = 0;
    let closed = false;
    storage.files.set(firstFilename, {
      size: totalChunks * browserLogExportChunkBytes,
      lastModified: 1000,
      slice(start = 0, end = 0) {
        const lengthBytes = end - start;
        expect(lengthBytes).toBeLessThanOrEqual(browserLogExportChunkBytes);
        readChunks += 1;
        // Deterministic bytes that do not compress into a tiny output.
        const bytes = new Uint8Array(lengthBytes);
        let sequence = start + 1;
        for (let index = 0; index < bytes.length; index += 1) {
          sequence = (Math.imul(sequence, 1664525) + 1013904223) >>> 0;
          bytes[index] = sequence >>> 24;
        }

        return new NodeBlob([bytes]) as Blob;
      },
    });
    const destination = new globalThis.WritableStream<Uint8Array>({
      async write() {
        if (readChunks > 0) {
          readsAtBlockedWrite = readChunks;
          outputBlocked.resolve('output-blocked');
          await resumeOutput.promise;
        }
      },
      close() {
        closed = true;
      },
      abort,
    });
    const completion = exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination,
      signal: cancellation.signal,
    });
    try {
      expect(await Promise.race([outputBlocked.promise, completion])).toBe('output-blocked');
      // Let queued pipeline work advance while the destination holds the write.
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      expect(readChunks).toBeGreaterThan(0);
      expect(readChunks).toBeLessThanOrEqual(readsAtBlockedWrite + 16);
      expect(readChunks).toBeLessThan(totalChunks);
      expect(closed).toBe(false);
    } finally {
      // Test backpressure without compressing the rest of the synthetic file.
      cancellation.abort();
      resumeOutput.resolve();
      await completion;
    }

    expect(unwrapErr(await completion)).toBe('cancelled');
    expect(readChunks).toBeLessThan(totalChunks);
    expect(abort).toHaveBeenCalledTimes(1);
    expect(destination.locked).toBe(false);
    expect(closed).toBe(false);
  });

  it('cancels while a destination write is pending and aborts after that write settles', async () => {
    const storage = createStorage();
    storage.files.set(firstFilename, createFile('{}\n'.repeat(100_000)));
    const cancellation = new AbortController();
    const writeStarted = Promise.withResolvers<void>();
    const finishWrite = Promise.withResolvers<void>();
    const abort = jest.fn();
    const close = jest.fn();
    const destination = new globalThis.WritableStream<Uint8Array>({
      async write() {
        writeStarted.resolve();
        await finishWrite.promise;
      },
      close,
      abort,
    });
    const completion = exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination,
      signal: cancellation.signal,
    });
    await writeStarted.promise;
    cancellation.abort(sensitiveFailure);
    finishWrite.resolve();

    expect(unwrapErr(await completion)).toBe('cancelled');
    expect(abort.mock.calls).toEqual([[new Error('Log export failed')]]);
    expect(close).not.toHaveBeenCalled();
    expect(destination.locked).toBe(false);
  });

  it('finishes successfully when cancellation arrives after destination commit has started', async () => {
    const storage = createStorage();
    const cancellation = new AbortController();
    const abort = jest.fn();
    const chunks: Uint8Array[] = [];
    const destination = new globalThis.WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(chunk.slice());
      },
      close() {
        cancellation.abort(sensitiveFailure);
      },
      abort,
    });
    const result = await exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination,
      signal: cancellation.signal,
    });
    const archive = await readArchive(chunks);

    expect(unwrap(result)).toEqual({exportedFiles: 0, missingFiles: 0});
    expect([...archive.keys()]).toEqual([]);
    expect(abort).not.toHaveBeenCalled();
    expect(destination.locked).toBe(false);
  });

  it('rejects excessive filename metadata before reading the file', async () => {
    const storage = createStorage();
    storage.files.set(firstFilename.replace('-1.jsonl', `-${'1'.repeat(1024)}.jsonl`), createFile('{}\n'));
    const output = createDestination();
    const result = await exportBrowserLogs({
      getDirectory: storage.getDirectory,
      createArchive: zipArchiveModule.createBrowserLogZipArchive,
      destination: output.destination,
      signal: new AbortController().signal,
    });

    expect(unwrapErr(result)).toBe('limit-exceeded');
    expect(output.chunks).toEqual([]);
    expect(output.abort).toHaveBeenCalledTimes(1);
    expect(output.close).not.toHaveBeenCalled();
  });

  it.each([
    {
      fileCount: maximumBrowserLogExportFiles,
      expectedResult: Result.ok({exportedFiles: maximumBrowserLogExportFiles, missingFiles: 0}),
      expectedOpenedFiles: maximumBrowserLogExportFiles,
      expectedAborts: 0,
      expectedCloses: 1,
    },
    {
      fileCount: maximumBrowserLogExportFiles + 1,
      expectedResult: Result.err('limit-exceeded'),
      expectedOpenedFiles: 0,
      expectedAborts: 1,
      expectedCloses: 0,
    },
  ])('enforces the manifest limit before streaming $fileCount files', async testCase => {
    const {fileCount, expectedResult, expectedOpenedFiles, expectedAborts, expectedCloses} = testCase;
    const storage = createStorage();
    for (let sequence = 0; sequence < fileCount; sequence += 1) {
      storage.files.set(firstFilename.replace('-1.jsonl', `-${sequence}.jsonl`), createFile(''));
    }
    const getFileHandle = jest.fn(storage.directory.getFileHandle);
    const directory: BrowserLogExportDirectory = {
      ...storage.directory,
      async getDirectoryHandle() {
        return directory;
      },
      getFileHandle,
    };
    const output = createDestination();
    const result = await exportBrowserLogs({
      async getDirectory() {
        return directory;
      },
      createArchive() {
        return {
          async addFile(options) {
            await options.readable.pipeTo(new globalThis.WritableStream<Uint8Array>());
          },
          async close() {},
        };
      },
      destination: output.destination,
      signal: new AbortController().signal,
    });

    expect(result).toEqual(expectedResult);
    expect(getFileHandle).toHaveBeenCalledTimes(expectedOpenedFiles);
    expect(output.abort).toHaveBeenCalledTimes(expectedAborts);
    expect(output.close).toHaveBeenCalledTimes(expectedCloses);
  });
});
