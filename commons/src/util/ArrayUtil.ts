/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import * as TypeUtil from './TypeUtil';

export function chunk<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let index = 0, length = array.length; index < length; index += chunkSize) {
    chunks.push(array.slice(index, index + chunkSize));
  }
  return chunks;
}

export function getDeduplicatedUnion<T>(array1: T[], array2: T[]): T[] {
  return removeDuplicates(array1.concat(array2));
}

export function getDifference<T>(array1: T[], array2: T[]): T[] {
  return array1.filter(value => !array2.includes(value));
}

export function getIntersection<T>(array1: T[], array2: T[]): T[] {
  return array1.filter(value => array2.includes(value));
}

export function removeDuplicates<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

export const flatten = <T>(arrays: T[][]): T[] => ([] as T[]).concat(...arrays);

export function filterFalsy<T>(value: T): value is Exclude<T, TypeUtil.FalsyType> {
  return Boolean(value);
}
