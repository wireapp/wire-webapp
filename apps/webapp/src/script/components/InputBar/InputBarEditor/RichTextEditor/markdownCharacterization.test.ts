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

import {
  createWireLexicalEditorTestHarness,
  WireLexicalEditorTestHarness,
} from './testSupport/createWireLexicalEditorTestHarness';

type MarkdownCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly expectedMarkdown: string;
  readonly expectedTextContent: string;
};

const markdownCharacterizationTestCases: MarkdownCharacterizationTestCase[] = [
  {description: 'an empty message', inputMarkdown: '', expectedMarkdown: '', expectedTextContent: ''},
  {
    description: 'ordinary text with punctuation and Unicode',
    inputMarkdown: 'Hello, 世界 🌍! 42. — café',
    expectedMarkdown: 'Hello, 世界 🌍! 42. — café',
    expectedTextContent: 'Hello, 世界 🌍! 42. — café',
  },
  {
    description: 'leading, trailing, and consecutive spaces',
    inputMarkdown: '  leading  and trailing  ',
    expectedMarkdown: '  leading  and trailing  ',
    expectedTextContent: '  leading  and trailing  ',
  },
  {
    description: 'a backslash that is not Markdown syntax',
    inputMarkdown: 'escaped\\backslash',
    expectedMarkdown: 'escaped\\backslash',
    expectedTextContent: 'escaped\\backslash',
  },
  {
    description: 'a date-like line beginning with a non-one ordered marker',
    inputMarkdown: '14. - 25. september',
    expectedMarkdown: '14. - 25. september',
    expectedTextContent: '- 25. september',
  },
  {
    description: 'a date-like line beginning with a capitalized month',
    inputMarkdown: '14. September',
    expectedMarkdown: '14. September',
    expectedTextContent: 'September',
  },
  {
    description: 'a year-like line followed by a word',
    inputMarkdown: '2026. something',
    expectedMarkdown: '2026. something',
    expectedTextContent: 'something',
  },
  {
    description: 'a one-based ordered-list-looking line',
    inputMarkdown: '1. something',
    expectedMarkdown: '1. something',
    expectedTextContent: 'something',
  },
  {
    description: 'a zero-padded ordered-list-looking line',
    inputMarkdown: '01. something',
    expectedMarkdown: '1. something',
    expectedTextContent: 'something',
  },
  {
    description: 'a zero ordered-list-looking line',
    inputMarkdown: '0. something',
    expectedMarkdown: '0. something',
    expectedTextContent: 'something',
  },
  {
    description: 'a number without a space after its period',
    inputMarkdown: '1.something',
    expectedMarkdown: '1.something',
    expectedTextContent: '1.something',
  },
  {
    description: 'a number followed by a closing parenthesis',
    inputMarkdown: '1) something',
    expectedMarkdown: '1) something',
    expectedTextContent: '1) something',
  },
  {
    description: 'a hyphen without a following space',
    inputMarkdown: '-something',
    expectedMarkdown: '-something',
    expectedTextContent: '-something',
  },
  {
    description: 'an asterisk without a following space',
    inputMarkdown: '*something',
    expectedMarkdown: '*something',
    expectedTextContent: '*something',
  },
  {
    description: 'a plus sign without a following space',
    inputMarkdown: '+something',
    expectedMarkdown: '+something',
    expectedTextContent: '+something',
  },
  {
    description: 'a blockquote marker followed by text',
    inputMarkdown: '> something',
    expectedMarkdown: '> something',
    expectedTextContent: 'something',
  },
  {
    description: 'a hash marker followed by text',
    inputMarkdown: '# something',
    expectedMarkdown: '# something',
    expectedTextContent: 'something',
  },
  {
    description: 'plain text containing a period after a number',
    inputMarkdown: 'The version is 1. something else.',
    expectedMarkdown: 'The version is 1. something else.',
    expectedTextContent: 'The version is 1. something else.',
  },
  {
    description: 'two ordinary lines',
    inputMarkdown: 'first line\nsecond line',
    expectedMarkdown: 'first line\nsecond line',
    expectedTextContent: 'first line\nsecond line',
  },
  {
    description: 'an ordered list with consecutive items',
    inputMarkdown: '1. first\n2. second',
    expectedMarkdown: '1. first\n2. second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'an ordered list with a non-one starting number',
    inputMarkdown: '14. first\n15. second',
    expectedMarkdown: '14. first\n15. second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'an ordered list with a zero-padded starting number',
    inputMarkdown: '01. first\n02. second',
    expectedMarkdown: '1. first\n2. second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'an unordered list written with hyphens',
    inputMarkdown: '- first\n- second',
    expectedMarkdown: '- first\n- second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'an unordered list written with asterisks',
    inputMarkdown: '* first\n* second',
    expectedMarkdown: '- first\n- second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'an unordered list written with plus signs',
    inputMarkdown: '+ first\n+ second',
    expectedMarkdown: '- first\n- second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'all supported heading levels',
    inputMarkdown: '# one\n## two\n### three\n#### four\n##### five\n###### six',
    expectedMarkdown: '# one\n## two\n### three\n#### four\n##### five\n###### six',
    expectedTextContent: 'one\n\ntwo\n\nthree\n\nfour\n\nfive\n\nsix',
  },
  {
    description: 'a heading without a separating space',
    inputMarkdown: '#heading',
    expectedMarkdown: '#heading',
    expectedTextContent: '#heading',
  },
  {
    description: 'a multiline blockquote',
    inputMarkdown: '> first\n> second',
    expectedMarkdown: '> first\n> second',
    expectedTextContent: 'first\nsecond',
  },
  {
    description: 'a fenced code block containing Markdown-looking text',
    inputMarkdown: '```\n**not bold** https://example.com @name 😀\n```',
    expectedMarkdown: '```\n**not bold** https://example.com @name 😀\n```',
    expectedTextContent: '**not bold** https://example.com @name 😀',
  },
  {
    description: 'inline formatting and inline code',
    inputMarkdown: '**bold** *italic* ***both*** ~~strike~~ `code`',
    expectedMarkdown: '**bold** *italic* ***both*** ~~strike~~ `code`',
    expectedTextContent: 'bold italic both strike code',
  },
  {
    description: 'a Markdown link',
    inputMarkdown: '[Wire](https://wire.com)',
    expectedMarkdown: '[Wire](https://wire.com)',
    expectedTextContent: 'Wire',
  },
];

type MarkdownRoundTripCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly expectedCanonicalMarkdown: string;
  readonly expectedTextContent: string;
};

const markdownRoundTripCharacterizationTestCases: readonly MarkdownRoundTripCharacterizationTestCase[] = [
  {
    description: 'a plain paragraph',
    inputMarkdown: 'plain paragraph',
    expectedCanonicalMarkdown: 'plain paragraph',
    expectedTextContent: 'plain paragraph',
  },
  {
    description: 'a multiline paragraph',
    inputMarkdown: 'first line\nsecond line',
    expectedCanonicalMarkdown: 'first line\nsecond line',
    expectedTextContent: 'first line\nsecond line',
  },
  {
    description: 'combined inline formatting',
    inputMarkdown: '**bold** *italic* ***both*** ~~strike~~ `code`',
    expectedCanonicalMarkdown: '**bold** *italic* ***both*** ~~strike~~ `code`',
    expectedTextContent: 'bold italic both strike code',
  },
  {
    description: 'a fenced code block',
    inputMarkdown: '```\n**not bold** https://example.com\n```',
    expectedCanonicalMarkdown: '```\n**not bold** https://example.com\n```',
    expectedTextContent: '**not bold** https://example.com',
  },
  {
    description: 'a heading',
    inputMarkdown: '### heading',
    expectedCanonicalMarkdown: '### heading',
    expectedTextContent: 'heading',
  },
  {
    description: 'a multiline blockquote',
    inputMarkdown: '> first\n> second',
    expectedCanonicalMarkdown: '> first\n> second',
    expectedTextContent: 'first\nsecond',
  },
  {
    description: 'an ordered list with a non-one starting number',
    inputMarkdown: '14. first\n15. second',
    expectedCanonicalMarkdown: '14. first\n15. second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'an unordered list with a non-canonical marker',
    inputMarkdown: '* first\n* second',
    expectedCanonicalMarkdown: '- first\n- second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'an ordered list with zero-padded item numbers',
    inputMarkdown: '01. first\n02. second',
    expectedCanonicalMarkdown: '1. first\n2. second',
    expectedTextContent: 'first\n\nsecond',
  },
  {
    description: 'a mixed nested list',
    inputMarkdown: '1. one\n   - nested',
    expectedCanonicalMarkdown: '1. one\n- nested',
    expectedTextContent: 'one\n\nnested',
  },
  {
    description: 'a Markdown link',
    inputMarkdown: '[Wire](https://wire.com)',
    expectedCanonicalMarkdown: '[Wire](https://wire.com)',
    expectedTextContent: 'Wire',
  },
  {
    description: 'the ambiguous date-like list input',
    inputMarkdown: '14. - 25. september',
    expectedCanonicalMarkdown: '14. - 25. september',
    expectedTextContent: '- 25. september',
  },
];

describe('Wire Lexical Markdown characterization', () => {
  it.each(markdownCharacterizationTestCases)(
    'preserves the current behavior for $description',
    characterizationTestCase => {
      const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

      harness.importMarkdown(characterizationTestCase.inputMarkdown);

      const actualMarkdown = harness.exportMarkdown();
      const actualTextContent = harness.getTextContent();

      expect(actualMarkdown).toBe(characterizationTestCase.expectedMarkdown);
      expect(actualTextContent).toBe(characterizationTestCase.expectedTextContent);
    },
  );
});

describe('Wire Lexical Markdown round trips', () => {
  it.each(markdownRoundTripCharacterizationTestCases)(
    'keeps the canonical representation stable for $description',
    characterizationTestCase => {
      const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

      harness.importMarkdown(characterizationTestCase.inputMarkdown);

      const actualFirstExport = harness.exportMarkdown();

      harness.importMarkdown(actualFirstExport);

      const actualSecondExport = harness.exportMarkdown();
      const actualTextContent = harness.getTextContent();
      const expectedCanonicalMarkdown = characterizationTestCase.expectedCanonicalMarkdown;
      const expectedTextContent = characterizationTestCase.expectedTextContent;

      expect(actualFirstExport).toBe(expectedCanonicalMarkdown);
      expect(actualSecondExport).toBe(expectedCanonicalMarkdown);
      expect(actualTextContent).toBe(expectedTextContent);
    },
  );
});
