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

import {getEmptyBinStatusKind} from './getEmptyBinStatusKind';

describe('getEmptyBinStatusKind', () => {
  it('has no popup status while idle', () => {
    expect(getEmptyBinStatusKind({status: 'idle', refreshFailed: false})).toBeNull();
  });

  it.each(['submitting', 'processing'] as const)('is processing while %s', status => {
    expect(getEmptyBinStatusKind({status, refreshFailed: false})).toBe('processing');
  });

  it('is completed when the Bin was emptied and refreshed', () => {
    expect(getEmptyBinStatusKind({status: 'completed', refreshFailed: false})).toBe('completed');
  });

  it('needs review when the Bin was emptied but could not be refreshed', () => {
    expect(getEmptyBinStatusKind({status: 'completed', refreshFailed: true})).toBe('finished-unknown');
  });

  it.each([
    ['partial', 'partial'],
    ['failed', 'failed'],
    ['unknown', 'status-unknown'],
    ['lookup-error', 'request-failed'],
  ] as const)('maps %s to %s', (status, expected) => {
    expect(getEmptyBinStatusKind({status, refreshFailed: false})).toBe(expected);
  });
});
