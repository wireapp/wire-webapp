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

import {ConnectionState, createConnectionStateTracker} from './connectionStateTracker';

describe('createConnectionStateTracker', () => {
  it('defaults to CLOSED', () => {
    const tracker = createConnectionStateTracker();

    expect(tracker.getState()).toBe(ConnectionState.CLOSED);
    expect(tracker.isLive()).toBe(false);
  });

  it('accepts a custom initial state', () => {
    const tracker = createConnectionStateTracker(ConnectionState.LIVE);

    expect(tracker.getState()).toBe(ConnectionState.LIVE);
    expect(tracker.isLive()).toBe(true);
  });

  it('updates state via setState', () => {
    const tracker = createConnectionStateTracker();

    tracker.setState(ConnectionState.PROCESSING_NOTIFICATIONS);

    expect(tracker.getState()).toBe(ConnectionState.PROCESSING_NOTIFICATIONS);
    expect(tracker.isLive()).toBe(false);
  });

  it('isLive is true only in LIVE state', () => {
    const tracker = createConnectionStateTracker();

    for (const state of [
      ConnectionState.CLOSED,
      ConnectionState.CONNECTING,
      ConnectionState.PROCESSING_NOTIFICATIONS,
    ]) {
      tracker.setState(state);
      expect(tracker.isLive()).toBe(false);
    }

    tracker.setState(ConnectionState.LIVE);
    expect(tracker.isLive()).toBe(true);
  });

  it('returns independent tracker instances', () => {
    const first = createConnectionStateTracker(ConnectionState.CONNECTING);
    const second = createConnectionStateTracker(ConnectionState.LIVE);

    first.setState(ConnectionState.CLOSED);

    expect(first.getState()).toBe(ConnectionState.CLOSED);
    expect(second.getState()).toBe(ConnectionState.LIVE);
  });
});
