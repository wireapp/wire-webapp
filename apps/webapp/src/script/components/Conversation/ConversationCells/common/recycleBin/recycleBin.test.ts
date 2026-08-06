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

import {isInRecycleBin} from './recycleBin';

describe('isInRecycleBin', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('returns true for a recycle bin path', () => {
    window.location.hash = '#/conversation/conversation-id/wire.com/files/recycle_bin/folder';

    expect(isInRecycleBin()).toBe(true);
  });

  it('returns false for a path outside the recycle bin', () => {
    window.location.hash = '#/conversation/conversation-id/wire.com/files/folder';

    expect(isInRecycleBin()).toBe(false);
  });

  it.each(['test_recycle_bin', 'recycle_bin_test', 'foobar/recycle_bin'])(
    'returns false when a regular path contains the recycle bin name: %s',
    path => {
      window.location.hash = `#/conversation/conversation-id/wire.com/files/${path}`;

      expect(isInRecycleBin()).toBe(false);
    },
  );

  it('returns true when a recycle-bin descendant is also named recycle_bin', () => {
    window.location.hash = '#/conversation/conversation-id/wire.com/files/recycle_bin/recycle_bin';

    expect(isInRecycleBin()).toBe(true);
  });

  it('returns false when the hash has no files path', () => {
    window.location.hash = '#/conversation/conversation-id/wire.com';

    expect(isInRecycleBin()).toBe(false);
  });
});
