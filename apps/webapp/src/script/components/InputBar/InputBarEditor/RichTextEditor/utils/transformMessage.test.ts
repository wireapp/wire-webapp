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

import {createWireLexicalEditorTestHarness} from '../testSupport/createWireLexicalEditorTestHarness';
import {getRawMessageText, transformMessage} from './transformMessage';

interface MessageTransformationTestCase {
  readonly description: string;
  readonly replaceEmojis: boolean;
  readonly inputMarkdown: string;
  readonly expectedMessage: string;
}

const messageTransformationTestCases: readonly MessageTransformationTestCase[] = [
  {
    description: 'does not replace emoticons when emoji replacement is disabled',
    replaceEmojis: false,
    inputMarkdown: 'hello :)',
    expectedMessage: 'hello :)',
  },
  {
    description: 'replaces a supported emoticon when emoji replacement is enabled',
    replaceEmojis: true,
    inputMarkdown: 'hello :)',
    expectedMessage: 'hello 🙂',
  },
  {
    description: 'preserves text without a supported emoticon',
    replaceEmojis: true,
    inputMarkdown: 'hello there',
    expectedMessage: 'hello there',
  },
  {
    description: 'uses the configured first matching replacement',
    replaceEmojis: true,
    inputMarkdown: ':) :D',
    expectedMessage: ':) 😄',
  },
  {
    description: 'preserves ordinary Unicode emoji',
    replaceEmojis: true,
    inputMarkdown: 'already 😀',
    expectedMessage: 'already 😀',
  },
];

interface RawMessageTextTestCase {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly expectedText: string;
}

const rawMessageTextTestCases: readonly RawMessageTextTestCase[] = [
  {
    description: 'an empty editor',
    inputMarkdown: '',
    expectedText: '',
  },
  {
    description: 'a paragraph with one line break',
    inputMarkdown: 'first line\nsecond line',
    expectedText: 'first line\nsecond line',
  },
  {
    description: 'two paragraphs separated by a blank line',
    inputMarkdown: 'first paragraph\n\nsecond paragraph',
    expectedText: 'first paragraph\n\nsecond paragraph',
  },
  {
    description: 'an ordered list',
    inputMarkdown: '1. first\n2. second',
    expectedText: 'first\n\nsecond',
  },
  {
    description: 'formatted text',
    inputMarkdown: '**bold** *italic* `code`',
    expectedText: 'bold italic code',
  },
  {
    description: 'a link',
    inputMarkdown: '[Wire](https://wire.com)',
    expectedText: 'Wire',
  },
];

function getRawMessageTextFromMarkdown(inputMarkdown: string): string {
  const harness = createWireLexicalEditorTestHarness();
  harness.importMarkdown(inputMarkdown);

  return harness.editor.getEditorState().read(() => {
    return getRawMessageText();
  });
}

describe('transformMessage', () => {
  it.each(messageTransformationTestCases)(
    'preserves the current behavior when it $description',
    transformationTestCase => {
      const actualMessage = transformMessage({
        replaceEmojis: transformationTestCase.replaceEmojis,
        markdown: transformationTestCase.inputMarkdown,
      });
      const expectedMessage = transformationTestCase.expectedMessage;

      expect(actualMessage).toBe(expectedMessage);
    },
  );
});

describe('getRawMessageText', () => {
  it.each(rawMessageTextTestCases)('preserves the current behavior for $description', rawTextTestCase => {
    const actualText = getRawMessageTextFromMarkdown(rawTextTestCase.inputMarkdown);
    const expectedText = rawTextTestCase.expectedText;

    expect(actualText).toBe(expectedText);
  });
});
