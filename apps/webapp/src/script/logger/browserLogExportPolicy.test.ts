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
  maximumBrowserLogExportFiles,
  parseBrowserLogFileMetadata,
  selectBrowserLogFile,
  verifyBrowserLogFileUnchanged,
} from './browserLogExportPolicy';

const unattributedFilename = 'log-1000-00000000-0000-4000-8000-000000000001-1.jsonl';

describe('browser log export policy', () => {
  it.each(['', `-${'a'.repeat(64)}`, `-${'b'.repeat(64)}`])('selects owned files with account suffix %s', suffix => {
    const filename = unattributedFilename.replace('.jsonl', `${suffix}.jsonl`);
    const selection = selectBrowserLogFile({entry: {kind: 'file', name: filename}, exportedFiles: 0});

    expect(unwrap(selection).unwrapOr('missing')).toBe(filename);
  });

  it.each([
    {kind: 'directory' as const, name: unattributedFilename},
    {kind: 'file' as const, name: 'private.jsonl'},
    {kind: 'file' as const, name: unattributedFilename.replace('1000', '99999999999999999999')},
  ])('ignores unrelated entry $name even at the metadata limit', entry => {
    const selection = selectBrowserLogFile({entry, exportedFiles: maximumBrowserLogExportFiles});

    expect(unwrap(selection).isNothing).toBe(true);
  });

  it('allows the last permitted entry and rejects the next owned file', () => {
    const entry = {kind: 'file' as const, name: unattributedFilename};
    const lastPermitted = selectBrowserLogFile({entry, exportedFiles: maximumBrowserLogExportFiles - 1});
    const excess = selectBrowserLogFile({entry, exportedFiles: maximumBrowserLogExportFiles});

    expect(unwrap(lastPermitted).unwrapOr('missing')).toBe(unattributedFilename);
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
