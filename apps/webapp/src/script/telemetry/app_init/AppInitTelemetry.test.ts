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
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import {AppInitTelemetry} from './AppInitTelemetry';
import {AppInitTimingsStep} from './AppInitTimingsStep';

describe('AppInitTelemetry', () => {
  it('records timings from an explicit monotonic start time', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    clock.advanceByMilliseconds(100);
    const startedAtMonotonicMicroseconds = clock.currentMonotonicMicroseconds;
    const appInitTelemetry = new AppInitTelemetry(clock, startedAtMonotonicMicroseconds);

    appInitTelemetry.timeStepAt(AppInitTimingsStep.DOM_CONTENT_LOADED, startedAtMonotonicMicroseconds + 25_000n);
    clock.advanceByMilliseconds(150);
    appInitTelemetry.timeStep(AppInitTimingsStep.INIT_APP_STARTED);

    expect(appInitTelemetry.timings).toEqual({
      [AppInitTimingsStep.DOM_CONTENT_LOADED]: 25,
      [AppInitTimingsStep.INIT_APP_STARTED]: 150,
    });
    expect(appInitTelemetry.lastStep).toEqual(Maybe.just(AppInitTimingsStep.INIT_APP_STARTED));
  });

  it('returns no last step before a timing step is recorded', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const appInitTelemetry = new AppInitTelemetry(clock, clock.currentMonotonicMicroseconds);

    expect(appInitTelemetry.lastStep).toEqual(Maybe.nothing());
  });
});
