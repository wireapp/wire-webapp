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
 */

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {WritableStream} from 'node:stream/web';
import {Maybe, Result} from 'true-myth';
import {match} from 'ts-pattern';

import type {ApplicationLogDownload} from './applicationLogDownload';
import {createBrowserLogDownload} from './createBrowserLogDownload';
import type {BrowserLogArchive, BrowserLogArchiveOptions, BrowserLogExportDirectory} from './exportBrowserLogs';

import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';

type BrowserLogDownloadTestOptions = Parameters<typeof createBrowserLogDownload>[0];

function withWritableStream(test: () => Promise<void>): () => Promise<void> {
  return async function runWithWritableStream(): Promise<void> {
    const streamScope: Partial<Pick<typeof globalThis, 'WritableStream'>> = globalThis;
    const originalWritableStream = Maybe.of(Object.getOwnPropertyDescriptor(streamScope, 'WritableStream'));
    Object.defineProperty(streamScope, 'WritableStream', {configurable: true, value: WritableStream});
    try {
      await test();
    } finally {
      originalWritableStream.match({
        Just(descriptor) {
          Object.defineProperty(streamScope, 'WritableStream', descriptor);
        },
        Nothing() {
          delete streamScope.WritableStream;
        },
      });
    }
  };
}

function requireDownloadForTest(download: Maybe<ApplicationLogDownload>): ApplicationLogDownload {
  return download.unwrapOrElse(() => {
    throw new Error('Expected browser log downloads to be available');
  });
}

describe('browser log download', () => {
  function createDownloadDependencies(
    initialUnixEpochMilliseconds = Date.UTC(2026, 10, 17, 9, 5),
  ): BrowserLogDownloadTestOptions & {
    readonly clock: ReturnType<typeof createDeterministicClock>;
    readonly pickSaveFile: jest.Mock;
    readonly getDirectory: jest.Mock<Promise<BrowserLogExportDirectory>, []>;
    readonly createArchive: jest.Mock<BrowserLogArchive, [BrowserLogArchiveOptions]>;
    readonly write: jest.Mock;
    readonly close: jest.Mock;
    readonly abort: jest.Mock;
  } {
    const close = jest.fn();
    const abort = jest.fn();
    const write = jest.fn();
    const directory: BrowserLogExportDirectory = {
      async getDirectoryHandle() {
        return directory;
      },
      async *values() {},
      async getFileHandle() {
        throw new Error('Empty directory');
      },
    };
    const pickSaveFile = jest.fn(async function pickSaveFile(): Promise<Pick<FileSystemFileHandle, 'createWritable'>> {
      return {
        createWritable: jest.fn(async () => {
          return new WritableStream<Uint8Array>({
            write(chunk) {
              write(chunk);
            },
            close,
            abort,
          }) as FileSystemWritableFileStream;
        }),
      };
    });

    return {
      pickSaveFile,
      write,
      close,
      abort,
      startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch('?enabled-features=persistent-browser-logs'),
      isElectron: false,
      clock: createDeterministicClock({
        initialUnixEpochMicroseconds: BigInt(initialUnixEpochMilliseconds) * 1_000n,
      }),
      showSaveFilePicker: Maybe.just(pickSaveFile),
      getDirectory: jest.fn(async () => {
        return directory;
      }),
      createArchive: jest.fn((options: BrowserLogArchiveOptions) => {
        return {
          async addFile() {},
          async close() {
            const writer = options.destination.getWriter();
            try {
              await writer.write(new Uint8Array([80, 75, 5, 6]));
            } finally {
              writer.releaseLock();
            }
          },
        };
      }),
    };
  }

  it.each(['electron', 'missing-picker', 'disabled-feature'] as const)(
    'hides downloads for %s',
    unavailableCapability => {
      const dependencies = createDownloadDependencies();
      const download = createBrowserLogDownload({
        startupFeatureToggles:
          unavailableCapability === 'disabled-feature'
            ? createStartupFeatureTogglesFromLocationSearch('')
            : dependencies.startupFeatureToggles,
        isElectron: unavailableCapability === 'electron',
        showSaveFilePicker:
          unavailableCapability === 'missing-picker' ? Maybe.nothing() : dependencies.showSaveFilePicker,
        clock: dependencies.clock,
        getDirectory: dependencies.getDirectory,
        createArchive: dependencies.createArchive,
      });
      expect(download.isNothing).toBe(true);
      expect(dependencies.pickSaveFile).not.toHaveBeenCalled();
      expect(dependencies.getDirectory).not.toHaveBeenCalled();
    },
  );

  it.each([null, false, {}, 'unsupported'])('requires a callable picker capability: %p', picker => {
    const dependencies = createDownloadDependencies();
    const download = createBrowserLogDownload({
      startupFeatureToggles: dependencies.startupFeatureToggles,
      isElectron: dependencies.isElectron,
      // Model a browser exposing a non-callable picker despite its ambient type.
      showSaveFilePicker: Maybe.of(picker) as BrowserLogDownloadTestOptions['showSaveFilePicker'],
      clock: dependencies.clock,
      getDirectory: dependencies.getDirectory,
      createArchive: dependencies.createArchive,
    });
    expect(download.isNothing).toBe(true);
  });

  it(
    'opens the picker synchronously with a UTC filename and commits the selected writable',
    withWritableStream(async () => {
      const dependencies = createDownloadDependencies();
      const download = requireDownloadForTest(createBrowserLogDownload(dependencies));
      const completion = download();
      expect(dependencies.pickSaveFile).toHaveBeenCalledWith({
        suggestedName: 'wire-logs-2026-11-17-09-05Z.zip',
        types: [{description: 'ZIP archive', accept: {'application/zip': ['.zip']}}],
      });
      expect(dependencies.getDirectory).not.toHaveBeenCalled();
      expect(await completion).toEqual(Result.ok('saved'));
      expect(dependencies.write).toHaveBeenCalledWith(new Uint8Array([80, 75, 5, 6]));
      expect(dependencies.close).toHaveBeenCalledTimes(1);
      expect(dependencies.abort).not.toHaveBeenCalled();
    }),
  );

  it(
    'reads the clock at each click rather than capturing the startup time',
    withWritableStream(async () => {
      const dependencies = createDownloadDependencies();
      const download = requireDownloadForTest(createBrowserLogDownload(dependencies));
      dependencies.clock.advanceByMilliseconds(60_000);

      expect(await download()).toEqual(Result.ok('saved'));
      expect(dependencies.pickSaveFile).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({suggestedName: 'wire-logs-2026-11-17-09-06Z.zip'}),
      );

      dependencies.clock.advanceByMilliseconds(60_000);

      expect(await download()).toEqual(Result.ok('saved'));
      expect(dependencies.pickSaveFile).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({suggestedName: 'wire-logs-2026-11-17-09-07Z.zip'}),
      );
    }),
  );

  it.each([
    [Date.UTC(2026, 10, 17, 23, 59, 59, 999), 'wire-logs-2026-11-17-23-59Z.zip'],
    [Date.UTC(2026, 10, 18, 0, 0), 'wire-logs-2026-11-18-00-00Z.zip'],
    [Date.UTC(2026, 2, 29, 0, 59), 'wire-logs-2026-03-29-00-59Z.zip'],
    [Date.UTC(2026, 2, 29, 1, 0), 'wire-logs-2026-03-29-01-00Z.zip'],
    [Date.UTC(2026, 10, 1, 8, 59), 'wire-logs-2026-11-01-08-59Z.zip'],
    [Date.UTC(2026, 10, 1, 9, 0), 'wire-logs-2026-11-01-09-00Z.zip'],
  ])('suggests the UTC filename for epoch milliseconds %i', async (timestamp, suggestedName) => {
    const dependencies = createDownloadDependencies(timestamp);
    dependencies.pickSaveFile.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'));
    const download = requireDownloadForTest(createBrowserLogDownload(dependencies));

    expect(await download()).toEqual(Result.ok('cancelled'));
    expect(dependencies.pickSaveFile).toHaveBeenCalledWith(expect.objectContaining({suggestedName}));
  });

  it('treats picker cancellation silently without accessing storage or creating an archive', async () => {
    const dependencies = createDownloadDependencies();
    dependencies.pickSaveFile.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'));
    const download = requireDownloadForTest(createBrowserLogDownload(dependencies));
    expect(await download()).toEqual(Result.ok('cancelled'));
    expect(dependencies.getDirectory).not.toHaveBeenCalled();
    expect(dependencies.createArchive).not.toHaveBeenCalled();
  });

  it('reports genuine picker failures', async () => {
    const dependencies = createDownloadDependencies();
    dependencies.pickSaveFile.mockImplementationOnce(function pickSaveFile(): never {
      throw new DOMException('Permission denied', 'SecurityError');
    });
    const download = requireDownloadForTest(createBrowserLogDownload(dependencies));
    expect(await download()).toEqual(Result.err('failed'));
    expect(dependencies.getDirectory).not.toHaveBeenCalled();
  });

  it('reports AbortError-shaped values that are not DOM exceptions as failures', async () => {
    const dependencies = createDownloadDependencies();
    dependencies.pickSaveFile.mockRejectedValueOnce({name: 'AbortError'});
    const download = requireDownloadForTest(createBrowserLogDownload(dependencies));
    expect(await download()).toEqual(Result.err('failed'));
    expect(dependencies.getDirectory).not.toHaveBeenCalled();
  });

  it('reports createWritable failures without starting the export', async () => {
    const dependencies = createDownloadDependencies();
    dependencies.pickSaveFile.mockResolvedValueOnce({
      async createWritable() {
        throw new DOMException('Write failed', 'AbortError');
      },
    });
    const download = requireDownloadForTest(createBrowserLogDownload(dependencies));
    expect(await download()).toEqual(Result.err('failed'));
    expect(dependencies.getDirectory).not.toHaveBeenCalled();
  });

  it.each(['storage', 'archive', 'close'] as const)(
    'reports %s failures and cleans up the selected destination',
    failure => {
      return withWritableStream(async () => {
        const dependencies = createDownloadDependencies();
        match(failure)
          .with('storage', () => {
            dependencies.getDirectory.mockRejectedValueOnce(new Error('Cannot read logs'));
          })
          .with('archive', () => {
            dependencies.createArchive.mockImplementationOnce(function createArchive(): never {
              throw new Error('Cannot create ZIP');
            });
          })
          .with('close', () => {
            dependencies.close.mockRejectedValue(new Error('Cannot commit file'));
          })
          .exhaustive();
        const download = requireDownloadForTest(createBrowserLogDownload(dependencies));
        expect(await download()).toEqual(Result.err('failed'));
        // An already errored stream does not invoke its sink's abort callback again.
        expect(dependencies.abort).toHaveBeenCalledTimes(failure === 'close' ? 0 : 1);
      })();
    },
  );
});
