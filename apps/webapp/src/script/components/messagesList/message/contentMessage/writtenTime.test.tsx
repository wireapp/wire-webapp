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

import {shouldShowWrittenTime} from './writtenTime';

import {TIME_IN_MILLIS} from '../../../../util/timeUtil';

const sentTimestamp = Date.UTC(2026, 0, 1);

describe('shouldShowWrittenTime', () => {
  it.each([
    ['sent five minutes after it was written', 'sent', TIME_IN_MILLIS.FIVE_MINUTES, true],
    ['sent just under five minutes after it was written', 'sent', TIME_IN_MILLIS.FIVE_MINUTES - 1, false],
    ['outgoing', 'outgoing', TIME_IN_MILLIS.HOUR, false],
    ['failed', 'failed', TIME_IN_MILLIS.HOUR, false],
  ] as const)('for a message %s: %s', (_, sendingState, writtenBefore, expected) => {
    expect(shouldShowWrittenTime({sendingState, sentTimestamp, writtenTimestamp: sentTimestamp - writtenBefore})).toBe(
      expected,
    );
  });

  it('is false for a message without a written time', () => {
    expect(shouldShowWrittenTime({sendingState: 'sent', sentTimestamp, writtenTimestamp: Number.NaN})).toBe(false);
  });
});
