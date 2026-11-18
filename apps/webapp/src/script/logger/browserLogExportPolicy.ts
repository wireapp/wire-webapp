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
  readonly discoveredFiles: number;
};

export type BrowserLogSource = {
  readonly sourceFilename: string;
  readonly archiveDirectory: string;
  readonly createdAtMilliseconds: number;
};

type BrowserLogArchiveEntryPath = {
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

export function selectBrowserLogFile(
  options: SelectBrowserLogFileOptions,
): Result<Maybe<BrowserLogSource>, 'limit-exceeded'> {
  const {entry} = options;
  if (entry.kind !== 'file') {
    return Result.ok(Maybe.nothing());
  }
  const match = logFilenamePattern.exec(entry.name);
  if (isNull(match)) {
    return Result.ok(Maybe.nothing());
  }
  const [, creationTimestamp, , , accountIdentifier] = match;
  const createdAtMilliseconds = Number(creationTimestamp);
  if (!isValidCreationTimestamp(createdAtMilliseconds)) {
    return Result.ok(Maybe.nothing());
  }
  if (exceedsMetadataLimit(options)) {
    return Result.err('limit-exceeded');
  }

  const creationDate = new Date(createdAtMilliseconds).toISOString().slice(0, utcDateLength);
  const archiveDirectory = isUndefined(accountIdentifier)
    ? creationDate
    : `${creationDate}/accounts/${accountIdentifier}`;
  return Result.ok(Maybe.just({sourceFilename: entry.name, archiveDirectory, createdAtMilliseconds}));
}

function exceedsMetadataLimit(options: SelectBrowserLogFileOptions): boolean {
  const {entry, discoveredFiles} = options;

  // Owned filenames contain only ASCII, so character and byte counts agree.
  return discoveredFiles >= maximumBrowserLogExportFiles || entry.name.length > maximumFilenameBytes;
}

function compareAscii(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function compareBrowserLogSources(left: BrowserLogSource, right: BrowserLogSource): number {
  const directoryOrder = compareAscii(left.archiveDirectory, right.archiveDirectory);
  if (directoryOrder !== 0) {
    return directoryOrder;
  }
  const newestFirstOrder = right.createdAtMilliseconds - left.createdAtMilliseconds;
  if (newestFirstOrder !== 0) {
    return newestFirstOrder;
  }

  // Comparing the full source name breaks ties by the persisted session and sequence without locale rules.
  return compareAscii(left.sourceFilename, right.sourceFilename);
}

export function createBrowserLogArchiveManifest(
  sources: readonly BrowserLogSource[],
): readonly BrowserLogArchiveEntryPath[] {
  let previousDirectory: string | undefined;
  let previousTimestamp: number | undefined;
  let collisionIndex = 0;

  return sources.toSorted(compareBrowserLogSources).map(source => {
    const {sourceFilename, archiveDirectory, createdAtMilliseconds} = source;
    if (archiveDirectory !== previousDirectory) {
      previousDirectory = archiveDirectory;
      previousTimestamp = createdAtMilliseconds;
      collisionIndex = 0;

      return {sourceFilename, archivePath: `${archiveDirectory}/application.jsonl`};
    }
    if (createdAtMilliseconds !== previousTimestamp) {
      previousTimestamp = createdAtMilliseconds;
      collisionIndex = 0;
    }
    const archivePath = `${archiveDirectory}/application.old.${createdAtMilliseconds}-${collisionIndex}.jsonl`;
    collisionIndex += 1;

    return {sourceFilename, archivePath};
  });
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
