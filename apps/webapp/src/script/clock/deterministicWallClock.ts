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

type DeterministicWallClockOptions = {
  readonly initialCurrentTimestampInMilliseconds?: number;
};

type IntervalRegistration = {
  readonly delayInMilliseconds: number;
  readonly execute: () => void;
  nextExecutionTimestampInMilliseconds: number;
};

type TimeoutRegistration = {
  readonly execute: () => void;
  readonly executionTimestampInMilliseconds: number;
};

export type DeterministicWallClock = WallClock & {
  setCurrentTimestampInMilliseconds(nextTimestampInMilliseconds: number): void;
  advanceByMilliseconds(delayInMilliseconds: number): void;
};

export function createDeterministicWallClock(options: DeterministicWallClockOptions = {}): DeterministicWallClock {
  const {initialCurrentTimestampInMilliseconds = 0} = options;

  let currentTimestampInMilliseconds = initialCurrentTimestampInMilliseconds;
  let nextIntervalIdentifier = 0;
  let nextTimeoutIdentifier = 0;
  const intervalRegistrations = new Map<number, IntervalRegistration>();
  const timeoutRegistrations = new Map<number, TimeoutRegistration>();

  const runDueIntervalRegistrations = () => {
    intervalRegistrations.forEach((intervalRegistration, intervalIdentifier) => {
      while (intervalRegistration.nextExecutionTimestampInMilliseconds <= currentTimestampInMilliseconds) {
        intervalRegistration.execute();

        const latestIntervalRegistration = intervalRegistrations.get(intervalIdentifier);

        if (latestIntervalRegistration === undefined) {
          return;
        }

        latestIntervalRegistration.nextExecutionTimestampInMilliseconds +=
          latestIntervalRegistration.delayInMilliseconds;
      }
    });
  };

  const runDueTimeoutRegistrations = () => {
    const dueTimeoutRegistrations = Array.from(timeoutRegistrations.entries())
      .filter(([, timeoutRegistration]) => {
        return timeoutRegistration.executionTimestampInMilliseconds <= currentTimestampInMilliseconds;
      })
      .sort((firstTimeoutEntry, secondTimeoutEntry) => {
        const [firstTimeoutIdentifier, firstTimeoutRegistration] = firstTimeoutEntry;
        const [secondTimeoutIdentifier, secondTimeoutRegistration] = secondTimeoutEntry;

        if (
          firstTimeoutRegistration.executionTimestampInMilliseconds !==
          secondTimeoutRegistration.executionTimestampInMilliseconds
        ) {
          return (
            firstTimeoutRegistration.executionTimestampInMilliseconds -
            secondTimeoutRegistration.executionTimestampInMilliseconds
          );
        }

        return firstTimeoutIdentifier - secondTimeoutIdentifier;
      });

    dueTimeoutRegistrations.forEach(([timeoutIdentifier, timeoutRegistration]) => {
      timeoutRegistrations.delete(timeoutIdentifier);
      timeoutRegistration.execute();
    });
  };

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
      runDueIntervalRegistrations();
      runDueTimeoutRegistrations();
    },

    setTimeout(handler, delayInMilliseconds, ...args) {
      const timeoutIdentifier = nextTimeoutIdentifier;
      nextTimeoutIdentifier += 1;

      timeoutRegistrations.set(timeoutIdentifier, {
        execute: () => {
          handler(...args);
        },
        executionTimestampInMilliseconds: currentTimestampInMilliseconds + delayInMilliseconds,
      });

      return timeoutIdentifier as unknown as ReturnType<typeof globalThis.setTimeout>;
    },

    clearTimeout(timeoutIdentifier) {
      timeoutRegistrations.delete(timeoutIdentifier as unknown as number);
    },

    setInterval(handler, delayInMilliseconds, ...args) {
      const intervalIdentifier = nextIntervalIdentifier;
      nextIntervalIdentifier += 1;

      intervalRegistrations.set(intervalIdentifier, {
        delayInMilliseconds,
        execute: () => {
          handler(...args);
        },
        nextExecutionTimestampInMilliseconds: currentTimestampInMilliseconds + delayInMilliseconds,
      });

      return intervalIdentifier as unknown as ReturnType<typeof globalThis.setInterval>;
    },

    clearInterval(intervalIdentifier) {
      intervalRegistrations.delete(intervalIdentifier as unknown as number);
    },
  };
}
