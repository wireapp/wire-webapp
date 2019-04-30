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

export const startsWith = (string = '', query) => string.toLowerCase().startsWith(query.toLowerCase());

export const includesString = (string = '', query = '') => string.toLowerCase().includes(query.toLowerCase());

export const getFirstChar = string => [...string][0]; // the destructuring is needed to properly return unicode characters

export const trimEnd = (string = '') => string.replace(/\s*$/, '');

export const trimStart = (string = '') => string.replace(/^\s*/, '');

/**
 * @param {string} str - string to pad
 * @param {number} length - maximum length to pad
 * @param {string} [padCharacter] - character to pad with (default is space)
 * @returns {string} The padded string
 */
export const padStart = (str, length, padCharacter = ' ') => {
  if (str.length >= length) {
    return str;
  }
  return padCharacter.repeat(length - str.length) + str;
};

/**
 * @param {ArrayLike} bytes - bytes to convert
 * @returns {string} bytes as hex string
 */
export const bytesToHex = bytes => {
  const hexBase = 16;
  const padIndex = 2;
  return Array.from(bytes, byte => padStart(byte.toString(hexBase), padIndex, '0')).join('');
};

export const capitalizeFirstChar = (string = '') => `${string.charAt(0).toUpperCase()}${string.substring(1)}`;

export const computeTransliteration = (string, excludedChars = {}) => {
  const options = {custom: excludedChars, uric: true};
  return getSlug(string, options);
};

const charArray = Array.from('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
export const getRandomChar = () => randomElement(charArray);

const alphabet = Array.from('abcdefghijklmnopqrstuvwxyz');
export const obfuscate = text => Array.from(text, char => (/\s/.test(char) ? char : randomElement(alphabet))).join('');

/**
 * Returns true if the string and the query match by applying transliteration first.
 *
 * @param {string} string - the string to compare the query against
 * @param {string} query - the query to compare to the string
 * @param {Object} excludedChars - extra characters to ignore when creating a slug ({[string]: string})
 * @param {boolean} fromStart=false - should the query match the string from the beginning of the string
 * @returns {boolean} does the string matches the query
 */
export const compareTransliteration = (string, query, excludedChars = {}, fromStart = false) => {
  const nameSlug = computeTransliteration(string, excludedChars);
  const querySlug = computeTransliteration(query, excludedChars);
  return fromStart ? nameSlug.startsWith(querySlug) : includesString(nameSlug, querySlug);
};

export const truncate = (string, outputLength, wordBoundary = true) => {
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
 * e.g. formatString('{0} {1}!!!', 'Hello', 'World') => 'Hello World!!!'
 *
 * @param {string} string - source string
 * @param  {...any} args - replacements for placeholders in source string
 * @returns {string} source string with replacements applied
 */
export const formatString = (string, ...args) => {
  args.forEach((arg, index) => {
    const reg = new RegExp(`\\{${index}\\}`, 'gm');
    string = string.replace(reg, arg);
  });
  return string;
};

export const removeLineBreaks = (string = '') => string.replace(/(\r\n|\n|\r)/gm, '');

export const replaceInRange = (text, replacement, startIndex, endIndex) => {
  const beforePartial = text.slice(0, startIndex);
  const afterPartial = text.slice(endIndex);
  return `${beforePartial}${replacement}${afterPartial}`;
};

export const sortByPriority = (stringA = '', stringB = '', query) => {
  stringA = stringA.toLowerCase();
  stringB = stringB.toLowerCase();

  if (query) {
    if (startsWith(stringA, query) && !startsWith(stringB, query)) {
      return -1;
    } else if (startsWith(stringB, query) && !startsWith(stringA, query)) {
      return 1;
    }
  }

  return stringA.localeCompare(stringB);
};

/**
 * @param {string} str - The string to convert
 * @returns {number[]} Converted string as byte array
 */
export const utf8ToUtf16BE = (str = '') => {
  const BOMChar = '\uFEFF';

  str = `${BOMChar}${str}`;

  const bytes = [];
  str
    .split('')
    .map(char => char.charCodeAt(0))
    .forEach(charCode => {
      bytes.push((charCode & 0xff00) >> 8);
      bytes.push(charCode & 0xff);
    });

  return bytes;
};
