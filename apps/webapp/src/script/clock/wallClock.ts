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

export type WallClock = {
  readonly currentTimestampInMilliseconds: number;
  readonly currentDate: Date;
  readonly setTimeout: <Arguments extends readonly unknown[]>(
    handler: (...args: Arguments) => void,
    delayInMilliseconds: number,
    ...args: Arguments
  ) => ReturnType<typeof globalThis.setTimeout>;
  readonly clearTimeout: (timeoutIdentifier: ReturnType<typeof globalThis.setTimeout>) => void;
  readonly setInterval: <Arguments extends readonly unknown[]>(
    handler: (...args: Arguments) => void,
    delayInMilliseconds: number,
    ...args: Arguments
  ) => ReturnType<typeof globalThis.setInterval>;
  readonly clearInterval: (intervalIdentifier: ReturnType<typeof globalThis.setInterval>) => void;
};

export function createWallClock(): WallClock {
  return {
    get currentTimestampInMilliseconds() {
      return Date.now();
    },

    get currentDate() {
      return new Date(Date.now());
    },

    setTimeout: globalThis.setTimeout.bind(globalThis),

    clearTimeout: globalThis.clearTimeout.bind(globalThis),

    setInterval: globalThis.setInterval.bind(globalThis),

    clearInterval: globalThis.clearInterval.bind(globalThis),
  };
}
