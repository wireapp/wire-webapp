/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
  capitalize_first_char: function(string = '') {
    return `${string.charAt(0).toUpperCase()}${string.substring(1)}`;
  },
  compare_transliteration: function(name_a, name_b) {
    return z.util.StringUtil.includes(window.getSlug(name_a), window.getSlug(name_b));
  },
  format: function() {
    let string = arguments[0];

    for (let index = 0; index < arguments.length; ++index) {
      const reg = new RegExp(`\\{${index}\\}`, 'gm');
      string = string.replace(reg, z.util.escape_html(arguments[index + 1]));
    }

    return string;
  },
  get_first_character: function(string) {
    return [...string][0];
  },
  get_random_character: function() {
    let char_index;
    while (!z.util.NumberUtil.in_range(char_index, 1, 9) && !z.util.NumberUtil.in_range(char_index, 65, 90) && !z.util.NumberUtil.in_range(char_index, 97, 122)) {
      char_index = Math.floor(Math.random() * 122);
    }

    // Returns random alphanumeric character [A-Z, a-z, 0-9]
    return char_index <= 9 ? char_index : String.fromCharCode(char_index);
  },
  includes: function(string = '', query = '') {
    return string.toLowerCase().includes(query.toLowerCase());
  },
  obfuscate: function(text) {
    const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z'];
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
  remove_line_breaks: function(string = '') {
    return string.replace(/(\r\n|\n|\r)/gm, '');
  },
  sort_by_priority: function(string_a = '', string_b = '', query) {
    string_a = string_a.toLowerCase();
    string_b = string_b.toLowerCase();

    if (query) {
      if (z.util.StringUtil.starts_with(string_a, query)) {
        if (!z.util.StringUtil.starts_with(string_b, query)) {
          return -1;
        }
      } else if (z.util.StringUtil.starts_with(string_b, query)) {
        if (!z.util.StringUtil.starts_with(string_a, query)) {
          return 1;
        }
      }
    }

    if (string_a < string_b) {
      return -1;
    }

    if (string_a > string_b) {
      return 1;
    }

    return 0;
  },
  starts_with: function(string = '', query) {
    return string.toLowerCase().startsWith(query.toLowerCase());
  },
  trim_line_breaks: function(string = '') {
    return string.replace(/^\s+|\s+$/g, '');
  },
  truncate: function(string, output_length, word_boundary = true) {
    if (string.length > output_length) {
      let trunc_index = output_length - 1;
      if (word_boundary && (string.lastIndexOf(' ', output_length - 1) > (output_length - 25))) {
        trunc_index = string.lastIndexOf(' ', output_length - 1);
      }
      string = `${string.substr(0, trunc_index)}…`;
    }
    return string;
  },
};
