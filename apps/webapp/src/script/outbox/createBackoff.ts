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

export type Backoff = {
  /**
   * Starts a wait and returns its length: random between 0 and a limit that doubles each time from the
   * minimum up to the maximum ("full jitter"), so that clients retrying after the same outage spread out
   */
  grow: () => number;
  /** Ends the wait and starts the growth again */
  reset: () => void;
  /** The wait still left, in milliseconds */
  remainingMilliseconds: () => number;
};

export const DEFAULT_BACKOFF_MINIMUM_MILLISECONDS = 5_000;
export const DEFAULT_BACKOFF_MAXIMUM_MILLISECONDS = 60_000;
const GROWTH_FACTOR = 2;

export function createBackoff(
  minimumMilliseconds: number = DEFAULT_BACKOFF_MINIMUM_MILLISECONDS,
  maximumMilliseconds: number = DEFAULT_BACKOFF_MAXIMUM_MILLISECONDS,
  random: () => number = Math.random,
): Backoff {
  let growths = 0;
  let waitsUntil = 0;

  return {
    grow() {
      const limitMilliseconds = Math.min(minimumMilliseconds * GROWTH_FACTOR ** growths, maximumMilliseconds);
      const waitMilliseconds = Math.floor(random() * limitMilliseconds);
      growths += 1;
      waitsUntil = Date.now() + waitMilliseconds;
      return waitMilliseconds;
    },
    reset() {
      growths = 0;
      waitsUntil = 0;
    },
    remainingMilliseconds() {
      return Math.max(0, waitsUntil - Date.now());
    },
  };
}
