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

export type FakeClock = {
  /** Server time, which only moves when the test moves it */
  getServerTime: () => number;
  /** Moves the timers and the server time forward together, letting every promise settle on the way */
  advance: (milliseconds: number) => Promise<void>;
  /** Lets every promise settle without moving time */
  settle: () => Promise<void>;
  /** Moves the server time alone, as when the device clock and the server's disagree */
  jumpServerTime: (milliseconds: number) => void;
  dispose: () => void;
};

/** Installs jest's fake timers; the test must call `dispose` */
export function createFakeClock(initialServerTime = 1_000_000): FakeClock {
  jest.useFakeTimers();
  let serverTime = initialServerTime;

  return {
    getServerTime: () => {
      return serverTime;
    },
    async advance(milliseconds) {
      serverTime += milliseconds;
      await jest.advanceTimersByTimeAsync(milliseconds);
    },
    async settle() {
      await jest.advanceTimersByTimeAsync(0);
    },
    jumpServerTime(milliseconds) {
      serverTime += milliseconds;
    },
    dispose() {
      jest.useRealTimers();
    },
  };
}
