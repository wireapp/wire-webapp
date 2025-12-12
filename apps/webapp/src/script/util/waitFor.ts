/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

export function waitFor<T>(condition: () => T, timeout: number = 5000, interval: number = 100): Promise<T | undefined> {
  return new Promise(resolve => {
    if (condition()) {
      return resolve(condition());
    }

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      resolve(undefined);
    }, timeout);

    const intervalId = setInterval(() => {
      const result = condition();
      if (result) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        resolve(result);
      }
    }, interval);
  });
}
