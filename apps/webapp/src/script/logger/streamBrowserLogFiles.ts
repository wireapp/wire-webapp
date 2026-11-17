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

import {Maybe, Result, task, type Task} from 'true-myth';

import {
  checkBrowserLogExportCancellation,
  parseBrowserLogFileMetadata,
  selectBrowserLogFile,
  verifyBrowserLogFileUnchanged,
} from './browserLogExportPolicy';
import type {
  BrowserLogArchive,
  BrowserLogExportDirectory,
  BrowserLogExportFailure,
  BrowserLogExportFile,
  BrowserLogExportSummary,
} from './browserLogExportTypes';
import {isMissingEntry} from './createOriginPrivateFileSystemLogStore';
import {logDirectoryName} from './logPersistenceConfiguration';

type StreamBrowserLogFilesOptions = {
  readonly getDirectory: () => Promise<BrowserLogExportDirectory>;
  readonly archive: Pick<BrowserLogArchive, 'addFile'>;
  readonly signal: AbortSignal;
};

type OpenedBrowserLogFile = {
  readonly file: BrowserLogExportFile;
  readonly fileHandle: Awaited<ReturnType<BrowserLogExportDirectory['getFileHandle']>>;
};

type ExportBrowserLogFileOptions = {
  readonly directory: BrowserLogExportDirectory;
  readonly filename: string;
  readonly archive: Pick<BrowserLogArchive, 'addFile'>;
  readonly signal: AbortSignal;
};

export const browserLogExportChunkBytes = 65_536;

function createFileReadable(file: BrowserLogExportFile): ReadableStream<Uint8Array> {
  let offsetBytes = 0;

  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (offsetBytes === file.size) {
          controller.close();

          return;
        }
        const endBytes = Math.min(offsetBytes + browserLogExportChunkBytes, file.size);
        const chunk = new Uint8Array(await file.slice(offsetBytes, endBytes).arrayBuffer());
        if (chunk.byteLength !== endBytes - offsetBytes) {
          throw new Error('Incomplete log file read');
        }
        offsetBytes = endBytes;
        controller.enqueue(chunk);
      },
    },
    {highWaterMark: 0},
  );
}

function openLogDirectory(
  getDirectory: StreamBrowserLogFilesOptions['getDirectory'],
): Task<Maybe<BrowserLogExportDirectory>, 'failed'> {
  return task.tryOr('failed', async () => {
    try {
      const root = await getDirectory();

      return Maybe.just(await root.getDirectoryHandle(logDirectoryName, {create: false}));
    } catch (error: unknown) {
      if (isMissingEntry(error)) {
        return Maybe.nothing();
      }

      throw error;
    }
  });
}

function openLogFile(
  directory: BrowserLogExportDirectory,
  filename: string,
): Task<Maybe<OpenedBrowserLogFile>, 'failed'> {
  return task.tryOr('failed', async () => {
    try {
      const fileHandle = await directory.getFileHandle(filename);
      const file = await fileHandle.getFile();

      return Maybe.just({fileHandle, file});
    } catch (error: unknown) {
      if (isMissingEntry(error)) {
        return Maybe.nothing();
      }

      throw error;
    }
  });
}

function exportLogFile(options: ExportBrowserLogFileOptions): Task<'exported' | 'missing', BrowserLogExportFailure> {
  const {directory, filename, archive, signal} = options;

  return openLogFile(directory, filename).andThen(openedFile => {
    return openedFile.match<Task<'exported' | 'missing', BrowserLogExportFailure>>({
      Nothing() {
        return task.resolve('missing' as const);
      },
      Just(opened) {
        const {file, fileHandle} = opened;

        return task.fromResult(parseBrowserLogFileMetadata(file)).andThen(originalMetadata => {
          return task
            .fromResult(checkBrowserLogExportCancellation(signal.aborted))
            .andThen(() => {
              return task.tryOr('failed' as const, () => {
                return archive.addFile({filename, readable: createFileReadable(file)});
              });
            })
            .andThen(() => {
              return task.tryOr('failed' as const, () => {
                return fileHandle.getFile();
              });
            })
            .andThen(currentFile => {
              // This detects ordinary changes, not a durable or collection-wide snapshot.
              return parseBrowserLogFileMetadata(currentFile).andThen(currentMetadata => {
                return verifyBrowserLogFileUnchanged(originalMetadata, currentMetadata);
              });
            })
            .map(() => {
              return 'exported' as const;
            });
        });
      },
    });
  });
}

function streamLogDirectory(
  directory: BrowserLogExportDirectory,
  options: StreamBrowserLogFilesOptions,
): Task<BrowserLogExportSummary, BrowserLogExportFailure> {
  const {archive, signal} = options;

  return task
    .tryOr<Result<BrowserLogExportSummary, BrowserLogExportFailure>, BrowserLogExportFailure>('failed', async () => {
      let exportedFiles = 0;
      let missingFiles = 0;
      // Keep iteration sequential and stack-bounded; no manifest or recursive Task chain.
      for await (const entry of directory.values()) {
        const selection = checkBrowserLogExportCancellation(signal.aborted).andThen(() => {
          return selectBrowserLogFile({entry, exportedFiles});
        });
        if (selection.isErr) {
          return Result.err(selection.error);
        }
        if (selection.value.isNothing) {
          continue;
        }
        const fileExport = await exportLogFile({directory, filename: selection.value.value, archive, signal});
        if (fileExport.isErr) {
          return Result.err(fileExport.error);
        }
        if (fileExport.value === 'missing') {
          missingFiles += 1;
        } else {
          exportedFiles += 1;
        }
      }

      return Result.ok({exportedFiles, missingFiles});
    })
    .andThen(outcome => {
      return outcome;
    });
}

export function streamBrowserLogFiles(
  options: StreamBrowserLogFilesOptions,
): Task<BrowserLogExportSummary, BrowserLogExportFailure> {
  const {getDirectory} = options;

  return openLogDirectory(getDirectory).andThen(directory => {
    return directory.match({
      Nothing() {
        return task.resolve({exportedFiles: 0, missingFiles: 0});
      },
      Just(openedDirectory) {
        return streamLogDirectory(openedDirectory, options);
      },
    });
  });
}
