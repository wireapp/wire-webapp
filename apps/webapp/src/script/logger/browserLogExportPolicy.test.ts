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

import {unwrap, unwrapErr} from '../util/test/resultTestSupport';

import {
  createBrowserLogArchiveManifest,
  maximumBrowserLogExportFiles,
  parseBrowserLogFileMetadata,
  selectBrowserLogFile,
  verifyBrowserLogFileUnchanged,
} from './browserLogExportPolicy';

const unattributedFilename = 'log-1000-00000000-0000-4000-8000-000000000001-1.jsonl';
const unattributedArchivePath = '1970-01-01/application.jsonl';

describe('browser log export policy', () => {
  it.each([
    [Date.UTC(2026, 10, 17, 23, 59, 59, 999), '2026-11-17', ''],
    [Date.UTC(2026, 10, 18), '2026-11-18', 'a'.repeat(64)],
  ])('groups timestamp %s by UTC creation date and account', (timestamp, date, accountIdentifier) => {
    const accountSuffix = accountIdentifier === '' ? '' : `-${accountIdentifier}`;
    const sourceFilename = `log-${timestamp}-00000000-0000-4000-8000-000000000001-1${accountSuffix}.jsonl`;
    const selection = selectBrowserLogFile({
      entry: {kind: 'file', name: sourceFilename},
      discoveredFiles: 0,
    });
    const archiveDirectory = accountIdentifier === '' ? date : `${date}/accounts/${accountIdentifier}`;
    const sources = unwrap(selection)
      .map(source => {
        return [source];
      })
      .unwrapOr([]);
    const manifest = createBrowserLogArchiveManifest(sources);

    expect(manifest).toEqual([{sourceFilename, archivePath: `${archiveDirectory}/application.jsonl`}]);
  });

  it.each([
    {kind: 'directory' as const, name: unattributedFilename},
    {kind: 'file' as const, name: 'private.jsonl'},
    {kind: 'file' as const, name: unattributedFilename.replace('1000', '99999999999999999999')},
    {kind: 'file' as const, name: unattributedFilename.replace('1000', '8640000000000001')},
    {kind: 'file' as const, name: unattributedFilename.replace('1000', '253402300800000')},
  ])('ignores unrelated entry $name even at the metadata limit', entry => {
    const selection = selectBrowserLogFile({entry, discoveredFiles: maximumBrowserLogExportFiles});

    expect(unwrap(selection).isNothing).toBe(true);
  });

  it('allows the last permitted entry and rejects the next owned file', () => {
    const entry = {kind: 'file' as const, name: unattributedFilename};
    const lastPermitted = selectBrowserLogFile({entry, discoveredFiles: maximumBrowserLogExportFiles - 1});
    const excess = selectBrowserLogFile({entry, discoveredFiles: maximumBrowserLogExportFiles});
    const sources = unwrap(lastPermitted)
      .map(source => {
        return [source];
      })
      .unwrapOr([]);

    expect(createBrowserLogArchiveManifest(sources)).toEqual([
      {sourceFilename: unattributedFilename, archivePath: unattributedArchivePath},
    ]);
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
