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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.StringUtil = {
  capitalizeFirstChar: (string = '') => `${string.charAt(0).toUpperCase()}${string.substring(1)}`,

  compareTransliteration: (nameA, nameB, excludedChars = []) => {
    const options = {custom: excludedChars};
    return z.util.StringUtil.includes(window.getSlug(nameA, options), window.getSlug(nameB, options));
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

  removeLineBreaks: (string = '') => string.replace(/(\r\n|\n|\r)/gm, ''),

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

  trimLineBreaks: (string = '') => string.replace(/^\s+|\s+$/g, ''),

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
};
