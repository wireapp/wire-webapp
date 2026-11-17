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

import {result, task, type Task} from 'true-myth';

import {checkBrowserLogExportCancellation} from './browserLogExportPolicy';
import type {
  BrowserLogArchive,
  BrowserLogArchiveOptions,
  BrowserLogExportDirectory,
  BrowserLogExportFailure,
  BrowserLogExportSummary,
} from './browserLogExportTypes';
import {streamBrowserLogFiles} from './streamBrowserLogFiles';
import {withBrowserLogExportDestination} from './withBrowserLogExportDestination';

export type {
  BrowserLogArchive,
  BrowserLogArchiveEntry,
  BrowserLogArchiveOptions,
  BrowserLogExportDirectory,
  BrowserLogExportFailure,
  BrowserLogExportFile,
  BrowserLogExportSummary,
} from './browserLogExportTypes';
export {maximumBrowserLogExportFiles} from './browserLogExportPolicy';
export {browserLogExportChunkBytes} from './streamBrowserLogFiles';

type ExportBrowserLogsOptions = {
  readonly getDirectory: () => Promise<BrowserLogExportDirectory>;
  readonly createArchive: (options: BrowserLogArchiveOptions) => BrowserLogArchive;
  readonly destination: WritableStream<Uint8Array>;
  readonly signal: AbortSignal;
};

type ExportBrowserLogArchiveOptions = {
  readonly getDirectory: ExportBrowserLogsOptions['getDirectory'];
  readonly createArchive: ExportBrowserLogsOptions['createArchive'];
  readonly archiveOptions: BrowserLogArchiveOptions;
};

function finalizeBrowserLogArchive(
  archive: BrowserLogArchive,
  signal: AbortSignal,
): Task<void, BrowserLogExportFailure> {
  return task.fromResult(checkBrowserLogExportCancellation(signal.aborted)).andThen(() => {
    return task.tryOr('failed' as const, () => {
      return archive.close();
    });
  });
}

function exportBrowserLogArchive(
  options: ExportBrowserLogArchiveOptions,
): Task<BrowserLogExportSummary, BrowserLogExportFailure> {
  const {getDirectory, createArchive, archiveOptions} = options;
  const archiveCreation = result.tryOr('failed' as const, () => {
    return createArchive(archiveOptions);
  });

  return task.fromResult(archiveCreation).andThen(archive => {
    return streamBrowserLogFiles({getDirectory, archive, signal: archiveOptions.signal}).andThen(summary => {
      return finalizeBrowserLogArchive(archive, archiveOptions.signal).map(() => {
        return summary;
      });
    });
  });
}

/**
 * Best-effort persisted-files export, not a collection-wide snapshot or a flush barrier.
 * Files missing before entry creation are skipped. A failure or detected change after
 * entry creation aborts the output without retrying an entry or changing source logs.
 */
export function exportBrowserLogs(
  options: ExportBrowserLogsOptions,
): Task<BrowserLogExportSummary, BrowserLogExportFailure> {
  const {getDirectory, createArchive, destination, signal} = options;

  return withBrowserLogExportDestination({
    destination,
    signal,
    exportArchive(archiveOptions) {
      return exportBrowserLogArchive({getDirectory, createArchive, archiveOptions});
    },
  });
}
