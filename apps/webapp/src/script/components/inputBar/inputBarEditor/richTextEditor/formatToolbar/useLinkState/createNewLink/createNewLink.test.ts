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

import {$createParagraphNode, $createTextNode, $getRoot, $getSelection, $isRangeSelection} from 'lexical';
import assert from 'node:assert';

import {createWireLexicalEditorTestHarness} from '../../../testSupport/createWireLexicalEditorTestHarness';
import {createNewLink} from './createNewLink';

type CreateLinkTestCase = {
  readonly description: string;
  readonly selectedText: string;
  readonly linkUrl: string;
  readonly linkText: string | undefined;
  readonly expectedMarkdown: string;
};

const createLinkTestCases: readonly CreateLinkTestCase[] = [
  {
    description: 'uses the selected text when no replacement text is supplied',
    selectedText: 'Wire',
    linkUrl: 'example.com',
    linkText: undefined,
    expectedMarkdown: '[Wire](https://example.com)',
  },
  {
    description: 'uses replacement text instead of the selected text',
    selectedText: 'Wire',
    linkUrl: 'https://example.com',
    linkText: 'Wire website',
    expectedMarkdown: '[Wire website](https://example.com)',
  },
  {
    description: 'uses the URL as visible text when the selection is empty',
    selectedText: '',
    linkUrl: 'https://example.com/docs',
    linkText: undefined,
    expectedMarkdown: '[https://example.com/docs](https://example.com/docs)',
  },
  {
    description: 'keeps the visible URL text when an unsupported protocol is sanitized',
    selectedText: '',
    linkUrl: 'ftp://example.com',
    linkText: undefined,
    expectedMarkdown: '[ftp://example.com]()',
  },
];

function createLinkFromSelection(createLinkTestCase: CreateLinkTestCase): string {
  const harness = createWireLexicalEditorTestHarness();

  harness.editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const selectedTextNode = $createTextNode(createLinkTestCase.selectedText);
      paragraphNode.append(selectedTextNode);
      $getRoot().clear().append(paragraphNode);
      selectedTextNode.select(0, createLinkTestCase.selectedText.length);

      const selection = $getSelection();
      assert($isRangeSelection(selection));
      createNewLink({
        selection,
        url: createLinkTestCase.linkUrl,
        text: createLinkTestCase.linkText,
      });
    },
    {discrete: true},
  );

  return harness.exportMarkdown();
}

describe('createNewLink', () => {
  it.each(createLinkTestCases)('$description', createLinkTestCase => {
    const actualMarkdown = createLinkFromSelection(createLinkTestCase);

    expect(actualMarkdown).toBe(createLinkTestCase.expectedMarkdown);
  });
});
