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
import {Maybe, Result} from 'true-myth';

import {logFilenamePattern} from './createOriginPrivateFileSystemLogStore';

type SelectBrowserLogFileOptions = {
  readonly entry: Pick<FileSystemHandle, 'name' | 'kind'>;
  readonly exportedFiles: number;
};

export type BrowserLogFileMetadata = {
  readonly sizeBytes: number;
  readonly modifiedAtMilliseconds: number;
};

// Streaming ZIP writers still retain central-directory metadata for every entry.
export const maximumBrowserLogExportFiles = 4096;
const maximumFilenameBytes = 1024;

function isOwnedLogFile(entry: SelectBrowserLogFileOptions['entry']): boolean {
  if (entry.kind !== 'file') {
    return false;
  }
  const match = logFilenamePattern.exec(entry.name);
  if (isNull(match)) {
    return false;
  }

  return isSafeInteger(Number(match.at(1)));
}

function exceedsMetadataLimit(options: SelectBrowserLogFileOptions): boolean {
  const {entry, exportedFiles} = options;

  // Owned filenames contain only ASCII, so character and byte counts agree.
  return exportedFiles >= maximumBrowserLogExportFiles || entry.name.length > maximumFilenameBytes;
}

export function selectBrowserLogFile(options: SelectBrowserLogFileOptions): Result<Maybe<string>, 'limit-exceeded'> {
  const {entry} = options;
  if (!isOwnedLogFile(entry)) {
    return Result.ok(Maybe.nothing());
  }
  if (exceedsMetadataLimit(options)) {
    return Result.err('limit-exceeded');
  }

  return Result.ok(Maybe.just(entry.name));
}

function isValidFileMetadata(file: Pick<File, 'size' | 'lastModified'>): boolean {
  return isSafeInteger(file.size) && file.size >= 0 && isSafeInteger(file.lastModified);
}

export function parseBrowserLogFileMetadata(
  file: Pick<File, 'size' | 'lastModified'>,
): Result<BrowserLogFileMetadata, 'failed'> {
  if (!isValidFileMetadata(file)) {
    return Result.err('failed');
  }

  return Result.ok({sizeBytes: file.size, modifiedAtMilliseconds: file.lastModified});
}

export function verifyBrowserLogFileUnchanged(
  original: BrowserLogFileMetadata,
  current: BrowserLogFileMetadata,
): Result<void, 'failed'> {
  const changed =
    original.sizeBytes !== current.sizeBytes || original.modifiedAtMilliseconds !== current.modifiedAtMilliseconds;
  if (changed) {
    return Result.err('failed');
  }

  return Result.ok(undefined);
}

export function checkBrowserLogExportCancellation(cancelled: boolean): Result<void, 'cancelled'> {
  return cancelled ? Result.err('cancelled') : Result.ok(undefined);
}
