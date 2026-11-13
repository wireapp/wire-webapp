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

import {BufferedMlsMessageRecoveryTracker} from './bufferedMlsMessageRecoveryTracker';

const MINUTE = 60_000;
const START = Date.parse('2026-01-01T12:00:00.000Z');
const GROUP_ID = 'group-id';
const OTHER_GROUP_ID = 'other-group-id';

describe('BufferedMlsMessageRecoveryTracker', () => {
  it('does not trigger recovery for the first buffered message', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    expect(tracker.observeBufferedMessage(GROUP_ID, START)).toBe(false);
  });

  it('does not trigger recovery when the buffered span is exactly the threshold', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    tracker.observeBufferedMessage(GROUP_ID, START);

    expect(tracker.observeBufferedMessage(GROUP_ID, START + MINUTE)).toBe(false);
  });

  it('triggers recovery when the buffered span exceeds the threshold', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    tracker.observeBufferedMessage(GROUP_ID, START);

    expect(tracker.observeBufferedMessage(GROUP_ID, START + MINUTE + 1)).toBe(true);
  });

  it('keeps triggering recovery for further buffered messages until cleared', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    tracker.observeBufferedMessage(GROUP_ID, START);
    tracker.observeBufferedMessage(GROUP_ID, START + MINUTE + 1);

    expect(tracker.observeBufferedMessage(GROUP_ID, START + MINUTE + 2)).toBe(true);
  });

  it('takes out-of-order timestamps into account', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    tracker.observeBufferedMessage(GROUP_ID, START + MINUTE);

    expect(tracker.observeBufferedMessage(GROUP_ID, START - 1)).toBe(true);
  });

  it('tracks groups independently', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    tracker.observeBufferedMessage(GROUP_ID, START);

    expect(tracker.observeBufferedMessage(OTHER_GROUP_ID, START + MINUTE + 1)).toBe(false);
    expect(tracker.observeBufferedMessage(GROUP_ID, START + MINUTE + 1)).toBe(true);
  });

  it('restarts tracking after being cleared', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    tracker.observeBufferedMessage(GROUP_ID, START);
    tracker.clear(GROUP_ID);

    expect(tracker.observeBufferedMessage(GROUP_ID, START + MINUTE + 1)).toBe(false);
  });

  it('only clears the given group', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker();

    tracker.observeBufferedMessage(GROUP_ID, START);
    tracker.observeBufferedMessage(OTHER_GROUP_ID, START);
    tracker.clear(OTHER_GROUP_ID);

    expect(tracker.observeBufferedMessage(GROUP_ID, START + MINUTE + 1)).toBe(true);
  });

  it('supports a custom threshold', () => {
    const tracker = new BufferedMlsMessageRecoveryTracker(1_000);

    tracker.observeBufferedMessage(GROUP_ID, START);

    expect(tracker.observeBufferedMessage(GROUP_ID, START + 1_001)).toBe(true);
  });
});
