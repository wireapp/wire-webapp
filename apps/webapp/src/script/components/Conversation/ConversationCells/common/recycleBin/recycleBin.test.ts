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

import {getCellsFilesPath} from '../getCellsFilesPath/getCellsFilesPath';

import {isPathInRecycleBin} from './recycleBin';

describe('isPathInRecycleBin', () => {
  it.each(['recycle_bin', 'recycle_bin/folder', 'recycle_bin/recycle_bin', 'recycle_bin/deleted-file/nested-folder'])(
    'recognizes a recycle bin path: %s',
    path => {
      expect(isPathInRecycleBin(path)).toBe(true);
    },
  );

  it.each([
    'folder',
    'test_recycle_bin',
    'recycle_bin_test',
    'foobar/recycle_bin',
    'recycle_bin_notes',
    'recycle_bin archive',
  ])('does not match a folder name: %s', path => {
    expect(isPathInRecycleBin(path)).toBe(false);
  });
});

describe('recycle bin detection from a URL-encoded files path', () => {
  // getCellsFilesPath accepts the hash directly, so the decode + validation
  // pipeline is exercised without mutating window.location.
  it.each([
    {encodedPath: 'recycle_bin%2Fdeleted-file', isInBin: true},
    {encodedPath: 'recycle_bin%20archive', isInBin: false},
  ])('decodes $encodedPath before validating', ({encodedPath, isInBin}) => {
    const hash = `#/conversation/conversation-id/wire.com/files/${encodedPath}`;

    expect(isPathInRecycleBin(getCellsFilesPath(hash))).toBe(isInBin);
  });

  it('returns false when the hash has no files path', () => {
    expect(isPathInRecycleBin(getCellsFilesPath('#/conversation/conversation-id/wire.com'))).toBe(false);
  });
});
