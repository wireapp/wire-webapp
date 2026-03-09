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

import {createDeterministicWallClock} from '../clock/deterministicWallClock';
import {startApplicationPeriodicChecks} from './startApplicationPeriodicChecks';

describe('startApplicationPeriodicChecks', () => {
  it('executes periodic checks immediately and again after each configured delay', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const periodicChecksIntervalDelayInMilliseconds = 1_234;
    const runPeriodicCheck = jest.fn();

    startApplicationPeriodicChecks({
      wallClock: deterministicWallClock,
      periodicChecksIntervalDelayInMilliseconds,
      runPeriodicCheck,
    });

    expect(runPeriodicCheck).toHaveBeenCalledTimes(1);

    deterministicWallClock.advanceByMilliseconds(periodicChecksIntervalDelayInMilliseconds - 1);
    expect(runPeriodicCheck).toHaveBeenCalledTimes(1);

    deterministicWallClock.advanceByMilliseconds(periodicChecksIntervalDelayInMilliseconds);

    expect(runPeriodicCheck).toHaveBeenCalledTimes(2);
  });

  it('stops executing periodic checks after cleanup is called', () => {
    const deterministicWallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: 0});
    const periodicChecksIntervalDelayInMilliseconds = 567;
    const runPeriodicCheck = jest.fn();

    const stopPeriodicChecks = startApplicationPeriodicChecks({
      wallClock: deterministicWallClock,
      periodicChecksIntervalDelayInMilliseconds,
      runPeriodicCheck,
    });

    deterministicWallClock.advanceByMilliseconds(periodicChecksIntervalDelayInMilliseconds);
    stopPeriodicChecks();
    deterministicWallClock.advanceByMilliseconds(periodicChecksIntervalDelayInMilliseconds);

    expect(runPeriodicCheck).toHaveBeenCalledTimes(2);
  });
});
