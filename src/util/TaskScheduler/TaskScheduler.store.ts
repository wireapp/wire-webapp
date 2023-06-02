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

const prependKey = (key: string) => `TaskScheduler_${key}`;

export const TaskSchedulerStore = {
  get: (key: string) => {
    const value = localStorage.getItem(prependKey(key));
    if (value) {
      return Number(value);
    }
    return undefined;
  },
  add: (key: string, firingDate: number) => localStorage.setItem(prependKey(key), String(firingDate)),
  remove: (key: string) => localStorage.removeItem(prependKey(key)),
  has: (key: string) => !!localStorage.getItem(prependKey(key)),
};
