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

export function chunk<T>(array: T[], size: number): T[][];
export function chunk(array: Float32Array, size: number): Float32Array[];
export function chunk<T>(array: T[] | Float32Array, size: number) {
  const chunks: (T[] | Float32Array)[] = [];
  for (let index = 0, length = array.length; index < length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

/**
 * Gets all the values that are in array2 which are not in array1.
 *
 * @param array1 the base array
 * @param array2 the array to compare with
 * @param matcher a custom matching function in case referencial equality is not enough
 * @returns the array containing values in array2 that are not in array1
 */
export const getDifference = <T>(array1: T[] = [], array2: T[] = [], matcher?: (t1: T, t2: T) => boolean): T[] => {
  if (matcher) {
    return array2.filter(el1 => !array1.some(el2 => matcher(el1, el2)));
  }
  return array2.filter(element => !array1.includes(element));
};

export const getNextItem = <T>(array: T[], currentItem: T): T | undefined => {
  const currentIndex = array.indexOf(currentItem);

  // couldn't find the item
  if (currentIndex === -1) {
    return undefined;
  }

  const nextIndex = currentIndex + 1;

  // item is last item in the array
  if (nextIndex === array.length) {
    return currentIndex > 0 ? array[currentIndex - 1] : undefined;
  }

  return array[nextIndex];
};

/**
 * Interpolates an array of numbers using linear interpolation
 *
 * @param array source
 * @param length new length
 * @returns new array with interpolated values
 */
export const interpolate = (array: number[], length: number) => {
  const newArray = [];
  const scaleFactor = (array.length - 1) / (length - 1);

  newArray[0] = array[0];
  newArray[length - 1] = array[array.length - 1];

  for (let index = 1; index < length - 1; index++) {
    const originalIndex = index * scaleFactor;
    const before = Math.floor(originalIndex);
    const after = Math.ceil(originalIndex);
    const point = originalIndex - before;
    newArray[index] = array[before] + (array[after] - array[before]) * point; // linear interpolation
  }

  return newArray;
};

export const isLastItem = <T>(array: T[], item: T) => array.indexOf(item) === array.length - 1;

export const iterateIndex = <T>(array: T, currentIndex: number, reverse = false): number | undefined => {
  if (Array.isArray(array) && array.length && Number.isFinite(currentIndex)) {
    if (reverse) {
      const isZeroIndex = currentIndex === 0;
      return isZeroIndex ? array.length - 1 : (currentIndex - 1) % array.length;
    }

    return (currentIndex + 1) % array.length;
  }
  return undefined;
};

export const iterateItem = <T>(array: T[], currentItem: T, reverse = false): T | undefined => {
  if (Array.isArray(array) && array.length) {
    const currentIndex = array.indexOf(currentItem);

    // If item could not be found
    const isNegativeIndex = currentIndex === -1;
    return isNegativeIndex ? undefined : array[iterateIndex(array, currentIndex, reverse)];
  }
  return undefined;
};

/**
 * Returns random element
 * @param array source
 * @returns random element
 */
export const randomElement = <T>(array: T[] = []) => array[Math.floor(Math.random() * array.length)];

export const deArrayify = <T>(value: T[] | T): T => (value instanceof Array ? value[0] : value);

export const uniquify = <T>(elements: T[]): T[] => Array.from(new Set<T>(elements));

export const flatten = <T>(arrays: T[][]): T[] => ([] as T[]).concat(...arrays);

export const partition = <T>(array: T[], condition: (element: T) => boolean): [T[], T[]] => {
  const matching: T[] = [];
  const notMatching: T[] = [];
  array.forEach(element => {
    if (condition(element)) {
      matching.push(element);
    } else {
      notMatching.push(element);
    }
  });
  return [matching, notMatching];
};
