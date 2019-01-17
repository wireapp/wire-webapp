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

window.z = window.z || {};
window.z.util = z.util || {};

z.util.StringUtil = {
  /**
   * @param {ArrayLike} bytes - bytes to convert
   * @returns {string} bytes as hex string
   */
  bytesToHex: bytes => {
    bytes = Array.from(bytes);

    const hexBase = 16;
    const padIndex = 2;

    return bytes
      .map(byte => {
        const stringByte = byte.toString(hexBase);
        return z.util.StringUtil.padStart(stringByte, padIndex, '0');
      })
      .join('');
  },

  capitalizeFirstChar: (string = '') => `${string.charAt(0).toUpperCase()}${string.substring(1)}`,

  /**
   * Returns true if the string and the query match by applying transliteration first.
   *
   * @param {string} string - the string to compare the query against
   * @param {string} query - the query to compare to the string
   * @param {Object} excludedChars - extra characters to ignore when creating a slug ({[string]: string})
   * @param {boolean} fromStart=false - should the query match the string from the beginning of the string
   * @returns {boolean} does the string matches the query
   */
  compareTransliteration: (string, query, excludedChars = {}, fromStart = false) => {
    const nameSlug = z.util.StringUtil.computeTransliteration(string, excludedChars);
    const querySlug = z.util.StringUtil.computeTransliteration(query, excludedChars);
    return fromStart ? nameSlug.startsWith(querySlug) : z.util.StringUtil.includes(nameSlug, querySlug);
  },

  computeTransliteration: (string, excludedChars = {}) => {
    const options = {custom: excludedChars, uric: true};
    return getSlug(string, options);
  },

  cutLastChars: (string, length) => string.substring(0, string.length - length),

  format: (...args) => {
    let [string] = args;

    for (let index = 0; index < args.length; ++index) {
      const reg = new RegExp(`\\{${index}\\}`, 'gm');
      string = string.replace(reg, args[index + 1]);
    }

    return string;
  },

  getFirstChar: string => [...string][0],

  getLastChars: (string, length) => (string.length < length ? false : string.substring(string.length - length)),

  getRandomChar: () => {
    let charIndex;
    while (
      !z.util.NumberUtil.inRange(charIndex, 1, 9) &&
      !z.util.NumberUtil.inRange(charIndex, 65, 90) &&
      !z.util.NumberUtil.inRange(charIndex, 97, 122)
    ) {
      charIndex = Math.floor(Math.random() * 122);
    }

    // Returns random alphanumeric character [A-Z, a-z, 0-9]
    return charIndex <= 9 ? charIndex : String.fromCharCode(charIndex);
  },

  /**
   * @param {string} hexString - string to convert
   * @returns {number[]} bytes as array
   */
  hexToBytes: hexString => {
    const bytes = [];
    const hexBase = 16;

    for (let charIndex = 0; charIndex < hexString.length; charIndex += 2) {
      const parsedInt = parseInt(hexString.substr(charIndex, 2), hexBase);
      bytes.push(parsedInt);
    }

    return bytes;
  },

  includes: (string = '', query = '') => string.toLowerCase().includes(query.toLowerCase()),

  obfuscate: text => {
    const alphabet = Array.from('abcdefghijklmnopqrstuvwxyz');
    let obfuscated = '';

    for (const character of text) {
      if (character.match(/[\n\r\s]+/gi)) {
        obfuscated += character;
      } else {
        obfuscated += z.util.ArrayUtil.randomElement(alphabet);
      }
    }

    return obfuscated;
  },

  /**
   * @param {string} str - string to pad
   * @param {number} length - maximum length to pad
   * @param {string} [padCharacter] - character to pad with (default is space)
   * @returns {string} The padded string
   */
  padStart(str, length, padCharacter = ' ') {
    if (str.length >= length) {
      return str;
    }
    return padCharacter.repeat(length - str.length) + str;
  },

  removeLineBreaks: (string = '') => string.replace(/(\r\n|\n|\r)/gm, ''),

  replaceInRange(text, replacement, startIndex, endIndex) {
    const beforePartial = text.slice(0, startIndex);
    const afterPartial = text.slice(endIndex);
    return `${beforePartial}${replacement}${afterPartial}`;
  },

  sortByPriority: (stringA = '', stringB = '', query) => {
    stringA = stringA.toLowerCase();
    stringB = stringB.toLowerCase();

    if (query) {
      if (z.util.StringUtil.startsWith(stringA, query)) {
        if (!z.util.StringUtil.startsWith(stringB, query)) {
          return -1;
        }
      } else if (z.util.StringUtil.startsWith(stringB, query)) {
        if (!z.util.StringUtil.startsWith(stringA, query)) {
          return 1;
        }
      }
    }

    if (stringA < stringB) {
      return -1;
    }

    if (stringA > stringB) {
      return 1;
    }

    return 0;
  },

  splitAtPivotElement: (text, pivot, replacement) => {
    if (!pivot) {
      return [
        {
          isStyled: false,
          text,
        },
      ];
    }

    const findPivot = pivot === '?' ? new RegExp('(\\?)') : new RegExp(`(${pivot})`);

    return text
      .split(findPivot)
      .map(value => {
        return value
          ? {
              isStyled: value === pivot,
              text: value === pivot ? replacement : value,
            }
          : undefined;
      })
      .filter(item => item);
  },

  startsWith: (string = '', query) => string.toLowerCase().startsWith(query.toLowerCase()),

  trimEnd: (string = '') => string.replace(/\s*$/, ''),
  trimStart: (string = '') => string.replace(/^\s*/, ''),

  truncate: (string, outputLength, wordBoundary = true) => {
    if (string.length > outputLength) {
      let truncateIndex = outputLength - 1;
      if (wordBoundary && string.lastIndexOf(' ', outputLength - 1) > outputLength - 25) {
        truncateIndex = string.lastIndexOf(' ', outputLength - 1);
      }
      string = `${string.substr(0, truncateIndex)}…`;
    }
    return string;
  },

  /**
   * @param {string} str - The string to convert
   * @returns {number[]} Converted string as byte array
   */
  utf8ToUtf16BE: str => {
    const BOMChar = '\uFEFF';

    str = `${BOMChar}${str}`;

    const bytes = [];

    for (let i = 0; i < str.length; ++i) {
      const charCode = str.charCodeAt(i);
      bytes.push((charCode & 0xff00) >> 8);
      bytes.push(charCode & 0xff);
    }

    return bytes;
  },
};
