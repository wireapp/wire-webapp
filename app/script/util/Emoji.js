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

// http://www.unicode.org/Public/emoji/5.0/emoji-data.txt
// This is the exact copy of unicode-range definition for `emoji` font in CSS.
const EMOJI_UNICODE_RANGES = 'U+200D, U+FE0F, U+1F004, U+1F0CF, U+1F170-1F171, U+1F17E, U+1F17F, U+1F18E, U+1F191-1F19A, U+1F1E6-1F1FF, U+1F201, U+1F201-1F202, U+1F21A, U+1F22F, U+1F232-1F236, U+1F232-1F23A, U+1F238-1F23A, U+1F250-1F251, U+1F300-1F320, U+1F321, U+1F324-1F32C, U+1F32D-1F32F, U+1F330-1F335, U+1F336, U+1F337-1F37C, U+1F37D, U+1F37E-1F37F, U+1F380-1F393, U+1F385, U+1F396-1F397, U+1F399-1F39B, U+1F39E-1F39F, U+1F3A0-1F3C4, U+1F3C2-1F3C4, U+1F3C5, U+1F3C6-1F3CA, U+1F3C7, U+1F3CA, U+1F3CB-1F3CC, U+1F3CB-1F3CE, U+1F3CF-1F3D3, U+1F3D4-1F3DF, U+1F3E0-1F3F0, U+1F3F3-1F3F5, U+1F3F4, U+1F3F7, U+1F3F8-1F3FF, U+1F3FB-1F3FF, U+1F400-1F43E, U+1F43F, U+1F440, U+1F441, U+1F442-1F443, U+1F442-1F4F7, U+1F446-1F450, U+1F466-1F469, U+1F46E, U+1F470-1F478, U+1F47C, U+1F481-1F483, U+1F485-1F487, U+1F4AA, U+1F4F8, U+1F4F9-1F4FC, U+1F4FD, U+1F4FF, U+1F500-1F53D, U+1F549-1F54A, U+1F54B-1F54E, U+1F550-1F567, U+1F56F-1F570, U+1F573-1F579, U+1F574-1F575, U+1F57A, U+1F587, U+1F58A-1F58D, U+1F590, U+1F595-1F596, U+1F5A4, U+1F5A5, U+1F5A8, U+1F5B1-1F5B2, U+1F5BC, U+1F5C2-1F5C4, U+1F5D1-1F5D3, U+1F5DC-1F5DE, U+1F5E1, U+1F5E3, U+1F5E8, U+1F5EF, U+1F5F3, U+1F5FA, U+1F5FB-1F5FF, U+1F600, U+1F601-1F610, U+1F611, U+1F612-1F614, U+1F615, U+1F616, U+1F617, U+1F618, U+1F619, U+1F61A, U+1F61B, U+1F61C-1F61E, U+1F61F, U+1F620-1F625, U+1F626-1F627, U+1F628-1F62B, U+1F62C, U+1F62D, U+1F62E-1F62F, U+1F630-1F633, U+1F634, U+1F635-1F640, U+1F641-1F642, U+1F643-1F644, U+1F645-1F647, U+1F645-1F64F, U+1F64B-1F64F, U+1F680-1F6C5, U+1F6A3, U+1F6B4-1F6B6, U+1F6C0, U+1F6CB-1F6CF, U+1F6CC, U+1F6D0, U+1F6D1-1F6D2, U+1F6E0-1F6E5, U+1F6E9, U+1F6EB-1F6EC, U+1F6F0, U+1F6F3, U+1F6F4-1F6F6, U+1F6F7-1F6F8, U+1F910-1F918, U+1F918, U+1F919-1F91C, U+1F919-1F91E, U+1F91E, U+1F91F, U+1F920-1F927, U+1F926, U+1F928-1F92F, U+1F930, U+1F931-1F932, U+1F933-1F939, U+1F933-1F93A, U+1F93C-1F93E, U+1F93D-1F93E, U+1F940-1F945, U+1F947-1F94B, U+1F94C, U+1F950-1F95E, U+1F95F-1F96B, U+1F980-1F984, U+1F985-1F991, U+1F992-1F997, U+1F9C0, U+1F9D0-1F9E6, U+1F9D1-1F9DD, U+203C, U+2049, U+2139, U+2194-2199, U+21A9-21AA, U+231A-231B, U+2328, U+23CF, U+23E9-23EC, U+23E9-23F3, U+23F0, U+23F3, U+23F8-23FA, U+24C2, U+25AA-25AB, U+25B6, U+25C0, U+25FB-25FE, U+25FD-25FE, U+2600-2604, U+260E, U+2611, U+2614-2615, U+2618, U+261D, U+2620, U+2622-2623, U+2626, U+262A, U+262E-262F, U+2638-263A, U+2640, U+2642, U+2648-2653, U+2660, U+2663, U+2665-2666, U+2668, U+267B, U+267F, U+2692-2697, U+2693, U+2699, U+269B-269C, U+26A0-26A1, U+26A1, U+26AA-26AB, U+26B0-26B1, U+26BD-26BE, U+26C4-26C5, U+26C8, U+26CE, U+26CF, U+26D1, U+26D3-26D4, U+26D4, U+26E9-26EA, U+26EA, U+26F0-26F5, U+26F2-26F3, U+26F5, U+26F7-26FA, U+26F9, U+26FA, U+26FD, U+2702, U+2705, U+2708-2709, U+270A-270B, U+270C-270D, U+270F, U+2712, U+2714, U+2716, U+271D, U+2721, U+2728, U+2733-2734, U+2744, U+2747, U+274C, U+274E, U+2753-2755, U+2757, U+2763-2764, U+2795-2797, U+27A1, U+27B0, U+27BF, U+2934-2935, U+2B05-2B07, U+2B1B-2B1C, U+2B50, U+2B55, U+3030, U+303D, U+3297, U+3299'
  .replace(/U\+/g, '')
  .split(', ')
  .reduce((list, codepoint) => {
    if (codepoint.indexOf('-') === -1) {
      list.push(String.fromCodePoint(`0x${codepoint}`));
    } else {
      const hex_base = 16;
      const [start, end] = codepoint.split('-').map(code => parseInt(code, hex_base));
      for (let code = start; code <= end; code++) {
        list.push(String.fromCodePoint(`0x${code.toString(hex_base)}`));
      }
    }
    return list;
  }, []);

const EMOJI_UNICODE_RANGE_REGEXP = new RegExp(`[${EMOJI_UNICODE_RANGES.join('')}]`, 'g');

z.util.emoji = {
  includes_only_emojies: function(text) {
    const isValidString = string => _.isString(string) && string.length > 0;
    const removeEmojies = string => string.replace(EMOJI_UNICODE_RANGE_REGEXP, '');
    const removeWhitespace = string => string.replace(/\s+/g, '');

    return isValidString(text) && removeEmojies(removeWhitespace(text)).length === 0;
  },
};
