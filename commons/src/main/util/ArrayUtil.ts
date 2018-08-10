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

export function chunk(array: any[], size: number): any[][] {
  const chunks = [];
  for (let index = 0, length = array.length; index < length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

export function getDeduplicatedUnion(array1: any[], array2: any[]): any[] {
  return removeDuplicates(array1.concat(array2));
}

export function getDifference(array1: any[], array2: any[]): any[] {
  return array1.filter(value => !array2.includes(value));
}

export function getIntersection(array1: any[], array2: any[]): any[] {
  return array1.filter(value => array2.includes(value));
}

export function removeDuplicates(array: any[]): any[] {
  return Array.from(new Set(array));
}
