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

import ko from 'knockout';

import {Call} from './Call';
import {CallState} from './CallState';

function createCallWithReason(reason: number | undefined): Call {
  return {
    conversation: {qualifiedId: {domain: '', id: 'call'}},
    reason: ko.observable(reason),
  } as unknown as Call;
}

describe('CallState', () => {
  it('preserves falsy call reasons as active calls', () => {
    const callState = new CallState();
    const zeroReasonCall = createCallWithReason(0);
    const missingReasonCall = createCallWithReason(undefined);
    const notANumberReasonCall = createCallWithReason(Number.NaN);
    const truthyReasonCall = createCallWithReason(1);

    callState.calls([zeroReasonCall, missingReasonCall, notANumberReasonCall, truthyReasonCall]);

    const actualActiveCalls = callState.activeCalls();
    const expectedActiveCalls = [zeroReasonCall, missingReasonCall, notANumberReasonCall];
    expect(actualActiveCalls).toStrictEqual(expectedActiveCalls);
  });
});
