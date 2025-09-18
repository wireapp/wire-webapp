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

export const deepMerge = <T>(target: T, ...sources: Partial<T>[]): T => {
  if (!sources.length) {
    return target;
  }

  const source = sources.shift();

  if (typeof target === 'object' && target !== null && typeof source === 'object' && source !== null) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null) {
          if (!target[key]) {
            (target as any)[key] = Array.isArray(source[key]) ? [] : {};
          }
          deepMerge((target as any)[key], source[key]);
        } else {
          (target as any)[key] = source[key];
        }
      }
    }
  }

  return deepMerge(target, ...sources);
};
