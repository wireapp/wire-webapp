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

import {getPermanentDeleteStatusKind} from './getPermanentDeleteStatusKind';

const idle = {isPending: false, isRejected: false, isUnresolved: false, isReconciling: false, reviewReason: null};

describe('getPermanentDeleteStatusKind', () => {
  it('has no status while idle', () => {
    expect(getPermanentDeleteStatusKind(idle)).toEqual(Maybe.nothing());
  });

  it('is processing while the request is pending', () => {
    expect(getPermanentDeleteStatusKind({...idle, isPending: true})).toEqual(Maybe.just('processing'));
  });

  it('stays processing while the Bin is being reconciled, even after a refresh error', () => {
    expect(
      getPermanentDeleteStatusKind({
        ...idle,
        isUnresolved: true,
        isReconciling: true,
        reviewReason: 'refresh-failed',
      }),
    ).toEqual(Maybe.just('processing'));
  });

  it('reports a rejected request as request-failed', () => {
    expect(getPermanentDeleteStatusKind({...idle, isRejected: true})).toEqual(Maybe.just('request-failed'));
  });

  it('does not report a rejection once reconciliation has taken over', () => {
    expect(getPermanentDeleteStatusKind({...idle, isRejected: true, isUnresolved: true, isReconciling: true})).toEqual(
      Maybe.just('processing'),
    );
  });

  it.each([
    ['job-failed', 'failed'],
    ['refresh-failed', 'finished-unknown'],
    ['still-visible', 'partial'],
    ['timed-out', 'status-unknown'],
  ] as const)('maps the %s review reason to %s once reconciliation has stopped', (reviewReason, expected) => {
    expect(getPermanentDeleteStatusKind({...idle, isUnresolved: true, reviewReason})).toEqual(Maybe.just(expected));
  });

  it('treats an unresolved delete without a reason as status-unknown', () => {
    expect(getPermanentDeleteStatusKind({...idle, isUnresolved: true})).toEqual(Maybe.just('status-unknown'));
  });
});
