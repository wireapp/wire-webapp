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

import {wrapMentionsWithTags} from './wrapMentionsWithTags';

interface MentionTagCharacterizationTestCase {
  readonly description: string;
  readonly inputText: string;
  readonly allowedMentions: string[];
  readonly expectedText: string;
}

const mentionTagCharacterizationTestCases: readonly MentionTagCharacterizationTestCase[] = [
  {
    description: 'no allowed mentions',
    inputText: 'hello @Alice',
    allowedMentions: [],
    expectedText: 'hello @Alice',
  },
  {
    description: 'one mention between ordinary text',
    inputText: 'hello @Alice',
    allowedMentions: ['@Alice'],
    expectedText: 'hello <mention>@Alice</mention>',
  },
  {
    description: 'multiple different mentions',
    inputText: '@Alice and @Bob',
    allowedMentions: ['@Alice', '@Bob'],
    expectedText: '<mention>@Alice</mention> and <mention>@Bob</mention>',
  },
  {
    description: 'repeated occurrences of one mention',
    inputText: '@Alice, please ask @Alice',
    allowedMentions: ['@Alice'],
    expectedText: '<mention>@Alice</mention>, please ask <mention>@Alice</mention>',
  },
  {
    description: 'punctuation adjacent to a mention',
    inputText: '(@Alice),',
    allowedMentions: ['@Alice'],
    expectedText: '(<mention>@Alice</mention>),',
  },
  {
    description: 'Markdown formatting adjacent to a mention',
    inputText: '**@Alice**',
    allowedMentions: ['@Alice'],
    expectedText: '**<mention>@Alice</mention>**',
  },
  {
    description: 'a mention-like value that is not allowed',
    inputText: 'hello @Unknown',
    allowedMentions: ['@Alice'],
    expectedText: 'hello @Unknown',
  },
];

describe('wrapMentionsWithTags', () => {
  it.each(mentionTagCharacterizationTestCases)(
    'preserves the current behavior for $description',
    characterizationTestCase => {
      const actualText = wrapMentionsWithTags(
        characterizationTestCase.inputText,
        characterizationTestCase.allowedMentions,
      );
      const expectedText = characterizationTestCase.expectedText;

      expect(actualText).toBe(expectedText);
    },
  );
});
