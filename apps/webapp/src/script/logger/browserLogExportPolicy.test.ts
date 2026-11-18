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

import {Maybe} from 'true-myth';

import {unwrap, unwrapErr} from '../util/test/resultTestSupport';

import {
  maximumBrowserLogExportFiles,
  parseBrowserLogFileMetadata,
  selectBrowserLogFile,
  verifyBrowserLogFileUnchanged,
} from './browserLogExportPolicy';

const unattributedFilename = 'log-1000-00000000-0000-4000-8000-000000000001-1.jsonl';
const unattributedArchivePath = '1970-01-01/browser-1970-01-01T00-00-01.000Z-1.jsonl';

describe('browser log export policy', () => {
  it.each([
    [Date.UTC(2026, 10, 17, 23, 59, 59, 999), '2026-11-17', '23-59-59.999', ''],
    [Date.UTC(2026, 10, 18), '2026-11-18', '00-00-00.000', 'a'.repeat(64)],
  ])('groups timestamp %s by UTC creation date and account', (timestamp, date, time, accountIdentifier) => {
    const accountSuffix = accountIdentifier === '' ? '' : `-${accountIdentifier}`;
    const sourceFilename = `log-${timestamp}-00000000-0000-4000-8000-000000000001-1${accountSuffix}.jsonl`;
    const selection = selectBrowserLogFile({
      entry: {kind: 'file', name: sourceFilename},
      archivePaths: new Set(),
    });
    const archiveDirectory = accountIdentifier === '' ? date : `${date}/accounts/${accountIdentifier}`;
    const archivePath = `${archiveDirectory}/browser-${date}T${time}Z-1.jsonl`;

    expect(unwrap(selection)).toEqual(Maybe.just({sourceFilename, archivePath}));
  });

  it.each([
    {kind: 'directory' as const, name: unattributedFilename},
    {kind: 'file' as const, name: 'private.jsonl'},
    {kind: 'file' as const, name: unattributedFilename.replace('1000', '99999999999999999999')},
    {kind: 'file' as const, name: unattributedFilename.replace('1000', '8640000000000001')},
    {kind: 'file' as const, name: unattributedFilename.replace('1000', '253402300800000')},
  ])('ignores unrelated entry $name even at the metadata limit', entry => {
    const archivePaths = new Set(
      Array.from({length: maximumBrowserLogExportFiles}, (_, index) => {
        return String(index);
      }),
    );
    const selection = selectBrowserLogFile({entry, archivePaths});

    expect(unwrap(selection).isNothing).toBe(true);
  });

  it('allows the last permitted entry and rejects the next owned file', () => {
    const entry = {kind: 'file' as const, name: unattributedFilename};
    const archivePaths = new Set(
      Array.from({length: maximumBrowserLogExportFiles - 1}, (_, index) => {
        return String(index);
      }),
    );
    const lastPermitted = selectBrowserLogFile({entry, archivePaths});
    archivePaths.add(unattributedArchivePath);
    const excess = selectBrowserLogFile({entry, archivePaths});

    expect(unwrap(lastPermitted)).toEqual(
      Maybe.just({sourceFilename: unattributedFilename, archivePath: unattributedArchivePath}),
    );
    expect(unwrapErr(excess)).toBe('limit-exceeded');
  });

  it.each([
    {size: -1, lastModified: 1000},
    {size: Number.MAX_SAFE_INTEGER + 1, lastModified: 1000},
    {size: 0, lastModified: Number.NaN},
  ])('rejects untrusted file metadata $size / $lastModified', metadata => {
    expect(unwrapErr(parseBrowserLogFileMetadata(metadata))).toBe('failed');
  });

  it('normalizes metadata for an empty file', () => {
    const metadata = parseBrowserLogFileMetadata({size: 0, lastModified: 1000});

    expect(unwrap(metadata)).toEqual({sizeBytes: 0, modifiedAtMilliseconds: 1000});
  });

  it.each([
    {sizeBytes: 4, modifiedAtMilliseconds: 1000},
    {sizeBytes: 0, modifiedAtMilliseconds: 1000},
    {sizeBytes: 3, modifiedAtMilliseconds: 2000},
  ])('rejects changed file metadata $sizeBytes / $modifiedAtMilliseconds', current => {
    const original = {sizeBytes: 3, modifiedAtMilliseconds: 1000};

    expect(unwrapErr(verifyBrowserLogFileUnchanged(original, current))).toBe('failed');
  });
});
