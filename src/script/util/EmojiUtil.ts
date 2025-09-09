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

import emojies from 'emoji-picker-react/src/data/emojis.json';
import {groupBy} from 'underscore';

// http://www.unicode.org/Public/emoji/11.0/emoji-data.txt
// This is the exact copy of unicode-range definition for `emoji` font in CSS.
export const EMOJI_RANGES =
  'U+1f000-1f003, U+1f004, U+1f005-1f0ce, U+1f0cf, U+1f0d0-1f0ff, U+1f10d-1f10f, U+1f12f, U+1f16c-1f16f, U+1f170-1f171, U+1f17e-1f17f, U+1f18e, U+1f191-1f19a, U+1f1ad-1f1e5, U+1f1e6-1f1ff, U+1f201, U+1f201-1f202, U+1f203-1f20f, U+1f21a, U+1f22f, U+1f232-1f236, U+1f232-1f23a, U+1f238-1f23a, U+1f23c-1f23f, U+1f249-1f24f, U+1f250-1f251, U+1f252-1f2ff, U+1f300-1f320, U+1f300-1f321, U+1f322-1f323, U+1f324-1f393, U+1f32d-1f335, U+1f337-1f37c, U+1f37e-1f393, U+1f385, U+1f394-1f395, U+1f396-1f397, U+1f398, U+1f399-1f39b, U+1f39c-1f39d, U+1f39e-1f3f0, U+1f3a0-1f3ca, U+1f3c2-1f3c4, U+1f3c7, U+1f3ca-1f3cc, U+1f3cf-1f3d3, U+1f3e0-1f3f0, U+1f3f1-1f3f2, U+1f3f3-1f3f5, U+1f3f4, U+1f3f6, U+1f3f7-1f3fa, U+1f3f7-1f4fd, U+1f3f8-1f43e, U+1f3fb-1f3ff, U+1f400-1f4fd, U+1f440, U+1f442-1f443, U+1f442-1f4fc, U+1f446-1f450, U+1f466-1f478, U+1f47c, U+1f481-1f483, U+1f485-1f487, U+1f48f, U+1f491, U+1f4aa, U+1f4fe, U+1f4ff-1f53d, U+1f546-1f548, U+1f549-1f54e, U+1f54b-1f54e, U+1f54f, U+1f550-1f567, U+1f568-1f56e, U+1f56f-1f570, U+1f571-1f572, U+1f573-1f579, U+1f574-1f575, U+1f57a, U+1f57b-1f586, U+1f587, U+1f588-1f589, U+1f58a-1f58d, U+1f58e-1f58f, U+1f590, U+1f591-1f594, U+1f595-1f596, U+1f597-1f5a3, U+1f5a4, U+1f5a5, U+1f5a6-1f5a7, U+1f5a8, U+1f5a9-1f5b0, U+1f5b1-1f5b2, U+1f5b3-1f5bb, U+1f5bc, U+1f5bd-1f5c1, U+1f5c2-1f5c4, U+1f5c5-1f5d0, U+1f5d1-1f5d3, U+1f5d4-1f5db, U+1f5dc-1f5de, U+1f5df-1f5e0, U+1f5e1, U+1f5e2, U+1f5e3, U+1f5e4-1f5e7, U+1f5e8, U+1f5e9-1f5ee, U+1f5ef, U+1f5f0-1f5f2, U+1f5f3, U+1f5f4-1f5f9, U+1f5fa-1f64f, U+1f5fb-1f64f, U+1f645-1f647, U+1f64b-1f64f, U+1f680-1f6c5, U+1f6a3, U+1f6b4-1f6b6, U+1f6c0, U+1f6c6-1f6ca, U+1f6cb-1f6d0, U+1f6cc, U+1f6d0, U+1f6d1-1f6d2, U+1f6d3-1f6d4, U+1f6d5, U+1f6d6-1f6df, U+1f6e0-1f6e5, U+1f6e6-1f6e8, U+1f6e9, U+1f6ea, U+1f6eb-1f6ec, U+1f6ed-1f6ef, U+1f6f0, U+1f6f1-1f6f2, U+1f6f3, U+1f6f4-1f6f6, U+1f6f7-1f6f8, U+1f6f9, U+1f6fa, U+1f6fb-1f6ff, U+1f774-1f77f, U+1f7d5-1f7df, U+1f7e0-1f7eb, U+1f7ec-1f7ff, U+1f80c-1f80f, U+1f848-1f84f, U+1f85a-1f85f, U+1f888-1f88f, U+1f8ae-1f8ff, U+1f90c, U+1f90d-1f90f, U+1f90f, U+1f910-1f918, U+1f918, U+1f919-1f91e, U+1f91f, U+1f920-1f927, U+1f926, U+1f928-1f92f, U+1f930, U+1f931-1f932, U+1f933-1f939, U+1f933-1f93a, U+1f93c-1f93e, U+1f93f, U+1f940-1f945, U+1f947-1f94b, U+1f94c, U+1f94d-1f94f, U+1f950-1f95e, U+1f95f-1f96b, U+1f96c-1f970, U+1f971, U+1f972, U+1f973-1f976, U+1f977-1f979, U+1f97a, U+1f97b, U+1f97c-1f97f, U+1f980-1f984, U+1f985-1f991, U+1f992-1f997, U+1f998-1f9a2, U+1f9a3-1f9a4, U+1f9a5-1f9aa, U+1f9ab-1f9ad, U+1f9ae-1f9af, U+1f9b0-1f9b3, U+1f9b0-1f9b9, U+1f9b5-1f9b6, U+1f9b8-1f9b9, U+1f9ba-1f9bf, U+1f9bb, U+1f9c0, U+1f9c1-1f9c2, U+1f9c3-1f9ca, U+1f9cb-1f9cc, U+1f9cd-1f9cf, U+1f9d0-1f9e6, U+1f9d1-1f9dd, U+1f9e7-1f9ff, U+1fa00-1fa6f, U+1fa70-1fa73, U+1fa74-1fa77, U+1fa78-1fa7a, U+1fa7b-1fa7f, U+1fa80-1fa82, U+1fa83-1fa8f, U+1fa90-1fa95, U+1fa96-1fffd, U+200d, U+203c, U+2049, U+20e3, U+2139, U+2194-2199, U+21a9-21aa, U+231a-231b, U+2328, U+2388, U+23cf, U+23e9-23ec, U+23e9-23f3, U+23f0, U+23f3, U+23f8-23fa, U+24c2, U+25aa-25ab, U+25b6, U+25c0, U+25fb-25fe, U+25fd-25fe, U+2600-2604, U+2605, U+2607-260d, U+260e, U+260f-2610, U+2611, U+2612, U+2614-2615, U+2616-2617, U+2618, U+2619-261c, U+261d, U+261e-261f, U+2620, U+2621, U+2622-2623, U+2624-2625, U+2626, U+2627-2629, U+262a, U+262b-262d, U+262e-262f, U+2630-2637, U+2638-263a, U+263b-263f, U+2640, U+2641, U+2642, U+2643-2647, U+2648-2653, U+2654-265e, U+265f, U+2660, U+2661-2662, U+2663, U+2664, U+2665-2666, U+2667, U+2668, U+2669-267a, U+267b, U+267c-267d, U+267e, U+267f, U+2680-2685, U+2690-2691, U+2692-2694, U+2693, U+2695, U+2696-2697, U+2698, U+2699, U+269a, U+269b-269c, U+269d-269f, U+26a0-26a1, U+26a1, U+26a2-26a9, U+26aa-26ab, U+26ac-26af, U+26b0-26b1, U+26b2-26bc, U+26bd-26be, U+26bf-26c3, U+26c4-26c5, U+26c6-26c7, U+26c8, U+26c9-26cd, U+26ce, U+26ce-26cf, U+26d0, U+26d1, U+26d2, U+26d3-26d4, U+26d4, U+26d5-26e8, U+26e9-26ea, U+26ea, U+26eb-26ef, U+26f0-26f5, U+26f2-26f3, U+26f5, U+26f6, U+26f7-26fa, U+26f9, U+26fa, U+26fb-26fc, U+26fd, U+26fe-2701, U+2702, U+2703-2704, U+2705, U+2708-270d, U+270a-270b, U+270a-270d, U+270e, U+270f, U+2710-2711, U+2712, U+2714, U+2716, U+271d, U+2721, U+2728, U+2733-2734, U+2744, U+2747, U+274c, U+274e, U+2753-2755, U+2757, U+2763-2764, U+2765-2767, U+2795-2797, U+27a1, U+27b0, U+27bf, U+2934-2935, U+2b05-2b07, U+2b1b-2b1c, U+2b50, U+2b55, U+3030, U+303d, U+3297, U+3299, U+e0020-e007f, U+fe0f'
    .replace(/U\+/g, '')
    .split(', ')
    .reduce<Array<string>>((list, codepoint) => {
      const hexBase = 16;
      const [start, end = start]: number[] = codepoint.split('-').map(code => parseInt(code, hexBase));
      for (let code = start; code <= end; code++) {
        list.push(String.fromCodePoint(code));
      }
      return list;
    }, []);

const UNICODE_RANGE_REGEXP = new RegExp(`[${EMOJI_RANGES.join('')}]`, 'g');
const removeWhitespace = (string: string) => string.replace(/\s+/g, '');
const removeEmojis = (string: string) => string.replace(UNICODE_RANGE_REGEXP, '');
const isValidString = (string: string) => typeof string === 'string' && string.length > 0;

export const includesOnlyEmojis = (text: string) =>
  isValidString(text) && removeEmojis(removeWhitespace(text)).length === 0;

const emojiesFlatten = Object.values(emojies).flat();
export const emojiesList = groupBy(emojiesFlatten, 'u');
export const emojiDictionary: Map<string, string> = new Map();

Object.keys(emojiesList).forEach(key => {
  // return if already existing in the dictionary
  if (emojiDictionary.has(key)) {
    return;
  }
  const emojiValue = emojiesList[key];
  // return if not found in list
  if (!emojiValue) {
    return;
  }

  const emojiObject = emojiValue[0];
  const emojiNames = emojiObject.n;

  // Replace hyphens with spaces, but only if not followed by a number
  // example- thumbs down emoji name is -1
  const formattedEmojiName = emojiNames[0].replace(/-(?![0-9])/g, ' ');

  emojiDictionary.set(key, formattedEmojiName);
});

// Function to get the emoji without skintone modifiers
const removeSkinToneModifiers = (emojiUnicode: string): string => {
  const skinToneModifiers = new Set(['1f3fd', '1f3fe', '1f3ff', '1f3fc', '1f3fb']);
  if (!emojiUnicode) {
    return '';
  }
  const emojiUnicodeSplitted = emojiUnicode.split('-');
  const unicodeWithoutSkinModifier = emojiUnicodeSplitted.filter(part => !skinToneModifiers.has(part));

  return unicodeWithoutSkinModifier.join('-');
};
export const getEmojiTitleFromEmojiUnicode = (emojiUnicode: string): string => {
  if (emojiDictionary.has(emojiUnicode)) {
    return emojiDictionary.get(emojiUnicode)!;
  }

  const unicodeWithoutSkinModifier = removeSkinToneModifiers(emojiUnicode);

  return emojiDictionary.get(unicodeWithoutSkinModifier) || '';
};

export function getEmojiUnicode(emojis: string) {
  const hexCode = 16;
  const padding = 4;
  const unicode = [...emojis].map(emoji => emoji.codePointAt(0)?.toString(hexCode).padStart(padding, '0')).join('-');
  return unicode;
}
