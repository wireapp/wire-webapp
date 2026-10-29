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

import {bulkMoveReducer, type BulkMoveReviewReason, type BulkMoveState} from './bulkMoveState';

describe('bulkMoveReducer', () => {
  const reasons: BulkMoveReviewReason[] = ['request-failed', 'partial', 'finished-unknown', 'failed', 'status-unknown'];

  it.each(reasons)('records %s as requiring review', reason => {
    const state = bulkMoveReducer({kind: 'background-pending'}, {type: 'needs-review', reason});

    expect(state).toEqual({kind: 'needs-review', reason, refresh: 'idle'});
  });

  it.each(reasons)('preserves %s after a failed refresh and clears it after a successful retry', reason => {
    const state: BulkMoveState = {kind: 'needs-review', reason, refresh: 'idle'};

    const refreshing = bulkMoveReducer(state, {type: 'refresh-started'});
    expect(refreshing).toEqual({...state, refresh: 'refreshing'});

    const failed = bulkMoveReducer(refreshing, {type: 'refresh-failed'});
    expect(failed).toEqual({...state, refresh: 'failed'});

    const retry = bulkMoveReducer(failed, {type: 'refresh-started'});
    expect(retry).toEqual({...state, refresh: 'refreshing'});
    expect(bulkMoveReducer(retry, {type: 'resolved'})).toEqual({kind: 'idle'});
  });

  it('starts a new request without retaining the previous failure', () => {
    const state: BulkMoveState = {kind: 'needs-review', reason: 'failed', refresh: 'failed'};

    expect(bulkMoveReducer(state, {type: 'request-started'})).toEqual({kind: 'request-pending'});
  });

  it('returns to background polling after an unknown status', () => {
    const state: BulkMoveState = {kind: 'needs-review', reason: 'status-unknown', refresh: 'idle'};

    expect(bulkMoveReducer(state, {type: 'background-started'})).toEqual({kind: 'background-pending'});
  });

  it('tracks a request through background processing to resolution', () => {
    const request = bulkMoveReducer({kind: 'idle'}, {type: 'request-started'});
    const background = bulkMoveReducer(request, {type: 'background-started'});

    expect(background).toEqual({kind: 'background-pending'});
    expect(bulkMoveReducer(background, {type: 'resolved'})).toEqual({kind: 'idle'});
  });

  it.each<BulkMoveState>([{kind: 'idle'}, {kind: 'request-pending'}, {kind: 'background-pending'}])(
    'ignores refresh events outside review: $kind',
    state => {
      expect(bulkMoveReducer(state, {type: 'refresh-started'})).toBe(state);
      expect(bulkMoveReducer(state, {type: 'refresh-failed'})).toBe(state);
    },
  );
});
