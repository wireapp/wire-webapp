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

const prependKey = (key: string, pKey: string) => `${pKey}_${key}`;

export const LocalStorageStore = <T = string>(pKey: string) => ({
  get: (key: string): T | undefined => {
    const value = localStorage.getItem(prependKey(key, pKey));
    if (value) {
      if (!Number.isNaN(Number(value))) {
        return Number(value) as T;
      }
      return value as T;
    }
    return undefined;
  },
  add: (key: string, value: T) => localStorage.setItem(prependKey(key, pKey), String(value)),
  remove: (key: string) => localStorage.removeItem(prependKey(key, pKey)),
  has: (key: string) => !!localStorage.getItem(prependKey(key, pKey)),
});
