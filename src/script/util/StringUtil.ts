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

import getSlug from 'speakingurl';

import {randomElement} from 'Util/ArrayUtil';
import type {User} from '../entity/User';

export const startsWith = (string = '', query: string): boolean => string.toLowerCase().startsWith(query.toLowerCase());
export const includesString = (string = '', query = ''): boolean => string.toLowerCase().includes(query.toLowerCase());
export const getFirstChar = (string: string): string => [...string][0]; // the destructuring is needed to properly return unicode characters

/**
 * @param bytes bytes to convert
 * @returns bytes as hex string
 */
export const bytesToHex = (bytes: number[]): string => {
  const hexBase = 16;
  const padIndex = 2;
  return Array.from(bytes, byte => byte.toString(hexBase).padStart(padIndex, '0')).join('');
};

export const capitalizeFirstChar = (string = ''): string => `${string.charAt(0).toUpperCase()}${string.substring(1)}`;

export const computeTransliteration = (string: string, excludedChars = {}): string => {
  const options = {custom: excludedChars, uric: true};
  return getSlug(string, options);
};

export const getRandomChar = (): string => {
  const charArray = Array.from('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  return randomElement(charArray);
};

export const obfuscate = (text: string): string => {
  /* cspell:disable-next-line */
  const alphabet = Array.from('abcdefghijklmnopqrstuvwxyz');
  return Array.from(text, char => (/\s/.test(char) ? char : randomElement(alphabet))).join('');
};

/**
 * Returns `true` if the string and the query match by applying transliteration first.
 *
 * @param string the string to compare the query against
 * @param query the query to compare to the string
 * @param excludedChars extra characters to ignore when creating a slug
 * @param fromStart should the query match the string from the beginning of the string
 * @returns does the string match the query
 */
export const compareTransliteration = (
  string: string,
  query: string,
  excludedChars: Record<string, string> = {},
  fromStart = false,
): boolean => {
  const nameSlug = computeTransliteration(string, excludedChars);
  const querySlug = computeTransliteration(query, excludedChars);
  return fromStart ? nameSlug.startsWith(querySlug) : includesString(nameSlug, querySlug);
};

export const transliterationIndex = (nameSlug: string, querySlug: string): number => nameSlug.indexOf(querySlug);

export const truncate = (string: string, outputLength: number, wordBoundary = true): string => {
  if (string.length > outputLength) {
    let truncateIndex = outputLength - 1;
    if (wordBoundary && string.lastIndexOf(' ', outputLength - 1) > outputLength - 25) {
      truncateIndex = string.lastIndexOf(' ', outputLength - 1);
    }
    string = `${string.substr(0, truncateIndex)}…`;
  }
  return string;
};

/**
 * Replaces designated places in the source string with the additional arguments
 * e.g. `formatString('{0} {1}!!!', 'Hello', 'World') => 'Hello World!!!'`
 *
 * @param string source string
 * @param args replacements for placeholders in source string
 * @returns source string with replacements applied
 */
export const formatString = (string: string, ...args: any[]): string => {
  args.forEach((arg, index) => {
    const reg = new RegExp(`\\{${index}\\}`, 'gm');
    string = string.replace(reg, arg);
  });
  return string;
};

export const removeLineBreaks = (string = ''): string => string.replace(/[\r\n]/gm, '');

export const replaceInRange = (text: string, replacement: string, startIndex: number, endIndex: number): string => {
  const beforePartial = text.slice(0, startIndex);
  const afterPartial = text.slice(endIndex);
  return `${beforePartial}${replacement}${afterPartial}`;
};

export const sortByPriority = (stringA: string = '', stringB: string = '', query: string = ''): number => {
  stringA = stringA.toLowerCase();
  stringB = stringB.toLowerCase();
  query = query.toLowerCase();

  if (query) {
    if (stringA.startsWith(query) && !stringB.startsWith(query)) {
      return -1;
    } else if (stringB.startsWith(query) && !stringA.startsWith(query)) {
      return 1;
    }
  }

  return stringA.localeCompare(stringB);
};

export const sortUsersByPriority = (userA: User, userB: User): number => sortByPriority(userA.name(), userB.name());

/**
 * @param str The string to convert
 * @returns Converted string as byte array
 */
export const utf8ToUtf16BE = (str = ''): number[] => {
  const BOMChar = '\uFEFF';

  str = `${BOMChar}${str}`;

  const bytes: number[] = [];
  str
    .split('')
    .map(char => char.charCodeAt(0))
    .forEach(charCode => {
      bytes.push((charCode & 0xff00) >> 8);
      bytes.push(charCode & 0xff);
    });

  return bytes;
};
