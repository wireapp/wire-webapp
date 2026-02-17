/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

const CHECK_INTERVAL = 2000;
const TOLERANCE = CHECK_INTERVAL * 2;

/**
 * This function will call the callback when the system has very likely woken up from sleep.
 * It will ignore small delays and will only call the callback if the system was disconnected during sleep.
 * @param callback - the function to call when the system wakes up
 * @param isDisconnected - (optional) a function to make sure the connection was lost, to reduce the chance of false positives
 * @returns a function to stop the interval
 * @example
 * ```typescript
 * const stop = onBackFromSleep({
 *  callback: () => {
 *   console.log('Woke up from sleep');
 * },
 * isDisconnected: () => {
 *  return !navigator.onLine;
 * }
 * });
 * ```
 */
export const onBackFromSleep = ({
  callback,
  isDisconnected: isDisconnectedCallback,
}: {
  callback: () => void;
  isDisconnected?: () => boolean;
}) => {
  let lastTime = new Date().getTime();
  let wasDisconnected = false;

  const tid = setInterval(() => {
    const currentTime = new Date().getTime();

    // The interval did not run for a while, so we assume the system was sleeping
    const wasAsleep = currentTime > lastTime + TOLERANCE;

    lastTime = currentTime;

    if (isDisconnectedCallback && isDisconnectedCallback()) {
      wasDisconnected = true;
    }

    if (wasAsleep) {
      if (!isDisconnectedCallback || wasDisconnected) {
        wasDisconnected = false;
        callback();
      }
    }
  }, CHECK_INTERVAL);

  return () => clearInterval(tid);
};
