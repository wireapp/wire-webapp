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

import {renderMessage} from 'Util/messageRenderer';

import {createWireLexicalEditorTestHarness} from './testSupport/createWireLexicalEditorTestHarness';

type MarkdownRendererCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly expectedHtml: string;
};

const markdownRendererCharacterizationTestCases: readonly MarkdownRendererCharacterizationTestCase[] = [
  {
    description: 'a plain paragraph',
    inputMarkdown: 'plain paragraph',
    expectedHtml: 'plain paragraph',
  },
  {
    description: 'a multiline paragraph',
    inputMarkdown: 'first line\nsecond line',
    expectedHtml: 'first line<br>second line',
  },
  {
    description: 'combined inline formatting',
    inputMarkdown: '**bold** *italic* ~~strike~~ `code`',
    expectedHtml: '<strong>bold</strong> <em>italic</em> <s>strike</s> <code>code</code>',
  },
  {
    description: 'an empty fenced code block',
    inputMarkdown: '```\n```',
    expectedHtml: '<pre><code></code></pre>',
  },
  {
    description: 'a heading',
    inputMarkdown: '### heading',
    expectedHtml: '<div class="md-heading md-heading--3">heading</div>',
  },
  {
    description: 'a multiline quote',
    inputMarkdown: '> first\n> second',
    expectedHtml: '<blockquote class="md-blockquote">first<br>second</blockquote>',
  },
  {
    description: 'an ordered list',
    inputMarkdown: '14. first\n15. second',
    expectedHtml: '<ol start="14">\n<li>first</li>\n<li>second</li>\n</ol>',
  },
  {
    description: 'a mixed nested list',
    inputMarkdown: '1. one\n   - nested',
    expectedHtml: '<ol>\n<li>one</li>\n</ol>\n<ul>\n<li>nested</li>\n</ul>',
  },
  {
    description: 'an unordered list',
    inputMarkdown: '- first\n- second',
    expectedHtml: '<ul>\n<li>first</li>\n<li>second</li>\n</ul>',
  },
  {
    description: 'a Markdown link',
    inputMarkdown: '[Wire](https://wire.com)',
    expectedHtml:
      '<a href="https://wire.com" target="_blank" rel="nofollow noopener noreferrer" data-md-link="true" data-uie-name="markdown-link">Wire</a>',
  },
  {
    description: 'the ambiguous date-like list input',
    inputMarkdown: '14. - 25. september',
    expectedHtml:
      '<ol start="14">\n<li>\n<ul>\n<li>\n<ol start="25">\n<li>september</li>\n</ol>\n</li>\n</ul>\n</li>\n</ol>',
  },
];

function renderExportedMarkdown(inputMarkdown: string): string {
  const harness = createWireLexicalEditorTestHarness();
  harness.importMarkdown(inputMarkdown);

  return renderMessage(harness.exportMarkdown());
}

describe('Wire Lexical Markdown to message renderer', () => {
  it.each(markdownRendererCharacterizationTestCases)(
    'preserves the current rendered result for $description',
    characterizationTestCase => {
      const actualHtml = renderExportedMarkdown(characterizationTestCase.inputMarkdown);
      const expectedHtml = characterizationTestCase.expectedHtml;

      expect(actualHtml).toBe(expectedHtml);
    },
  );
});
