/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export type EmojiInlineReplacements = Map<string, [string, string]>;

const inlineReplacements: EmojiInlineReplacements = new Map([
  [':)', ['emoji happysmile', '🙂']],
  [':-)', ['emoji happysmile', '🙂']],
  [':D', ['emoji veryhappysmile', '😀']],
  [':-D', ['emoji veryhappysmile', '😀']],
  [':-d', ['emoji grinning', '😆']],
  ['B-)', ['emoji sunglasses', '😎']],
  ['b-)', ['emoji sunglasses', '😎']],
  ['8-)', ['emoji sunglasses', '😎']],
  [':(', ['emoji disappointed', '😞']],
  [':-(', ['emoji disappointed', '😞']],
  [';)', ['emoji wink', '😉']],
  [';-)', ['emoji wink', '😉']],
  [';-]', ['emoji wink', '😉']],
  [';]', ['emoji wink', '😉']],
  [':/', ['emoji confused', '😕']],
  [':-/', ['emoji confused', '😕']],
  [':P', ['emoji stuck out tongue', '😛']],
  [':-P', ['emoji stuck out tongue', '😛']],
  [':-p', ['emoji stuck out tongue', '😛']],
  [';P', ['emoji stuck out tongue winking eye', '😜']],
  [';-P', ['emoji stuck out tongue winking eye', '😜']],
  [';-p', ['emoji stuck out tongue winking eye', '😜']],
  [':O', ['emoji open mouth', '😮']],
  [':-o', ['emoji open mouth', '😮']],
  ['O:)', ['emoji innocent', '😇']],
  ['O:-)', ['emoji innocent', '😇']],
  ['o:)', ['emoji innocent', '😇']],
  ['o:-)', ['emoji innocent', '😇']],
  [';^)', ['emoji smirk', '😏']],
  [':@', ['emoji angry', '😠']],
  ['>:(', ['emoji rage', '😡']],
  ['}:-)', ['emoji smiling imp', '😈']],
  ['}:)', ['emoji smiling imp', '😈']],
  ['3:-)', ['emoji smiling imp', '😈']],
  ['3:)', ['emoji smiling imp', '😈']],
  [';(', ['emoji cry', '😢']],
  [":'(", ['emoji cry', '😢']],
  [":'-(", ['emoji cry', '😢']],
  [":'-)", ['emoji joy', '😂']],
  [":')", ['emoji joy', '😂']],
  [':*', ['emoji kissing heart', '😘']],
  [':^*', ['emoji kissing heart', '😘']],
  [':-*', ['emoji kissing heart', '😘']],
  [':-|', ['emoji neutral face', '😐']],
  [':|', ['emoji neutral face', '😐']],
  [':$', ['emoji flushed', '😳']],
  [':-X', ['emoji no mouth', '😶']],
  [':X', ['emoji no mouth', '😶']],
  [':-#', ['emoji no mouth', '😶']],
  [':#', ['emoji no mouth', '😶']],
  ['\\o/', ['emoji raised hands', '🙌']],
  ['<3', ['emoji heart', '♥️']],
  ['</3', ['emoji broken heart', '💔️']],
]);

export {inlineReplacements};
