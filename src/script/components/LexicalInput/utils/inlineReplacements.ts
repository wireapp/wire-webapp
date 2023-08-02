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
  [':P', ['emoji stuckouttongue', '😛']],
  [':-P', ['emoji stuckouttongue', '😛']],
  [':-p', ['emoji stuckouttongue', '😛']],
  [';P', ['emoji stuckouttonguewinkingeye', '😜']],
  [';-P', ['emoji stuckouttonguewinkingeye', '😜']],
  [';-p', ['emoji stuckouttonguewinkingeye', '😜']],
  [':O', ['emoji openmouth', '😮']],
  [':-o', ['emoji openmouth', '😮']],
  ['O:)', ['emoji innocent', '😇']],
  ['O:-)', ['emoji innocent', '😇']],
  ['o:)', ['emoji innocent', '😇']],
  ['o:-)', ['emoji innocent', '😇']],
  [';^)', ['emoji smirk', '😏']],
  [':@', ['emoji angry', '😠']],
  ['>:(', ['emoji rage', '😡']],
  ['}:-)', ['emoji smilingimp', '😈']],
  ['}:)', ['emoji smilingimp', '😈']],
  ['3:-)', ['emoji smilingimp', '😈']],
  ['3:)', ['emoji smilingimp', '😈']],
  [';(', ['emoji cry', '😢']],
  [":'(", ['emoji cry', '😢']],
  [":'-(", ['emoji cry', '😢']],
  [":'-)", ['emoji joy', '😂']],
  [":')", ['emoji joy', '😂']],
  [':*', ['emoji kissingheart', '😘']],
  [':^*', ['emoji kissingheart', '😘']],
  [':-*', ['emoji kissingheart', '😘']],
  [':-|', ['emoji neutralface', '😐']],
  [':|', ['emoji neutralface', '😐']],
  [':$', ['emoji flushed', '😳']],
  [':-X', ['emoji nomouth', '😶']],
  [':X', ['emoji nomouth', '😶']],
  [':-#', ['emoji nomouth', '😶']],
  [':#', ['emoji nomouth', '😶']],
  ['\\o/', ['emoji raisedhands', '🙌']],
  ['<3', ['emoji heart', '♥️']],
  ['</3', ['emoji brokenheart', '💔️']],
]);

export {inlineReplacements};
