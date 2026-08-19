/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {findAndTransformEmoji} from './InlineEmojiReplacementPlugin';

interface EmojiReplacementCharacterizationTestCase {
  readonly description: string;
  readonly inputText: string;
  readonly expectedText: string;
}

const emojiReplacementCharacterizationTestCases: readonly EmojiReplacementCharacterizationTestCase[] = [
  {
    description: 'an emoticon at the beginning of a message',
    inputText: ':)',
    expectedText: '🙂',
  },
  {
    description: 'an emoticon between words',
    inputText: 'hello :) world',
    expectedText: 'hello 🙂 world',
  },
  {
    description: 'a heart emoticon',
    inputText: '<3',
    expectedText: '❤️',
  },
  {
    description: 'a laughing emoticon',
    inputText: ':D',
    expectedText: '😄',
  },
  {
    description: 'the configured first matching replacement in a message with multiple candidates',
    inputText: ':) :D',
    expectedText: ':) 😄',
  },
  {
    description: 'an emoticon attached to a preceding word',
    inputText: 'hello:)',
    expectedText: 'hello:)',
  },
  {
    description: 'an emoticon followed immediately by punctuation',
    inputText: ':)!',
    expectedText: ':)!',
  },
  {
    description: 'an ordinary Unicode emoji',
    inputText: 'already 😀',
    expectedText: 'already 😀',
  },
];

describe('findAndTransformEmoji', () => {
  it.each(emojiReplacementCharacterizationTestCases)(
    'preserves the current behavior for $description',
    characterizationTestCase => {
      const actualText = findAndTransformEmoji(characterizationTestCase.inputText);
      const expectedText = characterizationTestCase.expectedText;

      expect(actualText).toBe(expectedText);
    },
  );
});
