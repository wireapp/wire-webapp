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

import {isNull, isSafeInteger, isUndefined} from '@sindresorhus/is';
import {Maybe, Result} from 'true-myth';

import {logFilenamePattern} from './createOriginPrivateFileSystemLogStore';

type SelectBrowserLogFileOptions = {
  readonly entry: Pick<FileSystemHandle, 'name' | 'kind'>;
  readonly archivePaths: ReadonlySet<string>;
};

type BrowserLogFileSelection = {
  readonly sourceFilename: string;
  readonly archivePath: string;
};

export type BrowserLogFileMetadata = {
  readonly sizeBytes: number;
  readonly modifiedAtMilliseconds: number;
};

// Streaming ZIP writers still retain central-directory metadata for every entry.
export const maximumBrowserLogExportFiles = 4096;
const maximumFilenameBytes = 1024;
const lastFourDigitYearMilliseconds = Date.parse('9999-12-31T23:59:59.999Z');
const utcDateLength = 10;

function isValidCreationTimestamp(milliseconds: number): boolean {
  return isSafeInteger(milliseconds) && milliseconds >= 0 && milliseconds <= lastFourDigitYearMilliseconds;
}

function createArchivePath(sourceFilename: string, archivePaths: ReadonlySet<string>): Maybe<string> {
  const match = logFilenamePattern.exec(sourceFilename);
  if (isNull(match)) {
    return Maybe.nothing();
  }
  const [, creationTimestamp, , sequence, accountIdentifier] = match;
  const createdAtMilliseconds = Number(creationTimestamp);
  if (!isValidCreationTimestamp(createdAtMilliseconds)) {
    return Maybe.nothing();
  }
  if (isUndefined(sequence)) {
    return Maybe.nothing();
  }

  const creationTime = new Date(createdAtMilliseconds).toISOString();
  const creationDate = creationTime.slice(0, utcDateLength);
  const archiveDirectory = isUndefined(accountIdentifier)
    ? creationDate
    : `${creationDate}/accounts/${accountIdentifier}`;
  const pathWithoutExtension = `${archiveDirectory}/browser-${creationTime.replaceAll(':', '-')}-${sequence}`;
  const ordinaryPath = `${pathWithoutExtension}.jsonl`;

  // A collision suffix adds a segment ordinary paths cannot have. The ordinal is unique within this export.
  return Maybe.just(
    archivePaths.has(ordinaryPath) ? `${pathWithoutExtension}-${archivePaths.size + 1}.jsonl` : ordinaryPath,
  );
}

function exceedsMetadataLimit(options: SelectBrowserLogFileOptions): boolean {
  const {entry, archivePaths} = options;

  // Owned filenames contain only ASCII, so character and byte counts agree.
  return archivePaths.size >= maximumBrowserLogExportFiles || entry.name.length > maximumFilenameBytes;
}

export function selectBrowserLogFile(
  options: SelectBrowserLogFileOptions,
): Result<Maybe<BrowserLogFileSelection>, 'limit-exceeded'> {
  const {entry, archivePaths} = options;
  if (entry.kind !== 'file') {
    return Result.ok(Maybe.nothing());
  }
  const archivePath = createArchivePath(entry.name, archivePaths);
  if (archivePath.isNothing) {
    return Result.ok(Maybe.nothing());
  }
  if (exceedsMetadataLimit(options)) {
    return Result.err('limit-exceeded');
  }

  return Result.ok(Maybe.just({sourceFilename: entry.name, archivePath: archivePath.value}));
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
