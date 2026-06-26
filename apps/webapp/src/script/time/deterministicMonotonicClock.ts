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

import type {MonotonicClock} from './monotonicClock';

type DeterministicMonotonicClock = MonotonicClock & {
  readonly advanceByMilliseconds: (durationMilliseconds: number) => void;
  readonly setCurrentTimeMilliseconds: (currentTimeMilliseconds: number) => void;
};

type DeterministicMonotonicClockOptions = {
  readonly initialCurrentTimeMilliseconds?: number;
};

export function createDeterministicMonotonicClock(
  options: DeterministicMonotonicClockOptions = {},
): DeterministicMonotonicClock {
  const {initialCurrentTimeMilliseconds = 0} = options;
  let currentTimeMilliseconds = initialCurrentTimeMilliseconds;

  return {
    advanceByMilliseconds(durationMilliseconds) {
      currentTimeMilliseconds += durationMilliseconds;
    },

    nowMilliseconds() {
      return currentTimeMilliseconds;
    },

    setCurrentTimeMilliseconds(nextCurrentTimeMilliseconds) {
      currentTimeMilliseconds = nextCurrentTimeMilliseconds;
    },
  };
}
