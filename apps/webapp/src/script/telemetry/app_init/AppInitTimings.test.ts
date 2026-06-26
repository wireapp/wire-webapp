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

import {createDeterministicMonotonicClock} from '../../time/deterministicMonotonicClock';

import {AppInitTimings} from './AppInitTimings';
import {AppInitTimingsStep} from './AppInitTimingsStep';

describe('AppInitTimings', () => {
  it('records elapsed step timing from the monotonic clock', () => {
    const monotonicClock = createDeterministicMonotonicClock({initialCurrentTimeMilliseconds: 100});
    const appInitTimings = new AppInitTimings(monotonicClock);

    monotonicClock.advanceByMilliseconds(42);
    appInitTimings.timeStep(AppInitTimingsStep.RECEIVED_ACCESS_TOKEN);

    expect(appInitTimings.get()).toEqual({
      [AppInitTimingsStep.RECEIVED_ACCESS_TOKEN]: 42,
    });
  });
});
