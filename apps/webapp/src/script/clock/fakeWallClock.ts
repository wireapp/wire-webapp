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

import {WallClock} from './wallClock';

type FakeWallClockOptions = {
  readonly initialCurrentTimestampInMilliseconds?: number;
};

export type FakeWallClock = WallClock & {
  setCurrentTimestampInMilliseconds(nextTimestampInMilliseconds: number): void;
  advanceByMilliseconds(delayInMilliseconds: number): void;
};

export function createFakeWallClock(options: FakeWallClockOptions = {}): FakeWallClock {
  const {initialCurrentTimestampInMilliseconds = 0} = options;

  let currentTimestampInMilliseconds = initialCurrentTimestampInMilliseconds;

  return {
    get currentTimestampInMilliseconds() {
      return currentTimestampInMilliseconds;
    },

    get currentDate() {
      return new Date(currentTimestampInMilliseconds);
    },

    setCurrentTimestampInMilliseconds(nextTimestampInMilliseconds: number) {
      currentTimestampInMilliseconds = nextTimestampInMilliseconds;
    },

    advanceByMilliseconds(delayInMilliseconds: number) {
      currentTimestampInMilliseconds += delayInMilliseconds;
    },
  };
}
