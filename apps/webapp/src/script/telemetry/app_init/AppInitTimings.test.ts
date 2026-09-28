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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {AppInitTimings} from './AppInitTimings';
import {AppInitTimingsStep} from './AppInitTimingsStep';

describe('AppInitTimings', () => {
  it('records elapsed step timing from the monotonic clock', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const appInitTimings = new AppInitTimings(clock, clock.currentMonotonicMicroseconds);

    clock.advanceByMilliseconds(42);
    appInitTimings.timeStep(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);

    expect(appInitTimings.get()).toEqual({
      [AppInitTimingsStep.RECEIVED_ACCESS_TOKEN]: 42,
    });
  });

  it('records elapsed step timing from an explicit monotonic start time', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    clock.advanceByMilliseconds(200);
    const startedAtMonotonicMicroseconds = clock.currentMonotonicMicroseconds - 100_000n;
    const appInitTimings = new AppInitTimings(clock, startedAtMonotonicMicroseconds);

    clock.advanceByMilliseconds(50);
    appInitTimings.timeStep(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);

    expect(appInitTimings.get()).toEqual({
      [AppInitTimingsStep.RECEIVED_ACCESS_TOKEN]: 150,
    });
  });

  it('records elapsed step timing from an explicit monotonic occurrence time', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    clock.advanceByMilliseconds(100);
    const startedAtMonotonicMicroseconds = clock.currentMonotonicMicroseconds;
    const appInitTimings = new AppInitTimings(clock, startedAtMonotonicMicroseconds);

    appInitTimings.timeStepAt(AppInitTimingsStep.DOM_CONTENT_LOADED, startedAtMonotonicMicroseconds + 25_000n);

    expect(appInitTimings.get()).toEqual({
      [AppInitTimingsStep.DOM_CONTENT_LOADED]: 25,
    });
  });

  it('records a zero millisecond step only once', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const appInitTimings = new AppInitTimings(clock, clock.currentMonotonicMicroseconds);

    appInitTimings.timeStep(AppInitTimingsStep.INIT_APP_STARTED);
    clock.advanceByMilliseconds(5);
    appInitTimings.timeStep(AppInitTimingsStep.INIT_APP_STARTED);

    expect(appInitTimings.get()).toEqual({
      [AppInitTimingsStep.INIT_APP_STARTED]: 0,
    });
  });

  it('ignores wall-clock changes when calculating elapsed duration', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    clock.advanceByMilliseconds(100);
    const appInitTimings = new AppInitTimings(clock, clock.currentMonotonicMicroseconds);

    clock.setCurrentUnixEpochMicroseconds(10_000_000n);
    appInitTimings.timeStep(AppInitTimingsStep.DOM_CONTENT_LOADED);
    clock.advanceByMilliseconds(5);
    appInitTimings.timeStep(AppInitTimingsStep.INIT_APP_STARTED);

    expect(appInitTimings.get()).toEqual({
      [AppInitTimingsStep.DOM_CONTENT_LOADED]: 0,
      [AppInitTimingsStep.INIT_APP_STARTED]: 5,
    });
  });
});
