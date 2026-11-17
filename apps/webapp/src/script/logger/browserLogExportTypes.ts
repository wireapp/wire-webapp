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

export type BrowserLogExportFile = Pick<File, 'size' | 'lastModified' | 'slice'>;

export type BrowserLogExportDirectory = {
  readonly getDirectoryHandle: (
    name: string,
    options: FileSystemGetDirectoryOptions,
  ) => Promise<BrowserLogExportDirectory>;
  readonly values: () => AsyncIterable<Pick<FileSystemHandle, 'name' | 'kind'>>;
  readonly getFileHandle: (name: string) => Promise<{readonly getFile: () => Promise<BrowserLogExportFile>}>;
};

export type BrowserLogArchiveEntry = {
  readonly filename: string;
  readonly readable: ReadableStream<Uint8Array>;
};

export type BrowserLogArchive = {
  readonly addFile: (options: BrowserLogArchiveEntry) => Promise<void>;
  // Writes the central directory. The export operation owns destination close/abort.
  readonly close: () => Promise<void>;
};

export type BrowserLogArchiveOptions = {
  readonly destination: WritableStream<Uint8Array>;
  readonly signal: AbortSignal;
};

export type BrowserLogExportSummary = {
  readonly exportedFiles: number;
  readonly missingFiles: number;
};

export type BrowserLogExportFailure = 'failed' | 'cancelled' | 'limit-exceeded';
