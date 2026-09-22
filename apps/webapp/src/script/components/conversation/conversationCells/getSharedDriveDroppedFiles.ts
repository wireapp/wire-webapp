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

import {Task, task} from 'true-myth';

interface DroppedFileEntry {
  readonly isDirectory: false;
  readonly isFile: true;
  readonly name: string;
  readonly fullPath: string;
  readonly file: (success: (file: File) => void, failure?: (error?: DOMException) => void) => void;
}

interface DroppedDirectoryReader {
  readonly readEntries: (success: (entries: DroppedEntry[]) => void, failure?: (error?: DOMException) => void) => void;
}

interface DroppedDirectoryEntry {
  readonly isDirectory: true;
  readonly isFile: false;
  readonly name: string;
  readonly fullPath: string;
  readonly createReader: () => DroppedDirectoryReader;
}

type DroppedEntry = DroppedFileEntry | DroppedDirectoryEntry;

interface DataTransferItemWithEntry {
  readonly webkitGetAsEntry?: () => DroppedEntry | null;
}

export interface SharedDriveDropReadError {
  readonly cause: unknown;
  readonly path: string;
}

const toReadError =
  (path: string) =>
  (cause: unknown): SharedDriveDropReadError => ({cause, path});

const withRelativePath = (file: File, entry: DroppedFileEntry): File => {
  const relativePath = entry.fullPath.replace(/^\/+/, '') || entry.name;
  if (relativePath === file.name) {
    return file;
  }

  const fileWithRelativePath = new File([file], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
  Object.defineProperty(fileWithRelativePath, 'webkitRelativePath', {value: relativePath});
  return fileWithRelativePath;
};

const readFileEntry = (entry: DroppedFileEntry): Task<File[], SharedDriveDropReadError> =>
  task.tryOrElse(
    toReadError(entry.fullPath),
    () =>
      new Promise<File[]>((resolve, reject) => {
        entry.file(file => resolve([withRelativePath(file, entry)]), reject);
      }),
  );

const readDirectoryEntries = (entry: DroppedDirectoryEntry): Task<DroppedEntry[], SharedDriveDropReadError> =>
  task.tryOrElse(
    toReadError(entry.fullPath),
    () =>
      new Promise<DroppedEntry[]>((resolve, reject) => {
        const reader = entry.createReader();
        const entries: DroppedEntry[] = [];
        const readNextBatch = (): void => {
          // Chromium returns directory entries in batches, so reading must continue
          // until an empty batch signals that the directory is exhausted.
          reader.readEntries(batch => {
            if (batch.length === 0) {
              resolve(entries);
              return;
            }

            entries.push(...batch);
            readNextBatch();
          }, reject);
        };

        readNextBatch();
      }),
  );

const readEntryFiles = (entry: DroppedEntry): Task<File[], SharedDriveDropReadError> => {
  if (entry.isFile) {
    return readFileEntry(entry);
  }

  return readDirectoryEntries(entry).andThen(childEntries =>
    task.all(childEntries.map(readEntryFiles)).map(childFiles => childFiles.flat()),
  );
};

/**
 * Expands folders from a browser drop while retaining the relative path used
 * by the existing Shared Drive folder-upload pipeline.
 * Every drop returns a Task so callers use one success/failure flow; ordinary
 * files still resolve directly from dataTransfer.files without entry traversal.
 */
export const getSharedDriveDroppedFiles = (dataTransfer: DataTransfer): Task<File[], SharedDriveDropReadError> =>
  task
    .tryOrElse(toReadError(''), async () =>
      Array.from(dataTransfer.items ?? [])
        .map(item => (item as unknown as DataTransferItemWithEntry).webkitGetAsEntry?.() ?? null)
        .filter((entry): entry is DroppedEntry => entry !== null),
    )
    .andThen(entries => {
      if (!entries.some(entry => entry.isDirectory)) {
        return task.resolve(Array.from(dataTransfer.files));
      }

      return task.all(entries.map(readEntryFiles)).map(files => files.flat());
    });
