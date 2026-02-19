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

import is from '@sindresorhus/is';

import {WallClock} from './wallClock';

type FakeWallClockOptions = {
  readonly initialCurrentTimestampInMilliseconds?: number;
};

type IntervalHandler = (...arguments_: readonly unknown[]) => void;

type IntervalInfo = {
  readonly arguments_: readonly unknown[];
  readonly delayInMilliseconds: number;
  handler: IntervalHandler;
  nextExecutionTimestampInMilliseconds: number;
};

function validateIntervalDelay(delayInMilliseconds: number): void {
  if (delayInMilliseconds <= 0) {
    throw new Error(`Invalid delay ${delayInMilliseconds}, must be greater than 0`);
  }

  if (is.infinite(delayInMilliseconds) || is.nan(delayInMilliseconds)) {
    throw new TypeError('Invalid delay, must be a finite number');
  }
}

export type FakeWallClock = WallClock & {
  setCurrentTimestampInMilliseconds(nextTimestampInMilliseconds: number): void;
  advanceByMilliseconds(delayInMilliseconds: number): void;
  setInterval<Arguments extends readonly unknown[]>(
    handler: (...arguments_: Arguments) => void,
    delayInMilliseconds: number,
    ...arguments_: Arguments
  ): ReturnType<typeof globalThis.setInterval>;
  clearInterval(intervalIdentifier: ReturnType<typeof globalThis.setInterval>): void;
};

export function createFakeWallClock(options: FakeWallClockOptions = {}): FakeWallClock {
  const {initialCurrentTimestampInMilliseconds = 0} = options;

  let currentTimestampInMilliseconds = initialCurrentTimestampInMilliseconds;
  let currentIntervalIndex = -1;
  const intervals = new Map<number, IntervalInfo>();

  function executeDueIntervals(): void {
    Array.from(intervals.keys()).forEach(intervalIdentifier => {
      let intervalInfo = intervals.get(intervalIdentifier);

      while (
        !is.undefined(intervalInfo) &&
        currentTimestampInMilliseconds >= intervalInfo.nextExecutionTimestampInMilliseconds
      ) {
        intervalInfo.nextExecutionTimestampInMilliseconds += intervalInfo.delayInMilliseconds;
        intervalInfo.handler(...intervalInfo.arguments_);
        intervalInfo = intervals.get(intervalIdentifier);
      }
    });
  }

  return {
    get currentTimestampInMilliseconds() {
      return currentTimestampInMilliseconds;
    },

    get currentDate() {
      return new Date(currentTimestampInMilliseconds);
    },

    setCurrentTimestampInMilliseconds(nextTimestampInMilliseconds: number) {
      currentTimestampInMilliseconds = nextTimestampInMilliseconds;
      executeDueIntervals();
    },

    advanceByMilliseconds(delayInMilliseconds: number) {
      currentTimestampInMilliseconds += delayInMilliseconds;
      executeDueIntervals();
    },

    setInterval(handler, delayInMilliseconds, ...arguments_) {
      validateIntervalDelay(delayInMilliseconds);
      const internalIntervalHandler = handler as IntervalHandler;

      currentIntervalIndex += 1;

      intervals.set(currentIntervalIndex, {
        arguments_,
        delayInMilliseconds,
        handler: internalIntervalHandler,
        nextExecutionTimestampInMilliseconds: currentTimestampInMilliseconds + delayInMilliseconds,
      });

      return currentIntervalIndex as unknown as ReturnType<typeof globalThis.setInterval>;
    },

    clearInterval(intervalIdentifier) {
      intervals.delete(intervalIdentifier as unknown as number);
    },
  };
}
