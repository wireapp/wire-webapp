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
  capitalizeFirstChar: function(string = '') {
    return `${string.charAt(0).toUpperCase()}${string.substring(1)}`;
  },
  compareTransliteration: function(nameA, nameB, excludedChars = []) {
    const options = {custom: excludedChars};
    return z.util.StringUtil.includes(window.getSlug(nameA, options), window.getSlug(nameB, options));
  },
  format: function() {
    let string = arguments[0];

    for (let index = 0; index < arguments.length; ++index) {
      const reg = new RegExp(`\\{${index}\\}`, 'gm');
      string = string.replace(reg, arguments[index + 1]);
    }

    return string;
  },
  getFirstCharacter: function(string) {
    return [...string][0];
  },
  getRandomCharacter: function() {
    let charIndex;
    while (
      !z.util.NumberUtil.in_range(charIndex, 1, 9) &&
      !z.util.NumberUtil.in_range(charIndex, 65, 90) &&
      !z.util.NumberUtil.in_range(charIndex, 97, 122)
    ) {
      charIndex = Math.floor(Math.random() * 122);
    }

    // Returns random alphanumeric character [A-Z, a-z, 0-9]
    return charIndex <= 9 ? charIndex : String.fromCharCode(charIndex);
  },
  includes: function(string = '', query = '') {
    return string.toLowerCase().includes(query.toLowerCase());
  },
  obfuscate: function(text) {
    const alphabet = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'q',
      'r',
      's',
      't',
      'u',
      'v',
      'x',
      'y',
      'z',
    ];
    let obfuscated = '';

    for (const character of text) {
      if (character.match(/[\n\r\s]+/gi)) {
        obfuscated += character;
      } else {
        obfuscated += z.util.ArrayUtil.random_element(alphabet);
      }
    }

    return obfuscated;
  },
  removeLineBreaks: function(string = '') {
    return string.replace(/(\r\n|\n|\r)/gm, '');
  },
  sortByPriority: function(stringA = '', stringB = '', query) {
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
  splitAtPivotElement: function(text, pivot, replacement) {
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
  startsWith: function(string = '', query) {
    return string.toLowerCase().startsWith(query.toLowerCase());
  },
  trimLineBreaks: function(string = '') {
    return string.replace(/^\s+|\s+$/g, '');
  },
  truncate: function(string, outputLength, wordBoundary = true) {
    if (string.length > outputLength) {
      let truncIndex = outputLength - 1;
      if (wordBoundary && string.lastIndexOf(' ', outputLength - 1) > outputLength - 25) {
        truncIndex = string.lastIndexOf(' ', outputLength - 1);
      }
      string = `${string.substr(0, truncIndex)}…`;
    }
    return string;
  },
};
