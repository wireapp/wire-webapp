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

import type {OutboxClock, TimerId} from '../types';

export type PendingTimer = {id: TimerId; dueInMilliseconds: number};

export type FakeClock = OutboxClock & {
  /**
   * Moves stopwatch time and server time forward together, firing the timers that fall due in order, and lets
   * every promise settle after each
   */
  advance: (milliseconds: number) => Promise<void>;
  /** Lets every promise settle without moving time */
  settle: () => Promise<void>;
  /** Moves server time alone, as when the server's clock offset is corrected */
  jumpServerTime: (milliseconds: number) => void;
  /** The timers not fired or cleared yet, the soonest first */
  pendingTimers: () => PendingTimer[];
};

type ScheduledTimer = {id: TimerId; dueAt: number; callback: () => void};

/** A manual clock, without jest's fake timers: time only moves when the test moves it */
export function createFakeClock({serverTime: initialServerTime = 1_000_000} = {}): FakeClock {
  let stopwatchTime = 0;
  let serverTime = initialServerTime;
  let nextTimerId = 1;
  let timers: ScheduledTimer[] = [];

  const bySoonest = (earlier: ScheduledTimer, later: ScheduledTimer): number => {
    return earlier.dueAt === later.dueAt ? earlier.id - later.id : earlier.dueAt - later.dueAt;
  };

  // A real macrotask runs only once every microtask queued before it, and by them, has run
  const settle = async (): Promise<void> => {
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  };

  const moveTo = (time: number): void => {
    serverTime += time - stopwatchTime;
    stopwatchTime = time;
  };

  return {
    getServerTime: () => {
      return serverTime;
    },
    getStopwatchTime: () => {
      return stopwatchTime;
    },
    setTimer: (callback, milliseconds) => {
      const id = nextTimerId++;
      timers = [...timers, {id, dueAt: stopwatchTime + Math.max(0, milliseconds), callback}];
      return id;
    },
    clearTimer: timer => {
      timers = timers.filter(({id}) => {
        return id !== timer;
      });
    },
    async advance(milliseconds) {
      const target = stopwatchTime + milliseconds;
      await settle();
      for (;;) {
        const [due] = timers
          .filter(({dueAt}) => {
            return dueAt <= target;
          })
          .toSorted(bySoonest);
        if (due === undefined) {
          break;
        }
        timers = timers.filter(({id}) => {
          return id !== due.id;
        });
        moveTo(due.dueAt);
        due.callback();
        await settle();
      }
      moveTo(target);
      await settle();
    },
    settle,
    jumpServerTime(milliseconds) {
      serverTime += milliseconds;
    },
    pendingTimers: () => {
      return timers.toSorted(bySoonest).map(({id, dueAt}) => {
        return {id, dueInMilliseconds: dueAt - stopwatchTime};
      });
    },
  };
}
